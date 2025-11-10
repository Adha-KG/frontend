import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  username: string;
  onRefresh: () => void;
  onLogout: () => void;
}

export function Header({ username, onRefresh, onLogout }: HeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Chat with your PDFs</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {username}! Upload PDFs and start chatting with AI
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
