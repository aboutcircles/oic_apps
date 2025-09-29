// Common OIC styles following the retro aesthetic
export const OICStyles = {
  // Main container styles
  container: {
    lineHeight: 1.4,
    fontSize: "16px",
    padding: "0 10px",
    margin: "50px auto",
    maxWidth: "650px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // Content wrapper
  content: {
    maxWidth: "42em",
    margin: "15px auto",
    marginTop: "70px",
  },

  // Headers
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

  // Links
  link: {
    color: "#0066cc",
    textDecoration: "underline",
    cursor: "pointer",
  },

  linkHover: {
    color: "#004499",
  },

  // Buttons (old-school style)
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

  buttonHover: {
    backgroundColor: "#eeeeee",
  },

  // Status indicators (only show when disconnected)
  status: {
    fontSize: "12px",
    fontWeight: "bold",
    padding: "4px 8px",
    border: "1px solid red",
    backgroundColor: "#ffe6e6",
  },

  statusDisconnected: {
    color: "red",
  },

  // QR code container
  qrContainer: {
    textAlign: "center",
    margin: "20px 0",
    padding: "20px",
  },

  // Debug info
  debug: {
    fontSize: "12px",
    color: "#666",
    backgroundColor: "#f9f9f9",
    padding: "10px",
    border: "1px solid #eee",
    borderRadius: "3px",
    marginTop: "20px",
  },

  // Mobile responsive adjustments
  "@media (max-width: 600px)": {
    container: {
      margin: "20px auto",
    },
    content: {
      marginTop: "30px",
      marginLeft: "10px",
      marginRight: "10px",
    },
  },
};
