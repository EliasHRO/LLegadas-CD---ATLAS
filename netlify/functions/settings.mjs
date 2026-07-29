import { getStore } from "@netlify/blobs";
import { verifyToken, getTokenFromRequest, json, CORS_HEADERS } from "./_shared/auth.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  const store = getStore("settings");

  // Público: el check-in necesita leer la geocerca sin haber iniciado sesión
  if (req.method === "GET") {
    const settings = await store.get("config", { type: "json" });
    return json(settings || {});
  }

  if (req.method === "POST") {
    const auth = verifyToken(getTokenFromRequest(req));
    if (!auth || auth.role !== "admin") return json({ error: "No autorizado" }, 403);

    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }
    await store.setJSON("config", data);
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/settings" };
