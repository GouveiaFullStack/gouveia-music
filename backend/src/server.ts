// ======================================================
// IMPORTS
// ======================================================

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import artistsRoutes from "./routes/artists.routes.js";
import songsRoutes from "./routes/songs.routes.js";
import genresRoutes from "./routes/genres.routes.js";
import albumsRoutes from "./routes/albums.routes.js";
import playlistsRoutes from "./routes/playlists.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import historyRoutes from "./routes/history.routes.js";
import followsRoutes from "./routes/follows.routes.js";
import searchRoutes from "./routes/search.routes.js";
import { uploadErrorMiddleware } from "./middlewares/upload-error.middleware.js";
import uploadsRoutes from "./routes/uploads.routes.js";

// ======================================================
// CONFIGURAÇÃO DA APLICAÇÃO
// ======================================================

const app = express();

const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const uploadsDirectory = path.resolve(__dirname, "../uploads");

// ======================================================
// MIDDLEWARES
// ======================================================

// Permite que o Express receba JSON no body das requisições.
app.use(express.json());

app.use("/uploads", express.static(uploadsDirectory));

// ======================================================
// ROTA PRINCIPAL
// ======================================================

// GET /
app.get("/", (request, response) => {
  response.send("Mousiké Backend");
});

// ======================================================
// ROTAS DA API
// ======================================================

//Autenticação
app.use(authRoutes);

// Usuários
app.use(usersRoutes);

// Artistas
app.use(artistsRoutes);

// Músicas
app.use(songsRoutes);

// Gêneros
app.use(genresRoutes);

// Álbuns
app.use(albumsRoutes);

// Playlists
app.use(playlistsRoutes);

// Favoritos
app.use(favoritesRoutes);

// Histórico de reprodução
app.use(historyRoutes);

// Sistema de seguidores
app.use(followsRoutes);

// Busca global
app.use(searchRoutes);

app.use(uploadErrorMiddleware);

// Uploads
app.use(uploadsRoutes);

// ======================================================
// ROTA NÃO ENCONTRADA
// ======================================================

// Executada apenas quando nenhuma rota anterior corresponde
// à requisição recebida.
app.use((request, response) => {
  response.status(404).json({
    message: "Rota não encontrada",
  });
});

// ======================================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================================

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
