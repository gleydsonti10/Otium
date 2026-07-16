# 🛠️ Guia de Configuração do Projeto Otium

> Este guia explica como configurar o projeto em qualquer máquina do zero.  
> O banco de dados é **remoto (nuvem)** — não precisa instalar MySQL.

---

## ✅ Pré-requisitos

Instale os softwares abaixo antes de começar:

| Software | Download | Versão mínima |
|---|---|---|
| **Node.js** | https://nodejs.org | LTS 20.x |
| **Git** | https://git-scm.com/download/win | Qualquer |
| **VS Code** *(recomendado)* | https://code.visualstudio.com | Qualquer |

Após instalar, verifique no terminal:

```bash
node -v   # v20.x.x ou superior
npm -v    # 10.x.x ou superior
git --version
```

---

## 📥 Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/gleydsonti10/Otium.git
cd Otium
```

---

### 2. Configurar o Backend

```bash
cd backend
npm install
npx prisma generate
```

Crie o arquivo **`backend/.env`** com o seguinte conteúdo:

```env
DATABASE_URL="mysql://cfacildb:f_i%40%5B%409u3Dbn3W@cfacildb.mysql.dbaas.com.br:3306/cfacildb"
JWT_SECRET="e9882255728a38a3a0e5b7b049d5cd621f37ccbdf27dbd2e105e4905cfbf037d"
```

> ⚠️ **Atenção:** o arquivo `.env` não é versionado (está no `.gitignore`).  
> Você precisa criá-lo manualmente sempre que clonar o projeto em uma nova máquina.

---

### 3. Configurar o Frontend

```bash
cd ../frontend
npm install
```

O frontend não precisa de `.env` — ele conecta automaticamente ao backend local na porta `3000`.

---

## ▶️ Rodando o Projeto

Abra **dois terminais separados** e execute:

**Terminal 1 — Backend (API):**

```bash
cd Otium/backend
npm run dev
```

✅ Saída esperada:
```
Otium API listening on http://localhost:3000
```

**Terminal 2 — Frontend:**

```bash
cd Otium/frontend
npm run dev
```

✅ Saída esperada:
```
▲ Next.js — Local: http://localhost:3001
```

---

## 🌐 URLs de Acesso

| Serviço | URL |
|---|---|
| **Portal do Cliente** | http://localhost:3001/login |
| **API Backend** | http://localhost:3000 |
| **Health Check** | http://localhost:3000/api/health |

---

## 🔑 Credenciais de Teste

| Campo | Valor |
|---|---|
| **E-mail** | `clienteteste@otium.com.br` |
| **Senha** | `Teste@2026` |

---

## 🗂️ Estrutura do Projeto

```
Otium/
├── backend/                  # API REST — Fastify + Prisma + TypeScript
│   ├── prisma/
│   │   └── schema.prisma     # Schema do banco de dados
│   ├── src/
│   │   ├── index.ts          # Entrada da aplicação e registro de rotas
│   │   ├── db.ts             # Instância do Prisma Client
│   │   └── routes/
│   │       ├── cliente-portal.ts   # Endpoints do portal do cliente
│   │       └── ...                 # Outras rotas
│   ├── .env                  # ⚠️ Criar manualmente (não versionado)
│   └── package.json
│
├── frontend/                 # Next.js 16 + Tailwind CSS + TypeScript
│   └── src/app/
│       ├── login/            # Página de login
│       ├── cliente/          # Portal do cliente
│       │   ├── page.tsx          # Dashboard
│       │   ├── layout.tsx        # Layout com sidebar
│       │   ├── cadastro/         # Cadastro de novo cliente
│       │   ├── agendar/          # Agendamento de consultas
│       │   ├── carteirinha/      # Carteirinha digital
│       │   ├── resultados/       # Laudos + download PDF
│       │   ├── perfil/           # Edição de dados e senha
│       │   └── pagamento/[id]/   # Checkout PIX / Cartão
│       └── ...
│
├── .vscode/
│   └── extensions.json       # Extensões recomendadas do VS Code
├── .gitignore
└── SETUP.md                  # Este arquivo
```

---

## 🔄 Atualizando o Projeto

Sempre que houver novas alterações no repositório:

```bash
cd Otium
git pull origin main
```

Se o `package.json` mudou, reinstale as dependências:

```bash
cd backend  && npm install
cd ../frontend && npm install
```

Se o `schema.prisma` mudou, regenere o client:

```bash
cd backend
npx prisma generate
```

---

## 🛠️ Troubleshooting

| Problema | Solução |
|---|---|
| `npx prisma generate` falha | Verifique se o `.env` existe em `backend/` com o `DATABASE_URL` correto |
| Backend não inicia (porta em uso) | Feche outra instância ou mude a porta em `src/index.ts` |
| Frontend não conecta na API | Certifique-se que o backend está rodando na porta `3000` |
| Erro de permissão no PowerShell | Execute: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Erro `Cannot find module '@prisma/client'` | Execute `npx prisma generate` dentro da pasta `backend/` |

---

## 🧰 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| **Backend** | Fastify 5, TypeScript, tsx |
| **ORM** | Prisma 6 |
| **Banco** | MySQL (remoto — dbaas.com.br) |
| **Auth** | JWT (`@fastify/jwt`) |
| **PDF** | jsPDF + jspdf-autotable |
| **Ícones** | Lucide React |
