import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import express from "express";
import { analyzeHandler } from "./routes/analyze.js";
import { 
  submitJobHandler, 
  submitConnectedPagesJobHandler,
  getJobStatusHandler, 
  getJobResultHandler,
  listJobsHandler,
  streamJobProgressHandler 
} from "./routes/jobs.js";
import { externalAnalyzeHandler } from "./routes/external.js";
import { requireApiKey, requireApiKeyMulti, requireWhitelistedIp } from "./middleware/auth.js";
import { createCrawlWorker, closeWorker } from "./queue/worker.js";
import { closeQueue } from "./queue/config.js";
import { closePrisma } from "./services/database.js";
import { closeRedis } from "./utils/redis.js";
import type { Worker } from 'bullmq';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "Internal Linking Analysis API",
    version: "2.1.0",
    endpoints: {
      // External/public endpoint (no database persistence)
      externalAnalyze: "GET /api/external/analyze?url=<target-url>",
      // Legacy synchronous endpoint
      analyze: "/api/analyze?url=<target-url>",
      // Job-based async endpoints (with database persistence)
      submitJob: "POST /api/jobs/submit",
      submitConnectedPagesJob: "POST /api/jobs/connected-pages/submit",
      listJobs: "GET /api/jobs",
      jobStatus: "GET /api/jobs/:jobId/status",
      jobResult: "GET /api/jobs/:jobId/result",
      jobStream: "GET /api/jobs/:jobId/stream",
      health: "/health",
    },
  });
});

// Health check endpoint with Redis and Database connectivity checks
app.get("/health", async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      redis: false,
      database: false,
    };

    // Check Redis connectivity
    try {
      const { redis } = await import("./utils/redis.js");
      await redis.ping();
      health.redis = true;
    } catch (error) {
      console.error("Health check - Redis error:", error);
    }

    // Check Database connectivity
    try {
      const { prisma } = await import("./utils/prisma.js");
      await prisma.$queryRaw`SELECT 1`;
      health.database = true;
    } catch (error) {
      console.error("Health check - Database error:", error);
    }

    // Return 503 if any service is down
    if (!health.redis || !health.database) {
      return res.status(503).json({ ...health, status: "unhealthy" });
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// External/public analysis endpoint (no database persistence)
// Apply authentication middleware to require API key
app.get("/api/external/analyze", requireApiKey, externalAnalyzeHandler);

// Legacy synchronous analysis endpoint (for backward compatibility)
// Protected with authentication
app.get("/api/analyze", requireApiKey, analyzeHandler);

// Job-based async endpoints (with database persistence)
// All protected with authentication
app.post("/api/jobs/submit", requireApiKey, submitJobHandler);
app.get("/api/jobs/submit", requireApiKey, submitJobHandler); // Also support GET for convenience
app.post("/api/jobs/connected-pages/submit", requireApiKey, submitConnectedPagesJobHandler);
app.get("/api/jobs/connected-pages/submit", requireApiKey, submitConnectedPagesJobHandler);
app.get("/api/jobs", requireApiKey, listJobsHandler);
app.get("/api/jobs/:jobId/status", requireApiKey, getJobStatusHandler);
app.get("/api/jobs/:jobId/result", requireApiKey, getJobResultHandler);
app.get("/api/jobs/:jobId/stream", requireApiKey, streamJobProgressHandler);

// Start the worker
let worker: Worker | null = null;

async function startServer() {
  try {
    // Start the BullMQ worker
    const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '2');
    worker = createCrawlWorker(workerConcurrency);
    console.log(`🔧 Worker started with concurrency: ${workerConcurrency}`);

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📊 Submit job: POST http://localhost:${PORT}/api/jobs/submit`);
      console.log(`📋 List jobs: GET http://localhost:${PORT}/api/jobs`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      
      if (!process.env.SCRAPE_DO_TOKEN) {
        console.warn("⚠️  Warning: SCRAPE_DO_TOKEN not set in environment variables");
        console.warn("   The API will not work without this token configured");
      }

      if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
        console.warn("⚠️  Warning: Redis configuration not found in environment");
        console.warn("   Using default: localhost:6379");
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    // Close worker
    if (worker) {
      await closeWorker(worker);
    }
    
    // Close queue connections
    await closeQueue();
    
    // Close Redis connection
    await closeRedis();
    
    // Close Prisma database connection
    await closePrisma();
    
    console.log("✅ Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
startServer();
