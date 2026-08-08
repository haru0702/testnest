import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App shell', () => {
  it('renders TestNest and the dashboard by default', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'TestNest' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    expect(screen.getByText('Total Projects')).toBeVisible();
  });

  it('navigates between application pages', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Projects' }));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Projects' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Test Cases' }));
    expect(screen.getByRole('heading', { name: 'Test Cases' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Defects' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Defects' })).toBeVisible();
    expect(screen.getByText('No defects yet')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Reports' }));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Reports' }),
    ).toBeVisible();
    expect(screen.getByText('Report Filters')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
