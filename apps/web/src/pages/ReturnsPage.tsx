import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, PackagePlus, Pencil, X } from 'lucide-react';
import { UserRole } from '@jeddah/shared';
import type { ApiResponse, DistributorView, ReturnView } from '@jeddah/shared';
import { apiRequest, getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorNotice, LoadingState, PageHeader, SuccessNotice } from '../components/Ui';
import { formatDateTime, numberValue } from '../lib/format';

export function ReturnsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ReturnView[]>([]);
  const [distributors, setDistributors] = useState<DistributorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    distributorId: '',
    supervisorReceivedQuantity: '',
    officeReissueQuantity: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = {
    distributorId: '',
    supervisorReceivedQuantity: '',
    officeReissueQuantity: '',
    note: '',
  };

  const startEdit = (record: ReturnView) => {
    setEditingId(record.id);
    setForm({
      distributorId: record.distributorId,
      supervisorReceivedQuantity: String(record.supervisorReceivedQuantity),
      officeReissueQuantity: String(record.officeReissueQuantity),
      note: record.note ?? '',
    });
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const totalQuantity = useMemo(
    () => numberValue(form.supervisorReceivedQuantity) + numberValue(form.officeReissueQuantity),
    [form.officeReissueQuantity, form.supervisorReceivedQuantity],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [returnResponse, distributorResponse] = await Promise.all([
        apiRequest<ApiResponse<ReturnView[]>>('/returns'),
        apiRequest<ApiResponse<DistributorView[]>>('/distributors'),
      ]);
      setRecords(returnResponse.data);
      setDistributors(distributorResponse.data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveReturn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const body = {
      distributorId: form.distributorId,
      supervisorReceivedQuantity: numberValue(form.supervisorReceivedQuantity),
      officeReissueQuantity: numberValue(form.officeReissueQuantity),
      note: form.note.trim() || null,
    };
    try {
      if (editingId) {
        await apiRequest<ApiResponse<ReturnView>>(`/returns/${editingId}`, { method: 'PATCH', body });
        setSuccess('تم تعديل الرجيع.');
      } else {
        await apiRequest<ApiResponse<ReturnView>>('/returns', { method: 'POST', body });
        setSuccess('تم تسجيل الرجيع.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="سجل الرجيع"
        title="الرجيع لكل موزع"
        description="سجل الكمية للحالتين: تأكيد استلام المشرف، وقيد على المكتب للإعادة. الإجمالي هو مجموع الكميتين."
        action={<div className="filter-pill"><ArrowLeftRight size={16} /> {records.length} سجل</div>}
      />
      {error ? <ErrorNotice message={error} /> : null}
      {success ? <SuccessNotice message={success} /> : null}
      {user?.role === UserRole.PROCESSOR ? (
        <section className="surface-card return-form-card">
          <div className="section-title section-title-action">
            <div>
              <h2>{editingId ? 'تعديل رجيع مسجل' : 'تسجيل رجيع جديد'}</h2>
              <span>{editingId ? 'التعديل يحدّث السجل نفسه ويبقى في سجل التدقيق' : 'منسوب إلى حسابك تلقائيًا'}</span>
            </div>
            {editingId ? <button className="button button-ghost button-small" onClick={cancelEdit} type="button"><X size={16} /> إلغاء التعديل</button> : null}
          </div>
          <form className="inline-form return-form" onSubmit={saveReturn}>
            <label className="field-group"><span>الموزع</span><select className="field-input" onChange={(event) => setForm((current) => ({ ...current, distributorId: event.target.value }))} required value={form.distributorId}><option value="">اختر الموزع</option>{distributors.map((distributor) => <option key={distributor.id} value={distributor.id}>{distributor.name}</option>)}</select></label>
            <label className="field-group field-narrow"><span>تأكيد استلام المشرف</span><input className="field-input" onChange={(event) => setForm((current) => ({ ...current, supervisorReceivedQuantity: event.target.value }))} min="0" required type="number" value={form.supervisorReceivedQuantity} /></label>
            <label className="field-group field-narrow"><span>قيد على المكتب للإعادة</span><input className="field-input" onChange={(event) => setForm((current) => ({ ...current, officeReissueQuantity: event.target.value }))} min="0" required type="number" value={form.officeReissueQuantity} /></label>
            <label className="field-group field-grow"><span>ملاحظة <small>(اختياري)</small></span><textarea className="field-input" maxLength={500} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="ملاحظة الرجيع" rows={2} value={form.note} /></label>
            <div className="return-total"><span>الإجمالي</span><strong>{totalQuantity.toLocaleString('ar-SA')}</strong></div>
            <button className="button button-primary" disabled={saving || totalQuantity === 0} type="submit">{editingId ? <Pencil size={17} /> : <PackagePlus size={17} />}{saving ? 'جار الحفظ...' : editingId ? 'حفظ التعديل' : 'تسجيل الرجيع'}</button>
          </form>
        </section>
      ) : null}
      <section className="surface-card">
        <div className="section-title">
          <div><h2>سجل الرجيع</h2><span>آخر الحركات أولًا</span></div>
        </div>
        {loading ? <LoadingState label="جار تحميل سجل الرجيع" /> : records.length === 0 ? <EmptyState title="لا توجد سجلات" description="ستظهر هنا عمليات الرجيع بعد تسجيل أول عملية." /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الموزع</th><th>المعالج</th><th>تأكيد المشرف</th><th>قيد المكتب</th><th>الإجمالي</th><th>ملاحظة</th><th>التاريخ</th>{user?.role === UserRole.PROCESSOR ? <th>إجراء</th> : null}</tr></thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.distributorName}</strong></td>
                    <td><div className="person-cell"><span className="table-avatar">{record.processorName.slice(0, 1)}</span><span>{record.processorName}</span></div></td>
                    <td><strong>{record.supervisorReceivedQuantity.toLocaleString('ar-SA')}</strong></td>
                    <td><strong>{record.officeReissueQuantity.toLocaleString('ar-SA')}</strong></td>
                    <td><strong>{record.quantity.toLocaleString('ar-SA')}</strong></td>
                    <td>{record.note ? <span className="cell-note">{record.note}</span> : <span className="cell-note">—</span>}</td>
                    <td><span className="date-cell">{formatDateTime(record.createdAt)}</span></td>
                    {user?.role === UserRole.PROCESSOR ? (
                      <td>
                        <button className="action-button" onClick={() => startEdit(record)} type="button"><Pencil size={15} /> تعديل</button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
