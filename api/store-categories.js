const supabaseUrl = process.env.SUPABASE_URL || 'https://ydbkvjgotjsjjfvruoei.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_5jsN-ZSP1YLw4Tu_mBg2Jw_5hv0HgOv';
const sbHdr = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

const defaultCategories = [
  { id: "6230af5a-3103-4a36-bc56-edb18842798a", name: "AI Tools", type: "tools", sort_order: 0 },
  { id: "47328795-9697-45ac-93a6-0aef0149b7f0", name: "Design Tools", type: "tools", sort_order: 1 },
  { id: "e42bb213-8565-41fc-8f77-e46adba0c6db", name: "Productivity", type: "tools", sort_order: 2 },
  { id: "f2b1be28-9591-45bf-88e1-2798e115ea28", name: "RDS/VPS", type: "tools", sort_order: 3 },
  { id: "6020e0ee-fad2-47cc-9f15-340ea5cc3f0e", name: "SEO Tools", type: "tools", sort_order: 4 },
  { id: "d67ec43e-d50b-4899-90bd-d70e294f3701", name: "Streaming", type: "tools", sort_order: 5 },
  { id: "17b30f0c-cbf6-47fb-9b4c-4c5b3b90454d", name: "VPN", type: "tools", sort_order: 6 }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=*&order=sort_order.asc,name.asc`, { headers: sbHdr });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return res.status(200).json(data);
      }
    }
  } catch (e) {}

  return res.status(200).json(defaultCategories);
};
