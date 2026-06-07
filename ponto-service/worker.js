const amqp = require('amqplib')
const pool = require('./database')

const iniciarWorker = async () => {
  try {
    const conexao = await amqp.connect('amqp://admin:senha123@127.0.0.1:5672')
    const canal = await conexao.createChannel()

    await canal.assertQueue('fila_ponto', { durable: true })
    console.log('Worker aguardando registros na fila...')

    canal.consume('fila_ponto', async (mensagem) => {
      if (mensagem) {
        const dados = JSON.parse(mensagem.content.toString())
        console.log('Processando ponto:', dados)

        try {
          await pool.query(
            'INSERT INTO registros_ponto (funcionario_id, tipo, latitude, longitude) VALUES ($1, $2, $3, $4)',
            [dados.funcionario_id, dados.tipo, dados.latitude, dados.longitude]
          )
          console.log('Ponto salvo no banco!')
          canal.ack(mensagem)
        } catch (erro) {
          console.error('Erro ao salvar ponto:', erro.message)
          canal.nack(mensagem)
        }
      }
    })
  } catch (erro) {
    console.error('Erro no worker:', erro)
    setTimeout(iniciarWorker, 5000)
  }
}

iniciarWorker()