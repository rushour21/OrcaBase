export const requireAdmin = (workspace) => {
  if (workspace.role !== "admin") {
    throw new Error("Admin access required");
  }
};
