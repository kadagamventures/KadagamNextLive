const activeUsers = new Map(); // socket.id -> { userId, companyId }

const projectWebSocket = (io) => {
    const projectNamespace = io.of("/projects");

    projectNamespace.on("connection", (socket) => {
        console.log(`✅ Project WebSocket Connected: ${socket.id}`);

        /**
         * 🔐 Register Project User with companyId
         * Required on connect to associate socket with tenant
         */
        socket.on("registerProjectUser", ({ userId, companyId }) => {
            if (!userId || !companyId) {
                console.warn("⚠️ Missing userId or companyId in registerProjectUser");
                return;
            }

            activeUsers.set(socket.id, { userId, companyId });
            socket.join(`tenant:${companyId}`);
            console.log(`👤 Registered user ${userId} to tenant:${companyId}`);
        });

        /**
         * 🏢 Join Project Room (Scoped by company)
         */
        socket.on("joinProject", ({ projectId, companyId }) => {
            if (!projectId || !companyId) {
                return socket.emit("error", { message: "Invalid projectId or companyId" });
            }

            socket.join(`project:${companyId}:${projectId}`);
            console.log(`📌 Joined room: project:${companyId}:${projectId}`);
        });

        /**
         * 🆕 Project Created (Broadcast to all tenant users)
         */
        socket.on("projectCreated", async ({ project, companyId }) => {
            try {
                if (!project || !project._id || !companyId) {
                    return socket.emit("error", { message: "Invalid project data or missing companyId" });
                }

                console.log("🆕 Project Created:", project);
                projectNamespace.to(`tenant:${companyId}`).emit("projectCreated", project);

                const { emitDashboardMetricsUpdate } = require("../services/websocketService");
                emitDashboardMetricsUpdate();
            } catch (err) {
                console.error("❌ Error in projectCreated:", err.stack);
                socket.emit("error", { message: "Failed to emit projectCreated", error: err.message });
            }
        });

        /**
         * 🔄 Project Updated (Scoped broadcast to assigned project room)
         */
        socket.on("projectUpdated", async ({ project, companyId }) => {
            try {
                if (!project || !project._id || !companyId) {
                    return socket.emit("error", { message: "Invalid project or companyId" });
                }

                console.log("🔄 Project Updated:", project);
                projectNamespace.to(`project:${companyId}:${project._id}`).emit("projectUpdated", project);

                const { emitDashboardMetricsUpdate } = require("../services/websocketService");
                emitDashboardMetricsUpdate();
            } catch (err) {
                console.error("❌ Error in projectUpdated:", err.stack);
                socket.emit("error", { message: "Failed to emit projectUpdated", error: err.message });
            }
        });

        /**
         * 🗑 Project Deleted (Broadcast to all tenant users)
         */
        socket.on("projectDeleted", async ({ projectId, companyId }) => {
            try {
                if (!projectId || !companyId) {
                    return socket.emit("error", { message: "Invalid projectId or companyId" });
                }

                console.log("🗑 Project Deleted:", projectId);
                projectNamespace.to(`tenant:${companyId}`).emit("projectDeleted", { projectId });

                const { emitDashboardMetricsUpdate } = require("../services/websocketService");
                emitDashboardMetricsUpdate();
            } catch (err) {
                console.error("❌ Error in projectDeleted:", err.stack);
                socket.emit("error", { message: "Failed to emit projectDeleted", error: err.message });
            }
        });

        /**
         * ❌ Disconnection Cleanup
         */
        socket.on("disconnect", () => {
            const user = activeUsers.get(socket.id);
            if (user) {
                console.log(`❌ Disconnected: ${user.userId} from tenant ${user.companyId}`);
                activeUsers.delete(socket.id);
            } else {
                console.log(`❌ Unknown socket disconnected: ${socket.id}`);
            }
        });

        /**
         * ⚠️ Error Handling
         */
        socket.on("error", (err) => {
            console.error(`❌ Project WebSocket Error: ${err.stack || err.message}`);
            socket.emit("error", { message: "WebSocket error", error: err.message });
        });
    });
};

module.exports = projectWebSocket;
