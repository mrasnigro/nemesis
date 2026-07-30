import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging
const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const serverLogFile = path.join(logsDir, 'backend.log');
const errorLogFile = path.join(logsDir, 'backend-error.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(serverLogFile, logMessage + '\n');
}

function logError(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${message}`;
  console.error(logMessage);
  fs.appendFileSync(errorLogFile, logMessage + '\n');
}

log('=== BACKEND STARTING ===');
log(`NODE_ENV: ${process.env.NODE_ENV}`);
log(`PORT: ${process.env.PORT || 3001}`);
log(`CWD: ${process.cwd()}`);
log(`__dirname: ${__dirname}`);

const app = express();
const port = process.env.PORT || 3001;

const frontendPath = path.resolve(__dirname, '../../frontend/dist');
log(`Frontend Path: ${frontendPath}`);
log(`Frontend exists: ${fs.existsSync(frontendPath)}`);

// Verificar se o frontend foi compilado
if (!fs.existsSync(frontendPath)) {
  logError('Frontend dist directory not found!');
  logError(`Expected path: ${frontendPath}`);
  const frontendDir = path.resolve(__dirname, '../../frontend');
  if (fs.existsSync(frontendDir)) {
    const files = fs.readdirSync(frontendDir);
    log(`Frontend directory contents: ${files.join(', ')}`);
  }
}

log('✅ Frontend path verified.');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

log('✅ Middleware configured.');

// Log todas as requisições
app.use((req, _res, next) => {
  log(`[${req.method}] ${req.path}`);
  next();
});

// Debug endpoint - Serve logs as HTML
app.get('/debug', (_req, res) => {
  try {
    let serverLog = 'No server logs yet';
    let errorLog = 'No errors yet';

    if (fs.existsSync(serverLogFile)) {
      serverLog = fs.readFileSync(serverLogFile, 'utf-8');
    }

    if (fs.existsSync(errorLogFile)) {
      errorLog = fs.readFileSync(errorLogFile, 'utf-8');
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM IMP - Debug Logs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', monospace;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #f59e0b;
      margin-bottom: 30px;
      border-bottom: 2px solid #f59e0b;
      padding-bottom: 10px;
    }
    h2 {
      color: #60a5fa;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 16px;
    }
    .log-section {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      overflow-x: auto;
    }
    .log-content {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 12px;
      line-height: 1.4;
    }
    .error {
      color: #ef4444;
    }
    .success {
      color: #10b981;
    }
    .info {
      color: #60a5fa;
    }
    .warning {
      color: #f59e0b;
    }
    .status {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .status-item {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .status-label {
      color: #94a3b8;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .status-value {
      font-size: 18px;
      font-weight: bold;
    }
    .refresh-btn {
      background: #f59e0b;
      color: #0f172a;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .refresh-btn:hover {
      background: #d97706;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 CRM IMP - Debug Logs</h1>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar Logs</button>
    
    <div class="status">
      <div class="status-item">
        <div class="status-label">Status</div>
        <div class="status-value success">✅ Rodando</div>
      </div>
      <div class="status-item">
        <div class="status-label">Porta</div>
        <div class="status-value info">${port}</div>
      </div>
      <div class="status-item">
        <div class="status-label">Node.js</div>
        <div class="status-value info">${process.version}</div>
      </div>
      <div class="status-item">
        <div class="status-label">Ambiente</div>
        <div class="status-value info">${process.env.NODE_ENV || 'development'}</div>
      </div>
    </div>

    <h2>📋 Server Logs</h2>
    <div class="log-section">
      <div class="log-content">${escapeHtml(serverLog)}</div>
    </div>

    <h2>⚠️ Error Logs</h2>
    <div class="log-section">
      <div class="log-content ${errorLog === 'No errors yet' ? 'success' : 'error'}">${escapeHtml(errorLog)}</div>
    </div>

    <h2>📂 System Info</h2>
    <div class="log-section">
      <div class="log-content">
Frontend Path: ${frontendPath}
Frontend Exists: ${fs.existsSync(frontendPath) ? '✅ Yes' : '❌ No'}
Logs Directory: ${logsDir}
Logs Exist: ${fs.existsSync(logsDir) ? '✅ Yes' : '❌ No'}
      </div>
    </div>
  </div>

  <script>
    // Auto-refresh a cada 5 segundos
    setInterval(() => {
      fetch('/debug').then(r => r.text()).then(html => {
        document.documentElement.innerHTML = html;
      }).catch(e => console.log('Refresh error:', e));
    }, 5000);
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (err: any) {
    logError(`Debug endpoint error: ${err.message}`);
    res.status(500).send(`<pre>Error: ${err.message}</pre>`);
  }
});

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir arquivos estáticos do frontend
app.use(express.static(frontendPath));

// SPA fallback - serve index.html para todas as rotas
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    logError(`index.html not found at ${indexPath}`);
    res.status(404).send('Frontend not built. Please run: npm run build');
  }
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  logError(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Iniciar servidor
app.listen(port, () => {
  log(`✅ CRM IMP server running on port ${port}`);
  log(`📂 Serving frontend from: ${frontendPath}`);
  log(`🌐 Access at: http://localhost:${port}`);
  log(`🔧 Debug logs at: http://localhost:${port}/debug`);
});

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
