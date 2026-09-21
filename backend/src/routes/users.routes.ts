// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";
import bcrypt from "bcryptjs";

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
// Lista todos os usuários.
// Não retorna passwordHash.
// ------------------------------------------------------

router.get("/users", async (request, response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
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
// Busca um usuário específico pelo ID.
// ------------------------------------------------------

router.get("/users/:id", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    // Verifica se o ID recebido é um número válido.
    if (Number.isNaN(userId)) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        username: true,
        email: true,
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
// Cria um novo usuário.
// ------------------------------------------------------

router.post("/users", async (request, response) => {
  try {
    const { username, email, password } = request.body;

    // Verifica se todos os campos obrigatórios foram enviados.
    if (!username || !email || !password) {
      response.status(400).json({
        message: "Username, email e password são obrigatórios",
      });

      return;
    }

    // Transforma a senha em hash antes de salvar no banco.
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria o usuário no PostgreSQL através do Prisma.
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },

      // Define quais informações podem voltar para o cliente.
      // passwordHash nunca é retornado.
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        profileImageUrl: true,
        createdAt: true,
      },
    });

    // 201 = recurso criado com sucesso.
    response.status(201).json(user);
  } catch (error) {
    // P2002 = tentativa de duplicar um campo @unique.
    //
    // No nosso User:
    // username é único
    // email é único
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
// Atualiza parcialmente os dados de um usuário.
//
// Pode alterar:
// - username
// - email
// - password
// - bio
// - profileImageUrl
// ------------------------------------------------------

router.patch("/users/:id", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    const { username, email, password, bio, profileImageUrl } = request.body;

    if (Number.isNaN(userId)) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

    // É necessário enviar pelo menos um campo.
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

    // Confirma se o usuário existe.
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

    // Objeto que receberá somente os campos enviados.
    const data: Prisma.UserUpdateInput = {};

    if (username !== undefined) {
      if (!username) {
        response.status(400).json({
          message: "Username não pode ser vazio",
        });

        return;
      }

      data.username = username;
    }

    if (email !== undefined) {
      if (!email) {
        response.status(400).json({
          message: "Email não pode ser vazio",
        });

        return;
      }

      data.email = email;
    }

    if (bio !== undefined) {
      data.bio = bio;
    }

    if (profileImageUrl !== undefined) {
      data.profileImageUrl = profileImageUrl;
    }

    // Caso uma nova senha seja enviada,
    // geramos outro hash antes de atualizar.
    if (password !== undefined) {
      if (!password) {
        response.status(400).json({
          message: "Password não pode ser vazio",
        });

        return;
      }

      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

      data,

      // Novamente não retornamos passwordHash.
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
    // Impede username ou email duplicado.
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
// Remove um usuário comum.
//
// Por enquanto, usuários que já possuem perfil Artist
// não podem ser removidos por esta rota.
// ------------------------------------------------------

router.delete("/users/:id", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    if (Number.isNaN(userId)) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

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

    // Ainda não definimos a regra definitiva para apagar
    // artistas e todas as músicas relacionadas a eles.
    //
    // Por segurança, bloqueamos essa exclusão por enquanto.
    if (user.artist) {
      response.status(409).json({
        message:
          "Usuários com perfil de artista não podem ser removidos por esta rota",
      });

      return;
    }

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    // 204 = operação concluída com sucesso,
    // mas sem conteúdo na resposta.
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
// Regra:
// o perfil Artist é criado junto com sua primeira música.
//
// Artist + Song + SongArtist são criados
// dentro da mesma transação.
// ------------------------------------------------------

router.post("/users/:id/become-artist", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    const { artistName, title, duration, audioUrl, coverUrl } = request.body;

    // Converte duration explicitamente para número.
    const songDuration = Number(duration);

    // Valida o ID recebido pela URL.
    if (Number.isNaN(userId)) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

    // Valida os campos obrigatórios.
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

    // Procura o usuário no banco.
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

    // Verifica se o usuário já possui perfil de artista.
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
    // Tudo precisa funcionar:
    //
    // 1. criar Artist
    // 2. criar Song
    // 3. criar SongArtist
    //
    // Se alguma operação falhar,
    // todas são desfeitas.
    // ==================================================

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cria o perfil de artista.
      const artist = await tx.artist.create({
        data: {
          userId,
          name: artistName,
        },
      });

      // 2. Cria a primeira música.
      const song = await tx.song.create({
        data: {
          title,
          duration: songDuration,
          audioUrl,

          // Prisma aceita string ou null.
          // Evita enviar undefined.
          coverUrl: coverUrl ?? null,
        },
      });

      // 3. Relaciona o artista com a música.
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
});

// ======================================================
// EXPORTAÇÃO
// ======================================================

export default router;
