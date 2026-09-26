import { Link } from 'react-router-dom';
import { ArrowRight, MapPinned } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <MapPinned size={34} />
      <p className="eyebrow">المسار غير موجود</p>
      <h1>يبدو أن المسار تحرك.</h1>
      <p>ارجع إلى لوحة التشغيل واختر المساحة المناسبة.</p>
      <Link className="button button-primary" to="/"><ArrowRight size={17} /> العودة للوحة</Link>
    </div>
  );
}
