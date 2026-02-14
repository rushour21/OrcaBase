import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";

export const requireAuth = async (req, res, next) => {
  console.log("🔐 [Auth Middleware] Starting...");

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ [Auth Middleware] No token provided");
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("🔐 [Auth Middleware] Token found:", token.substring(0, 20) + "...");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 [Auth Middleware] Token decoded, userId:", decoded.userId);

    // Fetch user to get email
    const userRes = await pool.query("SELECT id, email FROM users WHERE id = $1", [decoded.userId]);

    if (userRes.rows.length === 0) {
      console.log("❌ [Auth Middleware] User not found in database");
      return res.status(401).json({ error: "User not found" });
    }

    req.user = userRes.rows[0];
    console.log("✅ [Auth Middleware] Success! User:", req.user.email);
    next();
  } catch (err) {
    console.error("Auth error:", err);

    // Check if it's a database connection error
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: "Database connection failed - service unavailable",
        details: "Please check database configuration"
      });
    }

    return res.status(401).json({ error: "Invalid token" });
  }
};

