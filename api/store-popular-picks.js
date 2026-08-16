const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ydbkvjgotjsjjfvruoei.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_5jsN-ZSP1YLw4Tu_mBg2Jw_5hv0HgOv';
const sbHdr = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

const SETTINGS_ID = '066a4027-9df8-45ee-ac41-32f26f11a507';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. Read Popular Picks from Supabase site_settings
    const [setRes, prodRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.${SETTINGS_ID}&select=hero`, { headers: sbHdr }).catch(() => null),
      fetch(`${supabaseUrl}/rest/v1/products?select=id,name,slug,price,image,category_id`, { headers: sbHdr }).catch(() => null)
    ]);

    let pickItems = ['e892e52e-eb16-4e51-947c-bdd56439c661', 'c8ef47b8-9a29-42dd-9946-e7e0cc449e50'];
    if (setRes && setRes.ok) {
      const setRows = await setRes.json();
      if (setRows[0] && setRows[0].hero && Array.isArray(setRows[0].hero.popular_picks) && setRows[0].hero.popular_picks.length > 0) {
        pickItems = setRows[0].hero.popular_picks;
      }
    }

    const allProducts = (prodRes && prodRes.ok) ? await prodRes.json() : [];

    const picks = pickItems.map((item, idx) => {
      // New format: item is a full object with product_id, name, icon_url, etc.
      if (typeof item === 'object' && item !== null) {
        const pid = item.product_id || '';
        const p = allProducts.find(x => x.id === pid) || {};
        const name = item.name || p.name || 'Tool';
        const image = item.icon_url || p.image || '/placeholder.svg';
        const price = item.price !== undefined ? Number(item.price) : (p.price || 0);
        const slug = p.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return {
          id: item.id || ('pick_' + (idx + 1)),
          product_id: p.id || pid,
          name: name,
          slug: slug,
          price: price,
          category_name: item.category_name || 'AI Tools',
          badge: item.badge || (idx === 0 ? '🔥 POPULAR' : '⚡ TOP VALUE'),
          icon_url: image,
          enabled: item.enabled !== false
        };
      }

      // Old format: item is a plain string (product UUID)
      const pid = item;
      const p = allProducts.find(x => x.id === pid || x.slug === pid) || {};
      const name = p.name || (pid === 'e892e52e-eb16-4e51-947c-bdd56439c661' ? 'ChatGPT' : 'CapCut Pro');
      const image = p.image || (name.toLowerCase().includes('chatgpt') ? '/product-images/c9cfe01e69991fec7f9caa41aa58de96.png' : '/product-images/capcut-pro.jpg');
      const price = Number(p.price || (name.toLowerCase().includes('chatgpt') ? 2300 : 1000));
      const slug = p.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return {
        id: 'pick_' + (idx + 1),
        product_id: p.id || pid,
        name: name,
        slug: slug,
        price: price,
        category_name: name.toLowerCase().includes('chatgpt') ? 'AI Tools' : 'Design Tools',
        badge: idx === 0 ? '🔥 POPULAR' : '⚡ TOP VALUE',
        icon_url: image,
        enabled: true
      };
    }).filter(p => p.enabled !== false);

    return res.status(200).json(picks);
  } catch (e) {
    return res.status(200).json([
      {
        id: 'pick_1',
        product_id: 'e892e52e-eb16-4e51-947c-bdd56439c661',
        name: 'ChatGPT',
        slug: 'chatgpt',
        price: 2300,
        category_name: 'AI Tools',
        badge: '🔥 POPULAR',
        icon_url: '/product-images/c9cfe01e69991fec7f9caa41aa58de96.png',
        enabled: true
      },
      {
        id: 'pick_2',
        product_id: 'c8ef47b8-9a29-42dd-9946-e7e0cc449e50',
        name: 'CapCut Pro',
        slug: 'capcut-pro',
        price: 1000,
        category_name: 'Design Tools',
        badge: '⚡ TOP VALUE',
        icon_url: '/product-images/capcut-pro.jpg',
        enabled: true
      }
    ]);
  }
};