import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface ActiveSessionInfoProps {
  currentSessionId: string | null;
  selectedDocumentsCount: number;
  onClearSession: () => void;
}

export function ActiveSessionInfo({
  currentSessionId,
  selectedDocumentsCount,
  onClearSession,
}: ActiveSessionInfoProps) {
  if (!currentSessionId || selectedDocumentsCount === 0) return null;

  return (
    <Card className="bg-primary/5 border-primary/20 mb-4 flex-shrink-0">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-full">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Active Chat Session</p>
              <p className="text-xs text-muted-foreground">
                {selectedDocumentsCount} document
                {selectedDocumentsCount > 1 ? "s" : ""} available for queries
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSession}
            className="text-xs"
          >
            Clear Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
