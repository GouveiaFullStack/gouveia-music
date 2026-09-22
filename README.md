# Mousiké

Mousiké é uma plataforma de streaming musical desenvolvida como projeto de portfólio e aprendizado full-stack.

O projeto está sendo construído passo a passo, cobrindo desde modelagem de banco de dados e desenvolvimento de API até autenticação, uploads, recomendações musicais e, posteriormente, a interface frontend e o player de música.

---

## Status do projeto

### Backend MVP — concluído

O backend principal da Mousiké está implementado e passou por testes manuais durante o desenvolvimento.

Atualmente, a API já possui:

- autenticação;
- autorização;
- gerenciamento de usuários;
- perfis de artistas;
- publicação de músicas;
- uploads de áudio e imagens;
- álbuns;
- gêneros;
- playlists;
- favoritos;
- histórico de reprodução;
- sistema de seguidores;
- busca;
- recomendações personalizadas.

### Frontend — próxima etapa

O frontend ainda será desenvolvido e integrado à API existente.

---

## Funcionalidades implementadas

### Usuários

- Cadastro de usuários
- Consulta de usuários
- Edição protegida da própria conta
- Exclusão protegida da conta
- Alteração de username
- Alteração de email
- Alteração de senha
- Bio de usuário
- Upload de imagem de perfil
- Substituição e remoção da imagem de perfil

### Autenticação

- Login com email e senha
- Hash de senha com bcryptjs
- Autenticação com JWT
- Middleware de autenticação
- Rotas protegidas
- Identificação do usuário autenticado pelo token
- Endpoint para consultar o usuário autenticado

### Artistas

O perfil de artista funciona como uma extensão da conta de usuário.

- Um usuário pode possuir um perfil Artist
- O perfil Artist é criado automaticamente durante a primeira publicação de música
- Um Artist pertence a um único User
- Gerenciamento do nome artístico
- Bio de artista
- Imagem de artista
- Verificação de artista preparada no modelo
- Controle de propriedade das operações do artista

A Mousiké utiliza uma única conta para usuário e artista, evitando a necessidade de criar uma conta separada.

### Músicas

- Publicação de músicas
- Upload obrigatório de áudio MP3
- Upload opcional de capa
- Detecção automática da duração do áudio
- Associação de múltiplos artistas
- Definição de papéis dos artistas na música
- Artista principal com role `main`
- Consulta pública de músicas
- Consulta individual de música
- Alteração do título
- Alteração e remoção de capa
- Exclusão protegida da música
- Limpeza automática dos arquivos locais ao remover conteúdo

Na primeira publicação, caso o usuário ainda não possua um perfil Artist, o backend cria automaticamente:

1. o perfil Artist;
2. a música;
3. a relação entre música e artista principal.

Tudo ocorre dentro da mesma operação de publicação.

### Álbuns

- Criação de álbuns
- Associação de múltiplos artistas
- Associação de músicas
- Data de lançamento
- Upload de capa
- Substituição e remoção de capa
- Consulta de álbuns
- Edição protegida
- Exclusão protegida

Uma música pode existir sem pertencer a um álbum.

### Gêneros

- Criação de gêneros
- Consulta de gêneros
- Associação de músicas a múltiplos gêneros
- Edição de gêneros
- Exclusão de gêneros

### Playlists

- Criação de playlists
- Playlists públicas
- Playlists privadas
- Nome
- Descrição
- Imagem de capa
- Adição de músicas
- Remoção de músicas
- Ordenação das músicas
- Controle de posição
- Proteção das playlists privadas
- Alteração e exclusão somente pelo proprietário

### Favoritos

- Favoritar músicas
- Remover músicas dos favoritos
- Listar favoritos do usuário
- Impedir favorito duplicado da mesma música pelo mesmo usuário

### Histórico de reprodução

O histórico é utilizado como uma das bases do sistema de recomendações.

Uma reprodução é registrada somente depois que o usuário escuta pelo menos **25% da duração da música**.

O histórico armazena informações como:

- usuário;
- música;
- segundos escutados;
- momento da reprodução.

