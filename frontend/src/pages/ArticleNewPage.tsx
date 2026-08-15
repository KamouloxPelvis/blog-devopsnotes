import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import ArticleForm from '../components/ArticleForm';
import { Helmet } from 'react-helmet-async';
import '../styles/ArticleModPage.css'

<Helmet>
  <title>Créer un article | DevOpsNotes</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>

export default function ArticleNewPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (articleData: any) => {
    setSubmitting(true);
    try {
      const res = await api.post('/articles', articleData);
      showToast("Article créé !", 'success');
      navigate(`/articles/${res.data.slug}`);
    } catch (err) {
      showToast("Erreur lors de la création", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return <ArticleForm onSubmit={handleCreate} submitting={submitting} backLink="/articles" />;
}