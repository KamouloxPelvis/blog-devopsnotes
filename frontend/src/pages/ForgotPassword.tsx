import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/Signup.css';

<Helmet>
  <title>Mot de passe oublié | DevOpsNotes</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:5000/api';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      
      // On affiche le message de succès même si l'email n'existe pas (sécurité)
      setMessage({ type: 'success', text: data.message || 'Lien envoyé ! Vérifiez votre boîte mail.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <header className="auth-header">
          <h1>Mot de passe oublié ?</h1>
          <p>Entrez votre email pour recevoir un lien de réinitialisation.</p>
        </header>

        {message ? (
          <div className={`auth-error-banner ${message.type === 'success' ? 'success-banner' : ''}`} 
               style={message.type === 'success' ? { backgroundColor: '#f0fff4', borderColor: '#c6f6d5', color: '#2f855a' } : {}}>
            {message.type === 'success' ? '✅ ' : '⚠️ '} {message.text}
          </div>
        ) : null}

        {!message || message.type === 'error' ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Votre adresse Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
              />
            </div>

            <button aria-label='Envoyer le lien' type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/login" className="btn-auth-submit" style={{ display: 'block', textDecoration: 'none' }}>
              Retour à la connexion
            </Link>
          </div>
        )}

        <footer className="auth-footer">
          <Link to="/login">Retour à la page de connexion</Link>
        </footer>
      </div>
    </div>
  );
}