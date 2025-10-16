import React from "react";

const ProfileDisplay = ({
  address,
  profile,
  showAddress = true,
  showDescription = false,
  imageSize = 32,
  style = {},
  linkToMetri = false,
}) => {
  const getDisplayName = () => {
    if (profile && profile.name) {
      return profile.name;
    }

    if (!address) return "Unknown";

    // Fallback to shortened address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getDisplayImage = () => {
    if (profile && (profile.imageUrl || profile.previewImageUrl)) {
      return profile.imageUrl || profile.previewImageUrl;
    }
    return null;
  };

  const profileImage = getDisplayImage();
  const displayName = getDisplayName();

  const profileContent = (
    <div
      style={{ display: "flex", alignItems: "center", gap: "8px", ...style }}
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt={displayName}
          style={{
            width: `${imageSize}px`,
            height: `${imageSize}px`,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid #ddd",
            flexShrink: 0,
          }}
          onError={(e) => {
            // Fallback to placeholder or hide image
            e.target.style.display = "none";
          }}
        />
      ) : (
        // Placeholder avatar
        <div
          style={{
            width: `${imageSize}px`,
            height: `${imageSize}px`,
            borderRadius: "50%",
            backgroundColor: "#e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${imageSize * 0.4}px`,
            color: "#666",
            flexShrink: 0,
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: profile && profile.name ? "bold" : "normal",
            fontSize: "14px",
            color: profile && profile.name ? "#333" : "#666",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: linkToMetri ? "underline" : "none",
          }}
        >
          {displayName}
        </div>

        {showAddress && address && profile && profile.name && (
          <div
            style={{
              fontSize: "11px",
              color: "#888",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: linkToMetri ? "underline" : "none",
            }}
          >
            {address.substring(0, 8)}...{address.substring(address.length - 6)}
          </div>
        )}

        {showDescription && profile && profile.description && (
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {profile.description}
          </div>
        )}
      </div>
    </div>
  );

  if (linkToMetri && address) {
    return (
      <a
        href={`https://app.metri.xyz/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
        }}
        title={`View ${displayName} on Metri`}
      >
        {profileContent}
      </a>
    );
  }

  return profileContent;
};

export default ProfileDisplay;
