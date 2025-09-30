import { createOICApp } from "../../lib/oic-framework";
import { OICStyles } from "../../lib/oic-styles";
import { useState, useEffect } from "react";
import ProfileSelector from "../../components/ProfileSelector";

const metadata = {
  appId: "mint-open",
  title: "Mint $OPEN",
  description: "Convert your Circles tokens to $OPEN.",
  recipient: "0x0000000000000000000000000000000000000000", // Dummy recipient, will be overridden
  initialState: {
    walletAddress: "",
    selectedProfile: null,
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
      console.log("Finding max flow for source:", sourceAddress);

      // Try different method names and parameters
      const methodsToTry = [
        {
          method: "circles_findPath",
          params: [
            {
              Source: sourceAddress,
              Sink: "0xf46d3ef3e310460fe032ad08b04afd7bff0be8f7",
              TargetFlow:
                "115792089237316195423570985008687907853269984665640564039457584007913129639935",
            },
          ],
        },
        {
          method: "circlesV2_findPath",
          params: [
            {
              Source: sourceAddress,
              Sink: "0xf46d3ef3e310460fe032ad08b04afd7bff0be8f7",
              TargetFlow:
                "115792089237316195423570985008687907853269984665640564039457584007913129639935",
            },
          ],
        },
        {
          method: "findPath",
          params: [
            {
              source: sourceAddress,
              sink: "0xf46d3ef3e310460fe032ad08b04afd7bff0be8f7",
              targetFlow:
                "115792089237316195423570984665640564039457584007913129639935",
            },
          ],
        },
        {
          method: "circles_computeTransfer",
          params: [
            {
              from: sourceAddress,
              to: "0xf46d3ef3e310460fe032ad08b04afd7bff0be8f7",
              value:
                "115792089237316195423570985008687907853269984665640564039457584007913129639935",
            },
          ],
        },
      ];

      let lastError = null;

      for (const methodConfig of methodsToTry) {
        console.log(`Trying method: ${methodConfig.method}`);

        const requestBody = {
          jsonrpc: "2.0",
          id: 1,
          method: methodConfig.method,
          params: methodConfig.params,
        };

        console.log("Request body:", JSON.stringify(requestBody, null, 2));

        try {
          const response = await fetch("https://rpc.aboutcircles.com/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          console.log(`Response for ${methodConfig.method}:`, data);

          if (data.error) {
            console.warn(`Method ${methodConfig.method} failed:`, data.error);
            lastError = data.error;
            continue; // Try next method
          }

          if (!data.result) {
            console.warn(
              `Method ${methodConfig.method} returned no result:`,
              data,
            );
            lastError = { message: "No result returned" };
            continue; // Try next method
          }

          // Success! Extract the max flow
          const maxFlowWei =
            data.result.maxFlow ||
            data.result.MaxFlow ||
            data.result.flow ||
            data.result.value ||
            "0";
          console.log(
            `Success with method ${methodConfig.method}! Max flow (wei):`,
            maxFlowWei,
          );

          const maxFlowHuman = Math.floor(
            Number(maxFlowWei) / Math.pow(10, 18),
          );
          console.log("Max flow (human readable):", maxFlowHuman);

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
          } else {
            console.warn(
              "Max flow is 0 - user may not have Circles tokens or path may not exist",
            );
          }

          return; // Success, exit the function
        } catch (fetchError) {
          console.error(
            `Fetch error for method ${methodConfig.method}:`,
            fetchError,
          );
          lastError = fetchError;
          continue; // Try next method
        }
      }

      // If we get here, all methods failed
      throw new Error(
        lastError?.message || lastError || "All RPC methods failed",
      );
    } catch (error) {
      console.error("Error finding max flow:", error);
      setAppState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Failed to find path: ${error.message}. Check console for details.`,
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

  // Handle profile selection
  const handleProfileSelect = (profile) => {
    if (profile && profile.address) {
      setAppState((prev) => ({
        ...prev,
        selectedProfile: profile,
        walletAddress: profile.address,
        error: null,
        successMessage: null,
        maxFlow: null,
        maxFlowHuman: 0,
        qrCode: "",
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        selectedProfile: null,
        walletAddress: "",
        error: null,
        successMessage: null,
        maxFlow: null,
        maxFlowHuman: 0,
        qrCode: "",
      }));
    }
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
          <li>
            Search and select your Circles profile or enter wallet address
          </li>
          <li>Find the maximum $OPEN you can mint via Circles paths</li>
          <li>Select how much you want to mint</li>
          <li>Scan the QR code to initiate the transfer</li>
          <li>
            Your Circles tokens will be converted to $OPEN and sent back to your
            Metri account
          </li>
        </ol>
      </div>

      {/* Debug Info */}
      {appState.isLoading && (
        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: "#f0f8ff",
            border: "2px solid #2196F3",
            borderRadius: "5px",
            fontSize: "14px",
            color: "#1976D2",
          }}
        >
          <strong>🔍 Debug Mode Active</strong>
          <p style={{ margin: "8px 0 0 0" }}>
            Testing multiple RPC methods to find the correct Circles API
            endpoint. Check browser console for detailed logs.
          </p>
        </div>
      )}

      {appState.maxFlow === null &&
        !appState.isLoading &&
        appState.selectedProfile && (
          <div
            style={{
              margin: "20px 0",
              padding: "15px",
              backgroundColor: "#fff8f0",
              border: "2px solid #FF9800",
              borderRadius: "5px",
              fontSize: "14px",
              color: "#F57C00",
            }}
          >
            <strong>ℹ️ Troubleshooting</strong>
            <p style={{ margin: "8px 0 0 0" }}>
              If max flow shows 0, this could mean:
            </p>
            <ul style={{ margin: "8px 0 0 20px", paddingLeft: "0" }}>
              <li>This address doesn't have Circles tokens</li>
              <li>No path exists to the OIC middleware contract</li>
              <li>The RPC endpoint method has changed</li>
            </ul>
            <p style={{ margin: "8px 0 0 0", fontSize: "12px" }}>
              <strong>Selected Address:</strong>{" "}
              {appState.selectedProfile?.address}
            </p>
          </div>
        )}
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

      {/* Step 1: Profile Selection */}
      <div style={{ margin: "30px 0" }}>
        <h3 style={OICStyles.h3}>Step 1: Select Your Profile</h3>
        <div style={{ margin: "15px 0" }}>
          <ProfileSelector
            selectedProfile={appState.selectedProfile}
            onProfileSelect={handleProfileSelect}
          />
        </div>
        {appState.selectedProfile && (
          <div style={{ margin: "15px 0" }}>
            <button
              onClick={handleFindMaxFlow}
              disabled={appState.isLoading}
              style={{
                ...OICStyles.button,
                ...OICStyles.buttonPrimary,
                padding: "8px 16px",
                opacity: appState.isLoading ? 0.5 : 1,
              }}
            >
              {appState.isLoading
                ? "Finding Path..."
                : "Find Max Mintable Amount"}
            </button>
          </div>
        )}
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
