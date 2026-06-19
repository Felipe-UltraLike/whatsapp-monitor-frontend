const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wm_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { name: string; email: string; password: string; whatsapp_number?: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => request<User>('/api/auth/me'),
  updateMe: (data: Partial<User>) =>
    request<User>('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // WhatsApp
  getWhatsAppStatus: () => request<WhatsAppStatus>('/api/whatsapp/status'),
  connectWhatsApp: (instanceName?: string) => request<{ qr: unknown; webhook_configured: boolean; session_key: string }>('/api/whatsapp/connect', { method: 'POST', body: JSON.stringify({ instance_name: instanceName }) }),
  disconnectWhatsApp: () => request('/api/whatsapp/disconnect', { method: 'POST' }),
  listChats: () => request<Chat[]>('/api/whatsapp/chats'),
  getWebhookUrl: () => request<{ webhook_url: string; backend_url_configured: boolean }>('/api/whatsapp/webhook/url'),
  configureWebhook: () => request<{ success: boolean; webhook_url: string }>('/api/whatsapp/webhook/configure', { method: 'POST' }),

  // Clients
  listClients: () => request<Client[]>('/api/clients'),
  createClient: (data: { name: string; description?: string; color?: string }) =>
    request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<Client>) =>
    request<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: string) =>
    request(`/api/clients/${id}`, { method: 'DELETE' }),

  // Systems
  listSystems: (clientId: string) => request<ClientSystem[]>(`/api/clients/${clientId}/systems`),
  createSystem: (clientId: string, data: Omit<ClientSystem, 'id' | 'client_id' | 'created_at'>) =>
    request<ClientSystem>(`/api/clients/${clientId}/systems`, { method: 'POST', body: JSON.stringify(data) }),
  updateSystem: (clientId: string, systemId: string, data: Partial<ClientSystem>) =>
    request<ClientSystem>(`/api/clients/${clientId}/systems/${systemId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSystem: (clientId: string, systemId: string) =>
    request(`/api/clients/${clientId}/systems/${systemId}`, { method: 'DELETE' }),

  // Client Chats
  listClientChats: (clientId: string) => request<MonitoredChat[]>(`/api/clients/${clientId}/chats`),
  addChatToClient: (clientId: string, data: { chat_id: string; chat_name: string; chat_type: string }) =>
    request<MonitoredChat>(`/api/clients/${clientId}/chats`, { method: 'POST', body: JSON.stringify(data) }),
  removeChatFromClient: (clientId: string, chatMonitorId: string) =>
    request(`/api/clients/${clientId}/chats/${chatMonitorId}`, { method: 'DELETE' }),

  // Alerts
  listAlerts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Alert[]>(`/api/alerts${qs}`);
  },
  getAlertStats: () => request<AlertStats>('/api/alerts/stats'),
  resolveAlert: (id: string) => request<Alert>(`/api/alerts/${id}/resolve`, { method: 'PATCH' }),

  // Specifications
  listSpecifications: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Specification[]>(`/api/alerts/specifications${qs}`);
  },
  updateSpecification: (id: string, data: { status?: string; assigned_dev?: string }) =>
    request<Specification>(`/api/alerts/specifications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Reminders
  listReminders: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Reminder[]>(`/api/reminders${qs}`);
  },
  createReminder: (data: { title: string; message: string; scheduled_at: string }) =>
    request<Reminder>('/api/reminders', { method: 'POST', body: JSON.stringify(data) }),
  cancelReminder: (id: string) =>
    request<Reminder>(`/api/reminders/${id}/cancel`, { method: 'PATCH' }),
  deleteReminder: (id: string) =>
    request(`/api/reminders/${id}`, { method: 'DELETE' }),

  // Logs
  listLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<SystemLog[]>(`/api/logs${qs}`);
  },
  clearLogs: () => request('/api/logs', { method: 'DELETE' }),
};

// ===== TIPOS =====
export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp_number?: string;
  system_group_id?: string;
  system_group_name?: string;
  created_at?: string;
}

export interface WhatsAppStatus {
  status: string;
  connected: boolean;
  session_key?: string;
}

export interface Chat {
  id: string;
  name: string;
  type: 'individual' | 'group';
  is_monitored: boolean;
  client_id?: string;
  last_message?: unknown;
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  color: string;
  active: boolean;
  systems_count?: number;
  chats_count?: number;
  open_alerts?: number;
  created_at: string;
}

export interface ClientSystem {
  id: string;
  client_id: string;
  name: string;
  description: string;
  tech_stack?: string;
  repository_url?: string;
  production_url?: string;
  active: boolean;
  created_at: string;
}

export interface MonitoredChat {
  id: string;
  chat_id: string;
  chat_name: string;
  chat_type: string;
  client_id?: string;
  is_active: boolean;
}

export interface Alert {
  id: string;
  client_id?: string;
  client_name?: string;
  client_color?: string;
  alert_type: 'complaint' | 'bug' | 'suggestion' | 'request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  output_type?: 'spec' | 'insight';
  summary: string;
  original_message: string;
  chat_name?: string;
  sender_name?: string;
  resolved: boolean;
  spec_id?: string;
  spec_title?: string;
  spec_status?: string;
  created_at: string;
}

export interface AlertStats {
  open_alerts: string;
  open_bugs: string;
  open_complaints: string;
  open_suggestions: string;
  critical_alerts: string;
  last_24h: string;
  pending_specs: string;
  done_specs: string;
}

export interface Specification {
  id: string;
  alert_id: string;
  client_id?: string;
  client_name?: string;
  client_color?: string;
  system_id?: string;
  system_name?: string;
  title: string;
  spec_type: 'bug_fix' | 'feature' | 'improvement' | 'investigation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  acceptance_criteria?: string;
  technical_notes?: string;
  estimated_complexity: 'simple' | 'medium' | 'complex';
  status: 'pending' | 'assigned' | 'in_progress' | 'done';
  assigned_dev?: string;
  alert_type?: string;
  original_message?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  message: string;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'cancelled';
  source: 'manual' | 'whatsapp';
  created_at: string;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
  data?: Record<string, unknown>;
  created_at: string;
}
