import jwt from "jsonwebtoken";
import { pool } from "../../../../config/db.js";

export const oauthLogin = async ({ email, provider, oauthId }) => {
    let user = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
    );

    if (!user.rows.length) {
        user = await pool.query(
            `INSERT INTO users (email, auth_provider, oauth_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
            [email, provider, oauthId]
        );
    }

    const token = jwt.sign(
        { userId: user.rows[0].id, email }, 
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return token;
};
