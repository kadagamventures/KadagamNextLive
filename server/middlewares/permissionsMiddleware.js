const checkPermissions = (requiredPermission = null) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized: Login required." });
            }

            const { role, permissions = [] } = req.user;

            if (role === "admin" || !requiredPermission || permissions.includes(requiredPermission)) {
                return next();
            }

            return res.status(403).json({ message: "Unauthorized: Insufficient permissions." });

        } catch (error) {
            return res.status(500).json({ message: "Internal Server Error" });
        }
    };
};

module.exports = checkPermissions;
