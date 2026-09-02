const fs = require('fs');
const path = require('path');

let cachedBlog = null;

function getBlogData() {
  if (cachedBlog) return cachedBlog;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'blog.json'), 'utf8');
    cachedBlog = JSON.parse(raw);
    return cachedBlog;
  } catch (e) {
    return { posts: [], categories: [] };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const blog = getBlogData();
  const url = new URL('http://x' + (req.url || '/'));
  const slug = url.searchParams.get('slug');

  if (slug) {
    const post = (blog.posts || []).find(p => p.slug === slug);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.status(200).json({ post });
  }

  return res.status(200).json(blog);
};
