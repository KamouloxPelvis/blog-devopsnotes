import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateThread, getThread } from '../api/forum';
import TiptapEditor from '../components/Editor'; 
import { Helmet } from 'react-helmet-async';
import '../styles/ThreadModPage.css';

<Helmet>
  <title>Modifier le sujet | DevOpsNotes</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>

export default function ThreadEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id) return;
    getThread(id)
      .then((data) => {
        setTitle(data.title);
        setContent(data.content);
        setTags(data.tags?.join(', ') || '');
      })
      .catch((err: any) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commonEmojis = ['😊', '😂', '🚀', '🔥', '💻', '👍', '🙌', '🤔', '✅', '❌'];

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji); // Tiptap gère bien l'ajout de texte brut à la suite du HTML
    setShowEmojiPicker(false);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    
    setError(null);
    setUpdating(true);

    try {
      const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await updateThread(id, { title, content, tags: tagsArray });
      navigate(`/forum/${id}`); 
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Impossible de modifier le sujet');
    } finally {
      setUpdating(false);
    }
  }

  if (loading || authLoading) return <div className="new-thread-container">Chargement...</div>;

  return (
    <div className="new-thread-container">
      <div className="form-header">
        <Link to={`/forum/${id}`} className="back-link">← Annuler</Link>
        <h1>Modifier le sujet</h1>
      </div>

      <form className="new-thread-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner">⚠️ {error}</div>}

        <div className="form-group">
          <label htmlFor="title">Titre du sujet</label>
          <input
            id="title"
            type="text"
            className="title-input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <div className="editor-wrapper forum-rich-editor">
            <TiptapEditor value={content} onChange={setContent} />
            <div className="forum-emoji-container">
            <button 
              type="button" 
              className="action-btn" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ padding: '10px', fontSize: '1.2rem' }}
            >
              😊
            </button>

            {showEmojiPicker && (
              <div className="forum-emoji-picker">
                {commonEmojis.map(emoji => (
                  <span key={emoji} onClick={() => addEmoji(emoji)}>{emoji}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (séparés par des virgules)</label>
          <input
            id="tags"
            type="text"
            className="tags-input-field"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={updating}>
            {updating ? 'Mise à jour...' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}