import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env variables from the backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('📦 Inicializando pool de conexão com banco de dados...');
console.log(`   Host: ${process.env.DB_HOST}`);
console.log(`   Port: ${process.env.DB_PORT}`);
console.log(`   User: ${process.env.DB_USER}`);
console.log(`   Database: ${process.env.DB_NAME}`);

let poolConnection: any;
try {
  poolConnection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000
  });
  console.log('✅ Pool de conexão criado com sucesso');
  
  // Testar conexão imediatamente
  poolConnection.getConnection().then((conn: any) => {
    console.log('✅ Conexão com banco de dados testada com sucesso');
    conn.release();
  }).catch((err: any) => {
    console.warn('⚠️  Aviso: Conexão com banco de dados testada com erro:', err.message);
  });
} catch (error: any) {
  console.error('❌ Erro ao criar pool de conexão:', error.message);
  // Não lançar erro - deixar o servidor iniciar mesmo sem banco
  console.warn('⚠️  Servidor iniciará sem conexão com banco de dados');
}

export const db = drizzle(poolConnection, { schema, mode: 'default' });

export function getDatabase() {
  return db;
}
