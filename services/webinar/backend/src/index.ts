import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';












import cors from 'cors';












import leadRoutes from './routes/leadRoutes.js';
import publicLeadRoutes from './routes/publicLeadRoutes.js';
import clientLeadsRoutes from './routes/clientLeadsRoutes.js';
import adminClientsRoutes from './routes/adminClientsRoutes.js';
import adminPaymentsRoutes from './routes/adminPaymentsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import webinarLeadsRoutes from './routes/webinarLeadsRoutes.js';
import clientWebinarRoutes from './routes/clientWebinarRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import webrtcRoutes from './routes/webrtcRoutes.js';
import * as authController from './controllers/authController.js';
import * as impHandoffController from './controllers/impHandoffController.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { pool } from './db/index.js';




console.log('🔧 Iniciando servidor...');
console.log('📋 Variáveis de ambiente:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT || 3001}`);
console.log(`   DB_HOST: ${process.env.DB_HOST}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}`);

const app = express();
const port = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
console.log(`📂 Frontend Path: ${frontendPath}`);
console.log("✅ Frontend path configured.");

// Middleware
const defaultCorsOrigins = [
  'https://s1m0ne.tec.br',
  'https://www.s1m0ne.tec.br',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]
// Extra origins (e.g. Netlify URL) via comma-separated CORS_ORIGINS env var,
// so they can be updated on Render without a code change/redeploy.
const envCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const corsOrigins = [...defaultCorsOrigins, ...envCorsOrigins]
console.log(`🌐 CORS origins permitidas: ${corsOrigins.join(', ')}`)
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser / same-origin tools (no Origin header)
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-IMP-Handoff-Key'],
  }),
)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware para receber chunks de vídeo (binários)
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
console.log("✅ Middleware configured.");

// Log todas as requisições
const SENSITIVE_BODY_KEY = /pass|token|secret|code|key/i;

app.use((req, _res, next) => {
  console.log(`📨 [${req.method}] ${req.path}`);
  if (process.env.NODE_ENV !== 'production' && req.body && Object.keys(req.body).length > 0) {
    const redacted = JSON.stringify(req.body, (key, value) =>
      key && SENSITIVE_BODY_KEY.test(key) ? '[redacted]' : value,
    );
    console.log(`   Body:`, redacted.substring(0, 200));
  }
  next();
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      version: 'M100.82',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error: any) {
    res.status(503).json({ 
      status: 'error', 
      version: 'M100.82',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auth Routes - DATABASE INTEGRATED
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authMiddleware, authController.getMe);
app.post('/api/auth/logout', authController.logout);
app.post('/api/auth/forgot-password', authController.forgotPassword);
app.post('/api/auth/reset-password', authController.resetPassword);
// IMP SSO handoff stub (Phase C)
app.post('/api/auth/imp-handoff/register', impHandoffController.registerImpHandoff);
app.post('/api/auth/imp-handoff/exchange', impHandoffController.exchangeImpHandoff);
console.log("✅ Auth routes mounted.");

// Rest of the routes...
app.use('/api/leads', leadRoutes);
app.use('/api/public/leads', publicLeadRoutes);
app.use('/api/client/leads', clientLeadsRoutes);
app.use('/api/admin/clients', adminClientsRoutes);
app.use('/api/admin/payments', adminPaymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webinar-leads', webinarLeadsRoutes);
app.use("/api/client/webinars", clientWebinarRoutes);
app.use("/api/client", clientRoutes);
app.use('/api/webrtc', webrtcRoutes);
console.log("✅ All API routes mounted.");

// Serve static files from frontend/dist
app.use(express.static(frontendPath));
console.log("✅ Static files served.");

// Handle SPA routing - redirect all non-API requests to index.html
console.log("✅ SPA routing configured.");
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});




// Error Handler
console.log("✅ Error handler configured.");
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Erro na aplicação:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
console.log("✅ Server started successfully.");



});















