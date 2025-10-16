import Link from "next/link";

const APPS = [
  {
    id: "social-feed",
    name: "Pay-to-Post Social Feed",
  },
  {
    id: "tipping",
    name: "Tip OIC Members",
  },
  // {
  //   id: "random-number",
  //   name: "Random Number Generator",
  // },
  // {
  //   id: "database-monitor",
  //   name: "Database Monitor",
  // },
];

export default function HomePage() {
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
        <h2>Open Internet Club Apps</h2>

        <p>
          A collection of things you can do with $OPEN. Click{" "}
          <Link href={`/mint-open`}>here</Link> to mint $OPEN.
        </p>
        <p>
          $OPEN is the community currency of the Open Internet Club, built on{" "}
          <Link href={`https://aboutcircles.com/`}>Circles</Link>. Visit our{" "}
          <Link href={`https://openinternet.club/`}>decentralised website</Link>{" "}
          to learn more.
        </p>
        <ul>
          {APPS.map((app) => (
            <li key={app.id}>
              <Link href={`/apps/${app.id}`}>{app.name}</Link>
            </li>
          ))}
        </ul>

        <p>
          <Link href="/contributing">Contributing</Link>
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

        ul {
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
