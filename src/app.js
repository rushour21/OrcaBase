import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import workspaceRoutes from "./modules/workspaces/workspace.routes.js";
import inviteRoutes from "./modules/invites/invite.routes.js";
import ragRoutes from "./modules/rag/rag.routes.js";
import conversationRoutes from "./modules/conversations/conversation.routes.js";
import adminConversationRoutes from "./modules/admin-conversations/adminConversation.routes.js";
import dbRoutes from "./modules/database_integration/database.routes.js";
import dbChatRoutes from "./modules/database_chat/routes/databaseChat.routes.js";
import oauthRoutes from "./modules/auth/oauth/oauth.routes.js";
import cors from "cors";
import path from "path";
import passport from "../config/passport.js";
import { fileURLToPath } from 'url'; // Required for ES Modules

const app = express();
app.use(cors());

app.use(express.json());
app.use(passport.initialize());

// 1. Manually define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/api/auth", authRoutes);
app.use("/auth", oauthRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/admin/conversations", adminConversationRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/database-chat", dbChatRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok", 
    service: "OrcaBase API",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
  });
});



// This line makes everything in the 'public' folder accessible via URL
app.use(express.static(path.join(__dirname, '../public')));


export default app;
