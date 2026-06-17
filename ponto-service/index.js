const express = require('express')
const cors = require('cors')
const amqp = require('amqplib')
const jwt = require('jsonwebtoken')

require('./database')
require('./worker')

const app = express()
app.use(cors())
app.use(express.json())

let canalRabbit = null
let canalLogs = null

const conectarRabbit = async () => {
  try {
    const conexao = await amqp.connect('amqp://admin:senha123@127.0.0.1:5672')
    const canal = await conexao.createChannel()
    await canal.assertQueue('fila_ponto', { durable: true })
    canalRabbit = canal
    console.log('Conectado ao RabbitMQ!')
  } catch (erro) {
    console.error('Erro ao conectar RabbitMQ:', erro.message)
    setTimeout(conectarRabbit, 5000)
  }
}

const conectarLogs = async () => {
  try {
    const conexao = await amqp.connect('amqp://admin:senha123@127.0.0.1:5672')
    const canal = await conexao.createChannel()
    await canal.assertQueue('fila_logs', { durable: true })
    canalLogs = canal
    console.log('Ponto Service conectado à fila de logs!')
  } catch (erro) {
    console.error('Erro ao conectar fila de logs:', erro.message)
    setTimeout(conectarLogs, 5000)
  }
}

conectarRabbit()
conectarLogs()

const enviarLog = (tipo, mensagem, dados = {}) => {
  if (canalLogs) {
    canalLogs.sendToQueue(
      'fila_logs',
      Buffer.from(JSON.stringify({ servico: 'ponto-service', tipo, mensagem, dados })),
      { persistent: true }
    )
  }
}

const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]
  if (!token) return res.status(401).json({ erro: 'Token não fornecido' })
  try {
    const decoded = jwt.verify(token, 'segredo_super_secreto_123')
    req.funcionario = decoded
    next()
  } catch {
    res.status(401).json({ erro: 'Token inválido' })
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'Ponto Service rodando!', porta: 3002 })
})

app.post('/ponto/registrar', verificarToken, async (req, res) => {
  const { tipo } = req.body

  if (!['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo deve ser entrada ou saida' })
  }

  const registro = {
    funcionario_id: req.funcionario.id,
    tipo,
    latitude: null,
    longitude: null,
    horario: new Date()
  }

  try {
    if (canalRabbit) {
      canalRabbit.sendToQueue(
        'fila_ponto',
        Buffer.from(JSON.stringify(registro)),
        { persistent: true }
      )
      enviarLog('info',
        `Ponto registrado: ${tipo} para funcionario_id: ${req.funcionario.id}`,
        { ...registro, nome: req.funcionario.nome, email: req.funcionario.email }
      )
      res.json({ mensagem: 'Ponto registrado na fila com sucesso!', registro })
    } else {
      enviarLog('erro', 'Fila de ponto não disponível')
      res.status(503).json({ erro: 'Fila não disponível' })
    }
  } catch (erro) {
    enviarLog('erro', `Erro ao registrar ponto: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao registrar ponto' })
  }
})

app.get('/ponto/historico', verificarToken, async (req, res) => {
  try {
    const pool = require('./database')
    const resultado = await pool.query(
      'SELECT * FROM registros_ponto WHERE funcionario_id = $1 ORDER BY horario DESC LIMIT 20',
      [req.funcionario.id]
    )
    res.json({ registros: resultado.rows })
  } catch (erro) {
    enviarLog('erro', `Erro ao buscar historico: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao buscar histórico' })
  }
})

app.get('/dashboard/resumo', async (req, res) => {
  try {
    const pool = require('./database')

    // Total de registros de todos os tempos
    const totalRegistros = await pool.query(
      'SELECT COUNT(*) FROM registros_ponto'
    )

    // Entradas hoje
    const entradasHoje = await pool.query(`
      SELECT COUNT(*) FROM registros_ponto
      WHERE tipo = 'entrada'
      AND horario::date = (NOW() - INTERVAL '3 hours')::date
    `)

    // Saídas hoje
    const saidasHoje = await pool.query(`
      SELECT COUNT(*) FROM registros_ponto
      WHERE tipo = 'saida'
      AND horario::date = (NOW() - INTERVAL '3 hours')::date
    `)

    // Último registro de cada funcionário hoje
    const ultimosPorFuncionario = await pool.query(`
      SELECT DISTINCT ON (r.funcionario_id)
        r.funcionario_id,
        r.tipo,
        r.horario,
        f.nome,
        f.email
      FROM registros_ponto r
      JOIN funcionarios f ON f.id = r.funcionario_id
      WHERE r.horario::date = (NOW() - INTERVAL '3 hours')::date
      ORDER BY r.funcionario_id, r.horario DESC
    `)

    // Presentes = último registro foi entrada
    const presentesAgora = ultimosPorFuncionario.rows.filter(r => r.tipo === 'entrada')

    // Últimos 10 registros com nome e email
    const ultimosRegistros = await pool.query(`
      SELECT r.*, f.nome, f.email
      FROM registros_ponto r
      JOIN funcionarios f ON f.id = r.funcionario_id
      ORDER BY r.horario DESC
      LIMIT 10
    `)

    res.json({
      total_registros: parseInt(totalRegistros.rows[0].count),
      entradas_hoje: parseInt(entradasHoje.rows[0].count),
      saidas_hoje: parseInt(saidasHoje.rows[0].count),
      presentes_agora: presentesAgora,
      ultimos_registros: ultimosRegistros.rows
    })
  } catch (erro) {
    console.error('Erro no dashboard:', erro.message)
    res.status(500).json({ erro: erro.message })
  }
})

const PORT = 3002
app.listen(PORT, () => {
  console.log(`Ponto Service rodando na porta ${PORT}`)
})