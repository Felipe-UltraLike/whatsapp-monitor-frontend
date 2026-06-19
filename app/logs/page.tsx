'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, SystemLog } from '@/lib/api';

const LEVEL_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  info: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: 'ℹ️' },
  success: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '✅' },
  warn: { color: '#eab308', bg: 'rgba(234,179,8,0.1)', icon: '⚠️' },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '❌' },
};

const SOURCE_LABEL: Record<string, string> = {
  webhook: '📩 Webhook',
  ai: '🤖 IA',
  group: '👥 Grupo',
  reminder: '⏰ Lembrete',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadLogs, 4000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, levelFilter, sourceFilter]);

  async function loadLogs() {
    try {
      const params: Record<string, string> = {};
      if (levelFilter) params.level = levelFilter;
      if (sourceFilter) params.source = sourceFilter;
      const data = await api.listLogs(params);
      setLogs(data);
    } catch {
      // ignora
    } finally {
      setLoading(false);
    }
  }

  async function clearLogs() {
    if (!confirm('Limpar todos os logs?')) return;
    await api.clearLogs();
    setLogs([]);
  }

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Logs do Sistema</h1>
            <p className="text-muted text-sm">Acompanhe em tempo real o que acontece com mensagens, IA e lembretes</p>
          </div>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setAutoRefresh(a => !a)}
            >
              {autoRefresh ? '🟢 Auto-atualizar' : '⚪ Pausado'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={loadLogs}>↻ Atualizar</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={clearLogs}>🗑 Limpar</button>
          </div>
        </div>

        <div className="page-content">
          {/* Filtros */}
          <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            <div className="flex gap-1">
              {['', 'info', 'success', 'warn', 'error'].map(lv => (
                <button
                  key={lv}
                  className={`btn btn-sm ${levelFilter === lv ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLevelFilter(lv)}
                >
                  {lv === '' ? 'Todos' : `${LEVEL_STYLE[lv].icon} ${lv}`}
                </button>
              ))}
            </div>
            <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            <div className="flex gap-1">
              {['', 'webhook', 'ai', 'group', 'reminder'].map(src => (
                <button
                  key={src}
                  className={`btn btn-sm ${sourceFilter === src ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSourceFilter(src)}
                >
                  {src === '' ? 'Todas as fontes' : SOURCE_LABEL[src] || src}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }} /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state card">
              <span style={{ fontSize: 40 }}>🔍</span>
              <p className="font-semibold">Nenhum log ainda</p>
              <p className="text-sm">Envie uma mensagem no grupo do sistema e os logs aparecerão aqui em tempo real.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace' }}>
              {logs.map(log => {
                const style = LEVEL_STYLE[log.level] || LEVEL_STYLE.info;
                const hasData = log.data && Object.keys(log.data).length > 0;
                const isOpen = expanded === log.id;
                return (
                  <div
                    key={log.id}
                    style={{
                      background: style.bg,
                      borderLeft: `3px solid ${style.color}`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      cursor: hasData ? 'pointer' : 'default',
                    }}
                    onClick={() => hasData && setExpanded(isOpen ? null : log.id)}
                  >
                    <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12 }}>{style.icon}</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 110 }}>{formatTime(log.created_at)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: style.color, minWidth: 70 }}>
                        {SOURCE_LABEL[log.source] || log.source}
                      </span>
                      <span style={{ fontSize: 13, flex: 1 }}>{log.message}</span>
                      {hasData && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{isOpen ? '▼' : '▶'}</span>}
                    </div>
                    {isOpen && hasData && (
                      <pre style={{
                        marginTop: 8, padding: 10, background: 'var(--bg3)', border: '2px solid var(--border)', borderRadius: 4,
                        fontSize: 11, overflow: 'auto', color: 'var(--text2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      }}>
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
