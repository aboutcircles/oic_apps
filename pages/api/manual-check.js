const {
  fetchOpenMiddlewareTransfers,
  decodeDataField,
} = require("../../lib/circles-rpc");

function toIsoTimestamp(value) {
  const numeric = Number(value);
  if (!numeric || Number.isNaN(numeric)) {
    return null;
  }
  return new Date(numeric * 1000).toISOString();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔧 Manual RPC check triggered");

    const rows = await fetchOpenMiddlewareTransfers({
      limit: 5,
      order: [
        { Column: "blockNumber", SortOrder: "DESC" },
        { Column: "transactionIndex", SortOrder: "DESC" },
        { Column: "logIndex", SortOrder: "DESC" },
      ],
    });

    console.log(`🔧 Retrieved ${rows.length} transactions via RPC`);

    const transactions = rows.map((row) => {
      const decoded = decodeDataField(row.data);
      return {
        blockNumber: row.blockNumber,
        timestamp: row.timestamp,
        timestampIso: toIsoTimestamp(row.timestamp),
        transactionHash: row.transactionHash,
        onBehalf: row.onBehalf,
        sender: row.sender,
        recipient: row.recipient,
        amount: row.amount ? row.amount.toString() : "0",
        inflationaryAmount: row.inflationaryAmount,
        data: decoded,
        rawData: row.data,
      };
    });

    console.log(
      "🔧 Processed transactions:",
      JSON.stringify(transactions, null, 2),
    );

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
      message: "Manual RPC check completed",
    });
  } catch (error) {
    console.error("🔧 Manual RPC check error:", error);
    res.status(500).json({
      error: "RPC check failed",
      details: error.message,
    });
  }
};
