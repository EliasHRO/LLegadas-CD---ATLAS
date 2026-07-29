import { getStore } from "@netlify/blobs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const store = getStore("settings");

  if (req.method === "GET") {
    const settings = await store.get("config", { type: "json" });
    return new Response(JSON.stringify(settings || {}), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    });
  }

  if (req.method === "POST") {
    let data;
    try {
      data = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS }
      });
    }
    await store.setJSON("config", data);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    });
  }

  return new Response("Método no permitido", { status: 405, headers: CORS_HEADERS });
};

export const config = { path: "/api/settings" };
