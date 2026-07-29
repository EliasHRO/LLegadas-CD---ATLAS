import { getStore } from "@netlify/blobs";
import { hashPassword, makeSalt, verifyToken, getTokenFromRequest, json, CORS_HEADERS } from "./_shared/auth.mjs";

function requireAdmin(req) {
  const auth = verifyToken(getTokenFromRequest(req));
  if (!auth || auth.role !== "admin") return null;
  return auth;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  const auth = requireAdmin(req);
  if (!auth) return json({ error: "No autorizado" }, 403);

  const store = getStore("users");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const users = [];
    for (const b of blobs) {
      const u = await store.get(b.key, { type: "json" });
      if (u) users.push({ username: u.username, role: u.role, createdAt: u.createdAt });
    }
    users.sort((a, b) => a.username.localeCompare(b.username));
    return json(users);
  }

  if (req.method === "POST") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }
    const username = (data.username || "").trim().toLowerCase();
    const password = data.password || "";
    const role = data.role === "admin" ? "admin" : "viewer";

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return json({ error: "El usuario debe tener 3-30 caracteres (letras, números, puntos o guiones)" }, 400);
    }
    if (password.length < 4) {
      return json({ error: "La contraseña debe tener al menos 4 caracteres" }, 400);
    }

    const salt = makeSalt();
    await store.setJSON(`user:${username}`, {
      username,
      passwordHash: hashPassword(password, salt),
      salt,
      role,
      createdAt: Date.now()
    });
    return json({ ok: true });
  }

  if (req.method === "DELETE") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }
    const username = (data.username || "").trim().toLowerCase();
    if (username === auth.username) {
      return json({ error: "No puedes eliminar tu propio usuario" }, 400);
    }
    await store.delete(`user:${username}`);
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/users" };
