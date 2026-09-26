import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../api/client';
import { ErrorNotice } from '../components/Ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      const state = location.state as { from?: string } | null;
      navigate(state?.from ?? '/', { replace: true });
    } catch (submissionError: unknown) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-story-top">
          <div className="brand-mark brand-mark-large"><ShieldCheck size={23} /></div>
          <span>Jeddah Office / 25</span>
        </div>
        <div className="login-story-copy">
          <p className="eyebrow eyebrow-light">منظومة التشغيل اليومية</p>
          <h1>كل يوم،<br /><em>بوضوح.</em></h1>
          <p>سجل أعمال المعالجين، حركة الإرساليات، والرجيع في مساحة واحدة تشبه إيقاع المكتب.</p>
        </div>
        <div className="login-story-footer">
          <Sparkles size={17} />
          <span>قرار أسرع يبدأ من سجل أدق</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-mark"><div className="brand-mark"><ShieldCheck size={20} /></div><strong>مكتب جدة</strong></div>
          <p className="eyebrow">دخول الموظفين</p>
          <h2>مرحبًا بعودتك</h2>
          <p className="login-subtitle">استخدم بيانات الحساب التي قدمها لك مدير النظام.</p>
          {error ? <ErrorNotice message={error} /> : null}
          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="username">اسم المستخدم</label>
            <input
              autoComplete="username"
              className="field-input"
              id="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="مثال: processor"
              required
              value={username}
            />
            <label className="field-label" htmlFor="password">كلمة المرور</label>
            <div className="input-with-icon">
              <LockKeyhole size={17} />
              <input
                autoComplete="current-password"
                className="field-input"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                type="password"
                value={password}
              />
            </div>
            <button className="button button-primary button-wide" disabled={submitting} type="submit">
              {submitting ? 'جار التحقق...' : 'دخول لوحة التشغيل'}
              <ArrowLeft size={18} />
            </button>
          </form>
          <p className="login-footnote">النظام داخلي ولا يوفر تسجيلًا ذاتيًا.</p>
        </div>
      </section>
    </main>
  );
}
