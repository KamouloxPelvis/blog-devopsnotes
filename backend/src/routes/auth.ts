import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer'; // Import direct pour la gestion mémoire
import crypto from 'node:crypto';
import { User } from '../models/User';
import { sendVerificationEmail, sendResetPasswordEmail } from '../utils/mailer';
import { requireAuth } from '../middleware/auth';
import { uploadToR2 } from '../services/r2Service'; // Ton nouveau service R2
import { antivirusScan } from '../middleware/antivirus';
import { processImage } from '../middleware/imageProcessor';

const authRouter = express.Router();

// Configuration Multer pour les avatars (Stockage en RAM)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // Limite à 2MB pour un avatar
});

// Options de cookie sécurisées
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Obligatoire pour partager le cookie entre sous-domaines en HTTPS
  sameSite: 'lax' as const,
  domain: '.devopsnotes.org', 
  maxAge: 24 * 60 * 60 * 1000
};

// ---------- CHECK SESSION ----------
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    // On récupère l'ID en toute sécurité
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non trouvé dans le token" });
    }

    // CRUCIAL : On interroge la DB pour avoir les infos fraîches (location, birthday)
    const user = await User.findById(userId).select('-password');
    
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: "Erreur lors de la récupération du profil" });
  }
});

// ---------- SIGNUP (Version R2) ----------
authRouter.post('/signup', upload.single('avatar'), antivirusScan, processImage, async (req, res) => {
  const { email, password, pseudo } = req.body;
  
  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email déjà utilisé' });

    const existingPseudo = await User.findOne({ pseudo });
    if (existingPseudo) return res.status(400).json({ message: 'Ce pseudo est déjà pris' });

    const vToken = crypto.randomBytes(32).toString('hex');

    // GESTION DE L'AVATAR VIA R2
    let avatarUrl = '';
    if (req.file) {
      // On utilise le même service que pour les articles
      avatarUrl = await uploadToR2(req.file);
    }

    const user = new User({
      email,
      pseudo,
      password, 
      role: 'member',
      avatarUrl, // URL resources.devopsnotes.org/...
      isVerified: false,
      verificationToken: vToken
    });

    await user.save();

    try {
      await sendVerificationEmail(user.email, vToken);
    } catch (mailErr) {
      console.error("Erreur SMTP :", mailErr);
      return res.status(201).json({ 
        message: 'Compte créé, mais erreur d\'envoi d\'email. Contactez le support.' 
      });
    }

    return res.status(201).json({ message: 'Inscription réussie ! Vérifiez vos emails.' });
  } catch (err) {
    console.error("Erreur Inscription :", err);
    return res.status(500).json({ message: 'Erreur lors de l\'inscription' });
  }
});

// ---------- LOGIN ----------
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

  if (!jwtSecret) return res.status(500).json({ message: 'Auth not configured' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Identifiants invalides' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Veuillez confirmer votre adresse email.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Identifiants invalides' });

    const payload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      pseudo: user.pseudo,
      avatarUrl: user.avatarUrl,
      birthday: user.birthday,
      location: user.location
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as any });

    res.cookie('token', token, COOKIE_OPTIONS);
    return res.json({ user: payload });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed' });
  }
});

// ---------- LOGOUT ----------
authRouter.post('/logout', (req, res) => {
  res.clearCookie('token', { domain: '.devopsnotes.org' });
  res.json({ message: 'Déconnecté' });
});

// ---------- VERIFY / FORGOT / RESET (Simplifiés) ----------
authRouter.get('/verify-email', async (req, res) => {
  const token =
    typeof req.query.token === 'string'
      ? req.query.token
      : undefined;

  if (!token) {
    return res.status(400).json({
      message: 'Token de validation manquant.',
    });
  }

  try {
    const user = await User.findOne({
      verificationToken: token,
    });

    if (!user) {
      return res.status(400).json({
        message: 'Lien invalide.',
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;

    await user.save();

    return res.json({
      message: 'Compte activé !',
    });
  } catch (err) {
    console.error(
      'Erreur validation email :',
      err
    );

    return res.status(500).json({
      message: 'Erreur validation.',
    });
  }
});

authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + 3600000);
      await user.save();
      await sendResetPasswordEmail(user.email, token);
    }
    res.json({ message: 'Si ce compte existe, un email a été envoyé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

authRouter.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ message: 'Token expiré.' });
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Mot de passe réinitialisé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur reset.' });
  }
});

// Route de mise à jour du profil
authRouter.put('/update-profile', requireAuth, upload.single('avatar'), antivirusScan, processImage, async (req, res) => {
  console.log('--- DEBUG UPDATE PROFILE ---');
  console.log('Body:', req.body);   // Doit afficher city, country, pseudo...
  console.log('File:', req.file);   // Doit afficher les infos de l'image si présente
  try {
    const userId = req.user?.id;
    const { pseudo, city, country, birthday } = req.body;
    
    const updateData: any = {
      pseudo: pseudo,
      'location.city': city,
      'location.country': country,
      birthday: birthday ? new Date(birthday) : undefined
    };

    
    if (req.file) {
      updateData.avatarUrl = await uploadToR2(req.file, 'avatars');

      console.log(`✅ Avatar uploadé dans R2: ${updateData.avatarUrl}`);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.json({ user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
  }
});

export default authRouter;