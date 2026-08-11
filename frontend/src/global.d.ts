declare module 'react' {
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    fetchPriority?: 'high' | 'low' | 'auto';
    fetchpriority?: 'high' | 'low' | 'auto'; // Optionnel : garde les deux pour être tranquille
  }
}

declare module '*.css';