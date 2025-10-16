import { createOICApp } from "../../lib/oic-framework";
import { OICStyles } from "../../lib/oic-styles";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { getProfilesByAddresses } from "../../lib/profiles";
import ProfileDisplay from "../../components/ProfileDisplay";
import QRCode from "qrcode";
import { ethers } from "ethers";

const OIC_GROUP_ADDRESS = "0x4e2564e5df6c1fb10c1a018538de36e4d5844de5";
const MIDDLEWARE_CONTRACT = "0x6fff09332ae273ba7095a2a949a7f4b89eb37c52";

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
  appId: "tipping",
  title: "Tip OIC Members",
  description:
    "Send $OPEN tips to Open Internet Club group members. Ran out of $OPEN to tip? Find instructions for minting $OPEN on the home page.",
  recipient: MIDDLEWARE_CONTRACT,
  initialState: {
    members: [],
    filteredMembers: [],
    profileCache: {},
    selectedMember: null,
    searchQuery: "",
    qrCode: "",
    tipAmount: 1,
    tipMessage: "",
    isLoadingMembers: false,
    isLoadingTips: false,
    isWaitingForPayment: false,
    error: null,
    successMessage: null,
    tipsHistory: [],
  },
  onPayment: async (
    eventData,
    appState,
    setAppState,
    currentAmount,
    setCurrentAmount,
  ) => {
    // Payment confirmation removed - users will see their tip appear in the feed
    console.log(
      "Payment event received (not used for confirmation):",
      eventData,
    );
  },
};

// Load tips history from OpenMiddlewareTransfer table
const loadTipsHistory = async (setAppState) => {
  setAppState((prev) => ({ ...prev, isLoadingTips: true }));

  try {
    console.log("Loading tips history...");

    // Try the main endpoint first
    let response = await fetch("https://rpc.circlesubi.network/", {
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
              "onBehalf",
              "sender",
              "recipient",
              "amount",
              "inflationaryAmount",
              "data",
            ],
            Order: [
              { Column: "blockNumber", SortOrder: "DESC" },
              { Column: "transactionIndex", SortOrder: "DESC" },
              { Column: "logIndex", SortOrder: "DESC" },
            ],
            Limit: 50,
          },
        ],
      }),
    });

    let data = await response.json();
    console.log("Tips history response:", data);

    // If first endpoint fails, try alternative
    if (data.error) {
      console.log("Main endpoint failed, trying alternative...");
      response = await fetch("https://rpc.aboutcircles.com/", {
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
                "transactionHash",
                "sender",
                "recipient",
                "amount",
                "data",
              ],
              Order: [{ Column: "blockNumber", SortOrder: "DESC" }],
              Limit: 50,
            },
          ],
        }),
      });
      data = await response.json();
      console.log("Alternative endpoint response:", data);
    }

    if (data.error) {
      throw new Error(data.error.message || "Failed to load tips history");
    }

    if (!data.result || !data.result.columns || !data.result.rows) {
      console.log("No tips history found");
      setAppState((prev) => ({
        ...prev,
        isLoadingTips: false,
        tipsHistory: [],
      }));
      return;
    }

    // Parse the tips data
    const columns = data.result.columns;
    const rows = data.result.rows;

    console.log(`Processing ${rows.length} transactions...`);

    const tips = rows
      .map((row) => {
        const tip = {};
        columns.forEach((col, index) => {
          tip[col] = row[index];
        });
        return tip;
      })
      .filter((tip) => {
        // Filter for tipping app transactions
        try {
          if (!tip.data || tip.data === "0x") return false;

          console.log(
            "Checking transaction:",
            tip.transactionHash,
            "Data:",
            tip.data,
          );

          // Data is hex-encoded UTF-8 string, not packed data
          const dataString = ethers.toUtf8String(tip.data);
          console.log("Decoded data string:", dataString);

          const isTipping = dataString.startsWith("tipping");
          console.log("Is tipping transaction:", isTipping);

          return isTipping;
        } catch (error) {
          console.log(
            "Failed to decode transaction:",
            tip.transactionHash,
            error.message,
          );
          return false;
        }
      });

    console.log("Filtered tips:", tips);

    // Load profiles for all involved addresses
    const allAddresses = [
      ...new Set([
        ...tips.map((tip) => tip.sender),
        ...tips.map((tip) => tip.recipient),
      ]),
    ];

    console.log("Loading profiles for addresses:", allAddresses);
    const profiles = await getProfilesByAddresses(allAddresses);
    console.log("Loaded profiles:", profiles);

    setAppState((prev) => ({
      ...prev,
      tipsHistory: tips,
      profileCache: { ...prev.profileCache, ...profiles },
      isLoadingTips: false,
    }));
  } catch (error) {
    console.error("Error loading tips history:", error);
    setAppState((prev) => ({
      ...prev,
      error: `Failed to load tips history: ${error.message}`,
      isLoadingTips: false,
    }));
  }
};

