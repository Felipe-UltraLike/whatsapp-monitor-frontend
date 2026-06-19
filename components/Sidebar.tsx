'use client';
import { useRouter, usePathname } from 'next/navigation';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'WhatsApp', href: '/whatsapp', icon: '📱' },
  { label: 'Clientes', href: '/clientes', icon: '👥' },
  { label: 'Monitoramento', href: '/monitoramento', icon: '👁️' },
  { label: 'Lembretes', href: '/lembretes', icon: '⏰' },
  { label: 'Especificações', href: '/especificacoes', icon: '📋' },
  { label: 'Logs', href: '/logs', icon: '🔍' },
];

export default function Sidebar({ alertCount = 0 }: { alertCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    localStorage.removeItem('wm_token');
    localStorage.removeItem('wm_user');
    router.replace('/login');
  }

  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('wm_user') || '{}')
    : {};

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>📲</span>
        <span>WA Monitor</span>
      </div>

      <nav style={{ flex: 1 }}>
        <div className="sidebar-section">Menu</div>
        {NAV.map(item => (
          <button
            key={item.href}
            className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
            onClick={() => router.push(item.href)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.href === '/dashboard' && alertCount > 0 && (
              <span className="badge badge-red" style={{ fontSize: '11px', padding: '1px 7px' }}>{alertCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="divider" />
      <div style={{ padding: '0 12px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Usuário'}</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
        <button className="btn btn-ghost btn-sm" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
          Sair
        </button>
      </div>
    </aside>
  );
}
