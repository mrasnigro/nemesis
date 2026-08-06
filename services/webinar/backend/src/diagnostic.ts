import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

async function testDatabaseConnection() {
  console.log('🔍 Iniciando diagnóstico de conexão com banco de dados...');
  console.log('📋 Configurações:');
  console.log(`   DB_HOST: ${process.env.DB_HOST}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT}`);
  console.log(`   DB_USER: ${process.env.DB_USER}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME}`);
  
  try {
    console.log('\n⏳ Tentando conectar ao banco de dados...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'u926851054_lead',
      password: process.env.DB_PASSWORD || '##Lead123##',
      database: process.env.DB_NAME || 'u926851054_webinarpro',
      port: parseInt(process.env.DB_PORT || '3306'),
    });
    
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Testar uma query simples
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query de teste executada com sucesso:', rows);
    
    // Verificar tabelas
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('✅ Tabelas no banco:', tables);
    
    await connection.end();
    console.log('✅ Conexão fechada com sucesso');
    
  } catch (error: any) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
}

testDatabaseConnection();
