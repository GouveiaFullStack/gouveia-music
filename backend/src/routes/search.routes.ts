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
// BUSCA GLOBAL
// ======================================================
//
// GET /search?q=termo
//
// Pesquisa simultaneamente:
//
// - músicas
//   - pelo título
//   - pelo nome do artista
//
// - artistas
//   - pelo nome
//
// - álbuns
//   - pelo título
//
// Esta rota é pública.
// ======================================================

router.get("/search", async (request, response) => {
  try {
    // --------------------------------------------------
    // TERMO DA BUSCA
    // --------------------------------------------------

    const query =
      typeof request.query.q === "string" ? request.query.q.trim() : "";

    // --------------------------------------------------
    // VALIDAÇÃO
    // --------------------------------------------------

    if (!query) {
      response.status(400).json({
        message: "Informe um termo para busca",
      });

      return;
    }

    if (query.length < 2) {
      response.status(400).json({
        message: "O termo de busca precisa possuir pelo menos 2 caracteres",
      });

      return;
    }

    // --------------------------------------------------
    // BUSCAS
    // --------------------------------------------------
    //
    // Promise.all executa as consultas paralelamente.
    // --------------------------------------------------

    const [songs, artists, albums] = await Promise.all([
      // =================================================
      // MÚSICAS
      // =================================================
      //
      // A música será encontrada quando:
      //
      // 1. o título possuir o termo pesquisado
      //
      // OU
      //
      // 2. algum dos artistas relacionados possuir
      //    o termo no nome
      // =================================================

      prisma.song.findMany({
        where: {
          OR: [
            // -------------------------------------------
            // Busca pelo título da música
            // -------------------------------------------

            {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },

            // -------------------------------------------
            // Busca pelo nome do artista
            // -------------------------------------------

            {
              artists: {
                some: {
                  artist: {
                    name: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          ],
        },

        // -----------------------------------------------
        // Limite de resultados
        // -----------------------------------------------

        take: 10,

        // -----------------------------------------------
        // Ordem
        // -----------------------------------------------

        orderBy: {
          createdAt: "desc",
        },

        // -----------------------------------------------
        // Relações
        // -----------------------------------------------

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
      }),

      // =================================================
      // ARTISTAS
      // =================================================

      prisma.artist.findMany({
        where: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },

        take: 10,

        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
          imageUrl: true,
          bio: true,
          verified: true,
          createdAt: true,
        },
      }),

      // =================================================
      // ÁLBUNS
      // =================================================

      prisma.album.findMany({
        where: {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },

        take: 10,

        orderBy: {
          releaseDate: "desc",
        },

        include: {
          artists: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  verified: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // --------------------------------------------------
    // RESPOSTA
    // --------------------------------------------------

    response.json({
      query,

      results: {
        songs,
        artists,
        albums,
      },

      counts: {
        songs: songs.length,
        artists: artists.length,
        albums: albums.length,
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
// EXPORTAÇÃO
// ======================================================

export default router;
