// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { createAccessToken } from "../lib/jwt.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

// ======================================================
// LOGIN
// ======================================================

// ------------------------------------------------------
// POST /auth/login
//
// Body:
//
// {
//   "email": "usuario@email.com",
//   "password": "123456"
// }
// ------------------------------------------------------

router.post("/auth/login", async (request, response) => {
  try {
    const { email, password } = request.body as {
      email?: string;
      password?: string;
    };

    // --------------------------------------------------
    // Validação dos campos
    // --------------------------------------------------

    if (!email || !password) {
      response.status(400).json({
        message: "Email e senha são obrigatórios",
      });

      return;
    }

    // --------------------------------------------------
    // Busca o usuário
    // --------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // Não informamos se foi o email ou a senha que falhou.
    //
    // Isso evita revelar se determinado email possui uma
    // conta cadastrada.
    if (!user) {
      response.status(401).json({
        message: "Email ou senha inválidos",
      });

      return;
    }

    // --------------------------------------------------
    // Confere a senha
    // --------------------------------------------------

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      response.status(401).json({
        message: "Email ou senha inválidos",
      });

      return;
    }

    // --------------------------------------------------
    // Gera o JWT
    // --------------------------------------------------

    const token = createAccessToken(user.id);

    // --------------------------------------------------
    // Resposta
    // --------------------------------------------------

    response.json({
      token,

      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ======================================================
// USUÁRIO AUTENTICADO
// ======================================================

router.get("/auth/me", authMiddleware, async (request, response) => {
  try {
    const userId = request.userId!;

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

// ======================================================
// EXPORTAÇÃO
// ======================================================

export default router;
