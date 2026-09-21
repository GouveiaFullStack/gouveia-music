// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

// ======================================================
// ROTAS DE PLAYLISTS
// ======================================================

// ------------------------------------------------------
// GET /playlists
// Lista todas as playlists.
//
// Inclui:
// - usuário dono
// - músicas
// - posição das músicas
// - artistas
// - álbum
// - gêneros
// ------------------------------------------------------

router.get("/playlists", async (request, response) => {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },

        songs: {
          orderBy: {
            position: "asc",
          },

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
        },
      },
    });

    response.json(playlists);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /playlists/:id
// Busca uma playlist específica.
// ------------------------------------------------------

router.get("/playlists/:id", async (request, response) => {
  try {
    const playlistId = Number(request.params.id);

    if (!Number.isInteger(playlistId) || playlistId <= 0) {
      response.status(400).json({
        message: "ID de playlist inválido",
      });

      return;
    }

    const playlist = await prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },

      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },

        songs: {
          orderBy: {
            position: "asc",
          },

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
        },
      },
    });

    if (!playlist) {
      response.status(404).json({
        message: "Playlist não encontrada",
      });

      return;
    }

    response.json(playlist);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /playlists
// Cria uma nova playlist.
//
// Toda playlist pertence obrigatoriamente a um usuário.
// ------------------------------------------------------

router.post("/playlists", async (request, response) => {
  try {
    const { userId, name, description, coverUrl, isPublic } = request.body;

    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      response.status(400).json({
        message: "userId inválido",
      });

      return;
    }

    if (typeof name !== "string" || !name.trim()) {
      response.status(400).json({
        message: "O nome da playlist é obrigatório",
      });

      return;
    }

    if (isPublic !== undefined && typeof isPublic !== "boolean") {
      response.status(400).json({
        message: "isPublic precisa ser true ou false",
      });

      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: parsedUserId,
      },
    });

    if (!user) {
      response.status(404).json({
        message: "Usuário não encontrado",
      });

      return;
    }

    const playlist = await prisma.playlist.create({
      data: {
        userId: parsedUserId,
        name: name.trim(),

        description:
          typeof description === "string" ? description.trim() || null : null,

        coverUrl: typeof coverUrl === "string" ? coverUrl.trim() || null : null,

        isPublic: isPublic ?? false,
      },

      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },

        songs: true,
      },
    });

    response.status(201).json(playlist);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// PATCH /playlists/:id
// Atualiza parcialmente uma playlist.
//
// Pode alterar:
// - name
// - description
// - coverUrl
// - isPublic
// ------------------------------------------------------

router.patch("/playlists/:id", async (request, response) => {
  try {
    const playlistId = Number(request.params.id);

    const { name, description, coverUrl, isPublic } = request.body;

    if (!Number.isInteger(playlistId) || playlistId <= 0) {
      response.status(400).json({
        message: "ID de playlist inválido",
      });

      return;
    }

    if (
      name === undefined &&
      description === undefined &&
      coverUrl === undefined &&
      isPublic === undefined
    ) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    const existingPlaylist = await prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },
    });

    if (!existingPlaylist) {
      response.status(404).json({
        message: "Playlist não encontrada",
      });

      return;
    }

    const data: Prisma.PlaylistUpdateInput = {};

    // -------------------------
    // Nome
    // -------------------------

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        response.status(400).json({
          message: "O nome da playlist não pode ser vazio",
        });

        return;
      }

      data.name = name.trim();
    }

    // -------------------------
    // Descrição
    // -------------------------

    if (description !== undefined) {
      if (description !== null && typeof description !== "string") {
        response.status(400).json({
          message: "description inválida",
        });

        return;
      }

      data.description =
        description === null ? null : description.trim() || null;
    }

    // -------------------------
    // Capa
    // -------------------------

    if (coverUrl !== undefined) {
      if (coverUrl !== null && typeof coverUrl !== "string") {
        response.status(400).json({
          message: "coverUrl inválida",
        });

        return;
      }

      data.coverUrl = coverUrl === null ? null : coverUrl.trim() || null;
    }

    // -------------------------
    // Privacidade
    // -------------------------

    if (isPublic !== undefined) {
      if (typeof isPublic !== "boolean") {
        response.status(400).json({
          message: "isPublic precisa ser true ou false",
        });

        return;
      }

      data.isPublic = isPublic;
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: {
        id: playlistId,
      },

      data,

      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },

        songs: {
          orderBy: {
            position: "asc",
          },

          include: {
            song: true,
          },
        },
      },
    });

    response.json(updatedPlaylist);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /playlists/:id
