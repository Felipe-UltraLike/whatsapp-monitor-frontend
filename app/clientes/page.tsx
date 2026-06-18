'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, Client, ClientSystem } from '@/lib/api';

const COLORS = ['#6366f1', '#3B82F6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7', '#ec4899'];

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [systems, setSystems] = useState<ClientSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ClientSystem | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [systemForm, setSystemForm] = useState({ name: '', description: '', tech_stack: '', repository_url: '', production_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const c = await api.listClients();
      setClients(c);
      if (c.length > 0 && !selected) {
        selectClient(c[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function selectClient(client: Client) {
    setSelected(client);
    const s = await api.listSystems(client.id);
    setSystems(s);
  }

  async function saveClient() {
    if (!clientForm.name) return;
    setSaving(true);
    try {
      const c = await api.createClient(clientForm);
      setClients(prev => [...prev, c]);
      setShowClientModal(false);
      setClientForm({ name: '', description: '', color: '#6366f1' });
      selectClient(c);
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(id: string) {
    if (!confirm('Deletar este cliente? Todos os dados relacionados serão removidos.')) return;
    await api.deleteClient(id);
    const remaining = clients.filter(c => c.id !== id);
    setClients(remaining);
    if (selected?.id === id) {
      setSelected(remaining[0] || null);
      setSystems([]);
    }
  }

  async function saveSystem() {
    if (!systemForm.name || !systemForm.description || !selected) return;
    setSaving(true);
    try {
      if (editingSystem) {
        const updated = await api.updateSystem(selected.id, editingSystem.id, systemForm);
        setSystems(prev => prev.map(s => s.id === editingSystem.id ? updated : s));
      } else {
        const s = await api.createSystem(selected.id, systemForm as ClientSystem);
        setSystems(prev => [...prev, s]);
      }
      setShowSystemModal(false);
      setEditingSystem(null);
      setSystemForm({ name: '', description: '', tech_stack: '', repository_url: '', production_url: '' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSystem(systemId: string) {
    if (!selected || !confirm('Deletar este sistema?')) return;
    await api.deleteSystem(selected.id, systemId);
    setSystems(prev => prev.filter(s => s.id !== systemId));
  }

  function openEditSystem(system: ClientSystem) {
    setEditingSystem(system);
    setSystemForm({
      name: system.name,
      description: system.description,
      tech_stack: system.tech_stack || '',
      repository_url: system.repository_url || '',
      production_url: system.production_url || '',
    });
    setShowSystemModal(true);
  }

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Clientes & Sistemas</h1>
            <p className="text-muted text-sm">Gerencie seus clientes e os sistemas desenvolvidos para cada um</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowClientModal(true)}>+ Novo cliente</button>
        </div>

        <div style={{ display: 'flex', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
          {/* Lista de clientes */}
          <div style={{ width: 260, borderRight: '1px solid var(--border)', padding: 16, overflowY: 'auto' }}>
            <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seus clientes</div>
            {loading ? <div className="spinner" /> : clients.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <span style={{ fontSize: 28 }}>👥</span>
                <p style={{ fontSize: 12, textAlign: 'center' }}>Nenhum cliente ainda.<br />Clique em "+ Novo cliente"</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {clients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => selectClient(client)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: selected?.id === client.id ? 'var(--bg3)' : 'transparent',
                      border: `1px solid ${selected?.id === client.id ? 'var(--primary)' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: client.color, flexShrink: 0 }} />
                      <div style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
                    </div>
                    <div className="flex gap-3 mt-1" style={{ paddingLeft: 18 }}>
                      <span className="text-xs text-muted">{client.systems_count || 0} sistemas</span>
                      {Number(client.open_alerts) > 0 && (
                        <span className="badge badge-red" style={{ fontSize: 10, padding: '1px 6px' }}>{client.open_alerts} alertas</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalhe do cliente */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {!selected ? (
              <div className="empty-state">
                <span style={{ fontSize: 48 }}>👈</span>
                <p>Selecione um cliente para ver seus sistemas</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: selected.color }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
                    {Number(selected.open_alerts) > 0 && (
                      <span className="badge badge-red">{selected.open_alerts} alertas abertos</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteClient(selected.id)}>🗑 Remover</button>
                    <button className="btn btn-primary" onClick={() => { setEditingSystem(null); setSystemForm({ name: '', description: '', tech_stack: '', repository_url: '', production_url: '' }); setShowSystemModal(true); }}>
                      + Adicionar sistema
                    </button>
                  </div>
                </div>

                {selected.description && (
                  <p className="text-muted text-sm mb-6">{selected.description}</p>
                )}

                <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Sistemas cadastrados ({systems.length})
                </div>

                {systems.length === 0 ? (
                  <div className="empty-state card">
                    <span style={{ fontSize: 36 }}>🖥️</span>
                    <p>Nenhum sistema cadastrado para este cliente.</p>
                    <p className="text-sm">Adicione os sistemas para que a IA gere especificações mais precisas.</p>
                    <button className="btn btn-primary" onClick={() => { setEditingSystem(null); setShowSystemModal(true); }}>+ Adicionar sistema</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {systems.map(system => (
                      <div key={system.id} className="card">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 18 }}>🖥️</span>
                            <span className="font-semibold">{system.name}</span>
                            {!system.active && <span className="badge badge-gray">Inativo</span>}
                          </div>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditSystem(system)}>✏️ Editar</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => deleteSystem(system.id)}>🗑</button>
                          </div>
                        </div>

                        {system.tech_stack && (
                          <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                            {system.tech_stack.split(',').map(t => (
                              <span key={t} className="badge badge-blue">{t.trim()}</span>
                            ))}
                          </div>
                        )}

                        <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>{system.description}</p>

                        {(system.production_url || system.repository_url) && (
                          <div className="flex gap-3 mt-3">
                            {system.production_url && (
                              <a href={system.production_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🌐 Produção</a>
                            )}
                            {system.repository_url && (
                              <a href={system.repository_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">📦 Repositório</a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Novo Cliente */}
        {showClientModal && (
          <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Novo Cliente</div>
              <div className="form-group">
                <label className="label">Nome do cliente *</label>
                <input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Prefeitura Municipal" />
              </div>
              <div className="form-group">
                <label className="label">Descrição</label>
                <textarea value={clientForm.description} onChange={e => setClientForm(f => ({ ...f, description: e.target.value }))} placeholder="Contexto sobre o cliente..." />
              </div>
              <div className="form-group">
                <label className="label">Cor de identificação</label>
                <div className="color-picker">
                  {COLORS.map(c => (
                    <div key={c} className={`color-dot ${clientForm.color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setClientForm(f => ({ ...f, color: c }))} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-ghost flex-1" onClick={() => setShowClientModal(false)}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={saveClient} disabled={saving || !clientForm.name}>
                  {saving ? 'Salvando...' : 'Criar cliente'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sistema */}
        {showSystemModal && (
          <div className="modal-overlay" onClick={() => setShowSystemModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editingSystem ? 'Editar Sistema' : 'Novo Sistema'}</div>
              <div className="form-group">
                <label className="label">Nome do sistema *</label>
                <input value={systemForm.name} onChange={e => setSystemForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Portal do Cidadão" />
              </div>
              <div className="form-group">
                <label className="label">Descrição completa do sistema *</label>
                <textarea
                  style={{ minHeight: 120 }}
                  value={systemForm.description}
                  onChange={e => setSystemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva o que o sistema faz, suas principais funcionalidades, módulos existentes, limitações conhecidas... Quanto mais detalhado, mais precisa será a especificação gerada pela IA."
                />
                <span className="text-xs text-muted">Esta descrição é usada pela IA para gerar especificações técnicas precisas</span>
              </div>
              <div className="form-group">
                <label className="label">Tecnologias (separadas por vírgula)</label>
                <input value={systemForm.tech_stack} onChange={e => setSystemForm(f => ({ ...f, tech_stack: e.target.value }))} placeholder="Ex: React, Node.js, PostgreSQL, AWS" />
              </div>
              <div className="form-group">
                <label className="label">URL de produção</label>
                <input value={systemForm.production_url} onChange={e => setSystemForm(f => ({ ...f, production_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="label">URL do repositório</label>
                <input value={systemForm.repository_url} onChange={e => setSystemForm(f => ({ ...f, repository_url: e.target.value }))} placeholder="https://github.com/..." />
              </div>
              <div className="flex gap-3">
                <button className="btn btn-ghost flex-1" onClick={() => { setShowSystemModal(false); setEditingSystem(null); }}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={saveSystem} disabled={saving || !systemForm.name || !systemForm.description}>
                  {saving ? 'Salvando...' : editingSystem ? 'Atualizar' : 'Criar sistema'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
