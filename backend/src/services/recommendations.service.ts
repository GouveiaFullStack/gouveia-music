// ======================================================
// IMPORTS
// ======================================================

import { prisma } from "../lib/prisma.js";

// ======================================================
// CONFIGURAÇÃO DO ALGORITMO
// ======================================================

const MAX_HISTORY_ENTRIES = 100;
const MAX_CANDIDATE_SONGS = 200;
const MAX_RECOMMENDATIONS = 20;
const MAX_SONGS_PER_MAIN_ARTIST = 3;
const MAX_SECTION_ITEMS = 6;

// ======================================================
// PESOS
// ======================================================

const FAVORITE_ARTIST_WEIGHT = 5;
const FAVORITE_GENRE_WEIGHT = 4;
const FOLLOWED_ARTIST_WEIGHT = 6;

// ======================================================
// TIPOS AUXILIARES
// ======================================================

type RecommendationReason = {
  type: "artist" | "genre" | "album";
  id: number;
  name: string;
  weight: number;
};

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function getHistoryWeights(playedAt: Date) {
  const now = Date.now();
  const playedAtTime = playedAt.getTime();

  const differenceInMilliseconds = Math.max(0, now - playedAtTime);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  const daysAgo = differenceInMilliseconds / millisecondsPerDay;

  if (daysAgo <= 7) {
    return {
      artist: 6,
      genre: 4,
    };
  }

  if (daysAgo <= 30) {
    return {
      artist: 4,
      genre: 3,
    };
  }

  if (daysAgo <= 90) {
    return {
      artist: 3,
      genre: 2,
    };
  }

  return {
    artist: 1,
    genre: 1,
  };
}

function getRepetitionMultiplier(playNumber: number) {
  if (playNumber === 1) {
    return 1;
  }

  if (playNumber === 2) {
    return 0.6;
  }

  if (playNumber === 3) {
    return 0.3;
  }

  return 0;
}

// ======================================================
// SERVIÇO DE RECOMENDAÇÕES
// ======================================================

