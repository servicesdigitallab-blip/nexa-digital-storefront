const supabaseUrl = process.env.SUPABASE_URL || 'https://ydbkvjgotjsjjfvruoei.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_5jsN-ZSP1YLw4Tu_mBg2Jw_5hv0HgOv';
const sbHeaders = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const SETTINGS_ID = '066a4027-9df8-45ee-ac41-32f26f11a507';
let liveSessions = {};

async function getCloudAnalytics() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}&select=about`, { headers: sbHeaders });
    if (res.ok) {
      const rows = await res.json();
      if (rows[0] && rows[0].about && rows[0].about.analytics) {
        return rows[0].about.analytics;
      }
    }
  } catch (e) {}
  return { events: [], tool_clicks: [] };
}

async function saveCloudAnalytics(stats) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}`, {
      method: 'PATCH',
      headers: sbHeaders,
      body: JSON.stringify({ about: { analytics: stats } })
    });
  } catch (e) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawUrl = (req.url || '').toLowerCase();
  const now = Date.now();

  for (const [sid, ts] of Object.entries(liveSessions)) {
    if (now - ts > 45000) delete liveSessions[sid];
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const headers = req.headers || {};
    const sid = body.sessionId || headers['x-forwarded-for'] || headers['x-real-ip'] || ('sess_' + Math.random().toString(36).slice(2, 8));
    liveSessions[sid] = now;

    const isClick = rawUrl.includes('click') || body.type === 'click';
    const isView = rawUrl.includes('view') || body.type === 'view';
    const isHeartbeat = rawUrl.includes('heartbeat') || body.type === 'heartbeat';
    const isVisit = rawUrl.includes('visit') || body.type === 'visit' || (!isClick && !isView && !isHeartbeat);

    if (isHeartbeat) {
      return res.status(200).json({ success: true, live: Math.max(1, Object.keys(liveSessions).length) });
    }

    const stats = await getCloudAnalytics();
    if (!Array.isArray(stats.events)) stats.events = [];
    if (!Array.isArray(stats.tool_clicks)) stats.tool_clicks = [];

    if (isClick) {
      const evt = {
        t: 'click',
        ts: now,
        d: body.device || 'desktop'
      };
      stats.events.push(evt);
      stats.tool_clicks.push({
        id: 'c_' + now,
        toolId: body.toolId || 'general',
        toolName: body.toolName || 'WhatsApp Click',
        planName: body.planName || 'Standard',
        device: body.device || 'desktop',
        timestamp: now
      });
      if (stats.tool_clicks.length > 1000) stats.tool_clicks = stats.tool_clicks.slice(-1000);
    } else if (isView) {
      stats.events.push({ t: 'view', ts: now, d: body.device || 'desktop' });
    } else if (isVisit) {
      stats.events.push({ t: 'visit', ts: now, d: body.device || 'desktop' });
    }

    // Keep up to 5000 events for rich multi-week historical filtering
    if (stats.events.length > 5000) stats.events = stats.events.slice(-5000);
    stats.last_updated = new Date().toISOString();
    await saveCloudAnalytics(stats);
    return res.status(200).json({ success: true });
  }

  // GET stats (for Admin Panel)
  const stats = await getCloudAnalytics();
  const liveCount = Math.max(1, Object.keys(liveSessions).length);

  res.status(200).json({
    live_visitors: liveCount,
    events: stats.events || [],
    tool_clicks: stats.tool_clicks || []
  });
};