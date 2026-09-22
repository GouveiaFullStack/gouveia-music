// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

// ======================================================
// ROTAS DE ARTISTAS
// ======================================================

// ------------------------------------------------------
// GET /artists
//
// Lista todos os artistas.
//
// Rota pública.
//
// Inclui as músicas relacionadas a cada artista.
// ------------------------------------------------------

router.get("/artists", async (request, response) => {
  try {
    const artists = await prisma.artist.findMany({
      include: {
        songs: {
          include: {
            song: true,
          },
        },
      },
    });

    response.json(artists);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /artists/:id
//
// Busca um artista específico pelo ID.
//
// Rota pública.
//
// Inclui:
// - músicas
// - álbum das músicas
// - gêneros das músicas
// ------------------------------------------------------

router.get("/artists/:id", async (request, response) => {
  try {
    const artistId = Number(request.params.id);

    // --------------------------------------------------
    // Validação do ID
    // --------------------------------------------------

    if (!Number.isInteger(artistId) || artistId <= 0) {
      response.status(400).json({
        message: "ID de artista inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Busca do artista
    // --------------------------------------------------

    const artist = await prisma.artist.findUnique({
      where: {
        id: artistId,
      },

      include: {
        songs: {
          include: {
            song: {
              include: {
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

    if (!artist) {
      response.status(404).json({
        message: "Artista não encontrado",
      });

      return;
    }

    response.json(artist);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// PATCH /artists/:id
//
// Atualiza parcialmente o perfil de um artista.
//
// Rota protegida.
//
// Somente o usuário dono do perfil Artist pode
// realizar alterações.
//
// Pode alterar:
// - name
// - imageUrl
// - bio
//
// "verified" NÃO pode ser alterado por esta rota.
// A verificação será controlada internamente
// pelo Mousiké.
// ------------------------------------------------------

router.patch("/artists/:id", authMiddleware, async (request, response) => {
  try {
    const artistId = Number(request.params.id);

    const { name, imageUrl, bio } = request.body;

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(artistId) || artistId <= 0) {
      response.status(400).json({
        message: "ID de artista inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Precisa existir pelo menos um campo
    // ------------------------------------------------

    if (name === undefined && imageUrl === undefined && bio === undefined) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    // ------------------------------------------------
    // Busca o artista
    // ------------------------------------------------

    const existingArtist = await prisma.artist.findUnique({
      where: {
        id: artistId,
      },
    });

    if (!existingArtist) {
      response.status(404).json({
        message: "Artista não encontrado",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------
    //
    // O JWT informa qual usuário está autenticado.
    //
    // existingArtist.userId informa qual usuário é
    // dono deste perfil de artista.
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    if (existingArtist.userId !== authenticatedUserId) {
      response.status(403).json({
        message: "Você não tem permissão para alterar este artista",
      });

      return;
    }

    // ------------------------------------------------
    // Validação do nome
    // ------------------------------------------------

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        response.status(400).json({
          message: "O nome do artista não pode ser vazio",
        });

        return;
      }
    }

    // ------------------------------------------------
    // Validação da imagem
    // ------------------------------------------------

    if (
      imageUrl !== undefined &&
      imageUrl !== null &&
      typeof imageUrl !== "string"
    ) {
      response.status(400).json({
        message: "imageUrl inválida",
      });

      return;
    }

    // ------------------------------------------------
    // Validação da bio
    // ------------------------------------------------

    if (bio !== undefined && bio !== null && typeof bio !== "string") {
      response.status(400).json({
        message: "bio inválida",
      });

      return;
    }

    // ------------------------------------------------
    // Monta somente os campos enviados
    // ------------------------------------------------

    const data: {
      name?: string;
      imageUrl?: string | null;
      bio?: string | null;
    } = {};

    if (name !== undefined) {
      data.name = name.trim();
    }

    if (imageUrl !== undefined) {
      data.imageUrl = imageUrl === null ? null : imageUrl.trim() || null;
    }

    if (bio !== undefined) {
      data.bio = bio === null ? null : bio.trim() || null;
    }

    // ------------------------------------------------
    // Atualização
    // ------------------------------------------------

    const updatedArtist = await prisma.artist.update({
      where: {
        id: artistId,
      },

      data,

      include: {
        songs: {
          include: {
            song: true,
          },
        },
      },
    });

    response.json(updatedArtist);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /artists/:id
//
// Remove um perfil de artista.
//
// Rota protegida.
//
// Somente o usuário dono do Artist pode tentar
// excluir o perfil.
//
// Um artista que ainda possui músicas relacionadas
// não pode ser apagado.
//
// Primeiro as músicas precisam ser removidas,
// transferidas ou ter suas relações reorganizadas.
// ------------------------------------------------------

router.delete("/artists/:id", authMiddleware, async (request, response) => {
  try {
    const artistId = Number(request.params.id);

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(artistId) || artistId <= 0) {
      response.status(400).json({
        message: "ID de artista inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Busca o artista
    // ------------------------------------------------

    const artist = await prisma.artist.findUnique({
      where: {
        id: artistId,
      },

      include: {
        songs: true,
      },
    });

    if (!artist) {
      response.status(404).json({
        message: "Artista não encontrado",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    if (artist.userId !== authenticatedUserId) {
      response.status(403).json({
        message: "Você não tem permissão para remover este artista",
      });

      return;
    }

    // ------------------------------------------------
    // Proteção das músicas
    // ------------------------------------------------
    //
    // Enquanto houver músicas relacionadas,
    // não permitimos apagar o perfil Artist.
    // ------------------------------------------------

    if (artist.songs.length > 0) {
      response.status(409).json({
        message:
          "O artista possui músicas relacionadas e não pode ser removido",
      });

      return;
    }

    // ------------------------------------------------
    // Exclusão
    // ------------------------------------------------

    await prisma.artist.delete({
      where: {
        id: artistId,
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
// EXPORTAÇÃO
// ======================================================

export default router;
