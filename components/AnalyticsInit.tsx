'use client';

import { useEffect } from 'react';
import { getAnalyticsInstance } from '@/lib/firebase';

export default function AnalyticsInit() {
  useEffect(() => {
    getAnalyticsInstance();
  }, []);

  return null;
}
