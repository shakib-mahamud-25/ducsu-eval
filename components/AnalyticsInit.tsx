'use client';

import { useEffect } from 'react';
import { getAnalyticsInstance } from '@/lib/firebase';

// Renders nothing — just triggers Analytics initialization once the app
// is mounted in the browser. Kept separate from layout.tsx because that
// file is a Server Component and can't use hooks directly.
export default function AnalyticsInit() {
  useEffect(() => {
    getAnalyticsInstance();
  }, []);

  return null;
}
