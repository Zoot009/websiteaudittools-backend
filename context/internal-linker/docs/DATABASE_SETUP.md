# Database Setup Guide

This guide will help you set up PostgreSQL and configure Prisma for the Internal Linking Analysis API.

## Prerequisites

- PostgreSQL 12 or higher
- Node.js 18 or higher

## Step 1: Install PostgreSQL

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS (with Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Docker
```bash
docker run -d \
  --name postgres-internal-linking \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=internal_linking \
  -p 5432:5432 \
  postgres:15-alpine
```

## Step 2: Create Database and User

Connect to PostgreSQL:
```bash
sudo -u postgres psql
```

Run these SQL commands:
```sql
-- Create database
CREATE DATABASE internal_linking;

-- Create user with password
CREATE USER internal_linking_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE internal_linking TO internal_linking_user;

-- Connect to the database
\c internal_linking

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO internal_linking_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO internal_linking_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO internal_linking_user;

-- Exit
\q
```

## Step 3: Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# PostgreSQL Database Configuration
DATABASE_URL="postgresql://internal_linking_user:your_secure_password@localhost:5432/internal_linking?schema=public"

# Scrape.do API Token
SCRAPE_DO_TOKEN=your_scrape_do_token_here

# Redis Configuration
# Option 1: Use Redis URL (recommended)
REDIS_URL=redis://localhost:6379
# For Redis with password: redis://:password@localhost:6379
# For Redis with username and password: redis://username:password@localhost:6379
# For TLS: rediss://localhost:6380

# Option 2: Use individual fields (if REDIS_URL is not set)
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=

# Server Configuration
PORT=3000
WORKER_CONCURRENCY=2
```

**Important:** Update `your_secure_password` with the actual password you created.

**Redis Configuration:**
- The application now supports `REDIS_URL` for simplified Redis connection configuration
- If `REDIS_URL` is set, it takes precedence over individual fields
- Use individual fields (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`) only if you prefer that approach

## Step 4: Generate Prisma Client

Generate the Prisma Client from the schema:

```bash
npx prisma generate
```

This creates the TypeScript types and client library for database operations.

## Step 5: Run Database Migrations

Apply the schema to your database:

```bash
npx prisma migrate dev --name initial_setup
```

This will:
1. Create all tables defined in `prisma/schema.prisma`
2. Set up indexes for performance
3. Create the migration history

## Step 6: Verify Database Setup

Check that all tables were created:

```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555 where you can view your database schema and data.

## Database Schema Overview

The database includes the following tables for internal linking analysis:

### CrawlJob
Stores metadata about each crawl operation:
- Job ID (BullMQ reference)
- Target URL
- Status (pending, processing, completed, failed)
- Statistics (pages crawled, depth reached, errors)
- Total credits used
- Timestamps

### InternalLink
Stores the internal link graph:
- Source URL
- Target URLs (array of outgoing links)
- Inbound link count
- Depth level
- Associated crawl job

### OrphanPage
Tracks pages that have no inbound links:
- Page URL
- Source (sitemap or discovered)
- Discovery method
- Associated crawl job

### CreditUsage
Detailed tracking of scrape.do API usage:
- Target URL
- Credits consumed
- Request type (datacenter, residential, render)
- Status code
- Response time
- Success/failure status
- Error messages
- Timestamp

## Common Operations

### View Recent Crawl Jobs
```bash
npx prisma studio
# Navigate to CrawlJob table
```

### Check Credit Usage
```sql
-- Connect to database
psql postgresql://internal_linking_user:password@localhost:5432/internal_linking

-- Total credits used
SELECT SUM(credits_used) as total_credits FROM "CreditUsage";

-- Credits by request type
SELECT request_type, SUM(credits_used) as total, COUNT(*) as requests
FROM "CreditUsage"
GROUP BY request_type;

-- Credits by date
SELECT DATE(timestamp) as date, SUM(credits_used) as credits
FROM "CreditUsage"
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Export Crawl Data
```bash
# Export all data to JSON
npx prisma studio
# Use the export feature in the UI

# Or use psql
psql postgresql://internal_linking_user:password@localhost:5432/internal_linking -c "\copy (SELECT * FROM \"CrawlJob\") TO 'crawl_jobs.csv' CSV HEADER"
```

## Troubleshooting

### Connection Issues

**Error: "password authentication failed"**
- Verify your DATABASE_URL has the correct password
- Check PostgreSQL is running: `sudo systemctl status postgresql`

**Error: "database does not exist"**
- Create the database: `createdb -U postgres internal_linking`

**Error: "peer authentication failed"**
- Edit PostgreSQL config to allow password authentication
- Location: `/etc/postgresql/15/main/pg_hba.conf`
- Change `peer` to `md5` for local connections
- Restart PostgreSQL: `sudo systemctl restart postgresql`

### Migration Issues

**Error: "migration failed"**
- Reset the database: `npx prisma migrate reset`
- This will delete all data and re-run migrations

**Error: "schema drift detected"**
- Push schema without migration: `npx prisma db push`
- Or create a new migration: `npx prisma migrate dev`

### Performance Optimization

For large-scale crawling, consider these optimizations:

1. **Add connection pooling:**
```typescript
// In database.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

2. **Enable query logging (development):**
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

3. **Database indexes** (already included in schema):
- CrawlJob: jobId, targetUrl, status, createdAt
- InternalLink: crawlJobId, sourceUrl
- OrphanPage: crawlJobId, url, source
- CreditUsage: crawlJobId, targetUrl, timestamp

## Backup and Restore

### Backup Database
```bash
pg_dump -U internal_linking_user internal_linking > backup.sql

# Or with Docker
docker exec postgres-internal-linking pg_dump -U postgres internal_linking > backup.sql
```

### Restore Database
```bash
psql -U internal_linking_user internal_linking < backup.sql

# Or with Docker
docker exec -i postgres-internal-linking psql -U postgres internal_linking < backup.sql
```

## Production Deployment

For production environments:

1. **Use connection pooling** (PgBouncer or Prisma Accelerate)
2. **Enable SSL** in DATABASE_URL:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
   ```
3. **Set up automated backups**
4. **Monitor database performance**
5. **Use read replicas** for heavy read workloads
6. **Configure appropriate timeouts**

## Next Steps

After database setup:
1. Start Redis: `redis-server` or `brew services start redis`
2. Start the application: `npm run dev`
3. Submit a test crawl job
4. View results in Prisma Studio: `npx prisma studio`

For more information, see:
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [BullMQ Guide](./BULLMQ_GUIDE.md)
