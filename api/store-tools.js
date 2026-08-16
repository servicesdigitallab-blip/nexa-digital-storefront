const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ydbkvjgotjsjjfvruoei.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_5jsN-ZSP1YLw4Tu_mBg2Jw_5hv0HgOv';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Try live Supabase data
  try {
    const sbHdr = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    };

    const [prodRes, plansRes, featsRes, faqsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/products?select=*&order=sort_order.asc,created_at.desc`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/product_plans?select=*`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/product_features?select=*&order=sort_order.asc`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/product_faqs?select=*&order=sort_order.asc`, { headers: sbHdr }).catch(() => null)
    ]);

    if (prodRes && prodRes.ok) {
      const products = await prodRes.json();
      const plans = (plansRes && plansRes.ok) ? await plansRes.json() : [];
      const feats = (featsRes && featsRes.ok) ? await featsRes.json() : [];
      const faqs = (faqsRes && faqsRes.ok) ? await faqsRes.json() : [];

      const fullProducts = products.map(p => ({
        ...p,
        plans: plans.filter(pl => pl.product_id === p.id),
        features: feats.filter(f => f.product_id === p.id).map(f => f.feature),
        faqs: faqs.filter(fq => fq.product_id === p.id)
      }));

      if (fullProducts.length > 0) {
        return res.status(200).json(fullProducts);
      }
    }
  } catch (e) {
    console.error('Supabase fetch error, fallback to bundle:', e);
  }

  // Fallback to static store.json bundle
  try {
    const storePath = path.join(__dirname, '..', 'data', 'store.json');
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return res.status(200).json(store.products || []);
    }
  } catch (e) {}

  res.status(200).json([]);
};