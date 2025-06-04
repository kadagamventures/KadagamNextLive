const redis = require("redis");

let redisClient;
let redisReady = false;

/**
 * Generate or return the Redis client (singleton)
 */
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
        reconnectStrategy: (retries) =>
          retries > 5 ? false : Math.min(retries * 200, 5000),
      },
      ...(process.env.REDIS_PASSWORD
        ? { password: process.env.REDIS_PASSWORD }
        : {}),
    });

    redisClient.on("error", (err) => {
      redisReady = false;
      console.error("❌ [Redis] Error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("🟢 [Redis] Connected.");
    });

    redisClient.on("ready", async () => {
      redisReady = true;
      try {
        // Use sendCommand instead of .client() for Redis v4+
        await redisClient.sendCommand(["CLIENT", "SETNAME", "KadagamRedisClient"]);
      } catch (err) {
        console.warn("⚠️ [Redis] Could not set client name:", err.message);
      }
      console.log("✅ [Redis] Ready.");
    });

    redisClient.on("end", () => {
      redisReady = false;
      console.warn("🟠 [Redis] Connection closed.");
    });
  }

  return redisClient;
};

/**
 * Connect to Redis (used on startup)
 */
const connectRedis = async () => {
  const client = getRedisClient();

  if (client.isOpen || client.status === "connecting") {
    console.log("🟡 [Redis] Already connecting or connected. Skipping...");
    return;
  }

  try {
    console.log("⏳ [Redis] Connecting...");
    await client.connect();
  } catch (error) {
    redisReady = false;
    console.error("❌ [Redis] Connection failed:", error.message);
    setTimeout(connectRedis, 5000); // Retry after 5s
  }
};

/**
 * Wait until Redis is ready (timeout after N ms)
 */
const waitForRedis = async (timeout = 10000) => {
  const start = Date.now();

  while (!redisReady) {
    if (Date.now() - start > timeout) {
      throw new Error("❌ [Redis] Timeout waiting for readiness.");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return redisClient;
};

/**
 * Check if Redis is ready
 */
const isRedisReady = () => redisReady;

/**
 * Gracefully close Redis on shutdown
 */
const closeRedis = async () => {
  const client = getRedisClient();
  if (client.isOpen) {
    try {
      await client.quit();
      console.log("✅ [Redis] Connection closed gracefully.");
    } catch (error) {
      console.error("❌ [Redis] Error during shutdown:", error.message);
    }
  }
  process.exit(0);
};

// Graceful process termination hooks
process.on("SIGINT", closeRedis);
process.on("SIGTERM", closeRedis);

// Auto-connect Redis on load
connectRedis();

module.exports = {
  redisClient: getRedisClient(),
  connectRedis,
  waitForRedis,
  isRedisReady,
};
