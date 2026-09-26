import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpLeft, Boxes, CalendarDays, PackageCheck, Sparkles } from 'lucide-react';
import type { ApiResponse, PerformanceReport } from '@jeddah/shared';
import { apiRequest, getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, KpiCard, LoadingState, MiniBar, PageHeader, SectionTitle, SuccessNotice } from '../components/Ui';
import { formatDate, monthEndInput, monthStartInput } from '../lib/format';

export function DashboardPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(monthStartInput());
  const [to, setTo] = useState(monthEndInput());
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<ApiResponse<PerformanceReport>>('/reports/performance', {
        query: { from, to },
      });
      setReport(response.data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const maxProcessorWork = useMemo(
    () => Math.max(1, ...(report?.perProcessor.map((row) => row.totalWork) ?? [1])),
    [report],
  );

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={user?.role === 'PROCESSOR' ? 'مساحتك التشغيلية' : 'مركز القيادة'}
        title={`صباح الإنجاز، ${user?.name ?? ''}`}
        description="صورة سريعة عن الإنتاجية وحركة المكتب خلال الفترة المختارة."
        action={
          <div className="date-filter">
            <CalendarDays size={17} />
            <input aria-label="من تاريخ" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
            <span>إلى</span>
            <input aria-label="إلى تاريخ" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
          </div>
        }
      />
      {error ? <ErrorState message={error} onRetry={() => void loadReport()} /> : null}
      {loading && !report ? <LoadingState /> : null}
      {report ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="إجمالي الأعمال" value={report.totals.totalWork} hint="عنصر عمل مسجل" tone="navy" icon={<Activity size={19} />} />
            <KpiCard label="قيد الإرسال" value={report.totals.shipmentEntries} hint="إرسالية موزعة" tone="teal" icon={<Boxes size={19} />} />
            <KpiCard label="الرجيع" value={report.totals.returns} hint="قطعة في دورة الرجيع" tone="amber" icon={<PackageCheck size={19} />} />
            <KpiCard label="أيام العمل" value={report.daily.length} hint="يوم عليه نشاط" tone="coral" icon={<CalendarDays size={19} />} />
          </section>
          <section className="dashboard-grid">
            <article className="surface-card daily-pulse-card">
              <SectionTitle title="نبض اليوم" detail={`${formatDate(report.dateRange.from)} — ${formatDate(report.dateRange.to)}`} />
              {report.daily.length === 0 ? (
                <div className="inline-empty">لا توجد أعمال مسجلة في هذه الفترة.</div>
              ) : (
                <div className="pulse-list">
                  {report.daily.slice(-7).reverse().map((day) => (
                    <div className="pulse-row" key={day.workDate}>
                      <div className="pulse-day">
                        <strong>{formatDate(day.workDate)}</strong>
                        <span>{day.workDays} معالج</span>
                      </div>
                      <div className="pulse-bar-wrap">
                        <MiniBar max={Math.max(1, ...report.daily.map((item) => item.totalWork))} tone="teal" value={day.totalWork} />
                      </div>
                      <strong className="pulse-number">{day.totalWork.toLocaleString('ar-SA')}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
            <article className="surface-card focus-card">
              <div className="focus-glow" />
              <div className="focus-content">
                <span className="focus-label"><Sparkles size={15} />مؤشر الأداء
                </span>
                <strong>{report.totals.totalWork.toLocaleString('ar-SA')}</strong>
                <span>عنصرًا مكتملًا في الفترة</span>
                <div className="focus-foot">
                  <ArrowUpLeft size={16} />
                  <span>سجل متصل من الإدخال حتى التقرير</span>
                </div>
              </div>
            </article>
          </section>
          {user?.role !== 'PROCESSOR' ? (
            <section className="surface-card">
              <SectionTitle title="مقارنة المعالجين" detail="مرتبة حسب إجمالي الأعمال" />
              <div className="table-wrap">
                <table>
                  <thead><tr><th>المعالج</th><th>أيام العمل</th><th>إجمالي الأعمال</th><th>قيد الإرسال</th><th>المتوسط اليومي</th></tr></thead>
                  <tbody>
                    {report.perProcessor.map((row) => (
                      <tr key={row.processorId}>
                        <td><div className="person-cell"><span className="table-avatar">{row.processorName.slice(0, 1)}</span><div><strong>{row.processorName}</strong><small>@{row.processorUsername}</small></div></div></td>
                        <td>{row.workDays}</td>
                        <td><strong>{row.totalWork.toLocaleString('ar-SA')}</strong></td>
                        <td>{row.shipmentEntries.toLocaleString('ar-SA')}</td>
                        <td><div className="average-cell"><MiniBar max={maxProcessorWork} value={row.totalWork} /><span>{row.averageWorkPerDay.toFixed(1)}</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          <SuccessNotice message="تتم مزامنة الأرقام مع سجل الأعمال والرجيع في هذه الفترة." />
        </>
      ) : null}
    </div>
  );
}
