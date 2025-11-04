import Link from "next/link";

export default function AppIdeasPage() {
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

        <h2>Mini OIC App Ideas</h2>

        <p>
          <Link
            href="/"
            style={{ color: "#0066cc", textDecoration: "underline" }}
          >
            ← Back to home
          </Link>
        </p>

        <p>
          Looking for inspiration? These concepts show how you can mix QR code
          payments, $OPEN token flows, and simple frontends to create delightful
          utility apps. Use them as-is or remix them to fit your community.
        </p>

        <h3>Community & Social</h3>
        <ul>
          <li>
            <strong>Tip Speakers in $OPEN</strong> &mdash; Give presenters a
            live token stream during their sessions and display a running tally
            next to the stage schedule.
          </li>
          <li>
            <strong>Pin Wall</strong> &mdash; Offer ad hoc services to other
            participants; paying pins stay highlighted for a set duration.
          </li>
          <li>
            <strong>Highlights Feed</strong> &mdash; Post quotes from talks,
            tag speakers, and allow others to upvote with $OPEN that routes to
            the poster or quoted account.
          </li>
        </ul>

        <h3>Tools & Utilities</h3>
        <ul>
          <li>
            <strong>Reservation System</strong> &mdash; Reserve scarce spots by
            sending $OPEN; the app manages waitlists and refunds if limits are
            exceeded.
          </li>
          <li>
            <strong>Pay-to-Unlock Guide</strong> &mdash; Release a download link
            or instruction set after a valid payment is detected.
          </li>
          <li>
            <strong>Voting Booth</strong> &mdash; Each payment generates a vote
            token tied to the payer address for lightweight governance polls.
          </li>
          <li>
            <strong>Token Meter</strong> &mdash; Display cumulative funds raised
            toward a goal, updating the progress bar whenever new payments
            arrive.
          </li>
        </ul>

        <h3>Experiments & Play</h3>
        <ul>
          <li>
            <strong>Network State Tycoon</strong> &mdash; Simulate building a
            micro-city where players reinvest $OPEN to grow shared resources.
          </li>
          <li>
            <strong>Unlock a Random NFT Trait</strong> &mdash; On payment,
            assign a random trait from a curated list and show the history of
            claims.
          </li>
          <li>
            <strong>Lucky Draw</strong> &mdash; Pool incoming payments and
            surface a daily winner selected from the recent participants.
          </li>
          <li>
            <strong>Interactive Story</strong> &mdash; Each payment advances the
            story and reveals the next chapter to everyone watching.
          </li>
        </ul>

        <h3>Integrations</h3>
        <ul>
          <li>
            <strong>Fileverse-Powered Daily Recap</strong> &mdash; Embed
            Fileverse docs inside OIC comments to collect collaborative notes,
            show link previews, and reward contributors instantly as the recap
            grows each day.
          </li>
        </ul>

        <h3>How to Run With These Ideas</h3>
        <ol>
          <li>
            Start from the template on the{" "}
            <Link
              href="/contributing"
              style={{ color: "#0066cc", textDecoration: "underline" }}
            >
              contributing page
            </Link>{" "}
            and set a unique <code>appId</code>.
          </li>
          <li>
            Decide what the app should do when <code>onPayment</code> fires and
            store any state you need inside <code>appState</code>.
          </li>
          <li>
            Experiment with different payment tiers using{" "}
            <code>generateQR(amount, appId)</code> to unlock varied outcomes.
          </li>
          <li>
            Ship a minimum version first, then iterate as you see how people use
            it.
          </li>
        </ol>

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
