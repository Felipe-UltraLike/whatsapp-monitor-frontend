'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, Client, ClientSystem, Chat, MonitoredChat } from '@/lib/api';
import { Users, User, Monitor, Plus, Pencil, Trash2, Globe, Package, MessageCircle, Check, X } from 'lucide-react';

const COLORS = ['#16a34a', '#14532d', '#f97316', '#3B82F6', '#eab308', '#ef4444', '#a855f7', '#ec4899'];

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [systems, setSystems] = useState<ClientSystem[]>([]);
  const [monitoredChats, setMonitoredChats] = useState<MonitoredChat[]>([]);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showChatsModal, setShowChatsModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ClientSystem | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', description: '', color: '#16a34a' });
  const [systemForm, setSystemForm] = useState({ name: '', description: '', tech_stack: '', repository_url: '', production_url: '' });
  const [saving, setSaving] = useState(false);
  const [togglingChat, setTogglingChat] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const c = await api.listClients();
      setClients(c);
      if (c.length > 0 && !selected) selectClient(c[0]);
    } finally {
      setLoading(false);
    }
  }

  async function selectClient(client: Client) {
    setSelected(client);
    const [s, mc] = await Promise.all([api.listSystems(client.id), api.listClientChats(client.id)]);
    setSystems(s);
    setMonitoredChats(mc);
  }

  async function saveClient() {
    if (!clientForm.name) return;
    setSaving(true);
    try {
      const c = await api.createClient(clientForm);
      setClients(prev => [...prev, c]);
      setShowClientModal(false);
      setClientForm({ name: '', description: '', color: '#16a34a' });
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
    if (selected?.id === id) { setSelected(remaining[0] || null); setSystems([]); setMonitoredChats([]); }
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
    setSystemForm({ name: system.name, description: system.description, tech_stack: system.tech_stack || '', repository_url: system.repository_url || '', production_url: system.production_url || '' });
    setShowSystemModal(true);
  }

  async function openChatsModal() {
    setShowChatsModal(true);
    setLoadingChats(true);
    setChatSearch('');
    try {
      const chats = await api.listChats();
      setAllChats(chats);
    } finally {
      setLoadingChats(false);
    }
  }

  async function toggleChat(chat: Chat) {
    if (!selected) return;
    setTogglingChat(chat.id);
    try {
      const existing = monitoredChats.find(mc => mc.chat_id === chat.id);
      if (existing) {
        await api.removeChatFromClient(selected.id, existing.id);
        setMonitoredChats(prev => prev.filter(mc => mc.id !== existing.id));
      } else {
        const mc = await api.addChatToClient(selected.id, { chat_id: chat.id, chat_name: chat.name, chat_type: chat.type });
        setMonitoredChats(prev => [...prev, mc]);
      }
    } finally {
      setTogglingChat(null);
    }
  }

  const filteredChats = allChats.filter(c => c.name.toLowerCase().includes(chatSearch.toLowerCase()));
  const monitoredIds = new Set(monitoredChats.map(mc => mc.chat_id));

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Clientes & Sistemas</h1>
            <p className="text-muted text-sm">Gerencie clientes, sistemas e grupos monitorados por cliente</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowClientModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Novo cliente
          </button>
        </div>

        <div className="split-view" style={{ display: 'flex', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
          {/* Lista lateral */}
          <div className="split-list" style={{ width: 260, borderRight: '2.5px solid var(--border)', padding: 16, overflowY: 'auto' }}>
            <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seus clientes</div>
            {loading ? <div className="spinner" /> : clients.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Users size={28} color="var(--text2)" />
                <p style={{ fontSize: 12, textAlign: 'center' }}>Nenhum cliente ainda.<br />Clique em "+ Novo cliente"</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {clients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => selectClient(client)}
                    style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: selected?.id === client.id ? 'var(--bg3)' : 'transparent', border: `1px solid ${selected?.id === client.id ? 'var(--primary)' : 'transparent'}`, transition: 'all 0.15s' }}
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

          {/* Detalhe */}
          <div className="split-detail" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {!selected ? (
              <div className="empty-state">
                <Users size={48} color="var(--text2)" />
                <p>Selecione um cliente para ver seus dados</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: selected.color }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
                    {Number(selected.open_alerts) > 0 && (
                      <span className="badge badge-red">{selected.open_alerts} alertas abertos</span>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteClient(selected.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red)' }}>
                    <Trash2 size={13} /> Remover cliente
                  </button>
                </div>

                {selected.description && <p className="text-muted text-sm mb-5">{selected.description}</p>}

                {/* Grupos monitorados */}
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Grupos & conversas monitorados ({monitoredChats.length})
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={openChatsModal} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={13} /> Gerenciar grupos
                  </button>
                </div>

                {monitoredChats.length === 0 ? (
                  <div className="card mb-5" style={{ textAlign: 'center', padding: '20px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><MessageCircle size={28} color="var(--text2)" /></div>
                    <div className="font-semibold text-sm mb-1">Nenhum grupo monitorado</div>
                    <div className="text-xs text-muted mb-3">Vincule grupos do WhatsApp para que a IA monitore as mensagens deste cliente</div>
                    <button className="btn btn-primary btn-sm" onClick={openChatsModal}>Selecionar grupos</button>
                  </div>
                ) : (
                  <div className="card mb-5" style={{ padding: 0, overflow: 'hidden' }}>
                    {monitoredChats.map((mc, i) => (
                      <div key={mc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < monitoredChats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        {mc.chat_type === 'group' ? <Users size={18} color="var(--text2)" /> : <User size={18} color="var(--text2)" />}
                        <div style={{ flex: 1 }}>
                          <div className="font-semibold text-sm">{mc.chat_name}</div>
                          <div className="text-xs text-muted">{mc.chat_type === 'group' ? 'Grupo' : 'Conversa individual'}</div>
                        </div>
                        <span className="badge badge-green" style={{ fontSize: 10 }}>● Monitorando</span>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: 12 }} onClick={async () => {
                          await api.removeChatFromClient(selected.id, mc.id);
                          setMonitoredChats(prev => prev.filter(c => c.id !== mc.id));
                        }}>
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sistemas */}
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sistemas cadastrados ({systems.length})
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditingSystem(null); setSystemForm({ name: '', description: '', tech_stack: '', repository_url: '', production_url: '' }); setShowSystemModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={13} /> Adicionar sistema
                  </button>
                </div>

                {systems.length === 0 ? (
                  <div className="empty-state card">
                    <Monitor size={36} color="var(--text2)" />
                    <p>Nenhum sistema cadastrado para este cliente.</p>
                    <p className="text-sm">Adicione os sistemas para que a IA gere especificações mais precisas.</p>
                    <button className="btn btn-primary" onClick={() => { setEditingSystem(null); setShowSystemModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={15} /> Adicionar sistema
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {systems.map(system => (
                      <div key={system.id} className="card">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <Monitor size={18} color="var(--text2)" />
                            <span className="font-semibold">{system.name}</span>
                            {!system.active && <span className="badge badge-gray">Inativo</span>}
                          </div>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditSystem(system)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Pencil size={13} /> Editar
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => deleteSystem(system.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--red)' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {system.tech_stack && (
                          <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                            {system.tech_stack.split(',').map(t => <span key={t} className="badge badge-blue">{t.trim()}</span>)}
                          </div>
                        )}
                        <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>{system.description}</p>
                        {(system.production_url || system.repository_url) && (
                          <div className="flex gap-3 mt-3">
                            {system.production_url && (
                              <a href={system.production_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Globe size={13} /> Produção
                              </a>
                            )}
                            {system.repository_url && (
                              <a href={system.repository_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Package size={13} /> Repositório
                              </a>
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
                <input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Prefeitura Municipal" autoFocus />
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
                <input value={systemForm.name} onChange={e => setSystemForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Portal do Cidadão" autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Descrição completa *</label>
                <textarea style={{ minHeight: 120 }} value={systemForm.description} onChange={e => setSystemForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o que o sistema faz, funcionalidades, módulos..." />
                <span className="text-xs text-muted">Usada pela IA para gerar especificações técnicas precisas</span>
              </div>
              <div className="form-group">
                <label className="label">Tecnologias (separadas por vírgula)</label>
                <input value={systemForm.tech_stack} onChange={e => setSystemForm(f => ({ ...f, tech_stack: e.target.value }))} placeholder="Ex: React, Node.js, PostgreSQL" />
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

        {/* Modal Selecionar Grupos */}
        {showChatsModal && (
          <div className="modal-overlay" onClick={() => setShowChatsModal(false)}>
            <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={18} /> Grupos — {selected?.name}
              </div>
              <p className="text-sm text-muted mb-4">Marque os grupos e conversas que a IA deve monitorar para este cliente.</p>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <input placeholder="Buscar por nome..." value={chatSearch} onChange={e => setChatSearch(e.target.value)} autoFocus />
              </div>
              {loadingChats ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <MessageCircle size={28} color="var(--text2)" />
                  <p className="text-sm">{allChats.length === 0 ? 'Nenhuma conversa encontrada. Certifique-se que o WhatsApp está conectado.' : 'Nenhuma conversa encontrada com esse nome.'}</p>
                </div>
              ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(['group', 'individual'] as const).map(type => {
                    const chats = filteredChats.filter(c => c.type === type);
                    if (chats.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="text-xs text-muted font-semibold mb-2 mt-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {type === 'group' ? <Users size={12} /> : <User size={12} />}
                          {type === 'group' ? 'Grupos' : 'Individuais'}
                        </div>
                        {chats.map(chat => {
                          const isMonitored = monitoredIds.has(chat.id);
                          const isToggling = togglingChat === chat.id;
                          return (
                            <div
                              key={chat.id}
                              onClick={() => !isToggling && toggleChat(chat)}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: isMonitored ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: `1px solid ${isMonitored ? 'rgba(34,197,94,0.3)' : 'transparent'}`, marginBottom: 4, transition: 'all 0.15s', opacity: isToggling ? 0.6 : 1 }}
                            >
                              {isToggling ? (
                                <div className="spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${isMonitored ? 'var(--green)' : 'var(--border)'}`, background: isMonitored ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {isMonitored && <Check size={11} color="#fff" strokeWidth={3} />}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</div>
                              </div>
                              {isMonitored && <span className="badge badge-green" style={{ fontSize: 10 }}>Ativo</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button className="btn btn-ghost flex-1" onClick={() => setShowChatsModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
