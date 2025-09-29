import { createOICApp } from "../../lib/oic-framework";
import { OICStyles } from "../../lib/oic-styles";
import { useState, useEffect } from "react";

const metadata = {
  appId: "random-number",
  title: "Random Number Generator",
  description:
    "Send $OPEN tokens to generate random numbers. Different amounts give different ranges.",
  recipient: "0xf48554937f18885c7f15c432c596b5843648231d", // Example: set custom recipient
  initialState: {
    qrCode: "",
    randomNumber: null,
    isWaiting: false,
    lastTransaction: null,
  },
  onPayment: (
    eventData,
    appState,
    setAppState,
    currentAmount,
    setCurrentAmount,
  ) => {
    console.log("Random number event received:", eventData);

    // Parse the amount from the event data (assuming it's in wei)
    const receivedAmount = Math.floor(
      Number(eventData.amount) / Math.pow(10, 18),
    );

    // Check if the payment matches any valid amount
    if ([1, 2, 5, 10].includes(receivedAmount)) {
      // Generate a random number based on the amount paid
      const maxNumber = receivedAmount * 1000; // 1 token = 1-1000, 2 tokens = 1-2000, etc.
      const newRandomNumber = Math.floor(Math.random() * maxNumber) + 1;

      setAppState((prev) => ({
        ...prev,
        randomNumber: newRandomNumber,
        isWaiting: false,
        lastTransaction: eventData,
        paidAmount: receivedAmount,
      }));
    }
  },
};

const appContent = ({
  appState,
  setAppState,
  currentAmount,
  setCurrentAmount,
  generateQR,
  checkPayment,
  metadata,
}) => {
  // Generate QR code when amount changes
  useEffect(() => {
    if (currentAmount > 0) {
      generateQRCode();
    }
  }, [currentAmount]);

  const generateQRCode = async () => {
    try {
      const result = await generateQR(currentAmount, metadata.appId);
      setAppState((prev) => ({ ...prev, qrCode: result.qrCode }));
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  const handleAmountSelect = (amount) => {
    setCurrentAmount(amount);
    setAppState((prev) => ({
      ...prev,
      isWaiting: true,
      randomNumber: null,
    }));
    generateQRCode();
  };

  return (
    <>
      {appState.randomNumber && (
        <div
          style={{
            textAlign: "center",
            margin: "30px 0",
            padding: "20px",
            backgroundColor: "#f0f8f0",
            border: "2px solid #4CAF50",
            borderRadius: "5px",
          }}
        >
          <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>Your Random Number</h3>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#4CAF50",
              margin: "10px 0",
            }}
          >
            {appState.randomNumber}
          </div>
          <p style={{ color: "#666", fontSize: "14px" }}>
            Range: 1 to {appState.paidAmount * 1000} (paid {appState.paidAmount}{" "}
            $OPEN)
          </p>
          {appState.lastTransaction && (
            <small style={{ color: "#666" }}>
              Generated from transaction:{" "}
              {appState.lastTransaction.transactionHash?.substring(0, 10)}...
            </small>
          )}
        </div>
      )}

      <div style={{ margin: "30px 0" }}>
        <h3 style={OICStyles.h3}>Select Amount</h3>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[1, 2, 5, 10].map((amount) => (
            <button
              key={amount}
              onClick={() => handleAmountSelect(amount)}
              style={{
                ...OICStyles.button,
                ...(currentAmount === amount ? OICStyles.buttonPrimary : {}),
                padding: "8px 16px",
                fontSize: "14px",
              }}
              disabled={appState.isWaiting}
            >
              {amount} $OPEN (1-{amount * 1000})
            </button>
          ))}
        </div>
      </div>

      {appState.qrCode && (
        <div style={OICStyles.qrContainer}>
          <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>
            {appState.isWaiting
              ? "Scan to Generate Random Number"
              : "Scan QR Code"}
          </h3>
          <img
            src={appState.qrCode}
            alt="Random Number QR Code"
            style={{ maxWidth: "250px" }}
          />
          <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
            Cost: {currentAmount} $OPEN • Range: 1 to {currentAmount * 1000}
          </p>
        </div>
      )}
    </>
  );
};

export default createOICApp(metadata, appContent);
