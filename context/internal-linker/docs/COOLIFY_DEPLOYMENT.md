# Deploying to VPS with Coolify

Complete guide to deploy the Internal Linking Analyzer API to your VPS using Coolify with Supabase PostgreSQL and embedded Redis.

## Understanding the Setup

This guide assumes you have:
- **Coolify running on your local machine** (accessed via `http://localhost:8000`)
- **A VPS server already connected to your Coolify instance**
- **A domain name** that you want to point to your VPS

Coolify will deploy the application **to your VPS server**, not to your local machine. Your domain will point to your VPS IP address.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Deployment Architecture](#deployment-architecture)
- [Step 1: Prepare Dockerfile with Redis](#step-1-prepare-dockerfile-with-redis)
- [Step 2: Create New Resource in Coolify](#step-2-create-new-resource-in-coolify)
- [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
- [Step 4: Configure Domain](#step-4-configure-domain)
- [Step 5: Deploy](#step-5-deploy)
- [Step 6: Post-Deployment Setup](#step-6-post-deployment-setup)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

✅ **VPS Server** - Your remote server for hosting the API  
✅ **Coolify** - Running on your local machine, managing the VPS server  
✅ **VPS connected to Coolify** - Your server should appear in Coolify's servers list  
✅ **Supabase Account** with PostgreSQL database created  
✅ **Domain name** pointing to your VPS IP (A record: `api.yourdomain.com` → VPS IP)  
✅ **Scrape.do API Token** (for web scraping)  
✅ **API Key** generated for authentication

**Note:** Coolify runs on your local machine (accessed via `localhost:8000`), but deploys applications to your remote VPS server. The deployed API will be accessible via your domain.

---

## Deployment Architecture

```
┌─────────────────────────────────┐
│   Your Local Machine            │
│                                 │
│   ┌─────────────────────────┐   │
│   │  Coolify (localhost)    │   │
│   │  Manages deployments    │   │
│   └─────────────────────────┘   │
│              │                  │
└──────────────┼──────────────────┘
               │ SSH/Deploy
               ↓
┌─────────────────────────────────────────┐
│          VPS Server (Your Remote)       │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   Docker Container                │  │
│  │                                   │  │
│  │   ┌─────────────────────────┐     │  │
│  │   │   Redis (Port 6379)     │     │  │
│  │   └─────────────────────────┘     │  │
│  │              ↕                    │  │
│  │   ┌─────────────────────────┐     │  │
│  │   │   Node.js API (Port 3000)│   │  │
│  │   └─────────────────────────┘     │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                 ↕                       │
│         Caddy (Reverse Proxy)          │
│         SSL/TLS + Domain               │
│         api.yourdomain.com             │
└─────────────────────────────────────────┘
                  ↕
        ┌──────────────────┐
        │  Supabase DB     │
        │  (PostgreSQL)    │
        │  External Cloud  │
        └──────────────────┘
```

**Key Points:**
- **Coolify** runs on your local machine and manages the VPS remotely
- **Redis** runs inside the same container as the Node.js app (on VPS)
- **PostgreSQL** is external (Supabase cloud)
- **Caddy** (on VPS) handles SSL/TLS automatically
- **Domain** points to your VPS IP, not your local machine

---

## Step 1: Prepare Dockerfile with Redis

Create a new `Dockerfile.coolify` that includes Redis in the container:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY prisma ./prisma
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage with Redis
FROM node:20-alpine

WORKDIR /app

# Install Redis
RUN apk add --no-cache redis supervisor

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema
COPY prisma ./prisma

# Create supervisor config to run Redis and Node.js together
RUN mkdir -p /var/log/supervisor
COPY <<EOF /etc/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:redis]
command=redis-server --bind 127.0.0.1 --port 6379
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:app]
command=sh -c "npx prisma db push --accept-data-loss && node dist/index.js"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
directory=/app
EOF

# Expose port
EXPOSE 3000

# Start supervisor (runs both Redis and Node.js)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
```

**Save this as `Dockerfile.coolify` in your project root.**

**Alternative: Simple startup script (if supervisor doesn't work)**

Create `Dockerfile.coolify`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

# Production stage with Redis
FROM node:20-alpine

WORKDIR /app

# Install Redis
RUN apk add --no-cache redis

# Copy dependencies and built files
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Create startup script
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e

# Start Redis in background
redis-server --daemonize yes --bind 127.0.0.1 --port 6379

# Wait for Redis to be ready
until redis-cli ping 2>/dev/null; do
  echo "Waiting for Redis..."
  sleep 1
done

echo "✅ Redis is ready"

# Run Prisma migrations
npx prisma db push --accept-data-loss

# Start the application
exec node dist/index.js
EOF

RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
```

---

## Step 2: Create New Resource in Coolify

1. **Access Coolify Dashboard**
   - Open Coolify in your browser: `http://localhost:8000` (or your Coolify local URL)
   - Coolify is running on your local machine but will deploy to your VPS

2. **Select Your VPS Server**
   - In Coolify, navigate to **Servers**
   - Select the VPS server where you want to deploy the API
   - Verify the server status is "Connected"

3. **Create New Project**
   - Click **"+ New"** → **"Project"**
   - Name: `Internal Linking Analyzer` (or any name)

4. **Add New Resource**
   - Click **"+ Add"** → **"New Resource"**
   - Select **"Public Repository"** or **"Private Repository"**

5. **Configure Git Repository**
   - **Repository URL**: `https://github.com/yourusername/internal-linking.git` (or your Git URL)
   - **Branch**: `main` (or your deployment branch)
   - **Build Pack**: Select **"Dockerfile"**
   - **Dockerfile Location**: `Dockerfile.coolify`

6. **Select Destination Server**
   - **Server**: Choose your VPS server from the dropdown
   - **Network**: Default network is fine
   - This ensures the app deploys to your VPS, not your local machine

7. **Configure Build Settings**
   - **Port**: `3000`
   - **Health Check Path**: `/health` (optional)
   - **Build Command**: Leave empty (Dockerfile handles it)
   - **Start Command**: Leave empty (Dockerfile CMD handles it)

---

## Step 3: Configure Environment Variables

In Coolify, go to your application → **Environment Variables** tab:

### Required Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:yourpassword@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Redis (localhost since it's in the same container)
REDIS_URL=redis://127.0.0.1:6379

# Worker Configuration
WORKER_CONCURRENCY=2

# Scrape.do API Token
SCRAPE_DO_TOKEN=your_scrapedo_token_here

# API Authentication
API_KEY=your_secure_api_key_here
```

### How to Get Supabase Database URL

1. Go to **Supabase Dashboard**
2. Select your project
3. Click **Settings** → **Database**
4. Under **Connection String** → **URI**, copy the connection string
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. **Important**: Use the **connection pooling URL** (port 6543 with `pgbouncer=true`)

**Example:**
```
postgresql://postgres.abcdefghijklmnop:MySecurePassword123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Generate Secure API Key

```bash
# On your local machine
openssl rand -hex 32
```

Copy the output and use it as your `API_KEY`.

---

## Step 4: Configure Domain

### In Coolify:

1. Go to your application → **Domains** tab (in your local Coolify dashboard)
2. Click **"+ Add Domain"**
3. Enter your domain: `api.yourdomain.com`
4. Enable **HTTPS** (Coolify will auto-generate SSL via Let's Encrypt on your VPS)
5. Save

**Important:** The domain points to your **VPS server IP**, not your local machine where Coolify runs.

### In Your DNS Provider:

Add an **A record** pointing to your **VPS server IP** (not your local machine):

```
Type: A
Name: api (or @ if you want yourdomain.com)
Value: Your VPS IP address (e.g., 123.45.67.89)
TTL: 3600 (or Auto)
```

**Important:** Use your VPS server's public IP address, not your local machine's IP.

**Wait 5-15 minutes** for DNS propagation.

**Verify DNS:**
```bash
# On your local machine
nslookup api.yourdomain.com
# Should return your VPS IP (e.g., 123.45.67.89)
```

---

## Step 5: Deploy

1. **Commit Your Changes**
   ```bash
   git add Dockerfile.coolify
   git commit -m "Add Coolify deployment configuration"
   git push origin main
   ```

2. **Trigger Deployment in Coolify**
   - Open Coolify in your browser: `http://localhost:8000`
   - Navigate to your application
   - Click **"Deploy"** button
   - Or enable **Auto-deploy** on git push
   - **Note:** Build happens on your VPS, not your local machine

3. **Monitor Build Logs**
   - Watch the build process in Coolify's **Logs** tab
   - Look for successful build completion
   - The build is executed on your VPS server

4. **Wait for Deployment**
   - Build takes ~2-5 minutes
   - Coolify will automatically:
     - Build the Docker image
     - Start the container
     - Configure SSL certificate
     - Set up reverse proxy

---

## Step 6: Post-Deployment Setup

### 1. Verify Database Connection

Check logs in Coolify to ensure Prisma connected successfully:

```
✅ Connected to Redis
✅ Redis is ready
✅ Database connected successfully
```

### 2. Test the API

```bash
# Health check
curl https://api.yourdomain.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-04-16T...",
  "redis": true,
  "database": true
}
```

### 3. Test Authentication

```bash
# Submit a crawl job (replace YOUR_API_KEY)
curl -X POST https://api.yourdomain.com/api/jobs/submit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Expected response:
{
  "jobId": "crawl-...",
  "status": "waiting",
  "message": "Job queued successfully"
}
```

### 4. Monitor Logs

In Coolify → **Logs** tab, watch for:
- Redis connection success
- Database connection
- Worker ready messages
- Job processing activity

---

## Troubleshooting

### Issue: Can't see my VPS server in Coolify

**Cause:** Server not connected to Coolify

**Solutions:**
1. In Coolify (local) → **Servers** → Verify your VPS appears in the list
2. Check server status is "Connected" (green)
3. If not connected:
   - In Coolify → **Servers** → Click **"+ Add Server"**
   - Enter your VPS IP, SSH key, and credentials
   - Coolify will install required components on the VPS
   - Wait for "Connected" status
4. Test SSH from your local machine: `ssh user@your-vps-ip`

### Issue: "Cannot connect to database"

**Cause:** Wrong DATABASE_URL or Supabase firewall

**Solutions:**
1. Verify DATABASE_URL format (use connection pooling URL with port 6543)
2. In Supabase → **Settings** → **Database** → **Connection pooling** should be enabled
3. Check if `pgbouncer=true` is in the URL
4. Verify password is correct (no special characters needing URL encoding)

### Issue: "Redis connection failed"

**Cause:** Redis not starting in container

**Solutions:**
1. Check logs: `redis-server` should show "Ready to accept connections"
2. Verify REDIS_URL is `redis://127.0.0.1:6379` (not localhost, not other IP)
3. Try rebuilding: Coolify → **Redeploy**

### Issue: "ERR max request size exceeded"

**Cause:** Large crawl results exceeding Redis limits (already fixed in recent code)

**Solution:** Already resolved - the worker now returns only summaries, not full data.

### Issue: Port 3000 not accessible

**Cause:** Coolify proxy not configured correctly

**Solutions:**
1. Verify **Port** is set to `3000` in Coolify settings
2. Check that domain is properly configured with HTTPS enabled
3. Wait 5 minutes after deployment for Caddy to update

### Issue: SSL certificate not generated

**Cause:** DNS not propagated or Let's Encrypt rate limit

**Solutions:**
1. Verify DNS: `nslookup api.yourdomain.com` returns your VPS IP
2. Wait 15-30 minutes for DNS propagation
3. In Coolify, try **"Force HTTPS regeneration"**
4. Check Let's Encrypt rate limits (5 attempts per hour)

### Issue: "prisma db push" fails

**Cause:** Database already has old schema or migration conflicts

**Solutions:**
1. Connect to Supabase SQL Editor
2. Check if tables exist: `SELECT * FROM "CrawlJob" LIMIT 1;`
3. If needed, drop old tables:
   ```sql
   DROP TABLE IF EXISTS "InternalLink" CASCADE;
   DROP TABLE IF EXISTS "OrphanPage" CASCADE;
   DROP TABLE IF EXISTS "CreditUsage" CASCADE;
   DROP TABLE IF EXISTS "CrawlJob" CASCADE;
   ```
4. Redeploy in Coolify

### Issue: Worker not processing jobs

**Cause:** Worker not starting or Redis connection issue

**Solutions:**
1. Check logs for "Worker ready" message
2. Verify `WORKER_CONCURRENCY` is set (default: 2)
3. Check Redis is running: Look for Redis logs in Coolify
4. Submit a test job and watch the logs

---

## Advanced Configuration

### Enable Auto-Deploy on Git Push

In Coolify → **Settings** → **CI/CD**:
- Enable **"Auto Deploy on Git Push"**
- Configure webhook if using GitHub/GitLab

### Scale Workers

To increase processing capacity:

1. In Coolify → **Environment Variables**
2. Update `WORKER_CONCURRENCY=4` (or higher, max 10 recommended)
3. Redeploy

### Monitor with Uptime Checks

In Coolify → **Health Checks**:
- URL: `https://api.yourdomain.com/health`
- Interval: 60 seconds
- Timeout: 10 seconds

### Database Backups

**Supabase handles backups automatically**, but to backup manually:

1. Go to Supabase Dashboard → **Database** → **Backups**
2. Click **"Create Backup"**
3. Download or store in Supabase

---

## Environment URLs

After deployment, your API will be available at:

- **Production API**: `https://api.yourdomain.com`
- **Health Check**: `https://api.yourdomain.com/health`
- **API Info**: `https://api.yourdomain.com/`
- **Submit Job**: `POST https://api.yourdomain.com/api/jobs/submit`

---

## Security Best Practices

1. **Never commit `.env` files** to Git
2. **Use strong API keys** (32+ characters, random)
3. **Enable HTTPS only** (disable HTTP in Coolify)
4. **Rotate API keys** periodically
5. **Monitor logs** for unusual activity
6. **Use connection pooling** for database (already configured with pgbouncer)
7. **Set rate limits** (already implemented in the API)

---

## Updating/Redeploying

### Code Changes

1. Commit changes to Git:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```

2. Coolify auto-deploys (if enabled) or click **"Deploy"** manually

### Environment Variable Changes

1. Update in Coolify → **Environment Variables**
2. Click **"Restart"** (no rebuild needed)

### Dockerfile Changes

1. Commit changes to `Dockerfile.coolify`
2. Push to Git
3. Coolify will rebuild from scratch

---

## Cost Estimates

- **VPS**: $5-20/month (depends on provider)
- **Coolify**: Free (self-hosted)
- **Supabase**: $0-25/month (free tier: 500MB database, 2GB bandwidth)
- **Domain**: $10-15/year
- **Scrape.do**: Pay-as-you-go (based on usage)

**Total**: ~$5-45/month

---

## Support & References

- **Coolify Docs**: https://coolify.io/docs
- **Supabase Docs**: https://supabase.com/docs
- **API Documentation**: [API_DOC.md](./API_DOC.md)
- **Testing Guide**: [SHORT_API_DOC.md](./SHORT_API_DOC.md)

---

**🎉 Deployment Complete!** Your Internal Linking Analyzer API is now live at `https://api.yourdomain.com`.
