'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', whatsapp_number: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.login(form.email, form.password)
        : await api.register(form);
      localStorage.setItem('wm_token', res.token);
      localStorage.setItem('wm_user', JSON.stringify(res.user));
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📲</div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>WhatsApp Monitor</h1>
          <p style={{ color: 'var(--text2)', marginTop: '4px' }}>Monitore clientes e gere especificações com IA</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button
              className={`btn flex-1 ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('login')}
            >
              Entrar
            </button>
            <button
              className={`btn flex-1 ${mode === 'register' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('register')}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="label">Seu nome</label>
                <input
                  type="text"
                  placeholder="Ex: Felipe Silva"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="label">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Senha</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            {mode === 'register' && (
              <div className="form-group">
                <label className="label">Seu número WhatsApp (para receber alertas)</label>
                <input
                  type="text"
                  placeholder="5511999999999 (com código do país)"
                  value={form.whatsapp_number}
                  onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                />
                <span className="text-xs text-muted">Exemplo: 5511999999999 (sem espaços ou traços)</span>
              </div>
            )}

            {error && (
              <div style={{ background: '#7f1d1d', border: '1px solid var(--red)', borderRadius: '8px', padding: '10px 14px', color: 'var(--red)', marginBottom: '16px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><span className="spinner" />&nbsp;Aguarde...</> : mode === 'login' ? 'Entrar' : 'Criar minha conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
