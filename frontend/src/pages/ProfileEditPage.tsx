import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Helmet } from 'react-helmet-async';
import '../styles/ProfileEditPage.css';

<Helmet>
  <title>Modifier le profil | DevOpsNotes</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>

interface UserPayload {
  id: string;
  role: string;
  email: string;
  pseudo: string;
  avatarUrl?: string;
  birthday?: string;
  location?: {
    city?: string;
    country?: string;
  };
}

export default function ProfileEditPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const currentUser = user as unknown as UserPayload;

  const [pseudo, setPseudo] = useState('');
  const [birthday, setBirthday] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
  if (currentUser) {
    setPseudo(currentUser.pseudo || '');
    setCity(currentUser.location?.city || '');
    setCountry(currentUser.location?.country || '');
    if (currentUser.birthday) {
      setBirthday(new Date(currentUser.birthday).toISOString().split('T')[0]);
    }
    
    if (currentUser.avatarUrl) {
      const R2_URL = 'https://resources.devopsnotes.org';
      const fullUrl = currentUser.avatarUrl.startsWith('http') 
        ? currentUser.avatarUrl 
        : `${R2_URL}/${currentUser.avatarUrl}`;
      setImagePreview(fullUrl);
    } else {
      setImagePreview(`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.pseudo)}&background=2563eb&color=fff`);
    }
  }
}, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateAge = (date: string) => {
    if (!date) return null;
    const diff = Date.now() - new Date(date).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('pseudo', pseudo);
      formData.append('birthday', birthday);
      formData.append('city', city);
      formData.append('country', country);
      if (imageFile) formData.append('avatar', imageFile);

      const res = await api.put('/auth/update-profile', formData);
      
      setUser(res.data.user);
      showToast("Profil mis à jour !", 'success');
      navigate('/profile');
    } catch (err) {
      showToast("Erreur lors de la mise à jour du profil", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-edit-container">
      <div className="profile-edit-card">
        <header className="edit-header">
          <button type="button" onClick={() => navigate('/profile')} className="back-btn" aria-label="Retour">←</button>
          <h1>Modifier mon Profil</h1>
        </header>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="avatar-section">
            <div className="avatar-preview-container">
              <img 
                src={imagePreview || 'https://via.placeholder.com/150'} 
                alt="Avatar preview" 
                className="edit-avatar-preview"
              />
              <label htmlFor="avatar-upload" className="upload-overlay">
                <span>Changer</span>
              </label>
              <input 
                id="avatar-upload"
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) setImagePreview(URL.createObjectURL(file));
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group full">
              <label>Pseudo</label>
              <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} required placeholder="Ton pseudo" />
            </div>

            <div className="input-group full">
              <label>Date de naissance {birthday ? <span className="age-info">({calculateAge(birthday)} ans)</span> : <span className="optional-label">(Optionnel)</span>}</label>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>

            <div className="input-group">
              <label>Ville / Région <span className="optional-label">(Optionnel)</span></label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Plouguernével" />
            </div>

            <div className="input-group">
              <label>Pays <span className="optional-label">(Optionnel)</span></label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ex: France" />
            </div>
          </div>

          <div className="edit-actions">
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
            <button type="button" onClick={() => navigate('/profile')} className="btn-cancel">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}