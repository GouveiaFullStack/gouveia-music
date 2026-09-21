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
// SEGUIR ARTISTAS
// ======================================================

// ------------------------------------------------------
// GET /users/:id/following/artists
// Lista os artistas seguidos por um usuário.
// ------------------------------------------------------

router.get("/users/:id/following/artists", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
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

    const followedArtists = await prisma.userArtistFollow.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        artist: true,
      },
    });

    response.json(followedArtists);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /artists/:id/followers
// Lista os usuários que seguem um artista.
// ------------------------------------------------------

router.get("/artists/:id/followers", async (request, response) => {
  try {
    const artistId = Number(request.params.id);

    if (!Number.isInteger(artistId) || artistId <= 0) {
      response.status(400).json({
        message: "ID de artista inválido",
      });

      return;
    }

    const artist = await prisma.artist.findUnique({
      where: {
        id: artistId,
      },
    });

    if (!artist) {
      response.status(404).json({
        message: "Artista não encontrado",
      });

      return;
    }

    const followers = await prisma.userArtistFollow.findMany({
      where: {
        artistId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        user: {
          select: {
            id: true,
            username: true,
            bio: true,
            profileImageUrl: true,
            createdAt: true,
          },
        },
      },
    });

    response.json(followers);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /users/:userId/following/artists/:artistId
// Usuário começa a seguir um artista.
// ------------------------------------------------------

router.post(
  "/users/:userId/following/artists/:artistId",
  async (request, response) => {
    try {
      const userId = Number(request.params.userId);
      const artistId = Number(request.params.artistId);

      if (!Number.isInteger(userId) || userId <= 0) {
        response.status(400).json({
          message: "ID de usuário inválido",
        });

        return;
      }

      if (!Number.isInteger(artistId) || artistId <= 0) {
        response.status(400).json({
          message: "ID de artista inválido",
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

      // Confirma se o artista existe.
      const artist = await prisma.artist.findUnique({
        where: {
          id: artistId,
        },
      });

      if (!artist) {
        response.status(404).json({
          message: "Artista não encontrado",
        });

        return;
      }

      const follow = await prisma.userArtistFollow.create({
        data: {
          userId,
          artistId,
        },

        include: {
          artist: true,
        },
      });

      response.status(201).json(follow);
    } catch (error) {
      // userId + artistId formam a chave da relação.
      // Portanto, o usuário não pode seguir o mesmo
      // artista duas vezes.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        response.status(409).json({
          message: "O usuário já segue este artista",
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
// DELETE /users/:userId/following/artists/:artistId
// Usuário deixa de seguir um artista.
// ------------------------------------------------------

router.delete(
  "/users/:userId/following/artists/:artistId",
  async (request, response) => {
    try {
      const userId = Number(request.params.userId);
      const artistId = Number(request.params.artistId);

      if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        !Number.isInteger(artistId) ||
        artistId <= 0
      ) {
        response.status(400).json({
          message: "ID de usuário ou artista inválido",
        });

        return;
      }

      const follow = await prisma.userArtistFollow.findUnique({
        where: {
          userId_artistId: {
            userId,
            artistId,
          },
        },
      });

      if (!follow) {
        response.status(404).json({
          message: "O usuário não segue este artista",
        });

        return;
      }

      await prisma.userArtistFollow.delete({
        where: {
          userId_artistId: {
            userId,
            artistId,
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
// SEGUIR USUÁRIOS
// ======================================================

// ------------------------------------------------------
// GET /users/:id/following/users
// Lista os usuários que este usuário segue.
// ------------------------------------------------------

router.get("/users/:id/following/users", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
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

    const following = await prisma.userFollow.findMany({
      where: {
        followerId: userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        following: {
          select: {
            id: true,
            username: true,
            bio: true,
            profileImageUrl: true,
            createdAt: true,
          },
        },
      },
    });

    response.json(following);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /users/:id/followers
// Lista quem segue determinado usuário.
// ------------------------------------------------------

router.get("/users/:id/followers", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
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

    const followers = await prisma.userFollow.findMany({
      where: {
        followingId: userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        follower: {
          select: {
            id: true,
            username: true,
            bio: true,
            profileImageUrl: true,
            createdAt: true,
          },
        },
      },
    });

    response.json(followers);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /users/:followerId/following/users/:followingId
// Um usuário começa a seguir outro usuário.
// ------------------------------------------------------

router.post(
  "/users/:followerId/following/users/:followingId",
  async (request, response) => {
    try {
      const followerId = Number(request.params.followerId);
      const followingId = Number(request.params.followingId);

      if (
        !Number.isInteger(followerId) ||
        followerId <= 0 ||
        !Number.isInteger(followingId) ||
        followingId <= 0
      ) {
        response.status(400).json({
          message: "ID de usuário inválido",
        });

        return;
      }

      // Um usuário não pode seguir a si mesmo.
      if (followerId === followingId) {
        response.status(400).json({
          message: "Um usuário não pode seguir a si mesmo",
        });

        return;
      }

      // Confirma se quem está seguindo existe.
      const follower = await prisma.user.findUnique({
        where: {
          id: followerId,
        },
      });

      if (!follower) {
        response.status(404).json({
          message: "Usuário seguidor não encontrado",
        });

        return;
      }

      // Confirma se o usuário que será seguido existe.
      const following = await prisma.user.findUnique({
        where: {
          id: followingId,
        },
      });

      if (!following) {
        response.status(404).json({
          message: "Usuário a ser seguido não encontrado",
        });

        return;
      }

      const follow = await prisma.userFollow.create({
        data: {
          followerId,
          followingId,
        },

        include: {
          following: {
            select: {
              id: true,
              username: true,
              bio: true,
              profileImageUrl: true,
              createdAt: true,
            },
          },
        },
      });

      response.status(201).json(follow);
    } catch (error) {
      // followerId + followingId formam uma chave
      // composta. Impede seguir a mesma pessoa duas vezes.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        response.status(409).json({
          message: "O usuário já segue esta pessoa",
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
// DELETE /users/:followerId/following/users/:followingId
// Um usuário deixa de seguir outro usuário.
// ------------------------------------------------------

router.delete(
  "/users/:followerId/following/users/:followingId",
  async (request, response) => {
    try {
      const followerId = Number(request.params.followerId);
      const followingId = Number(request.params.followingId);

      if (
        !Number.isInteger(followerId) ||
        followerId <= 0 ||
        !Number.isInteger(followingId) ||
        followingId <= 0
      ) {
        response.status(400).json({
          message: "ID de usuário inválido",
        });

        return;
      }

      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (!follow) {
        response.status(404).json({
          message: "O usuário não segue esta pessoa",
        });

        return;
      }

      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
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
