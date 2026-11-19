// Vercel Express entry. Vercel looks for app.js at the project root before src/app.ts,
// so this loads the compiled build where tsc-alias has already resolved @config/@shared/@lib/@modules.
module.exports = require('./dist/app').default;
