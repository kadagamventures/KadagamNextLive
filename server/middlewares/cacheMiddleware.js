const { redisClient } = require("../config/redisConfig");

const DEFAULT_CACHE_TTL = parseInt(process.env.CACHE_TTL, 10) || 3600;
const ROUTE_CACHE_TTL = {
    "/api/reports": 86400,
    "/api/tasks": 1800,
};

const cacheMiddleware = async (req, res, next) => {
    if (req.method !== "GET" || req.query.noCache === "true") {
        return next();
    }

    const companyPrefix = req.user?.companyId ? `company_${req.user.companyId}` : "public";
    const cacheKey = `cache:${companyPrefix}:${req.originalUrl}`;
    const cacheTTL = ROUTE_CACHE_TTL[req.originalUrl] || DEFAULT_CACHE_TTL;

    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            if (process.env.NODE_ENV !== "production") {
                console.log(`[Cache Hit] ${cacheKey}`);
            }
            return res.json(JSON.parse(cachedData));
        }

        if (process.env.NODE_ENV !== "production") {
            console.log(`[Cache Miss] ${cacheKey}`);
        }

        const originalJson = res.json.bind(res);
        res.json = (data) => {
            if (res.statusCode === 200) {
                redisClient.setEx(cacheKey, cacheTTL, JSON.stringify(data)).catch((err) => {
                    console.error("[Cache Error]: Failed to set cache:", err);
                });
            }
            originalJson(data);
        };

        next();
    } catch (error) {
        console.error("[Redis Middleware Error]:", error);
        next();
    }
};

module.exports = { cacheMiddleware };
