import { createOICApp } from "../../lib/oic-framework";
import { OICStyles } from "../../lib/oic-styles";
import { useState, useEffect } from "react";
import { getProfilesByAddresses } from "../../lib/profiles";
import ProfileDisplay from "../../components/ProfileDisplay";
import QRCode from "qrcode";
import { ethers } from "ethers";

const MIDDLEWARE_CONTRACT = "0x6fff09332ae273ba7095a2a949a7f4b89eb37c52";
const BACKERS_GROUP = "0x1aca75e38263c79d9d4f10df0635cc6fcfe6f026";
const ANALYTICS_API = "https://squid-app-3gxnl.ondigitalocean.app/aboutcircles-advanced-analytics2";
const RPC_URL = "https://rpc.aboutcircles.com/";

// Function to pack data for the middleware contract
function packData(onBehalf, recipient, data) {
  const dataBytes = ethers.toUtf8Bytes(data || "");
  const packed = ethers.solidityPacked(
    ["address", "address", "bytes"],
    [onBehalf, recipient, dataBytes],
  );
  return packed;
}

const metadata = {
  appId: "trust-hunt",
  title: "Trust Hunt - Devconnect 2025",
  description:
    "A social game for Devconnect 2025 powered by $OPEN. Circles Backers provide hints for hunters to find them. Hunters track them to boost their trust score. Entry fee: 1 $OPEN.",
  recipient: MIDDLEWARE_CONTRACT,
  initialState: {
    backers: [],
    hunters: [],
    profileCache: {},
    backersMembers: null,
    trustScores: {},
    isLoadingData: false,
    isLoadingScores: false,
    showJoinModal: false,
    showAdminModal: false,
    adminRemovalType: null, // 'backer' or 'hunter'
    adminRemovalAddress: "",
    adminQrCode: "",
    entryType: null, // 'backer' or 'hunter'
    backerHints: "",
    hunterTrustScore: "",
    qrCode: "",
    isWaitingForPayment: false,
    error: null,
    successMessage: null,
    countdown: "",
    gameEnded: false,
  },
  onPayment: async (
    eventData,
    appState,
    setAppState,
    currentAmount,
    setCurrentAmount,
  ) => {
    console.log("Trust Hunt payment received:", eventData);

    // Refresh the data to show the new entry
    setTimeout(() => {
      loadGameData(setAppState);
      setAppState((prev) => ({
        ...prev,
        isWaitingForPayment: false,
        qrCode: "",
        backerHints: "",
        hunterTrustScore: "",
        entryType: null,
        showJoinModal: false,
        successMessage: "Successfully entered the game! You appear in the list below.",
      }));
    }, 2000);
  },
};

