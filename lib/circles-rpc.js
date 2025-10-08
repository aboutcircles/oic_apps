const CIRCLES_RPC_URL = "https://rpc.circlesubi.network/";

const fetchFn = (...args) => fetch(...args);

const DEFAULT_COLUMNS = [
  "blockNumber",
  "timestamp",
  "transactionIndex",
  "logIndex",
  "transactionHash",
  "onBehalf",
  "sender",
  "recipient",
  "amount",
  "inflationaryAmount",
  "data",
];

function buildQueryParams(options = {}) {
  const {
    namespace = "CrcV2_OIC",
    table = "OpenMiddlewareTransfer",
    columns = DEFAULT_COLUMNS,
    order = [
      { Column: "blockNumber", SortOrder: "DESC" },
      { Column: "transactionIndex", SortOrder: "DESC" },
      { Column: "logIndex", SortOrder: "DESC" },
    ],
    limit = 50,
    filter = [],
  } = options;

  return {
    Namespace: namespace,
    Table: table,
    Columns: columns,
    Order: order,
    Limit: limit,
    Filter: filter,
  };
}

function mapRows(columns, rows) {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const record = {};
    columns.forEach((columnName, index) => {
      record[columnName] = row[index];
    });
    return record;
  });
}

function decodeDataField(data) {
  if (!data || typeof data !== "string") {
    return null;
  }

  const hex = data.startsWith("0x") ? data.slice(2) : data;
  if (hex.length === 0) {
    return null;
  }

  try {
    const buffer = Buffer.from(hex, "hex");
    const text = buffer.toString("utf8").replace(/\0+$/, "");
    return text || null;
  } catch (error) {
    console.error("Failed to decode data field:", error);
    return null;
  }
}

async function circlesQuery(options = {}) {
  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "circles_query",
    params: [buildQueryParams(options)],
  };

  const response = await fetchFn(CIRCLES_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`circles_query failed: ${response.status} ${text}`);
  }

  const payload = await response.json();

  if (payload.error) {
    throw new Error(payload.error.message || "circles_query returned an error");
  }

  const { columns = [], rows = [] } = payload.result || {};
  return mapRows(columns, rows);
}

async function fetchOpenMiddlewareTransfers(options = {}) {
  return circlesQuery({
    namespace: "CrcV2_OIC",
    table: "OpenMiddlewareTransfer",
    ...options,
  });
}

async function fetchGroupMemberships(memberAddress, groupAddress, options = {}) {
  if (!memberAddress) {
    throw new Error("memberAddress is required to check group memberships");
  }

  const normalizedMember = memberAddress.toLowerCase();
  const normalizedGroup = groupAddress ? groupAddress.toLowerCase() : null;

  const filter = [
    {
      Type: "FilterPredicate",
      FilterType: "Equals",
      Column: "member",
      Value: normalizedMember,
    },
  ];

  if (normalizedGroup) {
    filter.push({
      Type: "FilterPredicate",
      FilterType: "Equals",
      Column: "group",
      Value: normalizedGroup,
    });
  }

  return circlesQuery({
    namespace: "V_CrcV2",
    table: "GroupMemberships",
    columns: [
      "group",
      "member",
      "expiryTime",
      "memberType",
      "blockNumber",
      "timestamp",
    ],
    order: [
      { Column: "blockNumber", SortOrder: "DESC" },
      { Column: "transactionIndex", SortOrder: "DESC" },
      { Column: "logIndex", SortOrder: "DESC" },
    ],
    limit: 5,
    filter,
    ...options,
  });
}

module.exports = {
  decodeDataField,
  circlesQuery,
  fetchOpenMiddlewareTransfers,
  fetchGroupMemberships,
};
