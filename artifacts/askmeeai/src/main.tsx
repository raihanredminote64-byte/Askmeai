import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { getToken } from './lib/auth-token';
import App from './App';
import './index.css';

// Register the auth token getter so every API call includes Authorization header
setAuthTokenGetter(() => getToken());

createRoot(document.getElementById('root')!).render(<App />);
