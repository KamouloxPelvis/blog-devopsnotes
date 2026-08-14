import { Router, Request, Response } from 'express';
import multer from 'multer';

import {
  requireAdmin,
  requireAuth,
  optionalAuth,
} from '../middleware/auth';

import { Article } from '../models/Article';
import { generateSlug } from '../utils/slug';

import {
  getCommentsCount,
  incrementViews,
} from '../controllers/articleController';

import { antivirusScan } from '../middleware/antivirus';
import { processImage } from '../middleware/imageProcessor';
import { uploadToR2 } from '../services/r2Service';
import { notifyGoogleIndexing } from '../services/googleIndexingService';

const router = Router();

// ============================================================
// CONFIGURATION MULTER
// ============================================================

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ============================================================
// UTILITAIRES
// ============================================================

/**
 * Génère un extrait de secours à partir du contenu.
 */
const generateFallbackExcerpt = (content: string): string => {
  const plainText = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) {
    return '';
  }

  return `${plainText.slice(0, 197)}...`;
};

/**
 * Normalise les tags avant stockage MongoDB.
 *
 * Exemple :
 * "Kubernetes, K3s, DEVOPS"
 * devient :
 * ["kubernetes", "k3s", "devops"]
 */
const normalizeTags = (
  tags?: string[] | string
): string[] => {
  if (!tags) {
    return [];
  }

  const tagList = Array.isArray(tags)
    ? tags
    : tags.split(',');

  return [
    ...new Set(
      tagList
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
};

// ============================================================
// 1. GET ALL ARTICLES
// ============================================================
//
// Visiteur anonyme : uniquement les articles publiés.
// Admin connecté : articles publiés + brouillons.
//
// Pagination conservée.
// ============================================================

router.get(
  '/',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(
        parseInt(req.query.page as string) || 1,
        1
      );

      const limit = Math.max(
        parseInt(req.query.limit as string) || 6,
        1
      );

      const skip = (page - 1) * limit;

      // --------------------------------------------------------
      // Sécurité :
      // les visiteurs ne doivent jamais recevoir les brouillons.
      // --------------------------------------------------------

      const query: {
        status?: 'draft' | 'published';
      } =
        req.user?.role === 'admin'
          ? {}
          : { status: 'published' };

      const [items, total] = await Promise.all([
        Article.find(query)
          .select(
            'title slug excerpt imageUrl likes likedBy views tags status createdAt updatedAt publishedAt author'
          )
          .populate('author', 'pseudo')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),

        Article.countDocuments(query),
      ]);

      return res.json({
        items,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      console.error(
        'Erreur récupération articles:',
        err
      );

      return res.status(500).json({
        message: 'Error fetching articles',
      });
    }
  }
);

// ============================================================
// 2. GET SINGLE ARTICLE
// ============================================================
//
// Même principe :
// - visiteur → article publié uniquement
// - admin → peut consulter un brouillon
// ============================================================

router.get(
  '/:slug',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const article = await Article.findOne({
        slug: req.params.slug,
      }).populate('author', 'pseudo');

      if (!article) {
        return res.status(404).json({
          message: 'Article not found',
        });
      }

      // Un visiteur ne peut pas consulter un brouillon.
      if (
        article.status !== 'published' &&
        req.user?.role !== 'admin'
      ) {
        return res.status(404).json({
          message: 'Article not found',
        });
      }

      return res.json(article);
    } catch (err) {
      console.error(
        'Erreur récupération article:',
        err
      );

      return res.status(500).json({
        message: 'Error fetching article',
      });
    }
  }
);

// ============================================================
// 3. CREATE ARTICLE
// ============================================================

router.post(
  '/',
  requireAdmin,
  upload.single('image'),
  antivirusScan,
  processImage,
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        content,
        excerpt: providedExcerpt,
        tags,
        status = 'draft',
      } = req.body;

      // --------------------------------------------------------
      // Validation minimale
      // --------------------------------------------------------

      if (!title?.trim() || !content) {
        return res.status(400).json({
          message: 'Required fields missing',
        });
      }

      // --------------------------------------------------------
      // Slug
      // --------------------------------------------------------

      const slug = generateSlug(title);

      const existing = await Article.findOne({
        slug,
      });

      if (existing) {
        return res.status(400).json({
          message: 'Title already exists',
        });
      }

      // --------------------------------------------------------
      // Image
      // --------------------------------------------------------

      let imageUrl = req.body.imageUrl || '';

      if (req.file) {
        const uploadedUrl = await uploadToR2(req.file);

        imageUrl = `${uploadedUrl}?v=${Date.now()}`;
      }

      // --------------------------------------------------------
      // Excerpt
      // --------------------------------------------------------

      const excerpt =
        providedExcerpt?.trim() ||
        generateFallbackExcerpt(content);

      // --------------------------------------------------------
      // Tags
      // --------------------------------------------------------

      const normalizedTags = normalizeTags(tags);

      // --------------------------------------------------------
      // Date de publication
      // --------------------------------------------------------

      const publishedAt =
        status === 'published'
          ? new Date()
          : undefined;

      // --------------------------------------------------------
      // Création MongoDB
      // --------------------------------------------------------

      const article = await Article.create({
        title: title.trim(),
        slug,
        content,
        imageUrl,
        excerpt,
        tags: normalizedTags,
        status,
        author: req.user?.id,
        publishedAt,
      });

      // --------------------------------------------------------
      // Google Indexing
      // --------------------------------------------------------

      if (article.status === 'published') {
        notifyGoogleIndexing(
          `https://blog.devopsnotes.org/articles/${article.slug}`
        );
      }

      return res.status(201).json(article);
    } catch (err) {
      console.error(
        'Erreur création article:',
        err
      );

      return res.status(500).json({
        message: 'Error creating article',
      });
    }
  }
);

