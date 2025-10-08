const { Server } = require("socket.io");
const {
  fetchOpenMiddlewareTransfers,
  decodeDataField,
} = require("../../lib/circles-rpc");

const POLL_INTERVAL_MS = 5000;

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function isRowNewer(row, lastKey) {
  if (!lastKey) return true;

  const block = toNumber(row.blockNumber);
  const txIndex = toNumber(row.transactionIndex);
  const logIndex = toNumber(row.logIndex);

  if (block > lastKey.block) return true;
  if (block < lastKey.block) return false;
  if (txIndex > lastKey.txIndex) return true;
  if (txIndex < lastKey.txIndex) return false;
  return logIndex > lastKey.logIndex;
}

function toIsoTimestamp(value) {
  const numeric = toNumber(value);
  if (!numeric) {
    return new Date().toISOString();
  }
  return new Date(numeric * 1000).toISOString();
}

function deriveKey(row) {
  return {
    block: toNumber(row.blockNumber),
    txIndex: toNumber(row.transactionIndex),
    logIndex: toNumber(row.logIndex),
  };
}

async function pollForEvents(io, sharedState) {
  try {
    const filter = sharedState.lastKey
      ? [
          {
            Type: "FilterPredicate",
            FilterType: "GreaterThan",
            Column: "blockNumber",
            Value: Math.max(sharedState.lastKey.block - 1, 0),
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

    const newEvents = rows.filter((row) => isRowNewer(row, sharedState.lastKey));

    if (!newEvents.length) {
      return;
    }

    sharedState.lastKey = deriveKey(newEvents[newEvents.length - 1]);

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
    console.error("Socket RPC monitoring error:", error);
  }
}

module.exports = function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("Socket initializing via API route");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;
    res.socket.server.rpcState = { lastKey: null };

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }

  if (!res.socket.server.rpcInterval) {
    const io = res.socket.server.io;
    const state = res.socket.server.rpcState || { lastKey: null };
    res.socket.server.rpcState = state;

    const poll = () => pollForEvents(io, state);
    res.socket.server.rpcInterval = setInterval(poll, POLL_INTERVAL_MS);
    poll();
  }

  res.end();
};