export async function getRecommendations(userId: number) {
  // ====================================================
  // 1. USUÁRIO
  // ====================================================

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
    },
  });

  if (!user) {
    return null;
  }

  // ====================================================
  // 2. SINAIS DO USUÁRIO
  // ====================================================

  const [history, favorites, followedArtists] = await Promise.all([
    prisma.listeningHistory.findMany({
      where: {
        userId,
      },

      orderBy: {
        playedAt: "desc",
      },

      take: MAX_HISTORY_ENTRIES,

      include: {
        song: {
          include: {
            artists: {
              include: {
                artist: true,
              },
            },

            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
      },
    }),

    prisma.favorite.findMany({
      where: {
        userId,
      },

      include: {
        song: {
          include: {
            artists: {
              include: {
                artist: true,
              },
            },

            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
      },
    }),

    prisma.userArtistFollow.findMany({
      where: {
        userId,
      },

      include: {
        artist: true,
      },
    }),
  ]);

  // ====================================================
  // 3. MAPAS DE PREFERÊNCIA
  // ====================================================

  const artistScores = new Map<number, number>();

  const genreScores = new Map<number, number>();

  const artistNames = new Map<number, string>();

  const genreNames = new Map<number, string>();

  const historyArtistIds = new Set<number>();

  const historyGenreIds = new Set<number>();

  const favoriteArtistIds = new Set<number>();

  const favoriteGenreIds = new Set<number>();

  const followedArtistIds = new Set<number>();

  // ====================================================
  // 4. HISTÓRICO
  // ====================================================

  const songPlayCounts = new Map<number, number>();

  for (const entry of history) {
    const previousPlayCount = songPlayCounts.get(entry.songId) ?? 0;

    const playNumber = previousPlayCount + 1;

    songPlayCounts.set(entry.songId, playNumber);

    const repetitionMultiplier = getRepetitionMultiplier(playNumber);

    const historyWeights = getHistoryWeights(entry.playedAt);

    const artistHistoryWeight = historyWeights.artist * repetitionMultiplier;

    const genreHistoryWeight = historyWeights.genre * repetitionMultiplier;

    for (const relation of entry.song.artists) {
      const artist = relation.artist;

      historyArtistIds.add(artist.id);

      const currentScore = artistScores.get(artist.id) ?? 0;

      artistScores.set(artist.id, currentScore + artistHistoryWeight);

      artistNames.set(artist.id, artist.name);
    }

    for (const relation of entry.song.genres) {
      const genre = relation.genre;

      historyGenreIds.add(genre.id);

      const currentScore = genreScores.get(genre.id) ?? 0;

      genreScores.set(genre.id, currentScore + genreHistoryWeight);

      genreNames.set(genre.id, genre.name);
    }
  }

  // ====================================================
  // 5. FAVORITOS
  // ====================================================

  for (const favorite of favorites) {
    for (const relation of favorite.song.artists) {
      const artist = relation.artist;

      favoriteArtistIds.add(artist.id);

      const currentScore = artistScores.get(artist.id) ?? 0;

      artistScores.set(artist.id, currentScore + FAVORITE_ARTIST_WEIGHT);

      artistNames.set(artist.id, artist.name);
    }

    for (const relation of favorite.song.genres) {
      const genre = relation.genre;

      favoriteGenreIds.add(genre.id);

      const currentScore = genreScores.get(genre.id) ?? 0;

      genreScores.set(genre.id, currentScore + FAVORITE_GENRE_WEIGHT);

      genreNames.set(genre.id, genre.name);
    }
  }

  // ====================================================
  // 6. ARTISTAS SEGUIDOS
  // ====================================================

  for (const follow of followedArtists) {
    const artist = follow.artist;

    followedArtistIds.add(artist.id);

    const currentScore = artistScores.get(artist.id) ?? 0;

    artistScores.set(artist.id, currentScore + FOLLOWED_ARTIST_WEIGHT);

    artistNames.set(artist.id, artist.name);
  }

  // ====================================================
  // 7. MÚSICAS JÁ CONHECIDAS
  // ====================================================

  const knownSongIds = new Set<number>();

  for (const entry of history) {
    knownSongIds.add(entry.songId);
  }

  for (const favorite of favorites) {
    knownSongIds.add(favorite.songId);
  }

  // ====================================================
  // 8. COLD START
  // ====================================================

  if (artistScores.size === 0 && genreScores.size === 0) {
    const recentSongs = await prisma.song.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: MAX_RECOMMENDATIONS,

      include: {
        artists: {
          include: {
            artist: true,
          },
        },

        album: true,

        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    const discoveryItems = recentSongs.map((song) => ({
      score: 0,

      reasons: [] as RecommendationReason[],

      song,
    }));

    return {
      strategy: "discovery",

      message:
        "Ainda não há dados suficientes para personalizar as recomendações",

      basedOn: {
        historyEntries: 0,
        favorites: 0,
        followedArtists: 0,
        topArtists: [],
        topGenres: [],
      },

      recommendations: discoveryItems,

      sections: {
        fromFollowedArtists: [],
        basedOnFavorites: [],
        becauseYouListened: [],

        discoveries: discoveryItems.slice(0, MAX_SECTION_ITEMS),
      },
    };
  }

  // ====================================================
  // 9. CANDIDATOS
  // ====================================================

  const candidateSongs = await prisma.song.findMany({
    where: {
      id: {
        notIn: Array.from(knownSongIds),
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: MAX_CANDIDATE_SONGS,

    include: {
      artists: {
        include: {
          artist: true,
        },
      },

      album: true,

      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  // ====================================================
  // 10. PONTUAÇÃO
  // ====================================================

  const scoredSongs = candidateSongs.map((song) => {
    let score = 0;

    const reasons: RecommendationReason[] = [];

    for (const relation of song.artists) {
      const artist = relation.artist;

      const artistWeight = artistScores.get(artist.id) ?? 0;

      if (artistWeight > 0) {
        score += artistWeight;

        reasons.push({
          type: "artist",

          id: artist.id,

          name: artist.name,

          weight: artistWeight,
        });
      }
    }

    for (const relation of song.genres) {
      const genre = relation.genre;

      const genreWeight = genreScores.get(genre.id) ?? 0;

      if (genreWeight > 0) {
        score += genreWeight;

        reasons.push({
          type: "genre",

          id: genre.id,

          name: genre.name,

          weight: genreWeight,
        });
      }
    }

    return {
      score,
      reasons,
      song,
    };
  });

  // ====================================================
  // 11. RANKING
  // ====================================================

  const rankedSongs = scoredSongs

    .filter((item) => item.score > 0)

    .sort((a, b) => b.score - a.score);

  // ====================================================
  // 12. DIVERSIDADE
  // ====================================================

  const recommendations: typeof rankedSongs = [];

  const artistRecommendationCounts = new Map<number, number>();

  for (const item of rankedSongs) {
    if (recommendations.length >= MAX_RECOMMENDATIONS) {
      break;
    }

    const mainArtistRelation =
      item.song.artists.find((relation) => relation.role === "main") ??
      item.song.artists[0];

    if (!mainArtistRelation) {
      recommendations.push(item);

      continue;
    }

    const artistId = mainArtistRelation.artist.id;

    const currentCount = artistRecommendationCounts.get(artistId) ?? 0;

    if (currentCount >= MAX_SONGS_PER_MAIN_ARTIST) {
      continue;
    }

    recommendations.push(item);

    artistRecommendationCounts.set(artistId, currentCount + 1);
  }

  // ====================================================
  // 13. FALLBACK
  // ====================================================

  if (recommendations.length === 0) {
    const fallbackSongs = candidateSongs.slice(0, MAX_RECOMMENDATIONS);

    const fallbackItems = fallbackSongs.map((song) => ({
      score: 0,

      reasons: [] as RecommendationReason[],

      song,
    }));

    return {
      strategy: "discovery",

      message:
        "Não encontramos músicas semelhantes suficientes; exibindo novas descobertas",

      basedOn: {
        historyEntries: history.length,

        favorites: favorites.length,

        followedArtists: followedArtists.length,

        topArtists: [],
        topGenres: [],
      },

      recommendations: fallbackItems,

      sections: {
        fromFollowedArtists: [],
        basedOnFavorites: [],
        becauseYouListened: [],

        discoveries: fallbackItems.slice(0, MAX_SECTION_ITEMS),
      },
    };
  }

  // ====================================================
  // 14. TOP ARTISTAS E GÊNEROS
  // ====================================================

  const topArtists = Array.from(artistScores.entries())

    .map(([artistId, score]) => ({
      artistId,

      name: artistNames.get(artistId) ?? null,

      score,
    }))

    .sort((a, b) => b.score - a.score)

    .slice(0, 10);

  const topGenres = Array.from(genreScores.entries())

    .map(([genreId, score]) => ({
      genreId,

      name: genreNames.get(genreId) ?? null,

      score,
    }))

    .sort((a, b) => b.score - a.score)

    .slice(0, 10);

  // ====================================================
  // 15. SEÇÕES
  // ====================================================

  const fromFollowedArtists: typeof recommendations = [];

  const basedOnFavorites: typeof recommendations = [];

  const becauseYouListened: typeof recommendations = [];

  const discoveries: typeof recommendations = [];

  const sectionSongIds = new Set<number>();

  for (const item of recommendations) {
    const artistIds = item.song.artists.map((relation) => relation.artist.id);

    const genreIds = item.song.genres.map((relation) => relation.genre.id);

    const matchesFollowedArtist = artistIds.some((artistId) =>
      followedArtistIds.has(artistId),
    );

    if (
      matchesFollowedArtist &&
      fromFollowedArtists.length < MAX_SECTION_ITEMS
    ) {
      fromFollowedArtists.push(item);

      sectionSongIds.add(item.song.id);

      continue;
    }

    const matchesFavorite =
      artistIds.some((artistId) => favoriteArtistIds.has(artistId)) ||
      genreIds.some((genreId) => favoriteGenreIds.has(genreId));

    if (matchesFavorite && basedOnFavorites.length < MAX_SECTION_ITEMS) {
      basedOnFavorites.push(item);

      sectionSongIds.add(item.song.id);

      continue;
    }

    const matchesHistory =
      artistIds.some((artistId) => historyArtistIds.has(artistId)) ||
      genreIds.some((genreId) => historyGenreIds.has(genreId));

    if (matchesHistory && becauseYouListened.length < MAX_SECTION_ITEMS) {
      becauseYouListened.push(item);

      sectionSongIds.add(item.song.id);
    }
  }

  // ====================================================
  // 16. DESCOBERTAS
  // ====================================================

  for (const item of scoredSongs) {
    if (discoveries.length >= MAX_SECTION_ITEMS) {
      break;
    }

    if (item.score > 0) {
      continue;
    }

    if (sectionSongIds.has(item.song.id)) {
      continue;
    }

    discoveries.push(item);

    sectionSongIds.add(item.song.id);
  }

  // ====================================================
  // 17. RESULTADO
  // ====================================================

  return {
    strategy: "personalized",

    basedOn: {
      historyEntries: history.length,

      favorites: favorites.length,

      followedArtists: followedArtists.length,

      topArtists,

      topGenres,
    },

    recommendations,

    sections: {
      fromFollowedArtists,

      basedOnFavorites,

      becauseYouListened,

      discoveries,
    },
  };
}

// ======================================================
// MÚSICAS PARECIDAS
// ======================================================
//
// GET conceitual:
//
// /songs/:id/similar
//
// A similaridade considera:
//
// - mesmo artista: +6
// - mesmo gênero:  +4
// - mesmo álbum:   +3
//
// A própria música nunca entra no resultado.
// ======================================================

export async function getSimilarSongs(songId: number) {
  const sourceSong = await prisma.song.findUnique({
    where: {
      id: songId,
    },

    include: {
      artists: {
        include: {
          artist: true,
        },
      },

      album: true,

      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  if (!sourceSong) {
    return null;
  }

  const sourceArtistIds = new Set(
    sourceSong.artists.map((relation) => relation.artist.id),
  );

  const sourceGenreIds = new Set(
    sourceSong.genres.map((relation) => relation.genre.id),
  );

  const candidateSongs = await prisma.song.findMany({
    where: {
      id: {
        not: songId,
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: MAX_CANDIDATE_SONGS,

    include: {
      artists: {
        include: {
          artist: true,
        },
      },

      album: true,

      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  const scoredSongs = candidateSongs.map((song) => {
    let score = 0;

    const reasons: RecommendationReason[] = [];

    // ------------------------------------------------
    // Mesmo artista
    // ------------------------------------------------

    for (const relation of song.artists) {
      const artist = relation.artist;

      if (sourceArtistIds.has(artist.id)) {
        score += 6;

        reasons.push({
          type: "artist",

          id: artist.id,

          name: artist.name,

          weight: 6,
        });
      }
    }

    // ------------------------------------------------
    // Mesmo gênero
    // ------------------------------------------------

    for (const relation of song.genres) {
      const genre = relation.genre;

      if (sourceGenreIds.has(genre.id)) {
        score += 4;

        reasons.push({
          type: "genre",

          id: genre.id,

          name: genre.name,

          weight: 4,
        });
      }
    }

    // ------------------------------------------------
    // Mesmo álbum
    // ------------------------------------------------

    if (
      sourceSong.album &&
      song.album &&
      sourceSong.album.id === song.album.id
    ) {
      score += 3;

      reasons.push({
        type: "album",

        id: sourceSong.album.id,

        name: sourceSong.album.title,

        weight: 3,
      });
    }

    return {
      score,
      reasons,
      song,
    };
  });

  const rankedSongs = scoredSongs

    .filter((item) => item.score > 0)

    .sort((a, b) => b.score - a.score);

  const similarSongs: typeof rankedSongs = [];

  const artistCounts = new Map<number, number>();

  for (const item of rankedSongs) {
    if (similarSongs.length >= MAX_RECOMMENDATIONS) {
      break;
    }

    const mainArtistRelation =
      item.song.artists.find((relation) => relation.role === "main") ??
      item.song.artists[0];

    if (!mainArtistRelation) {
      similarSongs.push(item);

      continue;
    }

    const artistId = mainArtistRelation.artist.id;

    const currentCount = artistCounts.get(artistId) ?? 0;

    if (currentCount >= MAX_SONGS_PER_MAIN_ARTIST) {
      continue;
    }

    similarSongs.push(item);

    artistCounts.set(artistId, currentCount + 1);
  }

  return {
    sourceSong,
    similarSongs,
  };
}

// ======================================================
// MAIS DO MESMO ARTISTA
// ======================================================
//
// Busca músicas relacionadas a um artista.
//
// Opcionalmente exclui uma música específica,
// útil quando o usuário já está ouvindo aquela faixa.
// ======================================================

export async function getMoreFromArtist(
  artistId: number,
  excludeSongId?: number,
) {
  // ----------------------------------------------------
  // Confirma se o artista existe
  // ----------------------------------------------------

  const artist = await prisma.artist.findUnique({
    where: {
      id: artistId,
    },

    select: {
      id: true,
      name: true,
      imageUrl: true,
      verified: true,
    },
  });

  if (!artist) {
    return null;
  }

  // ----------------------------------------------------
  // Busca músicas do artista
  // ----------------------------------------------------

  const songs = await prisma.song.findMany({
    where: {
      artists: {
        some: {
          artistId,
        },
      },

      ...(excludeSongId !== undefined
        ? {
            id: {
              not: excludeSongId,
            },
          }
        : {}),
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 20,

    include: {
      artists: {
        include: {
          artist: true,
        },
      },

      album: true,

      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  return {
    artist,
    songs,
  };
}

// ======================================================
// MIX PARA VOCÊ
// ======================================================
//
// Cria uma seleção dinâmica baseada no motor de
// recomendações personalizado.
//
// Neste momento a mix NÃO é salva como Playlist
// no banco.
//
// Ela é recalculada sempre que a rota é chamada.
// ======================================================

export async function getForYouMix(userId: number) {
  const recommendationResult = await getRecommendations(userId);

  // Usuário não encontrado
  if (!recommendationResult) {
    return null;
  }

  // ----------------------------------------------------
  // Evita músicas repetidas
  // ----------------------------------------------------

  const songIds = new Set<number>();

  const songs = [];

  for (const item of recommendationResult.recommendations) {
    if (songIds.has(item.song.id)) {
      continue;
    }

    songIds.add(item.song.id);

    songs.push(item.song);

    if (songs.length >= 20) {
      break;
    }
  }

  // ----------------------------------------------------
  // Completa com descobertas, se necessário
  // ----------------------------------------------------

  for (const item of recommendationResult.sections.discoveries) {
    if (songs.length >= 20) {
      break;
    }

    if (songIds.has(item.song.id)) {
      continue;
    }

    songIds.add(item.song.id);

    songs.push(item.song);
  }

  return {
    type: "for-you",

    name: "Mix para você",

    description:
      "Uma seleção baseada no que você ouve, favorita e nos artistas que segue.",

    generatedAt: new Date(),

    totalSongs: songs.length,

    songs,
  };
}

// ======================================================
// DESCOBERTAS PARA VOCÊ
// ======================================================
//
// Gera uma seleção de músicas ainda desconhecidas
// pelo usuário.
//
// Prioriza a seção "discoveries" produzida pelo
// motor de recomendações.
// ======================================================

export async function getDiscoveryMix(userId: number) {
  const recommendationResult = await getRecommendations(userId);

  if (!recommendationResult) {
    return null;
  }

  const songIds = new Set<number>();

  const songs = [];

  // ----------------------------------------------------
  // Primeiro usamos as descobertas puras
  // ----------------------------------------------------

  for (const item of recommendationResult.sections.discoveries) {
    if (songIds.has(item.song.id)) {
      continue;
    }

    songIds.add(item.song.id);

    songs.push(item.song);

    if (songs.length >= 20) {
      break;
    }
  }

  // ----------------------------------------------------
  // Se não tivermos músicas suficientes,
  // completamos com recomendações personalizadas.
  // ----------------------------------------------------

  for (const item of recommendationResult.recommendations) {
    if (songs.length >= 20) {
      break;
    }

    if (songIds.has(item.song.id)) {
      continue;
    }

    songIds.add(item.song.id);

    songs.push(item.song);
  }

  return {
    type: "discover",

    name: "Descobertas para você",

    description: "Músicas para explorar além do que você já costuma ouvir.",

    generatedAt: new Date(),

    totalSongs: songs.length,

    songs,
  };
}

// ======================================================
// FAVORITAS E PARECIDAS
// ======================================================
//
// Cria uma mix baseada diretamente nas músicas
// favoritas do usuário.
//
// A mix contém:
//
// - até 5 favoritas recentes
// - músicas relacionadas a essas favoritas
//
// Similaridade:
//
// mesmo artista -> +6
// mesmo gênero  -> +4
// mesmo álbum   -> +3
// ======================================================

export async function getFavoritesMix(userId: number) {
  // ----------------------------------------------------
  // Confirma se o usuário existe
  // ----------------------------------------------------

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
    },
  });

  if (!user) {
    return null;
  }

  // ----------------------------------------------------
  // Favoritas recentes
  // ----------------------------------------------------

  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 5,

    include: {
      song: {
        include: {
          artists: {
            include: {
              artist: true,
            },
          },

          album: true,

          genres: {
            include: {
              genre: true,
            },
          },
        },
      },
    },
  });

  // ----------------------------------------------------
  // Usuário ainda não possui favoritos
  // ----------------------------------------------------

  if (favorites.length === 0) {
    return {
      type: "favorites",

      name: "Favoritas e parecidas",

      description: "Favorite músicas para criar esta mix personalizada.",

      generatedAt: new Date(),

      totalSongs: 0,

      songs: [],
    };
  }

  // ====================================================
  // PERFIL DAS FAVORITAS
  // ====================================================

  const favoriteSongIds = new Set<number>();

  const favoriteArtistIds = new Set<number>();

  const favoriteGenreIds = new Set<number>();

  const favoriteAlbumIds = new Set<number>();

  for (const favorite of favorites) {
    const song = favorite.song;

    favoriteSongIds.add(song.id);

    for (const relation of song.artists) {
      favoriteArtistIds.add(relation.artist.id);
    }

    for (const relation of song.genres) {
      favoriteGenreIds.add(relation.genre.id);
    }

    if (song.album) {
      favoriteAlbumIds.add(song.album.id);
    }
  }

  // ====================================================
  // BUSCA CANDIDATOS
  // ====================================================

  const candidateSongs = await prisma.song.findMany({
    where: {
      id: {
        notIn: Array.from(favoriteSongIds),
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 200,

    include: {
      artists: {
        include: {
          artist: true,
        },
      },

      album: true,

      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  // ====================================================
  // PONTUAÇÃO
  // ====================================================

  const scoredSongs = candidateSongs.map((song) => {
    let score = 0;

    // ----------------------------------------------
    // Artistas
    // ----------------------------------------------

    for (const relation of song.artists) {
      if (favoriteArtistIds.has(relation.artist.id)) {
        score += 6;
      }
    }

    // ----------------------------------------------
    // Gêneros
    // ----------------------------------------------

    for (const relation of song.genres) {
      if (favoriteGenreIds.has(relation.genre.id)) {
        score += 4;
      }
    }

    // ----------------------------------------------
    // Álbum
    // ----------------------------------------------

    if (song.album && favoriteAlbumIds.has(song.album.id)) {
      score += 3;
    }

    return {
      score,
      song,
    };
  });

  // ====================================================
  // ORDENA AS PARECIDAS
  // ====================================================

  const relatedSongs = scoredSongs

    .filter((item) => item.score > 0)

    .sort((a, b) => b.score - a.score);

  // ====================================================
  // MONTA A MIX
  // ====================================================

  const songs = [];

  const addedSongIds = new Set<number>();

  // ----------------------------------------------------
  // Primeiro entram as favoritas
  // ----------------------------------------------------

  for (const favorite of favorites) {
    const song = favorite.song;

    if (addedSongIds.has(song.id)) {
      continue;
    }

    addedSongIds.add(song.id);

    songs.push(song);
  }

  // ----------------------------------------------------
  // Depois entram as relacionadas
  // ----------------------------------------------------

  for (const item of relatedSongs) {
    if (songs.length >= 20) {
      break;
    }

    if (addedSongIds.has(item.song.id)) {
      continue;
    }

    addedSongIds.add(item.song.id);

    songs.push(item.song);
  }

  return {
    type: "favorites",

    name: "Favoritas e parecidas",

    description:
      "Suas favoritas recentes acompanhadas de músicas com artistas, gêneros e álbuns relacionados.",

    generatedAt: new Date(),

    totalSongs: songs.length,

    songs,
  };
}

// ======================================================
// HOME
// ======================================================
//
// Reúne os principais conteúdos personalizados
// necessários para a Home do Mousiké.
//
// Evitamos chamar todas as rotas separadamente
// no frontend.
//
// O motor principal de recomendações é calculado
// apenas uma vez nesta função.
// ======================================================

export async function getHomeData(userId: number) {
  // ----------------------------------------------------
  // Carrega em paralelo:
  //
  // - recomendações principais
  // - mix baseada em favoritos
  // ----------------------------------------------------

  const [recommendationResult, favoritesMix] = await Promise.all([
    getRecommendations(userId),

    getFavoritesMix(userId),
  ]);

  // ----------------------------------------------------
  // Usuário não encontrado
  // ----------------------------------------------------

  if (!recommendationResult || !favoritesMix) {
    return null;
  }

  // ====================================================
  // MIX PARA VOCÊ
  // ====================================================

  const forYouSongIds = new Set<number>();

  const forYouSongs = [];

  for (const item of recommendationResult.recommendations) {
    if (forYouSongIds.has(item.song.id)) {
      continue;
    }

    forYouSongIds.add(item.song.id);

    forYouSongs.push(item.song);

    if (forYouSongs.length >= 20) {
      break;
    }
  }

  // Completa com descobertas.
  for (const item of recommendationResult.sections.discoveries) {
    if (forYouSongs.length >= 20) {
      break;
    }

    if (forYouSongIds.has(item.song.id)) {
      continue;
    }

    forYouSongIds.add(item.song.id);

    forYouSongs.push(item.song);
  }

  const forYou = {
    type: "for-you",

    name: "Mix para você",

    description:
      "Uma seleção baseada no que você ouve, favorita e nos artistas que segue.",

    totalSongs: forYouSongs.length,

    songs: forYouSongs,
  };

  // ====================================================
  // DESCOBERTAS
  // ====================================================

  const discoverySongIds = new Set<number>();

  const discoverySongs = [];

  // Primeiro usamos descobertas puras.
  for (const item of recommendationResult.sections.discoveries) {
    if (discoverySongIds.has(item.song.id)) {
      continue;
    }

    discoverySongIds.add(item.song.id);

    discoverySongs.push(item.song);

    if (discoverySongs.length >= 20) {
      break;
    }
  }

  // Se ainda houver espaço, completamos
  // com recomendações personalizadas.
  for (const item of recommendationResult.recommendations) {
    if (discoverySongs.length >= 20) {
      break;
    }

    if (discoverySongIds.has(item.song.id)) {
      continue;
    }

    discoverySongIds.add(item.song.id);

    discoverySongs.push(item.song);
  }

  const discover = {
    type: "discover",

    name: "Descobertas para você",

    description: "Músicas para explorar além do que você já costuma ouvir.",

    totalSongs: discoverySongs.length,

    songs: discoverySongs,
  };

  // ====================================================
  // SEÇÕES DA HOME
  // ====================================================
  //
  // Todas as seções seguem a mesma estrutura:
  //
  // type
  // title
  // description
  // songs
  //
  // Isso permite que o frontend renderize a Home
  // dinamicamente.
  // ====================================================

  // ----------------------------------------------------
  // Artistas que o usuário segue
  // ----------------------------------------------------

  const followedArtistSongs =
    recommendationResult.sections.fromFollowedArtists.map((item) => item.song);

  // ----------------------------------------------------
  // Porque você ouviu
  // ----------------------------------------------------

  const becauseYouListenedSongs =
    recommendationResult.sections.becauseYouListened.map((item) => item.song);

  const sections = [
    {
      type: "for-you",

      title: "Mix para você",

      description:
        "Uma seleção baseada no que você ouve, favorita e nos artistas que segue.",

      songs: forYou.songs,
    },

    {
      type: "followed-artists",

      title: "De artistas que você segue",

      description:
        "Novas sugestões de artistas que fazem parte da sua biblioteca.",

      songs: followedArtistSongs,
    },

    {
      type: "favorites",

      title: "Favoritas e parecidas",

      description: "Suas favoritas acompanhadas de músicas relacionadas.",

      songs: favoritesMix.songs,
    },

    {
      type: "because-you-listened",

      title: "Porque você ouviu",

      description:
        "Músicas relacionadas ao que você tem escutado recentemente.",

      songs: becauseYouListenedSongs,
    },

    {
      type: "discover",

      title: "Descobertas para você",

      description: "Músicas para explorar além do que você já costuma ouvir.",

      songs: discover.songs,
    },
  ];

  const visibleSections = sections.filter(
    (section) => section.songs.length > 0,
  );

  // ====================================================
  // RESULTADO DA HOME
  // ====================================================

  return {
    generatedAt: new Date(),

    // --------------------------------------------------
    // Informações usadas para entender como a Home
    // foi personalizada.
    // --------------------------------------------------

    personalization: {
      strategy: recommendationResult.strategy,

      basedOn: recommendationResult.basedOn,
    },

    // --------------------------------------------------
    // Seções prontas para o frontend.
    // --------------------------------------------------

    sections: visibleSections,
  };
}
