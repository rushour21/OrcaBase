import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import workspaceRoutes from "./modules/workspaces/workspace.routes.js";
import inviteRoutes from "./modules/invites/invite.routes.js";
import ragRoutes from "./modules/rag/rag.routes.js";
import conversationRoutes from "./modules/conversations/conversation.routes.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url'; // Required for ES Modules

const app = express();
app.use(cors());

app.use(express.json());

// 1. Manually define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/rag", ragRoutes); 
app.use("/api/conversations", conversationRoutes);

// This line makes everything in the 'public' folder accessible via URL
app.use(express.static(path.join(__dirname, '../public')));

export default app;
