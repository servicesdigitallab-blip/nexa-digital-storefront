const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ydbkvjgotjsjjfvruoei.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_5jsN-ZSP1YLw4Tu_mBg2Jw_5hv0HgOv';
const SETTINGS_ID = '066a4027-9df8-45ee-ac41-32f26f11a507';

const sbHeaders = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      let body = req.body || {};
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      const { name, email, subject, message } = body;
      if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
      }

      // Fetch current contact settings from Supabase
      const getRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}&select=contact`, {
        headers: sbHeaders
      });

      let contactData = {};
      if (getRes.ok) {
        const rows = await getRes.json();
        if (rows && rows[0] && rows[0].contact) {
          contactData = rows[0].contact;
        }
      }

      const inquiries = Array.isArray(contactData.inquiries) ? contactData.inquiries : [];
      const newInquiry = {
        id: crypto.randomUUID(),
        name: String(name).trim().slice(0, 100),
        email: String(email).trim().slice(0, 255),
        subject: String(subject || 'General Inquiry').trim().slice(0, 200),
        message: String(message).trim().slice(0, 3000),
        status: 'new',
        created_at: new Date().toISOString()
      };

      inquiries.unshift(newInquiry);
      contactData.inquiries = inquiries.slice(0, 500); // Keep last 500 inquiries

      // Save updated contact data to Supabase
      const patchRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}`, {
        method: 'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({
          contact: contactData,
          updated_at: new Date().toISOString()
        })
      });

      if (!patchRes.ok) {
        const err = await patchRes.text();
        console.error('Supabase contact save error:', err);
      }

      return res.status(200).json({
        success: true,
        message: 'Your message has been received! Our support team will get back to you shortly.',
        inquiry: newInquiry
      });
    } catch(e) {
      console.error('Contact submission error:', e);
      return res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
