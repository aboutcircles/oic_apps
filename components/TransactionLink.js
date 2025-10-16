import React from "react";

const TransactionLink = ({
  transactionHash,
  truncate = true,
  style = {},
  className = "",
}) => {
  if (!transactionHash) {
    return <span style={style}>No transaction</span>;
  }

  const displayHash = truncate
    ? `${transactionHash.substring(0, 12)}...`
    : transactionHash;

  const blockscoutUrl = `https://gnosis.blockscout.com/tx/${transactionHash}`;

  return (
    <a
      href={blockscoutUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "#0066cc",
        textDecoration: "underline",
        fontFamily: "monospace",
        fontSize: "10px",
        cursor: "pointer",
        ...style,
      }}
      className={className}
      title={`View transaction ${transactionHash} on Blockscout`}
    >
      TX: {displayHash}
    </a>
  );
};

export default TransactionLink;
