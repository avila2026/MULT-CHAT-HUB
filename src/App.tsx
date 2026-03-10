/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Users, Settings } from 'lucide-react';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentConfig from './components/AgentConfig';

export default function App() {
  return (
    <ChatProvider>
      <div className="h-screen w-full bg-zinc-50 flex flex-col font-sans overflow-hidden text-zinc-900 selection:bg-indigo-100 selection:text-indigo-900">
        <header className="flex-none bg-white border-b border-zinc-200 p-4 flex items-center justify-between z-10 shadow-sm relative">
          <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight text-zinc-800">
            <Users className="w-6 h-6 text-indigo-600" /> 
            Hub de Colaboração <span className="text-indigo-600">Multi-IA</span>
          </h1>
          <button className="p-2 hover:bg-zinc-100/80 rounded-full transition-colors group">
            <Settings className="w-5 h-5 text-zinc-500 group-hover:text-zinc-800 transition-colors" />
          </button>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <Sidebar />
          <ChatArea />
          <AgentConfig />
        </main>
      </div>
    </ChatProvider>
  );
}
