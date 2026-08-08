import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import type { AuthDependencies } from './auth/auth';
import './styles.css';

async function getDevelopmentAuthDependencies(): Promise<
  AuthDependencies | undefined
> {
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_TEST_AUTH_MODE === 'true'
  ) {
    const { createTestAuthDependencies } = await import(
      './auth/testAuthAdapter'
    );
    return createTestAuthDependencies();
  }

  return undefined;
}

async function renderApp() {
  const authDependencies = await getDevelopmentAuthDependencies();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App authDependencies={authDependencies} />
    </StrictMode>,
  );
}

void renderApp();
