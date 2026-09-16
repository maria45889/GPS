import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../components/auth/LoginScreen';

describe('LoginScreen', () => {
  it('renders the login form and signs in with a demo user', async () => {
    const user = userEvent.setup();
    const handleLogin = vi.fn();

    render(<LoginScreen onLogin={handleLogin} />);

    const submit = screen.getByRole('button', { name: /entrar/i });
    await user.click(submit);

    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledTimes(1);
    });
  });
});
