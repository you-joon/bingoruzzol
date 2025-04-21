import { Suspense } from "react";
import SinglePlayerGame from "./SinglePlayerGame";

export default function Page() {
  return (
    <Suspense fallback={<div>로딩 중입니다...</div>}>
      <SinglePlayerGame />
    </Suspense>
  );
} 