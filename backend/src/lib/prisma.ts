// Carrega as variáveis do arquivo .env
import "dotenv/config";

// Adapter que conecta o Prisma ao PostgreSQL
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma Client gerado a partir do nosso schema.prisma
import { PrismaClient } from "../generated/prisma/client.js";

// Pega a URL de conexão do arquivo .env
const connectionString = process.env.DATABASE_URL!;

// Cria o adapter PostgreSQL
const adapter = new PrismaPg({
  connectionString,
});

// Cria a instância do Prisma Client
export const prisma = new PrismaClient({
  adapter,
});
