// ======================================================
// VARIÁVEIS DE AMBIENTE
// ======================================================

import "dotenv/config";

// ======================================================
// JWT
// ======================================================

const jwtSecret = process.env.JWT_SECRET;

// O servidor não deve iniciar sem uma chave JWT.
if (!jwtSecret) {
  throw new Error("JWT_SECRET não foi configurado no arquivo .env");
}

// ======================================================
// EXPORTAÇÃO
// ======================================================

export const env = {
  JWT_SECRET: jwtSecret,
};
