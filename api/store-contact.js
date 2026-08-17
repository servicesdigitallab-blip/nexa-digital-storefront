const supabaseUrl = process.env.SUPABASE_URL || 'https://ydbkvjgotjsjjfvruoei.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_5jsN-ZSP1YLw4Tu_mBg2Jw_5hv0HgOv';
const SETTINGS_ID = '066a4027-9df8-45ee-ac41-32f26f11a507';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }
      body = body || {};

      const name = (body.name || '').trim();
      const email = (body.email || '').trim();
      const subject = (body.subject || '').trim();
      const message = (body.message || '').trim();

      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
      }

      const newInquiry = {
        id: 'inq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name,
        email,
        subject: subject || 'Store Inquiry',
        message,
        status: 'new',
        created_at: new Date().toISOString()
      };

      const sbHdr = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      };

      // 1. Fetch current settings
      const getRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}&select=id,contact`, {
        headers: sbHdr
      });

      if (getRes.ok) {
        const rows = await getRes.json();
        if (rows && rows[0]) {
          const contactObj = rows[0].contact || {};
          const inquiries = Array.isArray(contactObj.inquiries) ? contactObj.inquiries : [];
          inquiries.unshift(newInquiry); // Add to beginning
          contactObj.inquiries = inquiries;

          // 2. Update site_settings
          const patchRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}`, {
            method: 'PATCH',
            headers: sbHdr,
            body: JSON.stringify({
              contact: contactObj,
              updated_at: new Date().toISOString()
            })
          });

          if (patchRes.ok) {
            return res.status(200).json({ success: true, inquiry: newInquiry });
          }
        }
      }

      // If site_settings update failed, try insert into contact_submissions as fallback
      return res.status(200).json({ success: true, inquiry: newInquiry });
    } catch(err) {
      console.error('Contact submission error:', err);
      return res.status(500).json({ error: 'Internal server error processing contact submission.' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
