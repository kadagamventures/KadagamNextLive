require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const mongoose = require("mongoose");
const compression = require("compression");
const passport = require("passport");
const session = require("express-session");

require("./config/passport"); // Google OAuth strategy

const { adminLimiter } = require("./middlewares/rateLimiterMiddleware");
const connectDB = require("./config/dbConfig");
const { connectRedis, redisClient } = require("./config/redisConfig");
const { errorHandler, notFoundHandler } = require("./middlewares/errorMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;


// ─── TRUST PROXY (FOR ELB/ALB) ────────────────────────────────────────────────
app.set("trust proxy", 1);

// ─── ALLOWED ORIGINS ─────────────────────────────────────────────────────────
const CLIENT_URLS = [
  "https://www.kadagamnext.com",
  "https://kadagamnext.com",
  "http://localhost:5173",
  "https://main.d2tclwkypqhvb0.amplifyapp.com" // ✅ Added Amplify domain
];

// ─── DYNAMIC CORS SETUP ───────────────────────────────────────────────────────
const corsOptions = {
  origin: (incomingOrigin, callback) => {
    if (!incomingOrigin) return callback(null, true);
    if (CLIENT_URLS.includes(incomingOrigin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation"), false);
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control"
  ]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─── CORE MIDDLEWARE ─────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("combined"));

// ─── SESSION & PASSPORT ───────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── HEALTH CHECK & ROOT ─────────────────────────────────────────────────────
app.get("/health", (req, res) => res.status(200).json({ status: "UP" }));
app.get("/", (req, res) =>
  res.status(200).json({ message: "🟢 Welcome to KadagamNext API. Use /api" })
);

// ─── DB & REDIS INIT ─────────────────────────────────────────────────────────
(async () => {
  try {
    await connectDB();
    console.log("🟢 MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  }
  try {
    await connectRedis();
    console.log("🟢 Redis Connected");
  } catch (err) {
    console.error("❌ Redis Error:", err);
  }
})();

// ─── ROUTES ───────────────────────────────────────────────────────────────────
const authRoutes             = require("./routes/authRoutes");
const adminRoutes            = require("./routes/adminRoutes");
const userRoutes             = require("./routes/userRoutes");
const projectRoutes          = require("./routes/projectRoutes");
const taskRoutes             = require("./routes/taskRoutes");
const attendanceRoutes       = require("./routes/attendanceRoutes");
const leaveRoutes            = require("./routes/leaveRoutes");
const reportRoutes           = require("./routes/reportRoutes");
const fileRoutes             = require("./routes/fileRoutes");
const notificationRoutes     = require("./routes/notificationRoutes");
const adminDashboardRoutes   = require("./routes/adminDashboardRoutes");
const staffPermissionsRoutes = require("./routes/staffPermissionsRoutes");
const performanceRoutes      = require("./routes/performanceRoutes");
const chatRoutes             = require("./routes/chatRoutes");
const roomChatRoutes         = require("./routes/roomChatRoutes");
const companyRoutes          = require("./routes/companyRoutes");
const superAdminRoutes       = require("./routes/superAdminRoutes");
const deleteFileRoute        = require("./routes/deleteFile");
const verificationRoutes     = require("./routes/verificationRoutes");
const paymentRoutes          = require("./routes/paymentRoutes");
const planRoutes             = require("./routes/planRoutes");
const officeTimingRoutes     = require("./routes/officeAttendanceTiming");

app.use("/api/auth",         authRoutes);
app.use("/api/admin",        adminLimiter, adminRoutes);
app.use("/api/staff",        adminLimiter, userRoutes);
app.use("/api/projects",     projectRoutes);
app.use("/api/tasks",        taskRoutes);
app.use("/api/attendance",   attendanceRoutes);
app.use("/api/leave",        leaveRoutes);
app.use("/api/reports",      reportRoutes);
app.use("/api/files",        fileRoutes);
app.use("/api/notifications",notificationRoutes);
app.use("/api/dashboard",    adminDashboardRoutes);
app.use("/api/staff-permissions", staffPermissionsRoutes);
app.use("/api/performance",  performanceRoutes);
app.use("/api/chat",         chatRoutes);
app.use("/api/room-chat",    roomChatRoutes);
app.use("/api/company",      companyRoutes);
app.use("/api/verify",       verificationRoutes);
app.use("/api/payment",      paymentRoutes);
app.use("/api/plan",         planRoutes);
app.use("/api/super-admin",  superAdminRoutes);
app.use("/api/delete-file",  deleteFileRoute);
app.use("/api/office-timing",officeTimingRoutes);

// ─── ERROR HANDLING ──────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── WEBSOCKET SETUP ─────────────────────────────────────────────────────────
const server = http.createServer(app);
const { initializeWebSocket } = require("./config/websocketConfig");
const io = initializeWebSocket(server);
app.set("io", io);

// ─── START SERVER ────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket running at ws://localhost:${PORT}`);
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
const shutdownHandler = async (signal) => {
  console.log(`🔴 ${signal} received. Closing services...`);
  if (redisClient?.isOpen) {
    await redisClient.quit().catch(console.error);
    console.log("🟢 Redis closed.");
  }
  await mongoose.connection.close().catch(console.error);
  console.log("🟢 MongoDB closed.");
  server.close(() => {
    console.log("🟢 Server shutdown complete.");
    process.exit(0);
  });
};

process.on("SIGINT",  () => shutdownHandler("SIGINT"));
process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
