import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import type { ChatSession } from "@/lib/api";

interface ChatSessionsListProps {
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
}

export function ChatSessionsList({
  chatSessions,
  currentSessionId,
  onSwitchSession,
  onDeleteSession,
  onCreateNewSession,
}: ChatSessionsListProps) {
  return (
    <Card className="flex-shrink-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat Sessions
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNewSession}
            className="p-1"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-48 overflow-y-auto pt-0">
        {chatSessions.length === 0 ? (
          <div className="text-center py-3 text-muted-foreground">
            <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No chat sessions yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer
                  ${
                    currentSessionId === session.id
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                onClick={() => onSwitchSession(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {session.session_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.message_count} messages
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="p-1 h-auto text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
