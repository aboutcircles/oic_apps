require("dotenv").config({ path: ".env.local" });
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

let lastTimestamp = 0;

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

  // Database monitoring
  const checkForChanges = async () => {
    try {
      // Get new transactions since last check
      const result = await pool.query(
        `SELECT "blockNumber", timestamp, "transactionHash", "onBehalf", sender, recipient, amount, data
         FROM "CrcV2_OIC_OpenMiddlewareTransfer"
         WHERE timestamp > $1
         ORDER BY timestamp ASC
         LIMIT 10`,
        [lastTimestamp],
      );

      if (result.rows.length > 0) {
        console.log(`New transactions detected: ${result.rows.length}`);

        // Process each new transaction
        for (const row of result.rows) {
          // Convert bytea data to string if it exists
          let dataString = null;
          if (row.data) {
            try {
              // Convert Buffer to string (assuming UTF-8)
              dataString = row.data.toString("utf8");
            } catch (e) {
              // If conversion fails, convert to hex
              dataString = row.data.toString("hex");
            }
          }

          console.log(
            `Processing transaction: ${row.transactionHash} - Sender: ${row.sender}, Recipient: ${row.recipient}, Amount: ${row.amount}, Data: ${dataString}`,
          );

          io.emit("db-change", {
            sender: row.sender,
            recipient: row.recipient,
            amount: row.amount ? row.amount.toString() : "0",
            data: dataString,
            blockNumber: row.blockNumber,
            transactionHash: row.transactionHash,
            onBehalf: row.onBehalf,
            table: "CrcV2_OIC_OpenMiddlewareTransfer",
            timestamp: new Date().toISOString(),
          });
        }

        // Update lastTimestamp to the most recent transaction timestamp
        lastTimestamp = result.rows[result.rows.length - 1].timestamp;
      }
    } catch (error) {
      console.error("Database monitoring error:", error);
    }
  };

  // Check every 5 seconds
  setInterval(checkForChanges, 5000);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`📊 Monitoring CrcV2_OIC_OpenMiddlewareTransfer table`);

    // Initial check
    checkForChanges();
  });
});
