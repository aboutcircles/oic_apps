const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔧 Manual database check triggered");

    // Get recent transactions
    const result = await pool.query(
      `SELECT "blockNumber", timestamp, "transactionHash", "onBehalf", sender, recipient, amount, data
       FROM "CrcV2_OIC_OpenMiddlewareTransfer"
       ORDER BY timestamp DESC
       LIMIT 5`
    );

    console.log(`🔧 Found ${result.rows.length} recent transactions`);

    const transactions = result.rows.map((row) => {
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

      return {
        blockNumber: row.blockNumber,
        timestamp: row.timestamp,
        transactionHash: row.transactionHash,
        onBehalf: row.onBehalf,
        sender: row.sender,
        recipient: row.recipient,
        amount: row.amount ? row.amount.toString() : "0",
        data: dataString,
      };
    });

    console.log("🔧 Processed transactions:", JSON.stringify(transactions, null, 2));

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions: transactions,
      message: "Manual database check completed",
    });
  } catch (error) {
    console.error("🔧 Manual database check error:", error);
    res.status(500).json({
      error: "Database check failed",
      details: error.message
    });
  }
}
