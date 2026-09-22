# Banco de Dados — Mousiké

Este documento descreve a modelagem atual do banco de dados da Mousiké.

O projeto utiliza:

- PostgreSQL
- Prisma ORM
- Prisma Client
- relacionamentos explícitos para associações N:N
- chaves compostas para impedir relações duplicadas
- exclusões em cascata onde o relacionamento depende diretamente do recurso principal

O schema utilizado pela aplicação está localizado em:

```text
backend/prisma/schema.prisma
```

---

# Visão geral

O banco da Mousiké possui os seguintes models:

## Entidades principais

- User
- Artist
- Song
- Album
- Genre
- Playlist
- Favorite
- ListeningHistory

## Models de relacionamento

- SongArtist
- SongGenre
- AlbumArtist
- PlaylistSong
- UserArtistFollow
- UserFollow

---

# Diagrama conceitual simplificado

```text
User
├── Artist (0 ou 1)
├── Playlists
├── Favorites
├── ListeningHistory
├── segue Artists
├── segue Users
└── é seguido por Users

Artist
├── pertence a User
├── Songs
├── Albums
└── Followers

Song
├── Artists
├── Genres
├── Album opcional
├── Playlists
├── Favorites
└── ListeningHistory

Album
├── Artists
└── Songs

Genre
└── Songs

Playlist
├── pertence a User
└── Songs
```

---

# User

Representa uma conta de usuário da Mousiké.

Um usuário pode utilizar normalmente a plataforma e, posteriormente, também possuir um perfil de artista.

## Campos

| Campo             | Tipo     | Regra                          |
| ----------------- | -------- | ------------------------------ |
| `id`              | Int      | Chave primária, autoincremento |
| `username`        | String   | Único                          |
| `passwordHash`    | String   | Hash da senha                  |
| `email`           | String   | Único                          |
| `bio`             | String?  | Opcional                       |
| `profileImageUrl` | String?  | Opcional                       |
| `createdAt`       | DateTime | Criado automaticamente         |

## Relacionamentos

Um User pode possuir:

- zero ou um Artist;
- várias Playlists;
- vários Favorites;
- vários registros de ListeningHistory;
- vários Artists seguidos;
- vários Users seguidos;
- vários seguidores.

---

# Artist

Representa o perfil artístico associado a uma conta de usuário.

Artist não possui autenticação própria.

Ele funciona como uma extensão de User.

## Campos

| Campo       | Tipo     | Regra                          |
| ----------- | -------- | ------------------------------ |
| `id`        | Int      | Chave primária, autoincremento |
| `userId`    | Int      | Único                          |
| `name`      | String   | Nome artístico                 |
| `imageUrl`  | String?  | Opcional                       |
| `bio`       | String?  | Opcional                       |
| `verified`  | Boolean  | `false` por padrão             |
| `createdAt` | DateTime | Criado automaticamente         |

## Relacionamento com User

```text
User 1 ───── 0..1 Artist
```

`userId` possui restrição `@unique`.

Isso significa que:

- um User pode possuir no máximo um Artist;
- um Artist pertence obrigatoriamente a um User.

Se o User for removido, seu Artist também será removido por:

```text
onDelete: Cascade
```

## Outros relacionamentos

Um Artist pode possuir:

- várias músicas;
- vários álbuns;
- vários seguidores.

---

# Song

Representa uma música publicada na Mousiké.

## Campos

| Campo       | Tipo     | Regra                  |
| ----------- | -------- | ---------------------- |
| `id`        | Int      | Chave primária         |
| `title`     | String   | Obrigatório            |
| `duration`  | Int      | Duração em segundos    |
| `coverUrl`  | String?  | Opcional               |
| `audioUrl`  | String   | Obrigatório            |
| `createdAt` | DateTime | Criado automaticamente |
| `albumId`   | Int?     | Álbum opcional         |

A duração é armazenada como número inteiro em segundos.

