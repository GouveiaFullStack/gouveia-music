// Adapter que conecta o Prisma ao PostgreSQL
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma Client gerado a partir do nosso schema.prisma
import { PrismaClient } from "../generated/prisma/client.js";

// Import env
import { env } from "../config/env.js";

// Pega a URL de conexão do arquivo .env
const connectionString = env.DATABASE_URL;

// Cria o adapter PostgreSQL
const adapter = new PrismaPg({
  connectionString,
});

// Cria a instância do Prisma Client
export const prisma = new PrismaClient({
  adapter,
});
