'use client';

import dynamic from 'next/dynamic';

// Dynamically import SplitView to avoid server-side rendering issues with panels/window
const SplitView = dynamic(() => import('@/components/Layout/SplitView'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <SplitView />
    </main>
  );
}
