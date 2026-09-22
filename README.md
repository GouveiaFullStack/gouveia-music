# Mousiké

Projeto de portfólio para desenvolvimento de uma plataforma de streaming musical, construído passo a passo com foco em aprendizado full-stack.

## Estado atual

O backend está implementado e testado manualmente. O frontend ainda não foi desenvolvido.

## Tecnologias utilizadas

### Backend

- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- bcryptjs
- dotenv

### Desenvolvimento

- Git e GitHub
- VS Code
- PowerShell

## Funcionalidades implementadas

- Cadastro, consulta, edição e exclusão protegida de usuários
- Conversão de usuário em artista
- Cadastro e gerenciamento de artistas
- Cadastro, consulta, edição e exclusão protegida de músicas
- Gêneros musicais
- Álbuns e associação de músicas
- Playlists públicas e privadas
- Ordenação de músicas em playlists
- Favoritos
- Histórico de reprodução
- Regra de registro após 25% da música ouvida
- Seguir artistas
- Seguir outros usuários

## Banco de dados

O projeto utiliza PostgreSQL com Prisma ORM. O schema e as migrations estão em:

```text
backend/prisma/
```

## Documentação

A documentação técnica completa do projeto está disponível em:

```text
docs/
```

## Estrutura principal

```text
mousiké/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── server.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── prisma7.config.ts
│   └── tsconfig.json
├── docs/
├── .gitignore
└── README.md
```

## Como executar o backend

Entre na pasta do backend:

```powershell
cd backend
```

Instale as dependências:

```powershell
npm install
```

Crie um arquivo `.env` com a variável `DATABASE_URL` apontando para seu banco PostgreSQL.

Execute as migrations:

```powershell
npx prisma migrate dev
```

Gere o Prisma Client:

```powershell
npx prisma generate
```

Compile o TypeScript:

```powershell
npx tsc
```

Inicie o servidor:

```powershell
node .\dist\server.js
```

Por padrão, o backend roda em:

```text
http://localhost:3000
```

## Próximas etapas

- Autenticação com login
- JWT
- Middleware de autenticação
- Autorização das rotas
- Busca de músicas, artistas e álbuns
- Upload de áudio e imagens
- Sistema de recomendações
- Frontend
- Player de música

## Observação de segurança

Arquivos de ambiente, builds, dependências, Prisma Client gerado e arquivos auxiliares de ferramentas locais não são versionados no repositório.
