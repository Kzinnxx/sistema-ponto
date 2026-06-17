const express = require('express')
const cors = require('cors')
const amqp = require('amqplib')
const pool = require('./database')

const app = express()
app.use(cors())
app.use(express.json())

let canalRabbit = null

const formatarDataBrasilia = (data) => {
  const d = new Date(data)
  d.setHours(d.getHours() - 3)
  return d.toLocaleString('pt-br')
}

const obterFuncionario = async (id) => {
  if (!id) return null
  try {
    const resultado = await pool.query(
      'SELECT id, nome, email FROM funcionarios WHERE id = $1',
      [id]
    )
    return resultado.rows[0] || null
  } catch (erro) {
    console.error('Erro ao buscar dados do funcionário para o log:', erro.message)
    return null
  }
}

// Garante que todo evento tenha nome/e-mail/id preenchidos antes de
// salvar e exibir o log, completando com dados do banco quando faltarem
const enriquecerDados = async (evento) => {
  const dados = evento.dados || {}
  const idFuncionario = dados.funcionario_id || dados.id
  const faltaDados = !dados.nome || !dados.email

  if (faltaDados && idFuncionario) {
    const funcionario = await obterFuncionario(idFuncionario)
    if (funcionario) {
      evento.dados = {
        ...dados,
        nome: dados.nome || funcionario.nome,
        email: dados.email || funcionario.email,
        id: dados.id || funcionario.id,
        funcionario_id: dados.funcionario_id || funcionario.id
      }
    }
  }
  return evento
}

const exibirEvento = (emoji, titulo, tipoAcao, dados, hora) => {
  const linha = '─'.repeat(55)
  console.log(`\n${linha}`)
  console.log(`${emoji}  ${titulo}\n`)
  console.log(`    Nome:    ${dados.nome || '—'}`)
  console.log(`    E-mail:  ${dados.email || '—'}`)
  console.log(`    ID:      ${dados.id || dados.funcionario_id || '—'}`)
  console.log(`    Tipo:    ${tipoAcao}`)
  console.log(`    Hora:    ${hora}`)
  console.log(linha)
}

const exibirLog = (log) => {
  const dados = log.dados || {}
  const hora = formatarDataBrasilia(log.criado_em || new Date())

  if (log.mensagem.includes('Funcionário cadastrado')) {
    exibirEvento('📋', 'NOVO CADASTRO', 'CADASTRO', dados, hora)

  } else if (log.mensagem.includes('Login realizado')) {
    exibirEvento('🔐', 'LOGIN REALIZADO', 'LOGIN', dados, hora)

  } else if (log.mensagem.includes('entrada')) {
    exibirEvento('✅', 'PONTO DE ENTRADA', 'ENTRADA', dados, hora)

  } else if (log.mensagem.includes('saida') || log.mensagem.includes('saída')) {
    exibirEvento('🚪', 'PONTO DE SAÍDA', 'SAÍDA', dados, hora)

  } else if (log.tipo === 'aviso') {
    console.log(`\n⚠️  AVISO: ${log.mensagem} | ${hora}`)

  } else if (log.tipo === 'erro') {
    console.log(`\n❌  ERRO: ${log.mensagem} | ${hora}`)

  } else {
    console.log(`\nℹ️  ${log.mensagem} | ${hora}`)
  }
}

const conectarRabbit = async () => {
  try {
    const conexao = await amqp.connect('amqp://admin:senha123@127.0.0.1:5672')
    const canal = await conexao.createChannel()
    await canal.assertQueue('fila_logs', { durable: true })
    canalRabbit = canal
    console.log('Log Service conectado ao RabbitMQ!')

    canal.consume('fila_logs', async (mensagem) => {
      if (mensagem) {
        let dados = JSON.parse(mensagem.content.toString())
        try {
          dados = await enriquecerDados(dados)

          await pool.query(
            'INSERT INTO logs (servico, tipo, mensagem, dados) VALUES ($1, $2, $3, $4)',
            [dados.servico, dados.tipo, dados.mensagem, JSON.stringify(dados.dados || {})]
          )
          exibirLog({ ...dados, criado_em: new Date() })
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