Na aplicação, ela é extraída automaticamente do arquivo de áudio durante a publicação.

## Álbum opcional

Uma música pode existir sem álbum.

```text
Song N ───── 0..1 Album
```

Caso o álbum seja removido:

```text
albumId = null
```

Isso ocorre através de:

```text
onDelete: SetNull
```

A música não é excluída junto com o álbum.

## Relacionamentos

Uma Song pode possuir:

- vários Artists;
- vários Genres;
- zero ou um Album;
- várias Playlists;
- vários Favorites;
- vários registros de ListeningHistory.

---

# Album

Representa um álbum musical.

## Campos

| Campo         | Tipo     | Regra                  |
| ------------- | -------- | ---------------------- |
| `id`          | Int      | Chave primária         |
| `title`       | String   | Obrigatório            |
| `coverUrl`    | String?  | Opcional               |
| `releaseDate` | DateTime | Data de lançamento     |
| `createdAt`   | DateTime | Criado automaticamente |

## Relacionamentos

Um Album pode possuir:

- várias Songs;
- vários Artists.

A associação entre Album e Artist é N:N e utiliza `AlbumArtist`.

---

# Genre

Representa um gênero musical.

## Campos

| Campo  | Tipo   | Regra          |
| ------ | ------ | -------------- |
| `id`   | Int    | Chave primária |
| `name` | String | Único          |

O nome possui:

```text
@unique
```

Portanto, dois gêneros não podem possuir exatamente o mesmo nome no banco.

## Relacionamento

```text
Song N ───── N Genre
```

A relação é realizada através de `SongGenre`.

---

# Playlist

Representa uma playlist criada por um usuário.

## Campos

| Campo         | Tipo     | Regra                  |
| ------------- | -------- | ---------------------- |
| `id`          | Int      | Chave primária         |
| `userId`      | Int      | Proprietário           |
| `name`        | String   | Obrigatório            |
| `description` | String?  | Opcional               |
| `coverUrl`    | String?  | Opcional               |
| `isPublic`    | Boolean  | `false` por padrão     |
| `createdAt`   | DateTime | Criado automaticamente |

## Privacidade

Uma playlist pode ser:

```text
isPublic = true
```

ou:

```text
isPublic = false
```

Por padrão:

```text
isPublic = false
```

Portanto, novas playlists começam privadas.

## Relacionamentos

```text
User 1 ───── N Playlist
```

Toda Playlist pertence obrigatoriamente a um User.

Se o usuário for removido, suas playlists também são removidas:

```text
onDelete: Cascade
```

Uma Playlist possui várias Songs através de `PlaylistSong`.

---

# Favorite

Representa uma música favoritada por um usuário.

## Campos

| Campo       | Tipo     | Regra                  |
| ----------- | -------- | ---------------------- |
| `id`        | Int      | Chave primária         |
| `userId`    | Int      | Usuário                |
| `songId`    | Int      | Música                 |
| `createdAt` | DateTime | Criado automaticamente |

## Restrição de duplicidade

Existe a restrição:

```prisma
@@unique([userId, songId])
```

Portanto:

> Um usuário não pode favoritar a mesma música duas vezes.

Usuários diferentes podem favoritar normalmente a mesma música.

---

# ListeningHistory

Representa o histórico de reprodução.

## Campos

| Campo           | Tipo     | Regra                 |
| --------------- | -------- | --------------------- |
| `id`            | Int      | Chave primária        |
| `userId`        | Int      | Usuário               |
| `songId`        | Int      | Música                |
| `secondsListen` | Int      | Segundos reproduzidos |
| `playedAt`      | DateTime | Momento da reprodução |

## Regra da aplicação

O backend registra uma reprodução no histórico quando o usuário atinge pelo menos:

```text
25% da duração da música
```

Essa regra pertence à lógica da aplicação e não é uma constraint do PostgreSQL.

## Objetivos do histórico

ListeningHistory pode ser utilizado para:

