import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import OICAppLayout from "../components/OICAppLayout";
import { OICStyles } from "./oic-styles";

// OIC Framework - Common utilities for building Open Internet Club apps
export class OICFramework {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  // Initialize socket connection
  initializeSocket() {
    if (this.socket) return this.socket;

    this.socket = io();

    this.socket.on("connect", () => {
      console.log("✅ OIC Framework connected to server");
      this.isConnected = true;
    });

    this.socket.on("disconnect", () => {
      console.log("❌ OIC Framework disconnected from server");
      this.isConnected = false;
    });

    this.socket.on("db-change", (eventData) => {
      console.log("🔥 OIC Framework received event:", eventData);
      this.handleDatabaseEvent(eventData);
    });

    return this.socket;
  }

  // Register an event handler for specific criteria
  registerEventHandler(name, criteria, callback) {
    this.eventHandlers.set(name, { criteria, callback });
    console.log(`📋 Registered event handler: ${name}`);
  }

  // Remove an event handler
  unregisterEventHandler(name) {
    this.eventHandlers.delete(name);
    console.log(`🗑️ Unregistered event handler: ${name}`);
  }

  // Handle incoming database events
  handleDatabaseEvent(eventData) {
    for (const [name, handler] of this.eventHandlers) {
      if (this.matchesCriteria(eventData, handler.criteria)) {
        console.log(`✅ Event matches criteria for handler: ${name}`);
        handler.callback(eventData);
      }
    }
  }

  // Check if event matches criteria
  matchesCriteria(eventData, criteria) {
    // Check recipient
    if (criteria.recipient && eventData.recipient !== criteria.recipient) {
      return false;
    }

    // Check sender (if specified)
    if (criteria.sender && eventData.sender !== criteria.sender) {
      return false;
    }

    // Check expected amount (if specified)
    if (
      criteria.expectedAmount &&
      eventData.amount !== criteria.expectedAmount.toString()
    ) {
      return false;
    }

    // Check data field
    if (criteria.data) {
      if (typeof criteria.data === "string") {
        // Exact match or contains check
        const dataMatch =
          eventData.data === criteria.data ||
          (eventData.data && eventData.data.includes(criteria.data));
        if (!dataMatch) return false;
      } else if (typeof criteria.data === "function") {
        // Custom data validation function
        if (!criteria.data(eventData.data)) return false;
      }
    }

    // Check custom validation function
    if (criteria.validator && !criteria.validator(eventData)) {
      return false;
    }

    return true;
  }

  // Generate QR code for app
  async generateQR(amount, appId, customData = "", recipient) {
    if (!recipient) {
      throw new Error("Recipient address is required for QR code generation");
    }
    if (!amount || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    try {
      // Combine appId and customData if provided
      const dataField = customData ? `${appId}:${customData}` : appId;

      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: amount,
          data: dataField,
          recipient: recipient,
        }),
      });

      const result = await response.json();
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || "QR generation failed");
      }
    } catch (error) {
      console.error("❌ QR generation error:", error);
      throw error;
    }
  }

  // Cleanup connections
  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
    this.isConnected = false;
  }
}

// React hook for using OIC Framework
export function useOICFramework() {
  const [framework] = useState(() => new OICFramework());
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const socket = framework.initializeSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleEvent = (data) => {
      setEvents((prev) => [data, ...prev.slice(0, 9)]); // Keep last 10 events
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("db-change", handleEvent);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("db-change", handleEvent);
      framework.cleanup();
    };
  }, [framework]);

  return {
    framework,
    isConnected,
    events,
    generateQR: (amount, appId, customData = "", recipient) =>
      framework.generateQR(amount, appId, customData, recipient),
    registerEventHandler: framework.registerEventHandler.bind(framework),
    unregisterEventHandler: framework.unregisterEventHandler.bind(framework),
    checkPayment: (eventData, expectedAmount, appId, recipient) => {
      const criteria = {
        recipient: recipient,
        expectedAmount: (BigInt(expectedAmount) * BigInt(10 ** 18)).toString(),
        data: appId,
      };
      return framework.matchesCriteria(eventData, criteria);
    },
  };
}

// Predefined criteria builders for common use cases
export const OICCriteria = {
  // App payment criteria with specific amount
  appPayment: (appId, expectedAmount, recipient) => {
    if (!recipient) {
      throw new Error("Recipient address is required");
    }
    return {
      recipient: recipient,
      expectedAmount: (BigInt(expectedAmount) * BigInt(10 ** 18)).toString(),
      data: appId,
    };
  },

  // Payment criteria with sender validation
  userPayment: (sender, expectedAmount, appId, recipient) => {
    if (!recipient) {
      throw new Error("Recipient address is required");
    }
    return {
      recipient: recipient,
      sender: sender,
      expectedAmount: (BigInt(expectedAmount) * BigInt(10 ** 18)).toString(),
      data: appId,
    };
  },

  // Any payment with specific app ID (no amount check)
  anyAppPayment: (appId, recipient) => {
    if (!recipient) {
      throw new Error("Recipient address is required");
    }
    return {
      recipient: recipient,
      data: appId,
    };
  },

  // Custom validation function for complex criteria
  custom: (validatorFunction, recipient) => {
    if (!recipient) {
      throw new Error("Recipient address is required");
    }
    return {
      recipient: recipient,
      validator: validatorFunction,
    };
  },
};

// Export styles from separate file
export { OICStyles } from "./oic-styles";

// Helper function to create an OIC app component with automatic layout
export function createOICApp(metadata, appContent) {
  return function OICApp() {
    const {
      isConnected,
      generateQR,
      registerEventHandler,
      unregisterEventHandler,
      checkPayment,
    } = useOICFramework();
    const [appState, setAppState] = useState(metadata.initialState || {});
    const [currentAmount, setCurrentAmount] = useState(1); // Global amount state

    // Set up general event handler for this app (without specific amount)
    useEffect(() => {
      if (metadata.appId) {
        if (!metadata.recipient) {
          throw new Error(
            `App ${metadata.appId} must specify a recipient address`,
          );
        }
        const criteria = {
          recipient: metadata.recipient,
          data: metadata.appId,
        };

        const handleEvent = (eventData) => {
          if (metadata.onPayment) {
            // Pass the event data and let the app decide how to handle different amounts
            metadata.onPayment(
              eventData,
              appState,
              setAppState,
              currentAmount,
              setCurrentAmount,
            );
          }
        };

        registerEventHandler(
          `${metadata.appId}-handler`,
          criteria,
          handleEvent,
        );

        return () => {
          unregisterEventHandler(`${metadata.appId}-handler`);
        };
      }
    }, [registerEventHandler, unregisterEventHandler, currentAmount]);

    // Use the statically imported layout component

    return (
      <OICAppLayout
        title={metadata.title}
        description={metadata.description}
        isConnected={isConnected}
      >
        {appContent({
          appState,
          setAppState,
          currentAmount,
          setCurrentAmount,
          isConnected,
          generateQR: (amount, appId, customData = "") => {
            if (!metadata.recipient) {
              throw new Error("Recipient address is required in metadata");
            }
            return generateQR(amount, appId, customData, metadata.recipient);
          },
          checkPayment: (eventData, expectedAmount) => {
            return checkPayment(
              eventData,
              expectedAmount,
              metadata.appId,
              metadata.recipient,
            );
          },
          metadata,
        })}
      </OICAppLayout>
    );
  };
}

export default OICFramework;
