import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { workspaceContext } from "../../middlewares/workspace.middleware.js";
import {
    registerAgent,
    testAgentConnection,
    syncSchema,
    listTables,
    updateTableAccess,
    connectAgent
} from "./database.controller.js";

const router = Router();

router.post(
    "/agent/connect",
    requireAuth,
    workspaceContext,
    connectAgent
);

router.post(
    "/agent/register",
    requireAuth,
    workspaceContext,
    registerAgent
);

router.post(
    "/agent/test",
    requireAuth,
    workspaceContext,
    testAgentConnection
);

router.post(
    "/agent/sync-schema",
    requireAuth,
    workspaceContext,
    syncSchema
);

router.get(
    "/tables",
    requireAuth,
    workspaceContext,
    listTables
);

router.patch(
    "/tables/access",
    requireAuth,
    workspaceContext,
    updateTableAccess
);

export default router;
