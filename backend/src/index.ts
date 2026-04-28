import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRouter from './routes/generate.route';

// repo root first, backend/.env wins if both exist (local dev override)
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:80', 'http://localhost'],
  credentials: true,
}));
app.use(express.json());
app.use('/api', generateRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    anthropicKeyLoaded: !!process.env.ANTHROPIC_API_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
  console.log(`[server] Anthropic key loaded: ${!!process.env.ANTHROPIC_API_KEY}`);
});
