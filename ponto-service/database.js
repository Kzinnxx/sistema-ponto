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
      CREATE TABLE IF NOT EXISTS registros_ponto (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER NOT NULL,
        tipo VARCHAR(10) NOT NULL,
        horario TIMESTAMP DEFAULT NOW(),
        latitude FLOAT,
        longitude FLOAT
      )
    `)
    console.log('Tabela de ponto criada com sucesso!')
  } catch (erro) {
    console.error('Erro ao criar tabela:', erro)
  }
}

criarTabelas()

module.exports = pool