- histórico do usuário;
- músicas recentemente ouvidas;
- análise de comportamento;
- recomendações;
- mixes personalizados;
- futuras retrospectivas da plataforma.

## Índices

O model possui:

```prisma
@@index([userId, playedAt])
@@index([songId])
```

O primeiro auxilia consultas de histórico de um usuário ordenadas ou filtradas por data.

O segundo auxilia consultas relacionadas a reproduções de uma determinada música.

---

# SongArtist

Tabela de relacionamento entre Song e Artist.

Representa a relação N:N:

```text
Song N ───── N Artist
```

## Campos

| Campo      | Tipo   |
| ---------- | ------ |
| `songId`   | Int    |
| `artistId` | Int    |
| `role`     | String |

## Role

`role` identifica o papel do artista na música.

Exemplo:

```text
main
```

Pode futuramente também representar outros papéis definidos pela aplicação.

A Mousiké utiliza atualmente `main` para identificar o artista principal e também para determinadas regras de autorização.

## Chave composta

```prisma
@@id([songId, artistId])
```

Isso impede que o mesmo Artist seja associado duas vezes à mesma Song.

## Exclusão

A relação utiliza:

```text
onDelete: Cascade
```

Se Song ou Artist deixar de existir, o respectivo vínculo também é removido.

---

# SongGenre

Tabela de relacionamento entre Song e Genre.

Representa:

```text
Song N ───── N Genre
```

## Campos

| Campo     | Tipo |
| --------- | ---- |
| `songId`  | Int  |
| `genreId` | Int  |

## Chave composta

```prisma
@@id([songId, genreId])
```

Uma música não pode ser associada duas vezes ao mesmo gênero.

## Exclusão

Utiliza:

```text
onDelete: Cascade
```

---

# AlbumArtist

Tabela de relacionamento entre Album e Artist.

Representa:

```text
Album N ───── N Artist
```

## Campos

| Campo      | Tipo |
| ---------- | ---- |
| `albumId`  | Int  |
| `artistId` | Int  |

## Chave composta

```prisma
@@id([albumId, artistId])
```

Isso impede relações duplicadas entre o mesmo Album e Artist.

## Exclusão

Utiliza:

```text
onDelete: Cascade
```

---

# PlaylistSong

Tabela responsável pelo relacionamento entre Playlist e Song.

Representa:

```text
Playlist N ───── N Song
```

## Campos

| Campo        | Tipo     | Descrição         |
| ------------ | -------- | ----------------- |
| `playlistId` | Int      | Playlist          |
| `songId`     | Int      | Música            |
| `position`   | Int      | Posição da música |
| `addedAt`    | DateTime | Data de inclusão  |

## Ordenação

O campo:

```text
position
```

define a ordem das músicas dentro da playlist.

## Chave composta

```prisma
@@id([playlistId, songId])
```

Isso significa que uma mesma música não pode ocupar duas entradas diferentes na mesma playlist.

## Índice

```prisma
@@index([playlistId, position])
```

Esse índice auxilia a busca das músicas de uma playlist em sua ordem correta.

---

# UserArtistFollow

Representa um usuário seguindo um artista.

```text
User N ───── N Artist
```

## Campos

| Campo       | Tipo     |
| ----------- | -------- |
| `userId`    | Int      |
| `artistId`  | Int      |
| `createdAt` | DateTime |

## Chave composta

```prisma
@@id([userId, artistId])
```

Isso impede que o mesmo usuário siga o mesmo artista mais de uma vez.

## Índice

```prisma
@@index([artistId])
```

Facilita consultas relacionadas aos seguidores de um artista.

## Exclusão

User e Artist utilizam:

```text
onDelete: Cascade
```

Portanto relações de follow são removidas automaticamente caso uma das entidades deixe de existir.

---

# UserFollow

Representa um usuário seguindo outro usuário.

A tabela utiliza duas relações diferentes com `User`.

## Campos

