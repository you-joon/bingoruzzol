import { Suspense } from "react";
import GameClient from "./GameClient";

export default function Page() {
  return (
    <Suspense fallback={<div>로딩 중입니다...</div>}>
      <GameClient />
    </Suspense>
  );
} 