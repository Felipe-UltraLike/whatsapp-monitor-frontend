'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, Chat, Client, MonitoredChat } from '@/lib/api';

export default function MonitoramentoPage() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'monitored' | 'group' | 'individual'>('all');
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [c, cl] = await Promise.all([api.listChats(), api.listClients()]);
      setChats(c);
      setClients(cl);
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  function openAssign(chat: Chat) {
    setSelectedChat(chat);
    setSelectedClientId(chat.client_id || '');
    setShowModal(true);
  }

  async function assignToClient() {
    if (!selectedChat || !selectedClientId) return;
    setAssigning(selectedChat.id);
    try {
      await api.addChatToClient(selectedClientId, {
        chat_id: selectedChat.id,
        chat_name: selectedChat.name,
        chat_type: selectedChat.type,
      });
      setChats(prev => prev.map(c =>
        c.id === selectedChat.id ? { ...c, is_monitored: true, client_id: selectedClientId } : c
      ));
      setShowModal(false);
    } finally {
      setAssigning(null);
    }
  }

  async function removeMonitoring(chat: Chat) {
    if (!chat.client_id) return;
    if (!confirm(`Parar de monitorar "${chat.name}"?`)) return;
    // Precisa do ID do registro em monitored_chats
    const clientChats = await api.listClientChats(chat.client_id);
    const record = clientChats.find((mc: MonitoredChat) => mc.chat_id === chat.id);
    if (record) {
      await api.removeChatFromClient(chat.client_id, record.id);
      setChats(prev => prev.map(c =>
        c.id === chat.id ? { ...c, is_monitored: false, client_id: undefined } : c
      ));
    }
  }

  const filtered = chats.filter(c => {
    if (filter === 'monitored' && !c.is_monitored) return false;
    if (filter === 'group' && c.type !== 'group') return false;
    if (filter === 'individual' && c.type !== 'individual') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const monitoredCount = chats.filter(c => c.is_monitored).length;

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Monitoramento</h1>
            <p className="text-muted text-sm">Selecione quais conversas e grupos monitorar para cada cliente</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>↻ Atualizar lista</button>
        </div>

        <div className="page-content">
          {/* Resumo */}
          <div className="flex gap-3 mb-6">
            <div className="card" style={{ flex: 1, padding: '14px 18px' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{monitoredCount}</div>
              <div className="text-sm text-muted">conversas monitoradas</div>
            </div>
            <div className="card" style={{ flex: 1, padding: '14px 18px' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{chats.filter(c => c.type === 'group' && c.is_monitored).length}</div>
              <div className="text-sm text-muted">grupos monitorados</div>
            </div>
            <div className="card" style={{ flex: 1, padding: '14px 18px' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{clients.length}</div>
              <div className="text-sm text-muted">clientes cadastrados</div>
            </div>
          </div>

          {clients.length === 0 && (
            <div style={{ background: '#713f12', border: '1px solid var(--yellow)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13 }}>
              ⚠️ <strong>Você ainda não tem clientes cadastrados.</strong> Vá em{' '}
              <button style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push('/clientes')}>
                Clientes
              </button>{' '}para criar antes de configurar o monitoramento.
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
            <input
              placeholder="Buscar conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
            {(['all', 'monitored', 'group', 'individual'] as const).map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >
                {{ all: 'Todos', monitored: '👁 Monitorados', group: '👥 Grupos', individual: '👤 Individuais' }[f]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state card">
              <span style={{ fontSize: 36 }}>💬</span>
              <p>{chats.length === 0 ? 'Nenhum chat encontrado. Certifique-se de que o WhatsApp está conectado.' : 'Nenhum resultado para este filtro.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(chat => {
                const client = clients.find(c => c.id === chat.client_id);
                return (
                  <div key={chat.id} className="chat-item">
                    <div className="chat-avatar">
                      {chat.type === 'group' ? '👥' : '👤'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-semibold truncate">{chat.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge ${chat.type === 'group' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 11 }}>
                          {chat.type === 'group' ? 'Grupo' : 'Individual'}
                        </span>
                        {chat.is_monitored && client && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: client.color }} />
                            {client.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {chat.is_monitored ? (
                        <div className="flex gap-2">
                          <span className="badge badge-green">● Monitorando</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => openAssign(chat)}>Trocar</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => removeMonitoring(chat)}>✕</button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openAssign(chat)}
                          disabled={assigning === chat.id || clients.length === 0}
                        >
                          {assigning === chat.id ? '...' : '+ Monitorar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Vincular a Cliente */}
        {showModal && selectedChat && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Vincular a um cliente</div>
              <p className="text-sm text-muted mb-4">
                Selecione qual cliente esta conversa pertence. A IA usará este contexto para gerar especificações.
              </p>
              <div className="chat-item mb-4" style={{ background: 'var(--bg3)' }}>
                <div className="chat-avatar">{selectedChat.type === 'group' ? '👥' : '👤'}</div>
                <div>
                  <div className="font-semibold">{selectedChat.name}</div>
                  <div className="text-sm text-muted">{selectedChat.type === 'group' ? 'Grupo' : 'Conversa individual'}</div>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Cliente *</label>
                <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={assignToClient} disabled={!selectedClientId}>
                  Confirmar monitoramento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
