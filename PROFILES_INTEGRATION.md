# Circles Profile Service Integration

This document explains how the OIC Framework integrates with the Circles Profile Service to provide rich user profiles in token-based applications.

## Overview

The Circles Profile Service allows users to create and manage profiles associated with their wallet addresses, including:
- Display names
- Profile descriptions  
- Avatar images
- Social media links
- Custom metadata

Our integration provides seamless profile lookup, display, and selection across OIC apps.

## Architecture

### Core Components

1. **Profile Service Library** (`lib/profiles.js`)
   - API wrapper for Circles Profile Service
   - Utility functions for profile handling
   - Caching and batch operations

2. **ProfileSelector Component** (`components/ProfileSelector.js`)
   - Search and select profiles by name or address
   - Real-time search with debouncing
   - Used in apps requiring profile selection

3. **ProfileDisplay Component** (`components/ProfileDisplay.js`)
   - Display profile information consistently
   - Handles missing profiles gracefully
   - Used throughout apps for user identification

## Implementation Examples

### 1. Mint $OPEN App Integration

The mint app uses `ProfileSelector` to let users find and select their profile:

```javascript
import ProfileSelector from "../../components/ProfileSelector";

// In component state
const [selectedProfile, setSelectedProfile] = useState(null);

// Profile selection handler
const handleProfileSelect = (profile) => {
  if (profile && profile.address) {
    setAppState(prev => ({
      ...prev,
      selectedProfile: profile,
      walletAddress: profile.address,
    }));
  }
};

// In render
<ProfileSelector
  selectedProfile={appState.selectedProfile}
  onProfileSelect={handleProfileSelect}
/>
```

**Features:**
- Search profiles by name or paste wallet address
- Display selected profile with name, avatar, and address
- Auto-populate wallet address from selected profile
- Clear selection to choose different profile

### 2. Social Feed App Integration

The social feed uses `ProfileDisplay` to show message authors:

```javascript
import ProfileDisplay from "../../components/ProfileDisplay";
import { getProfilesByAddresses } from "../../lib/profiles";

// Load profiles for message authors
const loadMessages = async (setAppState) => {
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  // Extract unique addresses
  const addresses = [...new Set(messages.map(msg => msg.poster_address))];
  
  // Batch load profiles
  const profiles = await getProfilesByAddresses(addresses);
  
  setAppState(prev => ({
    ...prev,
    messages,
    profileCache: { ...prev.profileCache, ...profiles }
  }));
};

// In message display
<ProfileDisplay
  address={message.poster_address}
  profile={appState.profileCache[message.poster_address]}
  showAddress={true}
  imageSize={24}
/>
```

**Features:**
- Batch load profiles for all message authors
- Cache profiles to avoid repeated API calls
- Display names and avatars instead of just addresses
- Fallback to shortened address if no profile

## API Reference

### Profile Service Library (`lib/profiles.js`)

#### Core Functions

```javascript
// Search for profiles
await searchProfiles({ name: "john", address: "0x..." });

// Get single profile by address
await getProfileByAddress("0x1234...");

// Get multiple profiles (batch)
await getProfilesByAddresses(["0x1234...", "0x5678..."]);

// Get profile by CID
await getProfileByCID("Qm1234...");

// Create new profile
await createProfile({
  name: "John Doe",
  description: "Blockchain developer",
  imageUrl: "https://...",
  extensions: { twitter: "@johndoe" }
});
```

#### Utility Functions

```javascript
// Format profile for display
const formatted = formatProfile(rawProfile);

// Get display name (name or shortened address)
const name = getDisplayName(address, profileCache);

// Get profile image URL
const imageUrl = getDisplayImage(address, profileCache);

// Validate Ethereum address format
const valid = isValidAddress("0x1234...");

// Debounce function for search input
const debouncedFn = debounce(searchFunction, 300);
```

### Component APIs

#### ProfileSelector

```javascript
<ProfileSelector
  selectedProfile={profile}           // Currently selected profile
  onProfileSelect={(profile) => {}}   // Selection callback
  style={{}}                          // Additional styles
/>
```

**Props:**
- `selectedProfile`: Currently selected profile object or null
- `onProfileSelect`: Function called when profile is selected/cleared
- `style`: Optional style overrides

**Behavior:**
- Shows search input when no profile selected
- Shows selected profile info when profile is chosen
- Real-time search with 300ms debouncing
- Handles both name and address searches
- Click outside to close search results

#### ProfileDisplay

```javascript
<ProfileDisplay
  address="0x1234..."                 // Wallet address
  profile={profileObject}             // Profile data (optional)
  showAddress={true}                  // Show address below name
  showDescription={false}             // Show profile description
  imageSize={32}                      // Avatar size in pixels
  style={{}}                          // Additional styles
/>
```

**Props:**
- `address`: Required wallet address
- `profile`: Optional profile object from cache
- `showAddress`: Whether to show address below name
- `showDescription`: Whether to show profile description
- `imageSize`: Avatar size in pixels (default: 32)
- `style`: Optional style overrides

**Fallbacks:**
- Shows shortened address if no profile name
- Shows placeholder avatar if no profile image
- Handles broken images gracefully

## Integration Patterns

### 1. Profile Search and Selection

For apps requiring user to select their profile:

```javascript
const [selectedProfile, setSelectedProfile] = useState(null);

const handleProfileSelect = (profile) => {
  // Update app state with selected profile
  setSelectedProfile(profile);
  
  // Use profile address for payments/transactions
  if (profile?.address) {
    setWalletAddress(profile.address);
  }
};

return (
  <ProfileSelector
    selectedProfile={selectedProfile}
    onProfileSelect={handleProfileSelect}
  />
);
```

