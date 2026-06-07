import { useState } from 'react';
import { supabase } from './supabase';
import './AdminLoginPage.css';

const ALLOWED_ADMINS = ['alancoimieres@gmail.com', 'appmentorify@gmail.com'];

export default function AdminLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!ALLOWED_ADMINS.includes(email)) {
        setError('❌ Acceso denegado. Solo admins autorizados.');
        setLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('❌ Email o contraseña incorrectos');
        setLoading(false);
        return;
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setError('Error: ' + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <h1>🛡️ Panel Admin Mentorify</h1>
        <p className="subtitle">Acceso exclusivo para administradores</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar al Admin'}
          </button>
        </form>

        <p className="admin-note">
          ⚠️ Solo acceso para: alancoimieres@gmail.com y appmentorify@gmail.com
        </p>
      </div>
    </div>
  );
}
