'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, WhatsAppStatus, User, Chat } from '@/lib/api';
import { Smartphone, Users, User, RefreshCw, Link, AlertTriangle, CheckCircle2, X, ArrowLeftRight, Plus, Clock, BarChart2, MessageCircle } from 'lucide-react';

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0,2)} (${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4)}`;
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
}

export default function WhatsAppPage() {
  const router = useRouter();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [instanceName, setInstanceName] = useState('WA Monitor');

  const [user, setUser] = useState<User | null>(null);
  const [alertNumber, setAlertNumber] = useState('');
  const [savingNumbers, setSavingNumbers] = useState(false);
  const [savedNumbers, setSavedNumbers] = useState(false);

  const [systemGroup, setSystemGroup] = useState<{ id: string; name: string } | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupChats, setGroupChats] = useState<Chat[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [webhookError, setWebhookError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) { router.replace('/login'); return; }
    loadData();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [u, wh] = await Promise.all([api.getMe(), api.getWebhookUrl().catch(() => null), checkStatus()]);
      setUser(u);
      setAlertNumber(u.whatsapp_number || '');
      if (u.system_group_id) setSystemGroup({ id: u.system_group_id, name: u.system_group_name || u.system_group_id });
      if (wh) { setWebhookUrl(wh.webhook_url); setWebhookConfigured(wh.backend_url_configured); }
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    try {
      const s = await api.getWhatsAppStatus();
      setStatus(s);
    } catch { /* ignora */ } finally {
      setLoading(false);
    }
  }

  async function saveNumbers() {
    setSavingNumbers(true);
    setSavedNumbers(false);
    try {
      const digits = (n: string) => n.replace(/\D/g, '') || undefined;
      const updated = await api.updateMe({ whatsapp_number: digits(alertNumber) });
      setUser(updated);
      setSavedNumbers(true);
      setTimeout(() => setSavedNumbers(false), 3000);
    } finally {
      setSavingNumbers(false);
    }
  }

  async function openGroupModal() {
    setShowGroupModal(true);
    setLoadingGroups(true);
    setGroupSearch('');
    try {
      const chats = await api.listChats();
      setGroupChats(chats);
    } finally {
      setLoadingGroups(false);
    }
  }

  async function selectGroup(chat: Chat) {
    setSavingGroup(true);
    try {
      const updated = await api.updateMe({ system_group_id: chat.id, system_group_name: chat.name });
      setUser(updated);
      setSystemGroup({ id: chat.id, name: chat.name });
      setShowGroupModal(false);
    } finally {
      setSavingGroup(false);
    }
  }

  async function removeGroup() {
    if (!confirm('Remover o grupo de comunicação do sistema?')) return;
    const updated = await api.updateMe({ system_group_id: '', system_group_name: '' });
    setUser(updated);
    setSystemGroup(null);
  }

  async function connect() {
    setShowModal(false);
    setConnecting(true);
    setError('');
    try {
      const res = await api.connectWhatsApp(instanceName);
      const raw = res as Record<string, unknown>;
      const qrObj = raw.qr as Record<string, unknown>;
      const instance = qrObj?.instance as Record<string, string>;
      const qrcode = instance?.qrcode || (qrObj?.qrcode as string) || null;
      setQrData(qrcode);
      await checkStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!confirm('Desconectar o WhatsApp? Você não receberá mais alertas.')) return;
    await api.disconnectWhatsApp();
    setQrData(null);
    await checkStatus();
  }

  async function configureWebhook() {
    setConfiguringWebhook(true);
    setWebhookStatus('idle');
    setWebhookError('');
    try {
      const result = await api.configureWebhook();
      setWebhookUrl(result.webhook_url);
      setWebhookStatus('ok');
    } catch (err: unknown) {
      setWebhookStatus('error');
      setWebhookError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setConfiguringWebhook(false);
    }
  }

  const isConnected = status?.status === 'connected' || status?.connected;
  const isPending = status?.status === 'qr_pending';
  const filteredGroups = groupChats.filter(c => c.name.toLowerCase().includes(groupSearch.toLowerCase()));

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Conexão WhatsApp</h1>
            <p className="text-muted text-sm">Conecte seu WhatsApp e configure o grupo de comunicação</p>
          </div>
        </div>

        <div className="page-content" style={{ maxWidth: 680 }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }} /></div>
          ) : (
            <>
              {/* Status */}
              <div className="card mb-4">
                <div className="flex items-center gap-3">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: isConnected ? 'var(--green)' : isPending ? 'var(--yellow)' : 'var(--red)', flexShrink: 0 }} />
                  <div>
                    <div className="font-semibold">
                      {isConnected ? 'WhatsApp conectado' : isPending ? 'Aguardando leitura do QR Code' : 'WhatsApp desconectado'}
                    </div>
                    <div className="text-sm text-muted">
                      {isConnected ? 'Seu WhatsApp está ativo' : isPending ? 'Escaneie o QR Code abaixo com o celular' : 'Clique em "Conectar" para vincular'}
                    </div>
                  </div>
                  {isConnected && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>● Ativo</span>}
                </div>
              </div>

              {error && <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div>}

              {(isPending || qrData) && !isConnected && (
                <div className="card mb-4">
                  <h3 className="font-semibold mb-4">Escaneie o QR Code</h3>
                  <div className="qr-container">
                    {qrData ? (
                      <div className="qr-box">
                        {qrData.startsWith('data:image') ? (
                          <img src={qrData} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 8, padding: 20 }}>{qrData}</div>
                        )}
                      </div>
                    ) : (
                      <div className="qr-box"><div className="spinner" /></div>
                    )}
                    <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, maxWidth: 300 }}>
                      <strong>Como escanear:</strong><br />
                      WhatsApp → Menu → Aparelhos conectados → Conectar aparelho
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mb-6">
                {!isConnected && (
                  <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={connecting} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {connecting ? <><span className="spinner" /> Conectando...</> : <><Smartphone size={15} /> Conectar WhatsApp</>}
                  </button>
                )}
                {isConnected && <button className="btn btn-danger" onClick={disconnect}>Desconectar</button>}
                <button className="btn btn-ghost" onClick={checkStatus} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={14} /> Verificar status
                </button>
              </div>

              <div className="divider" />

              {/* Grupo de comunicação */}
              <div className="card mb-4">
                <h3 className="font-semibold mb-1">Grupo de comunicação do sistema</h3>
                <p className="text-sm text-muted mb-4">
                  Crie um grupo no WhatsApp (ex: <strong>&ldquo;WA Monitor&rdquo;</strong>) e selecione aqui. A IA responderá nesse grupo — crie lembretes, consulte alertas e peça informações diretamente pelo WhatsApp.
                </p>

                {systemGroup ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                    <Users size={22} color="var(--primary)" />
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold">{systemGroup.name}</div>
                      <div className="text-xs text-muted">Grupo de comunicação ativo — a IA responde aqui</div>
                    </div>
                    <span className="badge badge-green">● Ativo</span>
                    <button className="btn btn-ghost btn-sm" onClick={openGroupModal}>Trocar</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center' }} onClick={removeGroup}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="notice notice-info" style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div className="text-sm mb-1">Nenhum grupo configurado. Crie um grupo no WhatsApp e selecione abaixo.</div>
                      <div className="text-xs" style={{ opacity: 0.8 }}>Dica: crie um grupo só com você mesmo e nomeie como &ldquo;WA Monitor&rdquo; ou similar.</div>
                    </div>
                  </div>
                )}

                <button className="btn btn-primary btn-sm" onClick={openGroupModal} disabled={!isConnected} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {systemGroup ? <><ArrowLeftRight size={13} /> Trocar grupo</> : <><Plus size={13} /> Selecionar grupo</>}
                </button>
                {!isConnected && <span className="text-xs text-muted ml-3">Conecte o WhatsApp primeiro</span>}

                {systemGroup && (
                  <div className="mt-4" style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
                    <div className="text-xs font-semibold mb-2">O que você pode fazer no grupo:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {([
                        [Clock,        'Criar lembretes',     '"Lembrete hoje às 15h - Ligar para o cliente X"'],
                        [BarChart2,    'Consultar alertas',   '"Quantos alertas abertos tenho?"'],
                        [MessageCircle,'Conversar com a IA',  'Tire dúvidas e peça informações do sistema'],
                      ] as const).map(([Icon, title, desc]) => (
                        <div key={title} className="flex gap-2" style={{ alignItems: 'flex-start' }}>
                          <Icon size={14} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <span className="text-sm font-semibold">{title}</span>
                            <span className="text-xs text-muted ml-2">ex: {desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="divider" />

              {/* Número para alertas */}
              <div className="card mb-4">
                <h3 className="font-semibold mb-1">Número para alertas</h3>
                <p className="text-sm text-muted mb-4">Número que receberá alertas caso o grupo de comunicação não esteja configurado.</p>
                <div className="form-group">
                  <label className="label">Número WhatsApp</label>
                  <input type="tel" placeholder="+55 (11) 99999-9999" value={maskPhone(alertNumber)} onChange={e => setAlertNumber(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button className="btn btn-primary btn-sm" onClick={saveNumbers} disabled={savingNumbers}>
                    {savingNumbers ? 'Salvando...' : 'Salvar número'}
                  </button>
                  {savedNumbers && (
                    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> Salvo
                    </span>
                  )}
                </div>
              </div>

              <div className="divider" />

              {/* Webhook */}
              <div className="card mb-4">
                <h3 className="font-semibold mb-1">Webhook de mensagens</h3>
                <p className="text-sm text-muted mb-4">Necessário para receber mensagens em tempo real. Clique sempre que reconectar o WhatsApp.</p>

                {!webhookConfigured && (
                  <div className="notice notice-warn" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} />
                    Configure <code>BACKEND_URL</code> no Render com a URL do backend antes de registrar.
                  </div>
                )}
                {webhookStatus === 'ok' && (
                  <div className="notice notice-success" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} /> Webhook registrado com sucesso!
                  </div>
                )}
                {webhookStatus === 'error' && (
                  <div className="notice notice-error" style={{ marginBottom: 12 }}>
                    {webhookError || 'Erro ao registrar webhook.'}
                  </div>
                )}
                {webhookUrl && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="label">URL do webhook</label>
                    <div className="flex gap-2">
                      <input readOnly value={webhookUrl} style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: 'var(--text2)' }} onClick={e => (e.target as HTMLInputElement).select()} />
                      <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copiar</button>
                    </div>
                  </div>
                )}
                <button className="btn btn-primary" onClick={configureWebhook} disabled={configuringWebhook} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {configuringWebhook ? <><span className="spinner" /> Registrando...</> : <><Link size={15} /> Registrar Webhook na uZapi</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal instância */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={18} /> Configurar conexão WhatsApp
            </div>
            <p className="text-sm text-muted mb-4">Escolha um nome para identificar esta conexão na uZapi.</p>
            <div className="form-group">
              <label className="label">Nome da instância *</label>
              <input type="text" value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder="Ex: WA Monitor" autoFocus />
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" onClick={connect} disabled={!instanceName.trim()}>Criar e conectar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal seleção de grupo */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} /> Selecionar grupo de comunicação
            </div>
            <p className="text-sm text-muted mb-4">
              Selecione o grupo onde a IA vai responder. Crie um grupo dedicado (ex: &ldquo;WA Monitor&rdquo;) antes.
            </p>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <input placeholder="Buscar grupo..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)} autoFocus />
            </div>
            {loadingGroups ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <div className="spinner" style={{ width: 32, height: 32 }} />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <MessageCircle size={32} color="var(--text2)" />
                <p className="text-sm">{groupChats.length === 0 ? 'Nenhuma conversa encontrada. Certifique-se que o WhatsApp está conectado.' : 'Nenhuma conversa com esse nome.'}</p>
              </div>
            ) : (
              <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(['group', 'individual'] as const).map(type => {
                  const chats = filteredGroups.filter(c => c.type === type);
                  if (chats.length === 0) return null;
                  return (
                    <div key={type}>
                      <div className="text-xs text-muted font-semibold mb-2 mt-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {type === 'group' ? <Users size={12} /> : <User size={12} />}
                        {type === 'group' ? 'Grupos' : 'Conversas individuais'}
                      </div>
                      {chats.map(chat => {
                        const isSelected = systemGroup?.id === chat.id;
                        return (
                          <div
                            key={chat.id}
                            onClick={() => !savingGroup && selectGroup(chat)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: isSelected ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: `1px solid ${isSelected ? 'rgba(34,197,94,0.3)' : 'transparent'}`, marginBottom: 4, opacity: savingGroup ? 0.6 : 1, transition: 'all 0.15s' }}
                          >
                            {type === 'group' ? <Users size={18} color="var(--text2)" /> : <User size={18} color="var(--text2)" />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</div>
                              <div className="text-xs text-muted">{type === 'group' ? 'Grupo' : 'Conversa individual'}</div>
                            </div>
                            {isSelected && <span className="badge badge-green" style={{ fontSize: 11 }}>● Atual</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button className="btn btn-ghost flex-1" onClick={() => setShowGroupModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
