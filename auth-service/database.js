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

const tentarConectar = async (tentativas = 1000) => {
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
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS credenciais_biometricas (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter BIGINT DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS desafios_webauthn (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        desafio TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('Tabelas criadas com sucesso!')
  } catch (erro) {
    console.error('Erro ao criar tabelas:', erro.message)
  }
}

tentarConectar().then(ok => {
  if (ok) criarTabelas()
})

module.exports = pool