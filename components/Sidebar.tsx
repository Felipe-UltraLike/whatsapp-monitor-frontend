'use client';
import { useState, useEffect } from 'react';
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
  const [open, setOpen] = useState(false);

  // Fecha o menu ao trocar de rota
  useEffect(() => { setOpen(false); }, [pathname]);

  function logout() {
    localStorage.removeItem('wm_token');
    localStorage.removeItem('wm_user');
    router.replace('/login');
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('wm_user') || '{}')
    : {};

  return (
    <>
      {/* Header mobile com hambúrguer */}
      <div className="mobile-header">
        <div className="logo">
          <span>📲</span>
          <span>WA Monitor</span>
        </div>
        <button className="menu-toggle" onClick={() => setOpen(o => !o)} aria-label="Menu">
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Overlay escuro no mobile */}
      <div className={`mobile-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
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
              onClick={() => navigate(item.href)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.href === '/dashboard' && alertCount > 0 && (
                <span className="badge badge-red" style={{ fontSize: '11px', padding: '1px 7px' }}>{alertCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="divider" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ padding: '0 10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Usuário'}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          <button className="btn btn-sm" onClick={logout} style={{ width: '100%' }}>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
