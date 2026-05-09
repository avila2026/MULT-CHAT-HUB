/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BookOpen, Menu, Users } from 'lucide-react';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentConfig from './components/AgentConfig';
import ManualModal from './components/ManualModal';
import { Button } from './components/ui/Button';
import { IconButton } from './components/ui/IconButton';
import { Drawer } from './components/ui/Drawer';
import { ConfirmDialogProvider } from './components/ui/ConfirmDialog';
import { useDisclosure } from './hooks/useDisclosure';
import { useIsMobile, useIsTablet } from './hooks/useMediaQuery';

export default function App() {
  const manual = useDisclosure();
  const sidebarDrawer = useDisclosure();
  const agentDrawer = useDisclosure();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <ConfirmDialogProvider>
      <ChatProvider>
        <div className="h-dvh w-full bg-zinc-50 flex flex-col font-sans overflow-hidden text-zinc-900 selection:bg-indigo-100 selection:text-indigo-900">
          <header className="flex-none bg-white border-b border-zinc-200 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              {isMobile && (
                <IconButton
                  aria-label="Abrir menu de canais"
                  icon={<Menu className="w-5 h-5" />}
                  onClick={sidebarDrawer.open}
                />
              )}
              <h1 className="text-base sm:text-xl font-bold flex items-center gap-2 sm:gap-3 tracking-tight text-zinc-800 truncate">
                <img
                  src={`${import.meta.env.BASE_URL}logo.svg`}
                  alt=""
                  aria-hidden="true"
                  className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
                />
                <span className="truncate">
                  <span className="text-indigo-900">MULT-</span>
                  <span className="text-emerald-500">CHAT</span>
                  <span className="text-indigo-900">-HUB</span>
                  <span className="hidden md:inline text-zinc-400 font-normal text-sm ml-2">Hub de Colaboração Multi-IA</span>
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                icon={<BookOpen className="w-4 h-4" />}
                onClick={manual.open}
                className="hidden sm:inline-flex"
              >
                Manual APIs
              </Button>
              <IconButton
                aria-label="Manual de APIs"
                icon={<BookOpen className="w-5 h-5" />}
                onClick={manual.open}
                className="sm:hidden"
              />
              {isTablet && (
                <IconButton
                  aria-label="Agentes e gateway"
                  icon={<Users className="w-5 h-5" />}
                  onClick={agentDrawer.open}
                />
              )}
            </div>
          </header>

          <main className="flex-1 flex overflow-hidden">
            {/* Sidebar: aside fixo em >=md, drawer em <md */}
            <aside className="hidden md:flex bg-white border-r border-zinc-200 w-[280px] lg:w-[300px] overflow-y-auto flex-col">
              <Sidebar />
            </aside>

            <Drawer
              isOpen={isMobile && sidebarDrawer.isOpen}
              onClose={sidebarDrawer.close}
              side="left"
              title="Canais & Estado"
              width="280px"
            >
              <div className="p-4">
                <Sidebar />
              </div>
            </Drawer>

            <ChatArea />

            {/* AgentConfig: aside fixo em >=lg, drawer flutuante em <lg */}
            <aside className="hidden lg:flex bg-white border-l border-zinc-200 w-[340px] xl:w-[360px] overflow-y-auto flex-col">
              <AgentConfig />
            </aside>

            <Drawer
              isOpen={isTablet && agentDrawer.isOpen}
              onClose={agentDrawer.close}
              side="right"
              title="Agentes & Gateway"
              width="340px"
            >
              <div className="p-4">
                <AgentConfig />
              </div>
            </Drawer>
          </main>

          <ManualModal isOpen={manual.isOpen} onClose={manual.close} />
        </div>
      </ChatProvider>
    </ConfirmDialogProvider>
  );
}
