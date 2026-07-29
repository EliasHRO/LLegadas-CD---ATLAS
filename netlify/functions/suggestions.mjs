import { getStore } from "@netlify/blobs";
import { verifyToken, getTokenFromRequest, json, CORS_HEADERS } from "./_shared/auth.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  const store = getStore("suggestions");

  if (req.method === "POST") {
    const auth = verifyToken(getTokenFromRequest(req));
    if (!auth) return json({ error: "No autorizado" }, 403);

    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }
    const message = (data.message || "").trim();
    if (!message) return json({ error: "Escribe tu sugerencia" }, 400);

    const id = `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = { id, message, from: auth.username, ts: Date.now() };
    await store.setJSON(id, record);

    (async () => {
      try {
        const settingsStore = getStore("settings");
        const settings = await settingsStore.get("config", { type: "json" });
        if (settings && settings.webhookUrl) {
          await fetch(settings.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "sugerencia",
              ...record,
              notifyEmail: settings.suggestionsEmail || settings.notifyEmail || ""
            })
          });
        }
      } catch {
        // silencioso
      }
    })();

    return json({ ok: true });
  }

  if (req.method === "GET") {
    const auth = verifyToken(getTokenFromRequest(req));
    if (!auth || auth.role !== "admin") return json({ error: "No autorizado" }, 403);
    const { blobs } = await store.list();
    const items = [];
    for (const b of blobs) {
      const v = await store.get(b.key, { type: "json" });
      if (v) items.push(v);
    }
    items.sort((a, b) => b.ts - a.ts);
    return json(items);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/suggestions" };
