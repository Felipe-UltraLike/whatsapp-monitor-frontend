'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, AlertStats, Client } from '@/lib/api';
import { Bell, Bug, Frown, Lightbulb, AlertCircle, Clock, ClipboardList, CheckCircle2, Eye, Users, User, RefreshCw, MessageCircle } from 'lucide-react';

interface MonitoringStats {
  total_monitored: number;
  groups_monitored: number;
  individual_monitored: number;
  clients_with_monitoring: number;
}

export default function MonitoramentoPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [s, c, ws] = await Promise.all([
        api.getAlertStats(),
        api.listClients(),
        api.getWhatsAppStatus().catch(() => ({ connected: false, status: 'error' })),
      ]);
      setStats(s);
      setClients(c);
      setWhatsappConnected(!!(ws.connected || ws.status === 'connected'));

      let totalMonitored = 0, groupsMonitored = 0, individualMonitored = 0, clientsWithMonitoring = 0;
      for (const client of c) {
        const chats = await api.listClientChats(client.id);
        if (chats.length > 0) {
          clientsWithMonitoring++;
          totalMonitored += chats.length;
          groupsMonitored += chats.filter(ch => ch.chat_type === 'group').length;
          individualMonitored += chats.filter(ch => ch.chat_type === 'individual').length;
        }
      }
      setMonitoringStats({ total_monitored: totalMonitored, groups_monitored: groupsMonitored, individual_monitored: individualMonitored, clients_with_monitoring: clientsWithMonitoring });
    } catch {
      // ignora
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Alertas abertos',  value: stats?.open_alerts    || '0', color: 'var(--red)',     Icon: Bell },
    { label: 'Bugs ativos',      value: stats?.open_bugs      || '0', color: '#f97316',        Icon: Bug },
    { label: 'Reclamações',      value: stats?.open_complaints|| '0', color: 'var(--yellow)',  Icon: Frown },
    { label: 'Sugestões',        value: stats?.open_suggestions||'0', color: 'var(--primary)', Icon: Lightbulb },
    { label: 'Críticos',         value: stats?.critical_alerts|| '0', color: 'var(--red)',     Icon: AlertCircle },
    { label: 'Últimas 24h',      value: stats?.last_24h       || '0', color: 'var(--green)',   Icon: Clock },
    { label: 'Specs pendentes',  value: stats?.pending_specs  || '0', color: '#a855f7',        Icon: ClipboardList },
    { label: 'Specs concluídas', value: stats?.done_specs     || '0', color: 'var(--green)',   Icon: CheckCircle2 },
  ];

  const coverageCards = [
    { label: 'Total monitorado',     value: monitoringStats?.total_monitored || 0,              Icon: Eye },
    { label: 'Grupos',               value: monitoringStats?.groups_monitored || 0,             Icon: Users },
    { label: 'Individuais',          value: monitoringStats?.individual_monitored || 0,         Icon: User },
    { label: 'Clientes com grupos',  value: monitoringStats?.clients_with_monitoring || 0,      Icon: CheckCircle2 },
  ];

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Monitoramento</h1>
            <p className="text-muted text-sm">Painel de estatísticas em tempo real</p>
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
              <div className="card mb-6" style={{ padding: '16px 20px' }}>
                <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: whatsappConnected ? 'var(--green)' : 'var(--red)' }} />
                    <span className="text-sm font-semibold">WhatsApp {whatsappConnected ? 'conectado' : 'desconectado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} color="var(--text2)" />
                    <span className="text-sm">{clients.length} clientes cadastrados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} color="var(--text2)" />
                    <span className="text-sm">{monitoringStats?.total_monitored || 0} conversas monitoradas</span>
                  </div>
                  {!whatsappConnected && (
                    <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => router.push('/whatsapp')}>
                      Conectar WhatsApp
                    </button>
                  )}
                </div>
              </div>

              {!whatsappConnected && (
                <div className="notice notice-warn" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} />
                  <div>
                    <strong>WhatsApp desconectado.</strong> As mensagens não estão sendo monitoradas.{' '}
                    <button style={{ color: 'var(--secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, textDecoration: 'underline' }} onClick={() => router.push('/whatsapp')}>Conectar agora</button>
                  </div>
                </div>
              )}
              {(monitoringStats?.total_monitored || 0) === 0 && (
                <div className="notice notice-info" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lightbulb size={16} />
                  <div>
                    <strong>Nenhum grupo monitorado ainda.</strong>{' '}
                    <button style={{ color: 'var(--secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, textDecoration: 'underline' }} onClick={() => router.push('/clientes')}>Ir para Clientes</button>{' '}
                    e vincule grupos do WhatsApp a cada cliente.
                  </div>
                </div>
              )}

              {clients.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cobertura por cliente</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {clients.map(client => <ClientCoverageCard key={client.id} client={client} />)}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cobertura de monitoramento</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {coverageCards.map(({ label, value, Icon }) => (
                    <div key={label} className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon size={28} color="var(--primary)" /></div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
                      <div className="text-sm text-muted">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Alertas & especificações</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {statCards.map(({ label, value, color, Icon }) => (
                    <div key={label} className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon size={24} color={color} /></div>
                      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                      <div className="text-sm text-muted">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientCoverageCard({ client }: { client: Client }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    api.listClientChats(client.id).then(chats => setCount(chats.length)).catch(() => setCount(0));
  }, [client.id]);

  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <div className="flex items-center gap-2 mb-2">
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: client.color, flexShrink: 0 }} />
        <div className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
      </div>
      <div className="flex items-center gap-2">
        {count === null ? (
          <div className="spinner" style={{ width: 14, height: 14 }} />
        ) : count > 0 ? (
          <span className="badge badge-green" style={{ fontSize: 11 }}>● {count} {count === 1 ? 'grupo' : 'grupos'}</span>
        ) : (
          <span className="badge badge-gray" style={{ fontSize: 11 }}>Sem grupos</span>
        )}
        {Number(client.open_alerts) > 0 && (
          <span className="badge badge-red" style={{ fontSize: 11 }}>{client.open_alerts} alertas</span>
        )}
      </div>
    </div>
  );
}
