// Vercel serverless entry.
// Loads the pre-built Express app from dist/ where tsc-alias has already
// rewritten all @config/@shared/@modules/@lib path aliases to relative paths.
const app = require('../dist/app').default;
module.exports = app;
