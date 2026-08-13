import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ToastProvider } from './context/ToastContext';
import { PageLayout } from './components/PageLayout';
import { RequireAuthRoute } from './components/RequireAuthRoute';
import { RequireAdminRoute } from './components/RequireAdminRoute';
import 'nprogress/nprogress.css';
import './App.css';

// --- Chargement IMMÉDIAT (uniquement la page d'accueil) ---
import HomePage from './pages/HomePage';

// --- Chargement DIFFÉRÉ (Lazy Loading) ---
// On déplace tous les autres imports ici pour réduire le bundle initial
const ArticlesPage = lazy(() => import('./pages/ArticlesPage').then(module => ({ default: module.ArticlesPage })));
const ArticleShow = lazy(() => import('./pages/ArticleShowPage'));
const NewArticle = lazy(() => import('./pages/ArticleNewPage'));
const EditArticle = lazy(() => import('./pages/ArticleEditPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const Signin = lazy(() => import('./pages/SigninPage'));
const Signup = lazy(() => import('./pages/SignupPage'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ThreadsPage = lazy(() => import('./pages/ThreadsPage'));
const ThreadNewPage = lazy(() => import('./pages/ThreadNewPage'));
const ThreadEditPage = lazy(() => import('./pages/ThreadEditPage'));
const ThreadDetailPage = lazy(() => import('./pages/ThreadDetailPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <PageLayout>
          {/* Le Suspense affiche un fallback léger pendant que le chunk de la page charge */}
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/homepage" element={<Navigate to="/" replace />} />
              
              {/* Articles */}
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/articles/:slug" element={<ArticleShow />} />
              <Route 
                path="/articles/new" 
                element={<RequireAdminRoute><NewArticle /></RequireAdminRoute>} 
              />
              <Route 
                path="/articles/:slug/edit" 
                element={<RequireAdminRoute><EditArticle /></RequireAdminRoute>} 
              />

              {/* Auth */}
              <Route path="/login" element={<Signin />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route 
                path="/profile" 
                element={<RequireAuthRoute><ProfilePage /></RequireAuthRoute>} 
              />
              <Route 
                path="/profile/:id/edit" 
                element={<RequireAuthRoute><ProfileEditPage /></RequireAuthRoute>} 
              />

              {/* Forum */}
              <Route path="/forum" element={<ThreadsPage />} />
              <Route path="/forum/:id" element={<ThreadDetailPage />} />
              <Route 
                path="/forum/new" 
                element={<RequireAuthRoute><ThreadNewPage /></RequireAuthRoute>} 
              />
              <Route 
                path="/forum/:id/edit" 
                element={<RequireAuthRoute><ThreadEditPage /></RequireAuthRoute>} 
              />

              {/* Chat */}
              <Route 
                path="/chat" 
                element={<RequireAuthRoute><ChatPage /></RequireAuthRoute>} 
              />
            </Routes>
          </Suspense>
        </PageLayout>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;