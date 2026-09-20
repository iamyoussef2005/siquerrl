'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-xs font-medium">
      جاري التوجيه إلى لوحة تحكم المدير...
    </div>
  );
}
