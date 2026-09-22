// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware.js";
import { createImageUpload } from "../config/upload.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  removeLocalUploadByUrl,
  removeUploadedFile,
} from "../lib/upload-files.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();
const playlistCoverUpload = createImageUpload("playlist-covers");

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
      where: {
        isPublic: true,
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

router.get(
  "/playlists/:id",
  optionalAuthMiddleware,
  async (request, response) => {
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

      if (!playlist.isPublic && request.userId !== playlist.userId) {
        response.status(403).json({
          message: "Você não tem permissão para acessar esta playlist",
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
  },
);

// ------------------------------------------------------
// POST /playlists
// Cria uma nova playlist.
//
// Toda playlist pertence obrigatoriamente a um usuário.
// ------------------------------------------------------

router.post("/playlists", authMiddleware, async (request, response) => {
  try {
    const { name, description, isPublic } = request.body;

    const userId = request.userId!;

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
        id: userId,
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
        userId,
        name: name.trim(),

        description:
          typeof description === "string" ? description.trim() || null : null,

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
// PATCH /playlists/:id/cover
//
// Atualiza a capa da playlist.
//
// Rota protegida.
//
// Somente o proprietário da playlist pode alterar
// sua capa.
//
// Content-Type:
// multipart/form-data
//
// Campo:
// image
// ------------------------------------------------------

router.patch(
  "/playlists/:id/cover",

  authMiddleware,

  // ----------------------------------------------------
  // AUTORIZAÇÃO ANTES DO UPLOAD
  // ----------------------------------------------------

  async (request, response, next) => {
    try {
      const playlistId = Number(request.params.id);

      // ------------------------------------------------
      // Validação do ID
      // ------------------------------------------------

      if (!Number.isInteger(playlistId) || playlistId <= 0) {
        response.status(400).json({
          message: "ID de playlist inválido",
        });

        return;
      }

      // ------------------------------------------------
      // Busca da playlist
      // ------------------------------------------------

      const playlist = await prisma.playlist.findUnique({
        where: {
          id: playlistId,
        },

        select: {
          id: true,
          userId: true,
        },
      });

      if (!playlist) {
        response.status(404).json({
          message: "Playlist não encontrada",
        });

        return;
      }

      // ------------------------------------------------
      // Autorização
      // ------------------------------------------------

      const authenticatedUserId = request.userId!;

      if (playlist.userId !== authenticatedUserId) {
        response.status(403).json({
          message: "Você não tem permissão para alterar esta playlist",
        });

        return;
      }

      next();
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },

  // ----------------------------------------------------
  // UPLOAD
  // ----------------------------------------------------

  playlistCoverUpload.single("image"),

  // ----------------------------------------------------
  // ATUALIZAÇÃO
  // ----------------------------------------------------

  async (request, response) => {
    try {
      const playlistId = Number(request.params.id);

      // ------------------------------------------------
      // Arquivo obrigatório
      // ------------------------------------------------

      if (!request.file) {
        response.status(400).json({
          message: "Envie uma imagem JPEG, PNG ou WEBP",
        });

        return;
      }

      // ------------------------------------------------
      // Busca a capa anterior
      // ------------------------------------------------

      const existingPlaylist = await prisma.playlist.findUnique({
        where: {
          id: playlistId,
        },

        select: {
          id: true,
          coverUrl: true,
        },
      });

      if (!existingPlaylist) {
        await removeUploadedFile(request.file.path);

        response.status(404).json({
          message: "Playlist não encontrada",
        });

        return;
      }

      // ------------------------------------------------
      // Nova URL
      // ------------------------------------------------

      const coverUrl = `/uploads/playlist-covers/${request.file.filename}`;

      // ------------------------------------------------
      // Atualiza banco
      // ------------------------------------------------

      const updatedPlaylist = await prisma.playlist.update({
        where: {
          id: playlistId,
        },

        data: {
          coverUrl,
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
              song: true,
            },
          },
        },
      });

      // ------------------------------------------------
      // Remove a capa anterior
      // ------------------------------------------------

      await removeLocalUploadByUrl(existingPlaylist.coverUrl);

      response.json(updatedPlaylist);
    } catch (error) {
      // Se o arquivo foi salvo, mas o Prisma falhou,
      // removemos a nova capa.

      if (request.file) {
        await removeUploadedFile(request.file.path);
      }

      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ------------------------------------------------------
// DELETE /playlists/:id/cover
//
// Remove somente a capa da playlist.
//
// A playlist continua existindo.
// coverUrl volta para null.
// ------------------------------------------------------

router.delete(
  "/playlists/:id/cover",

  authMiddleware,

  async (request, response) => {
    try {
      const playlistId = Number(request.params.id);

      // ------------------------------------------------
      // Validação do ID
      // ------------------------------------------------

      if (!Number.isInteger(playlistId) || playlistId <= 0) {
        response.status(400).json({
          message: "ID de playlist inválido",
        });

        return;
      }

      // ------------------------------------------------
      // Busca da playlist
      // ------------------------------------------------

      const playlist = await prisma.playlist.findUnique({
        where: {
          id: playlistId,
        },

        select: {
          id: true,
          userId: true,
          coverUrl: true,
        },
      });

      if (!playlist) {
        response.status(404).json({
          message: "Playlist não encontrada",
        });

        return;
      }

      // ------------------------------------------------
      // Autorização
      // ------------------------------------------------

      const authenticatedUserId = request.userId!;

      if (playlist.userId !== authenticatedUserId) {
        response.status(403).json({
          message: "Você não tem permissão para alterar esta playlist",
        });

        return;
      }

      // ------------------------------------------------
      // Sem capa
      // ------------------------------------------------

      if (!playlist.coverUrl) {
        response.status(404).json({
          message: "A playlist não possui capa",
        });

        return;
      }

      const oldCoverUrl = playlist.coverUrl;

      // ------------------------------------------------
      // Banco primeiro
      // ------------------------------------------------

      await prisma.playlist.update({
        where: {
          id: playlistId,
        },

        data: {
          coverUrl: null,
        },
      });

      // ------------------------------------------------
      // Arquivo depois
      // ------------------------------------------------

      await removeLocalUploadByUrl(oldCoverUrl);

      response.status(204).send();
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ------------------------------------------------------
// PATCH /playlists/:id
// Atualiza parcialmente uma playlist.
//
// Pode alterar:
// - name
// - description
// - isPublic
//
// A capa é alterada por:
// PATCH /playlists/:id/cover
// ------------------------------------------------------

router.patch("/playlists/:id", authMiddleware, async (request, response) => {
  try {
    const playlistId = Number(request.params.id);

    const { name, description, isPublic } = request.body;

    if (!Number.isInteger(playlistId) || playlistId <= 0) {
      response.status(400).json({
        message: "ID de playlist inválido",
      });

      return;
    }

    if (
      name === undefined &&
      description === undefined &&
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

    const authenticatedUserId = request.userId!;

    if (existingPlaylist.userId !== authenticatedUserId) {
      response.status(403).json({
        message: "Você não tem permissão para alterar esta playlist",
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

router.delete("/playlists/:id", authMiddleware, async (request, response) => {
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

    const authenticatedUserId = request.userId!;

    if (playlist.userId !== authenticatedUserId) {
      response.status(403).json({
        message: "Você não tem permissão para remover esta playlist",
      });

      return;
    }

    await prisma.playlist.delete({
      where: {
        id: playlistId,
      },
    });

    // --------------------------------------------------
    // REMOVE CAPA LOCAL
    // --------------------------------------------------

    await removeLocalUploadByUrl(playlist.coverUrl);

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

router.post(
  "/playlists/:id/songs",
  authMiddleware,
  async (request, response) => {
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

      const authenticatedUserId = request.userId!;

      if (playlist.userId !== authenticatedUserId) {
        response.status(403).json({
          message:
            "Você não tem permissão para adicionar músicas a esta playlist",
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
  },
);

// ------------------------------------------------------
// DELETE /playlists/:playlistId/songs/:songId
// Remove uma música da playlist.
//
// Depois da remoção, reorganiza automaticamente
// as posições das músicas seguintes.
// ------------------------------------------------------

router.delete(
  "/playlists/:playlistId/songs/:songId",
  authMiddleware,
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

      const authenticatedUserId = request.userId!;

      if (playlist.userId !== authenticatedUserId) {
        response.status(403).json({
          message: "Você não tem permissão para remover músicas desta playlist",
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