### 2. Batch Profile Loading

For apps displaying multiple users (feeds, leaderboards):

```javascript
const [profiles, setProfiles] = useState({});

useEffect(() => {
  const loadProfiles = async () => {
    // Get unique addresses from your data
    const addresses = data.map(item => item.userAddress);
    
    // Batch load profiles
    const profileMap = await getProfilesByAddresses(addresses);
    
    setProfiles(prev => ({ ...prev, ...profileMap }));
  };
  
  loadProfiles();
}, [data]);

// In render
{data.map(item => (
  <ProfileDisplay
    key={item.id}
    address={item.userAddress}
    profile={profiles[item.userAddress]}
  />
))}
```

### 3. Profile Caching Strategy

```javascript
const [profileCache, setProfileCache] = useState({});

// Cache profiles as they're loaded
const cacheProfile = (address, profile) => {
  setProfileCache(prev => ({
    ...prev,
    [address]: profile
  }));
};

// Check cache before API call
const getProfileWithCache = async (address) => {
  if (profileCache[address]) {
    return profileCache[address];
  }
  
  const profile = await getProfileByAddress(address);
  if (profile) {
    cacheProfile(address, profile);
  }
  
  return profile;
};
```

## Error Handling

### API Errors

```javascript
try {
  const profiles = await searchProfiles({ name: query });
  // Handle success
} catch (error) {
  console.error('Profile search failed:', error);
  // Show user-friendly error message
  setError('Unable to search profiles. Please try again.');
}
```

### Missing Profiles

```javascript
const profile = await getProfileByAddress(address);
if (!profile) {
  // Handle gracefully - show address instead
  const displayName = getDisplayName(address);
  // Continue with fallback display
}
```

### Image Loading Errors

```javascript
<img
  src={profile.imageUrl}
  onError={(e) => {
    // Hide broken image
    e.target.style.display = 'none';
    // Or show placeholder
    e.target.src = '/placeholder-avatar.png';
  }}
/>
```

## Performance Considerations

### 1. Debounced Search
- Search input is debounced by 300ms to avoid excessive API calls
- Previous requests are cancelled when new ones are made

### 2. Batch Loading
- Load multiple profiles in single API call when possible
- Cache results to avoid repeated requests

### 3. Lazy Loading
- Only load profiles when needed
- Use intersection observers for large lists

### 4. Memory Management
- Clear profile cache when appropriate
- Limit cache size for long-running apps

## Styling and Theming

### Default Styles
Components use inline styles following the OIC retro aesthetic:
- Monospace fonts for addresses
- Simple borders and backgrounds
- Minimal hover effects

### Customization
Override styles using the `style` prop:

```javascript
<ProfileDisplay
  address={address}
  profile={profile}
  style={{
    backgroundColor: '#f0f0f0',
    padding: '15px',
    borderRadius: '10px'
  }}
/>
```

### CSS Classes
Some dynamic styles use CSS classes:
- `.profile-result-item:hover` - Hover effect for search results
- `.profile-clear-button:hover` - Hover effect for clear button

## Testing

### Manual Testing
Visit `/test-profiles` for comprehensive testing interface:
- Test ProfileSelector component
- Test direct API calls
- Test batch loading
- Test utility functions

### Automated Testing
```javascript
// Test profile search
const results = await searchProfiles({ name: 'test' });
expect(Array.isArray(results)).toBe(true);

// Test address validation
expect(isValidAddress('0x1234567890123456789012345678901234567890')).toBe(true);
expect(isValidAddress('invalid')).toBe(false);

// Test display name fallback
const name = getDisplayName('0x1234567890123456789012345678901234567890');
expect(name).toBe('0x1234...7890');
```

## Troubleshooting

### Common Issues

1. **Profiles not loading**
   - Check network connection to `https://rpc.aboutcircles.com`
   - Verify API endpoints are accessible
   - Check browser console for CORS errors

2. **Search not working**
   - Ensure search query is properly formatted
   - Check address format for address searches
   - Verify debouncing is working (300ms delay)

3. **Images not displaying**
   - Check image URLs are accessible
   - Implement error handlers for broken images
   - Consider placeholder images

4. **Performance issues**
   - Implement profile caching
   - Use batch loading for multiple profiles
   - Debounce search input

### Debug Information

Enable debug logging:
```javascript
// In profiles.js functions
console.log('Profile API request:', url, params);
console.log('Profile API response:', response);
```

Check browser network tab for API requests and responses.

## Future Enhancements

### Planned Features
- Profile creation UI within OIC apps
- Profile editing capabilities
- Enhanced social features (following, etc.)
- Profile verification system
- Advanced search and filtering

### API Extensions
- Real-time profile updates via WebSockets
- Profile analytics and insights
- Batch profile creation
- Profile synchronization across apps

## Contributing

To add profile integration to a new OIC app:

1. Import required components and utilities
2. Add profile-related state management
3. Implement profile loading logic
4. Add profile display components
5. Handle errors and edge cases
6. Test with the test page (`/test-profiles`)
7. Update documentation

Example pull request checklist:
- [ ] Profile integration follows established patterns
- [ ] Error handling is implemented
- [ ] Caching strategy is appropriate
- [ ] Performance considerations addressed
- [ ] Testing completed
- [ ] Documentation updated