import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRouter from './routes/generate.route';

// Load .env: repository root (matches Docker / cp .env.example .env) then
// backend/.env (local dev). Second file wins if both exist.
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
// CORS: allow requests from the frontend dev server (port 5173) and production
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:80',   // nginx in Docker
    'http://localhost',
  ],
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json());

// --- API routes ---
// All content generation endpoints live under /api
app.use('/api', generateRouter);

// --- Health check route ---
// A simple GET that returns 200 OK — useful for Docker health checks
// and for verifying the server is up before wiring real routes
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    anthropicKeyLoaded: !!process.env.ANTHROPIC_API_KEY,
  });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
  console.log(`[server] Anthropic key loaded: ${!!process.env.ANTHROPIC_API_KEY}`);
});
