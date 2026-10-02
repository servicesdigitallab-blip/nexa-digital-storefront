const fs = require('fs');
const path = require('path');

let cachedBlog = null;
let lastBlogRead = 0;

function getBlogData() {
  const now = Date.now();
  if (cachedBlog && (now - lastBlogRead < 5000)) return cachedBlog;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'blog.json'), 'utf8');
    cachedBlog = JSON.parse(raw);
    lastBlogRead = now;
    return cachedBlog;
  } catch (e) {
    return cachedBlog || { posts: [], categories: [] };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=30, stale-while-revalidate=60');

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
