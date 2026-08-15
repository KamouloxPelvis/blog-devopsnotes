import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';

<Helmet>
  <title>Réinitialiser le mot de passe | DevOpsNotes</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    });

    if (res.ok) {
      alert("Succès ! Connectez-vous avec votre nouveau mot de passe.");
      navigate('/login');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Nouveau mot de passe</h2>
        <input
          aria-label="Entrer mot de passe de 6 caractères minimum, dont une majuscule et un caractère spécial minimum" 
          type="password" 
          placeholder="Le mot de passe doit contenir au moins 6 caractères, une majuscule et un caractère spécial" 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        <button aria-label="Changer le mot de passe" type="submit" className="btn-auth-submit">Changer le mot de passe</button>
      </form>
    </div>
  );
}