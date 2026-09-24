# Mousiké

![Status](https://img.shields.io/badge/status-Backend%20MVP%20concluído-success)
![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)

**Mousiké** é uma plataforma de streaming musical desenvolvida como projeto de portfólio e aprendizado full-stack.

O projeto está sendo construído passo a passo, passando por modelagem de banco de dados, desenvolvimento de API, autenticação, autorização, uploads, histórico de reprodução, busca, recomendações musicais e, na próxima etapa, frontend e player de música.

---

## Navegação

- [Status do projeto](#status-do-projeto)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Tecnologias](#tecnologias)
- [Arquitetura do projeto](#arquitetura-do-projeto)
- [Banco de dados](#banco-de-dados)
- [API](#api)
- [Uploads](#uploads)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Executando o backend](#executando-o-backend)
- [Scripts disponíveis](#scripts-disponíveis)
- [Segurança](#segurança)
- [Documentação](#documentação)
- [Próximas etapas](#próximas-etapas)
- [Objetivo do projeto](#objetivo-do-projeto)

---

## Status do projeto

### Backend MVP — concluído

O Backend MVP da Mousiké está implementado e passou por testes manuais durante o desenvolvimento.

A API atualmente possui:

- autenticação com JWT;
- autorização de operações;
- gerenciamento de usuários;
- perfis de artistas;
- publicação de músicas;
- upload de áudio e imagens;
- álbuns;
- gêneros;
- playlists públicas e privadas;
- favoritos;
- histórico de reprodução;
- seguidores;
- busca;
- recomendações personalizadas;
- mixes;
- home personalizada.

### Frontend — próxima etapa

O próximo grande marco do projeto é o desenvolvimento do frontend e sua integração com a API existente.

O frontend deverá incluir:

- cadastro e login;
- home personalizada;
- busca;
- páginas de usuários e artistas;
- álbuns;
- playlists;
- favoritos;
- publicação de músicas;
- recomendações;
- player de música;
- landing page;
- design responsivo.

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
- Substituição de imagem
- Remoção de imagem

---

### Autenticação

- Login com email e senha
- Hash de senha com `bcryptjs`
- Autenticação com JWT
- Middleware de autenticação
- Rotas protegidas
- Identificação do usuário autenticado pelo token
- Consulta do usuário autenticado
- Respostas de autenticação sem exposição do hash da senha

---

### Artistas

O perfil Artist funciona como uma extensão da conta de usuário.

Um usuário não precisa criar uma conta separada para publicar músicas.

Recursos implementados:

- perfil de artista associado a User;
- criação automática do Artist na primeira publicação;
- nome artístico;
- bio;
- imagem;
- campo de verificação;
- associação com músicas;
- associação com álbuns;
- seguidores;
- autorização baseada no proprietário da conta.

A relação principal é:

```text
User 1 ───── 0..1 Artist
```

---

### Músicas

- Publicação de músicas
- Upload obrigatório de áudio MP3
- Upload opcional de capa
- Detecção automática da duração do áudio
- Associação de múltiplos artistas
- Papéis dos artistas na música
- Identificação do artista principal por `role = "main"`
- Consulta pública
- Consulta individual
- Alteração do título
- Alteração de capa
- Remoção de capa
- Exclusão protegida
- Limpeza automática de arquivos locais

Na primeira publicação, caso o usuário ainda não possua um Artist, o backend cria automaticamente:

1. o perfil Artist;
2. a música;
3. a relação entre música e artista principal.

A operação é realizada como parte do mesmo fluxo de publicação.

---

### Álbuns

- Criação de álbuns
- Consulta
- Edição protegida
- Exclusão protegida
- Associação de múltiplos artistas
- Associação e remoção de músicas
- Data de lançamento
- Upload de capa
- Substituição de capa
- Remoção de capa

Uma música pode existir sem pertencer a um álbum, permitindo publicação de singles.

---

### Gêneros

- Criação
- Consulta
- Edição
- Exclusão
- Associação de múltiplos gêneros a uma música

A relação entre músicas e gêneros é N:N.

---

### Playlists

- Criação de playlists
- Playlists públicas
- Playlists privadas
- Nome
- Descrição
- Imagem de capa
- Adição de músicas
- Remoção de músicas
- Ordenação
- Controle de posição
- Controle de acesso às playlists privadas
- Edição somente pelo proprietário
- Exclusão somente pelo proprietário

---

### Favoritos

- Favoritar músicas
- Remover músicas dos favoritos
- Listar favoritos do usuário
- Impedir favorito duplicado da mesma música pelo mesmo usuário

---

### Histórico de reprodução

O histórico é uma das principais fontes de informação utilizadas pelo sistema de recomendações.

Uma reprodução é registrada somente quando o usuário escuta pelo menos:

```text
25% da duração da música
```

Cada registro armazena:

- usuário;
- música;
- segundos reproduzidos;
- momento da reprodução.

O histórico poderá futuramente ser utilizado também para retrospectivas e estatísticas pessoais.

---

### Sistema de seguidores

Usuários podem:

- seguir artistas;
- deixar de seguir artistas;
- seguir outros usuários;
- deixar de seguir outros usuários.

O backend impede que um usuário siga a própria conta.

---

### Busca

A Mousiké possui busca global por:

- músicas;
- artistas;
- álbuns.

A pesquisa de músicas também considera artistas relacionados.

---

### Recomendações

O backend possui um sistema próprio de recomendações.

Os principais sinais utilizados atualmente incluem:

- histórico de reprodução;
- recência das reproduções;
- repetição de músicas;
- músicas favoritas;
- artistas seguidos;
- artistas relacionados;
- gêneros musicais.

O algoritmo também utiliza regras de diversidade para reduzir excesso de músicas do mesmo artista.

Recursos existentes:

- recomendações personalizadas;
- músicas semelhantes;
- mais músicas de um artista;
- mix personalizado;
- mix de descobertas;
- mix baseado em favoritos;
- home personalizada.

---

## Tecnologias

### Backend

| Tecnologia                | Uso                                    |
| ------------------------- | -------------------------------------- |
| Node.js                   | Runtime JavaScript                     |
| TypeScript                | Tipagem e desenvolvimento              |
| Express                   | API HTTP                               |
| PostgreSQL                | Banco de dados                         |
| Prisma ORM                | Modelagem e acesso aos dados           |
| Prisma PostgreSQL Adapter | Integração Prisma/PostgreSQL           |
| JWT                       | Autenticação                           |
| bcryptjs                  | Hash de senhas                         |
| Multer                    | Upload de arquivos                     |
| music-metadata            | Leitura de metadados MP3               |
| CORS                      | Integração entre frontend e backend    |
| dotenv                    | Variáveis de ambiente                  |
| pg                        | Driver PostgreSQL                      |
| tsx                       | Execução TypeScript em desenvolvimento |

### Desenvolvimento

- VS Code
- PowerShell
- Git
- GitHub
- npm

---

## Arquitetura do projeto

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
│   ├── README.md
│   ├── database.md
│   │
│   ├── technical/
│   │   ├── Mousike_Documentacao_Tecnica.docx
│   │   └── Mousike_Documentacao_Tecnica.pdf
│   │
│   └── changelog/
│       └── 2026-09-22-backend-mvp/
│           ├── Mousike_Relatorio_Evolucao_2026-09-22.docx
│           └── Mousike_Relatorio_Evolucao_2026-09-22.pdf
│
├── .gitignore
└── README.md
```

Os arquivos enviados pelos usuários são armazenados localmente em:

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

### Entidades principais

- User
- Artist
- Song
- Album
- Genre
- Playlist
- Favorite
- ListeningHistory

### Models de relacionamento

- SongArtist
- SongGenre
- AlbumArtist
- PlaylistSong
- UserArtistFollow
- UserFollow

Para detalhes da modelagem:

[`docs/database.md`](./docs/database.md)

---

## API

A API segue uma organização por domínio.

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

Existem rotas públicas e protegidas.

Operações que dependem da identidade do usuário utilizam JWT e middleware de autenticação.

Operações de alteração também possuem regras de autorização para validar se o recurso realmente pertence ao usuário autenticado.

---

## Uploads

O backend utiliza Multer para receber arquivos.

### Imagens aceitas

```text
JPEG
PNG
WEBP
```

### Áudio aceito

```text
MP3
```

### Estrutura local

```text
backend/uploads/
├── profile-images/
├── artist-images/
├── song-covers/
├── album-covers/
├── playlist-covers/
└── song-audio/
```

O backend também realiza limpeza de arquivos quando imagens ou músicas são substituídas ou removidas, reduzindo arquivos órfãos.

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

Crie:

```text
backend/.env
```

Adicione:

```env
DATABASE_URL="sua_url_do_postgresql"
JWT_SECRET="sua_chave_secreta"
```

Nunca envie valores reais dessas variáveis para o GitHub.

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

```powershell
cd backend
npm run dev
```

O projeto utiliza `tsx watch`, portanto o servidor reinicia automaticamente quando os arquivos TypeScript são alterados.

Por padrão:

```text
Backend
http://localhost:3000

Frontend local previsto
http://localhost:5173
```

### Verificar tipos

```powershell
npm run typecheck
```

### Gerar build

```powershell
npm run build
```

Os arquivos compilados são gerados em:

```text
backend/dist/
```

### Executar build

```powershell
npm start
```

---

## Scripts disponíveis

| Comando                   | Função                                 |
| ------------------------- | -------------------------------------- |
| `npm run dev`             | Executa o backend em desenvolvimento   |
| `npm run typecheck`       | Valida o TypeScript sem gerar arquivos |
| `npm run build`           | Compila o backend                      |
| `npm start`               | Executa o build compilado              |
| `npm run prisma:validate` | Valida o schema Prisma                 |
| `npm run prisma:generate` | Gera o Prisma Client                   |

---

## CORS

Durante o desenvolvimento, a API aceita requisições do frontend local em:

```text
http://localhost:5173
```

O backend utiliza:

```text
http://localhost:3000
```

Atualmente a autenticação utiliza Bearer Token JWT, sem autenticação baseada em cookies.

---

## Segurança

Cuidados já implementados:

- senhas armazenadas com hash;
- autenticação JWT;
- middleware para rotas protegidas;
- autorização baseada no usuário autenticado;
- proteção das operações de artistas;
- proteção de playlists privadas;
- validação de propriedade antes de alterações;
- variáveis de ambiente fora do Git;
- diretório de uploads fora do Git;
- Prisma Client gerado fora do Git;
- proteção contra remoção de arquivos fora da área de uploads;
- respostas de login sem exposição do hash da senha.

Melhorias que poderão ser implementadas posteriormente:

- refresh tokens;
- revogação de sessão;
- rate limiting;
- Helmet;
- validação estruturada de payloads;
- observabilidade;
- armazenamento externo de mídia;
- configuração de produção para CORS.

---

## Documentação

A documentação da Mousiké está organizada em:

[`docs/`](./docs/)

### Índice da documentação

[`docs/README.md`](./docs/README.md)

Esse arquivo funciona como ponto de entrada para a documentação do projeto.

### Banco de dados

[`docs/database.md`](./docs/database.md)

Contém:

- entidades;
- relacionamentos;
- cardinalidades;
- constraints;
- índices;
- regras de exclusão;
- decisões de modelagem;
- regras de domínio relacionadas aos dados.

### Documentação técnica

Disponível em:

[`docs/technical/`](./docs/technical/)

Arquivos:

- [`Mousike_Documentacao_Tecnica.pdf`](./docs/technical/Mousike_Documentacao_Tecnica.pdf)
- [`Mousike_Documentacao_Tecnica.docx`](./docs/technical/Mousike_Documentacao_Tecnica.docx)

### Histórico de evolução

Os registros dos principais marcos ficam em:

[`docs/changelog/`](./docs/changelog/)

Primeiro marco documentado:

**22 de setembro de 2026 — conclusão do Backend MVP**

[`docs/changelog/2026-09-22-backend-mvp/`](./docs/changelog/2026-09-22-backend-mvp/)

---

## Próximas etapas

Com o Backend MVP concluído, o desenvolvimento seguirá para o frontend.

### Estrutura inicial

- criar o projeto frontend;
- definir organização de pastas;
- configurar comunicação com a API;
- preparar variáveis de ambiente;
- criar estrutura visual base.

### Autenticação

- cadastro;
- login;
- armazenamento da sessão;
- rotas protegidas;
- logout;
- carregamento do usuário autenticado.

### Experiência musical

- home personalizada;
- busca;
- músicas;
- artistas;
- álbuns;
- playlists;
- favoritos;
- histórico;
- recomendações.

### Player

- reprodução;
- pausa;
- progresso;
- duração;
- volume;
- próxima música;
- música anterior;
- fila de reprodução.

### Perfis e publicação

- página de usuário;
- página de artista;
- seguidores;
- publicação de músicas;
- capas;
- gerenciamento do conteúdo publicado.

### Interface

- landing page;
- animações;
- responsividade;
- estados de carregamento;
- tratamento visual de erros;
- feedback de ações.

### Etapas futuras

- testes automatizados;
- melhorias de segurança;
- armazenamento de mídia em serviço externo;
- deploy;
- observabilidade;
- otimização do sistema de recomendações.

---

## Objetivo do projeto

A Mousiké nasceu como um projeto de aprendizado e portfólio.

O objetivo é construir uma aplicação full-stack completa e compreender, na prática, conceitos como:

- APIs REST;
- Node.js;
- TypeScript;
- Express;
- PostgreSQL;
- Prisma;
- bancos de dados relacionais;
- modelagem de dados;
- relacionamentos N:N;
- autenticação;
- autorização;
- JWT;
- upload de arquivos;
- manipulação de mídia;
- regras de negócio;
- sistemas de recomendação;
- arquitetura backend;
- integração frontend/backend;
- Git;
- GitHub;
- organização e documentação de projetos.

A aplicação continuará evoluindo por etapas, mantendo o histórico das principais decisões e marcos do desenvolvimento na documentação do repositório.
