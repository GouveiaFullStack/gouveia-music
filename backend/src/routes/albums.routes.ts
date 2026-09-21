// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

// ======================================================
// ROTAS DE ÁLBUNS
// ======================================================

// ------------------------------------------------------
// GET /albums
// Lista todos os álbuns.
//
// Inclui:
// - artistas
// - músicas
// ------------------------------------------------------

router.get("/albums", async (request, response) => {
  try {
    const albums = await prisma.album.findMany({
      include: {
        artists: {
          include: {
            artist: true,
          },
        },

        songs: {
          include: {
            artists: {
              include: {
                artist: true,
              },
            },
          },
        },
      },
    });

    response.json(albums);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /albums/:id
// Busca um álbum específico pelo ID.
//
// Inclui:
// - artistas do álbum
// - músicas
// - artistas das músicas
// - gêneros das músicas
// ------------------------------------------------------

router.get("/albums/:id", async (request, response) => {
  try {
    const albumId = Number(request.params.id);

    if (!Number.isInteger(albumId) || albumId <= 0) {
      response.status(400).json({
        message: "ID de álbum inválido",
      });

      return;
    }

    const album = await prisma.album.findUnique({
      where: {
        id: albumId,
      },

      include: {
        artists: {
          include: {
            artist: true,
          },
        },

        songs: {
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
    });

    if (!album) {
      response.status(404).json({
        message: "Álbum não encontrado",
      });

      return;
    }

    response.json(album);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /albums
// Cria um novo álbum.
//
// Todo álbum precisa possuir pelo menos um artista.
// ------------------------------------------------------

router.post("/albums", authMiddleware, async (request, response) => {
  try {
    const { title, coverUrl, releaseDate, artistIds } = request.body;

    // Valida os campos básicos.
    if (!title || !releaseDate) {
      response.status(400).json({
        message: "title e releaseDate são obrigatórios",
      });

      return;
    }

    // Todo álbum precisa ter pelo menos um artista.
    if (!Array.isArray(artistIds) || artistIds.length === 0) {
      response.status(400).json({
        message: "O álbum precisa possuir pelo menos um artista",
      });

      return;
    }

    // Converte e valida a data.
    const parsedReleaseDate = new Date(releaseDate);

    if (Number.isNaN(parsedReleaseDate.getTime())) {
      response.status(400).json({
        message: "releaseDate inválida",
      });

      return;
    }

    // Converte todos os IDs recebidos para número.
    const normalizedArtistIds = artistIds.map((artistId: unknown) =>
      Number(artistId),
    );

    // Verifica se algum ID é inválido.
    if (
      normalizedArtistIds.some(
        (artistId) => !Number.isInteger(artistId) || artistId <= 0,
      )
    ) {
      response.status(400).json({
        message: "Um ou mais IDs de artistas são inválidos",
      });

      return;
    }

    // Remove IDs duplicados.
    const uniqueArtistIds = [...new Set(normalizedArtistIds)];

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

    const authenticatedUserId = request.userId!;

    const ownsOneOfTheArtists = existingArtists.some(
      (artist) => artist.userId === authenticatedUserId,
    );

    if (!ownsOneOfTheArtists) {
      response.status(403).json({
        message:
          "Você precisa possuir pelo menos um dos artistas relacionados ao álbum",
      });

      return;
    }

    // Cria o álbum e suas relações AlbumArtist.
    const album = await prisma.album.create({
      data: {
        title,
        coverUrl: coverUrl ?? null,
        releaseDate: parsedReleaseDate,

        artists: {
          create: uniqueArtistIds.map((artistId) => ({
            artist: {
              connect: {
                id: artistId,
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

        songs: true,
      },
    });

    response.status(201).json(album);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// PATCH /albums/:id
// Atualiza parcialmente um álbum.
//
// Pode alterar:
// - title
// - coverUrl
// - releaseDate
//
// Artistas e músicas são tratados separadamente.
// ------------------------------------------------------

router.patch("/albums/:id", authMiddleware, async (request, response) => {
  try {
    const albumId = Number(request.params.id);

    const { title, coverUrl, releaseDate } = request.body;

    if (Number.isNaN(albumId)) {
      response.status(400).json({
        message: "ID de álbum inválido",
      });

      return;
    }

    // Precisa existir pelo menos um campo para atualizar.
    if (
      title === undefined &&
      coverUrl === undefined &&
      releaseDate === undefined
    ) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    // Confirma se o álbum existe.
    const existingAlbum = await prisma.album.findUnique({
      where: {
        id: albumId,
      },
    });

    if (!existingAlbum) {
      response.status(404).json({
        message: "Álbum não encontrado",
      });

      return;
    }

    const authenticatedUserId = request.userId!;

    const albumArtist = await prisma.albumArtist.findFirst({
      where: {
        albumId,

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!albumArtist) {
      response.status(403).json({
        message: "Você não tem permissão para alterar este álbum",
      });

      return;
    }

    const data: Prisma.AlbumUpdateInput = {};

    // Atualização do título.
    if (title !== undefined) {
      if (!title) {
        response.status(400).json({
          message: "O título do álbum não pode ser vazio",
        });

        return;
      }

      data.title = title;
    }

    // Atualização da capa.
    if (coverUrl !== undefined) {
      data.coverUrl = coverUrl || null;
    }

    // Atualização da data de lançamento.
    if (releaseDate !== undefined) {
      const parsedReleaseDate = new Date(releaseDate);

      if (Number.isNaN(parsedReleaseDate.getTime())) {
        response.status(400).json({
          message: "releaseDate inválida",
        });

        return;
      }

      data.releaseDate = parsedReleaseDate;
    }

    const updatedAlbum = await prisma.album.update({
      where: {
        id: albumId,
      },

      data,

      include: {
        artists: {
          include: {
            artist: true,
          },
        },

        songs: true,
      },
    });

    response.json(updatedAlbum);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /albums/:id
// Remove um álbum.
//
// As músicas NÃO são apagadas.
// Como Song.album é opcional, elas passam a ficar
// sem álbum após a exclusão.
// ------------------------------------------------------

router.delete("/albums/:id", authMiddleware, async (request, response) => {
  try {
    const albumId = Number(request.params.id);

    if (Number.isNaN(albumId)) {
      response.status(400).json({
        message: "ID de álbum inválido",
      });

      return;
    }

    const album = await prisma.album.findUnique({
      where: {
        id: albumId,
      },
    });

    if (!album) {
      response.status(404).json({
        message: "Álbum não encontrado",
      });

      return;
    }

    const authenticatedUserId = request.userId!;

    const albumArtist = await prisma.albumArtist.findFirst({
      where: {
        albumId,

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!albumArtist) {
      response.status(403).json({
        message: "Você não tem permissão para remover este álbum",
      });

      return;
    }

    await prisma.album.delete({
      where: {
        id: albumId,
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
// POST /albums/:id/songs
// Adiciona músicas existentes a um álbum.
// ------------------------------------------------------

router.post("/albums/:id/songs", authMiddleware, async (request, response) => {
  try {
    const albumId = Number(request.params.id);

    const { songIds } = request.body;

    if (Number.isNaN(albumId)) {
      response.status(400).json({
        message: "ID de álbum inválido",
      });

      return;
    }

    if (!Array.isArray(songIds) || songIds.length === 0) {
      response.status(400).json({
        message: "Informe pelo menos uma música",
      });

      return;
    }

    // Confirma se o álbum existe.
    const album = await prisma.album.findUnique({
      where: {
        id: albumId,
      },
    });

    if (!album) {
      response.status(404).json({
        message: "Álbum não encontrado",
      });

      return;
    }

    const authenticatedUserId = request.userId!;

    const albumArtist = await prisma.albumArtist.findFirst({
      where: {
        albumId,

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!albumArtist) {
      response.status(403).json({
        message: "Você não tem permissão para adicionar músicas a este álbum",
      });

      return;
    }

    const normalizedSongIds = songIds.map((songId: unknown) => Number(songId));

    if (
      normalizedSongIds.some(
        (songId) => !Number.isInteger(songId) || songId <= 0,
      )
    ) {
      response.status(400).json({
        message: "Um ou mais IDs de músicas são inválidos",
      });

      return;
    }

    const uniqueSongIds = [...new Set(normalizedSongIds)];

    // Confirma se todas as músicas existem.
    const songs = await prisma.song.findMany({
      where: {
        id: {
          in: uniqueSongIds,
        },
      },
    });

    if (songs.length !== uniqueSongIds.length) {
      response.status(404).json({
        message: "Uma ou mais músicas não foram encontradas",
      });

      return;
    }

    const authorizedSongRelations = await prisma.songArtist.findMany({
      where: {
        songId: {
          in: uniqueSongIds,
        },

        role: "main",

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },

      select: {
        songId: true,
      },
    });

    const authorizedSongIds = new Set(
      authorizedSongRelations.map((relation) => relation.songId),
    );

    const hasUnauthorizedSong = uniqueSongIds.some(
      (songId) => !authorizedSongIds.has(songId),
    );

    if (hasUnauthorizedSong) {
      response.status(403).json({
        message:
          "Você só pode adicionar ao álbum músicas das quais seu artista seja principal",
      });

      return;
    }

    // Atualiza todas as músicas informadas,
    // definindo este álbum como albumId.
    await prisma.song.updateMany({
      where: {
        id: {
          in: uniqueSongIds,
        },
      },

      data: {
        albumId,
      },
    });

    const updatedAlbum = await prisma.album.findUnique({
      where: {
        id: albumId,
      },

      include: {
        artists: {
          include: {
            artist: true,
          },
        },

        songs: true,
      },
    });

    response.json(updatedAlbum);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /albums/:albumId/songs/:songId
// Remove uma música de um álbum.
//
// A música NÃO é apagada.
// Apenas seu albumId volta a ser null.
// ------------------------------------------------------

router.delete(
  "/albums/:albumId/songs/:songId",
  authMiddleware,
  async (request, response) => {
    try {
      const albumId = Number(request.params.albumId);
      const songId = Number(request.params.songId);

      if (
        !Number.isInteger(albumId) ||
        albumId <= 0 ||
        !Number.isInteger(songId) ||
        songId <= 0
      ) {
        response.status(400).json({
          message: "ID de álbum ou música inválido",
        });

        return;
      }

      const authenticatedUserId = request.userId!;

      const album = await prisma.album.findUnique({
        where: {
          id: albumId,
        },
      });

      if (!album) {
        response.status(404).json({
          message: "Álbum não encontrado",
        });

        return;
      }

      const albumArtist = await prisma.albumArtist.findFirst({
        where: {
          albumId,

          artist: {
            is: {
              userId: authenticatedUserId,
            },
          },
        },
      });

      if (!albumArtist) {
        response.status(403).json({
          message: "Você não tem permissão para remover músicas deste álbum",
        });

        return;
      }

      // Procura especificamente uma música
      // que pertença a este álbum.
      const song = await prisma.song.findFirst({
        where: {
          id: songId,
          albumId,
        },
      });

      if (!song) {
        response.status(404).json({
          message: "A música não pertence a este álbum",
        });

        return;
      }

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
          message:
            "Você só pode remover do álbum músicas das quais seu artista seja principal",
        });

        return;
      }

      // Remove apenas a associação com o álbum.
      await prisma.song.update({
        where: {
          id: songId,
        },

        data: {
          albumId: null,
        },
      });

      response.json({
        message: "Música removida do álbum",
      });
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ======================================================
// EXPORTAÇÃO
// ======================================================

export default router;
