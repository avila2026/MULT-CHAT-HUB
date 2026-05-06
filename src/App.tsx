/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, BookOpen } from 'lucide-react';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentConfig from './components/AgentConfig';
import ManualModal from './components/ManualModal';

export default function App() {
  const [isManualOpen, setIsManualOpen] = useState(false);

  return (
    <ChatProvider>
      <div className="h-screen w-full bg-zinc-50 flex flex-col font-sans overflow-hidden text-zinc-900 selection:bg-indigo-100 selection:text-indigo-900">
        <header className="flex-none bg-white border-b border-zinc-200 p-4 flex items-center justify-between z-10 shadow-sm relative">
          <h1 className="text-xl font-bold flex items-center gap-3 tracking-tight text-zinc-800">
            <img src="/logo.svg" alt="" aria-hidden="true" className="w-9 h-9 shrink-0" />
            <span>
              <span className="text-indigo-900">MULT-</span>
              <span className="text-emerald-500">CHAT</span>
              <span className="text-indigo-900">-HUB</span>
              <span className="text-zinc-400 font-normal text-sm ml-2">Hub de Colaboração Multi-IA</span>
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsManualOpen(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border border-indigo-200"
            >
              <BookOpen className="w-4 h-4" /> Manual APIs
            </button>
            <button className="p-2 hover:bg-zinc-100/80 rounded-full transition-colors group">
              <Settings className="w-5 h-5 text-zinc-500 group-hover:text-zinc-800 transition-colors" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <Sidebar />
          <ChatArea />
          <AgentConfig />
        </main>

        <ManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
      </div>
    </ChatProvider>
  );
}
