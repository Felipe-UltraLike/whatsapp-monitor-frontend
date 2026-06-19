'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, Specification, Client } from '@/lib/api';

const SPEC_TYPE_LABEL: Record<string, string> = {
  bug_fix: '🐛 Correção de Bug',
  feature: '✨ Nova Funcionalidade',
  improvement: '⚡ Melhoria',
  investigation: '🔍 Investigação',
};
const PRIORITY_BADGE: Record<string, string> = {
  critical: 'badge-red',
  high: 'badge-orange',
  medium: 'badge-yellow',
  low: 'badge-green',
};
const PRIORITY_LABEL: Record<string, string> = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
const STATUS_LABEL: Record<string, string> = { pending: '🕐 Pendente', assigned: '👤 Atribuído', in_progress: '⚙️ Em andamento', done: '✅ Concluído' };
const COMPLEXITY_LABEL: Record<string, string> = { simple: 'Simples', medium: 'Médio', complex: 'Complexo' };

const DEVS = ['Dev 1', 'Dev 2', 'Dev 3'];

export default function EspecificacoesPage() {
  const router = useRouter();
  const [specs, setSpecs] = useState<Specification[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Specification | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, c] = await Promise.all([api.listSpecifications(), api.listClients()]);
      setSpecs(s);
      setClients(c);
    } finally {
      setLoading(false);
    }
  }

  async function updateSpec(id: string, data: { status?: string; assigned_dev?: string }) {
    const updated = await api.updateSpecification(id, data);
    setSpecs(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    if (selected?.id === id) setSelected(s => s ? { ...s, ...updated } : s);
  }

  function copyForDev(spec: Specification) {
    const text = `# ${spec.title}

**Tipo:** ${SPEC_TYPE_LABEL[spec.spec_type]}
**Prioridade:** ${PRIORITY_LABEL[spec.priority]}
**Complexidade estimada:** ${COMPLEXITY_LABEL[spec.estimated_complexity]}
**Cliente:** ${spec.client_name || 'N/A'}
**Sistema:** ${spec.system_name || 'N/A'}

## Descrição
${spec.description}

## Critérios de aceite
${spec.acceptance_criteria || 'A definir'}

## Notas técnicas
${spec.technical_notes || 'Nenhuma nota técnica adicional.'}

---
*Gerado pelo WhatsApp Monitor a partir de feedback do cliente*`;

    navigator.clipboard.writeText(text).then(() => alert('Copiado para a área de transferência!'));
  }

  const filtered = specs.filter(s => {
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterClient && s.client_id !== filterClient) return false;
    if (filterPriority && s.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Especificações para Devs</h1>
            <p className="text-muted text-sm">Especificações geradas automaticamente pela IA a partir do feedback dos clientes</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>↻ Atualizar</button>
        </div>

        <div className="split-view" style={{ display: 'flex', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
          {/* Lista */}
          <div className="split-list" style={{ width: 380, borderRight: '2.5px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            {/* Filtros */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="assigned">Atribuído</option>
                <option value="in_progress">Em andamento</option>
                <option value="done">Concluído</option>
              </select>
              <div className="flex gap-2">
                <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ fontSize: 13 }}>
                  <option value="">Todos os clientes</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ fontSize: 13 }}>
                  <option value="">Todas prioridades</option>
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {loading ? (
                <div className="empty-state"><div className="spinner" /></div>
              ) : filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>📋</span>
                  <p style={{ textAlign: 'center', fontSize: 13 }}>Nenhuma especificação ainda.<br />Elas aparecem quando a IA detecta alertas dos clientes.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map(spec => (
                    <div
                      key={spec.id}
                      onClick={() => setSelected(spec)}
                      className="spec-card"
                      style={{
                        cursor: 'pointer',
                        borderColor: selected?.id === spec.id ? 'var(--primary)' : 'var(--border)',
                        opacity: spec.status === 'done' ? 0.65 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`badge ${PRIORITY_BADGE[spec.priority]}`}>{PRIORITY_LABEL[spec.priority]}</span>
                        <span className="text-xs text-muted">{SPEC_TYPE_LABEL[spec.spec_type]}</span>
                      </div>
                      <div className="font-semibold text-sm" style={{ lineHeight: 1.4, marginBottom: 6 }}>{spec.title}</div>
                      <div className="flex items-center gap-2">
                        {spec.client_name && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: spec.client_color || '#6366f1' }} />
                            {spec.client_name}
                          </span>
                        )}
                        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{STATUS_LABEL[spec.status]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalhe da spec */}
          <div className="split-detail" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
            {!selected ? (
              <div className="empty-state">
                <span style={{ fontSize: 48 }}>📋</span>
                <p>Selecione uma especificação para ver os detalhes</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge ${PRIORITY_BADGE[selected.priority]}`}>{PRIORITY_LABEL[selected.priority]}</span>
                      <span className="badge badge-gray">{SPEC_TYPE_LABEL[selected.spec_type]}</span>
                      <span className="badge badge-gray">⚡ {COMPLEXITY_LABEL[selected.estimated_complexity]}</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>{selected.title}</h2>
                    <div className="text-sm text-muted">
                      {selected.client_name && <span>👥 {selected.client_name}</span>}
                      {selected.system_name && <span style={{ marginLeft: 12 }}>🖥️ {selected.system_name}</span>}
                      <span style={{ marginLeft: 12 }}>📅 {new Date(selected.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyForDev(selected)} style={{ flexShrink: 0, marginLeft: 16 }}>
                    📋 Copiar para Dev
                  </button>
                </div>

                {/* Controles */}
                <div className="card mb-6" style={{ padding: '16px 20px' }}>
                  <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                    <div>
                      <label className="label">Status</label>
                      <select
                        value={selected.status}
                        onChange={e => updateSpec(selected.id, { status: e.target.value })}
                        style={{ width: 'auto' }}
                      >
                        <option value="pending">🕐 Pendente</option>
                        <option value="assigned">👤 Atribuído</option>
                        <option value="in_progress">⚙️ Em andamento</option>
                        <option value="done">✅ Concluído</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Dev responsável</label>
                      <select
                        value={selected.assigned_dev || ''}
                        onChange={e => updateSpec(selected.id, { assigned_dev: e.target.value, status: e.target.value ? 'assigned' : 'pending' })}
                        style={{ width: 'auto' }}
                      >
                        <option value="">Não atribuído</option>
                        {DEVS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mensagem original */}
                {selected.original_message && (
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                    <div className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>💬 Mensagem original do cliente</div>
                    <p className="text-sm" style={{ fontStyle: 'italic', lineHeight: 1.7 }}>"{selected.original_message}"</p>
                  </div>
                )}

                {/* Descrição */}
                <div className="card mb-4">
                  <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>📄 Descrição</div>
                  <p style={{ lineHeight: 1.8, fontSize: 14 }}>{selected.description}</p>
                </div>

                {/* Critérios de aceite */}
                {selected.acceptance_criteria && (
                  <div className="card mb-4">
                    <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ Critérios de aceite</div>
                    <div style={{ lineHeight: 1.8, fontSize: 14 }}>
                      {selected.acceptance_criteria.split('\n').map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <span style={{ color: 'var(--green)', flexShrink: 0 }}>☐</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas técnicas */}
                {selected.technical_notes && (
                  <div className="card mb-4">
                    <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔧 Notas técnicas para o desenvolvedor</div>
                    <p style={{ lineHeight: 1.8, fontSize: 14, fontFamily: 'monospace', background: 'var(--bg)', padding: '12px 16px', borderRadius: 8, color: 'var(--text)' }}>
                      {selected.technical_notes}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
