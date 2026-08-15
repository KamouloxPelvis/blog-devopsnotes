import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Article } from '../types/articles';
import NProgress from 'nprogress';

export const useRelatedArticles = (slug?: string) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setArticles([]);
      return;
    }

    const fetchRelatedArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        NProgress.start();

        const response = await api.get(
          `/articles/${encodeURIComponent(slug)}/related`
        );

        if (Array.isArray(response.data)) {
          setArticles(response.data);
        } else {
          setArticles([]);
        }
      } catch (err: any) {
        console.error(
          'Erreur chargement articles associés:',
          err
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            'Erreur chargement articles associés'
        );

        setArticles([]);
      } finally {
        setLoading(false);
        NProgress.done();
      }
    };

    fetchRelatedArticles();
  }, [slug]);

  return {
    articles,
    loading,
    error,
  };
};