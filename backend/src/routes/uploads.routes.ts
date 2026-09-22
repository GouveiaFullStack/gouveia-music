// ======================================================
// IMPORTS
// ======================================================

import fs from "node:fs/promises";

import { Router } from "express";
import { parseFile } from "music-metadata";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createAudioUpload } from "../config/upload.js";
import { prisma } from "../lib/prisma.js";

// ======================================================
// CONFIGURAÇÃO
// ======================================================

const router = Router();

const songAudioUpload = createAudioUpload("song-audio");

// ======================================================
// UPLOAD DE ÁUDIO
// ======================================================
//
// POST /uploads/audio
//
// Rota protegida.
//
// Somente usuários que possuem um perfil Artist
// podem enviar arquivos de áudio.
//
// O backend:
//
// 1. recebe o MP3
// 2. salva temporariamente no disco
// 3. lê os metadados
// 4. descobre automaticamente a duração
// 5. devolve audioUrl + duration
//
// Content-Type:
// multipart/form-data
//
// Campo:
// audio
// ======================================================

router.post(
  "/uploads/audio",

  authMiddleware,

  // ----------------------------------------------------
  // CONFIRMA SE O USUÁRIO É ARTISTA
  // ----------------------------------------------------

  async (request, response, next) => {
    try {
      const userId = request.userId!;

      const artist = await prisma.artist.findUnique({
        where: {
          userId,
        },

        select: {
          id: true,
        },
      });

      if (!artist) {
        response.status(403).json({
          message: "Somente artistas podem enviar arquivos de áudio",
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

  songAudioUpload.single("audio"),

  // ----------------------------------------------------
  // LEITURA DOS METADADOS
  // ----------------------------------------------------

  async (request, response) => {
    if (!request.file) {
      response.status(400).json({
        message: "Envie um arquivo MP3 válido",
      });

      return;
    }

    try {
      // ------------------------------------------------
      // Lê os metadados diretamente do arquivo salvo
      // ------------------------------------------------

      const metadata = await parseFile(request.file.path, {
        duration: true,
        skipCovers: true,
      });

      // ------------------------------------------------
      // Duração em segundos
      // ------------------------------------------------

      const detectedDuration = metadata.format.duration;

      // ------------------------------------------------
      // Validação da duração
      // ------------------------------------------------

      if (
        detectedDuration === undefined ||
        !Number.isFinite(detectedDuration) ||
        detectedDuration <= 0
      ) {
        // O arquivo foi salvo pelo Multer,
        // mas não conseguimos identificar um áudio
        // válido. Removemos o arquivo para não gerar
        // lixo dentro da pasta uploads.

        await fs.unlink(request.file.path).catch(() => {});

        response.status(400).json({
          message: "Não foi possível identificar a duração do arquivo de áudio",
        });

        return;
      }

      // ------------------------------------------------
      // Nosso banco usa Int para duração.
      //
      // Portanto convertemos os segundos fracionários
      // para um número inteiro.
      // ------------------------------------------------

      const duration = Math.round(detectedDuration);

      // ------------------------------------------------
      // URL pública
      // ------------------------------------------------

      const audioUrl = `/uploads/song-audio/${request.file.filename}`;

      // ------------------------------------------------
      // RESPOSTA
      // ------------------------------------------------

      response.status(201).json({
        audioUrl,
        duration,

        file: {
          filename: request.file.filename,

          mimeType: request.file.mimetype,

          size: request.file.size,
        },
      });
    } catch (error) {
      // ------------------------------------------------
      // Se o arquivo não puder ser interpretado,
      // removemos o upload inválido.
      // ------------------------------------------------

      await fs.unlink(request.file.path).catch(() => {});

      console.error(error);

      response.status(400).json({
        message: "Não foi possível processar o arquivo de áudio",
      });
    }
  },
);

// ======================================================
// EXPORTAÇÃO
// ======================================================

export default router;
