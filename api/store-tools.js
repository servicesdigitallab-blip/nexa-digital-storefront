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

  // 1. Try Supabase Live Tables
  try {
    const sbHdr = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    };

    const [prodRes, plansRes, featsRes, faqsRes, catRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/products?select=*&order=sort_order.asc,created_at.desc`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/product_plans?select=*`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/product_features?select=*&order=sort_order.asc`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/product_faqs?select=*&order=sort_order.asc`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/categories?select=*`, { headers: sbHdr }).catch(() => null)
    ]);

    if (prodRes && prodRes.ok) {
      const products = await prodRes.json();
      const plans = (plansRes && plansRes.ok) ? await plansRes.json() : [];
      const feats = (featsRes && featsRes.ok) ? await featsRes.json() : [];
      const faqs = (faqsRes && faqsRes.ok) ? await faqsRes.json() : [];
      const categories = (catRes && catRes.ok) ? await catRes.json() : [];

      const catMap = {};
      categories.forEach(c => { catMap[c.id] = c.name; });

      const fullProducts = products.map(p => {
        const pPlans = plans.filter(pl => pl.product_id === p.id).sort((a, b) => (a.discounted_price || 0) - (b.discounted_price || 0));
        const pFeats = feats.filter(f => f.product_id === p.id).sort((a, b) => a.sort_order - b.sort_order).map(f => f.feature);
        const pFaqs = faqs.filter(fq => fq.product_id === p.id).sort((a, b) => a.sort_order - b.sort_order);
        const slug = p.slug || (p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : p.id);

        return {
          ...p,
          slug,
          category_name: catMap[p.category_id] || p.category_name || "AI Tools",
          plans: pPlans,
          features: pFeats,
          faqs: pFaqs
        };
      });

      // Sort tools deterministically by tools_order or sort_order
      try {
        const SETTINGS_ID = '066a4027-9df8-45ee-ac41-32f26f11a507';
        const setRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}&select=hero`, { headers: sbHdr });
        if (setRes.ok) {
          const rows = await setRes.json();
          if (rows[0] && rows[0].hero && Array.isArray(rows[0].hero.tools_order) && rows[0].hero.tools_order.length > 0) {
            const orderMap = {};
            rows[0].hero.tools_order.forEach((id, idx) => { orderMap[id] = idx; });
            fullProducts.sort((a, b) => {
              const ordA = orderMap[a.id] !== undefined ? orderMap[a.id] : (a.sort_order !== null && a.sort_order !== undefined ? a.sort_order : 9999);
              const ordB = orderMap[b.id] !== undefined ? orderMap[b.id] : (b.sort_order !== null && b.sort_order !== undefined ? b.sort_order : 9999);
              return ordA - ordB;
            });
          }
        }
      } catch(e) {}

      if (fullProducts.length > 0) {
        return res.status(200).json(fullProducts);
      }
    }
  } catch (e) {
    console.error('Supabase fetch error:', e);
  }

  // 2. Fallback to Local store.json bundle
  try {
    const p1 = path.join(process.cwd(), 'data', 'store.json');
    const p2 = path.join(__dirname, '..', 'data', 'store.json');
    const storePath = fs.existsSync(p1) ? p1 : p2;
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return res.status(200).json(store.products || []);
    }
  } catch (e) {}

  res.status(200).json([]);
};