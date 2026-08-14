import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useAllArticles } from '../hooks/useAllArticles';
import { Article } from '../types/articles';
import MarkdownPreview from '../components/MarkdownPreview';
import {
  Heart,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import '../styles/ArticlesPage.css';

type CommentCountMap = Record<string, number>;
type LikeCountMap = Record<string, number>;

export function ArticlesPage() {
  // ============================================================
  // ÉTAT DE LA PAGE & DONNÉES
  // ============================================================

  const [page, setPage] = useState(1);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { articles, totalPages, loading } = useAllArticles(page);

  const [commentCounts, setCommentCounts] =
    useState<CommentCountMap>({});

  const [likedArticles, setLikedArticles] =
    useState<Set<string>>(new Set());

  const [localLikeCounts, setLocalLikeCounts] =
    useState<LikeCountMap>({});

  const [isLiking, setIsLiking] =
    useState<string | null>(null);

  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const R2_PUBLIC_URL =
    process.env.REACT_APP_R2_PUBLIC_URL ??
    'https://resources.devopsnotes.org';

  // ============================================================
  // SEO
  // ============================================================

  const pageTitle =
    'Articles DevOps, DevSecOps & Cloud | DevOpsNotes';

  const pageDescription =
    'Articles techniques, expérimentations et retours d’expérience autour du DevOps, du DevSecOps, du Cloud, de Kubernetes, des infrastructures et de la cybersécurité.';

  // ============================================================
  // FORMATAGE DE DATE
  // ============================================================

  const formatPublishedDate = (date?: string) => {
    if (!date) return null;

    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // ============================================================
  // EFFETS SECONDAIRES
  // ============================================================

  useEffect(() => {
    if (articles.length === 0) return;

    // Initialisation des likes de l'utilisateur
    if (user) {
      const initialLikes = new Set<string>();

      articles.forEach((article: Article) => {
        if (
          article.likedBy?.some(
            (id: any) => id.toString() === user.id
          )
        ) {
          initialLikes.add(article.slug);
        }
      });

      setLikedArticles(initialLikes);
    } else {
      setLikedArticles(new Set());
    }

    // Récupération des commentaires
    const loadCounts = async () => {
      const counts: CommentCountMap = {};

      await Promise.all(
        articles.map(async (article: Article) => {
          try {
            const res = await api.get(
              `/articles/${article.slug}/comments/count`
            );

            counts[article.slug] = res.data.count;
          } catch {
            counts[article.slug] = 0;
          }
        })
      );

      setCommentCounts(counts);
    };

    loadCounts();
  }, [articles, user]);

  // ============================================================
  // LIKES
  // ============================================================

  const handleLike = async (slug: string) => {
    if (!user) {
      alert('Connectez-vous pour aimer cet article !');
      return;
    }

    if (isLiking === slug) return;

    try {
      setIsLiking(slug);

      const res = await api.post(`/articles/${slug}/like`);

      const { hasLiked, likes } = res.data;

      setLikedArticles((prev) => {
        const newSet = new Set(prev);

        if (hasLiked) {
          newSet.add(slug);
        } else {
          newSet.delete(slug);
        }

        return newSet;
      });

      setLocalLikeCounts((prev) => ({
        ...prev,
        [slug]: likes,
      }));
    } catch (error) {
      console.error('Erreur like:', error);
    } finally {
      setIsLiking(null);
    }
  };

  // ============================================================
  // ARTICLES VISIBLES
  // ============================================================

  /*
   * En attendant le filtrage définitif des brouillons côté backend,
   * on évite qu'un utilisateur non administrateur voie un brouillon.
   *
   * Le backend devra également être sécurisé pour que cette logique
   * frontend ne soit pas notre seule protection.
   */
  const visibleArticles = useMemo(() => {
    if (isAdmin) {
      return articles;
    }

    return articles.filter(
      (article: Article) => article.status !== 'draft'
    );
  }, [articles, isAdmin]);

  // ============================================================
  // FILTRES : RECHERCHE + TAGS
  // ============================================================

  const filteredArticles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return visibleArticles.filter((article: Article) => {
      const matchesTag =
        activeTag === null ||
        (article.tags || []).includes(activeTag);

      const matchesSearch =
        term === '' ||
        article.title.toLowerCase().includes(term) ||
        (article.excerpt || '').toLowerCase().includes(term) ||
        (article.tags || []).some((tag) =>
          tag.toLowerCase().includes(term)
        );

      return matchesTag && matchesSearch;
    });
  }, [
    visibleArticles,
    activeTag,
    searchTerm,
  ]);

  // ============================================================
  // LISTE DES TAGS
  // ============================================================

  const allTags = useMemo(() => {
    const tags = new Set(
      visibleArticles.flatMap(
        (article: Article) => article.tags || []
      )
    );

    return Array.from(tags)
      .filter(Boolean)
      .sort();
  }, [visibleArticles]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const PaginationNav = () => {
    if (totalPages <= 1) return null;

    return (
      <nav
        className="pagination-container"
        aria-label="Pagination des articles"
      >
        <div className="pagination-dots-wrapper">
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) =>
                Math.max(1, currentPage - 1)
              )
            }
            disabled={page === 1}
            className="pagination-arrow-btn"
            aria-label="Page précédente"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="pagination-pages-list">
            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;

              return (
                <button
                  type="button"
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`pagination-number ${
                    page === pageNumber ? 'active' : ''
                  }`}
                  aria-current={
                    page === pageNumber ? 'page' : undefined
                  }
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setPage((currentPage) =>
                Math.min(totalPages, currentPage + 1)
              )
            }
            disabled={page === totalPages}
            className="pagination-arrow-btn"
            aria-label="Page suivante"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </nav>
    );
  };

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="articles-content fade-in-page">

      {/* ======================================================
          SEO
          ====================================================== */}

      <Helmet>
        <title>{pageTitle}</title>

        <meta
          name="description"
          content={pageDescription}
        />

        <link
          rel="canonical"
          href="https://blog.devopsnotes.org/articles"
        />

        <meta
          property="og:title"
          content={pageTitle}
        />

        <meta
          property="og:description"
          content={pageDescription}
        />

        <meta
          property="og:url"
          content="https://blog.devopsnotes.org/articles"
        />

        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:site_name"
          content="DevOpsNotes"
        />
      </Helmet>

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="articles-header-v2">

        <div className="articles-heading">
          <h1 className="articles-page-title">
            Articles DevOps, DevSecOps & Cloud
          </h1>

          <p className="articles-page-description">
            Expérimentations, retours d’expérience et articles
            techniques autour des infrastructures modernes,
            du Cloud, de Kubernetes et de la cybersécurité.
          </p>
        </div>

        <div className="articles-search-wrapper">
          <input
            type="search"
            className="articles-search"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            aria-label="Rechercher un article"
          />
        </div>

        <div className="articles-actions-v2">

          <div className="nav-buttons flex gap-2">
            <Link
              to="/forum"
              className="btn btn-secondary"
            >
              Forum
            </Link>

            {user && (
              <Link
                to="/chat"
                className="btn btn-secondary"
              >
                Chat
              </Link>
            )}
          </div>

          {isAdmin && (
            <Link
              to="/articles/new"
              className="btn btn-primary admin-new-btn"
            >
              <span className="full-text">
                + Nouvel article
              </span>

              <span className="mobile-icon">
                +
              </span>
            </Link>
          )}

        </div>
      </header>

      {/* ======================================================
          FILTRES TAGS
          ====================================================== */}

      <section
        className="articles-filters-v2"
        aria-label="Filtrer les articles"
      >
        <div className="tags-grid-v2">

          <button
            type="button"
            className={`tag-pill ${
              activeTag === null ? 'active' : ''
            }`}
            onClick={() => setActiveTag(null)}
          >
            Tous
          </button>

          {allTags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`tag-pill ${
                activeTag === tag ? 'active' : ''
              }`}
              onClick={() => setActiveTag(tag)}
            >
              #{tag}
            </button>
          ))}

        </div>
      </section>

      {/* ======================================================
          PAGINATION HAUT
          ====================================================== */}

      {!loading &&
        totalPages > 1 && (
          <PaginationNav />
        )}

      {/* ======================================================
          GRILLE DES ARTICLES
          ====================================================== */}

      <section
        className="articles-grid-v2"
        aria-label="Liste des articles"
      >

        {loading ? (

          /* Squelettes */

          [...Array(4)].map((_, index) => (
            <article
              key={index}
              className="article-card-v2"
              aria-hidden="true"
            >
              <div
                className="skeleton-loader"
                style={{
                  height: '200px',
                  width: '100%',
                }}
              />

              <div
                style={{
                  padding: '1.25rem',
                }}
              >
                <div
                  className="skeleton-loader"
                  style={{
                    height: '24px',
                    width: '80%',
                    marginBottom: '10px',
                  }}
                />

                <div
                  className="skeleton-loader"
                  style={{
                    height: '16px',
                    width: '100%',
                  }}
                />
              </div>
            </article>
          ))

        ) : filteredArticles.length === 0 ? (

          <div className="articles-empty-state">
            <h2>Aucun article trouvé</h2>

            <p>
              Aucun article ne correspond à votre recherche
              ou à ce filtre.
            </p>
          </div>

        ) : (

          filteredArticles.map(
            (article: Article, index: number) => {

              const isLiked =
                likedArticles.has(article.slug);

              const likesCount =
                localLikeCounts[article.slug] ??
                article.likes ??
                0;

              const imageUrl = article.imageUrl
                ? article.imageUrl.startsWith('http')
                  ? article.imageUrl
                  : `${R2_PUBLIC_URL}${
                      article.imageUrl.startsWith('/')
                        ? ''
                        : '/'
                    }${article.imageUrl}`
                : null;

              const publishedDate =
                formatPublishedDate(
                  article.publishedAt
                );

              return (
                <article
                  key={article._id}
                  className="article-card-v2"
                >

                  {/* IMAGE */}

                  <div className="article-image-v2">

                    <Link
                      to={`/articles/${article.slug}`}
                      className="image-link-wrapper"
                      aria-label={`Lire ${article.title}`}
                    >

                      {imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={article.title}
                            loading={
                              index === 0
                                ? 'eager'
                                : 'lazy'
                            }
                          />

                          <span className="ai-badge-vignette">
                            Illustration générée par IA
                          </span>
                        </>
                      ) : (
                        <div className="image-fallback">
                          <span className="fallback-logo">
                            devopsnotes
                          </span>
                        </div>
                      )}

                    </Link>

                  </div>

                  {/* CONTENU */}

                  <div className="article-content-v2">

                    {/* TITRE SEO */}

                    <h2 className="article-title-v2">

                      <Link
                        to={`/articles/${article.slug}`}
                        className="article-title-link"
                      >
                        {article.title}
                      </Link>

                      {article.status === 'draft' && (
                        <span className="draft-badge">
                          Brouillon
                        </span>
                      )}

                    </h2>

                    {/* DATE DE PUBLICATION */}

                    {article.status === 'published' &&
                      publishedDate && (
                        <time
                          className="article-published-date"
                          dateTime={article.publishedAt}
                        >
                          Publié le {publishedDate}
                        </time>
                      )}

                    {/* EXCERPT */}

                    <div className="article-excerpt">

                      <MarkdownPreview
                        content={
                          article.excerpt || ''
                        }
                        className="preview-card-clean"
                      />

                    </div>

                    {/* TAGS */}

                    <div className="article-tags-v2">

                      {(article.tags || [])
                        .slice(0, 3)
                        .map((tag: string) => (
                          <span
                            key={tag}
                            className="tag"
                          >
                            #{tag}
                          </span>
                        ))}

                    </div>

                    {/* STATISTIQUES */}

                    <div className="article-stats-v2">

                      <button
                        type="button"
                        className={`stat-btn like-btn ${
                          isLiked ? 'active' : ''
                        }`}
                        onClick={() =>
                          handleLike(article.slug)
                        }
                        disabled={
                          isLiking === article.slug
                        }
                        aria-label={
                          isLiked
                            ? 'Retirer votre like'
                            : 'Aimer cet article'
                        }
                      >
                        <Heart
                          size={18}
                          fill={
                            isLiked
                              ? 'currentColor'
                              : 'none'
                          }
                          strokeWidth={2.5}
                        />

                        <span className="stat-value">
                          {likesCount}
                        </span>
                      </button>

                      <div
                        className="stat-btn"
                        aria-label={`${article.views ?? 0} vues`}
                      >
                        <Eye
                          size={18}
                          strokeWidth={2.5}
                        />

                        <span className="stat-value">
                          {article.views ?? 0}
                        </span>
                      </div>

                      <div
                        className="stat-btn comments-count"
                        aria-label={`${commentCounts[article.slug] ?? 0} commentaires`}
                      >
                        <MessageSquare
                          size={18}
                          strokeWidth={2.5}
                        />

                        <span className="stat-value">
                          {commentCounts[article.slug] ?? 0}
                        </span>
                      </div>

                    </div>

                    {/* CTA */}

                    <div className="article-footer-v2">

                      <Link
                        to={`/articles/${article.slug}`}
                        className="btn btn-primary"
                      >
                        Lire l'article
                      </Link>

                    </div>

                  </div>
                </article>
              );
            }
          )
        )}

      </section>

      {/* ======================================================
          PAGINATION BAS
          ====================================================== */}

      {!loading &&
        totalPages > 1 && (
          <PaginationNav />
        )}

    </div>
  );
}