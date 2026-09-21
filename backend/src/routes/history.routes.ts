// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

import { prisma } from "../lib/prisma.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

// ======================================================
// ROTAS DE HISTÓRICO
// ======================================================

// ------------------------------------------------------
// GET /users/:id/history
// Lista o histórico de reprodução de um usuário.
//
// As reproduções mais recentes aparecem primeiro.
// ------------------------------------------------------

router.get("/users/:id/history", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
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

    const history = await prisma.listeningHistory.findMany({
      where: {
        userId,
      },

      orderBy: {
        playedAt: "desc",
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

    response.json(history);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /users/:id/history
// Tenta registrar uma reprodução no histórico.
//
// Body:
// {
//   "songId": 1,
//   "secondsListen": 60
// }
//
// A reprodução só é registrada se o usuário tiver
// ouvido pelo menos 25% da duração total da música.
// ------------------------------------------------------

router.post("/users/:id/history", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    const songId = Number(request.body.songId);
    const secondsListen = Number(request.body.secondsListen);

    // --------------------------------------------------
    // Validação do usuário
    // --------------------------------------------------

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({
        message: "ID de usuário inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Validação da música
    // --------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "songId inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Validação dos segundos ouvidos
    // --------------------------------------------------

    if (!Number.isInteger(secondsListen) || secondsListen < 0) {
      response.status(400).json({
        message: "secondsListen inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Confirma se o usuário existe
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Busca a música e sua duração
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Impede registrar mais segundos do que a duração
    // total da música.
    // --------------------------------------------------

    if (secondsListen > song.duration) {
      response.status(400).json({
        message: "secondsListen não pode ser maior que a duração da música",
      });

      return;
    }

    // --------------------------------------------------
    // REGRA DOS 25%
    // --------------------------------------------------
    //
    // Exemplo:
    //
    // duração = 200 segundos
    //
    // 200 * 0.25 = 50
    //
    // Então:
    //
    // 49 segundos -> não registra
    // 50 segundos -> registra
    //
    // Math.ceil garante que não teremos valor decimal.
    // --------------------------------------------------

    const minimumSeconds = Math.ceil(song.duration * 0.25);

    // --------------------------------------------------
    // Usuário ainda não ouviu 25%
    // --------------------------------------------------

    if (secondsListen < minimumSeconds) {
      response.json({
        recorded: false,

        message: "A reprodução ainda não atingiu 25% da música",

        secondsListen,

        minimumSeconds,

        songDuration: song.duration,
      });

      return;
    }

    // --------------------------------------------------
    // Registra no histórico
    // --------------------------------------------------

    const historyEntry = await prisma.listeningHistory.create({
      data: {
        userId,
        songId,
        secondsListen,
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

    response.status(201).json({
      recorded: true,

      history: historyEntry,
    });
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
