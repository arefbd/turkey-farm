import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UIProvider } from './components/Modal';
import { AuthGate } from './auth/AuthGate';
import './styles/style.css';

const root = document.getElementById('root');
if (!root) throw new Error('عنصر root یافت نشد');

createRoot(root).render(
  <StrictMode>
    <UIProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </UIProvider>
  </StrictMode>,
);
