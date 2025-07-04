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

// ─── CONFIGS ─────────────────────────────
const cookieOptions = require("./config/cookieOptions");
require("./config/passport");

const {
  verifyToken,
} = require("./middlewares/authMiddleware");
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
const { connectRedis } = require("./config/redisConfig");

// ─── ROUTES ──────────────────────────────
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
const invoiceTestRoutes      = require("./routes/invoicetest");

const { registerCompany } = require("./controllers/companyController");

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

// ─── SESSION CONFIG ─────────────────────
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
    maxAge: 1000 * 60 * 60,
  },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

// ─── CORS ───────────────────────────────
const CLIENT_URLS = [
  "https://www.kadagamnext.com",
  "https://kadagamnext.com",
  "http://localhost:5173",
  "https://main.d37un8iffky11m.amplifyapp.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || CLIENT_URLS.includes(origin)) return callback(null, true);
    return callback(new Error("CORS policy violation"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─── CORE MIDDLEWARES ───────────────────
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("combined"));

// ─── HEALTH CHECK & VERSION ─────────────
app.get("/health", (req, res) => res.json({ status: "UP" }));
app.get("/",       (req, res) => res.json({ message: "🟢 Welcome to KadagamNext API. Use /api" }));

app.get("/version", (req, res) => {
  res.json({
    version: process.env.APP_VERSION || "1.0.0",
    lastUpdated: process.env.BUILD_TIME || new Date().toISOString()
  });
});

// ─── SOCKET.IO ──────────────────────────
const server = http.createServer(app);
const { initializeWebSocket } = require("./config/websocketConfig");
const io = initializeWebSocket(server);
app.set("io", io);

// ─── DB + REDIS INIT + CRON JOBS ────────────────────
(async () => {
  try {
    await connectDB();
    console.log("🟢 MongoDB Connected");

    try {
      await connectRedis();
      console.log("🟢 Redis Connected");
    } catch (err) {
      console.error("❌ Redis Error:", err);
    }

    // ─── CRON JOBS (Only start after DB+Redis) ───────────
    require("./cronJobs/clearCompletedTaskChats.js");
    require("./cronJobs/clearOldTaskUpdates.js");
    require("./cronJobs/paymentReminderCron.js");
    require("./cronJobs/tenantDataPurgeCron.js");
    // Add more here as needed

  } catch (err) {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  }
})();

// ─── ROUTES ─────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/verify",        verificationRoutes);
app.use("/api/payment",       paymentRoutes);
app.use("/api/plan",          planRoutes);
app.use("/api/invoices",      invoiceRoutes);
app.use("/api/invoicetest",   invoiceTestRoutes);

// Public company registration
app.post(
  "/api/company/register",
  [
    validateEmailFormat,
    validateEmailUnique,
    body("name").trim().notEmpty().withMessage("Company name is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
    body("phone").trim().notEmpty().withMessage("Phone number is required.")
      .isMobilePhone().withMessage("Phone number must be valid."),
  ],
  validateRequest,
  registerCompany
);

// Tenant Protected Routes
app.use("/api/company",       companyRoutes);
app.use("/api/admin",         verifyToken, ensureVerifiedTenant, adminLimiter, adminRoutes);
app.use("/api/staff",         verifyToken, ensureVerifiedTenant, adminLimiter, userRoutes);

// Subscription-protected Routes
const subMware = [verifyToken, ensureVerifiedTenant, enforceActiveSubscription];
app.use("/api/projects",      ...subMware, projectRoutes);
app.use("/api/tasks",         ...subMware, taskRoutes);
app.use("/api/attendance",    ...subMware, attendanceRoutes);
app.use("/api/leave",         ...subMware, leaveRoutes);
app.use("/api/reports",       ...subMware, reportRoutes);
app.use("/api/files",         ...subMware, fileRoutes);
app.use("/api/notifications", ...subMware, notificationRoutes);
app.use("/api/dashboard",     ...subMware, adminDashboardRoutes);
app.use("/api/staff-permissions", ...subMware, staffPermissionsRoutes);
app.use("/api/performance",   ...subMware, performanceRoutes);
app.use("/api/chat",          ...subMware, chatRoutes);
app.use("/api/room-chat",     ...subMware, roomChatRoutes);
app.use("/api/delete-file",   ...subMware, deleteFileRoute);
app.use("/api/office-timing", ...subMware, officeTimingRoutes);
app.use("/api/payment-status",...subMware, paymentStatusRoutes);

// Super Admin Routes
app.use("/api/super-admin", superAdminRoutes);

// ─── ERROR HANDLING ─────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── START SERVER ───────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}`);
});

// ─── GRACEFUL SHUTDOWN ─────────────────
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down HTTP server...`);
  server.close(() => {
    console.log("✅ HTTP server closed.");
    mongoose.disconnect().then(() => {
      console.log("✅ MongoDB connection closed.");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
