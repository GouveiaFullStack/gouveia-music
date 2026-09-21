// ======================================================
// IMPORTS
// ======================================================

import type { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

// ======================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ======================================================

export function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  // ----------------------------------------------------
  // Lê o header Authorization
  // ----------------------------------------------------

  const authorization = request.headers.authorization;

  if (!authorization) {
    response.status(401).json({
      message: "Token de autenticação não informado",
    });

    return;
  }

  // Esperamos:
  //
  // Authorization: Bearer TOKEN
  //
  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    response.status(401).json({
      message: "Token de autenticação inválido",
    });

    return;
  }

  // ----------------------------------------------------
  // Valida o JWT
  // ----------------------------------------------------

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    // jwt.verify também pode retornar string.
    // No nosso caso esperamos um objeto JWT.
    if (typeof payload === "string" || !payload.sub) {
      response.status(401).json({
        message: "Token de autenticação inválido",
      });

      return;
    }

    // --------------------------------------------------
    // Recupera o ID do usuário
    // --------------------------------------------------

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(401).json({
        message: "Token de autenticação inválido",
      });

      return;
    }

    // Agora as próximas etapas da requisição conseguem
    // saber quem é o usuário autenticado.
    request.userId = userId;

    // Continua para a próxima função/rota.
    next();
  } catch {
    response.status(401).json({
      message: "Token de autenticação inválido ou expirado",
    });
  }
}

// ======================================================
// MIDDLEWARE DE AUTENTICAÇÃO OPCIONAL
// ======================================================

export function optionalAuthMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.headers.authorization;

  // Se não existe token, continua normalmente.
  if (!authorization) {
    next();
    return;
  }

  const [type, token] = authorization.split(" ");

  // Se enviou Authorization, ele precisa ser válido.
  if (type !== "Bearer" || !token) {
    response.status(401).json({
      message: "Token de autenticação inválido",
    });

    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (typeof payload === "string" || !payload.sub) {
      response.status(401).json({
        message: "Token de autenticação inválido",
      });

      return;
    }

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(401).json({
        message: "Token de autenticação inválido",
      });

      return;
    }

    request.userId = userId;

    next();
  } catch {
    response.status(401).json({
      message: "Token de autenticação inválido ou expirado",
    });
  }
}
