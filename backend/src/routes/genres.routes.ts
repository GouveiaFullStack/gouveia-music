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
// ROTAS DE GÊNEROS
// ======================================================

// ------------------------------------------------------
// GET /genres
// Lista todos os gêneros em ordem alfabética.
// ------------------------------------------------------

router.get("/genres", async (request, response) => {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: {
        name: "asc",
      },
    });

    response.json(genres);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /genres/:id
// Busca um gênero específico pelo ID.
//
// Inclui as músicas relacionadas.
// ------------------------------------------------------

router.get("/genres/:id", async (request, response) => {
  try {
    const genreId = Number(request.params.id);

    if (Number.isNaN(genreId)) {
      response.status(400).json({
        message: "ID de gênero inválido",
      });

      return;
    }

    const genre = await prisma.genre.findUnique({
      where: {
        id: genreId,
      },

      include: {
        songs: {
          include: {
            song: {
              include: {
                artists: {
                  include: {
                    artist: true,
                  },
                },

                album: true,
              },
            },
          },
        },
      },
    });

    if (!genre) {
      response.status(404).json({
        message: "Gênero não encontrado",
      });

      return;
    }

    response.json(genre);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /genres
// Cria um novo gênero.
// ------------------------------------------------------

router.post("/genres", async (request, response) => {
  try {
    const { name } = request.body;

    if (!name || typeof name !== "string") {
      response.status(400).json({
        message: "O nome do gênero é obrigatório",
      });

      return;
    }

    // Remove espaços extras no começo e no final.
    const normalizedName = name.trim();

    if (!normalizedName) {
      response.status(400).json({
        message: "O nome do gênero não pode ser vazio",
      });

      return;
    }

    const genre = await prisma.genre.create({
      data: {
        name: normalizedName,
      },
    });

    response.status(201).json(genre);
  } catch (error) {
    // Genre.name possui @unique no schema.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        message: "Este gênero já está cadastrado",
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
// PATCH /genres/:id
// Atualiza o nome de um gênero.
// ------------------------------------------------------

router.patch("/genres/:id", async (request, response) => {
  try {
    const genreId = Number(request.params.id);

    const { name } = request.body;

    if (Number.isNaN(genreId)) {
      response.status(400).json({
        message: "ID de gênero inválido",
      });

      return;
    }

    if (name === undefined) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    if (typeof name !== "string" || !name.trim()) {
      response.status(400).json({
        message: "O nome do gênero não pode ser vazio",
      });

      return;
    }

    const existingGenre = await prisma.genre.findUnique({
      where: {
        id: genreId,
      },
    });

    if (!existingGenre) {
      response.status(404).json({
        message: "Gênero não encontrado",
      });

      return;
    }

    const updatedGenre = await prisma.genre.update({
      where: {
        id: genreId,
      },

      data: {
        name: name.trim(),
      },
    });

    response.json(updatedGenre);
  } catch (error) {
    // Impede dois gêneros com o mesmo nome.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        message: "Este gênero já está cadastrado",
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
// DELETE /genres/:id
// Remove um gênero.
//
// Proteção:
// não permite apagar enquanto houver músicas
// relacionadas a ele.
// ------------------------------------------------------

router.delete("/genres/:id", async (request, response) => {
  try {
    const genreId = Number(request.params.id);

    if (Number.isNaN(genreId)) {
      response.status(400).json({
        message: "ID de gênero inválido",
      });

      return;
    }

    const genre = await prisma.genre.findUnique({
      where: {
        id: genreId,
      },

      include: {
        songs: true,
      },
    });

    if (!genre) {
      response.status(404).json({
        message: "Gênero não encontrado",
      });

      return;
    }

    // Evita apagar um gênero que ainda está sendo usado.
    if (genre.songs.length > 0) {
      response.status(409).json({
        message: "O gênero possui músicas relacionadas e não pode ser removido",
      });

      return;
    }

    await prisma.genre.delete({
      where: {
        id: genreId,
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
