#!/bin/bash

# OIC Framework Deployment Script for DigitalOcean
# Usage: ./deploy.sh [production|staging]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENV=${1:-production}

echo -e "${BLUE}🚀 Starting OIC Framework deployment...${NC}"
echo -e "${BLUE}Environment: ${ENV}${NC}"

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed. Aborting.${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose is required but not installed. Aborting.${NC}" >&2; exit 1; }

# Check if environment file exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from template...${NC}"
    if [ -f ".env.production" ]; then
        cp .env.production .env.local
        echo -e "${YELLOW}📝 Please edit .env.local with your actual values before continuing.${NC}"
        echo -e "${YELLOW}Required values:${NC}"
        echo -e "  - SUPABASE_URL"
        echo -e "  - SUPABASE_ANON_KEY"
        echo -e "  - SUPABASE_SERVICE_ROLE_KEY"
        echo -e "  - NEXT_PUBLIC_SUPABASE_URL"
        echo -e "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        exit 1
    else
        echo -e "${RED}❌ No environment template found. Please create .env.local manually.${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env.local

# Validate required environment variables
REQUIRED_VARS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set in .env.local${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Build and deploy
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker-compose build

echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose down

echo -e "${BLUE}🚀 Starting new containers...${NC}"
docker-compose up -d

# Wait for health check
echo -e "${BLUE}🏥 Waiting for health check...${NC}"
sleep 30

# Check if the application is running
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running successfully!${NC}"
    echo -e "${GREEN}🌐 Available at: http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Application failed to start. Check logs:${NC}"
    echo -e "${YELLOW}docker-compose logs oic-app${NC}"
    exit 1
fi

# Show useful commands
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "  View logs:     ${YELLOW}docker-compose logs -f oic-app${NC}"
echo -e "  Stop app:      ${YELLOW}docker-compose down${NC}"
echo -e "  Restart app:   ${YELLOW}docker-compose restart oic-app${NC}"
echo -e "  Check status:  ${YELLOW}docker-compose ps${NC}"

# If nginx config exists, show nginx commands
if [ -f "nginx.conf" ]; then
    echo -e "${BLUE}🔧 Nginx configuration found. To set up reverse proxy:${NC}"
    echo -e "  ${YELLOW}sudo cp nginx.conf /etc/nginx/sites-available/oic-app${NC}"
    echo -e "  ${YELLOW}sudo ln -s /etc/nginx/sites-available/oic-app /etc/nginx/sites-enabled/${NC}"
    echo -e "  ${YELLOW}sudo nginx -t && sudo systemctl reload nginx${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