| Campo         | Tipo     | Descrição               |
| ------------- | -------- | ----------------------- |
| `followerId`  | Int      | Quem segue              |
| `followingId` | Int      | Quem está sendo seguido |
| `createdAt`   | DateTime | Momento do follow       |

Exemplo:

```text
User 5 segue User 8

followerId  = 5
followingId = 8
```

## Relações Prisma

São utilizados nomes explícitos:

```text
UserFollowFollower
UserFollowFollowing
```

Isso é necessário porque o mesmo model User participa duas vezes do relacionamento.

## Chave composta

```prisma
@@id([followerId, followingId])
```

O mesmo usuário não pode seguir a mesma conta duas vezes.

A regra que impede um usuário de seguir a própria conta é tratada pela aplicação.

## Índice

```prisma
@@index([followingId])
```

Facilita consultas dos seguidores de um determinado usuário.

---

# Resumo dos relacionamentos

## User → Artist

```text
1 : 0..1
```

Um User pode possuir no máximo um Artist.

---

## User → Playlist

```text
1 : N
```

Um User pode possuir várias Playlists.

Cada Playlist pertence a exatamente um User.

---

## Playlist ↔ Song

```text
N : N
```

Implementado através de:

```text
PlaylistSong
```

---

## Song ↔ Artist

```text
N : N
```

Implementado através de:

```text
SongArtist
```

---

## Song ↔ Genre

```text
N : N
```

Implementado através de:

```text
SongGenre
```

---

## Album ↔ Artist

```text
N : N
```

Implementado através de:

```text
AlbumArtist
```

---

## Album → Song

```text
1 : N
```

Porém a relação é opcional do lado de Song.

Uma música pode existir sem álbum.

---

## User ↔ Song — Favorite

```text
N : N
```

Representado através de registros de:

```text
Favorite
```

Com restrição única por usuário e música.

---

## User ↔ Song — ListeningHistory

```text
N : N
```

Representado através dos eventos de:

```text
ListeningHistory
```

Diferente de Favorite, a mesma música pode aparecer várias vezes no histórico do mesmo usuário.

---

## User ↔ Artist — Follow

```text
N : N
```

Implementado através de:

```text
UserArtistFollow
```

---

## User ↔ User — Follow

```text
N : N
```

Implementado através de:

```text
UserFollow
```

---

# Comportamento de exclusão

A modelagem utiliza `Cascade` em relações que deixam de fazer sentido quando a entidade principal é removida.

Exemplos:

- remover User remove suas Playlists;
- remover User remove seus Favorites;
- remover User remove seu ListeningHistory;
- remover User remove relações de follow;
- remover User remove seu Artist;
- remover Song remove relações com Artists;
- remover Song remove relações com Genres;
- remover Song remove relações com Playlists;
- remover Song remove Favorites relacionados;
- remover Song remove registros de ListeningHistory relacionados.

A relação Song → Album possui comportamento diferente:

```text
onDelete: SetNull
```

Portanto, apagar um álbum não apaga suas músicas.

As músicas apenas deixam de possuir um álbum associado.

---

# Constraints importantes

## User

```text
username UNIQUE
email UNIQUE
```

---

## Artist

```text
userId UNIQUE
```

Um User só pode possuir um Artist.

---

## Genre

```text
name UNIQUE
```

---

## Favorite

```text
(userId, songId) UNIQUE
```

---

## SongArtist

```text
PRIMARY KEY (songId, artistId)
```

---

## SongGenre

```text
PRIMARY KEY (songId, genreId)
```

---

## AlbumArtist

```text
PRIMARY KEY (albumId, artistId)
```

---

## PlaylistSong

```text
PRIMARY KEY (playlistId, songId)
```

---

## UserArtistFollow

```text
PRIMARY KEY (userId, artistId)
```

---

## UserFollow

```text
PRIMARY KEY (followerId, followingId)
```

---

# Índices adicionais

