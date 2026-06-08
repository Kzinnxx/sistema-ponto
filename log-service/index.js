const express = require('express')
const cors = require('cors')
const amqp = require('amqplib')
const pool = require('./database')

const app = express()
app.use(cors())
app.use(express.json())

let canalRabbit = null

const conectarRabbit = async () => {
  try {
    const conexao = await amqp.connect('amqp://admin:senha123@127.0.0.1:5672')
    const canal = await conexao.createChannel()

    await canal.assertQueue('fila_logs', { durable: true })
    canalRabbit = canal

    console.log('Log Service conectado ao RabbitMQ!')

    canal.consume('fila_logs', async (mensagem) => {
      if (mensagem) {
        const dados = JSON.parse(mensagem.content.toString())
        try {
          await pool.query(
            'INSERT INTO logs (servico, tipo, mensagem, dados) VALUES ($1, $2, $3, $4)',
            [dados.servico, dados.tipo, dados.mensagem, JSON.stringify(dados.dados || {})]
          )
          console.log(`[LOG] ${dados.servico} - ${dados.tipo}: ${dados.mensagem}`)
          canal.ack(mensagem)
        } catch (erro) {
          console.error('Erro ao salvar log:', erro.message)
          canal.nack(mensagem)
        }
      }
    })
  } catch (erro) {
    console.error('Erro ao conectar RabbitMQ:', erro.message)
    setTimeout(conectarRabbit, 5000)
  }
}

conectarRabbit()

app.get('/health', (req, res) => {
  res.json({ status: 'Log Service rodando!', porta: 3003 })
})

app.get('/logs', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM logs ORDER BY criado_em DESC LIMIT 50'
    )
    res.json({ logs: resultado.rows })
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar logs' })
  }
})

app.get('/logs/:servico', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM logs WHERE servico = $1 ORDER BY criado_em DESC LIMIT 50',
      [req.params.servico]
    )
    res.json({ logs: resultado.rows })
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar logs' })
  }
})

const PORT = 3003
app.listen(PORT, () => {
  console.log(`Log Service rodando na porta ${PORT}`)
})