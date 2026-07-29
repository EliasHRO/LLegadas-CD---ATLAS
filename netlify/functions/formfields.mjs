import { getStore } from "@netlify/blobs";
import { verifyToken, getTokenFromRequest, json, CORS_HEADERS } from "./_shared/auth.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  const store = getStore("formfields");

  // Público: el formulario de check-in lo necesita sin haber iniciado sesión.
  if (req.method === "GET") {
    const fields = await store.get("custom", { type: "json" });
    return json(fields || []);
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
    if (!Array.isArray(data.fields)) return json({ error: "Formato inválido" }, 400);

    const clean = data.fields
      .map((f) => ({
        id: (f.id || "").trim(),
        label: (f.label || "").trim(),
        type: f.type === "tel" ? "tel" : "text",
        required: !!f.required
      }))
      .filter((f) => f.id && f.label);

    await store.setJSON("custom", clean);
    return json({ ok: true, fields: clean });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/formfields" };
