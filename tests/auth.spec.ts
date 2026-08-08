import { expect, test, type Page } from '@playwright/test';

type Role = 'Admin' | 'QA Lead' | 'Tester' | 'Developer' | 'Viewer';
type Status = 'Active' | 'Inactive';

const date = '2026-08-08T00:00:00.000Z';
const authUser = { id: 'auth-admin', email: 'avery@example.test' };

function makeProfile(
  role: Role = 'Admin',
  status: Status = 'Active',
  id = authUser.id,
) {
  return {
    id,
    firstName: role === 'Viewer' ? 'Val' : 'Avery',
    lastName: role === 'Viewer' ? 'Viewer' : 'Admin',
    displayName: role === 'Viewer' ? 'Val Viewer' : 'Avery Admin',
    email: role === 'Viewer' ? 'val@example.test' : authUser.email,
    role,
    status,
    createdDate: date,
    updatedDate: date,
  };
}

type AuthFixture = {
  session: { user: { id: string; email: string } } | null;
  accounts: Array<{ id: string; email: string }>;
  profiles: ReturnType<typeof makeProfile>[];
  signInError?: string;
  profileError?: { code: string; message: string };
  unavailableError?: string;
};

async function openWithAuth(page: Page, fixture: AuthFixture) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('testnest.testAuth')) {
      localStorage.setItem('testnest.testAuth', JSON.stringify(state));
    }
  }, fixture);
  await page.goto('/');
}

function signedOutFixture(profile = makeProfile()): AuthFixture {
  return {
    session: null,
    accounts: [{ id: profile.id, email: profile.email }],
    profiles: [profile],
  };
}

async function signIn(page: Page, email = authUser.email) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('local-test-value');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test.describe('Phase 10A authentication', () => {
  test('unauthenticated access shows Login and hides the application shell', async ({ page }) => {
    await openWithAuth(page, signedOutFixture());

    await expect(page.getByRole('heading', { name: 'Sign in to TestNest' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  });

  test('direct unauthenticated application access remains protected', async ({ page }) => {
    await page.addInitScript((state) => {
      localStorage.setItem('testnest.testAuth', JSON.stringify(state));
    }, signedOutFixture());
    await page.goto('/?page=users');

    await expect(page.getByRole('heading', { name: 'Sign in to TestNest' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toHaveCount(0);
  });

  test('validates required email and password', async ({ page }) => {
    await openWithAuth(page, signedOutFixture());
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
    await page.getByLabel('Email').fill(authUser.email);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('shows invalid credential errors without exposing the shell', async ({ page }) => {
    await openWithAuth(page, {
      ...signedOutFixture(),
      signInError: 'Invalid login credentials',
    });
    await signIn(page);

    await expect(page.getByRole('alert')).toHaveText('Invalid login credentials');
    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toHaveCount(0);
  });

  test('distinguishes a post-login profile failure from invalid authentication', async ({ page }) => {
    await openWithAuth(page, {
      ...signedOutFixture(),
      profileError: {
        code: 'TEST_PROFILE',
        message: 'Profile lookup was rejected.',
      },
    });
    await signIn(page);

    await expect(
      page.getByRole('heading', { name: 'Authentication unavailable' }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      'Profile lookup was rejected.',
    );
    await expect(
      page.getByRole('heading', { name: 'Sign in to TestNest' }),
    ).toHaveCount(0);
  });

  test('authenticates, loads profile identity, permissions, and the existing shell', async ({ page }) => {
    await openWithAuth(page, signedOutFixture());
    await signIn(page);

    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Avery Admin')).toBeVisible();
    await expect(page.getByText('Admin', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Projects' }).click();
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
  });

  test('restores the authenticated session after refresh', async ({ page }) => {
    await openWithAuth(page, signedOutFixture());
    await signIn(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Avery Admin')).toBeVisible();
  });

  test('uses an authenticated Viewer profile for read-only behavior', async ({ page }) => {
    const viewer = makeProfile('Viewer', 'Active', 'auth-viewer');
    await openWithAuth(page, signedOutFixture(viewer));
    await signIn(page, viewer.email);

    await expect(page.getByText('Val Viewer')).toBeVisible();
    await expect(page.getByText('Viewer', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Projects' }).click();
    await expect(page.getByRole('button', { name: 'Create Project' })).toHaveCount(0);
  });

  test('logout clears application access and returns to Login', async ({ page }) => {
    await openWithAuth(page, signedOutFixture());
    await signIn(page);
    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page.getByRole('heading', { name: 'Sign in to TestNest' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign in to TestNest' })).toBeVisible();
  });

  test('blocks an authenticated inactive profile', async ({ page }) => {
    const inactive = makeProfile('Tester', 'Inactive');
    await openWithAuth(page, {
      session: { user: authUser },
      accounts: [authUser],
      profiles: [inactive],
    });

    await expect(page.getByRole('heading', { name: 'Account inactive' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  });

  test('handles an authenticated user without a profile safely', async ({ page }) => {
    await openWithAuth(page, {
      session: { user: authUser },
      accounts: [authUser],
      profiles: [],
    });

    await expect(page.getByRole('heading', { name: 'Profile not found' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  });
});