Além das chaves primárias e constraints únicas, existem índices explícitos em pontos utilizados frequentemente pela aplicação.

## PlaylistSong

```prisma
@@index([playlistId, position])
```

## ListeningHistory

```prisma
@@index([userId, playedAt])
@@index([songId])
```

## UserArtistFollow

```prisma
@@index([artistId])
```

## UserFollow

```prisma
@@index([followingId])
```

---

# Principais decisões de modelagem

## Por que Playlist e Song são N:N?

Uma playlist pode possuir várias músicas.

A mesma música também pode existir em várias playlists.

Por isso foi criado:

```text
PlaylistSong
```

Além do relacionamento, essa tabela permite guardar:

- posição;
- momento da inclusão.

---

## Por que Song e Artist são N:N?

Uma música pode possuir:

- um artista;
- vários artistas;
- participações e colaborações.

Ao mesmo tempo, um artista pode possuir várias músicas.

Por isso existe:

```text
SongArtist
```

O campo `role` também permite identificar o papel de cada artista.

---

## Por que Song e Genre são N:N?

Uma música pode pertencer a mais de um gênero.

Um gênero pode estar relacionado a diversas músicas.

Por isso existe:

```text
SongGenre
```

---

## Por que Album e Artist são N:N?

Um álbum pode possuir vários artistas.

O mesmo artista também pode participar de vários álbuns.

Por isso existe:

```text
AlbumArtist
```

---

## Por que existe ListeningHistory?

Guardar somente a última música reproduzida não permitiria conhecer o comportamento histórico do usuário.

ListeningHistory permite armazenar múltiplas reproduções ao longo do tempo.

Isso possibilita recursos como:

- recentemente ouvidas;
- recomendações;
- análise de frequência;
- preferências por artista;
- preferências por gênero;
- futuras retrospectivas.

---

## Por que Favorite possui User e Song?

Favoritar é uma relação entre:

```text
quem favoritou
+
qual música foi favoritada
```

Por isso Favorite relaciona:

```text
userId
songId
```

A constraint única impede duplicação.

---

## Por que Artist pertence a User?

A Mousiké utiliza uma única conta.

Um usuário não precisa criar uma segunda conta para publicar músicas.

Quando o usuário se torna artista, seu perfil artístico é associado à conta existente.

A relação é:

```text
User 1 ───── 0..1 Artist
```

---

## Por que Song pode existir sem Album?

Músicas podem ser publicadas como singles.

Portanto:

```text
albumId
```

é opcional.

---

## Por que Playlist possui `isPublic`?

A Mousiké permite:

- playlists públicas;
- playlists privadas.

O valor padrão é privado.

---

## Por que PlaylistSong possui `position`?

A ordem das músicas é importante para a experiência de uma playlist.

Sem esse campo, dependeríamos da ordem natural retornada pelo banco, que não deve ser utilizada como regra de negócio.

---

# Regras de domínio tratadas pela aplicação

Nem todas as regras pertencem ao schema do banco.

Algumas são validadas pelo backend.

Entre elas:

- usuário não pode seguir a própria conta;
- histórico só é registrado após atingir 25% da música;
- somente usuários autorizados podem editar seus recursos;
- somente o artista principal autorizado pode gerenciar determinadas informações da música;
- playlists privadas só podem ser acessadas conforme as regras da aplicação;
- Artist é criado automaticamente durante a primeira publicação quando necessário;
- duração da música é obtida do arquivo MP3;
- arquivos de upload são removidos quando deixam de ser utilizados.

---

# Estado atual da modelagem

A modelagem atual suporta o Backend MVP da Mousiké, incluindo:

- usuários;
- artistas;
- músicas;
- álbuns;
- gêneros;
- playlists;
- favoritos;
- histórico;
- seguidores;
- recomendações baseadas no comportamento armazenado.

Alterações futuras no produto podem exigir novas migrations e novos campos, mas o modelo atual atende aos recursos implementados nesta etapa do projeto.
