// Vercel serverless entry (monorepo root level).
// pnpm build inside backend/ generates dist/ with all path aliases resolved.
const app = require('./backend/dist/app').default;
module.exports = app;
