import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/ProfilePage.css';

<Helmet>
  <title>Profil | DevOpsNotes</title>
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

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentUser = user as unknown as UserPayload;
  const R2_PUBLIC_URL = 'https://resources.devopsnotes.org';

  if (!currentUser) {
    return (
      <div className="profile-container">
        <div className="auth-card">
          <p>Veuillez vous connecter pour voir votre profil.</p>
          <button onClick={() => navigate('/login')} className="btn-profile-primary">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // Calcul de l'âge pour l'affichage sous le pseudo
  const calculateAge = (date?: string) => {
    if (!date) return null;
    const diff = Date.now() - new Date(date).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const getAvatarSrc = () => {
    if (currentUser.avatarUrl) {
      return currentUser.avatarUrl.startsWith('http') 
        ? currentUser.avatarUrl 
        : `${R2_PUBLIC_URL}/${currentUser.avatarUrl}`;
    }
    const initials = encodeURIComponent(currentUser.pseudo);
    // UI-Avatars : Fond bleu DevOpsNotes (#2563eb) et texte blanc
    return `https://ui-avatars.com/api/?name=${initials}&background=2563eb&color=fff&size=150`;
  };

  const getRoleStyle = (role: string) => {
    switch(role) {
      case 'admin': return { label: 'Administrateur', class: 'role-admin' };
      case 'moderator': return { label: 'Modérateur', class: 'role-mod' };
      default: return { label: 'Membre', class: 'role-member' };
    }
  };

  const roleInfo = getRoleStyle(currentUser.role || 'member');
  const age = calculateAge(currentUser.birthday);

  return (
    <div className="profile-container">
      <div className="profile-card">
        <header className="profile-header">
          <h1>Mon Profil</h1>
        </header>

        <div className="profile-content">
          <div className="avatar-wrapper">
            <img 
              src={getAvatarSrc()} 
              alt={`Avatar de ${currentUser.pseudo}`} 
              className={`profile-avatar ${roleInfo.class}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.pseudo)}&background=2563eb&color=fff`;
              }}
            />
            <span className={`role-badge ${roleInfo.class}`}>
              {roleInfo.label}
            </span>
          </div>

          <h2 className="profile-pseudo">
            {currentUser.pseudo}
            {age !== null && <span className="profile-age-inline"> ({age} ans)</span>}
          </h2>
          
          <p className="profile-email">{currentUser.email}</p>

          {(currentUser.location?.city || currentUser.location?.country) && (
            <p className="profile-location">
              📍 {currentUser.location.city}
              {currentUser.location.city && currentUser.location.country ? ', ' : ''}
              {currentUser.location.country}
            </p>
          )}
        </div>

        <div className="profile-actions">
          <button 
            onClick={() => navigate(`/profile/${currentUser.id}/edit`)} 
            className="btn-profile-primary"
          >
            Éditer le profil
          </button>

          <button 
            onClick={() => navigate('/articles')} 
            className="btn-profile-secondary"
          >
            Retour aux articles
          </button>
          
          <button 
            onClick={() => { logout(); navigate('/'); }} 
            className="btn-profile-danger"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}