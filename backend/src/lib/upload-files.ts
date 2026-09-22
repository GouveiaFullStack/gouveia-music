import path from "node:path";
import { unlink } from "node:fs/promises";

// ======================================================
// DIRETÓRIO DE UPLOADS
// ======================================================

const uploadsDirectory = path.resolve("uploads");

// ======================================================
// REMOVE ARQUIVO PELO CAMINHO FÍSICO
// ======================================================
//
// Exemplo:
//
// C:\Mousike\backend\uploads\song-covers\arquivo.jpg
//
// Usado principalmente quando um upload acabou de ser
// recebido pelo Multer, mas alguma etapa posterior falha.
// ======================================================

export async function removeUploadedFile(filePath: string | undefined) {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;

    // Se o arquivo já não existe, não há problema.
    if (fileError.code === "ENOENT") {
      return;
    }

    console.error("Erro ao remover arquivo:", error);
  }
}

// ======================================================
// REMOVE ARQUIVO A PARTIR DA URL SALVA NO BANCO
// ======================================================
//
// Exemplo salvo no PostgreSQL:
//
// /uploads/song-covers/arquivo.jpg
//
// Converte para:
//
// C:\Mousike\backend\uploads\song-covers\arquivo.jpg
//
// URLs externas não são removidas.
// ======================================================

export async function removeLocalUploadByUrl(
  fileUrl: string | null | undefined,
) {
  if (!fileUrl) {
    return;
  }

  // ----------------------------------------------------
  // Apenas arquivos gerenciados pelo próprio Mousiké
  // ----------------------------------------------------

  if (!fileUrl.startsWith("/uploads/")) {
    return;
  }

  // Remove "/uploads/" da URL.
  const relativePath = fileUrl.slice("/uploads/".length);

  // Caminho físico completo.
  const filePath = path.resolve(uploadsDirectory, relativePath);

  // ----------------------------------------------------
  // PROTEÇÃO CONTRA PATH TRAVERSAL
  // ----------------------------------------------------
  //
  // Impede caminhos como:
  //
  // /uploads/../../arquivo-importante
  // ----------------------------------------------------

  const uploadsPrefix = `${uploadsDirectory}${path.sep}`;

  if (!filePath.startsWith(uploadsPrefix)) {
    console.error("Tentativa de remover arquivo fora de uploads:", fileUrl);

    return;
  }

  await removeUploadedFile(filePath);
}
