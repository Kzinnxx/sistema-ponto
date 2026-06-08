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

criarTabelas()

module.exports = pool