// Fetch Backers group members (cached)
const fetchBackersMembers = async (setAppState) => {
  try {
    console.log("Fetching Backers group members...");
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "circles_query",
        params: [
          {
            Namespace: "V_CrcV2",
            Table: "GroupMemberships",
            Filter: [
              {
                Type: "FilterPredicate",
                FilterType: "Equals",
                Column: "group",
                Value: BACKERS_GROUP,
              },
            ],
            Order: [{ Column: "member", SortOrder: "Asc" }],
            Limit: 10000,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.result && data.result.rows) {
      // Extract member addresses from the rows (member is at index 6)
      const members = data.result.rows
        .map((row) => row[6])
        .filter((addr) => addr && /^0x[a-fA-F0-9]{40}$/.test(addr));

      console.log(`Loaded ${members.length} Backers group members`);

      setAppState((prev) => ({
        ...prev,
        backersMembers: members,
      }));

      return members;
    } else {
      throw new Error("Invalid response format from RPC");
    }
  } catch (error) {
    console.error("Error fetching Backers members:", error);
    return null;
  }
};

// Calculate trust scores for hunters
const calculateTrustScores = async (hunters, backersMembers, setAppState) => {
  if (!hunters || hunters.length === 0) return;
  if (!backersMembers || backersMembers.length === 0) {
    console.warn("No Backers members available for trust score calculation");
    return;
  }

  setAppState((prev) => ({ ...prev, isLoadingScores: true }));

  try {
    console.log(`Calculating trust scores for ${hunters.length} hunters...`);

    // Get all hunter addresses
    const hunterAddresses = hunters.map((h) => h.address);

    // Call the relative trust score API
    const response = await fetch(`${ANALYTICS_API}/scoring/relative_trustscore`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        avatars: hunterAddresses,
        target_set: backersMembers,
        include_details: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Trust score API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Trust score results:", data);

    // Build a map of address -> trust score
    const scoresMap = {};
    if (data.results) {
      data.results.forEach((result) => {
        scoresMap[result.address.toLowerCase()] = result.relative_score;
      });
    }

    setAppState((prev) => ({
      ...prev,
      trustScores: scoresMap,
      isLoadingScores: false,
    }));
  } catch (error) {
    console.error("Error calculating trust scores:", error);
    setAppState((prev) => ({
      ...prev,
      isLoadingScores: false,
    }));
  }
};

// Load game data from OpenMiddlewareTransfer table
const loadGameData = async (setAppState) => {
  setAppState((prev) => ({ ...prev, isLoadingData: true }));

  try {
    console.log("Loading Trust Hunt game data...");

    const response = await fetch("https://rpc.circlesubi.network/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "circles_query",
        params: [
          {
            Namespace: "CrcV2_OIC",
            Table: "OpenMiddlewareTransfer",
            Columns: [
              "blockNumber",
              "timestamp",
              "transactionIndex",
              "logIndex",
              "transactionHash",
              "sender",
              "recipient",
              "amount",
              "data",
            ],
            Order: [
              { Column: "blockNumber", SortOrder: "DESC" },
              { Column: "transactionIndex", SortOrder: "DESC" },
              { Column: "logIndex", SortOrder: "DESC" },
            ],
            Limit: 200,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("Game data response:", data);

    if (data.error) {
      throw new Error(data.error.message || "Failed to load game data");
    }

    if (!data.result || !data.result.columns || !data.result.rows) {
      console.log("No game data found");
      setAppState((prev) => ({
        ...prev,
        isLoadingData: false,
        backers: [],
        hunters: [],
      }));
      return;
    }

    const columns = data.result.columns;
    const rows = data.result.rows;

    console.log(`Processing ${rows.length} transactions...`);

    const backers = [];
    const hunters = [];
    const seenBackers = new Set();
    const seenHunters = new Set();
    const removalsByAddress = { backers: {}, hunters: {} };

    // First pass: identify removal transactions
    rows.forEach((row) => {
      const entry = {};
      columns.forEach((col, index) => {
        entry[col] = row[index];
      });

      try {
        if (!entry.data || entry.data === "0x") return;

        const dataString = ethers.toUtf8String(entry.data);

        if (dataString.startsWith("trusthunt:remove:backer:")) {
          const targetAddress = dataString.substring("trusthunt:remove:backer:".length).toLowerCase();
          const blockNumber = entry.blockNumber || 0;
          if (!removalsByAddress.backers[targetAddress] || blockNumber > removalsByAddress.backers[targetAddress]) {
            removalsByAddress.backers[targetAddress] = blockNumber;
          }
        } else if (dataString.startsWith("trusthunt:remove:hunter:")) {
          const targetAddress = dataString.substring("trusthunt:remove:hunter:".length).toLowerCase();
          const blockNumber = entry.blockNumber || 0;
          if (!removalsByAddress.hunters[targetAddress] || blockNumber > removalsByAddress.hunters[targetAddress]) {
            removalsByAddress.hunters[targetAddress] = blockNumber;
          }
        }
      } catch (error) {
        console.log("Failed to decode removal transaction:", entry.transactionHash);
      }
    });

    console.log("Found removals:", removalsByAddress);

    // Second pass: collect entries, filtering out removed ones
    rows.forEach((row) => {
      const entry = {};
      columns.forEach((col, index) => {
        entry[col] = row[index];
      });

      try {
        if (!entry.data || entry.data === "0x") return;

        const dataString = ethers.toUtf8String(entry.data);
        console.log("Decoded data:", dataString);

        if (dataString.startsWith("trusthunt:backer:")) {
          const hints = dataString.substring("trusthunt:backer:".length);
          // Store lowercase for consistent cache access, but will fetch with checksummed
          const lowercaseAddress = entry.sender.toLowerCase();
          const entryBlockNumber = entry.blockNumber || 0;

          // Check if this entry should be removed
          if (removalsByAddress.backers[lowercaseAddress] && entryBlockNumber < removalsByAddress.backers[lowercaseAddress]) {
            console.log(`Filtering out backer ${lowercaseAddress} - removed by admin`);
            return;
          }

          // Only add if not already seen (keep first entry)
          if (!seenBackers.has(lowercaseAddress)) {
            backers.push({
              address: entry.sender, // Keep original for checksumming
              addressKey: lowercaseAddress, // For cache lookup
              hints: hints,
              timestamp: entry.timestamp,
              transactionHash: entry.transactionHash,
              blockNumber: entryBlockNumber,
            });
            seenBackers.add(lowercaseAddress);
          }
        } else if (dataString.startsWith("trusthunt:hunter:")) {
          const trustScore = dataString.substring("trusthunt:hunter:".length);
          // Store lowercase for consistent cache access, but will fetch with checksummed
          const lowercaseAddress = entry.sender.toLowerCase();
          const entryBlockNumber = entry.blockNumber || 0;

          // Check if this entry should be removed
          if (removalsByAddress.hunters[lowercaseAddress] && entryBlockNumber < removalsByAddress.hunters[lowercaseAddress]) {
            console.log(`Filtering out hunter ${lowercaseAddress} - removed by admin`);
            return;
          }

          // Only add if not already seen (keep first entry)
          if (!seenHunters.has(lowercaseAddress)) {
            hunters.push({
              address: entry.sender, // Keep original for checksumming
              addressKey: lowercaseAddress, // For cache lookup
              trustScore: trustScore,
              timestamp: entry.timestamp,
              transactionHash: entry.transactionHash,
              blockNumber: entryBlockNumber,
            });
            seenHunters.add(lowercaseAddress);
          }
        }
      } catch (error) {
        console.log("Failed to decode transaction:", entry.transactionHash);
      }
    });

    console.log("Parsed backers:", backers);
    console.log("Parsed hunters:", hunters);

    // Load profiles for all participants
    const allAddresses = [
      ...new Set([
        ...backers.map((b) => b.address),
        ...hunters.map((h) => h.address),
      ]),
    ];

    console.log("Loading profiles for addresses:", allAddresses);
    const profiles = await getProfilesByAddresses(allAddresses);
    console.log("Loaded profiles:", profiles);

    setAppState((prev) => ({
      ...prev,
      backers: backers,
      hunters: hunters,
      profileCache: { ...prev.profileCache, ...profiles },
      isLoadingData: false,
    }));
  } catch (error) {
    console.error("Error loading game data:", error);
    setAppState((prev) => ({
      ...prev,
      error: `Failed to load game data: ${error.message}`,
      isLoadingData: false,
    }));
  }
};

const appContent = ({
  appState,
  setAppState,
  currentAmount,
  setCurrentAmount,
  generateQR,
  metadata,
}) => {
  // Load game data on mount and refresh every 10 seconds
  useEffect(() => {
    loadGameData(setAppState);

    const interval = setInterval(() => {
      loadGameData(setAppState);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Countdown timer for game end
  useEffect(() => {
    const updateCountdown = () => {
      // Game ends: Friday, November 21st, 2025 at 12:00 PM Buenos Aires time (UTC-3)
      const gameEndDate = new Date('2025-11-21T12:00:00-03:00');
      const now = new Date();
      const timeLeft = gameEndDate - now;

      if (timeLeft <= 0) {
        setAppState((prev) => ({
          ...prev,
          countdown: "Game ended!",
          gameEnded: true,
        }));
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      let countdownText = "";
      if (days > 0) {
        countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else if (hours > 0) {
        countdownText = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        countdownText = `${minutes}m ${seconds}s`;
      } else {
        countdownText = `${seconds}s`;
      }

      setAppState((prev) => ({
        ...prev,
        countdown: countdownText,
        gameEnded: false,
      }));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch Backers members on mount (cached, only once)
  useEffect(() => {
    if (!appState.backersMembers) {
      fetchBackersMembers(setAppState);
    }
  }, []);

  // Calculate trust scores when hunters or backers members change
  useEffect(() => {
    if (appState.hunters.length > 0 && appState.backersMembers) {
      calculateTrustScores(appState.hunters, appState.backersMembers, setAppState);
    }
  }, [appState.hunters.length, appState.backersMembers]);

  const handleOpenJoinModal = () => {
    setAppState((prev) => ({
      ...prev,
      showJoinModal: true,
      error: null,
      successMessage: null,
    }));
  };

  const handleCloseJoinModal = () => {
    setAppState((prev) => ({
      ...prev,
      showJoinModal: false,
      entryType: null,
      qrCode: "",
      backerHints: "",
      hunterTrustScore: "",
      isWaitingForPayment: false,
      error: null,
    }));
  };

  const handleOpenAdminModal = () => {
    setAppState((prev) => ({
      ...prev,
      showAdminModal: true,
      adminRemovalType: null,
      adminRemovalAddress: "",
      adminQrCode: "",
      error: null,
    }));
  };

  const handleCloseAdminModal = () => {
    setAppState((prev) => ({
      ...prev,
      showAdminModal: false,
      adminRemovalType: null,
      adminRemovalAddress: "",
      adminQrCode: "",
      error: null,
    }));
  };

  const handleAdminRemovalTypeSelect = (type) => {
    setAppState((prev) => ({
      ...prev,
      adminRemovalType: type,
      adminRemovalAddress: "",
      adminQrCode: "",
      error: null,
    }));
  };

  const handleAdminRemovalAddressChange = (e) => {
    setAppState((prev) => ({ ...prev, adminRemovalAddress: e.target.value }));
  };

  const generateAdminRemovalQR = async () => {
    try {
      const address = appState.adminRemovalAddress.trim();

      if (!address) {
        setAppState((prev) => ({
          ...prev,
          error: "Please enter an address to remove!",
        }));
        return;
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        setAppState((prev) => ({
          ...prev,
          error: "Invalid Ethereum address format!",
        }));
        return;
      }

      const appData = `trusthunt:remove:${appState.adminRemovalType}:${address.toLowerCase()}`;

      // Pack data for middleware contract
      const packedData = packData(
        ethers.ZeroAddress,
        MIDDLEWARE_CONTRACT,
        appData,
      );

      // Create Metri URL with minimal amount
      const metriUrl = `https://app.metri.xyz/transfer/${MIDDLEWARE_CONTRACT}/crc/0.01?data=${packedData}`;

      console.log("Admin removal QR:", metriUrl);

      const qrCodeDataURL = await QRCode.toDataURL(metriUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });

      setAppState((prev) => ({
        ...prev,
        adminQrCode: qrCodeDataURL,
        error: null,
      }));
    } catch (error) {
      console.error("Failed to generate admin removal QR:", error);
      setAppState((prev) => ({
        ...prev,
        error: `Failed to generate QR code: ${error.message}`,
      }));
    }
  };

  const handleEntryTypeSelect = (type) => {
    setAppState((prev) => ({
      ...prev,
      entryType: type,
      qrCode: "",
      error: null,
    }));
  };

  const generateEntryQR = async () => {
    try {
      let appData = "";

      if (appState.entryType === "backer") {
        if (!appState.backerHints.trim()) {
          setAppState((prev) => ({
            ...prev,
            error: "Please provide hints about how to find you!",
          }));
          return;
        }
        appData = `trusthunt:backer:${appState.backerHints.trim()}`;
      } else if (appState.entryType === "hunter") {
        if (!appState.hunterTrustScore.trim()) {
          setAppState((prev) => ({
            ...prev,
            error: "Please provide your initial trust score!",
          }));
          return;
        }
        appData = `trusthunt:hunter:${appState.hunterTrustScore.trim()}`;
      }

      // Pack data for middleware contract
      const packedData = packData(
        ethers.ZeroAddress,
        MIDDLEWARE_CONTRACT,
        appData,
      );

      // Create Metri URL with 1 $OPEN amount
      const metriUrl = `https://app.metri.xyz/transfer/${MIDDLEWARE_CONTRACT}/crc/1?data=${packedData}`;

      console.log("Generating QR for:", metriUrl);

      const qrCodeDataURL = await QRCode.toDataURL(metriUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });

      setAppState((prev) => ({
        ...prev,
        qrCode: qrCodeDataURL,
        isWaitingForPayment: true,
        error: null,
      }));

      setCurrentAmount(1);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      setAppState((prev) => ({
        ...prev,
        error: `Failed to generate QR code: ${error.message}`,
      }));
    }
  };

  const handleBackerHintsChange = (e) => {
    setAppState((prev) => ({ ...prev, backerHints: e.target.value }));
  };

  const handleHunterScoreChange = (e) => {
    setAppState((prev) => ({ ...prev, hunterTrustScore: e.target.value }));
  };

  return (
    <>
      <style jsx>{`
        @media (max-width: 768px) {
          .game-container {
            flex-direction: column !important;
          }
          .game-list {
            min-width: 100% !important;
          }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .close-button {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #666;
          line-height: 1;
          padding: 5px;
        }

        .close-button:hover {
          color: #000;
        }
      `}</style>

      {/* Header Images */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <img
          src="/circlesxdevconnect.jpg"
          alt="Circles x Devconnect"
          style={{ maxWidth: "100%", height: "auto", marginBottom: "10px" }}
        />
      </div>

      {/* Game Description */}
      <div
        style={{
          margin: "20px 0",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "2px solid #6366f1",
        }}
      >
        <h3 style={{ ...OICStyles.h3, marginTop: 0, color: "#6366f1" }}>
          🎯 How to Play Trust Hunt
        </h3>
        <p style={{ margin: "10px 0", lineHeight: "1.6" }}>
          <strong>Backers:</strong> Enter hints about what you're wearing or how to spot you.
          Hunters will try to find you and earn your trust!
        </p>
        <p style={{ margin: "10px 0", lineHeight: "1.6" }}>
          <strong>Hunters:</strong> Enter your initial trust score. Find backers,
          get trusted by them, and increase your score!
        </p>
        <p style={{ margin: "10px 0", lineHeight: "1.6", color: "#666" }}>
          Entry fee: 1 $OPEN (for either role)
        </p>
      </div>

      {/* Countdown Timer */}
      <div
        style={{
          margin: "20px 0",
          padding: "20px",
          backgroundColor: appState.gameEnded ? "#fee" : "#fff3cd",
          borderRadius: "8px",
          border: appState.gameEnded ? "2px solid #f44336" : "2px solid #ffc107",
          textAlign: "center",
        }}
      >
        <h3 style={{ ...OICStyles.h3, marginTop: 0, color: appState.gameEnded ? "#f44336" : "#856404" }}>
          ⏰ {appState.gameEnded ? "Game Over!" : "Game Ends In"}
        </h3>
        <div
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: appState.gameEnded ? "#f44336" : "#333",
            margin: "10px 0",
            fontFamily: "monospace",
          }}
        >
          {appState.countdown || "Loading..."}
        </div>
        {!appState.gameEnded && (
          <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
            Friday, November 21st, 2025 at 12:00 PM (Buenos Aires time)
          </p>
        )}
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



      {/* Join Game Button */}
      <div style={{ textAlign: "center", margin: "30px 0" }}>
        <button
          onClick={handleOpenJoinModal}
          style={{
            ...OICStyles.button,
            ...OICStyles.buttonPrimary,
            padding: "15px 40px",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        >
          🎮 Join the Game
        </button>
      </div>

      {/* Game Lists */}
      <div
        className="game-container"
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "40px",
          justifyContent: "space-between",
        }}
      >
        {/* Backers List */}
        <div className="game-list" style={{ flex: 1, minWidth: "300px" }}>
          <h3 style={{ ...OICStyles.h3, color: "#6366f1" }}>
            🎯 Backers ({appState.backers.length})
          </h3>
          {appState.isLoadingData && appState.backers.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>Loading backers...</p>
          ) : appState.backers.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>No backers yet. Be the first!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {appState.backers.map((backer, index) => {
                const profile = appState.profileCache[backer.addressKey];
                const displayName = profile?.name || `${backer.address.substring(0, 6)}...${backer.address.substring(backer.address.length - 4)}`;
                const imageUrl = profile?.imageUrl || profile?.previewImageUrl;

                return (
                  <div
                    key={`${backer.address}-${index}`}
                    style={{
                      padding: "15px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={displayName}
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #6366f1",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            backgroundColor: "#6366f1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            color: "white",
                            fontWeight: "bold",
                          }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "16px", color: "#333" }}>
                          {displayName}
                        </div>
                        {profile?.name && (
                          <div style={{ fontSize: "11px", color: "#888", fontFamily: "monospace" }}>
                            {backer.address.substring(0, 8)}...{backer.address.substring(backer.address.length - 6)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "5px",
                        fontSize: "14px",
                        color: "#333",
                        fontStyle: "italic",
                      }}
                    >
                      "{backer.hints}"
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hunters List */}
        <div className="game-list" style={{ flex: 1, minWidth: "300px" }}>
          <h3 style={{ ...OICStyles.h3, color: "#10b981" }}>
            🏹 Hunters ({appState.hunters.length})
            {appState.isLoadingScores && (
              <span style={{ fontSize: "12px", color: "#666", marginLeft: "10px" }}>
                Calculating scores...
              </span>
            )}
          </h3>
          {appState.isLoadingData && appState.hunters.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>Loading hunters...</p>
          ) : appState.hunters.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>No hunters yet. Be the first!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {appState.hunters
                .map((hunter) => {
                  const currentScore = appState.trustScores[hunter.addressKey] || 0;
                  const initialScore = parseFloat(hunter.trustScore) || 0;
                  const scoreIncrease = currentScore - initialScore;
                  return { ...hunter, currentScore, initialScore, scoreIncrease };
                })
                .sort((a, b) => b.scoreIncrease - a.scoreIncrease)
                .map((hunter, index) => {
                const profile = appState.profileCache[hunter.addressKey];
                const displayName = profile?.name || `${hunter.address.substring(0, 6)}...${hunter.address.substring(hunter.address.length - 4)}`;
                const imageUrl = profile?.imageUrl || profile?.previewImageUrl;
                const isWinner = index === 0 && hunter.scoreIncrease > 0;

                return (
                  <div
                    key={`${hunter.address}-${index}`}
                    style={{
                      padding: "15px",
                      backgroundColor: isWinner ? "#f0fdf4" : "#ffffff",
                      border: isWinner ? "2px solid #10b981" : "1px solid #e0e0e0",
                      borderRadius: "8px",
                      boxShadow: isWinner ? "0 4px 8px rgba(16,185,129,0.2)" : "0 2px 4px rgba(0,0,0,0.05)",
                      position: "relative",
                    }}
                  >
                    {isWinner && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-10px",
                          right: "10px",
                          backgroundColor: "#10b981",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        🏆 CURRENT LEAD
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={displayName}
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #10b981",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            backgroundColor: "#10b981",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            color: "white",
                            fontWeight: "bold",
                          }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "16px", color: "#333" }}>
                          {displayName}
                        </div>
                        {profile?.name && (
                          <div style={{ fontSize: "11px", color: "#888", fontFamily: "monospace" }}>
                            {hunter.address.substring(0, 8)}...{hunter.address.substring(hunter.address.length - 6)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#666" }}>Initial:</span>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#666" }}>
                          {hunter.initialScore.toFixed(1)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#666" }}>Current:</span>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                          {appState.trustScores[hunter.addressKey] !== undefined
                            ? hunter.currentScore.toFixed(1)
                            : "..."}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: "8px",
                          borderTop: "1px solid #e0e0e0",
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>
                          Score Increase:
                        </span>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: "bold",
                            color: hunter.scoreIncrease >= 0 ? "#10b981" : "#ef4444",
                          }}
                        >
                          {hunter.scoreIncrease >= 0 ? "+" : ""}
                          {hunter.scoreIncrease.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Refresh Info */}
      <div
        style={{
          marginTop: "30px",
          padding: "10px",
          textAlign: "center",
          fontSize: "12px",
          color: "#666",
        }}
      >
        Lists auto-refresh every 10{" "}
        <span
          onClick={handleOpenAdminModal}
          style={{
            cursor: "pointer",
            textDecoration: "none",
            color: "#666",
          }}
          onMouseOver={(e) => e.target.style.textDecoration = "underline"}
          onMouseOut={(e) => e.target.style.textDecoration = "none"}
        >
          seconds
        </span>
      </div>

      {/* Join Modal */}
      {appState.showJoinModal && (
        <div className="modal-overlay" onClick={handleCloseJoinModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleCloseJoinModal}>
              ×
            </button>

            <h2 style={{ ...OICStyles.h2, marginTop: 0, color: "#6366f1" }}>
              Join the Game
            </h2>

            {/* Error Message */}
            {appState.error && (
              <div
                style={{
                  margin: "15px 0",
                  padding: "12px",
                  backgroundColor: "#ffe6e6",
                  border: "2px solid #f44336",
                  borderRadius: "5px",
                  color: "#f44336",
                  fontSize: "14px",
                }}
              >
                ⚠️ {appState.error}
              </div>
            )}

            {!appState.qrCode ? (
              <>
                <div style={{ display: "flex", gap: "10px", marginBottom: "25px", justifyContent: "center" }}>
                  <button
                    onClick={() => handleEntryTypeSelect("backer")}
                    style={{
                      ...OICStyles.button,
                      ...(appState.entryType === "backer" ? OICStyles.buttonPrimary : {}),
                      padding: "12px 24px",
                      fontSize: "16px",
                    }}
                  >
                    🎯 Enter as Backer
                  </button>
                  <button
                    onClick={() => handleEntryTypeSelect("hunter")}
                    style={{
                      ...OICStyles.button,
                      ...(appState.entryType === "hunter" ? OICStyles.buttonPrimary : {}),
                      padding: "12px 24px",
                      fontSize: "16px",
                    }}
                  >
                    🏹 Enter as Hunter
                  </button>
                </div>

                {appState.entryType === "backer" && (
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                      Hints for Hunters (what are you wearing? where can you be found?):
                    </label>
                    <textarea
                      value={appState.backerHints}
                      onChange={handleBackerHintsChange}
                      placeholder="e.g., 'Blue jacket, red hat, usually near the coffee stand'"
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        padding: "10px",
                        fontSize: "14px",
                        borderRadius: "5px",
                        border: "1px solid #ddd",
                        fontFamily: "inherit",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                      maxLength={200}
                    />
                    <div style={{ textAlign: "right", fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      {appState.backerHints.length}/200 characters
                    </div>
                    <button
                      onClick={generateEntryQR}
                      style={{
                        ...OICStyles.button,
                        ...OICStyles.buttonPrimary,
                        width: "100%",
                        marginTop: "15px",
                        padding: "12px",
                        fontSize: "16px",
                      }}
                      disabled={!appState.backerHints.trim()}
                    >
                      Generate QR Code (1 $OPEN)
                    </button>
                  </div>
                )}

                {appState.entryType === "hunter" && (
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                      Your Initial Trust Score:
                    </label>
                    <input
                      type="text"
                      value={appState.hunterTrustScore}
                      onChange={handleHunterScoreChange}
                      placeholder="e.g., '0' or '100'"
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "14px",
                        borderRadius: "5px",
                        border: "1px solid #ddd",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                      maxLength={10}
                    />
                    <button
                      onClick={generateEntryQR}
                      style={{
                        ...OICStyles.button,
                        ...OICStyles.buttonPrimary,
                        width: "100%",
                        marginTop: "15px",
                        padding: "12px",
                        fontSize: "16px",
                      }}
                      disabled={!appState.hunterTrustScore.trim()}
                    >
                      Generate QR Code (1 $OPEN)
                    </button>
                  </div>
                )}

                {!appState.entryType && (
                  <p style={{ textAlign: "center", color: "#666", fontStyle: "italic" }}>
                    Select a role to get started
                  </p>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>
                  Scan to Enter the Game
                </h3>
                <img
                  src={appState.qrCode}
                  alt="Entry QR Code"
                  style={{ maxWidth: "300px", width: "100%" }}
                />
                <p style={{ margin: "15px 0", fontSize: "14px", color: "#666" }}>
                  Cost: 1 $OPEN
                </p>
                {appState.isWaitingForPayment && (
                  <p style={{ color: "#6366f1", fontStyle: "italic" }}>
                    Waiting for payment confirmation...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Removal Modal */}
      {appState.showAdminModal && (
        <div className="modal-overlay" onClick={handleCloseAdminModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleCloseAdminModal}>
              ×
            </button>

            <h2 style={{ ...OICStyles.h2, marginTop: 0, color: "#ef4444" }}>
              🔒 Admin: Remove Player
            </h2>

            <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: "5px", fontSize: "14px" }}>
              ⚠️ This will remove all entries from the specified address that are older than this removal transaction.
            </div>

            {/* Error Message */}
            {appState.error && (
              <div
                style={{
                  margin: "15px 0",
                  padding: "12px",
                  backgroundColor: "#ffe6e6",
                  border: "2px solid #f44336",
                  borderRadius: "5px",
                  color: "#f44336",
                  fontSize: "14px",
                }}
              >
                ⚠️ {appState.error}
              </div>
            )}

            {!appState.adminQrCode ? (
              <>
                <div style={{ display: "flex", gap: "10px", marginBottom: "25px", justifyContent: "center" }}>
                  <button
                    onClick={() => handleAdminRemovalTypeSelect("backer")}
                    style={{
                      ...OICStyles.button,
                      ...(appState.adminRemovalType === "backer" ? OICStyles.buttonPrimary : {}),
                      padding: "12px 24px",
                      fontSize: "16px",
                    }}
                  >
                    🎯 Remove Backer
                  </button>
                  <button
                    onClick={() => handleAdminRemovalTypeSelect("hunter")}
                    style={{
                      ...OICStyles.button,
                      ...(appState.adminRemovalType === "hunter" ? OICStyles.buttonPrimary : {}),
                      padding: "12px 24px",
                      fontSize: "16px",
                    }}
                  >
                    🏹 Remove Hunter
                  </button>
                </div>

                {appState.adminRemovalType && (
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                      Address to Remove:
                    </label>
                    <input
                      type="text"
                      value={appState.adminRemovalAddress}
                      onChange={handleAdminRemovalAddressChange}
                      placeholder="0x..."
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "14px",
                        borderRadius: "5px",
                        border: "1px solid #ddd",
                        fontFamily: "monospace",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      onClick={generateAdminRemovalQR}
                      style={{
                        ...OICStyles.button,
                        ...OICStyles.buttonPrimary,
                        width: "100%",
                        marginTop: "15px",
                        padding: "12px",
                        fontSize: "16px",
                        backgroundColor: "#ef4444",
                      }}
                      disabled={!appState.adminRemovalAddress.trim()}
                    >
                      Generate Removal QR (0.01 $OPEN)
                    </button>
                  </div>
                )}

                {!appState.adminRemovalType && (
                  <p style={{ textAlign: "center", color: "#666", fontStyle: "italic" }}>
                    Select player type to remove
                  </p>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>
                  Scan to Remove Player
                </h3>
                <img
                  src={appState.adminQrCode}
                  alt="Admin Removal QR Code"
                  style={{ maxWidth: "300px", width: "100%" }}
                />
                <p style={{ margin: "15px 0", fontSize: "14px", color: "#666" }}>
                  Cost: 0.01 $OPEN
                </p>
                <div style={{ fontSize: "12px", color: "#ef4444", fontFamily: "monospace", wordBreak: "break-all", padding: "10px", backgroundColor: "#ffe6e6", borderRadius: "5px" }}>
                  Removing {appState.adminRemovalType}: {appState.adminRemovalAddress}
                </div>
                <button
                  onClick={() => setAppState((prev) => ({ ...prev, adminQrCode: "" }))}
                  style={{
                    ...OICStyles.button,
                    marginTop: "15px",
                    padding: "8px 16px",
                    fontSize: "14px",
                  }}
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default createOICApp(metadata, appContent);