// ============================================================
// 4. LIKE / UNLIKE
// ============================================================

router.post(
  '/:slug/like',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          message: 'Connectez-vous pour liker',
        });
      }

      const article = await Article.findOne({
        slug: req.params.slug,
      });

      if (!article) {
        return res.status(404).json({
          message: 'Article not found',
        });
      }

      const hasLiked = article.likedBy.includes(
        userId as any
      );

      if (hasLiked) {
        article.likedBy = article.likedBy.filter(
          (id) => id.toString() !== userId
        );

        article.likes = Math.max(
          0,
          article.likes - 1
        );
      } else {
        article.likedBy.push(userId as any);
        article.likes += 1;
      }

      await article.save();

      return res.json({
        likes: article.likes,
        hasLiked: !hasLiked,
      });
    } catch (err) {
      console.error(
        'Erreur like article:',
        err
      );

      return res.status(500).json({
        message: 'Like operation failed',
      });
    }
  }
);

// ============================================================
// 5. UPDATE ARTICLE
// ============================================================

router.put(
  '/:slug',
  requireAdmin,
  upload.single('image'),
  antivirusScan,
  processImage,
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        content,
        excerpt: providedExcerpt,
        tags,
        status,
        imageUrl: bodyImageUrl,
      } = req.body;

      const article = await Article.findOne({
        slug: req.params.slug,
      });

      if (!article) {
        return res.status(404).json({
          message: 'Article not found',
        });
      }

      // --------------------------------------------------------
      // Contenu
      // --------------------------------------------------------

      if (content !== undefined) {
        article.content = content;
      }

      // --------------------------------------------------------
      // Titre
      // --------------------------------------------------------

      if (title !== undefined && title.trim()) {
        article.title = title.trim();
      }

      // --------------------------------------------------------
      // Excerpt
      // --------------------------------------------------------

      if (providedExcerpt !== undefined) {
        article.excerpt =
          providedExcerpt.trim();
      } else if (content !== undefined) {
        article.excerpt =
          generateFallbackExcerpt(content);
      }

      // --------------------------------------------------------
      // Image
      // --------------------------------------------------------

      if (req.file) {
        const uploadedUrl =
          await uploadToR2(req.file);

        console.log(
          `✅ Image article uploadée dans R2: ${uploadedUrl}`
        );

        article.imageUrl =
          `${uploadedUrl}?v=${Date.now()}`;
      } else if (
        bodyImageUrl !== undefined
      ) {
        article.imageUrl = bodyImageUrl;
      }

      // --------------------------------------------------------
      // Tags
      // --------------------------------------------------------

      if (tags !== undefined) {
        article.tags =
          normalizeTags(tags);
      }

      // --------------------------------------------------------
      // Statut + publishedAt
      // --------------------------------------------------------

      const previousStatus =
        article.status;

      if (status !== undefined) {
        article.status = status;

        // Première publication
        if (
          previousStatus !== 'published' &&
          status === 'published'
        ) {
          article.publishedAt =
            new Date();
        }

        // Passage de publié à brouillon
        if (
          previousStatus === 'published' &&
          status === 'draft'
        ) {
          article.publishedAt =
            undefined;
        }
      }

      // --------------------------------------------------------
      // Sauvegarde
      // --------------------------------------------------------

      await article.save();

      // --------------------------------------------------------
      // Google Indexing
      // --------------------------------------------------------

      if (article.status === 'published') {
        notifyGoogleIndexing(
          `https://blog.devopsnotes.org/articles/${article.slug}`
        );
      }

      return res.json(article);
    } catch (err) {
      console.error(
        'Erreur update article:',
        err
      );

      return res.status(500).json({
        message: 'Error updating article',
      });
    }
  }
);

// ============================================================
// 6. DELETE ARTICLE
// ============================================================

router.delete(
  '/:slug',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const article =
        await Article.findOneAndDelete({
          slug: req.params.slug,
        });

      if (!article) {
        return res.status(404).json({
          message: 'Article not found',
        });
      }

      return res.status(204).send();
    } catch (err) {
      console.error(
        'Erreur suppression article:',
        err
      );

      return res.status(500).json({
        message: 'Error deleting article',
      });
    }
  }
);

// ============================================================
// 7. NOMBRE DE COMMENTAIRES
// ============================================================

router.get(
  '/:slug/comments/count',
  getCommentsCount
);

// ============================================================
// 8. INCRÉMENTER LES VUES
// ============================================================

router.post(
  '/:slug/view',
  incrementViews
);

export default router;