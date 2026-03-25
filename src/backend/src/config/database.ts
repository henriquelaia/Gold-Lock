import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexões PostgreSQL
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,               // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar ligação ao arrancar
db.connect()
  .then(client => {
    console.log('✅ PostgreSQL conectado com sucesso');
    client.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
  });
