"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  documentsAPI,
  statsAPI,
  authAPI,
  type Document,
  type UserStats,
  type User,
} from "@/lib/api";

import {
  BookOpen,
  MessageSquare,
  Upload,
  FileText,
  LogOut,
  Settings,
  Clock,
  BookOpenCheck,
  Brain,
  ChevronRight,
  Trash2,
  AlertCircle,
  Menu,
  X,
  Home,
  MessageCircle,
  CreditCard,
  StickyNote,
} from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch data with better error handling
      const [userProfile, userDocuments, userStats] = await Promise.allSettled([
        authAPI.getCurrentUser(),
        documentsAPI.getDocuments(),
        statsAPI.getUserStats(),
      ]).then((results) => {
        const userResult = results[0];
        const docsResult = results[1];
        const statsResult = results[2];

        // Handle user profile - required, so throw if failed
        if (userResult.status === "rejected") {
          const errorMsg =
            userResult.reason instanceof Error
              ? userResult.reason.message
              : "Failed to load user profile";
          throw new Error(errorMsg);
        }

        // Handle documents - optional, return empty array if failed
        const documents =
          docsResult.status === "fulfilled"
            ? docsResult.value
            : (console.error("Error fetching documents:", docsResult.reason),
              [] as Document[]);

        // Handle stats - optional, return null if failed
        const stats =
          statsResult.status === "fulfilled"
            ? statsResult.value
            : (console.error("Error fetching stats:", statsResult.reason),
              null);

        return [userResult.value, documents, stats] as [
          User,
          Document[],
          UserStats | null,
        ];
      });

      setUser(userProfile);
      setDocuments(userDocuments);
      setStats(userStats);
    } catch (err: unknown) {
      console.error("Error fetching dashboard data:", err);
      if (
        err instanceof Error &&
        (err.message.includes("401") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("403"))
      ) {
        handleLogout();
      } else {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data. Please check your connection and try again.";
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for access_token first (new system), then fall back to token (old system)
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      router.push("/auth/sign-in");
      return;
    }

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleLogout = () => {
    // Clear both old and new token keys
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("tokenType");
    localStorage.removeItem("userId");
    router.push("/auth/sign-in");
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await documentsAPI.deleteDocument(documentId);
      const updatedDocuments = await documentsAPI.getDocuments();
      setDocuments(updatedDocuments);
      const updatedStats = await statsAPI.getUserStats();
      setStats(updatedStats);
    } catch {
      setError("Failed to delete document. Please try again.");
    }
  };

  const navigateToModule = (
    module: "reader" | "chat" | "flashcard" | "notes",
  ) => {
    if (module === "reader") {
      router.push("/dashboard/pdf_Reader");
    } else if (module === "chat") {
      router.push("/dashboard/chat_page");
    } else if (module === "flashcard") {
      router.push("/dashboard/flashcards");
    } else if (module === "notes") {
      router.push("/dashboard/notes");
    }
  };

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || name.slice(0, 2).toUpperCase()
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const uploadDate = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return formatDate(dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-muted text-foreground border-border";
      case "processing":
        return "bg-muted text-foreground border-border";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden -ml-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-background" />
                </div>
                <div>
                  <h1 className="text-base font-semibold">StudyMate</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    AI Study Assistant
                  </p>
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Settings</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                  {user ? getInitials(user.username) : "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside
            className={`lg:w-64 flex-shrink-0 ${sidebarOpen ? "block" : "hidden"} lg:block`}
          >
            <nav className="space-y-1">
              <Card>
                <CardContent className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigateToModule("chat");
                      setSidebarOpen(false);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with PDFs
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigateToModule("reader");
                      setSidebarOpen(false);
                    }}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    PDF Reader
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigateToModule("flashcard");
                      setSidebarOpen(false);
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Flashcards
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigateToModule("notes");
                      setSidebarOpen(false);
                    }}
                  >
                    <StickyNote className="h-4 w-4 mr-2" />
                    AI Notes
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      router.push("/dashboard/quizzes");
                      setSidebarOpen(false);
                    }}
                  >
                    <BookOpenCheck className="h-4 w-4 mr-2" />
                    Quizzes
                  </Button>
                  {/* <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Documents
                  </Button> */}
                </CardContent>
              </Card>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8">
            {/* Welcome Section */}
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold tracking-tight">
                Welcome back, {user?.username || "User"}
              </h2>
              <p className="text-muted-foreground">
                Here is an overview of your documents and activities
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span className="flex-1">{error}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDashboardData()}
                    className="flex-shrink-0"
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Total Documents
                        </p>
                        <p className="text-3xl font-semibold">
                          {stats.total_documents}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Completed
                        </p>
                        <p className="text-3xl font-semibold">
                          {stats.documents_by_status.completed}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <BookOpenCheck className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Processing
                        </p>
                        <p className="text-3xl font-semibold">
                          {stats.documents_by_status.processing}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Clock className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Chat Sessions
                        </p>
                        <p className="text-3xl font-semibold">
                          {stats.total_chat_sessions}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Module Cards - Left Column (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Note Taking Module */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border"
                      onClick={() => navigateToModule("reader")}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <BookOpenCheck className="h-6 w-6 text-foreground" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">
                          PDF Reader
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Read and annotate your PDFs with advanced note-taking
                          features
                        </p>
                      </CardContent>
                    </Card>

                    {/* PDF Chat Module */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border"
                      onClick={() => navigateToModule("chat")}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <Brain className="h-6 w-6 text-foreground" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">AI Chat</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Chat with your PDFs using advanced AI-powered
                          conversational interface
                        </p>
                      </CardContent>
                    </Card>

                    {/* Flashcard Module */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border"
                      onClick={() => navigateToModule("flashcard")}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-foreground" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">
                          Smart Flashcards
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Generate intelligent flashcards from your PDF content
                          automatically
                        </p>
                      </CardContent>
                    </Card>

                    {/* AI Notes Module */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border"
                      onClick={() => navigateToModule("notes")}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <StickyNote className="h-6 w-6 text-foreground" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">
                          AI Notes Generator
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Transform PDFs into comprehensive study notes with
                          customizable styles
                        </p>
                      </CardContent>
                    </Card>

                    {/* Upload New */}
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border border-dashed"
                      onClick={() => navigateToModule("chat")}
                    >
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                          <Upload className="h-6 w-6 text-foreground" />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">
                          Upload PDFs
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Add new documents to your library
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Recent Documents - Right Column (1/3 width) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-tight">
                    Recent Documents
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToModule("chat")}
                    className="hidden sm:flex"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-6">
                    {documents.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h4 className="text-base font-semibold mb-2">
                          No documents yet
                        </h4>
                        <p className="text-sm text-muted-foreground mb-6">
                          Upload your first PDF to get started
                        </p>
                        <Button
                          onClick={() => navigateToModule("chat")}
                          variant="default"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Your First PDF
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.slice(0, 6).map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                <FileText className="h-4 w-4 text-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {doc.original_filename}
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{getTimeAgo(doc.created_at)}</span>
                                  </span>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(doc.embedding_status)}`}
                              >
                                {doc.embedding_status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDocument(doc.id);
                                }}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {documents.length > 6 && (
                          <Button
                            variant="ghost"
                            className="w-full mt-2"
                            onClick={() => navigateToModule("reader")}
                          >
                            View All {documents.length} Documents
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
