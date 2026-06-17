<div align="center">

# ⏱️ PointSys Tecnologia

### Sistema Distribuído de Controle de Ponto

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)

> Projeto acadêmico de sistema distribuído com autenticação JWT, processamento assíncrono via filas, microsserviços independentes e interface web corporativa.

</div>

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Pré-requisitos](#-pré-requisitos)
- [Como Executar](#-como-executar)
- [Serviços e Portas](#-serviços-e-portas)
- [Rotas da API](#-rotas-da-api)
- [Banco de Dados](#-banco-de-dados)
- [Acesso Externo via ngrok](#-acesso-externo-via-ngrok)
- [Funcionalidades](#-funcionalidades)
- [Conceitos de Sistemas Distribuídos](#-conceitos-de-sistemas-distribuídos)

---

## 📌 Sobre o Projeto

O **PointSys Tecnologia** é um sistema de controle de ponto desenvolvido com arquitetura de microsserviços. O objetivo é permitir que funcionários registrem entradas e saídas pelo celular ou computador, com os dados sendo processados de forma assíncrona através de filas de mensagens.

O sistema foi desenvolvido em **6 fases**, cobrindo desde a infraestrutura até o painel administrativo em tempo real.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTE                            │
│          Navegador Web (Celular ou Computador)          │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   API GATEWAY :3000                     │
│         Ponto único de entrada — distribui rotas        │
└────┬──────────────────┬──────────────────┬──────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
┌─────────┐      ┌─────────────┐    ┌─────────────┐
│  AUTH   │      │    PONTO    │    │     LOG     │
│ SERVICE │      │   SERVICE   │    │   SERVICE   │
│  :3001  │      │    :3002    │    │    :3003    │
└────┬────┘      └──────┬──────┘    └──────┬──────┘
     │                  │                  │
     └──────────┬───────┘                  │
                ▼                          │
     ┌─────────────────────┐               │
     │      RabbitMQ       │◄──────────────┘
     │  fila_ponto         │
     │  fila_logs          │
     └──────────┬──────────┘
                ▼
     ┌─────────────────────┐
     │     PostgreSQL      │
     │    sistema_ponto    │
     └─────────────────────┘
```

### Fluxo de Registro de Ponto

```
Funcionário clica "Entrada"
        ↓
Frontend → Gateway → Ponto Service
        ↓
Ponto Service valida token JWT
        ↓
Envia para fila RabbitMQ (responde imediatamente)
        ↓
Worker consome a fila
        ↓
Salva no PostgreSQL
        ↓
Log enviado para fila_logs → Log Service → Banco
```

---

## 🛠️ Tecnologias

| Categoria       | Tecnologia            | Versão  | Finalidade                                  |
|-----------------|-----------------------|---------|---------------------------------------------|
| **Backend**     | Node.js + Express     | 20.x    | Microsserviços e APIs REST                  |
| **Banco**       | PostgreSQL            | 15      | Armazenamento relacional persistente        |
| **Mensageria**  | RabbitMQ              | 3       | Filas de mensagens para processamento async |
| **Cache**       | Redis                 | 7       | Cache em memória                            |
| **Segurança**   | JWT + bcryptjs        | —       | Autenticação e criptografia de senhas       |
| **Infra**       | Docker + Compose      | —       | Containerização de todos os serviços        |
| **Frontend**    | HTML / CSS / JS       | —       | Interface web sem frameworks                |
| **Gateway**     | http-proxy-middleware | 2.x     | Roteamento entre microsserviços             |
| **Acesso**      | ngrok                 | 3.x     | Exposição pública via HTTPS                 |
| **DB Visual**   | DBeaver               | —       | Visualização do banco de dados              |
| **Versionamento**| Git + GitHub         | —       | Controle de versão do código                |

---

## 📁 Estrutura de Pastas

```
sistema-ponto/
│
├── docker-compose.yml          # Infraestrutura: PostgreSQL, RabbitMQ, Redis
│
├── auth-service/               # Microsserviço de autenticação (porta 3001)
│   ├── index.js                # Servidor Express + rotas de login e cadastro
│   ├── database.js             # Pool de conexão PostgreSQL + criação de tabelas
│   └── package.json
│
├── ponto-service/              # Microsserviço de ponto (porta 3002)
│   ├── index.js                # Servidor Express + rotas de ponto e dashboard
│   ├── database.js             # Pool de conexão PostgreSQL + criação de tabelas
│   ├── worker.js               # Worker que consome a fila e salva no banco
│   └── package.json
│
├── log-service/                # Microsserviço de logs (porta 3003)
│   ├── index.js                # Servidor Express + consumidor da fila de logs
│   ├── database.js             # Pool de conexão PostgreSQL + criação de tabelas
│   └── package.json
│
├── gateway/                    # API Gateway (porta 3000)
│   ├── index.js                # Proxy reverso + servir frontend estático
│   └── package.json
│
└── frontend/                   # Interface web
    ├── index.html              # Portal principal (login, cadastro, ponto)
    ├── dashboard.html          # Painel administrativo
    ├── logs.html               # Página de registros do sistema
    ├── style.css               # Estilos globais
    └── dashboard.css           # Estilos exclusivos do dashboard
```

---

## ✅ Pré-requisitos

Antes de executar o projeto, instale:

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com)

---

## 🚀 Como Executar

### 1. Clone o repositório

```bash
git clone https://github.com/Kzinnxx/sistema-ponto.git
cd sistema-ponto
```

### 2. Instale as dependências de cada serviço

```bash
cd auth-service   && npm install && cd ..
cd ponto-service  && npm install && cd ..
cd log-service    && npm install && cd ..
cd gateway        && npm install && cd ..
```

### 3. Suba a infraestrutura com Docker

```bash
docker compose up -d
```

Verifique se os containers estão rodando:

```bash
docker compose ps
```

Resultado esperado:
```
NAME              STATUS
ponto_postgres    running
ponto_rabbitmq    running
ponto_redis       running
```

### 4. Inicie os microsserviços (cada um em um terminal)

**Terminal 1 — Auth Service**
```bash
cd auth-service
node index.js
```

**Terminal 2 — Ponto Service**
```bash
cd ponto-service
node index.js
```

**Terminal 3 — Log Service**
```bash
cd log-service
node index.js
```

**Terminal 4 — Gateway**
```bash
cd gateway
node index.js
```

### 5. Acesse o sistema

| Página           | Endereço                            |
|------------------|-------------------------------------|
| Portal principal | http://localhost:3000               |
| Dashboard        | http://localhost:3000/dashboard.html|
| Logs             | http://localhost:3000/logs.html     |
| Painel RabbitMQ  | http://localhost:15672              |

> Credenciais RabbitMQ: `admin` / `senha123`

---

## 🔌 Serviços e Portas

| Serviço        | Porta | Descrição                              |
|----------------|-------|----------------------------------------|
| Gateway        | 3000  | Porta única de entrada do sistema      |
| Auth Service   | 3001  | Cadastro, login e validação JWT        |
| Ponto Service  | 3002  | Registro de ponto, histórico, dashboard|
| Log Service    | 3003  | Registro e consulta de eventos         |
| PostgreSQL     | 5433  | Banco de dados relacional              |
| RabbitMQ       | 5672  | Broker de mensagens (conexão app)      |
| RabbitMQ UI    | 15672 | Painel web de gerenciamento            |
| Redis          | 6379  | Cache em memória                       |

---

## 🔗 Rotas da API

Todas as rotas são acessadas pelo Gateway na porta **3000** com o prefixo `/api`.

### Auth Service

| Método | Rota                   | Autenticação | Descrição                    |
|--------|------------------------|--------------|------------------------------|
| GET    | /api/auth/health       | ❌           | Verifica se o serviço está no ar |
| POST   | /api/auth/cadastro     | ❌           | Cadastra um novo funcionário |
| POST   | /api/auth/login        | ❌           | Realiza login e retorna token JWT |
| GET    | /api/auth/funcionarios | ❌           | Lista todos os funcionários  |

**Exemplo — Cadastro:**
```json
POST /api/auth/cadastro
{
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "senha": "123456"
}
```

**Exemplo — Login:**
```json
POST /api/auth/login
{
  "email": "joao@empresa.com",
  "senha": "123456"
}
```

**Resposta do Login:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "funcionario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@empresa.com"
  }
}
```

### Ponto Service

| Método | Rota                      | Autenticação | Descrição                          |
|--------|---------------------------|--------------|-------------------------------------|
| GET    | /api/ponto/health         | ❌           | Verifica se o serviço está no ar   |
| POST   | /api/ponto/registrar      | ✅ JWT       | Registra entrada ou saída           |
| GET    | /api/ponto/historico      | ✅ JWT       | Retorna últimos 20 registros        |
| GET    | /api/dashboard/resumo     | ❌           | Retorna dados para o dashboard      |

**Exemplo — Registrar Ponto:**
```json
POST /api/ponto/registrar
Authorization: Bearer <token>
{
  "tipo": "entrada"
}
```

### Log Service

| Método | Rota              | Descrição                           |
|--------|-------------------|--------------------------------------|
| GET    | /api/logs         | Retorna os 50 logs mais recentes     |
| GET    | /api/logs/:servico| Filtra logs por serviço              |

---

## 🗄️ Banco de Dados

### Tabelas

| Tabela            | Descrição                                        |
|-------------------|--------------------------------------------------|
| `funcionarios`    | Cadastro de funcionários com senha criptografada |
| `registros_ponto` | Entradas e saídas com horário e funcionário      |
| `logs`            | Histórico de todos os eventos do sistema         |

### Diagrama

```
funcionarios
├── id (PK)
├── nome
├── email (UNIQUE)
├── senha (bcrypt hash)
└── criado_em

registros_ponto
├── id (PK)
├── funcionario_id (FK → funcionarios.id)
├── tipo ('entrada' | 'saida')
├── horario
├── latitude
└── longitude

logs
├── id (PK)
├── servico
├── tipo ('info' | 'aviso' | 'erro')
├── mensagem
├── dados (JSONB)
└── criado_em
```

### Visualizar o banco

Instale o [DBeaver](https://dbeaver.io) e conecte com:

```
Host:     localhost
Porta:    5433
Banco:    sistema_ponto
Usuário:  admin
Senha:    senha123
```

### Limpar todos os dados

```bash
docker exec -it ponto_postgres psql -U admin -d sistema_ponto
```

```sql
DELETE FROM registros_ponto;
DELETE FROM logs;
DELETE FROM funcionarios;
\q
```

---

## 🌐 Acesso Externo via ngrok

Para acessar o sistema de qualquer celular via internet:

```bash
# Na raiz do projeto
./ngrok.exe http 3000
```

A URL pública gerada aparece no terminal:
```
Forwarding  https://xxxx.ngrok-free.dev -> http://localhost:3000
```

> ⚠️ **Importante:** A URL do ngrok muda a cada reinicialização. Ao obter uma nova URL, atualize nos arquivos `frontend/index.html`, `frontend/dashboard.html` e `frontend/logs.html` usando **Ctrl+H** (buscar e substituir).

---

## ✨ Funcionalidades

### Para o Funcionário
- Cadastro com nome, e-mail e senha
- Login com autenticação JWT (token válido por 8 horas)
- Registro de ponto de entrada e saída pelo celular
- Histórico dos últimos 20 registros com horário no fuso de Brasília

### Para o Administrador
- Dashboard com atualização automática a cada 15 segundos
- Total de registros de todos os tempos
- Quantidade de funcionários presentes no momento
- Entradas e saídas do dia
- Lista de quem está presente (último registro foi entrada)
- Últimos 10 registros com nome, e-mail e horário
- Página de logs com histórico completo de eventos

---

## 🔬 Conceitos de Sistemas Distribuídos

| Conceito                  | Implementação no projeto                                            |
|---------------------------|----------------------------------------------------------------------|
| **Microsserviços**        | Auth, Ponto e Log Service são processos independentes               |
| **Mensageria**            | RabbitMQ com filas `fila_ponto` e `fila_logs`                       |
| **Processamento assíncrono** | Worker consome a fila sem bloquear o usuário                     |
| **Tolerância a falhas**   | Retry automático (1000 tentativas no banco, infinito no RabbitMQ)      |
| **Fila persistente**      | Mensagens sobrevivem a reinicializações do broker                   |
| **API Gateway**           | Ponto único de entrada que distribui requisições entre serviços      |
| **Containerização**       | Docker Compose sobe toda a infraestrutura com um único comando       |
| **Pool de conexões**      | Até 10 conexões simultâneas com o banco por serviço                 |
| **Auditoria**             | Log Service registra 100% dos eventos com rastreabilidade completa   |
| **Escalabilidade**        | Cada microsserviço pode ser escalado independentemente              |

---

<div align="center">

### Equipe

César Felipe Martins Ferreira | RA: 12824223246

Guilherme Medeiros Fonseca Dantas | RA: 12825141790

Kawan Lima da Silva | RA: 12825142906

Nathálya Árillys Oliveira Queiroz | RA: 12825138555

Pedro Henrique de Paiva Araújo | RA: 12825137112



Desenvolvido como projeto acadêmico — Junho de 2026

**PointSys Tecnologia** · Sistema Distribuído de Controle de Ponto

</div>
