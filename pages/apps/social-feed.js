import { createOICApp } from "../../lib/oic-framework";
import { OICStyles } from "../../lib/oic-styles";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import ProfileDisplay from "../../components/ProfileDisplay";
import TransactionLink from "../../components/TransactionLink";
import { getProfilesByAddresses } from "../../lib/profiles";

// Initialize Supabase client with service role for server operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Server-side Supabase client with service role (for RLS bypass)
const getServerSupabase = () => {
  if (typeof window === "undefined") {
    // Server-side: use service role key
    return createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  // Client-side: use anon key
  return supabase;
};

// Hash function for text
const hashText = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

const metadata = {
  appId: "social-feed",
  title: "Pay-to-Post Social Feed",
  description:
    "Post messages by paying $OPEN tokens. 1 $OPEN per 100 characters (rounded up). Not enough $OPEN to post? Find instructions for minting $OPEN on the home page.",
  recipient: "0xf48554937f18885c7f15c432c596b5843648231d",
  initialState: {
    messageText: "",
    qrCode: "",
    isWaiting: false,
    error: null,
    successMessage: null,
    messages: [],
    expectedHash: null,
    expectedAmount: 0,
    profileCache: {},
  },
  onPayment: async (
    eventData,
    appState,
    setAppState,
    currentAmount,
    setCurrentAmount,
  ) => {
    console.log("Social feed payment received:", eventData);

    // Parse the received amount
    const receivedAmount = Math.floor(
      Number(eventData.amount) / Math.pow(10, 18),
    );

    // Extract custom data (should be text hash)
    const customData = eventData.data?.split(":")[1] || "";

    // Validate the payment
    if (
      receivedAmount === appState.expectedAmount &&
      customData === appState.expectedHash &&
      appState.messageText.trim()
    ) {
      try {
        // Insert message into Supabase using server client
        const serverSupabase = getServerSupabase();
        const { data, error } = await serverSupabase
          .from("messages")
          .insert([
            {
              message_text: appState.messageText.trim(),
              poster_address: eventData.sender,
              transaction_hash: eventData.transactionHash,
              amount_paid: receivedAmount,
              text_hash: customData,
            },
          ])
          .select();

        if (error) {
          throw error;
        }

        // Success - clear form and show message
        setAppState((prev) => ({
          ...prev,
          messageText: "",
          qrCode: "",
          isWaiting: false,
          expectedHash: null,
          expectedAmount: 0,
          successMessage: `Message posted successfully! Paid ${receivedAmount} $OPEN.`,
        }));

        // Refresh messages
        loadMessages(setAppState);
      } catch (error) {
        console.error("Error posting message:", error);
        setAppState((prev) => ({
          ...prev,
          error: `Failed to post message: ${error.message}`,
          isWaiting: false,
        }));
      }
    } else {
      console.log("Payment validation failed:", {
        receivedAmount,
        expectedAmount: appState.expectedAmount,
        customData,
        expectedHash: appState.expectedHash,
      });
    }
  },
};

// Load messages from Supabase and their profiles
const loadMessages = async (setAppState) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    const messages = data || [];

    // Extract unique addresses
    const addresses = [...new Set(messages.map((msg) => msg.poster_address))];

    // Load profiles for all addresses
    const profiles = await getProfilesByAddresses(addresses);

    setAppState((prev) => ({
      ...prev,
      messages: messages,
      profileCache: { ...prev.profileCache, ...profiles },
    }));
  } catch (error) {
    console.error("Error loading messages:", error);
    setAppState((prev) => ({
      ...prev,
      error: `Failed to load messages: ${error.message}`,
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
  // Load messages on mount
  useEffect(() => {
    loadMessages(setAppState);

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          console.log("New message:", payload);
          loadMessages(setAppState);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Calculate required payment based on text length
  const calculateRequiredAmount = (text) => {
    if (!text.trim()) return 0;
    return Math.ceil(text.length / 100); // 1 $OPEN per 100 chars, rounded up
  };

  // Handle text change
  const handleTextChange = (e) => {
    const text = e.target.value;
    setAppState((prev) => ({
      ...prev,
      messageText: text,
      error: null,
      successMessage: null,
    }));
  };

  // Generate QR code for posting
  const handleGenerateQR = async () => {
    if (!appState.messageText.trim()) {
      setAppState((prev) => ({
        ...prev,
        error: "Please enter a message first",
      }));
      return;
    }

    const text = appState.messageText.trim();
    const requiredAmount = calculateRequiredAmount(text);
    const textHash = hashText(text);

    try {
      // Generate QR with custom data (text hash)
      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: requiredAmount,
          data: metadata.appId,
          customData: textHash,
          recipient: metadata.recipient,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAppState((prev) => ({
          ...prev,
          qrCode: result.qrCode,
          isWaiting: true,
          expectedHash: textHash,
          expectedAmount: requiredAmount,
          error: null,
        }));
        setCurrentAmount(requiredAmount);
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

  const requiredAmount = calculateRequiredAmount(appState.messageText);

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

      {/* Post Message Section */}
      <div style={{ margin: "30px 0" }}>
        <h3 style={OICStyles.h3}>Post a Message</h3>
        <div style={{ margin: "15px 0" }}>
          <textarea
            value={appState.messageText}
            onChange={handleTextChange}
            placeholder="What's on your mind? (1 $OPEN per 100 characters)"
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              border: "1px solid #000",
              borderRadius: "0",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "10px 0",
          }}
        >
          <div style={{ fontSize: "14px", color: "#666" }}>
            Length: {appState.messageText.length} chars • Cost: {requiredAmount}{" "}
            $OPEN
          </div>
          <button
            onClick={handleGenerateQR}
            disabled={!appState.messageText.trim() || appState.isWaiting}
            style={{
              ...OICStyles.button,
              ...OICStyles.buttonPrimary,
              padding: "8px 16px",
              opacity:
                !appState.messageText.trim() || appState.isWaiting ? 0.5 : 1,
            }}
          >
            {appState.isWaiting
              ? "Waiting for Payment..."
              : `Post for ${requiredAmount} $OPEN`}
          </button>
        </div>
      </div>

      {/* QR Code */}
      {appState.qrCode && (
        <div style={OICStyles.qrContainer}>
          <h3 style={{ ...OICStyles.h3, marginTop: 0 }}>
            Scan to Post Message
          </h3>
          <img
            src={appState.qrCode}
            alt="Post Message QR Code"
            style={{ maxWidth: "250px" }}
          />
          <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
            Cost: {requiredAmount} $OPEN for {appState.messageText.length}{" "}
            characters
          </p>
          <div style={{ fontSize: "12px", color: "#999", marginTop: "10px" }}>
            Text hash: {appState.expectedHash}
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div style={{ margin: "40px 0" }}>
        <h3 style={OICStyles.h3}>Recent Messages</h3>
        {appState.messages.length === 0 ? (
          <p
            style={{
              fontStyle: "italic",
              color: "#666",
              textAlign: "center",
              margin: "40px 0",
            }}
          >
            No messages yet. Be the first to post!
          </p>
        ) : (
          <div style={{ margin: "20px 0" }}>
            {appState.messages.map((message, index) => (
              <div
                key={message.id}
                style={{
                  margin: "15px 0",
                  padding: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "0",
                  backgroundColor: index % 2 === 0 ? "#fafafa" : "#ffffff",
                }}
              >
                <div style={{ marginBottom: "10px", fontSize: "14px" }}>
                  <strong>{message.message_text}</strong>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
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
                      address={message.poster_address}
                      profile={appState.profileCache[message.poster_address]}
                      showAddress={true}
                      imageSize={24}
                      linkToMetri={true}
                    />
                    <span>• Paid: {message.amount_paid} $OPEN</span>
                  </div>
                  <span>{new Date(message.created_at).toLocaleString()}</span>
                </div>
                <div
                  style={{ fontSize: "10px", color: "#999", marginTop: "5px" }}
                >
                  <TransactionLink
                    transactionHash={message.transaction_hash}
                    truncate={true}
                    style={{ color: "#666" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it Works */}
      <div style={{ margin: "40px 0", fontSize: "14px", color: "#666" }}>
        <h3 style={OICStyles.h3}>How it works</h3>
        <ol style={{ paddingLeft: "20px" }}>
          <li>Write your message (any length)</li>
          <li>Pay 1 $OPEN per 100 characters (rounded up)</li>
          <li>Your message hash is included in the transaction</li>
          <li>Once payment is confirmed, your message appears in the feed</li>
          <li>
            All messages are stored permanently and attributed to your wallet
          </li>
        </ol>
        <p style={{ marginTop: "15px", fontSize: "12px", fontStyle: "italic" }}>
          Messages are stored on Supabase and verified against transaction data.
          Your wallet address will be shown as the poster.
        </p>
      </div>
    </>
  );
};

export default createOICApp(metadata, appContent);
