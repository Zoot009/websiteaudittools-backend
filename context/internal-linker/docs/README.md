# Documentation Index

Complete documentation for the Internal Linking Analysis API.

## 📚 Documentation Files

### Getting Started
- **[README.md](../README.md)** - Main project overview and quick start
- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup and first job guide
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - PostgreSQL database configuration guide

### Testing & API Usage
- **[API_DOC.md](API_DOC.md)** 📘 **Complete API Specification**
  - All endpoints with detailed request/response formats
  - Error handling and HTTP status codes
  - Data models and type definitions
  - Complete workflow examples (cURL, Python, JavaScript)
  - Best practices and common scenarios
  
- **[API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)** ⭐ **Comprehensive API testing guide**
  - Complete endpoint documentation
  - Testing workflows and examples
  - cURL, HTTPie, JavaScript, and Python examples
  - Troubleshooting guide
  - Common use cases

- **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** ⚡ **One-page cheat sheet**
  - Quick command reference
  - Essential endpoints
  - Common testing scenarios
  - Useful scripts

- **[FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md)** 🎨 **Frontend Developer's Guide**
  - Complete TypeScript interfaces
  - React Query integration examples
  - Polling strategies and best practices
  - Error handling patterns
  - Real-world usage examples

### Implementation Guides
- **[BULLMQ_GUIDE.md](BULLMQ_GUIDE.md)** - BullMQ job queue implementation details
- **[DATABASE_IMPLEMENTATION.md](DATABASE_IMPLEMENTATION.md)** - Database persistence architecture
- **[FRONTEND_DESIGN_PROMPT.md](FRONTEND_DESIGN_PROMPT.md)** - Complete frontend design specification with D3.js graph visualization

### Reference Documentation
- **[sitemapper_docs.md](sitemapper_docs.md)** - Sitemapper library documentation

---

## 🚀 Quick Links by Task

### I want to test the API
→ Start with **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** for quick commands  
→ See **[API_DOC.md](API_DOC.md)** for complete API specification  
→ See **[API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)** for detailed examples

### I want to build a frontend
→ Read **[FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md)** for complete TypeScript/React integration guide

### I want to set up the database
→ Follow **[DATABASE_SETUP.md](DATABASE_SETUP.md)**

### I want to understand BullMQ integration
→ Read **[BULLMQ_GUIDE.md](BULLMQ_GUIDE.md)**

### I want to get started quickly
→ Check **[QUICKSTART.md](QUICKSTART.md)**

### I want to understand the database design
→ See **[DATABASE_IMPLEMENTATION.md](DATABASE_IMPLEMENTATION.md)**

---

## 🧪 Test Script

A ready-to-use test script is available in the root directory:

```bash
# Make executable (if needed)
chmod +x test-api.sh

# Run the test
./test-api.sh

# With custom parameters
TEST_URL=https://yoursite.com MAX_PAGES=10 ./test-api.sh
```

The script will:
1. Check API health
2. Submit a test crawl job
3. Monitor progress
4. Display results
5. Save full results to JSON file

---

## 📖 Documentation Overview

### For Developers

| Document | Purpose | When to Use |
|----------|---------|-------------|
| README.md | Project overview | First time setup |
| QUICKSTART.md | Fast start guide | Getting up and running |
| API_DOC.md | **Complete API specification** | **Reference for all endpoints** |
| API_TESTING_GUIDE.md | Complete API docs | Building integrations |
| FRONTEND_API_REFERENCE.md | Frontend integration | Building React/TypeScript UI |
| BULLMQ_GUIDE.md | Queue architecture | Understanding job processing |
| DATABASE_IMPLEMENTATION.md | DB design | Database queries and analytics |

### For Testers

| Document | Purpose | When to Use |
|----------|---------|-------------|
| API_QUICK_REFERENCE.md | Quick commands | Daily testing |
| API_DOC.md | Complete API spec | Understanding request/response formats |
| API_TESTING_GUIDE.md | Detailed examples | Learning the API |
| test-api.sh script | Automated test | Verifying setup |

### For DevOps

| Document | Purpose | When to Use |
|----------|---------|-------------|
| DATABASE_SETUP.md | DB configuration | Production setup |
| BULLMQ_GUIDE.md | Queue setup | Redis configuration |
| README.md | Dependencies | Deployment |

---

## 💡 Common Workflows

### Testing Workflow
```
1. Read: API_QUICK_REFERENCE.md
2. Run: ./test-api.sh
3. Reference: API_TESTING_GUIDE.md (for advanced usage)
```

### Setup Workflow
```
1. Read: README.md
2. Follow: QUICKSTART.md
3. Configure: DATABASE_SETUP.md
4. Test: API_QUICK_REFERENCE.md
```

### Development Workflow
```
1. Understand: BULLMQ_GUIDE.md
2. Understand: DATABASE_IMPLEMENTATION.md
3. Reference: API_TESTING_GUIDE.md
4. Build and test
```

---

## 🔗 External Resources

- **scrape.do Documentation**: https://scrape.do/documentation/
- **BullMQ Documentation**: https://docs.bullmq.io/
- **Prisma Documentation**: https://www.prisma.io/docs

---

## 📝 Document Summaries

### API_TESTING_GUIDE.md
Complete API testing guide with:
- Prerequisites and setup
- All endpoint documentation
- Request/response examples
- Testing workflows
- Code examples (JavaScript, Python, cURL, HTTPie)
- Common use cases
- Troubleshooting
- Database queries

**Size**: ~1000 lines  
**Audience**: Developers, testers, integrators

### API_QUICK_REFERENCE.md
One-page cheat sheet with:
- Quick start commands
- Endpoint summary table
- Common parameters
- Test scenarios
- Useful scripts
- Troubleshooting tips

**Size**: ~250 lines  
**Audience**: Daily users, quick reference

### DATABASE_SETUP.md
PostgreSQL setup guide with:
- Installation instructions
- Database creation
- User setup
- Migrations
- Troubleshooting
- Backup/restore
- SQL queries

**Size**: ~300 lines  
**Audience**: DevOps, database administrators

### BULLMQ_GUIDE.md
BullMQ integration guide with:
- Architecture overview
- Queue configuration
- Worker setup
- Job lifecycle
- Monitoring
- Error handling

**Size**: ~400 lines  
**Audience**: Backend developers

### DATABASE_IMPLEMENTATION.md
Database persistence documentation with:
- Schema design
- Data flow
- Credit tracking
- Batch operations
- Analytics queries
- Future enhancements

**Size**: ~600 lines  
**Audience**: Backend developers, data analysts

---

## 🆘 Need Help?

1. **For API usage questions**: See [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)
2. **For quick commands**: See [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)
3. **For setup issues**: See [QUICKSTART.md](QUICKSTART.md) or [DATABASE_SETUP.md](DATABASE_SETUP.md)
4. **For technical details**: See [BULLMQ_GUIDE.md](BULLMQ_GUIDE.md) or [DATABASE_IMPLEMENTATION.md](DATABASE_IMPLEMENTATION.md)

---

Last updated: April 13, 2026
