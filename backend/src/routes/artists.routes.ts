// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createImageUpload } from "../config/upload.js";
import { prisma } from "../lib/prisma.js";

import {
  removeLocalUploadByUrl,
  removeUploadedFile,
} from "../lib/upload-files.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();

const artistImageUpload = createImageUpload("artist-images");

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

router.get(
  "/artists",

  async (request, response) => {
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
  },
);

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

router.get(
  "/artists/:id",

  async (request, response) => {
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
      // Busca do artista
      // ------------------------------------------------

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
  },
);

// ======================================================
// IMAGEM DO ARTISTA
// ======================================================

// ------------------------------------------------------
// PATCH /artists/:id/image
//
// Atualiza a imagem do artista.
//
// Rota protegida.
//
// Somente o usuário dono do perfil Artist pode
// realizar o upload.
//
// Content-Type:
// multipart/form-data
//
// Campo:
// image
// ------------------------------------------------------

router.patch(
  "/artists/:id/image",

  authMiddleware,

  // ----------------------------------------------------
  // AUTORIZAÇÃO ANTES DO UPLOAD
  // ----------------------------------------------------

  async (request, response, next) => {
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
      // Busca do artista
      // ------------------------------------------------

      const artist = await prisma.artist.findUnique({
        where: {
          id: artistId,
        },

        select: {
          id: true,
          userId: true,
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
          message: "Você não tem permissão para alterar este artista",
        });

        return;
      }

      next();
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },

  // ----------------------------------------------------
  // UPLOAD
  // ----------------------------------------------------

  artistImageUpload.single("image"),

  // ----------------------------------------------------
  // ATUALIZAÇÃO
  // ----------------------------------------------------

  async (request, response) => {
    try {
      const artistId = Number(request.params.id);

      // ------------------------------------------------
      // Arquivo obrigatório
      // ------------------------------------------------

      if (!request.file) {
        response.status(400).json({
          message: "Envie uma imagem JPEG, PNG ou WEBP",
        });

        return;
      }

      // ------------------------------------------------
      // Busca a imagem antiga
      // ------------------------------------------------

      const existingArtist = await prisma.artist.findUnique({
        where: {
          id: artistId,
        },

        select: {
          id: true,
          imageUrl: true,
        },
      });

      if (!existingArtist) {
        // O arquivo novo já foi salvo pelo Multer.
        // Como o artista deixou de existir,
        // removemos o arquivo.

        await removeUploadedFile(request.file.path);

        response.status(404).json({
          message: "Artista não encontrado",
        });

        return;
      }

      // ------------------------------------------------
      // URL da nova imagem
      // ------------------------------------------------

      const imageUrl = `/uploads/artist-images/${request.file.filename}`;

      // ------------------------------------------------
      // Atualização no banco
      // ------------------------------------------------

      const updatedArtist = await prisma.artist.update({
        where: {
          id: artistId,
        },

        data: {
          imageUrl,
        },

        select: {
          id: true,
          userId: true,
          name: true,
          imageUrl: true,
          bio: true,
          verified: true,
          createdAt: true,
        },
      });

      // ------------------------------------------------
      // Remove a imagem anterior
      // ------------------------------------------------
      //
      // Somente depois que a atualização no banco
      // foi concluída com sucesso.
      // ------------------------------------------------

      await removeLocalUploadByUrl(existingArtist.imageUrl);

      response.json(updatedArtist);
    } catch (error) {
      // ------------------------------------------------
      // Se o upload ocorreu, mas o banco falhou,
      // removemos a imagem nova.
      // ------------------------------------------------

      if (request.file) {
        await removeUploadedFile(request.file.path);
      }

      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ------------------------------------------------------
// DELETE /artists/:id/image
//
// Remove a imagem atual do artista.
//
// O perfil Artist continua existindo.
// Apenas imageUrl volta para null.
// ------------------------------------------------------

router.delete(
  "/artists/:id/image",

  authMiddleware,

  async (request, response) => {
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
      // Busca do artista
      // ------------------------------------------------

      const artist = await prisma.artist.findUnique({
        where: {
          id: artistId,
        },

        select: {
          id: true,
          userId: true,
          imageUrl: true,
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
          message: "Você não tem permissão para alterar este artista",
        });

        return;
      }

      // ------------------------------------------------
      // Artista não possui imagem
      // ------------------------------------------------

      if (!artist.imageUrl) {
        response.status(404).json({
          message: "O artista não possui imagem",
        });

        return;
      }

      const oldImageUrl = artist.imageUrl;

      // ------------------------------------------------
      // Remove referência do banco primeiro
      // ------------------------------------------------

      await prisma.artist.update({
        where: {
          id: artistId,
        },

        data: {
          imageUrl: null,
        },
      });

      // ------------------------------------------------
      // Remove arquivo físico depois
      // ------------------------------------------------

      await removeLocalUploadByUrl(oldImageUrl);

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
// DADOS DO PERFIL DE ARTISTA
// ======================================================

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
// - bio
//
// A imagem é alterada exclusivamente por:
//
// PATCH /artists/:id/image
//
// "verified" NÃO pode ser alterado por esta rota.
// A verificação será controlada internamente
// pelo Mousiké.
// ------------------------------------------------------

router.patch(
  "/artists/:id",

  authMiddleware,

  async (request, response) => {
    try {
      const artistId = Number(request.params.id);

      const { name, bio } = request.body;

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

      if (name === undefined && bio === undefined) {
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

      const authenticatedUserId = request.userId!;

      if (existingArtist.userId !== authenticatedUserId) {
        response.status(403).json({
          message: "Você não tem permissão para alterar este artista",
        });

        return;
      }

      // ------------------------------------------------
      // Dados para atualização
      // ------------------------------------------------

      const data: {
        name?: string;
        bio?: string | null;
      } = {};

      // ------------------------------------------------
      // Nome
      // ------------------------------------------------

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          response.status(400).json({
            message: "O nome do artista não pode ser vazio",
          });

          return;
        }

        data.name = name.trim();
      }

      // ------------------------------------------------
      // Bio
      // ------------------------------------------------

      if (bio !== undefined) {
        if (bio !== null && typeof bio !== "string") {
          response.status(400).json({
            message: "bio inválida",
          });

          return;
        }

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
  },
);

// ======================================================
// EXCLUSÃO DO ARTISTA
// ======================================================

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
// ------------------------------------------------------

router.delete(
  "/artists/:id",

  authMiddleware,

  async (request, response) => {
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
      // Busca do artista
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

      if (artist.songs.length > 0) {
        response.status(409).json({
          message:
            "O artista possui músicas relacionadas e não pode ser removido",
        });

        return;
      }

      // ------------------------------------------------
      // Guarda a imagem antes da exclusão
      // ------------------------------------------------

      const oldImageUrl = artist.imageUrl;

      // ------------------------------------------------
      // Remove do banco
      // ------------------------------------------------

      await prisma.artist.delete({
        where: {
          id: artistId,
        },
      });

      // ------------------------------------------------
      // Remove imagem física
      // ------------------------------------------------

      await removeLocalUploadByUrl(oldImageUrl);

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
