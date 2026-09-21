// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";
import bcrypt from "bcryptjs";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

// ======================================================
// ROTAS DE USUÁRIOS
// ======================================================

// ------------------------------------------------------
// GET /users
//
// Lista todos os usuários.
//
// Rota pública.
//
// Não retorna passwordHash.
// ------------------------------------------------------

router.get("/users", async (request, response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        bio: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    response.json(users);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /users/:id
//
// Busca um usuário específico pelo ID.
//
// Rota pública.
//
// Não retorna passwordHash.
// ------------------------------------------------------

router.get("/users/:id", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    // --------------------------------------------------
    // Validação do ID
    // --------------------------------------------------

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Busca do usuário
    // --------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        username: true,
        bio: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      response.status(404).json({
        message: "Usuário não encontrado",
      });

      return;
    }

    response.json(user);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /users
//
// Cria um novo usuário.
//
// Rota pública.
// ------------------------------------------------------

router.post("/users", async (request, response) => {
  try {
    const { username, email, password } = request.body;

    // --------------------------------------------------
    // Validação dos campos obrigatórios
    // --------------------------------------------------

    if (!username || !email || !password) {
      response.status(400).json({
        message: "Username, email e password são obrigatórios",
      });

      return;
    }

    // --------------------------------------------------
    // Criação do hash da senha
    // --------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 10);

    // --------------------------------------------------
    // Criação do usuário
    // --------------------------------------------------

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },

      // passwordHash nunca volta para o cliente.
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    // 201 = recurso criado.
    response.status(201).json(user);
  } catch (error) {
    // --------------------------------------------------
    // Username ou email duplicado
    // --------------------------------------------------

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        message: "Username ou email já cadastrado",
      });

      return;
    }

    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// PATCH /users/:id
//
// Atualiza parcialmente os dados de um usuário.
//
// Rota protegida.
//
// O usuário autenticado somente pode alterar
// a própria conta.
//
// Pode alterar:
// - username
// - email
// - password
// - bio
// - profileImageUrl
// ------------------------------------------------------

router.patch("/users/:id", authMiddleware, async (request, response) => {
  try {
    const userId = Number(request.params.id);

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------
    //
    // request.userId vem do JWT validado pelo
    // authMiddleware.
    //
    // O usuário só pode alterar a própria conta.
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    if (authenticatedUserId !== userId) {
      response.status(403).json({
        message: "Você não tem permissão para alterar este usuário",
      });

      return;
    }

    // ------------------------------------------------
    // Dados recebidos
    // ------------------------------------------------

    const { username, email, password, bio, profileImageUrl } = request.body;

    // ------------------------------------------------
    // É necessário enviar pelo menos um campo
    // ------------------------------------------------

    if (
      username === undefined &&
      email === undefined &&
      password === undefined &&
      bio === undefined &&
      profileImageUrl === undefined
    ) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se o usuário existe
    // ------------------------------------------------

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      response.status(404).json({
        message: "Usuário não encontrado",
      });

      return;
    }

    // ------------------------------------------------
    // Monta somente os campos enviados
    // ------------------------------------------------

    const data: Prisma.UserUpdateInput = {};

    // Username
    if (username !== undefined) {
      if (!username) {
        response.status(400).json({
          message: "Username não pode ser vazio",
        });

        return;
      }

      data.username = username;
    }

    // Email
    if (email !== undefined) {
      if (!email) {
        response.status(400).json({
          message: "Email não pode ser vazio",
        });

        return;
      }

      data.email = email;
    }

    // Bio
    if (bio !== undefined) {
      data.bio = bio;
    }

    // Imagem de perfil
    if (profileImageUrl !== undefined) {
      data.profileImageUrl = profileImageUrl;
    }

    // Password
    if (password !== undefined) {
      if (!password) {
        response.status(400).json({
          message: "Password não pode ser vazio",
        });

        return;
      }

      data.passwordHash = await bcrypt.hash(password, 10);
    }

    // ------------------------------------------------
    // Atualização
    // ------------------------------------------------

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

      data,

      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    response.json(updatedUser);
  } catch (error) {
    // ------------------------------------------------
    // Username ou email duplicado
    // ------------------------------------------------

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        message: "Username ou email já cadastrado",
      });

      return;
    }

    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /users/:id
