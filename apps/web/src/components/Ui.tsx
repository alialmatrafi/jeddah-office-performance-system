import type { ReactNode } from 'react';
import { AlertCircle, BarChart3, Check, CircleAlert, Inbox, LoaderCircle, X } from 'lucide-react';
import type { DistributorStatus, UserStatus } from '@jeddah/shared';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  );
}

interface KpiCardProps {
  label: string;
  value: number | string;
  hint: string;
  tone: 'navy' | 'teal' | 'amber' | 'coral';
  icon: ReactNode;
}

export function KpiCard({ label, value, hint, tone, icon }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-${tone}`}>
      <div className="kpi-card-topline">
        <span>{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <strong>{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</strong>
      <small>{hint}</small>
    </article>
  );
}

export function LoadingState({ label = 'جار تحميل البيانات' }: { label?: string }) {
  return (
    <div className="state-panel state-loading" role="status">
      <LoaderCircle size={22} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-panel state-error" role="alert">
      <CircleAlert size={22} />
      <span>{message}</span>
      {onRetry ? (
        <button className="button button-ghost button-small" onClick={onRetry} type="button">
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="state-panel state-empty">
      <Inbox size={25} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: UserStatus | DistributorStatus }) {
  const labels: Record<string, string> = {
    ACTIVE: 'نشط',
    INACTIVE: 'غير نشط',
  };
  const tone: Record<string, string> = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
  };
  return <span className={`status-badge status-${tone[status] ?? 'inactive'}`}>{labels[status] ?? status}</span>;
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} type="button" aria-label="إغلاق">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="notice notice-success" role="status">
      <Check size={18} />
      <span>{message}</span>
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
}

export function MiniBar({ value, max, tone = 'teal' }: { value: number; max: number; tone?: 'teal' | 'navy' | 'amber' | 'coral' | 'slate' }) {
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mini-bar" aria-label={`${value} من ${max}`}>
      <span className={`mini-bar-fill mini-bar-${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export { BarChart3 };
