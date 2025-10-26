'use client';

import { ChatSession } from '../lib/types';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
  return (
    <div className="w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col border-r border-gray-800">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 dark:bg-gray-900 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-lg px-4 py-3 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative rounded-lg transition-colors ${
              session.id === currentSessionId
                ? 'bg-gray-800 dark:bg-gray-900'
                : 'hover:bg-gray-800 dark:hover:bg-gray-900'
            }`}
          >
            <button
              onClick={() => onSelectSession(session.id)}
              className="w-full text-left px-3 py-3 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="text-sm truncate text-gray-200 dark:text-gray-300">
                {session.title}
              </span>
            </button>
            
            {onDeleteSession && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700 dark:hover:bg-gray-800 transition-all"
                aria-label="Delete chat"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-800 dark:border-gray-900">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          AI Chat Application v1.0
        </p>
      </div>
    </div>
  );
}