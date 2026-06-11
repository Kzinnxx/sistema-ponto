const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server')

const pool = require('./database')

const RP_NAME = 'PointSys Tecnologia'
const RP_ID = 'serpent-rink-effective.ngrok-free.dev'
const ORIGIN = 'https://serpent-rink-effective.ngrok-free.dev'

const gerarOpcoesCadastro = async (funcionario) => {
  const opcoes = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(String(funcionario.id)),
    userName: funcionario.email,
    userDisplayName: funcionario.nome,
    attestationType: 'none',
    authenticatorSelection: {
      userVerification: 'preferred',
    },
  })

  await pool.query(
    `INSERT INTO desafios_webauthn (funcionario_id, desafio)
     VALUES ($1, $2)`,
    [funcionario.id, opcoes.challenge]
  )

  return opcoes
}

const verificarCadastro = async (funcionario_id, resposta) => {
  const resultado = await pool.query(
    'SELECT desafio FROM desafios_webauthn WHERE funcionario_id = $1 ORDER BY criado_em DESC LIMIT 1',
    [funcionario_id]
  )

  if (resultado.rows.length === 0) {
    throw new Error('Desafio não encontrado')
  }

  const desafioEsperado = resultado.rows[0].desafio

  const verificacao = await verifyRegistrationResponse({
    response: resposta,
    expectedChallenge: desafioEsperado,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  })

  if (verificacao.verified) {
    const { credential } = verificacao.registrationInfo

    await pool.query(
      `INSERT INTO credenciais_biometricas (funcionario_id, credential_id, public_key, counter)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (credential_id) DO UPDATE SET counter = $4`,
      [
        funcionario_id,
        Buffer.from(credential.id).toString('base64url'),
        Buffer.from(credential.publicKey).toString('base64'),
        credential.counter,
      ]
    )

    await pool.query(
      'DELETE FROM desafios_webauthn WHERE funcionario_id = $1',
      [funcionario_id]
    )
  }

  return verificacao.verified
}

const gerarOpcoesAutenticacao = async (funcionario) => {
  const credenciais = await pool.query(
    'SELECT credential_id FROM credenciais_biometricas WHERE funcionario_id = $1',
    [funcionario.id]
  )

  console.log('Credenciais encontradas:', credenciais.rows)

  const opcoes = await generateAuthenticationOptions({
  rpID: RP_ID,
  userVerification: 'preferred',
  allowCredentials: [],
})

  await pool.query(
    `INSERT INTO desafios_webauthn (funcionario_id, desafio)
     VALUES ($1, $2)`,
    [funcionario.id, opcoes.challenge]
  )

  return opcoes
}

const verificarAutenticacao = async (funcionario_id, resposta) => {
  const resultado = await pool.query(
    'SELECT desafio FROM desafios_webauthn WHERE funcionario_id = $1 ORDER BY criado_em DESC LIMIT 1',
    [funcionario_id]
  )

  if (resultado.rows.length === 0) {
    throw new Error('Desafio não encontrado')
  }

  const desafioEsperado = resultado.rows[0].desafio

  const credencial = await pool.query(
    'SELECT * FROM credenciais_biometricas WHERE funcionario_id = $1 LIMIT 1',
    [funcionario_id]
  )

  if (credencial.rows.length === 0) {
    throw new Error('Credencial não encontrada')
  }

  const cred = credencial.rows[0]

  console.log('Credencial encontrada:', cred.credential_id)
  console.log('Resposta recebida id:', resposta.id)

  const verificacao = await verifyAuthenticationResponse({
    response: resposta,
    expectedChallenge: desafioEsperado,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: cred.credential_id,
      publicKey: Buffer.from(cred.public_key, 'base64'),
      counter: Number(cred.counter),
    },
  })

  if (verificacao.verified) {
    await pool.query(
      'UPDATE credenciais_biometricas SET counter = $1 WHERE funcionario_id = $2',
      [verificacao.authenticationInfo.newCounter, funcionario_id]
    )
    await pool.query(
      'DELETE FROM desafios_webauthn WHERE funcionario_id = $1',
      [funcionario_id]
    )
  }

  return verificacao.verified
}

module.exports = {
  gerarOpcoesCadastro,
  verificarCadastro,
  gerarOpcoesAutenticacao,
  verificarAutenticacao,
}