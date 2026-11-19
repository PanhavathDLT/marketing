// Vercel Express entry.
// Vercel's Express preset picks the first entry file that imports express, checking
// app.js before src/app.ts. Its own compile of src/ does not run tsc-alias, so the
// @config/@shared/@lib/@modules aliases break. This file wraps the compiled build
// from `pnpm build` (dist/), where tsc-alias has already rewritten those aliases.
const express = require('express');

const app = express();
app.use(require('./dist/app').default);

module.exports = app;
