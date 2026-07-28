import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("settings");

  if (req.method === "GET") {
    const settings = await store.get("config", { type: "json" });
    return new Response(JSON.stringify(settings || {}), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST") {
    let data;
    try {
      data = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
    }
    await store.setJSON("config", data);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Método no permitido", { status: 405 });
};

export const config = { path: "/api/settings" };
