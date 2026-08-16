const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ydbkvjgotjsjjfvruoei.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_5jsN-ZSP1YLw4Tu_mBg2Jw_5hv0HgOv';

function apiFetch(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(SUPABASE_URL + endpoint);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const code = (req.query.code || '').toUpperCase();
      const productId = req.query.product_id;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      // Fetch active coupon from Supabase matching the code
      const response = await apiFetch(`/rest/v1/coupons?code=eq.${encodeURIComponent(code)}&is_active=eq.true&select=*`);
      
      if (response.status !== 200 || !response.body || response.body.length === 0) {
        return res.status(404).json({ error: 'Coupon not found' });
      }
      
      const coupon = response.body[0];
      
      // Validate scope
      if (coupon.scope === 'specific') {
        const applicable = coupon.applicable_tools || [];
        if (!applicable.includes(productId)) {
          return res.status(400).json({ error: 'Coupon not applicable to this product' });
        }
      }
      
      // Valid coupon!
      return res.status(200).json(coupon);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Store Coupons API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
