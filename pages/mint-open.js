import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import ProfileSelector from "../components/ProfileSelector";

export default function MintOpenPage() {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [maxFlow, setMaxFlow] = useState(null);
  const [maxFlowHuman, setMaxFlowHuman] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(1);
  const [qrCode, setQrCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Find max flow from user's wallet to the mint contract
  const findMaxFlow = async (sourceAddress) => {
    setIsLoading(true);
    setError(null);
    setMaxFlow(null);
    setQrCode("");

    try {
      console.log("Finding max flow for source:", sourceAddress);

      const requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "circlesV2_findPath",
        params: [
          {
            Source: sourceAddress,
            Sink: "0xF46d3Ef3E310460Fe032AD08B04afD7BFF0bE8f7",
            TargetFlow:
              "115792089237316195423570985008687907853269984665640564039457584007913129639935",
          },
        ],
      };

      console.log("Request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch("https://rpc.aboutcircles.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Response data:", data);

      if (data.error) {
        console.error("RPC Error:", data.error);
        throw new Error(
          data.error.message ||
            `RPC call failed: ${JSON.stringify(data.error)}`,
        );
      }

      if (!data.result) {
        console.error("No result in response:", data);
        throw new Error("No result returned from RPC call");
      }

      const maxFlowWei = data.result.maxFlow || data.result.MaxFlow || "0";
      console.log("Max flow (wei):", maxFlowWei);

      const maxFlowHuman = Math.floor(Number(maxFlowWei) / Math.pow(10, 18));
      console.log("Max flow (human readable):", maxFlowHuman);

      setMaxFlow(maxFlowWei);
      setMaxFlowHuman(maxFlowHuman);
      setSelectedAmount(Math.min(1, maxFlowHuman));
      setIsLoading(false);

      // Don't auto-generate QR code - wait for user to select amount
      if (maxFlowHuman === 0) {
        console.warn(
          "Max flow is 0 - user may not have Circles tokens or path may not exist",
        );
      }
    } catch (error) {
      console.error("Error finding max flow:", error);
      setError(
        `Failed to find path: ${error.message}. Check console for details.`,
      );
      setIsLoading(false);
    }
  };

  // Generate QR code with Metri link
  const generateQRCode = async (amount) => {
    try {
      const metriUrl = `https://app.metri.xyz/transfer/0xF46d3Ef3E310460Fe032AD08B04afD7BFF0bE8f7/crc/${amount}?data=0xf3f5858942140fd2894eeb8b74cd0ed72d24fc6675d352a2884b1be2f32256fe`;

      const qrCodeDataURL = await QRCode.toDataURL(metriUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });

      setQrCode(qrCodeDataURL);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      setError(`Failed to generate QR code: ${error.message}`);
    }
  };

  // Handle profile selection and auto-call pathfinder
  const handleProfileSelect = (profile) => {
    if (profile && profile.address) {
      setSelectedProfile(profile);
      setError(null);
      setMaxFlow(null);
      setMaxFlowHuman(0);
      setQrCode("");

      // Automatically find max flow when profile is selected
      findMaxFlow(profile.address);
    } else {
      setSelectedProfile(null);
      setError(null);
      setMaxFlow(null);
      setMaxFlowHuman(0);
      setQrCode("");
    }
  };

  // Handle amount selection
  const handleAmountChange = (e) => {
    const amount = parseInt(e.target.value);
    setSelectedAmount(amount);

    // Auto-generate QR code when amount changes
    if (amount > 0 && maxFlow) {
      generateQRCode(amount);
    }
  };

  // Generate QR when amount changes automatically
  useEffect(() => {
    if (selectedAmount > 0 && maxFlow) {
      generateQRCode(selectedAmount);
    }
  }, [selectedAmount, maxFlow]);

  const styles = {
    container: {
      lineHeight: 1.4,
      fontSize: "16px",
      padding: "0 10px",
      margin: "50px auto",
      maxWidth: "650px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    content: {
      maxWidth: "42em",
      margin: "15px auto",
      marginTop: "70px",
    },
    h1: {
      color: "#333",
      borderBottom: "1px solid #eee",
      paddingBottom: "10px",
      fontSize: "24px",
    },
    h2: {
      color: "#333",
      borderBottom: "1px solid #eee",
      paddingBottom: "10px",
      fontSize: "20px",
    },
    h3: {
      color: "#555",
      marginTop: "30px",
      fontSize: "18px",
    },
    button: {
      padding: "4px 8px",
      fontSize: "14px",
      backgroundColor: "#ffffff",
      border: "1px solid #000000",
      borderRadius: "0",
      cursor: "pointer",
      fontFamily: "inherit",
      boxShadow: "none",
    },
    buttonPrimary: {
      backgroundColor: "#ffffff",
      color: "#000000",
      border: "1px solid #000000",
    },
    qrContainer: {
      textAlign: "center",
      margin: "20px 0",
      padding: "20px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={{ marginBottom: "20px" }}>
          <Link
            href="/"
            style={{ color: "#0066cc", textDecoration: "underline" }}
          >
            ← Back to Home
          </Link>
        </div>

        <h1 style={styles.h1}>Mint $OPEN</h1>
        <p>
          Convert your Circles tokens to $OPEN using the Circles pathfinder.
        </p>

        {/* Instructions */}
        <div style={{ margin: "30px 0", fontSize: "14px", color: "#666" }}>
          <h3 style={styles.h3}>How it works</h3>
          <ol style={{ paddingLeft: "20px" }}>
            <li>
              Search and select your Circles profile or enter wallet address
            </li>
            <li>
              The system finds the maximum $OPEN you can mint via Circles paths
            </li>
            <li>Select how much you want to mint</li>
            <li>Scan the QR code in Metri to complete the transaction</li>
            <li>Your Circles tokens will be converted to $OPEN</li>
          </ol>
        </div>

        {/* Error Message */}
        {error && (
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
            ❌ {error}
          </div>
        )}

        {/* Step 1: Profile Selection */}
        <div style={{ margin: "30px 0" }}>
          <h3 style={styles.h3}>Step 1: Select Your Profile</h3>
          <div style={{ margin: "15px 0" }}>
            <ProfileSelector
              selectedProfile={selectedProfile}
              onProfileSelect={handleProfileSelect}
            />
          </div>
          {isLoading && (
            <div
              style={{
                margin: "10px 0",
                padding: "10px",
                backgroundColor: "#e3f2fd",
                border: "1px solid #2196F3",
                borderRadius: "3px",
                color: "#1976D2",
                fontSize: "14px",
              }}
            >
              🔍 Finding maximum mintable amount...
            </div>
          )}
        </div>

        {/* Step 2: Amount Selection */}
        {maxFlow && (
          <div style={{ margin: "30px 0" }}>
            <h3 style={styles.h3}>Step 2: Select Amount to Mint</h3>
            <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
              Maximum mintable: {maxFlowHuman} $OPEN
            </p>
            <div style={{ margin: "15px 0" }}>
              <input
                type="number"
                min="1"
                max={maxFlowHuman}
                value={selectedAmount}
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
              Enter a whole number between 1 and {maxFlowHuman}
            </div>
          </div>
        )}

        {/* Step 3: QR Code */}
        {qrCode && selectedProfile && (
          <div style={styles.qrContainer}>
            <h3 style={{ ...styles.h3, marginTop: 0 }}>
              Step 3: Scan in Metri to Mint {selectedAmount} $OPEN
            </h3>
            <img
              src={qrCode}
              alt="Mint $OPEN QR Code"
              style={{ maxWidth: "250px" }}
            />
            <p style={{ margin: "15px 0", fontSize: "14px", color: "#666" }}>
              Open Metri app and scan this QR code to complete the minting
              process
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
