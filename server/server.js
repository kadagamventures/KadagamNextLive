// server/server.js

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
const cookieParser = require("cookie-parser");
const { body } = require("express-validator");

require("./config/passport");

const { verifyToken } = require("./middlewares/authMiddleware");
const enforceActiveSubscription = require("./middlewares/enforceActiveSubscription");
const ensureVerifiedTenant = require("./middlewares/ensureVerifiedTenant");
const { adminLimiter } = require("./middlewares/rateLimiterMiddleware");
const { errorHandler, notFoundHandler } = require("./middlewares/errorMiddleware");
const {
  validateRequest,
  validateEmailFormat,
  validateEmailUnique,
} = require("./middlewares/validationMiddleware");

const connectDB = require("./config/dbConfig");
const { connectRedis, redisClient } = require("./config/redisConfig");

const authRoutes             = require("./routes/authRoutes");
const verificationRoutes     = require("./routes/verificationRoutes");
const paymentRoutes          = require("./routes/paymentRoutes");
const planRoutes             = require("./routes/planRoutes");
const invoiceRoutes          = require("./routes/invoiceRoutes");
const companyRoutes          = require("./routes/companyRoutes");
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
const superAdminRoutes       = require("./routes/superAdminRoutes");
const deleteFileRoute        = require("./routes/deleteFile");
const officeTimingRoutes     = require("./routes/officeAttendanceTiming");
const paymentStatusRoutes    = require("./routes/paymentStatusRoutes");

const { registerCompany } = require("./controllers/companyController");

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────── SESSION SETUP ────────────────
const isProd = process.env.NODE_ENV === "production";
const SESSION_SECRET = isProd
  ? process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET required"); })()
  : "dev_secret_change_me";

app.set("trust proxy", 1);
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60, // 1 hour
  },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

// ──────────────── CORS SETUP ────────────────
const CLIENT_URLS = [
  "https://www.kadagamnext.com",
  "https://kadagamnext.com",
  "http://localhost:5173",
  "https://main.d2tclwkypqhvb0.amplifyapp.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || CLIENT_URLS.includes(origin)) return callback(null, true);
    return callback(new Error("CORS policy violation"), false);
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With","Accept","Origin"],
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
app.get("/",       (req, res) => res.json({ message: "🟢 Welcome to KadagamNext API. Use /api" }));

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
// Public routes
app.use("/api/auth",    authRoutes);
app.use("/api/verify",  verificationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/plan",    planRoutes);
app.use("/api/invoices",invoiceRoutes);

// Public company registration (no JWT)
app.post(
  "/api/company/register",
  [
    validateEmailFormat,
    validateEmailUnique,
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Company name is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),
    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required.")
      .bail()
      .isMobilePhone()
      .withMessage("Phone number must be valid."),
  ],
  validateRequest,
  registerCompany
);

// Protected company routes (everything else)
app.use("/api/company", verifyToken, companyRoutes);

// Authenticated + verified tenant
app.use("/api/admin", verifyToken, ensureVerifiedTenant, adminLimiter, adminRoutes);
app.use("/api/staff", verifyToken, ensureVerifiedTenant, adminLimiter, userRoutes);

// Subscription-protected routes
const subscriptionMiddleware = [ verifyToken, ensureVerifiedTenant, enforceActiveSubscription ];
app.use("/api/projects",      ...subscriptionMiddleware, projectRoutes);
app.use("/api/tasks",         ...subscriptionMiddleware, taskRoutes);
app.use("/api/attendance",    ...subscriptionMiddleware, attendanceRoutes);
app.use("/api/leave",         ...subscriptionMiddleware, leaveRoutes);
app.use("/api/reports",       ...subscriptionMiddleware, reportRoutes);
app.use("/api/files",         ...subscriptionMiddleware, fileRoutes);
app.use("/api/notifications", ...subscriptionMiddleware, notificationRoutes);
app.use("/api/dashboard",     ...subscriptionMiddleware, adminDashboardRoutes);
app.use("/api/staff-permissions", ...subscriptionMiddleware, staffPermissionsRoutes);
app.use("/api/performance",   ...subscriptionMiddleware, performanceRoutes);
app.use("/api/chat",          ...subscriptionMiddleware, chatRoutes);
app.use("/api/room-chat",     ...subscriptionMiddleware, roomChatRoutes);
app.use("/api/delete-file",   ...subscriptionMiddleware, deleteFileRoute);
app.use("/api/office-timing", ...subscriptionMiddleware, officeTimingRoutes);
app.use("/api/payment-status",...subscriptionMiddleware, paymentStatusRoutes);

// Super-Admin (no tenant middleware)
app.use("/api/super-admin", superAdminRoutes);

// ──────────────── ERROR HANDLING ────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ──────────────── SOCKET.IO ────────────────
const server = http.createServer(app);
const { initializeWebSocket } = require("./config/websocketConfig");
const io = initializeWebSocket(server);
app.set("io", io);

// ──────────────── START SERVER ────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}`);
});

// ──────────────── GRACEFUL SHUTDOWN ────────────────
const shutdown = async (signal) => {
  console.log(`🔴 ${signal} received. Shutting down...`);
  if (redisClient?.isOpen) {
    await redisClient.quit().catch(console.error);
    console.log("🟢 Redis disconnected.");
  }
  await mongoose.connection.close().catch(console.error);
  console.log("🟢 MongoDB disconnected.");
  server.close(() => {
    console.log("🟢 HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
