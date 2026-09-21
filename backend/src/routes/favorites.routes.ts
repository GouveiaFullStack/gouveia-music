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
// ROTAS DE FAVORITOS
// ======================================================

// ------------------------------------------------------
// GET /users/:id/favorites
// Lista todas as músicas favoritas de um usuário.
//
// Ordena pelos favoritos mais recentes primeiro.
// ------------------------------------------------------

router.get(
  "/users/:id/favorites",
  authMiddleware,
  async (request, response) => {
    try {
      const userId = Number(request.params.id);

      if (!Number.isInteger(userId) || userId <= 0) {
        response.status(400).json({
          message: "ID de usuário inválido",
        });

        return;
      }

      const authenticatedUserId = request.userId!;

      if (authenticatedUserId !== userId) {
        response.status(403).json({
          message: "Você não tem permissão para acessar estes favoritos",
        });

        return;
      }

      // Primeiro confirmamos se o usuário existe.
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

      const favorites = await prisma.favorite.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
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
      });

      response.json(favorites);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ------------------------------------------------------
// POST /users/:id/favorites
// Adiciona uma música aos favoritos de um usuário.
//
// Body:
// {
//   "songId": 1
// }
// ------------------------------------------------------

router.post(
  "/users/:id/favorites",
  authMiddleware,
  async (request, response) => {
    try {
      const userId = Number(request.params.id);
      const songId = Number(request.body.songId);

      if (!Number.isInteger(userId) || userId <= 0) {
        response.status(400).json({
          message: "ID de usuário inválido",
        });

        return;
      }

      const authenticatedUserId = request.userId!;

      if (authenticatedUserId !== userId) {
        response.status(403).json({
          message: "Você não tem permissão para alterar estes favoritos",
        });

        return;
      }

      if (!Number.isInteger(songId) || songId <= 0) {
        response.status(400).json({
          message: "songId inválido",
        });

        return;
      }

      // Confirma se o usuário existe.
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

      const favorite = await prisma.favorite.create({
        data: {
          userId,
          songId,
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
      });

      response.status(201).json(favorite);
    } catch (error) {
      // No schema temos:
      //
      // @@unique([userId, songId])
      //
      // Portanto, o mesmo usuário não pode favoritar
      // a mesma música duas vezes.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        response.status(409).json({
          message: "Esta música já está nos favoritos do usuário",
        });

        return;
      }

      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ------------------------------------------------------
// DELETE /users/:userId/favorites/:songId
// Remove uma música dos favoritos do usuário.
// ------------------------------------------------------

router.delete(
  "/users/:userId/favorites/:songId",
  authMiddleware,
  async (request, response) => {
    try {
      const userId = Number(request.params.userId);
      const songId = Number(request.params.songId);

      if (!Number.isInteger(userId) || userId <= 0) {
        response.status(400).json({
          message: "ID de usuário inválido",
        });

        return;
      }

      const authenticatedUserId = request.userId!;

      if (authenticatedUserId !== userId) {
        response.status(403).json({
          message: "Você não tem permissão para alterar estes favoritos",
        });

        return;
      }

      if (!Number.isInteger(songId) || songId <= 0) {
        response.status(400).json({
          message: "ID de música inválido",
        });

        return;
      }

      // Como Favorite possui uma chave única composta:
      //
      // @@unique([userId, songId])
      //
      // podemos procurar diretamente pela combinação.
      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_songId: {
            userId,
            songId,
          },
        },
      });

      if (!favorite) {
        response.status(404).json({
          message: "A música não está nos favoritos do usuário",
        });

        return;
      }

      await prisma.favorite.delete({
        where: {
          userId_songId: {
            userId,
            songId,
          },
        },
      });

      response.status(204).send();
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
