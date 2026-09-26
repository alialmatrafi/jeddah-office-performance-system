import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardPenLine, Plus, Save, Trash2 } from 'lucide-react';
import type { ApiResponse, DailyWorkView, DistrictView, DistributorView, WorkField } from '@jeddah/shared';
import { apiRequest, getErrorMessage } from '../api/client';
import { ErrorNotice, LoadingState, PageHeader, SectionTitle, SuccessNotice } from '../components/Ui';
import { formatDate, numberValue, todayInput } from '../lib/format';

interface ShipmentFormRow {
  distributorId: string;
  districtId: string;
  entryCount: string;
}

interface WorkForm {
  excellentMail: string;
  officialMail: string;
  registeredMail: string;
  governmentDocs: string;
  parcels: string;
}

const emptyForm: WorkForm = {
  excellentMail: '',
  officialMail: '',
  registeredMail: '',
  governmentDocs: '',
  parcels: '',
};

const workFields: Array<{ key: WorkField; label: string; hint: string }> = [
  { key: 'excellentMail', label: 'البريد الممتاز', hint: 'رسائل ذات أولوية' },
  { key: 'officialMail', label: 'البريد الرسمي', hint: 'مراسلات الجهات' },
  { key: 'registeredMail', label: 'البريد المسجل', hint: 'إرسال موثق' },
  { key: 'governmentDocs', label: 'مستندات حكومية', hint: 'مستندات وزارة الغابات' },
  { key: 'parcels', label: 'الطرود', hint: 'عناصر طرد' },
];

export function DailyWorkPage() {
  const [workDate, setWorkDate] = useState(todayInput());
  const [form, setForm] = useState<WorkForm>(emptyForm);
  const [rows, setRows] = useState<ShipmentFormRow[]>([]);
  const [distributors, setDistributors] = useState<DistributorView[]>([]);
  const [districts, setDistricts] = useState<DistrictView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [workResponse, distributorResponse, districtResponse] = await Promise.all([
        apiRequest<ApiResponse<DailyWorkView[]>>('/work/daily', { query: { date: workDate } }),
        apiRequest<ApiResponse<DistributorView[]>>('/distributors'),
        apiRequest<ApiResponse<DistrictView[]>>('/districts'),
      ]);
      const existing = workResponse.data[0];
      setForm(existing ? {
        excellentMail: String(existing.excellentMail),
        officialMail: String(existing.officialMail),
        registeredMail: String(existing.registeredMail),
        governmentDocs: String(existing.governmentDocs),
        parcels: String(existing.parcels),
      } : emptyForm);
      setRows(existing && existing.shipmentEntries.length > 0
        ? existing.shipmentEntries.map((entry) => ({
            distributorId: entry.distributorId,
            districtId: entry.districtId,
            entryCount: String(entry.entryCount),
          }))
        : [{ distributorId: '', districtId: '', entryCount: '' }]);
      setDistributors(distributorResponse.data);
      setDistricts(districtResponse.data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateCount = (field: WorkField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess('');
  };

  const updateRow = (index: number, field: keyof ShipmentFormRow, value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    setRows((current) => [...current, { distributorId: '', districtId: '', entryCount: '' }]);
  };

  const removeRow = (index: number) => {
    setRows((current) => current.length === 1 ? [{ distributorId: '', districtId: '', entryCount: '' }] : current.filter((_, rowIndex) => rowIndex !== index));
  };

  const saveWork = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const shipmentEntries = rows
        .filter((row) => row.districtId && row.distributorId)
        .map((row) => ({ distributorId: row.distributorId, districtId: row.districtId, entryCount: numberValue(row.entryCount) }));
      if (shipmentEntries.length !== rows.filter((row) => row.districtId || row.distributorId).length) {
        throw new Error('أكمل الموزع والمنطقة لكل قيد قبل الحفظ');
      }
      await apiRequest<ApiResponse<DailyWorkView>>('/work', {
        method: 'POST',
        body: {
          workDate,
          excellentMail: numberValue(form.excellentMail),
          officialMail: numberValue(form.officialMail),
          registeredMail: numberValue(form.registeredMail),
          governmentDocs: numberValue(form.governmentDocs),
          parcels: numberValue(form.parcels),
          shipmentEntries,
        },
      });
      setSuccess('تم حفظ أعمال اليوم بنجاح.');
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="إدخال المعالج"
        title="سجل الأعمال اليومية"
        description="سجّل أنواع العمل والقيود في أقل من دقيقتين."
        action={<div className="date-filter"><ClipboardPenLine size={17} /><input aria-label="تاريخ العمل" onChange={(event) => setWorkDate(event.target.value)} type="date" value={workDate} /></div>}
      />
      {error ? <ErrorNotice message={error} /> : null}
      {success ? <SuccessNotice message={success} /> : null}
      {loading ? <LoadingState label="جار تجهيز سجل اليوم" /> : null}
      {!loading ? (
        <form className="work-form" onSubmit={(event) => { event.preventDefault(); void saveWork(); }}>
          <section className="surface-card work-counts-card">
            <SectionTitle title="أنواع الأعمال" detail={`${formatDate(workDate)}`} />
            <div className="work-count-grid">
              {workFields.map((field) => (
                <label className="count-field" key={field.key}>
                  <span>{field.label}</span>
                  <input inputMode="numeric" min="0" onChange={(event) => updateCount(field.key, event.target.value)} type="number" value={form[field.key]} />
                  <small>{field.hint}</small>
                </label>
              ))}
            </div>
          </section>
          <section className="surface-card shipment-card">
            <div className="section-title section-title-action">
              <div><h2>قيود الإرسال حسب المنطقة</h2><span>قيمة واحدة لكل منطقة</span></div>
              <button className="button button-ghost button-small" onClick={addRow} type="button"><Plus size={16} /> إضافة قيد</button>
            </div>
            <div className="shipment-list">
              {rows.map((row, index) => (
                <div className="shipment-row" key={`${index}-${row.districtId}`}>
                  <span className="row-index">{String(index + 1).padStart(2, '0')}</span>
                  <label><span>الموزع</span><select onChange={(event) => updateRow(index, 'distributorId', event.target.value)} value={row.distributorId}><option value="">اختر الموزع</option>{distributors.map((distributor) => <option key={distributor.id} value={distributor.id}>{distributor.name}</option>)}</select></label>
                  <label><span>المنطقة</span><select onChange={(event) => updateRow(index, 'districtId', event.target.value)} value={row.districtId}><option value="">اختر المنطقة</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></label>
                  <label className="entry-count"><span>عدد القيود</span><input inputMode="numeric" min="0" onChange={(event) => updateRow(index, 'entryCount', event.target.value)} type="number" value={row.entryCount} /></label>
                  <button aria-label="حذف القيد" className="icon-button danger-icon" onClick={() => removeRow(index)} type="button"><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </section>
          <div className="sticky-action-bar">
            <div><Check size={18} /><span>الحفظ يحدّث سجل المعالج نفسه لهذا التاريخ.</span></div>
            <button className="button button-primary" disabled={saving} type="submit"><Save size={17} />{saving ? 'جار الحفظ...' : 'حفظ سجل اليوم'}</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
