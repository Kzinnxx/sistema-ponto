const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'admin',
  password: 'senha123',
  database: 'sistema_ponto',
})

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

criarTabelas()

module.exports = pool