import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user to get email
    const userRes = await pool.query("SELECT id, email FROM users WHERE id = $1", [decoded.userId]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = userRes.rows[0];
    console.log(req.user);
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