// Load group members from the database
const loadGroupMembers = async (setAppState) => {
  setAppState((prev) => ({ ...prev, isLoadingMembers: true, error: null }));

  try {
    console.log("Loading OIC group members...");

    const response = await fetch("https://rpc.aboutcircles.com/", {
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
                Value: OIC_GROUP_ADDRESS,
              },
            ],
            Order: [{ Column: "member", SortOrder: "Asc" }],
            Limit: 1000,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("Group members response:", data);

    if (data.error) {
      throw new Error(data.error.message || "Failed to load group members");
    }

    if (!data.result || !data.result.columns || !data.result.rows) {
      throw new Error("Invalid response format");
    }

    // Find the index of the "member" column
    const memberColumnIndex = data.result.columns.indexOf("member");
    if (memberColumnIndex === -1) {
      throw new Error("Member column not found in response");
    }

    // Extract member addresses from rows
    const memberAddresses = data.result.rows.map(
      (row) => row[memberColumnIndex],
    );
    console.log("Found member addresses:", memberAddresses);

    // Load profiles for all members
    const profiles = await getProfilesByAddresses(memberAddresses);
    console.log("Loaded profiles:", profiles);

    // Create member objects with addresses
    const members = memberAddresses.map((address) => ({ address }));

    setAppState((prev) => ({
      ...prev,
      members,
      filteredMembers: members,
      profileCache: { ...prev.profileCache, ...profiles },
      isLoadingMembers: false,
    }));
  } catch (error) {
    console.error("Error loading group members:", error);
    setAppState((prev) => ({
      ...prev,
      error: `Failed to load group members: ${error.message}`,
      isLoadingMembers: false,
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
  // Load members and tips history on mount, then refresh tips every 5 seconds
  useEffect(() => {
    loadGroupMembers(setAppState);
    loadTipsHistory(setAppState);

    // Set up auto-refresh for tips history
    const interval = setInterval(() => {
      loadTipsHistory(setAppState);
    }, 5000); // Refresh every 5 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Filter members based on search query - memoized to prevent unnecessary recalculations
  const filteredMembers = useMemo(() => {
    if (!appState.searchQuery.trim()) {
      return appState.members;
    }
    const query = appState.searchQuery.toLowerCase();
    return appState.members.filter((member) => {
      const profile = appState.profileCache[member.address];
      const name = profile?.name || "";
      const address = member.address.toLowerCase();
      return name.toLowerCase().includes(query) || address.includes(query);
    });
  }, [appState.searchQuery, appState.members, appState.profileCache]);

  // Handle search input - memoized callback
  const handleSearchChange = useCallback(
    (e) => {
      setAppState((prev) => ({ ...prev, searchQuery: e.target.value }));
    },
    [setAppState],
  );

  // Generate QR code for tip - memoized callback
  const generateTipQR = useCallback(
    async (recipientAddress, message) => {
      try {
        // Pack data: onBehalf=null, recipient=selected member, data=app_id+message
        const appData = message ? `tipping:${message}` : "tipping";
        const packedData = packData(
          ethers.ZeroAddress,
          recipientAddress,
          appData,
        );

        // Create Metri URL without fixed amount - user chooses amount in Metri
        const metriUrl = `https://app.metri.xyz/transfer/${MIDDLEWARE_CONTRACT}/crc?data=${packedData}`;

        console.log("Generating QR for:", metriUrl);

        // Generate QR code
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
        }));
      } catch (error) {
        console.error("Failed to generate QR code:", error);
        setAppState((prev) => ({
          ...prev,
          error: `Failed to generate QR code: ${error.message}`,
        }));
      }
    },
    [setAppState],
  );

  // Handle member selection - memoized callback
  const handleMemberSelect = useCallback(
    (member) => {
      setAppState((prev) => ({
        ...prev,
        selectedMember: member,
        qrCode: "",
        error: null,
        successMessage: null,
      }));
      // Generate QR code with current message
      generateTipQR(member.address, appState.tipMessage);
    },
    [setAppState, generateTipQR, appState.tipMessage],
  );

  // Handle tip amount change - memoized callback
  const handleTipAmountChange = useCallback(
    (e) => {
      const amount = parseInt(e.target.value) || 1;
      setAppState((prev) => ({ ...prev, tipAmount: amount }));
      setCurrentAmount(amount);
    },
    [setAppState, setCurrentAmount],
  );

  // Handle message change - memoized callback
  const handleMessageChange = useCallback(
    (e) => {
      const message = e.target.value;
      setAppState((prev) => ({ ...prev, tipMessage: message }));
      if (appState.selectedMember) {
        generateTipQR(appState.selectedMember.address, message);
      }
    },
    [setAppState, appState.selectedMember, generateTipQR],
  );

  // Clear selection - memoized callback
  const handleClearSelection = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      selectedMember: null,
      qrCode: "",
      isWaitingForPayment: false,
      error: null,
      successMessage: null,
    }));
  }, [setAppState]);

  // Get Metri URL for mobile link - memoized callback
  const getMetriUrl = useCallback((recipientAddress, message) => {
    const appData = message ? `tipping:${message}` : "tipping";
    const packedData = packData(ethers.ZeroAddress, recipientAddress, appData);
    return `https://app.metri.xyz/transfer/${MIDDLEWARE_CONTRACT}/crc?data=${packedData}`;
  }, []);

  return (
    <>
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
          <button
            onClick={handleClearSelection}
            style={{
              marginLeft: "15px",
              padding: "5px 10px",
              fontSize: "12px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            Tip Another Member
          </button>
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

      {/* Selected Member and Tip Section */}
      {appState.selectedMember && (
        <div
          style={{
            margin: "20px 0",
            padding: "20px",
            border: "2px solid #4CAF50",
            borderRadius: "5px",
            backgroundColor: "#f8fff8",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <div>
              <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>Tipping</h3>
              <ProfileDisplay
                address={appState.selectedMember.address}
                profile={appState.profileCache[appState.selectedMember.address]}
                showAddress={true}
                imageSize={40}
              />
            </div>
            <button
              onClick={handleClearSelection}
              style={{
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontSize: "14px",
                color: "#666",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Message (optional):
            </label>
            <input
              type="text"
              value={appState.tipMessage}
              onChange={handleMessageChange}
              placeholder="Add a message with your tip..."
              maxLength={100}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                border: "1px solid #000",
                borderRadius: "0",
              }}
            />
            <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>
              {appState.tipMessage.length}/100 characters
            </div>
          </div>

          {appState.qrCode && (
            <div style={OICStyles.qrContainer}>
              <h4 style={{ marginTop: 0, marginBottom: "10px" }}>
                Scan to Tip This Member
              </h4>
              <img
                src={appState.qrCode}
                alt="Tip QR Code"
                style={{ maxWidth: "200px" }}
              />
              {appState.tipMessage && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    margin: "10px 0",
                    fontStyle: "italic",
                  }}
                >
                  Message: "{appState.tipMessage}"
                </p>
              )}
              <div style={{ margin: "15px 0" }}>
                <a
                  href={getMetriUrl(
                    appState.selectedMember.address,
                    appState.tipMessage,
                  )}
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
                  📱 Open in Metri App
                </a>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#666",
                  fontStyle: "italic",
                }}
              >
                Your tip will appear in the feed below after sending
              </p>
            </div>
          )}
        </div>
      )}

      {/* Member Selection */}
      {!appState.selectedMember && (
        <div>
          <h3 style={OICStyles.h3}>Select a Member to Tip</h3>

          {/* Search */}
          <div style={{ margin: "15px 0" }}>
            <input
              type="text"
              value={appState.searchQuery}
              onChange={handleSearchChange}
              placeholder="Search members by name or address..."
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #000",
                borderRadius: "0",
              }}
            />
          </div>

          {/* Loading */}
          {appState.isLoadingMembers && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#666",
                fontStyle: "italic",
              }}
            >
              Loading OIC members...
            </div>
          )}

          {/* Members List */}
          {!appState.isLoadingMembers && (
            <div style={{ margin: "20px 0" }}>
              {filteredMembers.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#666",
                    fontStyle: "italic",
                  }}
                >
                  {appState.searchQuery
                    ? "No members found matching your search."
                    : "No members found."}
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                  }}
                >
                  {filteredMembers.map((member, index) => (
                    <div
                      key={member.address}
                      onClick={() => handleMemberSelect(member)}
                      style={{
                        padding: "12px 15px",
                        borderBottom:
                          index < filteredMembers.length - 1
                            ? "1px solid #eee"
                            : "none",
                        cursor: "pointer",
                        backgroundColor:
                          index % 2 === 0 ? "#fafafa" : "#ffffff",
                        transition: "background-color 0.2s",
                      }}
                      className="member-item"
                    >
                      <ProfileDisplay
                        address={member.address}
                        profile={appState.profileCache[member.address]}
                        showAddress={true}
                        showDescription={false}
                        imageSize={32}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <TipsHistory
        tips={appState.tipsHistory}
        profileCache={appState.profileCache}
        isLoadingTips={appState.isLoadingTips}
      />

      {/* Instructions */}
      <div style={{ margin: "30px 0", fontSize: "14px", color: "#666" }}>
        <h3 style={OICStyles.h3}>How it works</h3>
        <ol style={{ paddingLeft: "20px" }}>
          <li>Browse or search for Open Internet Club members</li>
          <li>Select a member you'd like to tip</li>
          <li>Add an optional message with your tip</li>
          <li>
            Choose the tip amount when you scan the QR code or open the link
          </li>
          <li>Scan the QR code or click the link to send via Metri</li>
          <li>Your tip will be sent directly to the member</li>
        </ol>
      </div>

      <style jsx>{`
        .member-item:hover {
          background-color: #f0f0f0 !important;
        }
      `}</style>
    </>
  );
};

// Memoized TipsHistory component to prevent unnecessary re-renders
const TipItem = memo(({ tip, index, totalTips, profileCache }) => {
  const amount = Math.floor(Number(tip.amount) / Math.pow(10, 18));

  const message = useMemo(() => {
    try {
      const dataString = ethers.toUtf8String(tip.data);
      if (dataString.includes(":")) {
        return dataString.split(":")[1];
      }
      return "";
    } catch (error) {
      return "";
    }
  }, [tip.data]);

  return (
    <div
      style={{
        padding: "15px",
        borderBottom: index < totalTips - 1 ? "1px solid #eee" : "none",
        backgroundColor: index % 2 === 0 ? "#fafafa" : "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ProfileDisplay
            address={tip.sender}
            profile={profileCache[tip.sender]}
            showAddress={false}
            imageSize={24}
          />
          <span style={{ fontSize: "14px", color: "#666" }}>→</span>
          <ProfileDisplay
            address={tip.recipient}
            profile={profileCache[tip.recipient]}
            showAddress={false}
            imageSize={24}
          />
        </div>
        <span
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            color: "#4CAF50",
          }}
        >
          {amount} $OPEN
        </span>
      </div>
      {message && (
        <div
          style={{
            fontSize: "13px",
            color: "#666",
            fontStyle: "italic",
            marginBottom: "5px",
          }}
        >
          "{message}"
        </div>
      )}
      <div style={{ fontSize: "11px", color: "#999" }}>
        {new Date(tip.timestamp * 1000).toLocaleString()}
      </div>
    </div>
  );
});

TipItem.displayName = "TipItem";

const TipsHistory = memo(({ tips, profileCache, isLoadingTips }) => {
  return (
    <div style={{ margin: "40px 0" }}>
      <h3 style={OICStyles.h3}>Recent Tips</h3>
      {isLoadingTips ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#666",
            fontStyle: "italic",
          }}
        >
          Loading recent tips...
        </div>
      ) : tips.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#666",
            fontStyle: "italic",
          }}
        >
          No tips yet. Be the first to send a tip!
        </div>
      ) : (
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: "3px",
          }}
        >
          {tips.map((tip, index) => (
            <TipItem
              key={`${tip.transactionHash}-${tip.logIndex}`}
              tip={tip}
              index={index}
              totalTips={tips.length}
              profileCache={profileCache}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TipsHistory.displayName = "TipsHistory";

export default createOICApp(metadata, appContent);
