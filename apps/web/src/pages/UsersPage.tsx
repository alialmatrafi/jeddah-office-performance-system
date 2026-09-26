import { useCallback, useEffect, useState } from 'react';
import { Edit3, KeyRound, Plus, Save, Shield, UserRound, X } from 'lucide-react';
import { UserRole, UserStatus } from '@jeddah/shared';
import type { ApiResponse, UserView } from '@jeddah/shared';
import { apiRequest, getErrorMessage } from '../api/client';
import { ErrorNotice, LoadingState, Modal, PageHeader, StatusBadge, SuccessNotice } from '../components/Ui';
import { formatDateTime } from '../lib/format';

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'مدير النظام',
  SUPERVISOR: 'مشرف',
  PROCESSOR: 'معالج',
};

interface UserForm {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  status: UserStatus;
}

export function UsersPage() {
  const [users, setUsers] = useState<UserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserView | null>(null);
  const [form, setForm] = useState<UserForm>({ name: '', username: '', password: '', role: UserRole.PROCESSOR, status: UserStatus.ACTIVE });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<ApiResponse<UserView[]>>('/users');
      setUsers(response.data);
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
    setForm({ name: '', username: '', password: '', role: UserRole.PROCESSOR, status: UserStatus.ACTIVE });
    setShowForm(true);
  };

  const openEdit = (user: UserView) => {
    setEditing(user);
    setForm({ name: user.name, username: user.username, password: '', role: user.role, status: user.status });
    setShowForm(true);
  };

  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = editing
        ? { name: form.name, username: form.username, role: form.role, status: form.status, ...(form.password ? { password: form.password } : {}) }
        : { name: form.name, username: form.username, password: form.password, role: form.role, status: form.status };
      await apiRequest<ApiResponse<UserView>>(`/users${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body });
      setSuccess(editing ? 'تم تحديث المستخدم.' : 'تم إنشاء المستخدم.');
      setShowForm(false);
      await load();
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: UserView) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest<ApiResponse<UserView>>(`/users/${user.id}`, { method: 'PATCH', body: { status: user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE } });
      setSuccess('تم تحديث حالة المستخدم.');
      await load();
    } catch (updateError: unknown) {
      setError(getErrorMessage(updateError));
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="التحكم والصلاحيات" title="المستخدمون" description="أنشئ حسابات الموظفين وحدد دورهم دون تغيير كلمة المرور إلا عند الحاجة." action={<button className="button button-primary" onClick={openCreate} type="button"><Plus size={17} /> مستخدم جديد</button>} />
      {error ? <ErrorNotice message={error} /> : null}
      {success ? <SuccessNotice message={success} /> : null}
      <section className="surface-card">
        <div className="section-title section-title-action"><div><h2>حسابات النظام</h2><span>{users.length} حساب</span></div><Shield size={22} /></div>
        {loading ? <LoadingState /> : users.length === 0 ? <div className="inline-empty">لا يوجد مستخدمون.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>تاريخ الإنشاء</th><th>إجراءات</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><div className="person-cell"><span className="table-avatar"><UserRound size={16} /></span><div><strong>{user.name}</strong><small>@{user.username}</small></div></div></td>
                    <td><span className="role-label">{roleLabels[user.role]}</span></td>
                    <td><StatusBadge status={user.status} /></td>
                    <td className="muted-cell">{formatDateTime(user.createdAt)}</td>
                    <td><div className="row-actions"><button className="action-button" onClick={() => openEdit(user)} type="button"><Edit3 size={15} /> تعديل</button><button className="action-button" onClick={() => void toggleStatus(user)} type="button"><KeyRound size={15} /> {user.status === UserStatus.ACTIVE ? 'تعطيل' : 'تفعيل'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {showForm ? (
        <Modal onClose={() => setShowForm(false)} title={editing ? 'تعديل المستخدم' : 'إنشاء مستخدم'}>
          <form className="form-stack modal-form" onSubmit={saveUser}>
            <label className="field-label" htmlFor="user-name">الاسم الكامل</label>
            <input autoFocus className="field-input" id="user-name" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} />
            <label className="field-label" htmlFor="user-username">اسم المستخدم</label>
            <input autoComplete="off" className="field-input" id="user-username" onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} required value={form.username} />
            <label className="field-label" htmlFor="user-password">{editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}</label>
            <input autoComplete="new-password" className="field-input" id="user-password" minLength={8} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required={!editing} type="password" value={form.password} />
            <div className="form-two-columns">
              <label className="field-group"><span>الدور</span><select className="field-input" onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))} value={form.role}>{Object.values(UserRole).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
              <label className="field-group"><span>الحالة</span><select className="field-input" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as UserStatus }))} value={form.status}><option value={UserStatus.ACTIVE}>نشط</option><option value={UserStatus.INACTIVE}>غير نشط</option></select></label>
            </div>
            <div className="modal-actions"><button className="button button-ghost" onClick={() => setShowForm(false)} type="button"><X size={16} /> إلغاء</button><button className="button button-primary" disabled={saving} type="submit"><Save size={16} />{saving ? 'جار الحفظ...' : 'حفظ المستخدم'}</button></div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
