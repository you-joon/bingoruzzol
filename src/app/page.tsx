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
          게임 모드를 선택해주세요!
        </p>
        
        <div className="flex flex-col w-full space-y-4">
          <Link 
            href="/single" 
            className="w-full px-6 py-4 bg-blue-500 text-white font-medium rounded-lg shadow hover:bg-blue-600 transition-colors text-center"
          >
            1인용 게임
          </Link>
          
          <Link 
            href="/game" 
            className="w-full px-6 py-4 bg-purple-500 text-white font-medium rounded-lg shadow hover:bg-purple-600 transition-colors text-center"
          >
            다인용 게임
          </Link>
        </div>
      </main>
    </div>
  );
}
