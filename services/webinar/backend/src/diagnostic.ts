import { dbConfig, pool } from './db/index.js';

async function testDatabaseConnection() {
  console.log('🔍 Diagnóstico de conexão com o banco de dados');
  console.log(`   ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexão estabelecida');
    const [tables] = await pool.query('SHOW TABLES');
    console.log(`✅ Tabelas: ${(tables as unknown[]).length}`);
  } catch (error: any) {
    console.error('❌ Erro ao conectar:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
