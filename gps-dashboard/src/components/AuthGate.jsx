import React, { useEffect, useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthGate = ({ children }) => {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return <AuthMessage message="Configura Supabase para habilitar el acceso al panel." />;
  }

  if (session) return children;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsBusy(true);

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) setError(result.error.message);
    else if (mode === 'signup') setMessage('Cuenta creada. Revisa tu correo para confirmar el acceso.');
    setIsBusy(false);
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-mark"><LogIn size={20} /></div>
        <span className="auth-eyebrow">RideGuard · Panel privado</span>
        <h1>{mode === 'login' ? 'Entrar al monitoreo' : 'Crear acceso de operador'}</h1>
        <p>Solo los usuarios autorizados pueden consultar y controlar la flota.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Correo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}
          <button type="submit" disabled={isBusy}>{isBusy ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>
        <button type="button" className="auth-switch" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <UserPlus size={15} /> {mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo una cuenta'}
        </button>
      </section>
    </main>
  );
};

const AuthMessage = ({ message }) => (
  <main className="auth-shell"><section className="auth-card"><span className="auth-eyebrow">RideGuard</span><h1>Panel no configurado</h1><p>{message}</p></section></main>
);