//
// Remove um usuário comum.
//
// Rota protegida.
//
// O usuário autenticado somente pode excluir
// a própria conta.
//
// Usuários que possuem perfil Artist ainda não podem
// ser removidos por esta rota.
// ------------------------------------------------------

router.delete("/users/:id", authMiddleware, async (request, response) => {
  try {
    const userId = Number(request.params.id);

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    if (authenticatedUserId !== userId) {
      response.status(403).json({
        message: "Você não tem permissão para remover este usuário",
      });

      return;
    }

    // ------------------------------------------------
    // Busca do usuário
    // ------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      include: {
        artist: true,
      },
    });

    if (!user) {
      response.status(404).json({
        message: "Usuário não encontrado",
      });

      return;
    }

    // ------------------------------------------------
    // Proteção para perfil de artista
    // ------------------------------------------------
    //
    // Ainda não definimos a regra definitiva para
    // excluir artistas e todo o conteúdo relacionado.
    // ------------------------------------------------

    if (user.artist) {
      response.status(409).json({
        message:
          "Usuários com perfil de artista não podem ser removidos por esta rota",
      });

      return;
    }

    // ------------------------------------------------
    // Exclusão
    // ------------------------------------------------

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    // 204 = sucesso sem conteúdo.
    response.status(204).send();
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /users/:id/become-artist
//
// Transforma um usuário comum em artista.
//
// Rota protegida.
//
// O usuário autenticado somente pode transformar
// a própria conta em artista.
//
// Regra:
// o perfil Artist é criado junto com sua primeira música.
//
// Artist + Song + SongArtist são criados dentro
// da mesma transação.
// ------------------------------------------------------

router.post(
  "/users/:id/become-artist",
  authMiddleware,
  async (request, response) => {
    try {
      const userId = Number(request.params.id);

      // ------------------------------------------------
      // Validação do ID
      // ------------------------------------------------

      if (!Number.isInteger(userId) || userId <= 0) {
        response.status(400).json({
          message: "ID de usuário inválido",
        });

        return;
      }

      // ------------------------------------------------
      // Autorização
      // ------------------------------------------------

      const authenticatedUserId = request.userId!;

      if (authenticatedUserId !== userId) {
        response.status(403).json({
          message:
            "Você não tem permissão para transformar este usuário em artista",
        });

        return;
      }

      // ------------------------------------------------
      // Dados recebidos
      // ------------------------------------------------

      const { artistName, title, duration, audioUrl, coverUrl } = request.body;

      const songDuration = Number(duration);

      // ------------------------------------------------
      // Validação dos campos
      // ------------------------------------------------

      if (
        !artistName ||
        !title ||
        Number.isNaN(songDuration) ||
        songDuration <= 0 ||
        !audioUrl
      ) {
        response.status(400).json({
          message:
            "artistName, title, duration e audioUrl são obrigatórios e válidos",
        });

        return;
      }

      // ------------------------------------------------
      // Confirma se o usuário existe
      // ------------------------------------------------

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

      // ------------------------------------------------
      // Verifica se já possui perfil de artista
      // ------------------------------------------------

      const existingArtist = await prisma.artist.findUnique({
        where: {
          userId,
        },
      });

      if (existingArtist) {
        response.status(409).json({
          message: "Este usuário já possui um perfil de artista",
        });

        return;
      }

      // ==================================================
      // TRANSAÇÃO
      // ==================================================
      //
      // As três operações precisam funcionar juntas:
      //
      // 1. criar Artist
      // 2. criar Song
      // 3. criar SongArtist
      //
      // Se alguma operação falhar, todas são desfeitas.
      // ==================================================

      const result = await prisma.$transaction(async (tx) => {
        // ----------------------------------------------
        // 1. Cria o perfil de artista
        // ----------------------------------------------

        const artist = await tx.artist.create({
          data: {
            userId,
            name: artistName,
          },
        });

        // ----------------------------------------------
        // 2. Cria a primeira música
        // ----------------------------------------------

        const song = await tx.song.create({
          data: {
            title,
            duration: songDuration,
            audioUrl,

            // Prisma aceita string ou null.
            coverUrl: coverUrl ?? null,
          },
        });

        // ----------------------------------------------
        // 3. Relaciona artista e música
        // ----------------------------------------------

        await tx.songArtist.create({
          data: {
            artistId: artist.id,
            songId: song.id,
            role: "main",
          },
        });

        return {
          artist,
          song,
        };
      });

      response.status(201).json(result);
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
