import { Request, Response } from 'express';
import { Article } from '../models/Article';
import { Thread } from '../models/Thread';

const BASE_URL = 'https://blog.devopsnotes.org';

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const getSitemap = async (
  _req: Request,
  res: Response
) => {
  try {
    const [articles, threads] = await Promise.all([
      Article.find(
        { status: 'published' },
        'slug updatedAt'
      ).lean(),

      Thread.find(
        {},
        '_id updatedAt'
      )
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean(),
    ]);

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

    // ============================================================
    // Génération du sitemap XML
    // ============================================================

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

    res
      .status(200)
      .type('application/xml')
      .send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);

    res
      .status(500)
      .type('text/plain')
      .send('Unable to generate sitemap');
  }
};