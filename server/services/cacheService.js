const { redisClient } = require("../config/redisConfig");

const CACHE_TTL = parseInt(process.env.CACHE_TTL || 600); // Default: 10 minutes

/**
 * 🧠 Namespace cache key with companyId if provided
 */
const buildKey = (companyId, key) => {
    return companyId ? `tenant:${companyId}:${key}` : key;
};

/**
 * ✅ Set cache with namespaced key
 */
const setCache = async (key, data, ttl = CACHE_TTL, companyId = null) => {
    try {
        const fullKey = buildKey(companyId, key);
        const value = JSON.stringify(data);
        await redisClient.setEx(fullKey, ttl, value);
    } catch (err) {
        console.error(`❌ Error setting Redis cache for key: ${key}`, err);
    }
};

/**
 * ✅ Get cache by namespaced key
 */
const getCache = async (key, companyId = null) => {
    try {
        const fullKey = buildKey(companyId, key);
        const cachedData = await redisClient.get(fullKey);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (err) {
        console.error(`❌ Error getting Redis cache for key: ${key}`, err);
        return null;
    }
};

/**
 * ✅ Delete cache by namespaced key
 */
const deleteCache = async (key, companyId = null) => {
    try {
        const fullKey = buildKey(companyId, key);
        await redisClient.del(fullKey);
    } catch (err) {
        console.error(`❌ Error deleting Redis cache for key: ${key}`, err);
    }
};

/**
 * ⚠️ Clear entire Redis cache (not tenant-safe in multi-tenant setups)
 */
const clearCache = async () => {
    console.warn("⚠️ clearCache() is not tenant-safe. Use key scanning by pattern if needed.");
    // Example (not advised for production without proper key prefixes):
    // const keys = await redisClient.keys("tenant:*");
    // for (const key of keys) await redisClient.del(key);
};

module.exports = {
    setCache,
    getCache,
    deleteCache,
    clearCache,
};
