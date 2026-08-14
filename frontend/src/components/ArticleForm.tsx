import { FormEvent, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import TiptapEditor from './Editor';

interface ArticleFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  submitting: boolean;
  backLink: string;
  isEdit?: boolean;
}

export default function ArticleForm({
  initialData,
  onSubmit,
  submitting,
  backLink,
  isEdit,
}: ArticleFormProps) {
  const { showToast } = useToast();

  const [title, setTitle] = useState(initialData?.title || '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');

  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [rawTags, setRawTags] = useState(
    initialData?.tags?.join(', ') || ''
  );

  const [status, setStatus] = useState<'draft' | 'published'>(
    initialData?.status || 'draft'
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const R2_PUBLIC_URL =
    process.env.REACT_APP_R2_PUBLIC_URL ??
    'https://resources.devopsnotes.org';

  const getFullImageUrl = useCallback(
    (path: string) => {
      if (!path) return null;

      if (path.startsWith('http')) {
        return path;
      }

      const cleanPath = path.startsWith('/') ? path : `/${path}`;

      return `${R2_PUBLIC_URL}${cleanPath}`;
    },
    [R2_PUBLIC_URL]
  );

  useEffect(() => {
    if (initialData?.imageUrl) {
      setImagePreview(getFullImageUrl(initialData.imageUrl));
    }
  }, [initialData, getFullImageUrl]);

  const handleManualUpload = async () => {
    if (!imageFile || uploading) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('folder', 'articles');

      const res = await api.post('/upload', formData);

      const newImageKey = res.data.imageUrl;

      setImageUrl(newImageKey);
      setImagePreview(getFullImageUrl(newImageKey));
      setImageFile(null);

      showToast(
        isEdit
          ? "Image remplacée"
          : 'Image validée sur R2 !',
        'success'
      );
    } catch (err) {
      showToast("Échec de l'upload.", 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleTagsChange = (value: string) => {
    setRawTags(value);

    setTags(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
    );
  };

  const handleSubmitInternal = (e: FormEvent) => {
    e.preventDefault();

    onSubmit({
      title,
      excerpt: excerpt.trim(),
      content,
      imageUrl,
      tags,
      status,
    });
  };

  return (
    <div className="new-article-v2">
      <header className="editor-header">
        <div className="header-container">

          <Link to={backLink} className="back-link">
            ← Annuler
          </Link>

          <div className="view-switcher">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={viewMode === 'edit' ? 'active' : ''}
            >
              Édition
            </button>

            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={viewMode === 'preview' ? 'active' : ''}
            >
              Aperçu
            </button>
          </div>

          <div className="final-actions">

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'draft' | 'published')
              }
            >
              <option value="draft">
                Brouillon
              </option>

              <option value="published">
                {isEdit ? 'Modifier' : 'Publier'}
              </option>
            </select>

            <button
              type="button"
              onClick={handleSubmitInternal}
              className="btn-publish"
              disabled={submitting || uploading}
            >
              {submitting
                ? 'Enregistrement...'
                : isEdit
                  ? 'Mettre à jour'
                  : 'Enregistrer'}
            </button>

          </div>
        </div>
      </header>

      <main className="editor-content-area">

        {viewMode === 'edit' ? (

          <div className="edit-stack">

            {/* =====================================================
                MÉTADONNÉES
               ===================================================== */}

            <section className="meta-section">

              <div className="image-uploader">
                <label>
                  Image de couverture (R2 Storage)
                </label>

                <div className="upload-row">

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file =
                        e.target.files?.[0] || null;

                      setImageFile(file);

                      if (file) {
                        setImagePreview(
                          URL.createObjectURL(file)
                        );
                      }
                    }}
                  />

                  {imageFile && (
                    <button
                      type="button"
                      onClick={handleManualUpload}
                      className="btn-validate-upload"
                      disabled={uploading}
                    >
                      {uploading
                        ? 'Upload...'
                        : isEdit
                          ? "Remplacer l'image"
                          : 'Uploader sur R2'}
                    </button>
                  )}

                </div>

                {imagePreview && (
                  <img
                    src={imagePreview}
                    className="mini-preview"
                    alt="Aperçu de la couverture"
                  />
                )}
              </div>

              <div className="tag-box">

                <label>
                  Tags
                </label>

                <input
                  value={rawTags}
                  onChange={(e) =>
                    handleTagsChange(e.target.value)
                  }
                  placeholder="devops, kubernetes, cybersecurity..."
                />

              </div>

              {/* DESCRIPTION SEO */}

              <div className="excerpt-box">
                <label>
                  Description / extrait SEO
                </label>

                <textarea
                  value={excerpt}
                  onChange={(e) =>
                    setExcerpt(e.target.value.slice(0, 300))
                  }
                  maxLength={300}
                  rows={4}
                  placeholder="Résumé court de l'article utilisé notamment pour les moteurs de recherche et les aperçus de partage..."
                />

                <small>
                  {excerpt.length}/300 caractères
                </small>
              </div>

            </section>

            {/* TITRE */}

            <input
              className="main-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'article"
            />

            {/* CONTENU */}

            <TiptapEditor
              value={content}
              onChange={setContent}
            />

          </div>

        ) : (

          /* =====================================================
             APERÇU
             ===================================================== */

          <article className="full-preview">

            {imagePreview && (
              <img
                src={imagePreview}
                className="cover-img"
                alt="Couverture"
              />
            )}

            <h1 className="preview-title">
              {title}
            </h1>

            {excerpt && (
              <p className="preview-excerpt">
                {excerpt}
              </p>
            )}

            {tags.length > 0 && (
              <div className="preview-tags">
                {tags.map((tag) => (
                  <span key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div
              className="preview-body"
              dangerouslySetInnerHTML={{
                __html: content,
              }}
            />

          </article>
        )}

      </main>
    </div>
  );
}