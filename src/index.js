import dotenv from "dotenv";
dotenv.config();

import { pool } from "../config/db.js";
import app from "./app.js";

async function startServer() {
  try {
    // Test DB connection first
    const res = await pool.query("select now()");
    console.log("✅ DB connected:", res.rows[0]);

    // Start server only after DB is ready
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed. Server not started.");
    console.error(err);
    process.exit(1);
  }
}

startServer();


