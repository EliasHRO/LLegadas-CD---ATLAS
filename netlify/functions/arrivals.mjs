import { getStore } from "@netlify/blobs";

// El Salvador no usa horario de verano: UTC-6 fijo
const EL_SALVADOR_OFFSET_MS = -6 * 60 * 60 * 1000;

export default async (req) => {
  const store = getStore("arrivals");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const records = [];
    for (const b of blobs) {
      const val = await store.get(b.key, { type: "json" });
      if (val) records.push(val);
    }
    records.sort((a, b) => a.ts - b.ts);
    return new Response(JSON.stringify(records), {
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

    const provider = (data.provider || "").trim();
    const driverName = (data.driverName || "").trim();
    const plate = (data.plate || "").trim();

    if (!provider || !driverName || !plate) {
      return new Response(JSON.stringify({ error: "Faltan datos: proveedor, motorista y placa son obligatorios" }), { status: 400 });
    }

    const utcNow = new Date();
    const local = new Date(utcNow.getTime() + EL_SALVADOR_OFFSET_MS);
    const date = local.toISOString().slice(0, 10);
    const time = local.toISOString().slice(11, 16);

    const id = `arrival-${utcNow.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = { id, provider, driverName, plate, ts: utcNow.getTime(), date, time };

    await store.setJSON(id, record);

    // Notificación vía webhook (Zapier / Make / Pipedream). No bloquea la respuesta al transportista.
    (async () => {
      try {
        const settingsStore = getStore("settings");
        const settings = await settingsStore.get("config", { type: "json" });
        if (settings && settings.webhookUrl) {
          await fetch(settings.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...record, notifyEmail: settings.notifyEmail || "" })
          });
        }
      } catch {
        // silencioso: la notificación no debe afectar el registro
      }
    })();

    return new Response(JSON.stringify(record), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Método no permitido", { status: 405 });
};

export const config = { path: "/api/arrivals" };
