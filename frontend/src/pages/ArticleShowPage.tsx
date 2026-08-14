import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { RelatedArticles } from '../components/RelatedArticles';
import { useAllArticles } from '../hooks/useAllArticles';
import { Article } from '../types/articles';
import hljs from 'highlight.js';
import NProgress from 'nprogress';
import 'highlight.js/styles/tokyo-night-dark.css';
import '../styles/ArticleShowPage.css';

interface CommentAuthor {
  _id?: string;
  pseudo?: string;
  avatar?: string;
}

interface Comment {
  _id: string;
  content: string;
  author: CommentAuthor;
  createdAt: string;
}

interface ArticleAuthor {
  _id?: string;
  pseudo?: string;
}

export default function ArticleShow() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    articles: allArticles = [],
    loading: loadingAllArticles,
  } = useAllArticles();

  const [article, setArticle] = useState<Article | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';

  const R2_PUBLIC_URL =
    process.env.REACT_APP_R2_PUBLIC_URL ??
    'https://resources.devopsnotes.org';

  // ============================================================
  // 1. Chargement de l'article et des commentaires
  // ============================================================

  useEffect(() => {
    if (!slug) return;

    setLoadingArticle(true);
    NProgress.start();

    api
      .get(`/articles/${slug}`)
      .then((res) => {
        setArticle(res.data);
        setError(null);

        return api.get(`/comments/${slug}`);
      })
      .then((res) => {
        setComments(res.data);
      })
      .catch((err) => {
        const isCommentError =
          err.config?.url?.includes('/comments');

        if (!isCommentError) {
          setError(
            err.response?.data?.message ||
              'Article introuvable'
          );
        }
      })
      .finally(() => {
        setLoadingArticle(false);
        NProgress.done();
      });
  }, [slug]);

  // ============================================================
  // 2. Coloration syntaxique Highlight.js
  // ============================================================

  useEffect(() => {
    if (!article?.content || loadingArticle) {
      return;
    }

    const preBlocks = document.querySelectorAll(
      '.article-body-content pre'
    );

    preBlocks.forEach((pre) => {
      const codeBlock = pre.querySelector('code');

      if (!codeBlock) {
        return;
      }

      hljs.highlightElement(codeBlock as HTMLElement);

      if (!pre.querySelector('.copy-button')) {
        const button = document.createElement('button');

        button.className = 'copy-button';
        button.innerText = 'Copier';

        button.onclick = () => {
          const text = codeBlock.innerText;

          navigator.clipboard
            .writeText(text)
            .then(() => {
              button.innerText = 'Copié !';
              button.classList.add('copied');

              setTimeout(() => {
                button.innerText = 'Copier';
                button.classList.remove('copied');
              }, 2000);
            })
            .catch(() => {
              button.innerText = 'Erreur';
            });
        };

        pre.appendChild(button);
      }
    });
  }, [article?.content, loadingArticle]);

  // ============================================================
  // 3. Incrémenter les vues
  // ============================================================

  useEffect(() => {
    if (!article || loadingArticle) {
      return;
    }

    api
      .post(`/articles/${article.slug}/view`)
      .catch((err) => {
        console.error(
          'Erreur increment vues:',
          err
        );
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?._id, loadingArticle]);

  // ============================================================
  // 4. Actions article
  // ============================================================

  async function handleDelete() {
    if (
      !slug ||
      !window.confirm('Supprimer cet article ?')
    ) {
      return;
    }

    try {
      await api.delete(`/articles/${slug}`);
      navigate('/articles');
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  }

  // ============================================================
  // 5. Commentaires
  // ============================================================

  async function handlePostComment(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!commentBody.trim() || !slug) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.post('/comments', {
        articleSlug: slug,
        content: commentBody,
      });

      setComments((prev) => [
        res.data,
        ...prev,
      ]);

      setCommentBody('');
    } catch (err) {
      alert(
        "Erreur lors de l'envoi du commentaire"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteComment(
    commentId: string
  ) {
    if (
      !window.confirm(
        'Supprimer ce commentaire ?'
      )
    ) {
      return;
    }

    try {
      await api.delete(`/comments/${commentId}`);

      setComments((prev) =>
        prev.filter(
          (comment) => comment._id !== commentId
        )
      );
    } catch (err) {
      alert(
        'Impossible de supprimer le commentaire'
      );
    }
  }

  // ============================================================
  // 6. Données calculées + SEO
  // ============================================================

  if (error) {
    return (
      <div className="error-msg">
        ⚠️ {error}
      </div>
    );
  }

  const fullImageUrl = article?.imageUrl
    ? article.imageUrl.startsWith('http')
      ? article.imageUrl
      : `${R2_PUBLIC_URL}${
          article.imageUrl.startsWith('/')
            ? ''
            : '/'
        }${article.imageUrl}`
    : null;

  const articleUrl = article
    ? `https://blog.devopsnotes.org/articles/${article.slug}`
    : `https://blog.devopsnotes.org/articles/${slug || ''}`;

  const articleTitle = article
    ? `${article.title} | DevOpsNotes`
    : 'DevOpsNotes';

  const articleDescription = article?.excerpt
    ? article.excerpt
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
    : 'Article technique publié sur DevOpsNotes autour du DevOps, DevSecOps, Cloud, Kubernetes et cybersécurité.';

  const author =
    article?.author as ArticleAuthor | undefined;

  const authorName =
    author?.pseudo || 'Kamal Guidadou';

  /*
   * publishedAt est la vraie date de publication.
   *
   * Pour les anciens articles qui n'ont pas encore
   * cette propriété, createdAt sert de fallback.
   */
  const publishedDate =
    article?.publishedAt ||
    article?.createdAt;

  /*
   * updatedAt est fourni par Mongoose grâce à
   * { timestamps: true }.
   */
  const modifiedDate =
    article?.updatedAt ||
    publishedDate;

  const formatDate = (
    date?: string
  ): string => {
    if (!date) {
      return '';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return parsedDate.toLocaleDateString(
      'fr-FR',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  /*
   * Données structurées Schema.org.
   *
   * Une seule déclaration JSON-LD est injectée
   * dans le <Helmet>.
   */
  const articleStructuredData =
    article && !loadingArticle
      ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',

          headline: article.title,

          description: articleDescription,

          url: articleUrl,

          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': articleUrl,
          },

          ...(fullImageUrl && {
            image: [fullImageUrl],
          }),

          author: {
            '@type': 'Person',
            name: authorName,
            url: 'https://www.devopsnotes.org/',
          },

          publisher: {
            '@type': 'Organization',
            name: 'DevOpsNotes',
            url: 'https://blog.devopsnotes.org/',
          },

          ...(publishedDate && {
            datePublished: publishedDate,
          }),

          ...(modifiedDate && {
            dateModified: modifiedDate,
          }),

          ...(article.tags?.length && {
            keywords: article.tags.join(', '),
          }),
        }
      : null;

  // ============================================================
  // 7. Rendu
  // ============================================================

  return (
    <div className="article-detail-page page-transition fade-in-page">

      {/* ========================================================
          SEO / META
          ======================================================== */}

      <Helmet>
        <title>
          {loadingArticle
            ? 'Chargement... | DevOpsNotes'
            : articleTitle}
        </title>

        <meta
          name="description"
          content={articleDescription}
        />

        <link
          rel="canonical"
          href={articleUrl}
        />

        {/* Open Graph */}

        <meta
          property="og:title"
          content={
            article?.title || 'DevOpsNotes'
          }
        />

        <meta
          property="og:description"
          content={articleDescription}
        />

        <meta
          property="og:url"
          content={articleUrl}
        />

        <meta
          property="og:type"
          content="article"
        />

        <meta
          property="og:site_name"
          content="DevOpsNotes"
        />

        {fullImageUrl && (
          <meta
            property="og:image"
            content={fullImageUrl}
          />
        )}

        {/* Twitter / X Card */}

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content={article?.title || 'DevOpsNotes'}
        />

        <meta
          name="twitter:description"
          content={articleDescription}
        />

        {fullImageUrl && (
          <meta
            name="twitter:image"
            content={fullImageUrl}
          />
        )}

        {/* Métadonnées spécifiques aux articles */}

        {publishedDate && (
          <meta
            property="article:published_time"
            content={publishedDate}
          />
        )}

        {modifiedDate && (
          <meta
            property="article:modified_time"
            content={modifiedDate}
          />
        )}

        <meta
          property="article:author"
          content={authorName}
        />

        {article?.tags?.map((tag) => (
          <meta
            key={tag}
            property="article:tag"
            content={tag}
          />
        ))}

        {/* JSON-LD unique */}

        {articleStructuredData && (
          <script type="application/ld+json">
            {JSON.stringify(
              articleStructuredData
            )}
          </script>
        )}
      </Helmet>

      {/* ========================================================
          NAVIGATION
          ======================================================== */}

      <header className="detail-nav">
        <Link
          to="/articles"
          className="btn btn-secondary btn-sm"
        >
          ← Retour aux articles
        </Link>

        {isAdmin &&
          article &&
          !loadingArticle && (
            <div className="admin-quick-actions">
              <Link
                to={`/articles/${article.slug}/edit`}
                className="btn btn-primary btn-sm"
              >
                Modifier
              </Link>

              <button
                aria-label="Supprimer l'article"
                onClick={handleDelete}
                className="btn btn-danger btn-sm"
              >
                Supprimer
              </button>
            </div>
          )}
      </header>

      {/* ========================================================
          ARTICLE
          ======================================================== */}

      <article
        className="article-detail-container"
        itemScope
        itemType="https://schema.org/Article"
      >

        {loadingArticle ? (

          /* ================= SQUELETTE ================= */

          <div className="article-skeleton">
            <div className="skeleton-loader hero-skeleton" />

            <div className="skeleton-content-padding">
              <div className="skeleton-loader title-skeleton" />
              <div className="skeleton-loader tag-skeleton" />
              <div className="skeleton-loader text-line" />
              <div className="skeleton-loader text-line" />

              <div
                className="skeleton-loader text-line"
                style={{ width: '60%' }}
              />
            </div>
          </div>

        ) : article ? (

          /* ================= ARTICLE RÉEL ================= */

          <>
            {fullImageUrl && (
              <div className="article-hero-image">
                <img
                  src={fullImageUrl}
                  alt={article.title}
                  itemProp="image"
                />

                <span className="ai-badge-hero">
                  Illustration générée par IA
                </span>
              </div>
            )}

            <div className="article-header-meta">

              {/* Titre */}

              <h1
                className="article-detail-title"
                itemProp="headline"
              >
                {article.title}
              </h1>

              {/* ==================================================
                  MÉTADONNÉES ÉDITORIALES
                  ================================================== */}

              <div className="article-publication-meta">

                {publishedDate && (
                  <time
                    className="article-date"
                    dateTime={publishedDate}
                    itemProp="datePublished"
                  >
                    Publié le{' '}
                    {formatDate(publishedDate)}
                  </time>
                )}

                {modifiedDate &&
                  modifiedDate !== publishedDate && (
                    <>
                      <span
                        className="article-meta-separator"
                        aria-hidden="true"
                      >
                        ·
                      </span>

                      <time
                        className="article-date"
                        dateTime={modifiedDate}
                        itemProp="dateModified"
                      >
                        Mis à jour le{' '}
                        {formatDate(modifiedDate)}
                      </time>
                    </>
                  )}

                <span
                  className="article-meta-separator"
                  aria-hidden="true"
                >
                  ·
                </span>

                <span
                  className="article-author"
                  itemProp="author"
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  Par{' '}
                  <span itemProp="name">
                    {authorName}
                  </span>
                </span>

              </div>

              {/* ==================================================
                  TAGS
                  ================================================== */}

              {article.tags &&
                article.tags.length > 0 && (
                  <div className="article-tags">
                    {article.tags.map(
                      (tag: string) => (
                        <span
                          key={tag}
                          className="tag-pill"
                        >
                          #{tag}
                        </span>
                      )
                    )}
                  </div>
                )}

            </div>

            {/* Description sémantique Schema.org */}

            <meta
              itemProp="description"
              content={articleDescription}
            />

            {/* ==================================================
                CONTENU DE L'ARTICLE
                ================================================== */}

            <div
              className="article-body-content"
              itemProp="articleBody"
              dangerouslySetInnerHTML={{
                __html: article.content || '',
              }}
            />

            <hr className="section-divider" />

            {/* ==================================================
                COMMENTAIRES
                ================================================== */}

            <section className="comments-section">

              <h3 className="section-title">
                Discussion ({comments.length})
              </h3>

              {user ? (
                <form
                  onSubmit={handlePostComment}
                  className="comment-box"
                >
                  <textarea
                    value={commentBody}
                    onChange={(e) =>
                      setCommentBody(e.target.value)
                    }
                    placeholder="Un avis ? Une question technique ?"
                    required
                  />

                  <div className="comment-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? 'Envoi...'
                        : 'Publier le commentaire'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="login-prompt">
                  <Link to="/login">
                    Connectez-vous
                  </Link>{' '}
                  pour participer à la discussion.
                </div>
              )}

              <div className="comments-list">

                {comments.map(
                  (comment: Comment) => (
                    <div
                      key={comment._id}
                      className="comment-card"
                    >
                      <div className="comment-header">

                        <span className="comment-author">
                          {comment.author?.pseudo ||
                            'Anonymous'}
                        </span>

                        <div className="comment-meta-right">

                          <span className="comment-date">
                            {new Date(
                              comment.createdAt
                            ).toLocaleDateString(
                              'fr-FR'
                            )}
                          </span>

                          {(isAdmin ||
                            (user &&
                              comment.author?._id ===
                                user.id)) && (
                            <button
                              onClick={() =>
                                handleDeleteComment(
                                  comment._id
                                )
                              }
                              className="btn-delete-comment"
                              aria-label="Supprimer le commentaire"
                            >
                              🗑️
                            </button>
                          )}

                        </div>
                      </div>

                      <div className="comment-content">
                        {comment.content}
                      </div>
                    </div>
                  )
                )}

              </div>
            </section>
          </>
        ) : null}

      </article>

      {/* ========================================================
          ARTICLES ASSOCIÉS
          ======================================================== */}

      {!loadingAllArticles && article && (
        <RelatedArticles
          currentArticle={article}
          allArticles={allArticles}
        />
      )}

    </div>
  );
}