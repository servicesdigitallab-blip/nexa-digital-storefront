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

  // Try Supabase hero_cards
  try {
    const sbHdr = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
    const heroRes = await fetch(`${supabaseUrl}/rest/v1/hero_cards?select=*,products(id,slug,name,price,categories(name))&order=sort_order.asc`, { headers: sbHdr });
    if (heroRes && heroRes.ok) {
      const hero = await heroRes.json();
      if (hero && hero.length > 0) {
        const picks = hero.filter(h => h.enabled !== false).map(h => ({
          id: h.id,
          product_id: h.product_id,
          name: h.products ? h.products.name : 'Tool',
          slug: h.products ? (h.products.slug || h.products.id) : h.product_id,
          price: h.products ? h.products.price : 1000,
          category_name: h.products && h.products.categories ? h.products.categories.name : 'AI Tools',
          badge: h.badge || '🔥 POPULAR',
          icon_url: h.icon_url,
          enabled: h.enabled !== false
        }));
        return res.status(200).json(picks);
      }
    }
  } catch (e) {}

  // Fallback to store.json
  try {
    const storePath = path.join(__dirname, '..', 'data', 'store.json');
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      const active = (store.popular_picks || []).filter(p => p.enabled !== false);
      return res.status(200).json(active);
    }
  } catch (e) {}

  res.status(200).json([]);
};