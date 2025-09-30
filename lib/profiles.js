// Circles Profile Service API utility
const PROFILES_BASE_URL = "https://rpc.aboutcircles.com/profiles";

/**
 * Search for profiles by various criteria
 * @param {Object} params - Search parameters
 * @param {string} params.name - Search by name
 * @param {string} params.address - Search by wallet address
 * @param {string} params.description - Search by description
 * @param {string} params.cid - Search by CID
 * @returns {Promise<Array>} Array of profile objects
 */
export async function searchProfiles(params = {}) {
  try {
    const searchParams = new URLSearchParams();

    if (params.name) searchParams.append('name', params.name);
    if (params.address) searchParams.append('address', params.address);
    if (params.description) searchParams.append('description', params.description);
    if (params.cid) searchParams.append('CID', params.cid);

    const url = `${PROFILES_BASE_URL}/search?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error searching profiles:', error);
    return [];
  }
}

/**
 * Get a single profile by CID
 * @param {string} cid - Content Identifier
 * @returns {Promise<Object|null>} Profile object or null
 */
export async function getProfileByCID(cid) {
  try {
    const response = await fetch(`${PROFILES_BASE_URL}/get?cid=${cid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting profile by CID:', error);
    return null;
  }
}

/**
 * Get multiple profiles by CIDs
 * @param {Array<string>} cids - Array of Content Identifiers
 * @returns {Promise<Array>} Array of profile objects
 */
export async function getProfilesByCIDs(cids) {
  try {
    if (!cids || cids.length === 0) return [];

    const cidsParam = cids.join(',');
    const response = await fetch(`${PROFILES_BASE_URL}/getBatch?cids=${cidsParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error getting profiles by CIDs:', error);
    return [];
  }
}

/**
 * Create a new profile
 * @param {Object} profileData - Profile information
 * @param {string} profileData.name - Profile name
 * @param {string} profileData.description - Profile description
 * @param {string} profileData.previewImageUrl - Preview image URL
 * @param {string} profileData.imageUrl - Full image URL
 * @param {Object} profileData.extensions - Additional extensions (twitter, github, etc.)
 * @returns {Promise<Object|null>} Created profile or null
 */
export async function createProfile(profileData) {
  try {
    const response = await fetch(`${PROFILES_BASE_URL}/pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    return null;
  }
}

/**
 * Get profile for a specific wallet address (convenience function)
 * @param {string} address - Wallet address
 * @returns {Promise<Object|null>} Profile object or null
 */
export async function getProfileByAddress(address) {
  try {
    if (!address) return null;

    const profiles = await searchProfiles({ address });
    return profiles && profiles.length > 0 ? profiles[0] : null;
  } catch (error) {
    console.error('Error getting profile by address:', error);
    return null;
  }
}

/**
 * Get profiles for multiple addresses (for batch loading)
 * @param {Array<string>} addresses - Array of wallet addresses
 * @returns {Promise<Object>} Map of address -> profile
 */
export async function getProfilesByAddresses(addresses) {
  try {
    if (!addresses || addresses.length === 0) return {};

    const profileMap = {};

    // Search for each address - we could optimize this with batch calls if the API supports it
    const promises = addresses.map(async (address) => {
      const profile = await getProfileByAddress(address);
      if (profile) {
        // Assuming the profile contains an address field, map it back
        profileMap[address] = profile;
      }
      return { address, profile };
    });

    await Promise.all(promises);
    return profileMap;
  } catch (error) {
    console.error('Error getting profiles by addresses:', error);
    return {};
  }
}

/**
 * Format profile for display
 * @param {Object} profile - Profile object from API
 * @returns {Object} Formatted profile data
 */
export function formatProfile(profile) {
  if (!profile) return null;

  return {
    name: profile.name || 'Unknown',
    description: profile.description || '',
    imageUrl: profile.imageUrl || profile.previewImageUrl || '',
    address: profile.address || '',
    cid: profile.cid || '',
    extensions: profile.extensions || {},
  };
}

/**
 * Get display name for an address (uses cached profile or fallback)
 * @param {string} address - Wallet address
 * @param {Object} profileCache - Optional cache of profiles
 * @returns {string} Display name or shortened address
 */
export function getDisplayName(address, profileCache = {}) {
  if (!address) return 'Unknown';

  const profile = profileCache[address];
  if (profile && profile.name) {
    return profile.name;
  }

  // Fallback to shortened address
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Get display image for an address (uses cached profile or fallback)
 * @param {string} address - Wallet address
 * @param {Object} profileCache - Optional cache of profiles
 * @returns {string|null} Image URL or null
 */
export function getDisplayImage(address, profileCache = {}) {
  if (!address) return null;

  const profile = profileCache[address];
  if (profile && (profile.imageUrl || profile.previewImageUrl)) {
    return profile.imageUrl || profile.previewImageUrl;
  }

  return null;
}

/**
 * Validate if a string looks like an Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid format
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
