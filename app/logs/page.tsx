'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, SystemLog } from '@/lib/api';
import { Info, CheckCircle2, AlertTriangle, XCircle, Mail, Bot, Users, AlarmClock, RefreshCw, Clipboard, ClipboardCheck, Trash2, ChevronRight, ChevronDown, Search } from 'lucide-react';

type LevelStyle = { color: string; bg: string; Icon: React.ElementType };

const LEVEL_STYLE: Record<string, LevelStyle> = {
  info:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  Icon: Info },
  success: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   Icon: CheckCircle2 },
  warn:    { color: '#eab308', bg: 'rgba(234,179,8,0.1)',   Icon: AlertTriangle },
  error:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   Icon: XCircle },
};

const SOURCE_META: Record<string, { label: string; Icon: React.ElementType }> = {
  webhook:  { label: 'Webhook',  Icon: Mail },
  ai:       { label: 'IA',       Icon: Bot },
  group:    { label: 'Grupo',    Icon: Users },
  reminder: { label: 'Lembrete', Icon: AlarmClock },
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function copyLog(e: React.MouseEvent, log: SystemLog) {
    e.stopPropagation();
    const text = `[${log.level.toUpperCase()}] ${formatTime(log.created_at)} | ${log.source} | ${log.message}\n${log.data ? JSON.stringify(log.data, null, 2) : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function copyAll() {
    const text = logs.map(log =>
      `[${log.level.toUpperCase()}] ${formatTime(log.created_at)} | ${log.source} | ${log.message}\n${log.data ? JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

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
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={13} /> {autoRefresh ? 'Ao vivo' : 'Pausado'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={loadLogs} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={13} /> Atualizar
            </button>
            <button className="btn btn-ghost btn-sm" onClick={copyAll} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {copiedAll ? <ClipboardCheck size={13} /> : <Clipboard size={13} />}
              {copiedAll ? 'Copiado' : 'Copiar tudo'}
            </button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }} onClick={clearLogs}>
              <Trash2 size={13} /> Limpar
            </button>
          </div>
        </div>

        <div className="page-content">
          <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            <div className="flex gap-1">
              {(['', 'info', 'success', 'warn', 'error'] as const).map(lv => {
                const meta = lv ? LEVEL_STYLE[lv] : null;
                const Icon = meta?.Icon;
                return (
                  <button
                    key={lv}
                    className={`btn btn-sm ${levelFilter === lv ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setLevelFilter(lv)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {Icon && <Icon size={12} />}
                    {lv === '' ? 'Todos' : lv}
                  </button>
                );
              })}
            </div>
            <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
            <div className="flex gap-1">
              {(['', 'webhook', 'ai', 'group', 'reminder'] as const).map(src => {
                const meta = src ? SOURCE_META[src] : null;
                const Icon = meta?.Icon;
                return (
                  <button
                    key={src}
                    className={`btn btn-sm ${sourceFilter === src ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSourceFilter(src)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {Icon && <Icon size={12} />}
                    {src === '' ? 'Todas' : (meta?.label || src)}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }} /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state card">
              <Search size={40} color="var(--text2)" />
              <p className="font-semibold">Nenhum log ainda</p>
              <p className="text-sm">Envie uma mensagem no grupo do sistema e os logs aparecerão aqui em tempo real.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace' }}>
              {logs.map(log => {
                const style = LEVEL_STYLE[log.level] || LEVEL_STYLE.info;
                const { Icon: LevelIcon } = style;
                const srcMeta = SOURCE_META[log.source];
                const SrcIcon = srcMeta?.Icon;
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
                      <LevelIcon size={13} color={style.color} />
                      <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 110 }}>{formatTime(log.created_at)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: style.color, minWidth: 80, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {SrcIcon && <SrcIcon size={11} />}
                        {srcMeta?.label || log.source}
                      </span>
                      <span style={{ fontSize: 13, flex: 1 }}>{log.message}</span>
                      <button
                        onClick={(e) => copyLog(e, log)}
                        title="Copiar log"
                        style={{
                          background: copiedId === log.id ? 'var(--green)' : 'var(--bg2)',
                          color: copiedId === log.id ? '#fff' : 'var(--text)',
                          border: '2px solid var(--border)', borderRadius: 4,
                          padding: '2px 8px', fontWeight: 700, flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                        }}
                      >
                        {copiedId === log.id ? <ClipboardCheck size={11} /> : <Clipboard size={11} />}
                      </button>
                      {hasData && (isOpen
                        ? <ChevronDown size={13} color="var(--text2)" />
                        : <ChevronRight size={13} color="var(--text2)" />
                      )}
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
