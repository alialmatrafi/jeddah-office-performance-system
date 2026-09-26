import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  EllipsisVertical,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Settings2,
  UsersRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserRole, UserStatus } from '@jeddah/shared';
import { useAuth } from '../auth/AuthContext';

interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

const navigation: NavigationItem[] = [
  { label: 'نظرة عامة', to: '/', icon: LayoutDashboard },
  { label: 'الأعمال اليومية', to: '/work', icon: CalendarCheck2, roles: [UserRole.PROCESSOR] },
  { label: 'الرجيع', to: '/returns', icon: PackageCheck },
  { label: 'التقارير', to: '/reports', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
  { label: 'الموزعون', to: '/distributors', icon: Boxes, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
  { label: 'سجل العمليات', to: '/audit', icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
  { label: 'المستخدمون', to: '/users', icon: UsersRound, roles: [UserRole.ADMIN] },
];

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'مدير النظام',
  SUPERVISOR: 'مشرف',
  PROCESSOR: 'معالج',
};

const mobileTabLimit = 4;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleNavigation = navigation.filter(
    (item) => !item.roles || (user ? item.roles.includes(user.role) : false),
  );

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  if (!user) {
    return null;
  }

  const primaryTabs = visibleNavigation.slice(0, mobileTabLimit);
  const overflowItems = visibleNavigation.slice(mobileTabLimit);

  return (
    <div className="app-frame">
      <aside className="side-rail">
        <div className="brand-lockup">
          <div className="brand-mark"><ClipboardList size={21} /></div>
          <div>
            <strong>مكتب جدة</strong>
            <span>متابعة الأداء</span>
          </div>
        </div>
        <div className="rail-caption">مساحة العمل</div>
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                end={item.to === '/'}
                key={item.to}
                to={item.to}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="rail-footer">
          <div className="support-card">
            <Settings2 size={18} />
            <div>
              <strong>دورة يومية منضبطة</strong>
              <span>سجل كل حركة، واضح لكل فريق</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout} type="button">
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="main-stage">
        <header className="top-bar">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="mobile-brand mobile-menu-trigger"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <div className="brand-mark"><ClipboardList size={18} /></div>
            <strong>مكتب جدة</strong>
          </button>
          <div className="top-context">
            <span className="top-context-dot" />
            <span>لوحة التشغيل</span>
          </div>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="user-chip user-chip-trigger"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <div className="avatar">{user.name.slice(0, 1)}</div>
            <div className="user-chip-copy">
              <strong>{user.name}</strong>
              <span>{roleLabels[user.role]}</span>
            </div>
            <span className={`user-status ${user.status === UserStatus.ACTIVE ? 'is-active' : ''}`} />
          </button>
        </header>
        <div className="page-content">{children}</div>
      </main>
      <nav className="mobile-tabbar" aria-label="التنقل السريع">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={({ isActive }) => `mobile-tab ${isActive ? 'mobile-tab-active' : ''}`}
              end={item.to === '/'}
              key={item.to}
              to={item.to}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {overflowItems.length > 0 ? (
          <button
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="mobile-tab mobile-tab-more"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <EllipsisVertical size={19} />
            <span>المزيد</span>
          </button>
        ) : null}
      </nav>
      {menuOpen ? (
        <div className="mobile-sheet-backdrop" onMouseDown={() => setMenuOpen(false)} role="presentation">
          <section
            aria-label="قائمة الحساب والتنقل"
            aria-modal="true"
            className="mobile-sheet"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-head">
              <div className="avatar avatar-large">{user.name.slice(0, 1)}</div>
              <div className="user-chip-copy">
                <strong>{user.name}</strong>
                <span>{roleLabels[user.role]}</span>
              </div>
              <button aria-label="إغلاق القائمة" className="icon-button" onClick={() => setMenuOpen(false)} type="button">
                <X size={19} />
              </button>
            </div>
            <div className="mobile-sheet-nav">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    className={({ isActive }) => `mobile-sheet-link ${isActive ? 'mobile-sheet-link-active' : ''}`}
                    end={item.to === '/'}
                    key={item.to}
                    to={item.to}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <button className="logout-button mobile-sheet-logout" onClick={handleLogout} type="button">
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
