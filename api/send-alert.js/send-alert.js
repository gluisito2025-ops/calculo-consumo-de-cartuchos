export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido' });
  if (!process.env.RESEND_API_KEY) return response.status(500).json({ error: 'RESEND_API_KEY no está configurada' });
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const equipment = Array.isArray(body && body.equipment) ? body.equipment : [];
    const due = equipment.filter(item => Number.isFinite(Number(item.days)) && Number(item.days) <= 60);
    if (!due.length) return response.status(200).json({ sent: false, message: 'No hay equipos dentro del periodo de alerta' });
    const rows = due.map(item => '<tr><td>' + escapeHtml(item.af) + '</td><td>' + escapeHtml(item.name) + '</td><td>' + (Number(item.days) < 0 ? 'Vencido' : Number(item.days) + ' días') + '</td><td>' + escapeHtml(item.remaining) + '</td></tr>').join('');
    const html = '<h2>Alerta de compra de cartuchos</h2><p>Estos equipos requieren atención dentro de 60 días:</p><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>AF</th><th>Equipo</th><th>Tiempo</th><th>Disponibles</th></tr></thead><tbody>' + rows + '</tbody></table>';
    const resend = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM || 'onboarding@resend.dev', to: [process.env.ALERT_TO || 'luisromang@permoda.com.co'], subject: 'Alerta de compra: ' + due.length + ' equipo(s) requieren cartuchos', html }) });
    const result = await resend.json();
    if (!resend.ok) return response.status(502).json({ error: result && result.message || 'Resend rechazó el envío' });
    return response.status(200).json({ sent: true, count: due.length, id: result.id });
  } catch (error) { return response.status(400).json({ error: 'Solicitud inválida' }); }
}
function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
