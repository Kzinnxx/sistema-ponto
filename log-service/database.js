const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'admin',
  password: 'senha123',
  database: 'sistema_ponto',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL:', err.message)
})

const tentarConectar = async (tentativas = 5) => {
  for (let i = 1; i <= tentativas; i++) {
    try {
      await pool.query('SELECT 1')
      console.log('Conexão com PostgreSQL estabelecida!')
      return true
    } catch (erro) {
      console.error(`Tentativa ${i}/${tentativas} falhou: ${erro.message}`)
      if (i < tentativas) {
        await new Promise(res => setTimeout(res, 3000))
      }
    }
  }
  console.error('Não foi possível conectar ao PostgreSQL após várias tentativas.')
  return false
}

const criarTabelas = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        servico VARCHAR(50) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        mensagem TEXT NOT NULL,
        dados JSONB,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('Tabela de logs criada com sucesso!')
  } catch (erro) {
    console.error('Erro ao criar tabela:', erro.message)
  }
}

tentarConectar().then(ok => {
  if (ok) criarTabelas()
})

module.exports = pool