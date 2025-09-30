import React, { useState, useEffect } from "react";
import { searchProfiles, isValidAddress, debounce } from "../lib/profiles";

const ProfileSelector = ({ onProfileSelect, selectedProfile, style = {} }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

  // Debounced search function
  const debouncedSearch = debounce(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      let results = [];

      // If it looks like an address, search by address
      if (isValidAddress(query)) {
        results = await searchProfiles({ address: query });
      } else {
        // Otherwise search by name
        results = await searchProfiles({ name: query });
      }

      setSearchResults(results || []);
      setShowResults(true);
    } catch (err) {
      setError("Failed to search profiles");
      console.error("Profile search error:", err);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Handle profile selection
  const handleSelectProfile = (profile) => {
    onProfileSelect(profile);
    setSearchQuery("");
    setShowResults(false);
    setSearchResults([]);
  };

  // Handle clearing selection
  const handleClearSelection = () => {
    onProfileSelect(null);
    setSearchQuery("");
    setShowResults(false);
    setSearchResults([]);
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false);
    };

    if (showResults) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showResults]);

  return (
    <div style={{ position: "relative", ...style }}>
      {selectedProfile ? (
        // Show selected profile
        <div style={styles.selectedProfile}>
          <div style={styles.profileInfo}>
            {selectedProfile.imageUrl && (
              <img
                src={selectedProfile.imageUrl}
                alt={selectedProfile.name}
                style={styles.profileImage}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <div style={styles.profileDetails}>
              <div style={styles.profileName}>
                {selectedProfile.name || "Unknown Profile"}
              </div>
              <div style={styles.profileAddress}>
                {selectedProfile.address &&
                  `${selectedProfile.address.substring(0, 8)}...${selectedProfile.address.substring(selectedProfile.address.length - 6)}`}
              </div>
              {selectedProfile.description && (
                <div style={styles.profileDescription}>
                  {selectedProfile.description}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            style={styles.clearButton}
            className="profile-clear-button"
            title="Select different profile"
          >
            ✕
          </button>
        </div>
      ) : (
        // Show search interface
        <div>
          <div style={styles.searchContainer}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name or paste wallet address (0x...)"
              style={styles.searchInput}
            />
            {isSearching && <div style={styles.searchingIndicator}>🔍</div>}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {showResults && (
            <div style={styles.resultsContainer}>
              {searchResults.length === 0 ? (
                <div style={styles.noResults}>
                  No profiles found.{" "}
                  {isValidAddress(searchQuery)
                    ? "This address may not have a profile."
                    : "Try a different search term."}
                </div>
              ) : (
                <div style={styles.results}>
                  {searchResults.map((profile, index) => (
                    <div
                      key={profile.cid || index}
                      style={styles.resultItem}
                      className="profile-result-item"
                      onClick={() => handleSelectProfile(profile)}
                    >
                      <div style={styles.resultProfileInfo}>
                        {profile.imageUrl && (
                          <img
                            src={profile.imageUrl}
                            alt={profile.name}
                            style={styles.resultProfileImage}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        <div style={styles.resultProfileDetails}>
                          <div style={styles.resultProfileName}>
                            {profile.name || "Unknown Profile"}
                          </div>
                          <div style={styles.resultProfileAddress}>
                            {profile.address &&
                              `${profile.address.substring(0, 8)}...${profile.address.substring(profile.address.length - 6)}`}
                          </div>
                          {profile.description && (
                            <div style={styles.resultProfileDescription}>
                              {profile.description.length > 60
                                ? `${profile.description.substring(0, 60)}...`
                                : profile.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  selectedProfile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "15px",
    border: "2px solid #4CAF50",
    borderRadius: "5px",
    backgroundColor: "#f8fff8",
  },
  profileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  profileImage: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #ddd",
  },
  profileDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  profileName: {
    fontWeight: "bold",
    fontSize: "16px",
    color: "#333",
  },
  profileAddress: {
    fontSize: "12px",
    color: "#666",
    fontFamily: "monospace",
  },
  profileDescription: {
    fontSize: "13px",
    color: "#555",
    marginTop: "4px",
    maxWidth: "300px",
  },
  clearButton: {
    background: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchInput: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    border: "1px solid #000",
    borderRadius: "0",
    fontFamily: "inherit",
  },
  searchingIndicator: {
    position: "absolute",
    right: "10px",
    fontSize: "16px",
    animation: "spin 1s linear infinite",
  },
  error: {
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "#ffe6e6",
    border: "1px solid #f44336",
    borderRadius: "3px",
    color: "#f44336",
    fontSize: "14px",
  },
  resultsContainer: {
    position: "absolute",
    top: "100%",
    left: "0",
    right: "0",
    zIndex: 1000,
    marginTop: "2px",
  },
  results: {
    border: "1px solid #ddd",
    borderRadius: "3px",
    backgroundColor: "white",
    maxHeight: "300px",
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  noResults: {
    padding: "15px",
    textAlign: "center",
    color: "#666",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "3px",
    backgroundColor: "white",
  },
  resultItem: {
    padding: "12px",
    cursor: "pointer",
    borderBottom: "1px solid #eee",
    transition: "background-color 0.2s",
  },
  resultProfileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  resultProfileImage: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #ddd",
  },
  resultProfileDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  resultProfileName: {
    fontWeight: "500",
    fontSize: "14px",
    color: "#333",
  },
  resultProfileAddress: {
    fontSize: "11px",
    color: "#666",
    fontFamily: "monospace",
  },
  resultProfileDescription: {
    fontSize: "12px",
    color: "#555",
    marginTop: "2px",
  },
};

// Add hover effects and animations using CSS-in-JS
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .profile-result-item:hover {
      background-color: #f5f5f5 !important;
    }

    .profile-clear-button:hover {
      background-color: #d32f2f !important;
    }
  `;
  document.head.appendChild(style);
}

export default ProfileSelector;
