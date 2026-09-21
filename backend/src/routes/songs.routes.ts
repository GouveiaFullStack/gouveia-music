// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

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
// Lista todas as músicas.
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
// Busca uma música específica pelo ID.
// ------------------------------------------------------

router.get("/songs/:id", async (request, response) => {
  try {
    const songId = Number(request.params.id);

    if (Number.isNaN(songId)) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

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
// Cria uma nova música.
//
// Toda música precisa possuir pelo menos um artista.
// ------------------------------------------------------

router.post("/songs", async (request, response) => {
  try {
    const { title, duration, audioUrl, coverUrl, artists } = request.body as {
      title?: string;
      duration?: number;
      audioUrl?: string;
      coverUrl?: string;
      artists?: SongArtistInput[];
    };

    const songDuration = Number(duration);

    // Valida os campos básicos da música.
    if (
      !title ||
      Number.isNaN(songDuration) ||
      songDuration <= 0 ||
      !audioUrl
    ) {
      response.status(400).json({
        message: "title, duration e audioUrl são obrigatórios e válidos",
      });

      return;
    }

    // Toda música precisa possuir pelo menos um artista.
    if (!Array.isArray(artists) || artists.length === 0) {
      response.status(400).json({
        message: "A música precisa possuir pelo menos um artista",
      });

      return;
    }

    // Remove IDs duplicados antes de validar.
    const uniqueArtistIds = [
      ...new Set(artists.map((item) => Number(item.artistId))),
    ];

    // Verifica se todos os IDs são válidos.
    if (uniqueArtistIds.some((artistId) => Number.isNaN(artistId))) {
      response.status(400).json({
        message: "Um ou mais IDs de artistas são inválidos",
      });

      return;
    }

    // Confirma se todos os artistas existem.
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

    const song = await prisma.song.create({
      data: {
        title,
        duration: songDuration,
        audioUrl,
        coverUrl: coverUrl ?? null,

        artists: {
          create: artists.map((item) => ({
            role: item.role || "main",

            artist: {
              connect: {
                id: Number(item.artistId),
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
// Atualiza parcialmente uma música.
//
// Pode alterar:
// - title
// - duration
// - audioUrl
// - coverUrl
//
// Relações com artistas, gêneros e álbum
// são tratadas em rotas específicas.
// ------------------------------------------------------

router.patch("/songs/:id", async (request, response) => {
  try {
    const songId = Number(request.params.id);

    const { title, duration, audioUrl, coverUrl } = request.body;

    if (Number.isNaN(songId)) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

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

    const data: Prisma.SongUpdateInput = {};

    if (title !== undefined) {
      if (!title) {
        response.status(400).json({
          message: "O título da música não pode ser vazio",
        });

        return;
      }

      data.title = title;
    }

    if (duration !== undefined) {
      const songDuration = Number(duration);

      if (Number.isNaN(songDuration) || songDuration <= 0) {
        response.status(400).json({
          message: "Duração inválida",
        });

        return;
      }

      data.duration = songDuration;
    }

    if (audioUrl !== undefined) {
      if (!audioUrl) {
        response.status(400).json({
          message: "audioUrl não pode ser vazio",
        });

        return;
      }

      data.audioUrl = audioUrl;
    }

    if (coverUrl !== undefined) {
      data.coverUrl = coverUrl || null;
    }

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
// Remove uma música.
//
// Regra:
// não permite apagar a última música de um artista.
// ------------------------------------------------------

router.delete("/songs/:id", async (request, response) => {
  try {
    const songId = Number(request.params.id);

    if (Number.isNaN(songId)) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // Busca a música e os artistas relacionados.
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

    // Nossa regra do Gouveia Music diz que um artista
    // precisa possuir pelo menos uma música.
    //
    // Portanto, antes de apagar, verificamos se esta
    // música é a última de algum dos artistas relacionados.
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

    // As relações configuradas com onDelete: Cascade
    // serão removidas junto com a música.
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
// Relaciona gêneros existentes a uma música.
// ------------------------------------------------------

router.post("/songs/:id/genres", async (request, response) => {
  try {
    const songId = Number(request.params.id);

    const { genreIds } = request.body;

    if (Number.isNaN(songId)) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    if (!Array.isArray(genreIds) || genreIds.length === 0) {
      response.status(400).json({
        message: "Informe pelo menos um gênero",
      });

      return;
    }

    const uniqueGenreIds = [
      ...new Set(genreIds.map((genreId) => Number(genreId))),
    ];

    if (uniqueGenreIds.some((genreId) => Number.isNaN(genreId))) {
      response.status(400).json({
        message: "Um ou mais IDs de gêneros são inválidos",
      });

      return;
    }

    // Confirma se a música existe.
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

    // Confirma se todos os gêneros existem.
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

    await prisma.songGenre.createMany({
      data: uniqueGenreIds.map((genreId) => ({
        songId,
        genreId,
      })),

      // Evita duplicar uma relação existente.
      skipDuplicates: true,
    });

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
