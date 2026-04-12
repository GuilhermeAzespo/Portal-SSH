import { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Terminal, Lock, User } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />
      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '15%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Login card */}
      <div className="glass fade-in" style={{
        width: '100%',
        maxWidth: '400px',
        borderRadius: '20px',
        padding: '2.5rem',
        border: '1px solid rgba(0,212,170,0.12)',
        boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,170,0.05)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
          borderRadius: '0 0 4px 4px',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, var(--primary), #00A87A)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 0 20px rgba(0,212,170,0.3)',
          }}>
            <Terminal size={28} color="#060A0F" strokeWidth={2.5} />
          </div>
          <h2 style={{
            margin: 0, fontSize: '1.6rem', fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            Portal <span style={{ color: 'var(--primary)' }}>SSH</span>
          </h2>
          <p style={{
            color: 'var(--text-muted)', margin: '0.375rem 0 0',
            fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
          }}>
            secure shell gateway
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(248,113,113,0.25)',
            color: 'var(--danger)',
            borderRadius: '8px',
            padding: '0.625rem 1rem',
            fontSize: '0.83rem',
            marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1rem' }}>⚠</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Usuário</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{
                position: 'absolute', left: '0.75rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)',
                pointerEvents: 'none',
              }} />
              <input
                className="input"
                placeholder="Nome de usuário"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{
                position: 'absolute', left: '0.75rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)',
                pointerEvents: 'none',
              }} />
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            className="button"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', fontSize: '0.95rem' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #060A0F', borderTopColor: 'transparent', borderRadius: '50%' }} />
                Autenticando...
              </span>
            ) : (
              <>
                <Terminal size={16} />
                Entrar
              </>
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '1.5rem', marginBottom: 0,
          fontSize: '0.68rem', color: 'var(--text-subtle)',
          fontFamily: 'var(--font-mono)',
        }}>
          Portal SSH v2.0.0 · Acesso restrito
        </p>
      </div>
    </div>
  );
};
