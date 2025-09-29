# OIC Framework Deployment Guide

This guide covers deploying the OIC Framework to DigitalOcean using multiple approaches.

## 🚀 Quick Deployment Options

### Option 1: DigitalOcean App Platform (Recommended for beginners)
- ✅ **Easiest**: Zero server management
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **Built-in CI/CD**: Auto-deploys from Git
- 💰 **Cost**: $5-12/month

### Option 2: Droplet + Docker (More control)
- ✅ **Full control**: Complete server access
- ✅ **Cost-effective**: $4-6/month for basic droplet
- ✅ **Flexible**: Custom configurations
- ⚠️ **Requires**: Basic server management skills

## 🎯 Option 1: App Platform Deployment

### Step 1: Prepare Your Repository
Ensure your code is pushed to GitHub on the `oic_minimal` branch:
```bash
git push origin oic_minimal
```

### Step 2: Create DigitalOcean App
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. **Connect Repository**:
   - Choose GitHub
   - Select `pboes/oic_apps`
   - Branch: `oic_minimal`
   - Auto-deploy: ✅ Enabled

### Step 3: Configure Build Settings
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Environment**: Node.js
- **Instance Size**: Basic ($5/month)

### Step 4: Add Environment Variables
In the App Platform dashboard, add these environment variables:

```bash
# Database Configuration
DB_HOST=104.199.5.198
DB_PORT=5432
DB_NAME=postgres
DB_USER=circlesarbbotreadonly
DB_PASSWORD=vBXoESUGVD5VKSOfUEahNTO347Ghwl20

# Supabase Configuration (replace with your actual values)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Next.js Public Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration
NODE_ENV=production
```

### Step 5: Deploy
1. Click **"Create Resources"**
2. Wait 5-10 minutes for build and deployment
3. Your app will be available at: `https://your-app-name.ondigitalocean.app`

## 🐳 Option 2: Droplet + Docker Deployment

### Step 1: Create DigitalOcean Droplet
1. **Droplet Type**: Basic Droplet
2. **Image**: Ubuntu 22.04 LTS
3. **Size**: 1GB RAM, 1 vCPU ($6/month)
4. **Authentication**: SSH Key (recommended)
5. **Hostname**: `oic-framework`

### Step 2: Initial Server Setup
```bash
# Connect to your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Create non-root user
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
```

### Step 3: Setup Application
```bash
# Switch to deploy user
su - deploy

# Clone repository
git clone https://github.com/pboes/oic_apps.git
cd oic_apps
git checkout oic_minimal

# Create environment file
cp .env.production .env.local

# Edit with your actual values
nano .env.local
```

### Step 4: Deploy with Docker
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh production
```

### Step 5: Setup Nginx (Optional but recommended)
```bash
# Switch back to root
exit

# Install Nginx
apt install nginx -y

# Copy nginx configuration
cd /home/deploy/oic_apps
cp nginx.conf /etc/nginx/sites-available/oic-framework

# Update domain name in config
sed -i 's/your-domain.com/your-actual-domain.com/g' /etc/nginx/sites-available/oic-framework

# Enable site
ln -s /etc/nginx/sites-available/oic-framework /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

### Step 6: Setup SSL (Optional but recommended)
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
```

## 🔧 Environment Variables Guide

### Required Variables
```bash
# Database (provided)
DB_HOST=104.199.5.198
DB_PORT=5432
DB_NAME=postgres
DB_USER=circlesarbbotreadonly
DB_PASSWORD=vBXoESUGVD5VKSOfUEahNTO347Ghwl20

# Supabase (get from your Supabase dashboard)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Next.js Public (same as above, needed for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting Supabase Keys
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **URL**: Project URL
   - **anon key**: For `SUPABASE_ANON_KEY`
   - **service_role key**: For `SUPABASE_SERVICE_ROLE_KEY`

## 🌐 Domain Setup

### Option 1: Use DigitalOcean Domain
- App Platform provides a free `.ondigitalocean.app` domain
- Example: `oic-framework-abc123.ondigitalocean.app`

### Option 2: Custom Domain
1. **Point DNS** to your droplet IP or app platform
2. **For App Platform**: Add domain in dashboard
3. **For Droplet**: Update nginx config with your domain
4. **SSL**: Use Certbot for free Let's Encrypt certificate

## 📊 Monitoring & Maintenance

### Health Checks
- **App Platform**: Built-in health monitoring
- **Droplet**: Check with `curl http://localhost:3000/health`

### Viewing Logs
```bash
# App Platform: View in dashboard
# Droplet with Docker:
docker-compose logs -f oic-app

# Nginx logs:
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Updates
```bash
# App Platform: Auto-deploys on git push
# Droplet: Manual update process
git pull origin oic_minimal
./deploy.sh production
```

## 🔒 Security Considerations

### Essential Security Steps
1. **Environment Variables**: Never commit secrets to git
2. **SSH Keys**: Use key-based authentication (no passwords)
3. **Firewall**: Configure UFW or DigitalOcean firewall
4. **SSL**: Always use HTTPS in production
5. **Updates**: Keep system and dependencies updated

### Firewall Setup (Droplet only)
```bash
# Basic firewall
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
```

## 💰 Cost Estimates

### App Platform
- **Basic**: $5/month (512MB RAM)
- **Professional**: $12/month (1GB RAM)
- **Bandwidth**: Usually included

### Droplet + Block Storage
- **Basic Droplet**: $6/month (1GB RAM)
- **Better Performance**: $12/month (2GB RAM)
- **Domain**: $12/year (optional)

## 🆘 Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database connection issues
- Check if DB credentials are correct
- Verify network connectivity to DB host
- Check if DB allows connections from your IP

#### Supabase connection fails
- Verify URL and keys are correct
- Check if RLS policies allow operations
- Test connection with `/api/test-supabase`

#### Build failures
```bash
# Check Node version (needs 18+)
node --version

# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Getting Help
1. **Check logs** first (most issues show up there)
2. **Test locally** - does it work on your machine?
3. **Environment variables** - are they all set correctly?
4. **Network connectivity** - can the server reach external services?

## 🎉 Success!

After deployment, your OIC Framework will be available with:
- ✅ **Mint $OPEN**: Convert Circles to $OPEN tokens
- ✅ **Social Feed**: Pay-to-post messaging system  
- ✅ **Random Numbers**: Dynamic pricing for different ranges
- ✅ **Database Monitor**: Real-time blockchain event monitoring

The framework is now ready for community contributions and new app development!

## 📈 Next Steps
1. **Monitor usage** and performance
2. **Add custom domain** if using droplet
3. **Set up monitoring** (Uptime Robot, etc.)
4. **Plan scaling** if traffic grows
5. **Encourage contributions** from the community

---

**Need help?** Check the logs, verify environment variables, and ensure all external services (Supabase, database) are accessible.