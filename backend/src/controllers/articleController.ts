import { Request, Response } from 'express';
import { Article, IArticle } from '../models/Article';
import { Comment } from '../models/Comment';

// 1. Récupérer tous les articles
export const getAllArticles = async (req: Request, res: Response) => {
  try {
    // Récupération du numéro de page depuis la requête, par défaut 1
    const page = parseInt(req.query.page as string) || 1;
    const limit = 4; // Ta limite stricte de 4 articles
    const skip = (page - 1) * limit;

    // On compte le total pour calculer le nombre de pages sur le front
    const total = await Article.countDocuments();
    
    const articles = await Article.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      articles,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalArticles: total
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des articles" });
  }
};

// 2. Récupérer un article par son slug
export const getArticleBySlug = async (req: Request, res: Response) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug });
    if (!article) return res.status(404).json({ message: "Article non trouvé" });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les articles associés à partir des tags
export const getRelatedArticles = async (
  req: Request,
  res: Response
) => {
  try {
    const { slug } = req.params;

    const currentArticle = await Article.findOne({
      slug,
      status: 'published',
    }).select('slug tags');

    if (!currentArticle) {
      return res.status(404).json({
        message: 'Article not found',
      });
    }

    const currentTags = currentArticle.tags || [];

    if (currentTags.length === 0) {
      return res.json([]);
    }

    const articles = await Article.find({
      status: 'published',
      slug: { $ne: slug },
      tags: { $in: currentTags },
    })
      .select(
        'title slug excerpt imageUrl likes views tags createdAt updatedAt publishedAt'
      )
      .limit(20)
      .lean();

    const related = articles
      .map((article) => {
        const articleTags = article.tags || [];

        const relevance = articleTags.filter((tag) =>
          currentTags.includes(tag)
        ).length;

        return {
          ...article,
          relevance,
        };
      })
      .filter((article) => article.relevance > 0)
      .sort((a, b) => {
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }

        return (
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
        );
      })
      .slice(0, 3);

    return res.json(related);
  } catch (error) {
    console.error(
      'Erreur récupération articles associés:',
      error
    );

    return res.status(500).json({
      message: 'Error fetching related articles',
    });
  }
};

// LOGIQUE DES LIKES (Unique & Toggle)
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id; 

    if (!userId) return res.status(401).json({ message: "Vous devez être connecté" });

    const article = await Article.findOne({ slug });
    if (!article) return res.status(404).json({ message: "Article introuvable" });

    // Vérification si l'utilisateur a déjà liké
    // On convertit en string pour comparer les IDs
    const hasLiked = article.likedBy.some(id => id.toString() === userId.toString());

    if (hasLiked) {
      // UNLIKE : Retire l'ID et décrémente
      article.likedBy = article.likedBy.filter(id => id.toString() !== userId.toString());
      article.likes = Math.max(0, article.likes - 1);
    } else {
      // LIKE : Ajoute l'ID et incrémente
      article.likedBy.push(userId as any);
      article.likes += 1;
    }

    // Grâce à ton interface corrigée, .save() ne posera plus de problème de type
    await article.save();
    
    res.json({ 
      likes: article.likes, 
      hasLiked: !hasLiked 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du traitement du like" });
  }
};

// 4. Récupérer le nombre de commentaires pour un article
export const getCommentsCount = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // On compte directement les documents qui ont ce slug
    const count = await Comment.countDocuments({ articleSlug: slug });

    res.json({ count });
  } catch (error) {
    console.error("Erreur lors du comptage des commentaires:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 5. Compter le nombre de vues des articles
export const incrementViews = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } }, // Incrémente de 1
      { new: true }
    );

    if (!article) return res.status(404).json({ message: "Article non trouvé" });
    
    res.json({ views: article.views });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'incrémentation des vues" });
  }
};