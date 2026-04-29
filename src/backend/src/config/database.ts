import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const pool = db; // alias para compatibilidade com rotas que importam `pool`

// PostgreSQL é obrigatório — falha no arranque = processo termina (fail-fast).
db.connect()
  .then(client => {
    console.log('✅ PostgreSQL conectado com sucesso');
    client.release();
  })
  .catch(err => {
    console.error('❌ Falha crítica ao conectar ao PostgreSQL — o servidor não pode arrancar:', err.message);
    process.exit(1);
  });
