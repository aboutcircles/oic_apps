require("dotenv").config({ path: ".env.local" });
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const {
  fetchOpenMiddlewareTransfers,
  decodeDataField,
} = require("./lib/circles-rpc");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rpcState = { lastKey: null };

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function toIsoTimestamp(value) {
  const numeric = toNumber(value);
  if (!numeric) {
    return new Date().toISOString();
  }
  // RPC timestamp is in seconds
  return new Date(numeric * 1000).toISOString();
}

function isRowNewer(row) {
  if (!rpcState.lastKey) {
    return true;
  }

  const lastKey = rpcState.lastKey;
  const block = toNumber(row.blockNumber);
  const txIndex = toNumber(row.transactionIndex);
  const logIndex = toNumber(row.logIndex);

  if (block > lastKey.block) return true;
  if (block < lastKey.block) return false;
  if (txIndex > lastKey.txIndex) return true;
  if (txIndex < lastKey.txIndex) return false;
  return logIndex > lastKey.logIndex;
}

function updateLastProcessed(row) {
  rpcState.lastKey = {
    block: toNumber(row.blockNumber),
    txIndex: toNumber(row.transactionIndex),
    logIndex: toNumber(row.logIndex),
  };
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  const checkForChanges = async () => {
    try {
      const filter = rpcState.lastKey
        ? [
            {
              Type: "FilterPredicate",
              FilterType: "GreaterThan",
              Column: "blockNumber",
              Value: Math.max(rpcState.lastKey.block - 1, 0),
            },
          ]
        : [];

      const rows = await fetchOpenMiddlewareTransfers({
        limit: 200,
        order: [
          { Column: "blockNumber", SortOrder: "ASC" },
          { Column: "transactionIndex", SortOrder: "ASC" },
          { Column: "logIndex", SortOrder: "ASC" },
        ],
        filter,
      });
      if (!rows.length) {
        return;
      }

      const newEvents = rows.filter((row) => isRowNewer(row));

      if (!newEvents.length) {
        return;
      }

      const latestRow = newEvents[newEvents.length - 1];
      if (latestRow) {
        updateLastProcessed(latestRow);
      }

      newEvents.forEach((row) => {
        const dataString = decodeDataField(row.data);

        io.emit("db-change", {
          sender: row.sender,
          recipient: row.recipient,
          amount: row.amount ? row.amount.toString() : "0",
          data: dataString,
          rawData: row.data,
          blockNumber: row.blockNumber,
          transactionHash: row.transactionHash,
          transactionIndex: row.transactionIndex,
          logIndex: row.logIndex,
          inflationaryAmount: row.inflationaryAmount,
          onBehalf: row.onBehalf,
          table: "CrcV2_OIC_OpenMiddlewareTransfer",
          timestamp: toIsoTimestamp(row.timestamp),
        });
      });
    } catch (error) {
      console.error("RPC monitoring error:", error);
    }
  };

  const poll = () => checkForChanges();
  const interval = setInterval(poll, 5000);
  server.rpcInterval = interval;
  server.rpcState = rpcState;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`📡 Monitoring CrcV2_OIC_OpenMiddlewareTransfer via RPC`);
    poll();
  });
});