### Sistema de seguidores

Usuários podem:

- seguir artistas;
- deixar de seguir artistas;
- seguir outros usuários;
- deixar de seguir outros usuários.

O sistema impede que um usuário siga a própria conta.

### Busca

A Mousiké possui busca global por:

- músicas;
- artistas;
- álbuns.

A busca também considera artistas relacionados às músicas.

### Recomendações

O backend possui um sistema próprio de recomendações musicais.

As recomendações utilizam sinais como:

- histórico de reprodução;
- recência das reproduções;
- músicas favoritas;
- artistas seguidos;
- artistas das músicas;
- gêneros musicais.

O sistema também possui controle de repetição para evitar excesso de músicas do mesmo artista.

Entre os recursos disponíveis estão:

- recomendações personalizadas;
- músicas semelhantes;
- mais músicas de um artista;
- mix personalizado;
- mix de descobertas;
- mix baseado em favoritos;
- home personalizada.

---

## Tecnologias utilizadas

### Backend

- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma ORM
- Prisma PostgreSQL Adapter
- JWT
- bcryptjs
- Multer
- music-metadata
- CORS
- dotenv
- pg

### Desenvolvimento

- VS Code
- PowerShell
- Git
- GitHub
- npm
- tsx

---

## Estrutura do projeto

```text
mousike/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── upload.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── jwt.ts
│   │   │   ├── prisma.ts
│   │   │   └── upload-files.ts
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   └── upload-error.middleware.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── albums.routes.ts
│   │   │   ├── artists.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── favorites.routes.ts
│   │   │   ├── follows.routes.ts
│   │   │   ├── genres.routes.ts
│   │   │   ├── history.routes.ts
│   │   │   ├── playlists.routes.ts
│   │   │   ├── recommendations.routes.ts
│   │   │   ├── search.routes.ts
│   │   │   ├── songs.routes.ts
│   │   │   └── users.routes.ts
│   │   │
│   │   ├── services/
│   │   │   └── recommendations.service.ts
│   │   │
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   │
│   │   └── server.ts
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── prisma7.config.ts
│   └── tsconfig.json
│
├── docs/
│   ├── database.md
│   ├── Mousiké -- Documentação.pdf
│   └── Mousiké — Documentação Técnica do Projeto.docx
│
├── .gitignore
└── README.md
```

Os arquivos enviados pelos usuários ficam localmente em:

```text
backend/uploads/
```

Esse diretório não é versionado pelo Git.

---

## Banco de dados

A Mousiké utiliza PostgreSQL com Prisma ORM.

O schema principal está localizado em:

```text
backend/prisma/schema.prisma
```

As migrations estão em:

```text
backend/prisma/migrations/
```

### Principais entidades

- User
- Artist
- Song
- Album
- Genre
- Playlist
- Favorite
- ListeningHistory

### Tabelas de relacionamento

- SongArtist
- SongGenre
- AlbumArtist
- PlaylistSong
- UserArtistFollow
- UserFollow

---

## Configuração do ambiente

Entre na pasta do backend:

```powershell
cd backend
```

Instale as dependências:

```powershell
npm install
```

Crie o arquivo:

```text
backend/.env
```

Com as variáveis:

```env
DATABASE_URL="sua_url_do_postgresql"
JWT_SECRET="sua_chave_secreta"
```

Não envie o arquivo `.env` para o GitHub.

---

## Prisma

Validar o schema:

```powershell
npm run prisma:validate
```

Gerar o Prisma Client:

```powershell
npm run prisma:generate
```

Executar migrations durante o desenvolvimento:

```powershell
npx prisma migrate dev
```

---

## Executando o backend

### Desenvolvimento

O projeto utiliza `tsx watch`, que reinicia automaticamente o servidor após alterações nos arquivos TypeScript.

```powershell
npm run dev
```

Por padrão, o servidor fica disponível em:

```text
http://localhost:3000
```

### Verificação de tipos

```powershell
npm run typecheck
```

### Gerar build

```powershell
npm run build
```

