import type { Request, Response, NextFunction } from "express";

import multer from "multer";

export function uploadErrorMiddleware(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({
        message: "O arquivo ultrapassa o tamanho máximo permitido",
      });

      return;
    }

    response.status(400).json({
      message: "Erro ao enviar o arquivo",
    });

    return;
  }

  if (error instanceof Error) {
    const knownUploadErrors = new Set([
      "Formato de áudio inválido",
      "Formato de imagem inválido",
      "Formato de arquivo inválido",
      "Campo de arquivo inválido",
    ]);

    if (knownUploadErrors.has(error.message)) {
      response.status(400).json({
        message: error.message,
      });

      return;
    }
  }

  next(error);
}
