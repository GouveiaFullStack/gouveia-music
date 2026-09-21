// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

// ======================================================
// TIPOS AUXILIARES
// ======================================================

type SongArtistInput = {
  artistId: number;
  role?: string;
};

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

// ======================================================
// ROTAS DE MÚSICAS
// ======================================================

// ------------------------------------------------------
// GET /songs
//
// Lista todas as músicas.
//
// Rota pública.
//
// Inclui:
// - artistas
// - álbum
// - gêneros
// ------------------------------------------------------

router.get("/songs", async (request, response) => {
  try {
    const songs = await prisma.song.findMany({
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

    response.json(songs);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /songs/:id
//
// Busca uma música específica pelo ID.
//
// Rota pública.
// ------------------------------------------------------

router.get("/songs/:id", async (request, response) => {
  try {
    const songId = Number(request.params.id);

    // --------------------------------------------------
    // Validação do ID
    // --------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Busca da música
    // --------------------------------------------------

    const song = await prisma.song.findUnique({
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

    if (!song) {
      response.status(404).json({
        message: "Música não encontrada",
      });

      return;
    }

    response.json(song);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /songs
//
// Cria uma nova música.
//
// Rota protegida.
//
// Toda música precisa possuir pelo menos um artista.
//
// O usuário autenticado precisa possuir pelo menos
// um dos artistas enviados e esse artista precisa
// estar relacionado como "main".
// ------------------------------------------------------

router.post("/songs", authMiddleware, async (request, response) => {
  try {
    const { title, duration, audioUrl, coverUrl, artists } = request.body as {
      title?: string;
      duration?: number;
      audioUrl?: string;
      coverUrl?: string;
      artists?: SongArtistInput[];
    };

    const songDuration = Number(duration);

    // ------------------------------------------------
    // Validação dos campos básicos
    // ------------------------------------------------

    if (
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isFinite(songDuration) ||
      songDuration <= 0 ||
      typeof audioUrl !== "string" ||
      !audioUrl.trim()
    ) {
      response.status(400).json({
        message: "title, duration e audioUrl são obrigatórios e válidos",
      });

      return;
    }

    // ------------------------------------------------
    // Toda música precisa ter artista
    // ------------------------------------------------

    if (!Array.isArray(artists) || artists.length === 0) {
      response.status(400).json({
        message: "A música precisa possuir pelo menos um artista",
      });

      return;
    }

    // ------------------------------------------------
    // Normalização dos artistas
    // ------------------------------------------------
    //
    // Remove IDs duplicados.
    //
    // Se o mesmo artistId aparecer mais de uma vez,
    // somente a última ocorrência será utilizada.
    // ------------------------------------------------

    const normalizedArtists = Array.from(
      new Map(
        artists.map((item) => [
          Number(item.artistId),

          {
            artistId: Number(item.artistId),

            role:
              typeof item.role === "string" && item.role.trim()
                ? item.role.trim()
                : "main",
          },
        ]),
      ).values(),
    );

    const uniqueArtistIds = normalizedArtists.map((item) => item.artistId);

    // ------------------------------------------------
    // Validação dos IDs dos artistas
    // ------------------------------------------------

    if (
      uniqueArtistIds.some(
        (artistId) => !Number.isInteger(artistId) || artistId <= 0,
      )
    ) {
      response.status(400).json({
        message: "Um ou mais IDs de artistas são inválidos",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se todos os artistas existem
    // ------------------------------------------------

    const existingArtists = await prisma.artist.findMany({
      where: {
        id: {
          in: uniqueArtistIds,
        },
      },
    });

    if (existingArtists.length !== uniqueArtistIds.length) {
      response.status(404).json({
        message: "Um ou mais artistas não foram encontrados",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------
    //
    // O usuário autenticado precisa ser dono de pelo
    // menos um dos artistas informados.
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    const authenticatedUserArtists = existingArtists.filter(
      (artist) => artist.userId === authenticatedUserId,
    );

    if (authenticatedUserArtists.length === 0) {
      response.status(403).json({
        message:
          "Você precisa possuir pelo menos um dos artistas relacionados à música",
      });

      return;
    }

    // ------------------------------------------------
    // Precisa ser artista principal
    // ------------------------------------------------

    const authenticatedArtistIds = new Set(
      authenticatedUserArtists.map((artist) => artist.id),
    );

    const authenticatedUserIsMainArtist = normalizedArtists.some(
      (item) =>
        authenticatedArtistIds.has(item.artistId) && item.role === "main",
    );

    if (!authenticatedUserIsMainArtist) {
      response.status(403).json({
        message:
          "Seu artista precisa estar relacionado como artista principal da música",
      });

      return;
    }

    // ------------------------------------------------
    // Criação da música
    // ------------------------------------------------

    const song = await prisma.song.create({
      data: {
        title: title.trim(),

        duration: songDuration,

        audioUrl: audioUrl.trim(),

        coverUrl: typeof coverUrl === "string" ? coverUrl.trim() || null : null,

        artists: {
          create: normalizedArtists.map((item) => ({
            role: item.role,

            artist: {
              connect: {
                id: item.artistId,
              },
            },
          })),
        },
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

    response.status(201).json(song);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// PATCH /songs/:id
//
// Atualiza parcialmente uma música.
//
// Rota protegida.
//
// Somente um usuário que possua um artista relacionado
// como "main" pode editar.
//
// Pode alterar:
// - title
// - duration
// - audioUrl
// - coverUrl
//
// Relações com artistas, gêneros e álbum
// são tratadas separadamente.
// ------------------------------------------------------

router.patch("/songs/:id", authMiddleware, async (request, response) => {
  try {
    const songId = Number(request.params.id);

    const { title, duration, audioUrl, coverUrl } = request.body;

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Precisa existir pelo menos um campo
    // ------------------------------------------------

    if (
      title === undefined &&
      duration === undefined &&
      audioUrl === undefined &&
      coverUrl === undefined
    ) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se a música existe
    // ------------------------------------------------

    const existingSong = await prisma.song.findUnique({
      where: {
        id: songId,
      },
    });

    if (!existingSong) {
      response.status(404).json({
        message: "Música não encontrada",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    const mainArtist = await prisma.songArtist.findFirst({
      where: {
        songId,
        role: "main",

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!mainArtist) {
      response.status(403).json({
        message: "Você não tem permissão para alterar esta música",
      });

      return;
    }

    // ------------------------------------------------
    // Dados para atualização
    // ------------------------------------------------

    const data: Prisma.SongUpdateInput = {};

    // ------------------------------------------------
    // Título
    // ------------------------------------------------

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        response.status(400).json({
          message: "O título da música não pode ser vazio",
        });

        return;
      }

      data.title = title.trim();
    }

    // ------------------------------------------------
    // Duração
    // ------------------------------------------------

    if (duration !== undefined) {
      const songDuration = Number(duration);

      if (!Number.isFinite(songDuration) || songDuration <= 0) {
        response.status(400).json({
          message: "Duração inválida",
        });

        return;
      }

      data.duration = songDuration;
    }

    // ------------------------------------------------
    // Áudio
    // ------------------------------------------------

    if (audioUrl !== undefined) {
      if (typeof audioUrl !== "string" || !audioUrl.trim()) {
        response.status(400).json({
          message: "audioUrl não pode ser vazio",
        });

        return;
      }

      data.audioUrl = audioUrl.trim();
    }

    // ------------------------------------------------
    // Capa
    // ------------------------------------------------

    if (coverUrl !== undefined) {
      if (coverUrl !== null && typeof coverUrl !== "string") {
        response.status(400).json({
          message: "coverUrl inválida",
        });

        return;
      }

      data.coverUrl = coverUrl === null ? null : coverUrl.trim() || null;
    }

    // ------------------------------------------------
    // Atualização
    // ------------------------------------------------

    const updatedSong = await prisma.song.update({
      where: {
        id: songId,
      },

      data,

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

    response.json(updatedSong);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /songs/:id
//
// Remove uma música.
//
// Rota protegida.
//
// Somente um artista principal relacionado à música
// pode tentar removê-la.
//
// Regra adicional:
// não permite apagar a última música de um artista.
// ------------------------------------------------------

router.delete("/songs/:id", authMiddleware, async (request, response) => {
  try {
    const songId = Number(request.params.id);

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Busca a música e artistas relacionados
    // ------------------------------------------------

    const song = await prisma.song.findUnique({
      where: {
        id: songId,
      },

      include: {
        artists: true,
      },
    });

    if (!song) {
      response.status(404).json({
        message: "Música não encontrada",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    const mainArtist = await prisma.songArtist.findFirst({
      where: {
        songId,
        role: "main",

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!mainArtist) {
      response.status(403).json({
        message: "Você não tem permissão para remover esta música",
      });

      return;
    }

    // ------------------------------------------------
    // Regra: todo artista precisa ter uma música
    // ------------------------------------------------

    for (const songArtist of song.artists) {
      const artistSongCount = await prisma.songArtist.count({
        where: {
          artistId: songArtist.artistId,
        },
      });

      if (artistSongCount <= 1) {
        response.status(409).json({
          message:
            "A música não pode ser removida porque é a única música de um dos artistas relacionados",
        });

        return;
      }
    }

    // ------------------------------------------------
    // Exclusão
    // ------------------------------------------------
    //
    // Relações configuradas com onDelete: Cascade
    // são removidas junto com a música.
    // ------------------------------------------------

    await prisma.song.delete({
      where: {
        id: songId,
      },
    });

    response.status(204).send();
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /songs/:id/genres
//
// Relaciona gêneros existentes a uma música.
//
// Rota protegida.
//
// Somente um artista principal da música pode
// alterar seus gêneros.
// ------------------------------------------------------

router.post("/songs/:id/genres", authMiddleware, async (request, response) => {
  try {
    const songId = Number(request.params.id);

    const { genreIds } = request.body;

    // ------------------------------------------------
    // Validação do ID da música
    // ------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Validação dos gêneros enviados
    // ------------------------------------------------

    if (!Array.isArray(genreIds) || genreIds.length === 0) {
      response.status(400).json({
        message: "Informe pelo menos um gênero",
      });

      return;
    }

    const uniqueGenreIds = [
      ...new Set(genreIds.map((genreId) => Number(genreId))),
    ];

    if (
      uniqueGenreIds.some(
        (genreId) => !Number.isInteger(genreId) || genreId <= 0,
      )
    ) {
      response.status(400).json({
        message: "Um ou mais IDs de gêneros são inválidos",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se a música existe
    // ------------------------------------------------

    const song = await prisma.song.findUnique({
      where: {
        id: songId,
      },
    });

    if (!song) {
      response.status(404).json({
        message: "Música não encontrada",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    const mainArtist = await prisma.songArtist.findFirst({
      where: {
        songId,
        role: "main",

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!mainArtist) {
      response.status(403).json({
        message: "Você não tem permissão para alterar os gêneros desta música",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se todos os gêneros existem
    // ------------------------------------------------

    const genres = await prisma.genre.findMany({
      where: {
        id: {
          in: uniqueGenreIds,
        },
      },
    });

    if (genres.length !== uniqueGenreIds.length) {
      response.status(404).json({
        message: "Um ou mais gêneros não foram encontrados",
      });

      return;
    }

    // ------------------------------------------------
    // Cria as relações
    // ------------------------------------------------

    await prisma.songGenre.createMany({
      data: uniqueGenreIds.map((genreId) => ({
        songId,
        genreId,
      })),

      skipDuplicates: true,
    });

    // ------------------------------------------------
    // Busca a música atualizada
    // ------------------------------------------------

    const updatedSong = await prisma.song.findUnique({
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

    response.json(updatedSong);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ======================================================
// EXPORTAÇÃO
// ======================================================

export default router;
