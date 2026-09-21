// ======================================================
// IMPORTS
// ======================================================

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

// ======================================================
// CRIAR TOKEN
// ======================================================

export function createAccessToken(userId: number) {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: String(userId),

    // 7 dias em segundos
    expiresIn: 60 * 60 * 24 * 7,
  });

  return token;
}
