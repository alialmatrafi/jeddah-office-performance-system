import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarRange, Download, Filter, Layers3, UsersRound } from 'lucide-react';
import type { ApiResponse, PerformanceReport, UserView } from '@jeddah/shared';
import { apiRequest, getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, KpiCard, LoadingState, MiniBar, PageHeader, SectionTitle } from '../components/Ui';
import { formatDate, formatDateTime, monthEndInput, monthStartInput } from '../lib/format';

export function ReportsPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(monthStartInput());
  const [to, setTo] = useState(monthEndInput());
  const [processorId, setProcessorId] = useState('');
  const [users, setUsers] = useState<UserView[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'PROCESSOR') {
      void apiRequest<ApiResponse<UserView[]>>('/users/processors').then((response) => setUsers(response.data)).catch(() => setUsers([]));
    }
  }, [user?.role]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<ApiResponse<PerformanceReport>>('/reports/performance', { query: { from, to, processorId: processorId || undefined } });
      setReport(response.data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [from, to, processorId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const maxDaily = useMemo(() => Math.max(1, ...(report?.daily.map((row) => row.totalWork) ?? [1])), [report]);

  const exportReport = () => {
    if (!report) {
      return;
    }
    const lines = [
      ['المؤشر', 'القيمة'],
      ['إجمالي الأعمال', String(report.totals.totalWork)],
      ['قيد الإرسال', String(report.totals.shipmentEntries)],
      ['الرجيع', String(report.totals.returns)],
      ...report.perProcessor.map((row) => [row.processorName, String(row.totalWork)]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jeddah-performance-${from}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="قراءة الأداء" title="التقارير والتحليل" description="قارن الإنتاجية، راقب الاتجاه اليومي، وصدّر ملخصًا للاجتماع." action={<button className="button button-ghost" onClick={exportReport} type="button"><Download size={17} /> تصدير CSV</button>} />
      <section className="report-filter-bar surface-card">
        <div className="filter-title"><Filter size={17} /><div><strong>نطاق التقرير</strong><span>اختر الفترة ثم حدّث القراءة</span></div></div>
        <label><span>من</span><input onChange={(event) => setFrom(event.target.value)} type="date" value={from} /></label>
        <label><span>إلى</span><input onChange={(event) => setTo(event.target.value)} type="date" value={to} /></label>
        {user?.role !== 'PROCESSOR' ? <label className="processor-filter"><span>المعالج</span><select onChange={(event) => setProcessorId(event.target.value)} value={processorId}><option value="">كل المعالجين</option>{users.filter((item) => item.role === 'PROCESSOR').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
        <button className="button button-primary button-small" onClick={() => void loadReport()} type="button"><BarChart3 size={16} /> تحديث</button>
      </section>
      {error ? <ErrorState message={error} onRetry={() => void loadReport()} /> : null}
      {loading && !report ? <LoadingState label="جار حساب التقرير" /> : null}
      {report ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="إجمالي الأعمال" value={report.totals.totalWork} hint="جميع الأنواع" tone="navy" icon={<Layers3 size={19} />} />
            <KpiCard label="البريد الممتاز" value={report.totals.excellentMail} hint="عنصر بريد" tone="teal" icon={<BarChart3 size={19} />} />
            <KpiCard label="قيد الإرسال" value={report.totals.shipmentEntries} hint="مجموع القيود" tone="amber" icon={<CalendarRange size={19} />} />
            <KpiCard label="الرجيع" value={report.totals.returns} hint="قطع متتبعة" tone="coral" icon={<UsersRound size={19} />} />
          </section>
          <section className="surface-card">
            <SectionTitle title="اتجاه الإنتاج" detail={`${formatDate(report.dateRange.from)} — ${formatDate(report.dateRange.to)}`} />
            {report.daily.length === 0 ? <div className="inline-empty">لا توجد بيانات في النطاق المحدد.</div> : <div className="trend-grid">{report.daily.map((day) => <div className="trend-column" key={day.workDate}><div className="trend-value">{day.totalWork}</div><MiniBar max={maxDaily} value={day.totalWork} tone="navy" /><span>{day.workDate.slice(5)}</span></div>)}</div>}
           </section>
           <section className="surface-card">
             <SectionTitle title="أول وآخر عملية" detail="حسب توقيت تسجيل النشاط" />
             <div className="table-wrap"><table><thead><tr><th>اليوم</th><th>أول عملية</th><th>آخر عملية</th><th>المعالجون</th></tr></thead><tbody>{report.daily.length === 0 ? <tr><td colSpan={4}>لا توجد بيانات.</td></tr> : report.daily.map((day) => <tr key={`times-${day.workDate}`}><td>{formatDate(day.workDate)}</td><td>{formatDateTime(day.firstOperationAt)}</td><td>{formatDateTime(day.lastOperationAt)}</td><td>{day.workDays}</td></tr>)}</tbody></table></div>
           </section>
           <section className="surface-card">
             <SectionTitle title="ملخص أنواع العمل" detail="توزيع الفترة" />
            <div className="work-breakdown">
              {[['البريد الممتاز', report.totals.excellentMail, 'teal'], ['البريد الرسمي', report.totals.officialMail, 'navy'], ['البريد المسجل', report.totals.registeredMail, 'amber'], ['مستندات حكومية', report.totals.governmentDocs, 'coral'], ['الطرود', report.totals.parcels, 'slate']].map(([label, value, tone]) => <div className="breakdown-item" key={label}><div><span>{label}</span><strong>{Number(value).toLocaleString('ar-SA')}</strong></div><MiniBar max={Math.max(1, report.totals.totalWork)} tone={tone as 'teal' | 'navy' | 'amber' | 'coral' | 'slate'} value={Number(value)} /></div>)}
            </div>
          </section>
          <section className="surface-card">
            <SectionTitle title="أداء المعالجين" detail="ترتيب تنازلي" />
            <div className="table-wrap"><table><thead><tr><th>المعالج</th><th>أيام العمل</th><th>إجمالي الأعمال</th><th>قيد الإرسال</th><th>الرجيع</th></tr></thead><tbody>{report.perProcessor.length === 0 ? <tr><td colSpan={5}>لا توجد بيانات.</td></tr> : report.perProcessor.map((row) => <tr key={row.processorId}><td><div className="person-cell"><span className="table-avatar">{row.processorName.slice(0, 1)}</span><div><strong>{row.processorName}</strong><small>@{row.processorUsername}</small></div></div></td><td>{row.workDays}</td><td><strong>{row.totalWork.toLocaleString('ar-SA')}</strong></td><td>{row.shipmentEntries.toLocaleString('ar-SA')}</td><td>{row.returns.toLocaleString('ar-SA')}</td></tr>)}</tbody></table></div>
          </section>
        </>
      ) : null}
    </div>
  );
}
