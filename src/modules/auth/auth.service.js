import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../../config/db.js";

export const signup = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password required");
  }

  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existing.rows.length) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, auth_provider)
     VALUES ($1, $2, 'email')
     RETURNING id, email, created_at`,
    [email, passwordHash]
  );
  
  const token = jwt.sign(
    { userId: result.rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  result.rows[0].accessToken = token;

  return result.rows[0];
};

export const login = async ({ email, password }) => {
  const result = await pool.query(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email]
  );

  if (!result.rows.length) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return { accessToken: token };
};
