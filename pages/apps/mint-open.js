import { createOICApp } from "../../lib/oic-framework";
import { OICStyles } from "../../lib/oic-styles";
import { useState, useEffect } from "react";

const metadata = {
  appId: "mint-open",
  title: "Mint $OPEN",
  description: "Convert your Circles tokens to $OPEN.",
  recipient: "0x0000000000000000000000000000000000000000", // Dummy recipient, will be overridden
  initialState: {
    walletAddress: "",
    maxFlow: null,
    maxFlowHuman: 0,
    selectedAmount: 1,
    qrCode: "",
    isLoading: false,
    error: null,
    successMessage: null,
  },
  onPayment: (
    eventData,
    appState,
    setAppState,
    currentAmount,
    setCurrentAmount,
  ) => {
    console.log("Mint $OPEN payment received:", eventData);

    // Parse the received amount
    const receivedAmount = Math.floor(
      Number(eventData.amount) / Math.pow(10, 18),
    );

    // Check if this payment is to the middleware contract (successful mint)
    if (eventData.recipient === "0x6fff09332ae273ba7095a2a949a7f4b89eb37c52") {
      setAppState((prev) => ({
        ...prev,
        successMessage: `Successfully minted ${receivedAmount} $OPEN! Transaction: ${eventData.transactionHash}`,
        isLoading: false,
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
  metadata,
}) => {
  // Find max flow from user's wallet to OIC middleware
  const findMaxFlow = async (sourceAddress) => {
    setAppState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      maxFlow: null,
      qrCode: "",
      successMessage: null,
    }));

    try {
      const response = await fetch(
        "https://rpc.aboutcircles.com/circlesV2_findPath",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 0,
            method: "circlesV2_findPath",
            params: [
              {
                Source: sourceAddress,
                Sink: "0x6fff09332ae273ba7095a2a949a7f4b89eb37c52", // OIC middleware
                TargetFlow: "99999999999999999999999999999999999",
              },
            ],
          }),
        },
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "RPC call failed");
      }

      const maxFlowWei = data.result?.maxFlow || "0";
      const maxFlowHuman = Math.floor(Number(maxFlowWei) / Math.pow(10, 18));

      setAppState((prev) => ({
        ...prev,
        maxFlow: maxFlowWei,
        maxFlowHuman: maxFlowHuman,
        selectedAmount: Math.min(1, maxFlowHuman),
        isLoading: false,
      }));

      // Auto-generate QR code with initial amount
      if (maxFlowHuman > 0) {
        setCurrentAmount(Math.min(1, maxFlowHuman));
      }
    } catch (error) {
      console.error("Error finding max flow:", error);
      setAppState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Failed to find path: ${error.message}`,
      }));
    }
  };

  // Generate QR code with dynamic recipient
  const generateQRCode = async (amount, recipient) => {
    try {
      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: amount,
          data: metadata.appId,
          recipient: recipient,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAppState((prev) => ({ ...prev, qrCode: result.qrCode }));
      } else {
        throw new Error(result.error || "QR generation failed");
      }
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      setAppState((prev) => ({
        ...prev,
        error: `Failed to generate QR code: ${error.message}`,
      }));
    }
  };

  // Handle wallet address input
  const handleWalletAddressChange = (e) => {
    const address = e.target.value;
    setAppState((prev) => ({ ...prev, walletAddress: address }));
  };

  // Handle wallet address submission
  const handleFindMaxFlow = () => {
    if (!appState.walletAddress) {
      setAppState((prev) => ({
        ...prev,
        error: "Please enter a wallet address",
      }));
      return;
    }

    // Basic address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(appState.walletAddress)) {
      setAppState((prev) => ({
        ...prev,
        error: "Invalid Ethereum address format",
      }));
      return;
    }

    findMaxFlow(appState.walletAddress);
  };

  // Handle amount selection
  const handleAmountChange = (e) => {
    const amount = parseInt(e.target.value);
    setAppState((prev) => ({ ...prev, selectedAmount: amount }));
    setCurrentAmount(amount);

    if (appState.walletAddress && amount > 0) {
      generateQRCode(amount, appState.walletAddress);
    }
  };

  // Generate QR when amount changes
  useEffect(() => {
    if (appState.walletAddress && currentAmount > 0 && appState.maxFlow) {
      generateQRCode(currentAmount, appState.walletAddress);
    }
  }, [currentAmount]);

  return (
    <>
      {/* Instructions */}
      <div style={{ margin: "30px 0", fontSize: "14px", color: "#666" }}>
        <h3 style={OICStyles.h3}>How it works</h3>
        <ol style={{ paddingLeft: "20px" }}>
          <li>Enter your Metri wallet address</li>
          <li>Find the maximum $OPEN you can mint via Circles paths</li>
          <li>Select how much you want to mint</li>
          <li>Scan the QR code to initiate the transfer</li>
          <li>
            Your Circles tokens will be converted to $OPEN and sent back to your
            Metri account
          </li>
        </ol>
      </div>
      {/* Success Message */}
      {appState.successMessage && (
        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: "#f0f8f0",
            border: "2px solid #4CAF50",
            borderRadius: "5px",
            color: "#4CAF50",
          }}
        >
          ✅ {appState.successMessage}
        </div>
      )}

      {/* Error Message */}
      {appState.error && (
        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: "#ffe6e6",
            border: "2px solid #f44336",
            borderRadius: "5px",
            color: "#f44336",
          }}
        >
          ❌ {appState.error}
        </div>
      )}

      {/* Step 1: Wallet Address Input */}
      <div style={{ margin: "30px 0" }}>
        <h3 style={OICStyles.h3}>Step 1: Enter Your Metri Wallet Address</h3>
        <div style={{ margin: "15px 0" }}>
          <input
            type="text"
            value={appState.walletAddress}
            onChange={handleWalletAddressChange}
            placeholder="0x..."
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
              border: "1px solid #000",
              borderRadius: "0",
              fontFamily: "monospace",
            }}
          />
        </div>
        <button
          onClick={handleFindMaxFlow}
          disabled={appState.isLoading || !appState.walletAddress}
          style={{
            ...OICStyles.button,
            ...OICStyles.buttonPrimary,
            padding: "8px 16px",
            opacity: appState.isLoading || !appState.walletAddress ? 0.5 : 1,
          }}
        >
          {appState.isLoading ? "Finding Path..." : "Find Max Mintable Amount"}
        </button>
      </div>

      {/* Step 2: Amount Selection */}
      {appState.maxFlow && (
        <div style={{ margin: "30px 0" }}>
          <h3 style={OICStyles.h3}>Step 2: Select Amount to Mint</h3>
          <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
            Maximum mintable: {appState.maxFlowHuman} $OPEN
          </p>
          <div style={{ margin: "15px 0" }}>
            <input
              type="number"
              min="1"
              max={appState.maxFlowHuman}
              value={appState.selectedAmount}
              onChange={handleAmountChange}
              style={{
                width: "100px",
                padding: "8px",
                fontSize: "14px",
                border: "1px solid #000",
                borderRadius: "0",
                marginRight: "10px",
              }}
            />
            <span>$OPEN tokens</span>
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            Enter a whole number between 1 and {appState.maxFlowHuman}
          </div>
        </div>
      )}

      {/* Step 3: QR Code */}
      {appState.qrCode && appState.walletAddress && (
        <div style={OICStyles.qrContainer}>
          <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>
            Step 3: Scan to Mint {currentAmount} $OPEN
          </h3>
          <img
            src={appState.qrCode}
            alt="Mint $OPEN QR Code"
            style={{ maxWidth: "250px" }}
          />
        </div>
      )}
    </>
  );
};

export default createOICApp(metadata, appContent);
