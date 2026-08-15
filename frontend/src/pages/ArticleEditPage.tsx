import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import ArticleForm from '../components/ArticleForm';
import { Helmet } from 'react-helmet-async';
import '../styles/ArticleModPage.css'

<Helmet>
  <title>Modifier l'article | DevOpsNotes</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>

export default function ArticleEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [article, setArticle] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/articles/${slug}`).then(res => setArticle(res.data)).catch(() => showToast("Erreur de chargement", "error"));
  }, [slug, showToast]);

  const handleUpdate = async (articleData: any) => {
    setSubmitting(true);
    try {
      await api.put(`/articles/${slug}`, articleData);
      showToast("Article mis à jour !", 'success');
      navigate(`/articles/${slug}`);
    } catch (err) {
      showToast("Erreur lors de la mise à jour", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!article) return <div className="loading">Chargement...</div>;

  return (
    <ArticleForm 
      initialData={article} 
      onSubmit={handleUpdate} 
      submitting={submitting} 
      backLink={`/articles/${slug}`} 
      isEdit 
    />
  );
}