# OIC Simple App

A barebones Next.js application with a number slider that generates QR codes and listens for database events.

## Features

- 🎚️ Number slider (1-100)
- 📱 Real-time QR code generation
- 📊 PostgreSQL database monitoring
- ⚡ Socket.io for live updates

## Setup

1. **Clone and install**
   ```bash
   cd oic_apps
   npm install
   ```

2. **Configure environment**
   ```bash
   # Edit .env.local and set your database password
   DB_PASSWORD=your_password_here
   ```

3. **Run the app**
   ```bash
   npm run dev
   ```

4. **Open browser**
   - Go to http://localhost:3000

## How it works

- Move the slider to change the number (1-100)
- QR code updates automatically with the current number
- Database events from `CrcV2_OIC_OpenMiddlewareTransfer` appear in real-time
- Connection status shows if Socket.io is working

## Docker

```bash
docker build -t oic-simple-app .
docker run -p 3000:3000 -e DB_PASSWORD=your_password oic-simple-app
```

## Environment Variables

```env
DB_HOST=104.199.5.198
DB_PORT=5432
DB_NAME=postgres
DB_USER=circlesarbbotreadonly
DB_PASSWORD=your_password_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

That's it! Simple as possible.