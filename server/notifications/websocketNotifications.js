const WebSocket = require("ws");
const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");

const clients = new Map(); // Tracks connected users in WebSockets

/**
 * ✅ Initialize WebSocket Server
 */
const initWebSocket = (server) => {
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws, req) => {
        const userId = extractUserIdFromToken(req);

        if (!userId) {
            console.warn("⚠️ Unauthorized WebSocket connection attempt.");
            ws.close(4001, "Unauthorized"); // Proper close with reason
            return;
        }

        clients.set(userId, ws);
        console.log(`🔗 WebSocket connected for User ${userId}`);

        ws.on("message", async (message) => {
            try {
                const data = JSON.parse(message);

                // ✅ Mark notifications as read when the bell is opened
                if (data.type === "READ_NOTIFICATIONS") {
                    await Notification.updateMany(
                        { staffId: userId, isRead: false },
                        { $set: { isRead: true, expiresAt: new Date().setHours(23, 59, 59, 999) } }
                    );
                    console.log(`✅ Notifications marked as read for User ${userId}`);
                }
            } catch (error) {
                console.error(`❌ Error processing WebSocket message: ${error.message}`);
            }
        });

        ws.on("close", () => {
            clients.delete(userId);
            console.log(`❌ WebSocket disconnected for User ${userId}`);
        });

        ws.on("error", (err) => {
            console.error(`❌ WebSocket error for User ${userId}:`, err.message);
        });
    });

    console.log("🚀 WebSocket Notification Service Initialized");
};

/**
 * ✅ Extract User ID from WebSocket Token
 */
const extractUserIdFromToken = (req) => {
    try {
        if (!req?.headers?.authorization) return null;
        const token = req.headers.authorization.split(" ")[1];
        if (!token) return null;

        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET is missing in environment variables.");
            return null;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id;
    } catch (error) {
        console.error("⚠️ Invalid WebSocket token:", error.message);
        return null;
    }
};

/**
 * ✅ Send Notification to Staff for New Tasks
 */
const sendTaskNotification = async (staffId, message) => {
    try {
        const notification = new Notification({
            staffId,
            message,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Unread notifications expire in 7 days
        });

        await notification.save();

        // ✅ Send real-time notification if user is online
        if (clients.has(staffId)) {
            clients.get(staffId).send(JSON.stringify({ type: "TASK_NOTIFICATION", message }));
        }
    } catch (error) {
        console.error(`❌ Error sending task notification to User ${staffId}:`, error.message);
    }
};

/**
 * ✅ Emit Daily Task Update Notification for Admin (Stores & Sends)
 */
const emitDailyTaskUpdateToAdmin = async (message) => {
    try {
        const notification = new Notification({
            staffId: "admin",
            message,
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3-day expiry if unread
        });

        await notification.save();

        // ✅ Lazy-load `getIO()` to fix circular dependency
        const { getIO } = require("../config/websocketConfig");
        const io = getIO();
        if (io) io.to("admin").emit("notification", { message });

    } catch (error) {
        console.error(`❌ Error sending daily task update to admin:`, error.message);
    }
};

/**
 * ✅ Cleanup Expired Notifications (Handled via Cron Job)
 */
const cleanupExpiredNotifications = async () => {
    try {
        const now = new Date();
        const result = await Notification.deleteMany({ expiresAt: { $lt: now } });
        console.log(`🧹 Deleted ${result.deletedCount} expired notifications`);
    } catch (error) {
        console.error("❌ Error cleaning up old notifications:", error.message);
    }
};

module.exports = {
    initWebSocket,
    sendTaskNotification,
    emitDailyTaskUpdateToAdmin,
    cleanupExpiredNotifications,
};
