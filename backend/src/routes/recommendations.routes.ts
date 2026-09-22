// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getRecommendations,
  getSimilarSongs,
  getMoreFromArtist,
  getForYouMix,
  getDiscoveryMix,
  getFavoritesMix,
  getHomeData,
} from "../services/recommendations.service.js";

// ======================================================
// CONFIGURAÇÃO
// ======================================================

const router = Router();

// ======================================================
// GET /recommendations
// ======================================================
//
// Rota protegida.
//
// A lógica de recomendação fica no service.
// Esta rota cuida apenas de:
//
// - autenticação
// - userId
// - chamada do service
// - resposta HTTP
// ======================================================

router.get(
  "/recommendations",

  authMiddleware,

  async (request, response) => {
    try {
      const userId = request.userId!;

      const result = await getRecommendations(userId);

      if (!result) {
        response.status(404).json({
          message: "Usuário não encontrado",
        });

        return;
      }

      response.json(result);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ======================================================
// GET /songs/:id/similar
// ======================================================
//
// Rota pública.
//
// Retorna músicas semelhantes usando:
//
// - artistas em comum
// - gêneros em comum
// - álbum em comum
// ======================================================

router.get(
  "/songs/:id/similar",

  async (request, response) => {
    try {
      const songId = Number(request.params.id);

      if (!Number.isInteger(songId) || songId <= 0) {
        response.status(400).json({
          message: "ID de música inválido",
        });

        return;
      }

      const result = await getSimilarSongs(songId);

      if (!result) {
        response.status(404).json({
          message: "Música não encontrada",
        });

        return;
      }

      response.json(result);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ======================================================
// GET /artists/:id/more
// ======================================================
//
// Retorna mais músicas de um artista.
//
// Query opcional:
//
// ?excludeSongId=1
//
// Útil para não devolver a música que o usuário
// já está ouvindo.
// ======================================================

router.get(
  "/artists/:id/more",

  async (request, response) => {
    try {
      const artistId = Number(request.params.id);

      // ------------------------------------------------
      // Validação do artista
      // ------------------------------------------------

      if (!Number.isInteger(artistId) || artistId <= 0) {
        response.status(400).json({
          message: "ID de artista inválido",
        });

        return;
      }

      // ------------------------------------------------
      // Música opcional para exclusão
      // ------------------------------------------------

      const excludeSongIdValue = request.query.excludeSongId;

      let excludeSongId: number | undefined;

      if (excludeSongIdValue !== undefined) {
        const parsedSongId = Number(excludeSongIdValue);

        if (!Number.isInteger(parsedSongId) || parsedSongId <= 0) {
          response.status(400).json({
            message: "excludeSongId inválido",
          });

          return;
        }

        excludeSongId = parsedSongId;
      }

      // ------------------------------------------------
      // Service
      // ------------------------------------------------

      const result = await getMoreFromArtist(artistId, excludeSongId);

      if (!result) {
        response.status(404).json({
          message: "Artista não encontrado",
        });

        return;
      }

      response.json(result);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ======================================================
// GET /mixes/for-you
// ======================================================
//
// Gera uma Mix para você.
//
// Rota protegida porque depende do comportamento
// do usuário autenticado.
// ======================================================

router.get(
  "/mixes/for-you",

  authMiddleware,

  async (request, response) => {
    try {
      const userId = request.userId!;

      const mix = await getForYouMix(userId);

      if (!mix) {
        response.status(404).json({
          message: "Usuário não encontrado",
        });

        return;
      }

      response.json(mix);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ======================================================
// GET /mixes/discover
// ======================================================
//
// Gera uma seleção de descobertas personalizada.
//
// Rota protegida.
// ======================================================

router.get(
  "/mixes/discover",

  authMiddleware,

  async (request, response) => {
    try {
      const userId = request.userId!;

      const mix = await getDiscoveryMix(userId);

      if (!mix) {
        response.status(404).json({
          message: "Usuário não encontrado",
        });

        return;
      }

      response.json(mix);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ======================================================
// GET /mixes/favorites
// ======================================================
//
// Gera uma mix usando:
//
// - favoritas recentes
// - músicas relacionadas às favoritas
//
// Rota protegida.
// ======================================================

router.get(
  "/mixes/favorites",

  authMiddleware,

  async (request, response) => {
    try {
      const userId = request.userId!;

      const mix = await getFavoritesMix(userId);

      if (!mix) {
        response.status(404).json({
          message: "Usuário não encontrado",
        });

        return;
      }

      response.json(mix);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ======================================================
// GET /home
// ======================================================
//
// Retorna os principais conteúdos personalizados
// necessários para montar a Home do Mousiké.
//
// Rota protegida.
// ======================================================

router.get(
  "/home",

  authMiddleware,

  async (request, response) => {
    try {
      const userId = request.userId!;

      const home = await getHomeData(userId);

      if (!home) {
        response.status(404).json({
          message: "Usuário não encontrado",
        });

        return;
      }

      response.json(home);
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
