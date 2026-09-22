// ======================================================
// IMPORTS
// ======================================================

import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createImageUpload } from "../config/upload.js";
import { prisma } from "../lib/prisma.js";
import { parseFile } from "music-metadata";
import { createSongPublishUpload } from "../config/upload.js";
import {
  removeLocalUploadByUrl,
  removeUploadedFile,
} from "../lib/upload-files.js";

// ======================================================
// CONFIGURAÇÃO DO ROUTER
// ======================================================

const router = Router();
const songPublishUpload = createSongPublishUpload();
const songCoverUpload = createImageUpload("song-covers");

// ======================================================
// ROTAS DE MÚSICAS
// ======================================================

async function removeUploadedFiles(files: Express.Multer.File[]) {
  await Promise.all(files.map((file) => removeUploadedFile(file.path)));
}

// ------------------------------------------------------
// GET /songs
//
// Lista todas as músicas.
//
// Rota pública.
//
// Inclui:
// - artistas
// - álbum
// - gêneros
// ------------------------------------------------------

router.get("/songs", async (request, response) => {
  try {
    const songs = await prisma.song.findMany({
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
    });

    response.json(songs);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// GET /songs/:id
//
// Busca uma música específica pelo ID.
//
// Rota pública.
// ------------------------------------------------------

router.get("/songs/:id", async (request, response) => {
  try {
    const songId = Number(request.params.id);

    // --------------------------------------------------
    // Validação do ID
    // --------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Busca da música
    // --------------------------------------------------

    const song = await prisma.song.findUnique({
      where: {
        id: songId,
      },

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
    });

    if (!song) {
      response.status(404).json({
        message: "Música não encontrada",
      });

      return;
    }

    response.json(song);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ======================================================
// PUBLICAÇÃO DE MÚSICA
// ======================================================
//
// POST /songs/publish
//
// Content-Type:
// multipart/form-data
//
// Campos:
// - title
// - artists -> JSON
// - audio   -> MP3 obrigatório
// - cover   -> imagem opcional
//
// Exemplo de artists:
//
// [
//   {
//     "artistId": 1,
//     "role": "main"
//   }
// ]
// ======================================================

router.post(
  "/songs/publish",

  authMiddleware,

  // ----------------------------------------------------
  // UPLOAD
  // ----------------------------------------------------

  songPublishUpload.fields([
    {
      name: "audio",
      maxCount: 1,
    },

    {
      name: "cover",
      maxCount: 1,
    },
  ]),

  // ----------------------------------------------------
  // PUBLICAÇÃO
  // ----------------------------------------------------

  async (request, response) => {
    const files = request.files as
      | {
          [fieldname: string]: Express.Multer.File[];
        }
      | undefined;

    const audioFile = files?.audio?.[0];

    const coverFile = files?.cover?.[0];

    const uploadedFiles = [audioFile, coverFile].filter(
      (file): file is Express.Multer.File => Boolean(file),
    );

    let songCreated = false;

    try {
      // ------------------------------------------------
      // ÁUDIO OBRIGATÓRIO
      // ------------------------------------------------

      if (!audioFile) {
        await removeUploadedFiles(uploadedFiles);

        response.status(400).json({
          message: "O arquivo MP3 é obrigatório",
        });

        return;
      }

      // ------------------------------------------------
      // CAPA: MÁXIMO 5 MB
      // ------------------------------------------------
      //
      // O limite geral do Multer é 50 MB por causa
      // do áudio.
      //
      // Então validamos a capa separadamente.
      // ------------------------------------------------

      if (coverFile && coverFile.size > 5 * 1024 * 1024) {
        await removeUploadedFiles(uploadedFiles);

        response.status(413).json({
          message: "A capa não pode ultrapassar 5 MB",
        });

        return;
      }

      // ------------------------------------------------
      // TÍTULO
      // ------------------------------------------------

      const title =
        typeof request.body.title === "string" ? request.body.title.trim() : "";

      if (!title) {
        await removeUploadedFiles(uploadedFiles);

        response.status(400).json({
          message: "O título da música é obrigatório",
        });

        return;
      }

      // ------------------------------------------------
      // USUÁRIO E PERFIL DE ARTISTA
      // ------------------------------------------------

      const authenticatedUserId = request.userId!;

      const user = await prisma.user.findUnique({
        where: {
          id: authenticatedUserId,
        },

        select: {
          id: true,

          artist: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!user) {
        await removeUploadedFiles(uploadedFiles);

        response.status(404).json({
          message: "Usuário não encontrado",
        });

        return;
      }

      const existingArtist = user.artist;

      // ------------------------------------------------
      // NOME DO ARTISTA PARA PRIMEIRA PUBLICAÇÃO
      // ------------------------------------------------

      const artistName =
        typeof request.body.artistName === "string"
          ? request.body.artistName.trim()
          : "";

      if (!existingArtist && !artistName) {
        await removeUploadedFiles(uploadedFiles);

        response.status(400).json({
          message: "artistName é obrigatório na primeira publicação",
        });

        return;
      }

      // ------------------------------------------------
      // ARTISTAS
      // ------------------------------------------------
      //
      // multipart/form-data envia os campos de texto
      // como strings.
      //
      // Portanto artists chega como JSON em texto.
      // ------------------------------------------------

      let normalizedArtists: {
        artistId: number;
        role: string;
      }[] = [];

      if (existingArtist) {
        const artistsRaw = request.body.artists;

        if (typeof artistsRaw !== "string") {
          await removeUploadedFiles(uploadedFiles);

          response.status(400).json({
            message: "Informe os artistas da música",
          });

          return;
        }

        let parsedArtists: unknown;

        try {
          parsedArtists = JSON.parse(artistsRaw);
        } catch {
          await removeUploadedFiles(uploadedFiles);

          response.status(400).json({
            message: "artists precisa ser um JSON válido",
          });

          return;
        }

        if (!Array.isArray(parsedArtists) || parsedArtists.length === 0) {
          await removeUploadedFiles(uploadedFiles);

          response.status(400).json({
            message: "A música precisa possuir pelo menos um artista",
          });

          return;
        }

        // ------------------------------------------------
        // NORMALIZAÇÃO DOS ARTISTAS
        // ------------------------------------------------

        normalizedArtists = Array.from(
          new Map(
            parsedArtists.map((item: unknown) => {
              if (typeof item !== "object" || item === null) {
                return [
                  Number.NaN,

                  {
                    artistId: Number.NaN,

                    role: "",
                  },
                ] as const;
              }

              const artist = item as {
                artistId?: unknown;
                role?: unknown;
              };

              const artistId = Number(artist.artistId);

              const role =
                typeof artist.role === "string" && artist.role.trim()
                  ? artist.role.trim().toLowerCase()
                  : "main";

              return [
                artistId,

                {
                  artistId,
                  role,
                },
              ] as const;
            }),
          ).values(),
        );

        const artistIds = normalizedArtists.map((artist) => artist.artistId);

        // ------------------------------------------------
        // VALIDAÇÃO DOS IDs
        // ------------------------------------------------

        if (
          artistIds.some(
            (artistId) => !Number.isInteger(artistId) || artistId <= 0,
          )
        ) {
          await removeUploadedFiles(uploadedFiles);

          response.status(400).json({
            message: "Um ou mais IDs de artistas são inválidos",
          });

          return;
        }

        // ------------------------------------------------
        // CONFIRMA SE TODOS EXISTEM
        // ------------------------------------------------

        const existingArtists = await prisma.artist.findMany({
          where: {
            id: {
              in: artistIds,
            },
          },
        });

        if (existingArtists.length !== artistIds.length) {
          await removeUploadedFiles(uploadedFiles);

          response.status(404).json({
            message: "Um ou mais artistas não foram encontrados",
          });

          return;
        }

        // ------------------------------------------------
        // AUTORIZAÇÃO
        // ------------------------------------------------

        const authenticatedArtistIds = new Set(
          existingArtists
            .filter((artist) => artist.userId === authenticatedUserId)
            .map((artist) => artist.id),
        );

        // O usuário precisa possuir pelo menos um
        // dos artistas e ele precisa estar como main.

        const authenticatedUserIsMainArtist = normalizedArtists.some(
          (artist) =>
            authenticatedArtistIds.has(artist.artistId) &&
            artist.role === "main",
        );

        if (!authenticatedUserIsMainArtist) {
          await removeUploadedFiles(uploadedFiles);

          response.status(403).json({
            message:
              "Seu artista precisa estar relacionado como artista principal da música",
          });

          return;
        }
      }

      // ------------------------------------------------
      // METADADOS DO MP3
      // ------------------------------------------------

      const metadata = await parseFile(audioFile.path, {
        duration: true,
        skipCovers: true,
      });

      const detectedDuration = metadata.format.duration;

      if (
        detectedDuration === undefined ||
        !Number.isFinite(detectedDuration) ||
        detectedDuration <= 0
      ) {
        await removeUploadedFiles(uploadedFiles);

        response.status(400).json({
          message: "Não foi possível identificar a duração do áudio",
        });

        return;
      }

      // Song.duration é Int no Prisma.

      const duration = Math.max(1, Math.round(detectedDuration));

      // ------------------------------------------------
      // URLs
      // ------------------------------------------------

      const audioUrl = `/uploads/song-audio/${audioFile.filename}`;

      const coverUrl = coverFile
        ? `/uploads/song-covers/${coverFile.filename}`
        : null;

      // ------------------------------------------------
      // CRIAÇÃO
      // ------------------------------------------------

      // ==================================================
      // PRIMEIRA PUBLICAÇÃO
      // ==================================================
      //
      // Se o usuário ainda não possui Artist:
      //
      // 1. cria Artist
      // 2. cria Song
      // 3. cria SongArtist como main
      //
      // Tudo dentro da mesma transação.
      // ==================================================

      if (!existingArtist) {
        const result = await prisma.$transaction(async (tx) => {
          // ------------------------------------------
          // Cria Artist
          // ------------------------------------------

          const artist = await tx.artist.create({
            data: {
              userId: authenticatedUserId,

              name: artistName,
            },
          });

          // ------------------------------------------
          // Cria primeira música
          // ------------------------------------------

          const song = await tx.song.create({
            data: {
              title,
              duration,
              audioUrl,
              coverUrl,

              artists: {
                create: {
                  role: "main",

                  artist: {
                    connect: {
                      id: artist.id,
                    },
                  },
                },
              },
            },

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
          });

          return {
            artist,
            song,
          };
        });

        songCreated = true;

        response.status(201).json({
          artistCreated: true,

          artist: result.artist,

          song: result.song,
        });

        return;
      }

      const song = await prisma.song.create({
        data: {
          title,
          duration,
          audioUrl,
          coverUrl,

          artists: {
            create: normalizedArtists.map((artist) => ({
              role: artist.role,

              artist: {
                connect: {
                  id: artist.artistId,
                },
              },
            })),
          },
        },

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
      });

      songCreated = true;

      response.status(201).json({
        artistCreated: false,

        artist: existingArtist,

        song,
      });
    } catch (error) {
      // Se o banco ainda não criou a música,
      // os arquivos não possuem mais utilidade.

      if (!songCreated) {
        await removeUploadedFiles(uploadedFiles);
      }

      console.error(error);

      response.status(500).json({
        message: "Erro interno do servidor",
      });
    }
  },
);

// ------------------------------------------------------
// PATCH /songs/:id/cover
//
// Atualiza a capa de uma música.
//
// Rota protegida.
//
// Somente um usuário proprietário de um artista
// relacionado à música como "main" pode alterar a capa.
//
// Content-Type:
// multipart/form-data
//
// Campo:
// image
// ------------------------------------------------------

router.patch(
  "/songs/:id/cover",

  authMiddleware,

  // ----------------------------------------------------
  // AUTORIZAÇÃO ANTES DO UPLOAD
  // ----------------------------------------------------

  async (request, response, next) => {
    try {
      const songId = Number(request.params.id);

      // ------------------------------------------------
      // Validação do ID
      // ------------------------------------------------

      if (!Number.isInteger(songId) || songId <= 0) {
        response.status(400).json({
          message: "ID de música inválido",
        });

        return;
      }

      // ------------------------------------------------
      // Confirma se a música existe
      // ------------------------------------------------

      const song = await prisma.song.findUnique({
        where: {
          id: songId,
        },

        select: {
          id: true,
        },
      });

      if (!song) {
        response.status(404).json({
          message: "Música não encontrada",
        });

        return;
      }

      // ------------------------------------------------
      // Autorização
      // ------------------------------------------------

      const authenticatedUserId = request.userId!;

      const mainArtist = await prisma.songArtist.findFirst({
        where: {
          songId,

          role: "main",

          artist: {
            is: {
              userId: authenticatedUserId,
            },
          },
        },
      });

      if (!mainArtist) {
        response.status(403).json({
          message: "Você não tem permissão para alterar esta música",
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

  songCoverUpload.single("image"),

  // ----------------------------------------------------
  // ATUALIZAÇÃO
  // ----------------------------------------------------

  async (request, response) => {
    try {
      const songId = Number(request.params.id);

      if (!request.file) {
        response.status(400).json({
          message: "Envie uma imagem JPEG, PNG ou WEBP",
        });

        return;
      }

      const existingSong = await prisma.song.findUnique({
        where: {
          id: songId,
        },

        select: {
          coverUrl: true,
        },
      });

      if (!existingSong) {
        await removeUploadedFile(request.file.path);

        response.status(404).json({
          message: "Música não encontrada",
        });

        return;
      }

      // ------------------------------------------------
      // Caminho público da capa
      // ------------------------------------------------

      const coverUrl = `/uploads/song-covers/${request.file.filename}`;

      // ------------------------------------------------
      // Atualiza a música
      // ------------------------------------------------

      const updatedSong = await prisma.song.update({
        where: {
          id: songId,
        },

        data: {
          coverUrl,
        },

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
      });

      // ------------------------------------------------
      // Remove a capa antiga somente depois que o banco
      // foi atualizado com sucesso.
      // ------------------------------------------------

      await removeLocalUploadByUrl(existingSong.coverUrl);

      response.json(updatedSong);
    } catch (error) {
      // Se o upload aconteceu, mas a atualização no banco
      // falhou, removemos a nova capa para não deixar um
      // arquivo órfão dentro de uploads/.
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
// PATCH /songs/:id
//
// Atualiza parcialmente uma música.
//
// Rota protegida.
//
// Somente um usuário que possua um artista relacionado
// como "main" pode editar.
//
// Pode alterar:
// - title
//
// A capa é alterada separadamente por:
//
// PATCH /songs/:id/cover
//
// O áudio e a duração são definidos pelo arquivo
// enviado durante a publicação da música.
//
// Relações com artistas, gêneros e álbum
// são tratadas separadamente.
// ------------------------------------------------------

router.patch("/songs/:id", authMiddleware, async (request, response) => {
  try {
    const songId = Number(request.params.id);

    const { title } = request.body;

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Precisa existir pelo menos um campo
    // ------------------------------------------------

    if (title === undefined) {
      response.status(400).json({
        message: "Nenhum campo foi informado para atualização",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se a música existe
    // ------------------------------------------------

    const existingSong = await prisma.song.findUnique({
      where: {
        id: songId,
      },
    });

    if (!existingSong) {
      response.status(404).json({
        message: "Música não encontrada",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    const mainArtist = await prisma.songArtist.findFirst({
      where: {
        songId,
        role: "main",

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!mainArtist) {
      response.status(403).json({
        message: "Você não tem permissão para alterar esta música",
      });

      return;
    }

    // ------------------------------------------------
    // Título
    // ------------------------------------------------

    if (typeof title !== "string" || !title.trim()) {
      response.status(400).json({
        message: "O título da música não pode ser vazio",
      });

      return;
    }
    // ------------------------------------------------
    // Atualização
    // ------------------------------------------------

    const updatedSong = await prisma.song.update({
      where: {
        id: songId,
      },

      data: {
        title: title.trim(),
      },

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
    });

    response.json(updatedSong);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// DELETE /songs/:id
//
// Remove uma música.
//
// Rota protegida.
//
// Somente um artista principal relacionado à música
// pode tentar removê-la.
//
// Regra adicional:
// não permite apagar a última música de um artista.
// ------------------------------------------------------

router.delete("/songs/:id", authMiddleware, async (request, response) => {
  try {
    const songId = Number(request.params.id);

    // ------------------------------------------------
    // Validação do ID
    // ------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Busca a música e artistas relacionados
    // ------------------------------------------------

    const song = await prisma.song.findUnique({
      where: {
        id: songId,
      },

      include: {
        artists: true,
      },
    });

    if (!song) {
      response.status(404).json({
        message: "Música não encontrada",
      });

      return;
    }

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    const mainArtist = await prisma.songArtist.findFirst({
      where: {
        songId,
        role: "main",

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!mainArtist) {
      response.status(403).json({
        message: "Você não tem permissão para remover esta música",
      });

      return;
    }

    // ------------------------------------------------
    // Regra: todo artista precisa ter uma música
    // ------------------------------------------------

    for (const songArtist of song.artists) {
      const artistSongCount = await prisma.songArtist.count({
        where: {
          artistId: songArtist.artistId,
        },
      });

      if (artistSongCount <= 1) {
        response.status(409).json({
          message:
            "A música não pode ser removida porque é a única música de um dos artistas relacionados",
        });

        return;
      }
    }

    // ------------------------------------------------
    // Exclusão
    // ------------------------------------------------
    //
    // Relações configuradas com onDelete: Cascade
    // são removidas junto com a música.
    // ------------------------------------------------

    await prisma.song.delete({
      where: {
        id: songId,
      },
    });

    // ------------------------------------------------
    // REMOVE OS ARQUIVOS FÍSICOS
    // ------------------------------------------------
    //
    // O registro já foi removido do banco. Agora podemos
    // apagar com segurança o MP3 e a capa locais.
    // URLs externas são ignoradas pela função auxiliar.
    // ------------------------------------------------

    await Promise.all([
      removeLocalUploadByUrl(song.audioUrl),

      removeLocalUploadByUrl(song.coverUrl),
    ]);

    response.status(204).send();
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Erro interno do servidor",
    });
  }
});

// ------------------------------------------------------
// POST /songs/:id/genres
//
// Relaciona gêneros existentes a uma música.
//
// Rota protegida.
//
// Somente um artista principal da música pode
// alterar seus gêneros.
// ------------------------------------------------------

router.post("/songs/:id/genres", authMiddleware, async (request, response) => {
  try {
    const songId = Number(request.params.id);

    const { genreIds } = request.body;

    // ------------------------------------------------
    // Validação do ID da música
    // ------------------------------------------------

    if (!Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        message: "ID de música inválido",
      });

      return;
    }

    // ------------------------------------------------
    // Validação dos gêneros enviados
    // ------------------------------------------------

    if (!Array.isArray(genreIds) || genreIds.length === 0) {
      response.status(400).json({
        message: "Informe pelo menos um gênero",
      });

      return;
    }

    const uniqueGenreIds = [
      ...new Set(genreIds.map((genreId) => Number(genreId))),
    ];

    if (
      uniqueGenreIds.some(
        (genreId) => !Number.isInteger(genreId) || genreId <= 0,
      )
    ) {
      response.status(400).json({
        message: "Um ou mais IDs de gêneros são inválidos",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se a música existe
    // ------------------------------------------------

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

    // ------------------------------------------------
    // Autorização
    // ------------------------------------------------

    const authenticatedUserId = request.userId!;

    const mainArtist = await prisma.songArtist.findFirst({
      where: {
        songId,
        role: "main",

        artist: {
          is: {
            userId: authenticatedUserId,
          },
        },
      },
    });

    if (!mainArtist) {
      response.status(403).json({
        message: "Você não tem permissão para alterar os gêneros desta música",
      });

      return;
    }

    // ------------------------------------------------
    // Confirma se todos os gêneros existem
    // ------------------------------------------------

    const genres = await prisma.genre.findMany({
      where: {
        id: {
          in: uniqueGenreIds,
        },
      },
    });

    if (genres.length !== uniqueGenreIds.length) {
      response.status(404).json({
        message: "Um ou mais gêneros não foram encontrados",
      });

      return;
    }

    // ------------------------------------------------
    // Cria as relações
    // ------------------------------------------------

    await prisma.songGenre.createMany({
      data: uniqueGenreIds.map((genreId) => ({
        songId,
        genreId,
      })),

      skipDuplicates: true,
    });

    // ------------------------------------------------
    // Busca a música atualizada
    // ------------------------------------------------

    const updatedSong = await prisma.song.findUnique({
      where: {
        id: songId,
      },

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
    });

    response.json(updatedSong);
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
