'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, AlertStats, Alert } from '@/lib/api';
import { Bell, Bug, Lightbulb, ClipboardList, AlertTriangle, CheckCircle2, RefreshCw, ChevronRight, Check } from 'lucide-react';

const SEVERITY_LABEL: Record<string, string> = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo' };
const TYPE_LABEL: Record<string, string> = { bug: 'Bug', complaint: 'Reclamação', suggestion: 'Sugestão', request: 'Solicitação' };
const TYPE_BADGE: Record<string, string> = { bug: 'badge-red', complaint: 'badge-orange', suggestion: 'badge-blue', request: 'badge-purple' };

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, a] = await Promise.all([
        api.getAlertStats(),
        api.listAlerts({ resolved: 'false', limit: '10' }),
      ]);
      setStats(s);
      setAlerts(a);
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  async function resolve(id: string) {
    await api.resolveAlert(id);
    setAlerts(a => a.filter(x => x.id !== id));
    if (stats) setStats(s => s ? { ...s, open_alerts: String(Number(s.open_alerts) - 1) } : s);
  }

  const openAlerts = Number(stats?.open_alerts || 0);

  return (
    <div className="page">
      <Sidebar alertCount={openAlerts} />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Dashboard</h1>
            <p className="text-muted text-sm">Visão geral dos seus projetos e alertas</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        <div className="page-content">
          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }} /></div>
          ) : (
            <>
              <div className="grid-4 mb-6">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--primary)' }}><Bell size={18} color="#fff" /></div>
                  <div className="stat-value" style={{ color: Number(stats?.open_alerts) > 0 ? 'var(--red)' : 'var(--primary)' }}>
                    {stats?.open_alerts || 0}
                  </div>
                  <div className="stat-label">Alertas abertos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--red)' }}><Bug size={18} color="#fff" /></div>
                  <div className="stat-value">{stats?.open_bugs || 0}</div>
                  <div className="stat-label">Bugs relatados</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--orange)' }}><Lightbulb size={18} color="#fff" /></div>
                  <div className="stat-value">{stats?.open_suggestions || 0}</div>
                  <div className="stat-label">Sugestões</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--secondary)' }}><ClipboardList size={18} color="#fff" /></div>
                  <div className="stat-value">{stats?.pending_specs || 0}</div>
                  <div className="stat-label">Specs pendentes</div>
                </div>
              </div>

              {Number(stats?.critical_alerts) > 0 && (
                <div className="notice notice-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>{stats?.critical_alerts} alerta(s) CRÍTICO(S)</strong>
                    <span style={{ marginLeft: 8, opacity: 0.8 }}>Requer atenção imediata</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Alertas recentes</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/especificacoes')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Ver especificações <ChevronRight size={14} />
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="empty-state card">
                  <CheckCircle2 size={40} color="var(--primary)" />
                  <p>Nenhum alerta aberto. Tudo em ordem!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {alerts.map(alert => (
                    <div key={alert.id} className="alert-item">
                      <div className={`severity-dot severity-${alert.severity}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge ${TYPE_BADGE[alert.alert_type]}`}>{TYPE_LABEL[alert.alert_type]}</span>
                          {alert.client_name && (
                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>• {alert.client_name}</span>
                          )}
                          <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 'auto' }}>
                            {new Date(alert.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="font-semibold truncate">{alert.summary}</div>
                        <div className="text-sm text-muted mt-1 truncate">
                          {alert.chat_name} {alert.sender_name ? `• ${alert.sender_name}` : ''}
                        </div>
                        {alert.spec_id && (
                          <div style={{ marginTop: 6 }}>
                            <span className="badge badge-purple" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <ClipboardList size={10} /> Spec gerada
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className={`badge badge-${alert.severity === 'critical' ? 'red' : alert.severity === 'high' ? 'orange' : alert.severity === 'medium' ? 'yellow' : 'green'}`}>
                          {SEVERITY_LABEL[alert.severity]}
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={() => resolve(alert.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={13} /> Resolver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="stack-mobile" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <div className="card" style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Últimas 24h</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.last_24h || 0}</div>
                  <div className="text-muted text-sm">alertas gerados</div>
                </div>
                <div className="card" style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Specs concluídas</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.done_specs || 0}</div>
                  <div className="text-muted text-sm">especificações entregues</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
