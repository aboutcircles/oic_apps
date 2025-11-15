# Trust Hunt - Devconnect 2025 Game

## Overview

Trust Hunt is a social game designed for Devconnect 2025 participants. The game has two roles:

- **Backers**: Provide hints about their appearance or location for hunters to find them
- **Hunters**: Track their trust scores as they find and get trusted by backers

## How It Works

### For Backers

1. Navigate to the Trust Hunt app
2. Click "Join the Game" button
3. Select "Enter as Backer"
4. Provide hints about what you're wearing or where you can be found (e.g., "Blue jacket, red hat, usually near the coffee stand")
5. Scan the QR code to pay 1 $OPEN
6. You'll appear in the Backers list with your profile picture, name, and hints

### For Hunters

1. Navigate to the Trust Hunt app
2. Click "Join the Game" button
3. Select "Enter as Hunter"
4. Enter your initial trust score (e.g., "0" or "100")
5. Scan the QR code to pay 1 $OPEN
6. You'll appear in the Hunters list with your profile picture, name, and trust score

### Gameplay

- The main screen displays both Backers and Hunters lists side-by-side (optimized for iPad display)
- Hunters can view the Backers list to see hints about where to find each backer
- When hunters find backers in real life, they can earn trust and update their scores
- Lists auto-refresh every 10 seconds to show new participants
- Each participant is displayed with their Circles profile picture and username

## User Interface Features

### Modal Join Flow
- Primary focus is on viewing the player lists
- Join functionality is accessed via a prominent "Join the Game" button
- Modal overlay provides a focused experience for entering the game
- Easy to close and return to viewing the lists

### Profile Integration
- Displays Circles profile pictures for all participants
- Shows usernames instead of wallet addresses (with address as secondary info)
- Fallback avatar with first letter if no profile picture exists
- Color-coded avatars: Blue for Backers, Green for Hunters

### Responsive Design
- Optimized for iPad display (primary use case)
- Two-column layout for side-by-side viewing
- Adapts to mobile with single-column layout
- Auto-refreshing lists for real-time updates

## Technical Details

### Data Storage

The app uses the OpenMiddlewareTransfer table to store game entries. Each entry is identified by a specific data format:

- **Backer entries**: `trusthunt:backer:{hints}`
- **Hunter entries**: `trusthunt:hunter:{trustScore}`

### Integration

- **Profile Service**: `https://rpc.aboutcircles.com/profiles/search?address={address}`
  - Fetches profile pictures and usernames
  - Caches profiles for performance
  - Displays fallback avatars when profiles aren't available
- **Middleware Contract**: `0x6fff09332ae273ba7095a2a949a7f4b89eb37c52`
- **Entry Fee**: 1 $OPEN per player (fixed amount)
- **RPC Endpoint**: `https://rpc.circlesubi.network/`

### Key Features

- ✅ Real-time updates (10-second refresh interval)
- ✅ Full profile integration with avatars and usernames
- ✅ Responsive design for iPad and mobile devices
- ✅ Modal-based join flow for better UX
- ✅ QR code generation for easy payment via Metri
- ✅ Duplicate prevention (only first entry per address is shown)
- ✅ Header image (Circles x Devconnect)
- ✅ Color-coded role indicators

## File Structure

```
oic_apps2/pages/apps/trust-hunt.js
oic_apps2/public/circlesxdevconnect.jpg
```

The app follows the standard OIC framework structure:

1. **Metadata**: App configuration including appId, title, description, and event handlers
2. **Data Loading**: `loadGameData()` function queries the blockchain indexer
3. **Profile Loading**: Fetches Circles profiles for all participants
4. **App Content**: React component with modal join form and player lists
5. **QR Generation**: Creates payment QR codes with packed data for the middleware contract

## Usage

Access the app at: `https://[your-domain]/apps/trust-hunt`

Or from the main page, select "Trust Hunt - Devconnect 2025" from the apps list.

## Development

The app is built using:
- Next.js
- OIC Framework (custom framework for $OPEN apps)
- Ethers.js for blockchain interaction
- QRCode library for QR generation
- Circles Profile Service for user profiles and avatars

## UI/UX Design Decisions

### Why Modal for Join Flow?
- Primary use case is viewing existing players (on iPad displays at venue)
- Join action is less frequent than viewing
- Modal keeps focus on the lists while providing easy access to join
- Prevents clutter on the main screen

### Why Profile Pictures and Usernames?
- Makes the game more personal and engaging
- Easier to identify real people vs wallet addresses
- Better visual appeal for public displays
- Builds on existing Circles social graph

### Why Auto-Refresh?
- Keeps lists current without manual interaction
- Creates dynamic, engaging display
- Shows new players joining in real-time
- 10-second interval balances freshness with server load

## Future Enhancements

Potential additions could include:
- Leaderboard for hunters with highest trust scores
- Trust score update mechanism within the app
- Real-time notifications when someone joins
- Game statistics and analytics
- Time-limited game sessions
- Achievement badges for finding certain number of backers
- Integration with event schedule/locations