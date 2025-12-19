"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  quizAPI,
  type QuizResponse,
  type QuizAttemptResponse,
} from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Clock,
  Trophy,
  BookOpen,
  ArrowLeft,
} from "lucide-react";

export default function QuizResultsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const attemptId = params.attemptId as string;

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [attempt, setAttempt] = useState<QuizAttemptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else if (quizId && attemptId) {
      loadResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, quizId, attemptId]);

  const loadResults = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [quizData, attemptData] = await Promise.all([
        quizAPI.getQuiz(quizId),
        quizAPI.getAttempt(attemptId),
      ]);

      if (quizData.status !== "ready") {
        setError("Quiz is not available");
        return;
      }

      if (!quizData.questions) {
        setError("Quiz questions not available");
        return;
      }

      if (attemptData.status === "in_progress") {
        // Redirect back to attempt if still in progress
        router.push(`/dashboard/quizzes/${quizId}/attempt/${attemptId}`);
        return;
      }

      setQuiz(quizData);
      setAttempt(attemptData);
    } catch (err: unknown) {
      console.error("Failed to load results:", err);
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  };

  const getAnswerForQuestion = (questionId: string) => {
    if (!attempt?.answers) return null;
    return attempt.answers.find((a) => a.question_id === questionId);
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (percentage?: number) => {
    if (!percentage) return "";
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || !attempt || !quiz.questions) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Results not available"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const correctCount = attempt.score || 0;
  const totalQuestions = attempt.total_questions;
  const percentage = attempt.percentage_score || 0;

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
                onClick={() => router.push(`/dashboard/quizzes/${quizId}`)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Quiz
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Quiz Results</h1>
                <p className="text-sm text-muted-foreground">
                  {quiz.title || "Quiz Results"}
                </p>
              </div>
            </div>
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

        {/* Score Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-primary" />
                <div className="text-6xl font-bold mb-2">
                  <span className={getScoreColor(percentage)}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-2xl font-semibold mb-4">
                  {correctCount} / {totalQuestions} Correct
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(attempt.time_spent_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{totalQuestions} questions</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge
                  variant="outline"
                  className={
                    attempt.status === "completed"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-muted"
                  }
                >
                  {attempt.status.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Started</p>
                <p className="text-sm font-medium">
                  {new Date(attempt.started_at).toLocaleString()}
                </p>
              </div>
              {attempt.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Completed
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(attempt.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions Review */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review your answers and explanations
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quiz.questions.map((question) => {
                const answer = getAnswerForQuestion(question.id);
                const isCorrect = answer?.is_correct ?? false;
                const selectedAnswer =
                  answer?.selected_answer !== undefined
                    ? answer.selected_answer
                    : null;

                return (
                  <Card
                    key={question.id}
                    className={`${
                      isCorrect
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              Question {question.question_number}
                            </Badge>
                            {isCorrect ? (
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Correct
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Incorrect
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base">
                            {question.question_text}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = selectedAnswer === optionIndex;
                          const isCorrectAnswer =
                            question.correct_answer === optionIndex;

                          return (
                            <div
                              key={optionIndex}
                              className={`p-3 border rounded-lg ${
                                isCorrectAnswer
                                  ? "border-green-500 bg-green-500/10"
                                  : isSelected && !isCorrectAnswer
                                    ? "border-red-500 bg-red-500/10"
                                    : "border-border"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrectAnswer && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                {isSelected && !isCorrectAnswer && (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span
                                  className={`flex-1 ${
                                    isCorrectAnswer
                                      ? "font-semibold text-green-700"
                                      : isSelected && !isCorrectAnswer
                                        ? "font-semibold text-red-700"
                                        : ""
                                  }`}
                                >
                                  {option}
                                </span>
                                {isCorrectAnswer && (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500/20"
                                  >
                                    Correct Answer
                                  </Badge>
                                )}
                                {isSelected && !isCorrectAnswer && (
                                  <Badge
                                    variant="outline"
                                    className="bg-red-500/20"
                                  >
                                    Your Answer
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {question.explanation && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">
                            Explanation:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {question.explanation}
                          </p>
                        </div>
                      )}

                      {answer?.time_spent_seconds && (
                        <p className="text-xs text-muted-foreground">
                          Time spent: {formatTime(answer.time_spent_seconds)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Separator className="my-6" />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/quizzes/${quizId}`)}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quiz
              </Button>
              <Button
                onClick={() => router.push("/dashboard/quizzes")}
                className="flex-1"
              >
                View All Quizzes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
