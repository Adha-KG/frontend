"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { quizAPI, type QuizListResponse } from "@/lib/api";
import {
  BookOpen,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";

export default function QuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await quizAPI.getQuizzes();
      setQuizzes(data);
    } catch (err: unknown) {
      console.error("Failed to load quizzes:", err);
      setError(err instanceof Error ? err.message : "Failed to load quizzes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      loadQuizzes();
    }
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "generating":
        return "bg-primary/10 text-primary border-primary/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "generating") {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    if (status === "ready") {
      return <CheckCircle2 className="h-3 w-3" />;
    }
    if (status === "failed") {
      return <XCircle className="h-3 w-3" />;
    }
    return null;
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/10 text-green-600";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600";
      case "hard":
        return "bg-red-500/10 text-red-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <BookOpen className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Quizzes</h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered quizzes from your documents
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadQuizzes}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={() => router.push("/dashboard/quizzes/generate")}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-sm text-muted-foreground">
              Loading quizzes...
            </p>
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="h-[600px] flex items-center justify-center">
            <CardContent className="text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Quizzes Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first quiz from your documents
              </p>
              <Button
                onClick={() => router.push("/dashboard/quizzes/generate")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/quizzes/${quiz.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex-1">
                      {quiz.title || `Quiz ${quiz.num_questions} Questions`}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStatusColor(quiz.status)}`}
                    >
                      <span className="flex items-center gap-1">
                        {getStatusIcon(quiz.status)}
                        {quiz.status}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{quiz.num_questions} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.time_limit_minutes} min</span>
                    </div>
                  </div>

                  {quiz.difficulty && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${getDifficultyColor(quiz.difficulty)}`}
                    >
                      {quiz.difficulty}
                    </Badge>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p>
                      Created: {new Date(quiz.created_at).toLocaleDateString()}
                    </p>
                    <p>
                      Documents: {quiz.document_ids.length}{" "}
                      {quiz.document_ids.length === 1
                        ? "document"
                        : "documents"}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/quizzes/${quiz.id}`);
                    }}
                    disabled={quiz.status !== "ready"}
                  >
                    {quiz.status === "ready" ? (
                      <>
                        View Quiz
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    ) : quiz.status === "generating" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Failed"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
