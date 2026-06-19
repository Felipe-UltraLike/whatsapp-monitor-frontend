'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Smartphone, Users, Eye, Bell, ClipboardList,
  Search, Menu, X, LogOut, MessageSquare,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard',      href: '/dashboard',      Icon: LayoutDashboard },
  { label: 'WhatsApp',       href: '/whatsapp',       Icon: Smartphone },
  { label: 'Clientes',       href: '/clientes',       Icon: Users },
  { label: 'Monitoramento',  href: '/monitoramento',  Icon: Eye },
  { label: 'Lembretes',      href: '/lembretes',      Icon: Bell },
  { label: 'Especificações', href: '/especificacoes', Icon: ClipboardList },
  { label: 'Logs',           href: '/logs',           Icon: Search },
];

export default function Sidebar({ alertCount = 0 }: { alertCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
      <div className="mobile-header">
        <div className="logo">
          <MessageSquare size={18} />
          <span>WA Monitor</span>
        </div>
        <button className="menu-toggle" onClick={() => setOpen(o => !o)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className={`mobile-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <MessageSquare size={18} />
          <span>WA Monitor</span>
        </div>

        <nav style={{ flex: 1 }}>
          <div className="sidebar-section">Menu</div>
          {NAV.map(({ href, label, Icon }) => (
            <button
              key={href}
              className={`sidebar-item ${pathname === href ? 'active' : ''}`}
              onClick={() => navigate(href)}
            >
              <Icon size={16} />
              <span>{label}</span>
              {href === '/dashboard' && alertCount > 0 && (
                <span className="badge badge-red" style={{ fontSize: '11px', padding: '1px 7px' }}>{alertCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="divider" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ padding: '0 10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Usuário'}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          <button className="btn btn-sm" onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