O código compilado é gerado em:

```text
backend/dist/
```

### Executar o build

```powershell
npm start
```

---

## Scripts disponíveis

```text
npm run dev
```

Executa o backend em modo de desenvolvimento com reinicialização automática.

```text
npm run typecheck
```

Verifica erros de TypeScript sem gerar o build.

```text
npm run build
```

Compila o backend TypeScript.

```text
npm start
```

Executa a versão compilada do backend.

```text
npm run prisma:validate
```

Valida o schema Prisma.

```text
npm run prisma:generate
```

Gera o Prisma Client.

---

## API

A API está organizada por domínio.

Principais grupos de rotas:

```text
/auth
/users
/artists
/songs
/albums
/genres
/playlists
/favorites
/history
/search
/recommendations
/mixes
/home
```

Algumas rotas são públicas, enquanto operações que modificam dados utilizam autenticação JWT e regras de autorização.

---

## Uploads

O backend utiliza Multer para recebimento dos arquivos.

Formatos de imagem aceitos:

```text
JPEG
PNG
WEBP
```

Áudio aceito:

```text
MP3
```

Os uploads são organizados em diretórios separados:

```text
backend/uploads/
├── profile-images/
├── artist-images/
├── song-covers/
├── album-covers/
├── playlist-covers/
└── song-audio/
```

O backend também realiza limpeza de arquivos quando imagens ou músicas são substituídas ou removidas, reduzindo a criação de arquivos órfãos.

---

## CORS

Durante o desenvolvimento, o backend está preparado para receber requisições do frontend local em:

```text
http://localhost:5173
```

O backend roda em:

```text
http://localhost:3000
```

---

## Segurança

Alguns cuidados já implementados:

- senhas armazenadas com hash;
- JWT para autenticação;
- rotas protegidas por middleware;
- autorização baseada no usuário autenticado;
- proteção de operações de artistas;
- proteção de playlists privadas;
- validação de propriedade antes de alterações;
- `.env` ignorado pelo Git;
- uploads ignorados pelo Git;
- Prisma Client gerado ignorado pelo Git;
- proteção contra remoção de arquivos fora do diretório de uploads.

Recursos adicionais de produção, como rate limiting, refresh tokens, políticas avançadas de segurança e observabilidade, poderão ser adicionados posteriormente.

---

## Documentação

A documentação complementar do projeto está disponível na pasta:

```text
docs/
```

Ela inclui documentação sobre:

- modelagem do banco de dados;
- decisões de arquitetura;
- evolução do projeto;
- regras de domínio.

A documentação será atualizada conforme novos marcos do projeto forem concluídos.

---

## Próximas etapas

Com o Backend MVP concluído, o próximo grande marco da Mousiké é o frontend.

Planejamento atual:

- criar a estrutura do frontend;
- criar sistema visual da Mousiké;
- implementar cadastro e login;
- integrar autenticação com a API;
- implementar a home personalizada;
- criar busca de músicas, artistas e álbuns;
- desenvolver páginas de usuário;
- desenvolver páginas de artista;
- desenvolver páginas de álbuns;
- desenvolver playlists;
- criar fluxo de publicação de músicas;
- desenvolver o player de música;
- integrar favoritos;
- integrar histórico de reprodução;
- integrar sistema de seguidores;
- integrar recomendações;
- adicionar animações à landing page;
- criar design responsivo;
- adicionar testes automatizados;
- preparar aplicação para deploy.

---

## Objetivo do projeto

A Mousiké foi criada principalmente como projeto de aprendizado e portfólio.

O objetivo é desenvolver uma aplicação full-stack completa, entendendo na prática conceitos como:

- APIs REST;
- bancos de dados relacionais;
- modelagem de dados;
- autenticação;
- autorização;
- uploads;
- manipulação de arquivos;
- relacionamentos N:N;
- TypeScript;
- arquitetura backend;
- sistemas de recomendação;
- integração frontend/backend;
- controle de versão com Git.

O projeto continuará evoluindo conforme novas etapas forem desenvolvidas.
