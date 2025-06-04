const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");

/**
 * ✅ Controller to fetch staff permissions (Multi-tenant safe)
 */
const getPermissions = (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        tenant: null,
        message: "Unauthorized: No valid user context.",
      });
    }

    const tenantId = user.companyId || null;

    if (!user.permissions || user.permissions.length === 0) {
      return res.status(403).json({
        success: false,
        tenant: tenantId,
        message: "Forbidden: No permissions assigned to this user.",
      });
    }

    return res.status(200).json({
      success: true,
      tenant: tenantId,
      permissions: user.permissions,
    });
  } catch (error) {
    console.error("❌ [Permission Fetch Error]:", error);
    return res.status(500).json({
      success: false,
      tenant: req.user?.companyId || null,
      message: "Internal Server Error while fetching permissions.",
    });
  }
};

// ✅ Protected route for authenticated users only
router.get("/permission", verifyToken, getPermissions);

module.exports = router;
