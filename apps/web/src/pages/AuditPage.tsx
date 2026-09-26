import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Filter, RefreshCw } from 'lucide-react';
import type { ApiResponse } from '@jeddah/shared';
import { apiRequest, getErrorMessage } from '../api/client';
import { ErrorState, LoadingState, PageHeader, SectionTitle } from '../components/Ui';
import { formatDateTime } from '../lib/format';

interface AuditLogView {
  id: string;
  userId: string;
  userName: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

interface AuditResponse extends ApiResponse<AuditLogView[]> {
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

function snapshot(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<AuditResponse>('/audit-logs', {
        query: { page, pageSize, action: action || undefined, entityType: entityType || undefined },
      });
      setLogs(response.data);
      setTotal(response.meta.total);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [action, entityType, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resetPage = () => setPage(1);
  const nextPage = () => setPage((current) => Math.min(totalPages, current + 1));
  const previousPage = () => setPage((current) => Math.max(1, current - 1));

  return (
    <div className="page-stack">
      <PageHeader eyebrow="الحوكمة" title="سجل العمليات" description="تتبع من غيّر ماذا ومتى، دون عرض كلمات المرور أو الرموز السرية." action={<button className="button button-ghost" onClick={() => void load()} type="button"><RefreshCw size={17} /> تحديث</button>} />
      <section className="report-filter-bar surface-card">
        <div className="filter-title"><Filter size={17} /><div><strong>تصفية السجل</strong><span>ابحث حسب الإجراء أو نوع السجل</span></div></div>
        <label><span>الإجراء</span><input onChange={(event) => { setAction(event.target.value); resetPage(); }} placeholder="مثال: RETURN_CREATED" value={action} /></label>
        <label><span>نوع السجل</span><input onChange={(event) => { setEntityType(event.target.value); resetPage(); }} placeholder="مثال: Return" value={entityType} /></label>
      </section>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      <section className="surface-card">
        <SectionTitle title="التغييرات المسجلة" detail={`${total} عملية`} />
        {loading ? <LoadingState label="جار تحميل سجل العمليات" /> : logs.length === 0 ? <div className="inline-empty">لا توجد عمليات مطابقة.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الإجراء</th><th>المستخدم</th><th>السجل</th><th>التغيير</th><th>التاريخ</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td><div className="action-cell"><ClipboardCheck size={16} /><strong>{log.action}</strong></div></td>
                    <td><div className="person-cell"><span className="table-avatar">{log.userName.slice(0, 1)}</span><div><strong>{log.userName}</strong><small>@{log.username}</small></div></div></td>
                    <td><span className="entity-label">{log.entityType}</span><small className="cell-note">{log.entityId}</small></td>
                    <td><div className="snapshot-cell"><span>قبل: {snapshot(log.before)}</span><span>بعد: {snapshot(log.after)}</span></div></td>
                    <td className="muted-cell">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination-row">
          <span>صفحة {page} من {totalPages}</span>
          <div className="row-actions"><button className="button button-ghost button-small" disabled={page <= 1} onClick={previousPage} type="button">السابق</button><button className="button button-ghost button-small" disabled={page >= totalPages} onClick={nextPage} type="button">التالي</button></div>
        </div>
      </section>
    </div>
  );
}
