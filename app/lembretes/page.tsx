'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, Reminder } from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toLocalInputValue(date?: Date) {
  const d = date || new Date();
  d.setMinutes(d.getMinutes() + 60);
  return d.toISOString().slice(0, 16);
}

export default function LembretesPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'sent' | 'cancelled'>('pending');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', scheduled_at: toLocalInputValue() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadReminders();
  }, [filter]);

  async function loadReminders() {
    setLoading(true);
    try {
      const data = await api.listReminders({ status: filter });
      setReminders(data);
    } finally {
      setLoading(false);
    }
  }

  async function saveReminder() {
    if (!form.title || !form.message || !form.scheduled_at) return;
    setSaving(true);
    setError('');
    try {
      // Converte datetime-local (sem timezone) para UTC
      const localDate = new Date(form.scheduled_at);
      const r = await api.createReminder({
        title: form.title,
        message: form.message,
        scheduled_at: localDate.toISOString(),
      });
      setReminders(prev => [r, ...prev].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
      setShowModal(false);
      setForm({ title: '', message: '', scheduled_at: toLocalInputValue() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function cancelReminder(id: string) {
    if (!confirm('Cancelar este lembrete?')) return;
    await api.cancelReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  }

  async function deleteReminder(id: string) {
    if (!confirm('Excluir este lembrete permanentemente?')) return;
    await api.deleteReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  }

  const statusLabel: Record<string, string> = { pending: 'Pendentes', sent: 'Enviados', cancelled: 'Cancelados' };
  const statusBadge: Record<string, string> = { pending: 'badge-yellow', sent: 'badge-green', cancelled: 'badge-gray' };
  const statusIcon: Record<string, string> = { pending: '⏳', sent: '✅', cancelled: '❌' };

  const pendingCount = reminders.filter(r => r.status === 'pending').length;

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Lembretes</h1>
            <p className="text-muted text-sm">Agende lembretes para receber via WhatsApp no horário certo</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm({ title: '', message: '', scheduled_at: toLocalInputValue() }); setShowModal(true); }}>
            + Novo lembrete
          </button>
        </div>

        <div className="page-content">
          {/* Dica sobre criação via WhatsApp */}
          <div className="card mb-5" style={{ background: '#dcfce7', padding: '14px 18px' }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 24 }}>📱</span>
              <div>
                <div className="font-semibold text-sm mb-1">Crie lembretes pelo WhatsApp</div>
                <div className="text-xs text-muted">
                  Envie uma mensagem do seu <strong>número de lembretes</strong> como:<br />
                  <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                    &ldquo;Agendar lembrete para hoje às 15h - Ligar para o cliente X&rdquo;
                  </code><br />
                  O sistema cria o lembrete automaticamente e confirma no WhatsApp.
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-4">
            {(['pending', 'sent', 'cancelled'] as const).map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >
                {statusIcon[f]} {statusLabel[f]}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="badge badge-red" style={{ fontSize: 10, padding: '1px 5px', marginLeft: 4 }}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }} /></div>
          ) : reminders.length === 0 ? (
            <div className="empty-state card">
              <span style={{ fontSize: 40 }}>⏰</span>
              <p className="font-semibold">Nenhum lembrete {statusLabel[filter].toLowerCase()}</p>
              {filter === 'pending' && (
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Criar lembrete</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reminders.map(r => (
                <div key={r.id} className="card" style={{ padding: '14px 18px' }}>
                  <div className="flex justify-between items-start gap-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${statusBadge[r.status]}`} style={{ fontSize: 11 }}>
                          {statusIcon[r.status]} {statusLabel[r.status] || r.status}
                        </span>
                        {r.source === 'whatsapp' && (
                          <span className="badge badge-blue" style={{ fontSize: 11 }}>📱 Via WhatsApp</span>
                        )}
                      </div>
                      <div className="font-semibold mb-1">{r.title}</div>
                      <div className="text-sm text-muted mb-2" style={{ lineHeight: 1.6 }}>{r.message}</div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted">
                          🕐 {formatDate(r.scheduled_at)}
                        </span>
                        {r.sent_at && (
                          <span className="text-xs text-muted">
                            ✅ Enviado em {formatDate(r.sent_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {r.status === 'pending' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => cancelReminder(r.id)}>Cancelar</button>
                      )}
                      {r.status !== 'pending' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteReminder(r.id)}>🗑</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Lembrete */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⏰ Novo Lembrete</div>
            <p className="text-sm text-muted mb-4">
              O lembrete será enviado via WhatsApp para o número configurado no horário agendado.
            </p>
            {error && (
              <div className="notice notice-error" style={{ marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="label">Título *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Ligar para o cliente, Enviar proposta..."
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="label">Mensagem do lembrete *</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Texto que será enviado no WhatsApp quando o lembrete disparar..."
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="form-group">
              <label className="label">Data e hora *</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
              />
              <span className="text-xs text-muted">Horário de Brasília (UTC-3)</span>
            </div>
            <div className="flex gap-3 mt-2">
              <button className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary flex-1"
                onClick={saveReminder}
                disabled={saving || !form.title || !form.message || !form.scheduled_at}
              >
                {saving ? 'Salvando...' : 'Agendar lembrete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
