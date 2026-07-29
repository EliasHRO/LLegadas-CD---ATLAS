import { getStore } from "@netlify/blobs";

// El Salvador no usa horario de verano: UTC-6 fijo
const EL_SALVADOR_OFFSET_MS = -6 * 60 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const store = getStore("arrivals");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const records = [];
    for (const b of blobs) {
      const val = await store.get(b.key, { type: "json" });
      if (val) records.push(val);
    }
    records.sort((a, b) => a.ts - b.ts);
    return json(records);
  }

  if (req.method === "POST") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }

    const provider = (data.provider || "").trim();
    const driverName = (data.driverName || "").trim();
    const plate = (data.plate || "").trim();

    if (!provider || !driverName || !plate) {
      return json({ error: "Faltan datos: proveedor, motorista y placa son obligatorios" }, 400);
    }

    // Geocerca: si está activada, se valida también en el servidor (no solo en el navegador)
    const settingsStore = getStore("settings");
    const settings = await settingsStore.get("config", { type: "json" });
    let geoDistance = typeof data.geoDistance === "number" ? data.geoDistance : null;

    if (settings && settings.geofenceEnabled && settings.geofenceLat != null && settings.geofenceLng != null) {
      if (typeof data.geoLat !== "number" || typeof data.geoLng !== "number") {
        return json({ error: "Se requiere verificar tu ubicación para registrarte" }, 403);
      }
      const dist = haversineMeters(data.geoLat, data.geoLng, settings.geofenceLat, settings.geofenceLng);
      geoDistance = Math.round(dist);
      if (dist > settings.geofenceRadius) {
        return json({ error: `Estás a ${Math.round(dist)} m del centro. Debes estar a menos de ${settings.geofenceRadius} m.` }, 403);
      }
    }

    const utcNow = new Date();
    const local = new Date(utcNow.getTime() + EL_SALVADOR_OFFSET_MS);
    const date = local.toISOString().slice(0, 10);
    const time = local.toISOString().slice(11, 16);

    const id = `arrival-${utcNow.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = {
      id, provider, driverName, plate, ts: utcNow.getTime(), date, time,
      status: "esperando", dispatchedAt: null,
      geoLat: typeof data.geoLat === "number" ? data.geoLat : null,
      geoLng: typeof data.geoLng === "number" ? data.geoLng : null,
      geoDistance
    };

    await store.setJSON(id, record);

    // Notificación vía webhook (Zapier / Make / Pipedream). No bloquea la respuesta al transportista.
    (async () => {
      try {
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

    return json(record);
  }

  if (req.method === "PATCH") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }
    if (!data.id || !data.status) {
      return json({ error: "Falta id o status" }, 400);
    }
    const existing = await store.get(data.id, { type: "json" });
    if (!existing) {
      return json({ error: "Registro no encontrado" }, 404);
    }
    existing.status = data.status;
    existing.dispatchedAt = data.status === "despachado" ? Date.now() : null;
    await store.setJSON(data.id, existing);
    return json(existing);
  }

  return new Response("Método no permitido", { status: 405, headers: CORS_HEADERS });
};

export const config = { path: "/api/arrivals" };
