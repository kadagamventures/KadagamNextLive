const { waitForRedis } = require('../config/redisConfig');

// ✅ Namespaced key generators
const TYPING_KEY = (companyId, taskId, userId) => `tenant:${companyId}:typing:${taskId}:${userId}`;
const ONLINE_KEY = (companyId, userId) => `tenant:${companyId}:online:${userId}`;
const READ_KEY = (companyId, taskId, userId) => `tenant:${companyId}:readStatus:${taskId}:${userId}`;

/**
 * 🟡 Set typing status for a user in a task (auto-expires in 5s)
 */
async function setTyping(companyId, taskId, userId) {
  const redis = await waitForRedis();
  await redis.setEx(TYPING_KEY(companyId, taskId, userId), 5, 'true');
}

/**
 * 🔍 Check if user is currently typing
 */
async function isTyping(companyId, taskId, userId) {
  const redis = await waitForRedis();
  return await redis.exists(TYPING_KEY(companyId, taskId, userId));
}

/**
 * 🟢 Mark user online (no expiration, can TTL later)
 */
async function setOnline(companyId, userId) {
  const redis = await waitForRedis();
  await redis.set(ONLINE_KEY(companyId, userId), 'true');
}

/**
 * 🔴 Remove user from online list (on disconnect)
 */
async function setOffline(companyId, userId) {
  const redis = await waitForRedis();
  await redis.del(ONLINE_KEY(companyId, userId));
}

/**
 * 🔍 Check if user is online
 */
async function isOnline(companyId, userId) {
  const redis = await waitForRedis();
  return await redis.exists(ONLINE_KEY(companyId, userId));
}

/**
 * 🕓 Mark a task as read by a user (stores timestamp)
 */
async function markRead(companyId, taskId, userId) {
  const redis = await waitForRedis();
  await redis.set(READ_KEY(companyId, taskId, userId), Date.now().toString());
}

/**
 * 📅 Get timestamp of last read for a user-task pair
 */
async function getLastReadTime(companyId, taskId, userId) {
  const redis = await waitForRedis();
  const timestamp = await redis.get(READ_KEY(companyId, taskId, userId));
  return timestamp ? parseInt(timestamp) : null;
}

module.exports = {
  setTyping,
  isTyping,
  setOnline,
  setOffline,
  isOnline,
  markRead,
  getLastReadTime,
};
