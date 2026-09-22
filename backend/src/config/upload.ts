import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import multer from "multer";

// ======================================================
// IMAGENS
// ======================================================

const allowedImageTypes = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export function createImageUpload(folder: string) {
  const destination = path.resolve("uploads", folder);

  fs.mkdirSync(destination, {
    recursive: true,
  });

  const storage = multer.diskStorage({
    destination: (request, file, callback) => {
      callback(null, destination);
    },

    filename: (request, file, callback) => {
      const extension = allowedImageTypes.get(file.mimetype);

      if (!extension) {
        callback(new Error("Formato de imagem inválido"), "");

        return;
      }

      const filename = `${randomUUID()}${extension}`;

      callback(null, filename);
    },
  });

  return multer({
    storage,

    limits: {
      fileSize: 5 * 1024 * 1024,
    },

    fileFilter: (request, file, callback) => {
      if (!allowedImageTypes.has(file.mimetype)) {
        callback(null, false);
        return;
      }

      callback(null, true);
    },
  });
}

// ======================================================
// ÁUDIO
// ======================================================

const allowedAudioTypes = new Map<string, string>([
  ["audio/mpeg", ".mp3"],
  ["audio/mp3", ".mp3"],
  ["audio/x-mpeg", ".mp3"],
]);

// ======================================================
// PUBLICAÇÃO DE MÚSICA
// ======================================================
//
// Recebe:
// - audio: MP3
// - cover: JPEG, PNG ou WEBP
// ======================================================

export function createSongPublishUpload() {
  const audioDestination = path.resolve("uploads", "song-audio");

  const coverDestination = path.resolve("uploads", "song-covers");

  fs.mkdirSync(audioDestination, {
    recursive: true,
  });

  fs.mkdirSync(coverDestination, {
    recursive: true,
  });

  const storage = multer.diskStorage({
    destination: (request, file, callback) => {
      if (file.fieldname === "audio") {
        callback(null, audioDestination);

        return;
      }

      if (file.fieldname === "cover") {
        callback(null, coverDestination);

        return;
      }

      callback(new Error("Campo de arquivo inválido"), "");
    },

    filename: (request, file, callback) => {
      let extension: string | undefined;

      if (file.fieldname === "audio") {
        extension = allowedAudioTypes.get(file.mimetype);
      }

      if (file.fieldname === "cover") {
        extension = allowedImageTypes.get(file.mimetype);
      }

      if (!extension) {
        callback(new Error("Formato de arquivo inválido"), "");

        return;
      }

      const filename = `${randomUUID()}${extension}`;

      callback(null, filename);
    },
  });

  return multer({
    storage,

    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 2,
    },

    fileFilter: (request, file, callback) => {
      if (file.fieldname === "audio") {
        if (!allowedAudioTypes.has(file.mimetype)) {
          callback(new Error("Formato de áudio inválido"));

          return;
        }

        callback(null, true);

        return;
      }

      if (file.fieldname === "cover") {
        if (!allowedImageTypes.has(file.mimetype)) {
          callback(new Error("Formato de imagem inválido"));

          return;
        }

        callback(null, true);

        return;
      }

      callback(new Error("Campo de arquivo inválido"));
    },
  });
}
