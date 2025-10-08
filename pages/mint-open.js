import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import ProfileSelector from "../components/ProfileSelector";
import { fetchGroupMemberships } from "../lib/circles-rpc";

const REQUIRED_GROUP_ADDRESS = "0x4E2564e5df6C1Fb10C1A018538de36E4D5844DE5";

export default function MintOpenPage() {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [maxFlow, setMaxFlow] = useState(null);
  const [maxFlowHuman, setMaxFlowHuman] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(1);
  const [qrCode, setQrCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState({
    state: "idle",
    message: "",
  });

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

  // Get the current Metri URL for the selected amount
  const getMetriUrl = (amount) => {
    return `https://app.metri.xyz/transfer/0xF46d3Ef3E310460Fe032AD08B04afD7BFF0bE8f7/crc/${amount}?data=0xf3f5858942140fd2894eeb8b74cd0ed72d24fc6675d352a2884b1be2f32256fe`;
  };

  const verifyMembershipAndFindFlow = async (sourceAddress) => {
    setError(null);
    setMembershipStatus({
      state: "checking",
      message: "Verifying required group membership…",
    });

    try {
      const memberships = await fetchGroupMemberships(
        sourceAddress,
        REQUIRED_GROUP_ADDRESS,
        { limit: 5 },
      );

      const lowerSource = sourceAddress.toLowerCase();
      const lowerGroup = REQUIRED_GROUP_ADDRESS.toLowerCase();
      const nowSeconds = BigInt(Math.floor(Date.now() / 1000));

      const hasValidMembership = memberships.some((membership) => {
        if (!membership) {
          return false;
        }

        const memberAddress = (membership.member || "").toLowerCase();
        const groupAddress = (membership.group || "").toLowerCase();

        if (memberAddress !== lowerSource || groupAddress !== lowerGroup) {
          return false;
        }

        const { expiryTime } = membership;
        if (expiryTime === null || expiryTime === undefined || expiryTime === "") {
          return true;
        }

        try {
          const expiryBigInt = BigInt(expiryTime);
          if (expiryBigInt === 0n) {
            return true;
          }
          return expiryBigInt > nowSeconds;
        } catch (parseError) {
          console.warn("Unable to parse expiryTime, treating as active membership:", {
            expiryTime,
            parseError,
          });
          return true;
        }
      });

      if (!hasValidMembership) {
        setMembershipStatus({
          state: "not-member",
          message:
            "This address is not a member of the Open Internet Club group and cannot mint $OPEN yet.",
        });
        setError(
          "This address is not a member of the Open Internet Club  group (0x4E2564e5df6C1Fb10C1A018538de36E4D5844DE5). Request membership before minting.",
        );
        return;
      }

      setMembershipStatus({
        state: "member",
        message: "Membership verified. Calculating maximum mintable amount…",
      });
      await findMaxFlow(sourceAddress);
      setMembershipStatus({
        state: "member",
        message: "Membership verified.",
      });
    } catch (membershipError) {
      console.error("Failed to verify group membership:", membershipError);
      setMembershipStatus({
        state: "error",
        message: `Failed to verify group membership: ${membershipError.message}`,
      });
      setError(
        `Failed to verify group membership: ${membershipError.message}. Check console for details.`,
      );
    }
  };

  // Handle profile selection and auto-call pathfinder
  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile && profile.address ? profile : null);
    setError(null);
    setMaxFlow(null);
    setMaxFlowHuman(0);
    setQrCode("");
    setIsLoading(false);
    setMembershipStatus({
      state: "idle",
      message: "",
    });

    if (profile && profile.address) {
      verifyMembershipAndFindFlow(profile.address);
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
          {membershipStatus.state !== "idle" && (
            <div
              style={{
                margin: "10px 0",
                padding: "12px",
                borderRadius: "3px",
                fontSize: "14px",
                border:
                  membershipStatus.state === "member"
                    ? "1px solid #4CAF50"
                    : membershipStatus.state === "checking"
                      ? "1px solid #2196F3"
                      : membershipStatus.state === "error"
                        ? "1px solid #f44336"
                        : "1px solid #f57c00",
                backgroundColor:
                  membershipStatus.state === "member"
                    ? "#e8f5e9"
                    : membershipStatus.state === "checking"
                      ? "#e3f2fd"
                      : membershipStatus.state === "error"
                        ? "#fdecea"
                        : "#fff3e0",
                color:
                  membershipStatus.state === "member"
                    ? "#1b5e20"
                    : membershipStatus.state === "checking"
                      ? "#0d47a1"
                      : membershipStatus.state === "error"
                        ? "#b71c1c"
                        : "#e65100",
              }}
            >
              {membershipStatus.state === "member" && "✅ "}
              {membershipStatus.state === "checking" && "🔍 "}
              {membershipStatus.state === "not-member" && "⚠️ "}
              {membershipStatus.state === "error" && "❌ "}
              {membershipStatus.message}
            </div>
          )}
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
            <div style={{ margin: "15px 0" }}>
              <a
                href={getMetriUrl(selectedAmount)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#0066cc",
                  textDecoration: "underline",
                  fontSize: "14px",
                  display: "inline-block",
                  padding: "8px 16px",
                  border: "1px solid #0066cc",
                  borderRadius: "3px",
                  backgroundColor: "#f0f8ff",
                }}
              >
                📱 Open in Metri App (Browser)
              </a>
            </div>
            <p style={{ margin: "10px 0", fontSize: "12px", color: "#999" }}>
              For mobile users: Click the link above to open directly in Metri
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
