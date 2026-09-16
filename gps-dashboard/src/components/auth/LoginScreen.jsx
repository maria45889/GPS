import React, { useState } from 'react';
import { api } from '../../services/api';

export const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@rideguard.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(email, password);
      onLogin?.(response);
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">RG</div>
          <div>
            <p>RideGuard</p>
            <span>Fleet control</span>
          </div>
        </div>

        <h1>Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@rideguard.com"
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-demo-box">
          <strong>Demo autorizado</strong>
          <ul>
            <li>admin@rideguard.com / admin123</li>
            <li>manager@rideguard.com / manager123</li>
            <li>driver@rideguard.com / driver123</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
