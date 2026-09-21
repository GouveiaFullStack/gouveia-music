# Banco de Dados — Gouveia Music

## Entidades

- User
- Song
- Artist
- Album
- Genre
- Playlist
- Favorite
- ListeningHistory

## Relacionamentos

User

- possui várias playlists
- possui músicas favoritas
- possui histórico de reprodução

Artist

- possui músicas

Album

- possui músicas

Playlist

- pertence a um usuário
- possui várias músicas

Song

- pertence a um álbum
- possui artistas
- possui gêneros
- pode estar em várias playlists
- pode ser favorita por vários usuários
- aparece no histórico de vários usuários

## Campos

- id
- username
- email
- password

### User

- id
- username
- password_hash
- email
- bio
- profile_image_url
- created_at

### Song

- id
- title
- duration
- cover_url
- audio_url
- created_at

### Artist

- id
- name
- image_url
- bio
- created_at

### Album

- id
- title
- cover_url
- release_date
- created_at

### Genre

- id
- name

### Playlist

- id
- user_id
- name
- description
- cover_url
- created_at
- is_public

### Favorite

- id
- user_id
- song_id
- created_at

### ListeningHistory

- id
- user_id
- song_id
- played_at
- seconds_listen

### PlaylistSong

- playlist_id
- song_id
- position
- added_at

### SongArtist

- song_id
- artist_id
- role

### SongGenre

- song_id
- genre_id

### AlbumArtist

- artist_id
- album_id

### UserArtistFollow

- artist_id
- user_id
- created_at

### UserFollow

- follower_id
- following_id
- created_at

## Perguntas de modelagem (Treinamento)

Pergunta 1 - Um usuário pode ter quantas playlists?
Resposta = 1:N ( Um Usurio pode ter vairas plaulists, uma playlist é destinada a um usuario)

Pergunta 2 - Uma playlist pode ter quantas músicas?
Resposta = N:N (Uma playlist pode ter varias musicas, as músicas podem estar em varias Playlist)

Pergunta 3 - Uma música pode ter vários artistas?
Resposta = N:N (Uma música pode ter 1 ou mais artistas, um artista pode ter mais de uma música)

Pergunta 4 - Uma música pode possuir vários gêneros?
Resposta = N:N (Uma música pode ter varios generos, um genero pode estar em varias musicas)

Pergunta 5 - Por que precisamos de ListeningHistory em vez de simplesmente colocar algo como Last_Song_ID?
Resposta = (O Last_Song_ID pegaria apenas o ID da ultima musica ouvida do usuario, utilizando o ListeningHistory podemos fazer um sistema de recapitulação de dados e recomendações mais completo, não sendo apenas baseada na ultima música ouvida pelo usuario.)

Pergunta 6 - Por que Favorite precisa relacionar User_id e Song_id?
Resposta - (Quando o usuario clicar em favoritar uma música, deve se conectar com o Id do usuario para saber quem foi que favoritou e o Id da música para identificar qual música foi favoritada)

## Perguntas de modelagem 2 (Treinamento)

1. Uma música pode existir sem estar em um álbum?
   Resposta = Sim, um artista pode lançar uma música solo onte não necessariamente precise de um album para lançar

2. Um álbum pode ter mais de um artista?
   Resposta = Sim, um álbum pode ter tido mais de um artista tanto na criação, quanto na produção das músicas

3. Uma playlist deve ser pública ou privada? Ou devemos permitir as duas opções?
   Resposta = Devemos permitir as duas opções

4. Uma playlist precisa obrigatoriamente pertencer a um usuário?
   Resposta = Sim, uma playlist deve pertencer a um usuario/artista para ser criado

5. Um usuário pode favoritar a mesma música duas vezes?
   Resposta = Não, a música deve ser favoritada apenas uma vez

6. Quando uma música é ouvida por 10 segundos e o usuário troca, devemos registrar no histórico ou só depois de ouvir uma determinada porcentagem dela?
   Resposta = Acho interessante para ter um historico mais preciso, registrar ela no historico após 25% da música ser tocada

7. Um usuário poderá seguir artistas?
   Resposta = Sim, usuarios podem seguir tanto artistas que gostam, quanto outros usuarios

8. Um usuário poderá seguir outros usuários?
   Resposta = Sim
