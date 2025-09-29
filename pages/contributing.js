import Link from "next/link";

export default function ContributingPage() {
  return (
    <div>
      <div id="maincontent">
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img
            src="/OIC_Logo_Black_2x.png"
            alt="Open Internet Club"
            style={{ maxWidth: "200px", height: "auto" }}
          />
        </div>
        <h2>Contributing to Open Internet Club</h2>

        <p>
          <Link
            href="/"
            style={{ color: "#0066cc", textDecoration: "underline" }}
          >
            ← Back to home
          </Link>
        </p>

        <h3>How it works</h3>
        <p>
          Each app generates QR codes that interact with the Circles protocol.
          Users scan QR codes with a compatible wallet to send $OPEN tokens to a
          specific recipient address. When the transaction is detected, the app
          performs its designated function. The $OPEN tokens are forwarded as
          ERC20 tokens to the recipient address specified by the app developer.
        </p>

        <h3>Technical Details</h3>
        <ul>
          <li>
            Middleware Contract: 0x6fff09332ae273ba7095a2a949a7f4b89eb37c52
          </li>
          <li>Each app has a unique identifier (e.g., "random-number")</li>
          <li>Apps can specify custom amounts and additional data</li>
          <li>
            Apps must specify a recipient address for $OPEN token forwarding
          </li>
          <li>
            $OPEN tokens are forwarded as ERC20 tokens to the specified
            recipient
          </li>
          <li>Real-time database monitoring via WebSocket connection</li>
        </ul>

        <h3>Recipient Addresses</h3>
        <p>
          Each app can specify where $OPEN tokens should be sent by setting the{" "}
          <code>recipient</code> field in their metadata. This is the Ethereum
          address that will receive the $OPEN tokens as ERC20 tokens when users
          interact with your app.
        </p>
        <ul>
          <li>A recipient address is required - no defaults are provided</li>
          <li>
            App developers must specify their own address to receive payments
          </li>
          <li>Useful for monetizing apps or funding specific projects</li>
        </ul>

        <h3>Adding Your Own App</h3>
        <p>Want to contribute a new app? Here's how:</p>
        <ol>
          <li>
            Fork the{" "}
            <a
              href="https://github.com/pboes/oic_apps"
              target="_blank"
              style={{ color: "#0066cc", textDecoration: "underline" }}
            >
              GitHub repository
            </a>
          </li>
          <li>
            Create a new file in <code>/pages/apps/your-app-id.js</code>
          </li>
          <li>Use the OIC Framework hooks and utilities</li>
          <li>Follow the existing app patterns</li>
          <li>Test your app locally</li>
          <li>Submit a pull request</li>
        </ol>

        <h3>App Structure</h3>
        <p>
          Apps now use a simple metadata-based structure. The framework
          automatically handles the layout, logo, navigation, and event
          handling:
        </p>
        <pre
          style={{
            backgroundColor: "#f5f5f5",
            padding: "10px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >{`import { createOICApp, OICStyles } from '../../lib/oic-framework';

const metadata = {
  appId: 'your-app-name',
  title: 'Your App Title',
  description: 'Brief description of what your app does.',
  recipient: '0xYourAddressHere', // Where $OPEN tokens are sent (required)
  initialState: {
    // Your app's initial state
  },
  onPayment: (eventData, appState, setAppState, currentAmount, setCurrentAmount) => {
    // Parse the amount from the event data
    const receivedAmount = Math.floor(Number(eventData.amount) / Math.pow(10, 18));

    // Check if payment is valid and handle accordingly
    if (receivedAmount > 0) {
      setAppState(prev => ({ ...prev, /* update based on receivedAmount */ }));
    }
  },
};

const appContent = ({
  appState,
  setAppState,
  currentAmount,
  setCurrentAmount,
  generateQR,
  metadata
}) => {
  // Handle user selecting different amounts
  const handleAmountSelect = (amount) => {
    setCurrentAmount(amount);
    generateQR(amount, metadata.appId); // Generate QR for selected amount
  };

  return (
    <>
      {/* Amount selection buttons */}
      {[1, 5, 10].map(amount => (
        <button key={amount} onClick={() => handleAmountSelect(amount)}>
          Pay {amount} $OPEN
        </button>
      ))}
      {/* Your app's UI content goes here */}
      {/* The framework handles logo, title, navigation automatically */}
    </>
  );
};

export default createOICApp(metadata, appContent);`}</pre>

        <h3>Dynamic Amounts</h3>
        <p>
          The framework supports dynamic amounts based on user actions. Users
          can select different amounts which change the app behavior:
        </p>
        <ul>
          <li>
            Use <code>currentAmount</code> and <code>setCurrentAmount</code> in
            your app
          </li>
          <li>
            Generate QR codes with <code>generateQR(amount, appId)</code>
          </li>
          <li>
            Parse received amounts in your <code>onPayment</code> handler
          </li>
          <li>Different amounts can trigger different app behaviors</li>
        </ul>

        <h3>Design Guidelines</h3>
        <ul>
          <li>
            Focus only on your app's core content - the framework handles the
            layout
          </li>
          <li>Use the provided OICStyles for consistency</li>
          <li>No emojis or colorful buttons</li>
          <li>
            The framework automatically handles logo, navigation, and connection
            status
          </li>
          <li>Keep your app content minimal and focused</li>
          <li>Let users select amounts that change app functionality</li>
        </ul>

        <h3>Metadata Options</h3>
        <ul>
          <li>
            <code>appId</code>: Unique identifier for your app
          </li>
          <li>
            <code>title</code>: Display name of your app
          </li>
          <li>
            <code>description</code>: Brief description shown to users
          </li>
          <li>
            <code>recipient</code>: Ethereum address where $OPEN tokens are
            forwarded as ERC20 tokens (required)
          </li>
          <li>
            <code>initialState</code>: Your app's initial state object
          </li>
          <li>
            <code>onPayment</code>: Function called when payment is received,
            receives (eventData, appState, setAppState, currentAmount,
            setCurrentAmount)
          </li>
        </ul>

        <h3>Questions?</h3>
        <p>
          Open an issue on GitHub or check the existing apps for examples. The
          framework is designed to be simple and self-explanatory.
        </p>
      </div>

      <style jsx>{`
        body {
          line-height: 1.4;
          font-size: 16px;
          padding: 0 10px;
          margin: 50px auto;
          max-width: 650px;
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #maincontent {
          max-width: 42em;
          margin: 15px auto;
          margin-top: 70px;
        }

        h2 {
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }

        h3 {
          color: #555;
          margin-top: 30px;
        }

        ul,
        ol {
          margin: 20px 0;
        }

        li {
          margin: 10px 0;
        }

        a {
          color: #0066cc;
          text-decoration: underline;
        }

        a:hover {
          color: #004499;
        }

        code {
          background-color: #f5f5f5;
          padding: 2px 4px;
          font-family: monospace;
          font-size: 14px;
        }

        pre {
          overflow-x: auto;
        }

        @media (max-width: 600px) {
          #maincontent {
            margin-top: 30px;
            margin-left: 10px;
            margin-right: 10px;
          }

          body {
            margin: 20px auto;
          }
        }
      `}</style>
    </div>
  );
}
