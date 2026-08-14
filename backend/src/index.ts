import dotenv from 'dotenv';
dotenv.config();

import "./instrument";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import cookieParser from 'cookie-parser';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { createServer } from 'http'; // Requis pour Socket.io
import { Server } from 'socket.io';
import * as Sentry from "@sentry/node";
import { Registry, collectDefaultMetrics, Counter } from 'prom-client';

// Import des routes
import authRoutes from './routes/auth';
import articleRoutes from './routes/articles';
import uploadRoutes from './routes/upload'; 
import chatRoutes from './routes/chat';
import forumRoutes from './routes/forum';
import commentRoutes from './routes/comments';
import seoRoutes from './routes/seo';
import { getSitemap } from './controllers/seoController';

// Import du modèle Message (nécessaire pour la logique de sauvegarde)
import { Message } from './models/Message';


const app = express();
const httpServer = createServer(app); // On crée le serveur HTTP

// Configuration Prometheus
const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestCounter = new Counter({
  name: 'blog_requests_total',
  help: 'Nombre total de requêtes HTTP sur le blog',
  labelNames: ['method', 'route', 'status'] as const,
});
register.registerMetric(httpRequestCounter);

// Middleware de Monitoring
app.use((req, res, next) => {
  res.on('finish', () => {
    // On évite de logger les routes de santé ou de métriques pour ne pas polluer les stats
    if (req.path !== '/metrics' && req.path !== '/favicon.ico') {
      httpRequestCounter.inc({
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode.toString(),
      });
    }
  });
  next();
});

// Configuration de Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000',
      'https://blog.devopsnotes.org',
      "https://resources.devopsnotes.org",
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',,
      'https://blog.devopsnotes.org',
      "https://resources.devopsnotes.org",
    ];
    // Autorise les requêtes sans origine (comme les outils serveurs ou mobile) 
    // ou si l'origine est dans la liste
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'", 
          "data:",
          "https://*.cloudflare.com", 
          "https://*.r2.cloudflarestorage.com",
          "https://resources.devopsnotes.org",
          'https://blog.devopsnotes.org', 
        ],
        connectSrc: [
          "'self'",
          "https://*.cloudflare.com",
          "https://resources.devopsnotes.org",
          'https://blog.devopsnotes.org', 
          "wss://devopsnotes.org",
          "wss://*.devopsnotes.org",
        ],
        upgradeInsecureRequests: null, 
      }
    },
  })
);

// Endpoints Métriques
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).send(err);
  }
});

// --- SEO ---
// Sitemap public à la racine du domaine
app.get('/sitemap.xml', getSitemap);

// --- ROUTES API ---
app.use('/api', uploadRoutes); // ROUTE IMAGES R2
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/seo', seoRoutes);

// --- MONITORING DES ERREURS AVEC SENTRY ---
Sentry.setupExpressErrorHandler(app);

app.get("/api/debug-sentry", (req, res) => {
  throw new Error("Test Sentry Kamal - " + new Date().toISOString());
});

// --- LOGIQUE SOCKET.IO ---
io.on('connection', (socket) => {
  // 1. RÉCUPÉRATION DU TOKEN DEPUIS LES COOKIES
  // Le frontend utilise des cookies HTTP-Only pour le token
  const cookies = cookie.parse(socket.handshake.headers.cookie || '');
  const token = cookies.token; 
  
  let userData: any = null;

  try {
    if (token) {
      userData = jwt.verify(token, process.env.JWT_SECRET || 'votre_cle_secrete');
    }
  } catch (err) {
    console.log('⚠️ Token invalide ou expiré');
    Sentry.captureException(err);
  }

  socket.on('chat:join', (room) => {
    socket.join(room);
  });

  socket.on('chat:message', async (data) => {
    try {
      // 2. SÉCURITÉ : On bloque si l'utilisateur n'est pas authentifié
      if (!userData || !userData.id) {
        console.log('🚫 Message refusé : utilisateur non connecté');
        return;
      }

      // 3. SAUVEGARDE DANS MONGODB (format author)
      const newMessage = new Message({
        room: data.room,
        text: data.text,
        author: userData.id, 
        at: new Date()
      });

      await newMessage.save();

      // 4. POPULATE & BROADCAST
      const populated = await Message.findById(newMessage._id)
        .populate('author', 'pseudo avatarUrl');

      if (populated) {
        
        const messageToBroadcast = {
          room: populated.room,
          text: populated.text,
          fromPseudo: (populated.author as any).pseudo,
          fromAvatar: (populated.author as any).avatarUrl,
          at: populated.at.toISOString()
        };

        io.to(data.room).emit('chat:message', messageToBroadcast);
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde socket:', err);
      Sentry.captureException(err);
    }
  });
});

// --- CONNEXION MONGODB ET LANCEMENT ---
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ ERREUR CRITIQUE : MONGO_URI n\'est pas définie dans le .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas Connecté');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion MongoDB Atlas :', err.message);
    Sentry.captureException(err);
  });