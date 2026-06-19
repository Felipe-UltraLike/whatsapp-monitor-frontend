'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api, WhatsAppStatus, User } from '@/lib/api';

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

  // Campos de configuração de números
  const [user, setUser] = useState<User | null>(null);
  const [alertNumber, setAlertNumber] = useState('');
  const [remindersNumber, setRemindersNumber] = useState('');
  const [savingNumbers, setSavingNumbers] = useState(false);
  const [savedNumbers, setSavedNumbers] = useState(false);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'ok' | 'error'>('idle');

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
      setRemindersNumber(u.reminders_number || '');
      if (wh) {
        setWebhookUrl(wh.webhook_url);
        setWebhookConfigured(wh.backend_url_configured);
      }
    } finally {
      setLoading(false);
    }
  }

  async function configureWebhook() {
    setConfiguringWebhook(true);
    setWebhookStatus('idle');
    try {
      const result = await api.configureWebhook();
      setWebhookUrl(result.webhook_url);
      setWebhookStatus('ok');
    } catch {
      setWebhookStatus('error');
    } finally {
      setConfiguringWebhook(false);
    }
  }

  async function checkStatus() {
    try {
      const s = await api.getWhatsAppStatus();
      setStatus(s);
    } catch {
      // ignora
    } finally {
      setLoading(false);
    }
  }

  async function saveNumbers() {
    setSavingNumbers(true);
    setSavedNumbers(false);
    try {
      const digits = (n: string) => n.replace(/\D/g, '');
      const updated = await api.updateMe({
        whatsapp_number: digits(alertNumber) || undefined,
        reminders_number: digits(remindersNumber) || undefined,
      });
      setUser(updated);
      setSavedNumbers(true);
      setTimeout(() => setSavedNumbers(false), 3000);
    } finally {
      setSavingNumbers(false);
    }
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

  const isConnected = status?.status === 'connected' || status?.connected;
  const isPending = status?.status === 'qr_pending';

  return (
    <div className="page">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Conexão WhatsApp</h1>
            <p className="text-muted text-sm">Conecte seu WhatsApp e configure os números de notificação</p>
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
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: isConnected ? 'var(--green)' : isPending ? 'var(--yellow)' : 'var(--red)',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div className="font-semibold">
                      {isConnected ? 'WhatsApp conectado' : isPending ? 'Aguardando leitura do QR Code' : 'WhatsApp desconectado'}
                    </div>
                    <div className="text-sm text-muted">
                      {isConnected
                        ? 'Seu WhatsApp está ativo e monitorando as conversas selecionadas'
                        : isPending
                        ? 'Abra o WhatsApp no celular e escaneie o código QR abaixo'
                        : 'Clique em "Conectar" para vincular seu WhatsApp'}
                    </div>
                  </div>
                  {isConnected && (
                    <span className="badge badge-green" style={{ marginLeft: 'auto' }}>● Ativo</span>
                  )}
                </div>
              </div>

              {error && (
                <div style={{ background: '#7f1d1d', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', marginBottom: 16, fontSize: 13 }}>
                  {error}
                </div>
              )}

              {/* QR Code */}
              {(isPending || qrData) && !isConnected && (
                <div className="card mb-4">
                  <h3 className="font-semibold mb-4">Escaneie o QR Code</h3>
                  <div className="qr-container">
                    {qrData ? (
                      <div className="qr-box">
                        {qrData.startsWith('data:image') ? (
                          <img src={qrData} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ textAlign: 'center', padding: 20 }}>
                            <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 8 }}>{qrData}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="qr-box"><div className="spinner" /></div>
                    )}
                    <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, maxWidth: 300 }}>
                      <strong>Como escanear:</strong><br />
                      Abra o WhatsApp → Menu (3 pontos) → Aparelhos conectados → Conectar aparelho
                    </div>
                  </div>
                </div>
              )}

              {/* Ações de conexão */}
              <div className="flex gap-3 mb-6">
                {!isConnected && (
                  <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={connecting}>
                    {connecting ? <><span className="spinner" /> Conectando...</> : '📱 Conectar WhatsApp'}
                  </button>
                )}
                {isConnected && (
                  <button className="btn btn-danger" onClick={disconnect}>Desconectar</button>
                )}
                <button className="btn btn-ghost" onClick={checkStatus}>↻ Verificar status</button>
              </div>

              <div className="divider" />

              {/* Configuração de números */}
              <div className="card mb-4">
                <h3 className="font-semibold mb-1">Números de notificação</h3>
                <p className="text-sm text-muted mb-4">Configure os números que receberão alertas e lembretes via WhatsApp</p>

                <div className="form-group">
                  <label className="label">Número para alertas de clientes</label>
                  <input
                    type="tel"
                    placeholder="+55 (11) 99999-9999"
                    value={maskPhone(alertNumber)}
                    onChange={e => setAlertNumber(e.target.value.replace(/\D/g, ''))}
                  />
                  <span className="text-xs text-muted">Receberá alertas quando a IA detectar bugs, reclamações ou sugestões dos seus clientes</span>
                </div>

                <div className="form-group">
                  <label className="label">Número para lembretes</label>
                  <input
                    type="tel"
                    placeholder="+55 (11) 99999-9999"
                    value={maskPhone(remindersNumber)}
                    onChange={e => setRemindersNumber(e.target.value.replace(/\D/g, ''))}
                  />
                  <span className="text-xs text-muted">
                    Receberá os lembretes agendados. Mensagens enviadas <strong>deste número</strong> como
                    &ldquo;Agendar lembrete para hoje às 15h - Ligar para o cliente&rdquo; criam lembretes automaticamente
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <button className="btn btn-primary" onClick={saveNumbers} disabled={savingNumbers}>
                    {savingNumbers ? 'Salvando...' : 'Salvar números'}
                  </button>
                  {savedNumbers && (
                    <span className="badge badge-green">✓ Salvo com sucesso</span>
                  )}
                </div>
              </div>

              <div className="divider" />

              {/* Configuração de Webhook */}
              <div className="card mb-4">
                <h3 className="font-semibold mb-1">Webhook de mensagens</h3>
                <p className="text-sm text-muted mb-4">
                  O webhook permite que o sistema receba as mensagens do WhatsApp em tempo real para monitorar grupos e processar lembretes.
                </p>

                {!webhookConfigured && (
                  <div style={{ background: '#713f12', border: '1px solid var(--yellow)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                    ⚠️ <strong>BACKEND_URL não configurado no Render.</strong> Configure a variável de ambiente <code>BACKEND_URL</code> com a URL do seu backend (ex: <code>https://whatsapp-monitor-backend.onrender.com</code>) e clique em Registrar Webhook.
                  </div>
                )}

                {webhookStatus === 'ok' && (
                  <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--green)' }}>
                    ✅ Webhook registrado com sucesso! O sistema agora receberá as mensagens.
                  </div>
                )}
                {webhookStatus === 'error' && (
                  <div style={{ background: '#7f1d1d', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
                    ❌ Erro ao registrar webhook. Verifique se o WhatsApp está conectado e o BACKEND_URL está correto no Render.
                  </div>
                )}

                {webhookUrl && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="label">URL do webhook</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        readOnly
                        value={webhookUrl}
                        style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: 'var(--text2)' }}
                        onClick={e => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigator.clipboard.writeText(webhookUrl)}
                        style={{ flexShrink: 0 }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={configureWebhook}
                  disabled={configuringWebhook || !status}
                >
                  {configuringWebhook ? <><span className="spinner" /> Registrando...</> : '🔗 Registrar Webhook na uZapi'}
                </button>
                <p className="text-xs text-muted mt-2">
                  Clique sempre que reconectar o WhatsApp ou se as mensagens pararem de chegar.
                </p>
              </div>

              <div className="divider" />

              {/* Instruções */}
              <div className="card">
                <h3 className="font-semibold mb-3">Como funciona</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    ['1', 'Conecte seu WhatsApp escaneando o QR Code', 'Funciona como WhatsApp Web — sem instalar nada'],
                    ['2', 'Configure os números acima', 'Você pode usar o mesmo número para alertas e lembretes'],
                    ['3', 'Vá em Clientes e vincule grupos', 'Selecione os grupos de cada cliente para monitorar'],
                    ['4', 'A IA monitora automaticamente', 'Detecta bugs e reclamações, gera specs para devs e envia alertas no WhatsApp'],
                    ['5', 'Crie lembretes pelo WhatsApp', 'Envie uma mensagem como "Lembrete amanhã às 9h - Reunião" do número configurado'],
                  ].map(([num, title, desc]) => (
                    <div key={num} className="flex gap-3">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{num}</div>
                      <div>
                        <div className="font-semibold" style={{ fontSize: 13 }}>{title}</div>
                        <div className="text-xs text-muted">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal nome da instância */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📱 Configurar conexão WhatsApp</div>
            <p className="text-sm text-muted mb-4">
              Escolha um nome para identificar esta conexão na uZapi. A instância será criada automaticamente.
            </p>
            <div className="form-group">
              <label className="label">Nome da instância *</label>
              <input
                type="text"
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                placeholder="Ex: WA Monitor, Felipe, Monitor-Projetos"
                autoFocus
              />
              <span className="text-xs text-muted">Use letras, números e hífens. Sem espaços ou caracteres especiais.</span>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary flex-1"
                onClick={connect}
                disabled={!instanceName.trim()}
              >
                Criar e conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
