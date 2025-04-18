import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-blue-100 to-purple-100">
      <main className="flex flex-col items-center justify-center w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
          빙고 게임
        </h1>
        
        <p className="text-lg mb-8 text-center text-gray-700">
          5x5 빙고 게임을 시작해보세요!
        </p>
        
        <Link 
          href="/game" 
          className="w-full px-6 py-3 bg-blue-500 text-white font-medium rounded-lg shadow hover:bg-blue-600 transition-colors text-center"
        >
          게임 시작하기
        </Link>
      </main>
    </div>
  );
}