// Remove uma playlist.
//
// As músicas não são apagadas.
// Apenas as relações PlaylistSong são removidas.
// ------------------------------------------------------

router.delete("/playlists/:id", async (request, response) => {
  try {
    const playlistId = Number(request.params.id);

    if (!Number.isInteger(playlistId) || playlistId <= 0) {
      response.status(400).json({
        message: "ID de playlist inválido",
      });

      return;
    }

    const playlist = await prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },
    });

    if (!playlist) {
      response.status(404).json({
        message: "Playlist não encontrada",
      });

      return;
    }

    await prisma.playlist.delete({
      where: {
        id: playlistId,
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

// ======================================================
// MÚSICAS DA PLAYLIST
// ======================================================

// ------------------------------------------------------
// POST /playlists/:id/songs
// Adiciona uma música à playlist.
//
// A posição é calculada automaticamente.
// ------------------------------------------------------

router.post("/playlists/:id/songs", async (request, response) => {
  try {
    const playlistId = Number(request.params.id);
    const songId = Number(request.body.songId);

    if (!Number.isInteger(playlistId) || playlistId <= 0) {
      response.status(400).json({
        message: "ID de playlist inválido",
      });

      return;
    }

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "songId inválido",
      });

      return;
    }

    // Confirma se a playlist existe.
    const playlist = await prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },
    });

    if (!playlist) {
      response.status(404).json({
        message: "Playlist não encontrada",
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

    // Verifica se a música já está na playlist.
    const existingPlaylistSong = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId,
          songId,
        },
      },
    });

    if (existingPlaylistSong) {
      response.status(409).json({
        message: "A música já está nesta playlist",
      });

      return;
    }

    // Descobre a última posição atual.
    const lastSong = await prisma.playlistSong.findFirst({
      where: {
        playlistId,
      },

      orderBy: {
        position: "desc",
      },
    });

    // Se a playlist estiver vazia, começa em 1.
    const nextPosition = lastSong ? lastSong.position + 1 : 1;

    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        position: nextPosition,
      },

      include: {
        song: {
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

    response.status(201).json(playlistSong);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /playlists/:playlistId/songs/:songId
// Remove uma música da playlist.
//
// Depois da remoção, reorganiza automaticamente
// as posições das músicas seguintes.
// ------------------------------------------------------

router.delete(
  "/playlists/:playlistId/songs/:songId",
  async (request, response) => {
    try {
      const playlistId = Number(request.params.playlistId);
      const songId = Number(request.params.songId);

      if (
        !Number.isInteger(playlistId) ||
        playlistId <= 0 ||
        !Number.isInteger(songId) ||
        songId <= 0
      ) {
        response.status(400).json({
          message: "ID de playlist ou música inválido",
        });

        return;
      }

      const playlistSong = await prisma.playlistSong.findUnique({
        where: {
          playlistId_songId: {
            playlistId,
            songId,
          },
        },
      });

      if (!playlistSong) {
        response.status(404).json({
          message: "A música não está nesta playlist",
        });

        return;
      }

      const removedPosition = playlistSong.position;

      // As duas operações precisam acontecer juntas:
      //
      // 1. remove a música
      // 2. diminui a posição das músicas seguintes
      //
      // Por isso usamos uma transaction.
      await prisma.$transaction([
        prisma.playlistSong.delete({
          where: {
            playlistId_songId: {
              playlistId,
              songId,
            },
          },
        }),

        prisma.playlistSong.updateMany({
          where: {
            playlistId,

            position: {
              gt: removedPosition,
            },
          },

          data: {
            position: {
              decrement: 1,
            },
          },
        }),
      ]);

      response.json({
        message: "Música removida da playlist",
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
