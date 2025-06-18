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
const cookieParser = require("cookie-parser");       // ← add this

require("./config/passport");

// Middlewares
const { verifyToken } = require("./middlewares/authMiddleware");
const enforceActiveSubscription = require("./middlewares/enforceActiveSubscription");
const ensureVerifiedTenant = require("./middlewares/ensureVerifiedTenant");
const { adminLimiter } = require("./middlewares/rateLimiterMiddleware");
const { errorHandler, notFoundHandler } = require("./middlewares/errorMiddleware");

const connectDB = require("./config/dbConfig");
const { connectRedis, redisClient } = require("./config/redisConfig");

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────── SESSION SETUP ────────────────
const isProd = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET || (
  isProd
    ? (() => { throw new Error("SESSION_SECRET is required in production"); })()
    : "dev_secret_change_me"
);

app.set("trust proxy", 1);
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ──────────────── COOKIE PARSING ────────────────
app.use(cookieParser());                             // ← add this

// ──────────────── CORS SETUP ────────────────
const CLIENT_URLS = [
  "https://www.kadagamnext.com",
  "https://kadagamnext.com",
  "http://localhost:5173",
  "https://main.d2tclwkypqhvb0.amplifyapp.com"
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || CLIENT_URLS.includes(origin)) return callback(null, true);
    return callback(new Error("CORS policy violation"), false);
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With","Accept","Origin"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ──────────────── CORE MIDDLEWARES ────────────────
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("combined"));

// ──────────────── HEALTH CHECK ────────────────
app.get("/health", (req, res) => res.json({ status: "UP" }));
app.get("/", (req, res) => res.json({ message: "🟢 Welcome to KadagamNext API. Use /api" }));

// ──────────────── DB + REDIS INIT ────────────────
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

// ──────────────── ROUTES ────────────────
const authRoutes             = require("./routes/authRoutes");
const verificationRoutes     = require("./routes/verificationRoutes");
const paymentRoutes          = require("./routes/paymentRoutes");
const planRoutes             = require("./routes/planRoutes");
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
const officeTimingRoutes     = require("./routes/officeAttendanceTiming");
const paymentStatusRoutes    = require("./routes/paymentStatusRoutes");

// Public
app.use("/api/auth",    authRoutes);
app.use("/api/verify",  verificationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/plan",    planRoutes);

// Authenticated + Verified Email
app.use("/api/admin",  verifyToken, ensureVerifiedTenant, adminLimiter, adminRoutes);
app.use("/api/staff",  verifyToken, ensureVerifiedTenant, adminLimiter, userRoutes);

// Subscription required
app.use("/api/projects",       verifyToken, ensureVerifiedTenant, enforceActiveSubscription, projectRoutes);
app.use("/api/tasks",          verifyToken, ensureVerifiedTenant, enforceActiveSubscription, taskRoutes);
app.use("/api/attendance",     verifyToken, ensureVerifiedTenant, enforceActiveSubscription, attendanceRoutes);
app.use("/api/leave",          verifyToken, ensureVerifiedTenant, enforceActiveSubscription, leaveRoutes);
app.use("/api/reports",        verifyToken, ensureVerifiedTenant, enforceActiveSubscription, reportRoutes);
app.use("/api/files",          verifyToken, ensureVerifiedTenant, enforceActiveSubscription, fileRoutes);
app.use("/api/notifications",  verifyToken, ensureVerifiedTenant, enforceActiveSubscription, notificationRoutes);
app.use("/api/dashboard",      verifyToken, ensureVerifiedTenant, enforceActiveSubscription, adminDashboardRoutes);
app.use("/api/staff-permissions", verifyToken, ensureVerifiedTenant, enforceActiveSubscription, staffPermissionsRoutes);
app.use("/api/performance",    verifyToken, ensureVerifiedTenant, enforceActiveSubscription, performanceRoutes);
app.use("/api/chat",           verifyToken, ensureVerifiedTenant, enforceActiveSubscription, chatRoutes);
app.use("/api/room-chat",      verifyToken, ensureVerifiedTenant, enforceActiveSubscription, roomChatRoutes);
app.use("/api/company",        verifyToken, ensureVerifiedTenant, enforceActiveSubscription, companyRoutes);
app.use("/api/delete-file",    verifyToken, ensureVerifiedTenant, enforceActiveSubscription, deleteFileRoute);
app.use("/api/office-timing",  verifyToken, ensureVerifiedTenant, enforceActiveSubscription, officeTimingRoutes);
app.use("/api/payment-status", verifyToken, ensureVerifiedTenant, paymentStatusRoutes);

// Super‑Admin
app.use("/api/super-admin", superAdminRoutes);

// Errors
app.use(notFoundHandler);
app.use(errorHandler);

// ──────────────── SOCKET.IO ────────────────
const server = http.createServer(app);
const { initializeWebSocket } = require("./config/websocketConfig");
const io = initializeWebSocket(server);
app.set("io", io);

// ──────────────── LAUNCH ────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket running at ws://localhost:${PORT}`);
});

// ──────────────── SHUTDOWN ────────────────
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

process.on("SIGINT", () => shutdownHandler("SIGINT"));
process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
