import { getStore } from "@netlify/blobs";
import { hashPassword, makeSalt, signToken, json, CORS_HEADERS } from "./_shared/auth.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let data;
  try {
    data = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const store = getStore("users");

  // Primer arranque: si no existe ningún usuario, se crea el admin por defecto.
  const { blobs } = await store.list();
  if (blobs.length === 0) {
    const salt = makeSalt();
    await store.setJSON("user:admin", {
      username: "admin",
      passwordHash: hashPassword("Torre2026", salt),
      salt,
      role: "admin",
      createdAt: Date.now()
    });
  }

  const username = (data.username || "").trim().toLowerCase();
  const password = data.password || "";
  if (!username || !password) {
    return json({ error: "Usuario y contraseña son obligatorios" }, 400);
  }

  const user = await store.get(`user:${username}`, { type: "json" });
  if (!user) return json({ error: "Usuario o contraseña incorrectos" }, 401);

  const { verifyPassword } = await import("./_shared/auth.mjs");
  if (!verifyPassword(password, user.salt, user.passwordHash)) {
    return json({ error: "Usuario o contraseña incorrectos" }, 401);
  }

  const token = signToken(user.username, user.role);
  return json({ token, username: user.username, role: user.role });
};

export const config = { path: "/api/auth" };
