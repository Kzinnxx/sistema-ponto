# PointSys Tecnologia — Sistema de Ponto Biométrico

Sistema distribuído de controle de ponto com autenticação biométrica via WebAuthn.

## Tecnologias

- **Frontend:** HTML, CSS, JavaScript, WebAuthn
- **Backend:** Node.js, Express
- **Banco de dados:** PostgreSQL
- **Mensageria:** RabbitMQ
- **Cache:** Redis
- **Infraestrutura:** Docker, Docker Compose

## Arquitetura

Frontend Web
↓
Auth Service (porta 3001)
Ponto Service (porta 3002)
Log Service (porta 3003)
↓
RabbitMQ → Worker → PostgreSQL

## Como rodar

### Requisitos
- Node.js
- Docker Desktop

### Passo 1 — Subir os serviços
```bash
docker compose up -d
```

### Passo 2 — Auth Service
```bash
cd auth-service
npm install
node index.js
```

### Passo 3 — Ponto Service
```bash
cd ponto-service
npm install
node index.js
```

### Passo 4 — Frontend
Abra o arquivo `frontend/index.html` com o Live Server no VS Code.

## Funcionalidades

- ✅ Cadastro de funcionários
- ✅ Login com JWT
- ✅ Autenticação biométrica via WebAuthn
- ✅ Registro de ponto via fila RabbitMQ
- ✅ Histórico de registros
- ✅ Processamento assíncrono com workers
- ✅ Tolerância a falhas com retry automático

## Equipe

Desenvolvido como projeto acadêmico.