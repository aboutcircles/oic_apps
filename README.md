# OIC Framework

> A blockchain-powered web application platform for building interactive, decentralized apps with minimal configuration.

The **App Framework** enables developers easily build mini-apps that are fueled by the $OPEN.

## 🌟 Features

### Core Framework Capabilities
- 🎯 **Metadata-driven app creation** - Define apps with simple configuration objects
- 💰 **Token-based interactions** - Built-in payment handling for $OPEN tokens
- 📱 **Real-time QR code generation** - Dynamic payment requests and transfers
- ⚡ **Live blockchain monitoring** - Real-time event listening and updates
- 🔄 **Socket.io integration** - Instant updates across connected clients
- 🎨 **Retro, minimalist design** - Clean aesthetic with responsive layouts

### Blockchain Integration
- 🔗 **Circles protocol support** - Convert Circles tokens to $OPEN
- 💎 **Ethers.js integration** - Full blockchain interaction capabilities
- 📊 **PostgreSQL monitoring** - Track blockchain events in real-time
- 🔐 **Recipient address validation** - Secure payment processing

### Data Persistence
- 📁 **Supabase integration** - Modern database with real-time features
- 🗄️ **PostgreSQL backend** - Reliable data storage and querying
- 🔄 **Real-time sync** - Automatic updates across all clients

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone and install dependencies**
   ```bash
   cd oic_apps
   npm install
   ```

2. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local

   # Edit .env.local with your configuration
   nano .env.local
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to http://localhost:3000
   - Explore the available apps and framework features

## 📱 Built-in Applications

The OIC Framework comes with several example applications demonstrating different use cases:

### 1. **Mint $OPEN** (`/apps/mint-open`)
Convert your Circles tokens to $OPEN tokens using maximum flow path calculations.

**Features:**
- Real-time wallet connection
- Maximum flow calculation via Circles RPC
- Dynamic amount selection
- QR code generation for payments
- Transaction verification and confirmation

### 2. **Pay-to-Post Social Feed** (`/apps/social-feed`)
A social messaging platform where users pay tokens to post messages.

**Features:**
- Token-based posting system
- Supabase integration for message persistence
- Real-time message updates
- Payment verification before posting
- Community-driven content curation

### 3. **Random Number Generator** (`/apps/random-number`)
Generate cryptographically secure random numbers with dynamic pricing.

**Features:**
- Configurable number ranges
- Dynamic pricing based on range complexity
- Secure random generation
- Payment verification
- Real-time results display

### 4. **Database Monitor** (`/apps/database-monitor`)
Monitor blockchain events and database changes in real-time.

**Features:**
- Live event streaming
- PostgreSQL connection monitoring
- Real-time blockchain event display
- Connection status indicators
- Event filtering and search

## 🏗️ Framework Architecture

### Technology Stack
- **Frontend**: Next.js 14 with React 18
- **Real-time**: Socket.io for live updates
- **Blockchain**: Ethers.js for Web3 interactions
- **Database**: PostgreSQL with Supabase
- **Styling**: CSS-in-JS with responsive design
- **Deployment**: Docker-ready with multiple deployment options

### Core Components

#### OIC App Factory (`lib/oic-framework.js`)
The heart of the framework that creates apps from metadata:

```javascript
const metadata = {
  appId: "my-app",
  title: "My App Title",
  description: "What this app does",
  recipient: "0x...", // Payment recipient address
  initialState: { /* app state */ },
  onPayment: (eventData, appState, setAppState) => {
    // Handle successful payments
  }
};

export default createOICApp(metadata, appContent);
```

#### Real-time Event System
- Socket.io server monitoring PostgreSQL for blockchain events
- Automatic client updates on payment confirmations
- Event filtering and routing to appropriate apps

#### Payment Flow
1. User initiates action requiring payment
2. QR code generated with recipient address and amount
3. User scans and pays via mobile wallet
4. Blockchain event detected by monitoring system
5. Payment verified and app state updated
6. User sees immediate confirmation and results

## 🚀 Deployment

The OIC Framework supports multiple deployment strategies:

### Option 1: DigitalOcean App Platform (Recommended)
- **Pros**: Zero server management, auto-scaling, built-in CI/CD
- **Cost**: $5-12/month
- **Setup**: Connect GitHub repo, configure environment variables, deploy

### Option 2: Self-hosted with Docker
- **Pros**: Full control, cost-effective, flexible configuration
- **Cost**: $4-6/month for basic VPS
- **Setup**: Use provided Docker Compose configuration

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🛠️ Development

### Creating New Apps

1. **Create app file**
   ```bash
   touch pages/apps/my-new-app.js
   ```

2. **Define app metadata and content**
   ```javascript
   import { createOICApp } from "../../lib/oic-framework";

   const metadata = {
     appId: "my-new-app",
     title: "My New App",
     description: "Description of what it does",
     recipient: "0x...",
     initialState: {
       // Define your app's initial state
     },
     onPayment: (eventData, appState, setAppState) => {
       // Handle payment confirmations
     }
   };

   const appContent = ({ appState, setAppState, generateQR }) => (
     <div>
       {/* Your app UI here */}
     </div>
   );

   export default createOICApp(metadata, appContent);
   ```

3. **Add to navigation**
   Update `pages/index.js` to include your new app in the APPS array.

### Framework API

#### Core Hooks and Functions
- `appState` / `setAppState`: React state management
- `currentAmount` / `setCurrentAmount`: Payment amount handling
- `generateQR(amount, recipient)`: Generate payment QR codes
- `onPayment(eventData, ...)`: Payment event handler

#### Event Data Structure
```javascript
{
  transactionHash: "0x...",
  blockNumber: 12345,
  sender: "0x...",
  recipient: "0x...",
  amount: "1000000000000000000", // Wei amount
  timestamp: "2024-01-01T12:00:00Z"
}
```

## 🔧 Environment Configuration

### Required Variables
```bash
# Database Configuration (for blockchain monitoring)
DB_HOST=104.199.5.198
DB_PORT=5432
DB_NAME=postgres
DB_USER=circlesarbbotreadonly
DB_PASSWORD=your_db_password

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🤝 Contributing

We welcome contributions! The OIC Framework is designed to be extensible and community-driven.

Once you have an app you'd like to list on the page, simply create a PR and one of the team members will be in touch.

## ⚖️ License

This project is open source and available under the [MIT License](./LICENSE).

---

**Ready to build the future of decentralized applications?** 🚀

Start by exploring the example apps, then create your own innovative token-based applications using the OIC Framework. The possibilities are endless!
