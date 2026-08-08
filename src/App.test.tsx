import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type {
  AuthDependencies,
  AuthService,
  AuthSession,
  ProfileRepository,
} from './auth/auth';
import type { User } from './users/user';

const session: AuthSession = {
  user: { id: 'auth-user', email: 'avery@example.test' },
};

const adminProfile: User = {
  id: 'auth-user',
  firstName: 'Avery',
  lastName: 'Admin',
  displayName: 'Avery Admin',
  email: 'avery@example.test',
  role: 'Admin',
  status: 'Active',
  createdDate: '2026-08-08T00:00:00.000Z',
  updatedDate: '2026-08-08T00:00:00.000Z',
};

function createDependencies(options: {
  session?: AuthSession | null;
  profile?: User | null;
  pendingSession?: Promise<AuthSession | null>;
} = {}) {
  let listener: (nextSession: AuthSession | null) => void = () => undefined;
  const profileRepository: ProfileRepository = {
    getProfile: vi.fn().mockResolvedValue(
      options.profile === undefined ? adminProfile : options.profile,
    ),
  };
  const authService: AuthService = {
    getSession: vi.fn(() =>
      options.pendingSession ??
      Promise.resolve(options.session === undefined ? session : options.session),
    ),
    signInWithPassword: vi.fn().mockResolvedValue(session),
    signOut: vi.fn(async () => {
      listener(null);
    }),
    onAuthStateChange: vi.fn((nextListener) => {
      listener = nextListener;
      return () => undefined;
    }),
  };

  return { authService, profileRepository } satisfies AuthDependencies;
}

describe('App authentication and shell', () => {
  it('shows auth loading and hides the application shell while restoring a session', () => {
    const dependencies = createDependencies({
      pendingSession: new Promise(() => undefined),
    });
    render(<App authDependencies={dependencies} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your TestNest session...',
    );
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });

  it('treats configured Supabase with a null session as signed out', async () => {
    const dependencies = createDependencies({ session: null });
    render(<App authDependencies={dependencies} />);

    expect(
      await screen.findByRole('heading', { name: 'Sign in to TestNest' }),
    ).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
    expect(dependencies.profileRepository.getProfile).not.toHaveBeenCalled();
  });

  it('handles an unavailable authentication service safely', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.authService.getSession).mockRejectedValueOnce(
      new Error('Supabase could not be reached.'),
    );
    render(<App authDependencies={dependencies} />);

    expect(
      await screen.findByRole('heading', { name: 'Authentication unavailable' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Supabase could not be reached.',
    );
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });

  it('does not misclassify a post-login profile error as invalid authentication', async () => {
    const user = userEvent.setup();
    const dependencies = createDependencies({ session: null });
    vi.mocked(dependencies.profileRepository.getProfile).mockRejectedValue({
      code: '42501',
      message: 'permission denied for table profiles',
    });
    render(<App authDependencies={dependencies} />);
    await screen.findByRole('heading', { name: 'Sign in to TestNest' });

    await user.type(screen.getByLabelText('Email'), 'avery@example.test');
    await user.type(screen.getByLabelText('Password'), 'test-only-value');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(
      await screen.findByRole('heading', { name: 'Authentication unavailable' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'permission denied for table profiles',
    );
    expect(
      screen.queryByRole('heading', { name: 'Sign in to TestNest' }),
    ).toBeNull();
  });

  it('restores an authenticated profile and renders the dashboard', async () => {
    const dependencies = createDependencies();
    render(<App authDependencies={dependencies} />);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Dashboard' }),
    ).toBeVisible();
    expect(dependencies.authService.getSession).toHaveBeenCalledOnce();
    expect(dependencies.profileRepository.getProfile).toHaveBeenCalledWith(
      session.user.id,
    );
    expect(screen.getByText('Avery Admin')).toBeVisible();
    expect(screen.getByText('Admin', { exact: true })).toBeVisible();
  });

  it('navigates between application pages after authentication', async () => {
    const user = userEvent.setup();
    render(<App authDependencies={createDependencies()} />);
    await screen.findByRole('heading', { level: 2, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: 'Projects' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Projects' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Test Cases' }));
    expect(screen.getByRole('heading', { name: 'Test Cases' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  it('logs out through the auth service and returns to Login', async () => {
    const user = userEvent.setup();
    const dependencies = createDependencies();
    render(<App authDependencies={dependencies} />);
    await screen.findByRole('heading', { level: 2, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(dependencies.authService.signOut).toHaveBeenCalledOnce());
    expect(await screen.findByRole('heading', { name: 'Sign in to TestNest' })).toBeVisible();
  });

  it('blocks an inactive profile', async () => {
    render(
      <App
        authDependencies={createDependencies({
          profile: { ...adminProfile, status: 'Inactive' },
        })}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Account inactive' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });

  it('handles a missing profile without rendering the shell', async () => {
    render(<App authDependencies={createDependencies({ profile: null })} />);

    expect(await screen.findByRole('heading', { name: 'Profile not found' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });

  it('replaces the legacy Current User switcher with authenticated identity', async () => {
    render(<App authDependencies={createDependencies()} />);
    await screen.findByRole('heading', { level: 2, name: 'Dashboard' });

    expect(screen.queryByLabelText('Current User')).toBeNull();
    expect(screen.getByText('Signed in as')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  it('derives Viewer read-only permissions from the authenticated profile', async () => {
    render(
      <App
        authDependencies={createDependencies({
          profile: { ...adminProfile, role: 'Viewer' },
        })}
      />,
    );
    await screen.findByRole('heading', { level: 2, name: 'Dashboard' });

    expect(screen.queryByRole('button', { name: 'Users' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Projects' }));
    expect(screen.queryByRole('button', { name: 'Create Project' })).toBeNull();
  });
});
