// Vercel serverless entry — exports the Express app as a handler.
// app.listen() is never called here; Vercel handles the HTTP layer.
import app from '../src/app';

export default app;
