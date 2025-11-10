import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  isSending: boolean;
  completedDocumentsCount: number;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChatInput({
  prompt,
  setPrompt,
  isSending,
  completedDocumentsCount,
  onSubmit,
}: ChatInputProps) {
  return (
    <div className="mt-4 flex-shrink-0">
      <form onSubmit={onSubmit} className="flex items-center gap-4">
        <Input
          type="text"
          placeholder={
            completedDocumentsCount === 0
              ? "Upload and process PDFs first to start chatting..."
              : "Ask me anything about your documents..."
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isSending || completedDocumentsCount === 0}
          className="flex-1 h-16 px-6 py-4 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm placeholder:text-lg"
          style={{
            fontSize: "1.125rem", // 18px - More reasonable size
            lineHeight: "1.75rem",
          }}
        />
        <Button
          type="submit"
          disabled={
            !prompt.trim() || isSending || completedDocumentsCount === 0
          }
          size="lg"
          className="px-6 h-16 text-lg font-medium rounded-xl"
        >
          {isSending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Send className="w-6 h-6" />
          )}
        </Button>
      </form>
    </div>
  );
}
