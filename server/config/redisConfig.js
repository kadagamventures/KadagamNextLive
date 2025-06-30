const redis = require("redis");

let redisClient;
let redisReady = false;

/**
 * Generate or return the Redis client (singleton)
 */
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on("error", (err) => {
      redisReady = false;
      console.error("❌ [Redis] Error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("🟢 [Redis] Connected.");
    });

    redisClient.on("ready", () => {
      redisReady = true;
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
const connectRedis = () => {
  const client = getRedisClient();

  return new Promise((resolve, reject) => {
    if (redisReady) {
      console.log("🟡 [Redis] Already ready. Skipping connect.");
      return resolve();
    }

    client.once("ready", () => {
      redisReady = true;
      resolve();
    });

    client.once("error", (err) => {
      redisReady = false;
      console.error("❌ [Redis] Connection failed:", err.message);
      reject(err);
    });
  });
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
const closeRedis = () => {
  const client = getRedisClient();
  if (client.connected) {
    client.quit(() => {
      console.log("✅ [Redis] Connection closed gracefully.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Graceful process termination hooks
process.on("SIGINT", closeRedis);
process.on("SIGTERM", closeRedis);

// Auto-connect Redis on load
connectRedis().catch((err) => {
  console.error("❌ [Redis] Failed to connect on startup:", err.message);
});

module.exports = {
  redisClient: getRedisClient(),
  connectRedis,
  waitForRedis,
  isRedisReady,
};
