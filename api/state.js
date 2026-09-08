const json = (value) => JSON.stringify(value);
const headers = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json'
});

export default async function handler(request, response) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (!url || !key) return response.status(500).json({ error: 'Supabase no está configurado' });

  try {
    if (request.method === 'GET') {
      const result = await fetch(        `${url}/rest/v1/app_state?select=id,equipment,updated_at,last_alert_date&id=eq.1&limit=1`,
        { headers: headers(key) }
      );
      if (!result.ok) throw new Error(await result.text());
      const rows = await result.json();
      const row = rows[0] || { equipment: [] };
      return response.status(200).json({
        equipment: Array.isArray(row.equipment) ? row.equipment : [],
        updated_at: row.updated_at || null,
        last_alert_date: row.last_alert_date || null
      });
    }

    if (request.method === 'PUT') {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
      const equipment = Array.isArray(body.equipment) ? body.equipment : [];
      const result = await fetch(        `${url}/rest/v1/app_state?id=eq.1`,
        {
          method: 'PATCH',
          headers: { ...headers(key), Prefer: 'return=representation' },
          body: json({ equipment, updated_at: new Date().toISOString() })
        }
      );
      if (!result.ok) throw new Error(await result.text());
      return response.status(200).json({ ok: true, equipment });
    }

    return response.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    return response.status(502).json({ error: 'No se pudo leer Supabase' });
  }
}
