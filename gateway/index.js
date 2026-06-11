const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const cors = require('cors')
const path = require('path')

const app = express()

app.use(cors())

app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true')
  next()
})

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: (path) => path.replace('/api/auth', '/auth')
}))

app.use('/api/webauthn', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: (path) => path.replace('/api/webauthn', '/auth/webauthn')
}))

app.use('/api/ponto', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: (path) => path.replace('/api/ponto', '/ponto')
}))

app.use('/api/dashboard', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: (path) => path.replace('/api/dashboard', '/dashboard')
}))

app.use('/api/logs', createProxyMiddleware({
  target: 'http://localhost:3003',
  changeOrigin: true,
  pathRewrite: (path) => path.replace('/api/logs', '/logs')
}))

app.use(express.static(path.join(__dirname, '../frontend')))

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'))
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Gateway rodando na porta ${PORT}`)
  console.log(`Acesse: http://localhost:${PORT}`)
})