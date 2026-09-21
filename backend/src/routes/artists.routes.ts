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
// ROTAS DE ARTISTAS
// ======================================================

// ------------------------------------------------------
// GET /artists
// Lista todos os artistas.
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
// Busca um artista específico pelo ID.
//
// Inclui suas músicas.
// ------------------------------------------------------

router.get("/artists/:id", async (request, response) => {
  try {
    const artistId = Number(request.params.id);

    if (Number.isNaN(artistId)) {
      response.status(400).json({
        message: "ID de artista inválido",
      });

      return;
    }

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
// Atualiza parcialmente o perfil de um artista.
//
// Pode alterar:
// - name
// - imageUrl
// - bio
//
// "verified" NÃO pode ser alterado aqui.
// A verificação será controlada pelo Gouveia Music.
// ------------------------------------------------------

router.patch("/artists/:id", async (request, response) => {
  try {
    const artistId = Number(request.params.id);

    const { name, imageUrl, bio } = request.body;

    if (Number.isNaN(artistId)) {
      response.status(400).json({
        message: "ID de artista inválido",
      });

      return;
    }

    // Precisa existir pelo menos um campo para atualizar.
    if (name === undefined && imageUrl === undefined && bio === undefined) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    // Verifica se o artista existe.
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

    // Não permitimos nome vazio.
    if (name !== undefined && !name) {
      response.status(400).json({
        message: "O nome do artista não pode ser vazio",
      });

      return;
    }

    // Monta somente os campos realmente enviados.
    const data: {
      name?: string;
      imageUrl?: string | null;
      bio?: string | null;
    } = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (imageUrl !== undefined) {
      data.imageUrl = imageUrl || null;
    }

    if (bio !== undefined) {
      data.bio = bio || null;
    }

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
// Remove um perfil de artista.
//
// Proteção atual:
// um artista que ainda possui músicas relacionadas
// não pode ser apagado.
//
// Primeiro as músicas precisam ser removidas,
// transferidas ou ter suas relações reorganizadas.
// ------------------------------------------------------

router.delete("/artists/:id", async (request, response) => {
  try {
    const artistId = Number(request.params.id);

    if (Number.isNaN(artistId)) {
      response.status(400).json({
        message: "ID de artista inválido",
      });

      return;
    }

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

    // Evita apagar o perfil enquanto existirem
    // músicas relacionadas ao artista.
    if (artist.songs.length > 0) {
      response.status(409).json({
        message:
          "O artista possui músicas relacionadas e não pode ser removido",
      });

      return;
    }

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
