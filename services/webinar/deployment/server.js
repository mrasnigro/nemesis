import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Force update timestamp: 2026-06-26T00:15:00Z - M100.48

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceRoot = path.resolve(__dirname, '..');

// Carregar variáveis de ambiente antes de qualquer coisa
dotenv.config({ path: path.resolve(serviceRoot, '.env.production') });

(async () => {
  try {
    console.log('🚀 Iniciando servidor a partir do deployment/server.js...');
    // Relative to this file: deployment/ -> backend/dist
    await import('../backend/dist/index.js');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
