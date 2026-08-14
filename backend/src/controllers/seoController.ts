const urls: string[] = [];

// ============================================================
// Pages principales
// ============================================================

urls.push(`
  <url>
    <loc>${BASE_URL}/</loc>
  </url>`);

urls.push(`
  <url>
    <loc>${BASE_URL}/articles</loc>
  </url>`);

urls.push(`
  <url>
    <loc>${BASE_URL}/forum</loc>
  </url>`);

// ============================================================
// Articles publiés uniquement
// ============================================================

for (const article of articles) {
  if (!article.slug) {
    continue;
  }

  const lastmod = article.updatedAt
    ? new Date(article.updatedAt).toISOString()
    : null;

  urls.push(`
  <url>
    <loc>${BASE_URL}/articles/${escapeXml(article.slug)}</loc>
    ${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}
  </url>`);
}

// ============================================================
// Threads du forum
// ============================================================

for (const thread of threads) {
  const lastmod = thread.updatedAt
    ? new Date(thread.updatedAt).toISOString()
    : null;

  urls.push(`
  <url>
    <loc>${BASE_URL}/forum/thread/${thread._id}</loc>
    ${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}
  </url>`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

res
  .status(200)
  .type('application/xml')
  .send(xml);