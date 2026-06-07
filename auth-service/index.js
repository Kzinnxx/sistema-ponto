const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

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

app.get('/health', (req, res) => {
  res.json({ status: 'Auth Service rodando!', porta: 3001 })
})

// Cadastro
app.post('/auth/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body
  try {
    const senhaHash = await bcrypt.hash(senha, 10)
    const resultado = await pool.query(
      'INSERT INTO funcionarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, senhaHash]
    )
    res.status(201).json({
      mensagem: 'Funcionário cadastrado com sucesso!',
      funcionario: resultado.rows[0]
    })
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(400).json({ erro: 'Email já cadastrado!' })
    }
    res.status(500).json({ erro: 'Erro ao cadastrar funcionário' })
  }
})

// Login
app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body
  try {
    const resultado = await pool.query(
      'SELECT * FROM funcionarios WHERE email = $1',
      [email]
    )
    if (resultado.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' })
    }
    const funcionario = resultado.rows[0]
    const senhaValida = await bcrypt.compare(senha, funcionario.senha)
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' })
    }
    const token = jwt.sign(
      { id: funcionario.id, email: funcionario.email },
      'segredo_super_secreto_123',
      { expiresIn: '8h' }
    )
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
    res.status(500).json({ erro: 'Erro ao fazer login' })
  }
})

// WebAuthn — gerar opções de cadastro biométrico
app.post('/auth/webauthn/cadastro-opcoes', async (req, res) => {
  const { funcionario_id } = req.body
  try {
    const resultado = await pool.query(
      'SELECT * FROM funcionarios WHERE id = $1',
      [funcionario_id]
    )
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Funcionário não encontrado' })
    }
    const opcoes = await gerarOpcoesCadastro(resultado.rows[0])
    res.json(opcoes)
  } catch (erro) {
    res.status(500).json({ erro: erro.message })
  }
})

// WebAuthn — verificar cadastro biométrico
app.post('/auth/webauthn/cadastro-verificar', async (req, res) => {
  const { funcionario_id, resposta } = req.body
  try {
    const verificado = await verificarCadastro(funcionario_id, resposta)
    if (verificado) {
      res.json({ mensagem: 'Biometria cadastrada com sucesso!' })
    } else {
      res.status(400).json({ erro: 'Falha ao cadastrar biometria' })
    }
  } catch (erro) {
    res.status(500).json({ erro: erro.message })
  }
})

// WebAuthn — gerar opções de autenticação
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
    res.status(500).json({ erro: erro.message })
  }
})

// WebAuthn — verificar autenticação
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
      res.status(401).json({ erro: 'Falha na verificação biométrica' })
    }
  } catch (erro) {
    res.status(500).json({ erro: erro.message })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Auth Service rodando na porta ${PORT}`)
})