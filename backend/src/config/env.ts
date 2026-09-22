// ======================================================
// VARIÁVEIS DE AMBIENTE
// ======================================================

import "dotenv/config";

// ======================================================
// JWT
// ======================================================

const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;

// O servidor não deve iniciar sem uma chave JWT.
if (!jwtSecret) {
  throw new Error("JWT_SECRET não foi configurado no arquivo .env");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi configurado no arquivo .env");
}

// ======================================================
// EXPORTAÇÃO
// ======================================================

export const env = {
  JWT_SECRET: jwtSecret,
  DATABASE_URL: databaseUrl,
};
