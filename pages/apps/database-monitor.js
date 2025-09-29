import { createOICApp } from "../../lib/oic-framework";
import { OICStyles } from "../../lib/oic-styles";
import { useState, useEffect } from "react";

const metadata = {
  appId: "database-monitor",
  title: "Database Monitor",
  description:
    "Pay $OPEN tokens to activate real-time database monitoring. Different amounts give different durations.",
  recipient: "0xf48554937f18885c7f15c432c596b5843648231d", // Required recipient address
  initialState: {
    qrCode: "",
    monitoringActive: false,
  },
  onPayment: (
    eventData,
    appState,
    setAppState,
    currentAmount,
    setCurrentAmount,
  ) => {
    console.log("Monitor activation event received:", eventData);

    // Parse the amount from the event data (assuming it's in wei)
    const receivedAmount = Math.floor(
      Number(eventData.amount) / Math.pow(10, 18),
    );

    // Check if the payment matches any valid amount
    if ([1, 5, 10, 30].includes(receivedAmount)) {
      const duration = receivedAmount * 60 * 1000; // 1 token = 60 seconds

      setAppState((prev) => ({
        ...prev,
        monitoringActive: true,
        paidAmount: receivedAmount,
        endTime: Date.now() + duration,
      }));

      // Start monitoring for the paid duration
      setTimeout(() => {
        setAppState((prev) => ({
          ...prev,
          monitoringActive: false,
        }));
      }, duration);
    }
  },
};

const appContent = ({
  appState,
  setAppState,
  currentAmount,
  setCurrentAmount,
  generateQR,
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
    }));
    generateQRCode();
  };

  return (
    <>
      {appState.monitoringActive && (
        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: "#f0f8f0",
            border: "2px solid #4CAF50",
            borderRadius: "5px",
          }}
        >
          <h3 style={{ ...OICStyles.h3, marginTop: 0, color: "#4CAF50" }}>
            Monitoring Active
          </h3>
          <p style={{ margin: "5px 0", fontSize: "14px" }}>
            Watching for database events in real-time...
            <br />
            Duration: {appState.paidAmount} minutes (paid {appState.paidAmount}{" "}
            $OPEN)
          </p>
        </div>
      )}

      <div style={{ margin: "30px 0" }}>
        <h3 style={OICStyles.h3}>Select Monitoring Duration</h3>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[1, 5, 10, 30].map((minutes) => (
            <button
              key={minutes}
              onClick={() => handleAmountSelect(minutes)}
              style={{
                ...OICStyles.button,
                ...(currentAmount === minutes ? OICStyles.buttonPrimary : {}),
                padding: "8px 16px",
                fontSize: "14px",
              }}
              disabled={appState.monitoringActive}
            >
              {minutes} $OPEN ({minutes} min)
            </button>
          ))}
        </div>
      </div>

      {appState.qrCode && !appState.monitoringActive && (
        <div style={OICStyles.qrContainer}>
          <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>
            Scan to Activate Monitoring
          </h3>
          <img
            src={appState.qrCode}
            alt="Database Monitor QR Code"
            style={{ maxWidth: "250px" }}
          />
          <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
            Cost: {currentAmount} $OPEN • Duration: {currentAmount} minutes
          </p>
        </div>
      )}
    </>
  );
};

export default createOICApp(metadata, appContent);
