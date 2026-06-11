const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const amqp = require('amqplib')

const pool = require('./database')
const {
  gerarOpcoesCadastro,
  verificarCadastro,
  gerarOpcoesAutenticacao,
  verificarAutenticacao,
} = require('./webauthn')

const app = express()
app.use(cors())
app.use(express.json())

let canalLogs = null

const conectarLogs = async () => {
  try {
    const conexao = await amqp.connect('amqp://admin:senha123@127.0.0.1:5672')
    const canal = await conexao.createChannel()
    await canal.assertQueue('fila_logs', { durable: true })
    canalLogs = canal
    console.log('Auth Service conectado à fila de logs!')
  } catch (erro) {
    console.error('Erro ao conectar fila de logs:', erro.message)
    setTimeout(conectarLogs, 5000)
  }
}

conectarLogs()

const enviarLog = (tipo, mensagem, dados = {}) => {
  if (canalLogs) {
    canalLogs.sendToQueue(
      'fila_logs',
      Buffer.from(JSON.stringify({ servico: 'auth-service', tipo, mensagem, dados })),
      { persistent: true }
    )
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'Auth Service rodando!', porta: 3001 })
})

app.get('/auth/funcionarios', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nome, email FROM funcionarios ORDER BY id'
    )
    res.json({ funcionarios: resultado.rows })
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar funcionários' })
  }
})

app.post('/auth/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body
  try {
    const senhaHash = await bcrypt.hash(senha, 10)
    const resultado = await pool.query(
      'INSERT INTO funcionarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, senhaHash]
    )
    enviarLog('info', `Funcionário cadastrado: ${email}`, { id: resultado.rows[0].id })
    res.status(201).json({
      mensagem: 'Funcionário cadastrado com sucesso!',
      funcionario: resultado.rows[0]
    })
  } catch (erro) {
    if (erro.code === '23505') {
      enviarLog('aviso', `Tentativa de cadastro com email duplicado: ${email}`)
      return res.status(400).json({ erro: 'Email já cadastrado!' })
    }
    enviarLog('erro', `Erro ao cadastrar funcionário: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao cadastrar funcionário' })
  }
})

app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body
  try {
    const resultado = await pool.query(
      'SELECT * FROM funcionarios WHERE email = $1',
      [email]
    )
    if (resultado.rows.length === 0) {
      enviarLog('aviso', `Tentativa de login com email inexistente: ${email}`)
      return res.status(401).json({ erro: 'Email ou senha inválidos' })
    }
    const funcionario = resultado.rows[0]
    const senhaValida = await bcrypt.compare(senha, funcionario.senha)
    if (!senhaValida) {
      enviarLog('aviso', `Senha incorreta para: ${email}`)
      return res.status(401).json({ erro: 'Email ou senha inválidos' })
    }
    const token = jwt.sign(
      { id: funcionario.id, email: funcionario.email },
      'segredo_super_secreto_123',
      { expiresIn: '8h' }
    )
    enviarLog('info', `Login realizado: ${email}`, { id: funcionario.id, email })
    res.json({
      mensagem: 'Login realizado com sucesso!',
      token,
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
        email: funcionario.email
      }
    })
  } catch (erro) {
    enviarLog('erro', `Erro no login: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao fazer login' })
  }
})

app.post('/auth/webauthn/cadastro-opcoes', async (req, res) => {
  const { funcionario_id } = req.body
  console.log('cadastro-opcoes chamado para funcionario_id:', funcionario_id)
  try {
    const resultado = await pool.query(
      'SELECT * FROM funcionarios WHERE id = $1',
      [funcionario_id]
    )
    if (resultado.rows.length === 0) {
      console.log('Funcionario nao encontrado')
      return res.status(404).json({ erro: 'Funcionário não encontrado' })
    }
    console.log('Funcionario encontrado:', resultado.rows[0].email)
    const opcoes = await gerarOpcoesCadastro(resultado.rows[0])
    console.log('Opcoes geradas com sucesso')
    res.json(opcoes)
  } catch (erro) {
    console.error('Erro em cadastro-opcoes:', erro)
    enviarLog('erro', `Erro ao gerar opcoes WebAuthn: ${erro.message}`)
    res.status(500).json({ erro: erro.message })
  }
})

app.post('/auth/webauthn/cadastro-verificar', async (req, res) => {
  const { funcionario_id, resposta } = req.body
  try {
    const verificado = await verificarCadastro(funcionario_id, resposta)
    if (verificado) {
      enviarLog('info', `Biometria cadastrada para funcionario_id: ${funcionario_id}`)
      res.json({ mensagem: 'Biometria cadastrada com sucesso!' })
    } else {
      enviarLog('aviso', `Falha ao cadastrar biometria para funcionario_id: ${funcionario_id}`)
      res.status(400).json({ erro: 'Falha ao cadastrar biometria' })
    }
  } catch (erro) {
    console.error('Erro em cadastro-verificar:', erro)
    enviarLog('erro', `Erro ao verificar cadastro biometrico: ${erro.message}`)
    res.status(500).json({ erro: erro.message })
  }
})

app.post('/auth/webauthn/login-opcoes', async (req, res) => {
  const { funcionario_id } = req.body
  try {
    const resultado = await pool.query(
      'SELECT * FROM funcionarios WHERE id = $1',
      [funcionario_id]
    )
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Funcionário não encontrado' })
    }
    const opcoes = await gerarOpcoesAutenticacao(resultado.rows[0])
    res.json(opcoes)
  } catch (erro) {
    console.error('Erro em login-opcoes:', erro)
    enviarLog('erro', `Erro ao gerar opcoes de autenticacao: ${erro.message}`)
    res.status(500).json({ erro: erro.message })
  }
})

app.post('/auth/webauthn/login-verificar', async (req, res) => {
  const { funcionario_id, resposta } = req.body
  try {
    const verificado = await verificarAutenticacao(funcionario_id, resposta)
    if (verificado) {
      const resultado = await pool.query(
        'SELECT * FROM funcionarios WHERE id = $1',
        [funcionario_id]
      )
      const funcionario = resultado.rows[0]
      const token = jwt.sign(
        { id: funcionario.id, email: funcionario.email },
        'segredo_super_secreto_123',
        { expiresIn: '8h' }
      )
      enviarLog('info', `Login biometrico realizado para funcionario_id: ${funcionario_id}`)
      res.json({
        mensagem: 'Biometria verificada com sucesso!',
        token,
        funcionario: {
          id: funcionario.id,
          nome: funcionario.nome,
          email: funcionario.email
        }
      })
    } else {
      enviarLog('aviso', `Falha na verificacao biometrica para funcionario_id: ${funcionario_id}`)
      res.status(401).json({ erro: 'Falha na verificação biométrica' })
    }
  } catch (erro) {
    console.error('Erro em login-verificar:', erro)
    enviarLog('erro', `Erro ao verificar autenticacao biometrica: ${erro.message}`)
    res.status(500).json({ erro: erro.message })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Auth Service rodando na porta ${PORT}`)
})