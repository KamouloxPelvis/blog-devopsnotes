import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../api/axios';
import { Article } from '../types/articles';
import '../styles/HomePage.css';

const R2_PUBLIC_URL =
  process.env.REACT_APP_R2_PUBLIC_URL ??
  'https://resources.devopsnotes.org';

const stripHtml = (html: string): string => {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(
    html,
    'text/html'
  );

  return (doc.body.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
};

const getExcerpt = (article: Article): string => {
  const text = stripHtml(
    article.excerpt ||
      article.content ||
      ''
  );

  if (text.length <= 180) {
    return text;
  }

  return `${text.slice(0, 180).trim()}...`;
};

export default function HomePage() {
  const [lang, setLang] = useState<'FR' | 'EN'>('FR');

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestArticles = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          '/articles?page=1&limit=3'
        );

        if (
          response.data &&
          Array.isArray(response.data.items)
        ) {
          setArticles(response.data.items);
        } else if (Array.isArray(response.data)) {
          setArticles(response.data.slice(0, 3));
        } else {
          setArticles([]);
        }
      } catch (error) {
        console.error(
          'Erreur lors du chargement des derniers articles:',
          error
        );
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestArticles();
  }, []);

  const content = {
    FR: {
      title: 'Blog DevOps, DevSecOps & Cloud',

      subtitle:
        'Articles techniques, expérimentations et retours d’expérience autour du DevOps, du Cloud, de Kubernetes et de la cybersécurité.',

      intro:
        'DevopsNotes est un blog technique et un laboratoire d’expérimentation consacré aux infrastructures modernes, à l’automatisation et à la sécurité des environnements Cloud-Native.',

      intro2:
        'Le site documente des projets et des expérimentations concrètes autour du développement, du déploiement, de l’administration systèmes et réseaux, du CI/CD, de Kubernetes et du DevSecOps.',

      latestTitle: 'Derniers articles',

      latestDescription:
        'Découvrez les dernières expérimentations et publications techniques de DevopsNotes.',

      allArticles: 'Explorez le blog',

      readArticle: "Lire l'article →",

      loading: 'Chargement des articles...',

      noArticles:
        'Aucun article publié pour le moment.',

      labTitle:
        'Un laboratoire technique en production',

      labText:
        "DevopsNotes n'est pas uniquement un espace de publication. L'application elle-même sert de terrain d'expérimentation : développement full-stack, conteneurisation, orchestration Kubernetes/K3s, CI/CD, reverse proxy, Cloudflare, observabilité et sécurisation de l'infrastructure.",

      communityText:
        "Mais l'expérimentation ne s'arrête pas au code. Inscrivez-vous pour réagir aux articles, partager vos retours et vos propres expériences dans le forum, ou simplement discuter avec la communauté via le chat.",

      joinCommunity:
        'Rejoindre la communauté →',

      discoverForum:
        'Découvrir le forum →',

      chat:
        'Discuter sur le chat →',

      aboutTitle:
        'À propos de DevopsNotes',
      aboutIntro:
        "Avec une solide base de développeur full stack et d'administrateur systèmes et réseaux et passionné d'informatique et de technologies au sens large, j'ai récemment fait le choix de m'orienter vers la sécurité opérationnelle et le DevOps. Pour moi, ils constituent le prolongement naturel de l'administration d'infrastructures sécurisées, avec cette couche d'abstraction et de code qui m'a toujours fasciné.",

      aboutDevopsNotes:
        "Quoi de mieux que d'en parler, de documenter ce que je construis et d'échanger avec d'autres passionnés ? C'est dans cet esprit que j'ai créé DevopsNotes, un blog technique et communautaire qui m'accompagne dans mes expérimentations que je mène et qui a vocation au partage avec d'autres contributeurs.",

      aboutKGuard:
        "Parmi ces expérimentations figure notamment K-Guard, mon projet consacré à la sécurisation, à l'observabilité et à la gouvernance de clusters Kubernetes/K3s. Il évolue au fil de mes expérimentations et des problématiques que je rencontre.",

      sponsorTitle:
        'Soutenir le projet',

      sponsorText:
        'L&apos;écosystème DevopsNotes et K-Guard sont maintenus sur mon temps libre. Si vous appréciez le projet, les articles ou les expérimentations présentées ici, vous pouvez contribuer à leur poursuite via GitHub Sponsors.',

      sponsorText2:
        'Votre soutien permet notamment de continuer à développer K-Guard, à expérimenter de nouvelles technologies et à maintenir l’infrastructure qui fait fonctionner DevopsNotes.',

      portfolio:
        'Mon portfolio',

      projects:
        'Mes projets',

      techTitle:
        'Technologies & infrastructure',

      maintenance:
        'Des opérations de maintenance évolutive sur l’infrastructure et l’interface peuvent entraîner des indisponibilités temporaires.',
    },

    EN: {
      title:
        'DevOps, DevSecOps & Cloud Blog',

      subtitle:
        'Technical articles, experiments and field notes about DevOps, Cloud, Kubernetes and cybersecurity.',

      intro:
        'DevopsNotes is a technical blog and experimentation lab focused on modern infrastructure, automation and Cloud-Native security.',

      intro2:
        'The website documents concrete projects and experiments covering software development, deployment, systems and network administration, CI/CD, Kubernetes and DevSecOps.',

      latestTitle:
        'Latest articles',

      latestDescription:
        'Discover the latest technical experiments and publications from DevopsNotes.',

      allArticles:
        'View all articles →',

      readArticle:
        'Read article →',

      loading:
        'Loading articles...',

      noArticles:
        'No published articles yet.',

      labTitle:
        'A technical laboratory running in production',

      labText:
        'DevopsNotes is not only a publishing platform. The application itself is an experimentation environment covering full-stack development, containerization, Kubernetes/K3s orchestration, CI/CD, reverse proxying, Cloudflare, observability and infrastructure security.',

      communityText:
        'However, experimentation does not stop at the code. Sign up to comment on articles, share your feedback and experiences in the forum, or simply chat with the community.',

      joinCommunity:
        'Join the community →',

      discoverForum:
        'Discover the forum →',

      chat:
        'Chat with the community →',

      aboutTitle:
        'About DevopsNotes',

      aboutIntro:
        'Passionate about technology since my teenage years, and after an exciting career in another field, I chose a few years ago to return to my first passion and become an IT professional.',

      aboutIntro2:
        'With a solid background in full-stack development and systems and network administration, I decided to focus on operational security and DevOps. To me, they are a natural extension of secure infrastructure administration, combined with the layer of abstraction and code that has always fascinated me.',

      aboutDevopsNotes:
        'What better way to pursue that interest than by documenting what I build and exchanging ideas with other enthusiasts? This is the spirit in which I created DevopsNotes, a technical and community-driven blog dedicated to the technologies that interest me and the experiments I conduct, with the ambition of eventually opening it to other contributors.',

      aboutKGuard:
        'Among these experiments is K-Guard, my project focused on security, observability and governance for Kubernetes/K3s clusters. It evolves alongside my experiments and the problems I encounter.',

      sponsorTitle:
        'Support the project',

      sponsorText:
        'DevopsNotes and its experiments are developed and maintained in my spare time. If you enjoy the project, the articles or the experiments presented here, you can help support their continuation through GitHub Sponsors.',

      sponsorText2:
        'Your support helps me continue developing K-Guard, experimenting with new technologies and maintaining the infrastructure that powers DevopsNotes.',

      portfolio:
        'My portfolio',

      projects:
        'My projects',

      techTitle:
        'Technology & infrastructure',

      maintenance:
        'Ongoing infrastructure and UI maintenance may occasionally cause temporary service interruptions.',
    },
  };

  const t = content[lang];

  const getImageUrl = (article: Article) => {
    if (!article.imageUrl) return null;

    return article.imageUrl.startsWith('http')
      ? article.imageUrl
      : `${R2_PUBLIC_URL}${
          article.imageUrl.startsWith('/')
            ? ''
            : '/'
        }${article.imageUrl}`;
  };

  return (
    <>
      <Helmet>
        <title>{t.title}</title>

        <meta
          name="description"
          content={`${t.subtitle} ${t.intro}`}
        />

        <link
          rel="canonical"
          href="https://blog.devopsnotes.org/"
        />

        <meta
          property="og:title"
          content={t.title}
        />

        <meta
          property="og:description"
          content={t.subtitle}
        />

        <meta
          property="og:url"
          content="https://blog.devopsnotes.org/"
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

      <main className="landing-root">

        {/* LANGUAGE */}
        <div
          className="lang-selector"
          aria-label="Language selector"
        >
          <button
            aria-label="Français"
            onClick={() => setLang('FR')}
            className={
              lang === 'FR'
                ? 'active'
                : ''
            }
          >
            <img
              src="/flags/fr.svg"
              alt=""
            />
            FR
          </button>

          <button
            aria-label="English"
            onClick={() => setLang('EN')}
            className={
              lang === 'EN'
                ? 'active'
                : ''
            }
          >
            <img
              src="/flags/us.svg"
              alt=""
            />
            EN
          </button>
        </div>

        {/* HERO */}
        <section className="landing-hero">

          <p className="landing-kicker">
            DEVOPSNOTES
          </p>

          <h1 className="landing-title">
            {t.title}
          </h1>

          <p className="landing-subtitle">
            {t.subtitle}
          </p>

          <div className="landing-description">

            <p>
              <strong>
                DevOpsNotes
              </strong>{' '}
              {t.intro}
            </p>

            <p>
              {t.intro2}
            </p>

          </div>

          <div className="landing-buttons">

            <Link
              to="/articles"
              className="btn btn-primary landing-btn"
            >
              🚀 {t.allArticles}
            </Link>

            <a
              href="https://devopsnotes.org"
              className="btn btn-primary landing-btn portfolio-btn"
            >
              🌐 {t.portfolio}
            </a>

            <a
              href="https://git.kamal-guidadou.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-dark landing-btn gitlab-btn"
            >
              <img
                src="/logos/github.png"
                alt="GitHub"
              />
              {t.projects}
            </a>

          </div>

        </section>

        {/* ARTICLES */}
        <section className="home-section latest-section">

          <div className="section-heading">

            <div>

              <p className="section-kicker">
                PUBLICATIONS
              </p>

              <h2>
                {t.latestTitle}
              </h2>

              <p>
                {t.latestDescription}
              </p>

            </div>

            <Link
              to="/articles"
              className="section-link"
            >
              {t.allArticles}
            </Link>

          </div>

          {loading ? (

            <div className="articles-loading">
              {t.loading}
            </div>

          ) : articles.length === 0 ? (

            <div className="articles-empty">
              {t.noArticles}
            </div>

          ) : (

            <div className="home-articles-grid">

              {articles
                .slice(0, 3)
                .map((article) => {

                  const imageUrl =
                    getImageUrl(article);

                  return (
                    <article
                      key={article._id}
                      className="home-article-card"
                    >

                      <Link
                        to={`/articles/${article.slug}`}
                        className="home-article-image"
                      >
                        {imageUrl ? (

                          <img
                            src={imageUrl}
                            alt={article.title}
                            loading="lazy"
                          />

                        ) : (

                          <div className="home-article-image-fallback">
                            DevOpsNotes
                          </div>

                        )}
                      </Link>

                      <div className="home-article-content">

                        <div className="home-article-tags">

                          {(article.tags || [])
                            .slice(0, 3)
                            .map((tag) => (
                              <span key={tag}>
                                #{tag}
                              </span>
                            ))}

                        </div>

                        <h3>
                          <Link
                            to={`/articles/${article.slug}`}
                          >
                            {article.title}
                          </Link>
                        </h3>

                        <p>
                          {getExcerpt(article)}
                        </p>

                        <Link
                          to={`/articles/${article.slug}`}
                          className="home-article-link"
                        >
                          {t.readArticle}
                        </Link>

                      </div>

                    </article>
                  );
                })}

            </div>

          )}

        </section>

        {/* LABORATOIRE */}
        <section className="home-section lab-section">

          <div className="content-panel">

            <p className="section-kicker">
              EXPERIMENTATION
            </p>

            <h2>
              {t.labTitle}
            </h2>

            <div className="lab-content-grid">

              <div className="lab-text">

                <p>
                  {t.labText}
                </p>

                <p>
                  {t.communityText}
                </p>

              </div>

              <div className="lab-screenshot">

                <img
                  src="/screenshot_home_1.webp"
                  alt="Forum communautaire DevOpsNotes"
                  loading="lazy"
                />

              </div>

            </div>

            <div className="about-actions">

              <Link
                to="/signup"
                className="btn btn-primary landing-btn"
              >
                {t.joinCommunity}
              </Link>

              <Link
                to="/forum"
                className="btn btn-outline-dark landing-btn"
              >
                {t.discoverForum}
              </Link>

              <Link
                to="/chat"
                className="btn btn-outline-dark landing-btn"
              >
                {t.chat}
              </Link>

            </div>

          </div>

        </section>

        {/* ABOUT & SPONSOR */}
        <section className="home-section about-section">

          <div className="about-grid">

            <div className="about-content">

              <p className="section-kicker">
                À PROPOS
              </p>

              {/* INTRODUCTION */}
              <div className="about-intro">

                <div className="about-photo">
                  <img
                    src="/moi.webp"
                    alt="Kamal Guidadou"
                  />
                </div>

                <div className="about-intro-text">

                  <p>
                    {t.aboutIntro}
                  </p>

                </div>

              </div>

              {/* DEVOPSNOTES */}
              <p>
                {t.aboutDevopsNotes}
              </p>

              {/* K-GUARD + SCREENSHOT */}
              <div className="about-kguard">

                <div className="about-kguard-text">

                  <p>
                    {t.aboutKGuard}
                  </p>

                  <p className="about-signature">
                    Kamal Guidadou
                  </p>

                </div>

                <div className="about-kguard-screenshot">

                  <img
                    src="/screenshot_home_2.webp"
                    alt="K-Guard, projet de sécurité et de gouvernance Kubernetes et K3s"
                    loading="lazy"
                  />

                </div>

              </div>

              {/* SPONSOR */}
              <div className="sponsor-block">

                <h3>
                  {t.sponsorTitle}
                </h3>

                <p>
                  {t.sponsorText}
                </p>

                <p>
                  {t.sponsorText2}
                </p>

                <div
                  className="sponsor-card"
                  aria-label="Soutenir DevopsNotes via GitHub Sponsors"
                >
                  <iframe
                    src="https://github.com/sponsors/KamouloxPelvis/card"
                    title="Sponsor KamouloxPelvis"
                    height="225"
                    width="600"
                    style={{
                      border: 0,
                      maxWidth: '100%',
                    }}
                  />
                </div>

              </div>

              {/* ACTIONS */}
              <div className="about-actions">

                <a
                  href="https://devopsnotes.org"
                  className="btn btn-primary landing-btn"
                >
                  {t.portfolio}
                </a>

                <a
                  href="https://git.kamal-guidadou.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-dark landing-btn"
                >
                  {t.projects}
                </a>

              </div>

            </div>

          </div>

        </section>

        {/* TECHNOLOGIES */}
        <section className="home-section technologies-section">

          <div className="section-heading centered">

            <p className="section-kicker">
              STACK
            </p>

            <h2>
              {t.techTitle}
            </h2>

          </div>

          <div className="landing-tech-grid">

            <img
              src="/logos/react.webp"
              alt="React"
              title="React 19 + TypeScript"
            />

            <img
              src="/logos/node.webp"
              alt="Node.js"
              title="Node.js 20 + Express"
            />

            <img
              src="/logos/mongodb.webp"
              alt="MongoDB"
              title="MongoDB + Mongoose"
            />

            <img
              src="/logos/docker.webp"
              alt="Docker"
              title="Docker Containerization"
            />

            <img
              src="/logos/kubernetes.webp?=v2"
              alt="Kubernetes K3s"
              title="Kubernetes / K3s"
            />

            <img
              src="/logos/github.png"
              alt="GitLab CI/CD"
              title="GitLab CI/CD"
            />

            <img
              src="/logos/cf.webp"
              alt="Cloudflare"
              title="Cloudflare CDN, R2 & Security"
            />

            <img
              src="/logos/ingress.webp"
              alt="Nginx Ingress"
              title="Nginx Ingress"
            />

            <img
              src="/logos/nginx.webp"
              alt="Nginx"
              title="Nginx Reverse Proxy"
            />

            <img
              src="/logos/gcloud.webp"
              alt="Google Cloud"
              title="Google Cloud APIs"
            />

            <img
              src="/logos/kamatera.webp"
              alt="Kamatera"
              title="Kamatera VPS"
            />

            <img
              src="/logos/sentry.webp"
              alt="Sentry"
              title="Sentry Monitoring"
            />

          </div>

        </section>

        {/* MAINTENANCE */}
        <p className="beta-notice">
          ⚠️ <strong>Note :</strong>{' '}
          {t.maintenance}
        </p>

      </main>
    </>
  );
}