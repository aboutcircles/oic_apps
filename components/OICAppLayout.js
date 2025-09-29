import Link from "next/link";
import { OICStyles } from "../lib/oic-styles";

export default function OICAppLayout({
  title,
  description,
  children,
  isConnected = true,
}) {
  return (
    <div style={OICStyles.container}>
      <div style={OICStyles.content}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img
            src="/OIC_Logo_Black_2x.png"
            alt="Open Internet Club"
            style={{ maxWidth: "200px", height: "auto" }}
          />
        </div>

        {/* App Title */}
        <h2 style={OICStyles.h2}>{title}</h2>

        {/* Back to home link */}
        <p>
          <Link href="/" style={OICStyles.link}>
            ← Back to home
          </Link>
        </p>

        {/* App Description */}
        {description && <p>{description}</p>}

        {/* Connection Warning (only when disconnected) */}
        {!isConnected && (
          <div
            style={{
              ...OICStyles.status,
              ...OICStyles.statusDisconnected,
            }}
          >
            WARNING: Database connection lost
          </div>
        )}

        {/* App Content */}
        {children}
      </div>

      <style jsx>{`
        @media (max-width: 600px) {
          img {
            max-width: 200px !important;
          }
        }
      `}</style>
    </div>
  );
}
