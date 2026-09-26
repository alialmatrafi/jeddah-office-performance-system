import { useCallback, useEffect, useState } from 'react';
import { Edit3, PackageOpen, Plus, Power, Save, X } from 'lucide-react';
import { DistributorStatus } from '@jeddah/shared';
import type { ApiResponse, DistributorView } from '@jeddah/shared';
import { apiRequest, getErrorMessage } from '../api/client';
import { ErrorNotice, LoadingState, Modal, PageHeader, StatusBadge, SuccessNotice } from '../components/Ui';
import { formatDateTime } from '../lib/format';

export function DistributorsPage() {
  const [distributors, setDistributors] = useState<DistributorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DistributorView | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<DistributorStatus>(DistributorStatus.ACTIVE);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<ApiResponse<DistributorView[]>>('/distributors');
      setDistributors(response.data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setStatus(DistributorStatus.ACTIVE);
    setShowForm(true);
  };

  const openEdit = (distributor: DistributorView) => {
    setEditing(distributor);
    setName(distributor.name);
    setStatus(distributor.status);
    setShowForm(true);
  };

  const saveDistributor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiRequest<ApiResponse<DistributorView>>(`/distributors${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: { name, status },
      });
      setSuccess(editing ? 'تم تحديث الموزع.' : 'تمت إضافة الموزع.');
      setShowForm(false);
      await load();
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (distributor: DistributorView) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest<ApiResponse<DistributorView>>(`/distributors/${distributor.id}`, {
        method: 'PATCH',
        body: { status: distributor.status === DistributorStatus.ACTIVE ? DistributorStatus.INACTIVE : DistributorStatus.ACTIVE },
      });
      setSuccess('تم تحديث حالة الموزع.');
      await load();
    } catch (updateError: unknown) {
      setError(getErrorMessage(updateError));
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="إدارة الشبكة" title="الموزعون" description="حافظ على قائمة الموزعين نشطة لتسريع قيود الإرسال اليومية." action={<button className="button button-primary" onClick={openCreate} type="button"><Plus size={17} /> إضافة موزع</button>} />
      {error ? <ErrorNotice message={error} /> : null}
      {success ? <SuccessNotice message={success} /> : null}
      <section className="surface-card">
        <div className="section-title section-title-action"><div><h2>دليل الموزعين</h2><span>{distributors.length} موزع مسجل</span></div><PackageOpen size={22} /></div>
        {loading ? <LoadingState /> : distributors.length === 0 ? <div className="inline-empty">لا يوجد موزعون بعد.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الموزع</th><th>الحالة</th><th>آخر تحديث</th><th>إجراءات</th></tr></thead>
              <tbody>
                {distributors.map((distributor) => (
                  <tr key={distributor.id}>
                    <td><div className="person-cell"><span className="table-avatar distributor-avatar"><PackageOpen size={16} /></span><div><strong>{distributor.name}</strong><small>بدأ التشغيل {formatDateTime(distributor.createdAt)}</small></div></div></td>
                    <td><StatusBadge status={distributor.status} /></td>
                    <td className="muted-cell">{formatDateTime(distributor.updatedAt)}</td>
                    <td><div className="row-actions"><button className="action-button" onClick={() => openEdit(distributor)} type="button"><Edit3 size={15} /> تعديل</button><button className="action-button" onClick={() => void toggleStatus(distributor)} type="button"><Power size={15} /> {distributor.status === DistributorStatus.ACTIVE ? 'إيقاف' : 'تفعيل'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {showForm ? (
        <Modal onClose={() => setShowForm(false)} title={editing ? 'تعديل الموزع' : 'إضافة موزع'}>
          <form className="form-stack modal-form" onSubmit={saveDistributor}>
            <label className="field-label" htmlFor="distributor-name">اسم الموزع</label>
            <input autoFocus className="field-input" id="distributor-name" onChange={(event) => setName(event.target.value)} placeholder="اسم الموزع" required value={name} />
            <label className="field-label" htmlFor="distributor-status">الحالة</label>
            <select className="field-input" id="distributor-status" onChange={(event) => setStatus(event.target.value as DistributorStatus)} value={status}><option value={DistributorStatus.ACTIVE}>نشط</option><option value={DistributorStatus.INACTIVE}>غير نشط</option></select>
            <div className="modal-actions"><button className="button button-ghost" onClick={() => setShowForm(false)} type="button"><X size={16} /> إلغاء</button><button className="button button-primary" disabled={saving} type="submit"><Save size={16} />{saving ? 'جار الحفظ...' : 'حفظ'}</button></div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
