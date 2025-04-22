'use client';
import dynamic from 'next/dynamic';

const MultiplayerGame = dynamic(() => import('./MultiplayerGame'), {
  ssr: false,
  loading: () => <div>로딩 중입니다...</div>
});

export default function Page() {
  return <MultiplayerGame />;
}