import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store';
import './index.scss';
import App from './App.tsx';

// GitHub Pages SPA fallback: /Ofset-M/?p=<original_path>
const sp = new URLSearchParams(window.location.search);
const p = sp.get('p');
if (p) {
  window.history.replaceState(null, '', decodeURIComponent(p));
}

// basename совпадает с vite base — без него react-router не матчит /Ofset-M/*
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
