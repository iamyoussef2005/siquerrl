'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs">
      جاري التوجيه إلى لوحة تحكم المدير...
    </div>
  );
}
