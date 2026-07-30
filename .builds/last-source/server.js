const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint
app.get('/debug', (_req, res) => {
  const logsDir = path.join(__dirname, 'logs');
  let serverLog = 'No logs yet';
  let errorLog = 'No errors yet';

  const backendLogPath = path.join(logsDir, 'backend.log');
  const errorLogPath = path.join(logsDir, 'error.log');

  if (fs.existsSync(backendLogPath)) {
    serverLog = fs.readFileSync(backendLogPath, 'utf-8');
  }

  if (fs.existsSync(errorLogPath)) {
    errorLog = fs.readFileSync(errorLogPath, 'utf-8');
  }

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM IMP - Debug Logs</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
      }
      h1, h2 {
        color: #f8fafc;
      }
      .log-section {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
        overflow-x: auto;
      }
      .log-content {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 12px;
        line-height: 1.4;
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
      .status-value {
        font-size: 18px;
        font-weight: bold;
        color: #10b981;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🔧 CRM IMP - Debug Logs</h1>

      <div class="status">
        <div class="status-item">
          <div>Status</div>
          <div class="status-value">✅ Rodando</div>
        </div>
        <div class="status-item">
          <div>Porta</div>
          <div class="status-value">${PORT || 'sem porta'}</div>
        </div>
        <div class="status-item">
          <div>Node.js</div>
          <div class="status-value">${process.version}</div>
        </div>
      </div>

      <h2>📋 Server Logs</h2>
      <div class="log-section">
        <div class="log-content">${escapeHtml(serverLog)}</div>
      </div>

      <h2>⚠️ Error Logs</h2>
      <div class="log-section">
        <div class="log-content">${escapeHtml(errorLog)}</div>
      </div>
    </div>

    <script>
      setInterval(() => location.reload(), 5000);
    </script>
  </body>
  </html>
  `;

  res.send(html);
});

// Frontend static files (somente se o build existir)
const frontendPath = path.join(__dirname, 'frontend', 'dist');

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  // SPA fallback
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not found');
    }
  });
} else {
  console.log('Frontend build not found, starting backend only');
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CRM IMP server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`🔧 Debug at: http://localhost:${PORT}/debug`);
});

function escapeHtml(text = '') {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}