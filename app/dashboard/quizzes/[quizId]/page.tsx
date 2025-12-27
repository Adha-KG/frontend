"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  quizAPI,
  type QuizResponse,
  type QuizAttemptListResponse,
} from "@/lib/api";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Clock,
  FileText,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  History,
} from "lucide-react";

export default function QuizDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [quizData, attemptsData] = await Promise.all([
        quizAPI.getQuiz(quizId),
        quizAPI.getQuizAttempts(quizId),
      ]);
      setQuiz(quizData);
      setAttempts(attemptsData);
    } catch (err: unknown) {
      console.error("Failed to load quiz:", err);
      setError(err instanceof Error ? err.message : "Failed to load quiz");
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    // Check for access_token first (new system), then fall back to token (old system)
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      router.push("/auth/sign-in");
    } else if (quizId) {
      loadQuiz();
    }
  }, [router, quizId, loadQuiz]);

  // Poll for quiz status if generating
  useEffect(() => {
    if (!quiz || quiz.status !== "generating") return;

    const interval = setInterval(() => {
      loadQuiz();
    }, 5000);

    return () => clearInterval(interval);
  }, [quiz, loadQuiz]);

  const handleStartAttempt = async () => {
    if (!quiz) return;

    setIsStarting(true);
    setError(null);

    try {
      const attempt = await quizAPI.startAttempt(quizId);
      router.push(`/dashboard/quizzes/${quizId}/attempt/${attempt.id}`);
    } catch (err: unknown) {
      console.error("Failed to start attempt:", err);
      setError(err instanceof Error ? err.message : "Failed to start quiz");
      setIsStarting(false);
    }
  };

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

  const getAttemptStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-600";
      case "in_progress":
        return "bg-primary/10 text-primary";
      case "timeout":
      case "abandoned":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Quiz not found or failed to load
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
                onClick={() => router.push("/dashboard/quizzes")}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <BookOpen className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">
                  {quiz.title || `Quiz ${quiz.num_questions} Questions`}
                </h1>
                <p className="text-sm text-muted-foreground">Quiz Details</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadQuiz}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quiz Status */}
        {quiz.status === "generating" && (
          <Alert className="mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Quiz is being generated. This page will update automatically when
              ready.
            </AlertDescription>
          </Alert>
        )}

        {quiz.status === "failed" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Quiz generation failed. Please try generating a new quiz.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quiz Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Quiz Information</CardTitle>
                  <Badge
                    variant="outline"
                    className={getStatusColor(quiz.status)}
                  >
                    <span className="flex items-center gap-1">
                      {getStatusIcon(quiz.status)}
                      {quiz.status}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="text-2xl font-bold">{quiz.num_questions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Limit</p>
                    <p className="text-2xl font-bold">
                      {quiz.time_limit_minutes} min
                    </p>
                  </div>
                </div>

                {quiz.difficulty && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Difficulty
                    </p>
                    <Badge variant="outline" className="capitalize">
                      {quiz.difficulty}
                    </Badge>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Documents Used
                  </p>
                  <p className="text-sm">
                    {quiz.document_ids.length}{" "}
                    {quiz.document_ids.length === 1 ? "document" : "documents"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">
                    {new Date(quiz.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Past Attempts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Past Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attempts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No attempts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (attempt.status === "completed") {
                            router.push(
                              `/dashboard/quizzes/${quizId}/attempt/${attempt.id}/results`,
                            );
                          } else if (attempt.status === "in_progress") {
                            router.push(
                              `/dashboard/quizzes/${quizId}/attempt/${attempt.id}`,
                            );
                          }
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={getAttemptStatusColor(attempt.status)}
                            >
                              {attempt.status.replace("_", " ")}
                            </Badge>
                            {attempt.score !== undefined && (
                              <span className="text-sm font-medium">
                                {attempt.score}/{attempt.total_questions}{" "}
                                correct
                              </span>
                            )}
                            {attempt.percentage_score != null && (
                              <span className="text-sm text-muted-foreground">
                                ({attempt.percentage_score.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Started:{" "}
                            {new Date(attempt.started_at).toLocaleString()}
                          </p>
                          {attempt.completed_at && (
                            <p className="text-xs text-muted-foreground">
                              Completed:{" "}
                              {new Date(attempt.completed_at).toLocaleString()}
                            </p>
                          )}
                          {attempt.time_spent_seconds && (
                            <p className="text-xs text-muted-foreground">
                              Time: {formatTime(attempt.time_spent_seconds)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Start Quiz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quiz.status === "ready" ? (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{quiz.num_questions} questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{quiz.time_limit_minutes} minutes</span>
                      </div>
                    </div>

                    <Separator />

                    <Button
                      onClick={handleStartAttempt}
                      disabled={isStarting}
                      className="w-full"
                      size="lg"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Quiz
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      You can only have one active attempt at a time
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      {quiz.status === "generating"
                        ? "Quiz is being generated. Please wait..."
                        : "Quiz is not ready to start"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
