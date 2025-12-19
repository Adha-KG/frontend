"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  quizAPI,
  type QuizResponse,
  type QuizAttemptResponse,
} from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Check,
} from "lucide-react";

export default function QuizAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const attemptId = params.attemptId as string;

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [attempt, setAttempt] = useState<QuizAttemptResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(
    new Set(),
  );

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else if (quizId && attemptId) {
      loadQuizAndAttempt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, quizId, attemptId]);

  const loadQuizAndAttempt = async () => {
    try {
      const [quizData, attemptData] = await Promise.all([
        quizAPI.getQuiz(quizId),
        quizAPI.getAttempt(attemptId),
      ]);

      if (quizData.status !== "ready") {
        setError("Quiz is not ready");
        return;
      }

      if (!quizData.questions) {
        setError("Quiz questions not available");
        return;
      }

      if (attemptData.status !== "in_progress") {
        // Redirect to results if already completed
        router.push(
          `/dashboard/quizzes/${quizId}/attempt/${attemptId}/results`,
        );
        return;
      }

      setQuiz(quizData);
      setAttempt(attemptData);

      // Initialize selected answers from existing answers
      const existingAnswers: Record<string, number> = {};
      const answered: Set<string> = new Set();
      if (attemptData.answers) {
        attemptData.answers.forEach((answer) => {
          if (answer.selected_answer != null) {
            existingAnswers[answer.question_id] = answer.selected_answer;
            answered.add(answer.question_id);
          }
        });
      }
      setSelectedAnswers(existingAnswers);
      setAnsweredQuestions(answered);

      // Calculate time remaining
      if (attemptData.time_spent_seconds !== undefined) {
        const totalSeconds = quizData.time_limit_minutes * 60;
        const remaining = totalSeconds - attemptData.time_spent_seconds;
        setTimeRemaining(Math.max(0, remaining));
      } else {
        setTimeRemaining(quizData.time_limit_minutes * 60);
      }

      // Start timer
      startTimer();
    } catch (err: unknown) {
      console.error("Failed to load quiz:", err);
      setError(err instanceof Error ? err.message : "Failed to load quiz");
    }
  };

  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleTimeout = async () => {
    if (!attempt || isCompleting || !quiz || !quiz.questions) return;

    setIsCompleting(true);
    try {
      // Submit all pending answers before completing
      const totalTimeSpent = quiz.time_limit_minutes * 60;
      const submitPromises = quiz.questions
        .filter((q) => selectedAnswers[q.id] !== undefined)
        .map((q) =>
          quizAPI
            .submitAnswer(
              attemptId,
              q.id,
              selectedAnswers[q.id],
              totalTimeSpent,
            )
            .catch((err) => {
              console.error(
                `Failed to submit answer for question ${q.id}:`,
                err,
              );
              // Continue even if some submissions fail
            }),
        );

      await Promise.all(submitPromises);

      await quizAPI.completeAttempt(attemptId, totalTimeSpent);
      router.push(`/dashboard/quizzes/${quizId}/attempt/${attemptId}/results`);
    } catch (err: unknown) {
      console.error("Failed to complete attempt:", err);
      setError(err instanceof Error ? err.message : "Failed to complete quiz");
      setIsCompleting(false);
    }
  };

  const handleAnswerSelect = async (
    questionId: string,
    answerIndex: number,
  ) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
    setAnsweredQuestions((prev) => new Set(prev).add(questionId));

    // Auto-submit answer when selected
    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      await quizAPI.submitAnswer(attemptId, questionId, answerIndex, timeSpent);
    } catch (err: unknown) {
      console.error("Failed to submit answer:", err);
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    }
  };

  const handleComplete = async () => {
    if (!attempt || isCompleting || !quiz || !quiz.questions) return;

    if (
      !confirm(
        "Are you sure you want to complete the quiz? You won't be able to change your answers.",
      )
    ) {
      return;
    }

    setIsCompleting(true);
    try {
      // Submit all pending answers before completing
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const submitPromises = quiz.questions
        .filter((q) => selectedAnswers[q.id] !== undefined)
        .map((q) =>
          quizAPI
            .submitAnswer(attemptId, q.id, selectedAnswers[q.id], timeSpent)
            .catch((err) => {
              console.error(
                `Failed to submit answer for question ${q.id}:`,
                err,
              );
              // Continue even if some submissions fail
            }),
        );

      await Promise.all(submitPromises);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      await quizAPI.completeAttempt(attemptId, timeSpent);
      router.push(`/dashboard/quizzes/${quizId}/attempt/${attemptId}/results`);
    } catch (err: unknown) {
      console.error("Failed to complete attempt:", err);
      setError(err instanceof Error ? err.message : "Failed to complete quiz");
      setIsCompleting(false);
    }
  };

  const handleAbandon = async () => {
    if (!confirm("Are you sure you want to abandon this quiz attempt?")) {
      return;
    }

    try {
      await quizAPI.abandonAttempt(attemptId);
      router.push(`/dashboard/quizzes/${quizId}`);
    } catch (err: unknown) {
      console.error("Failed to abandon attempt:", err);
      setError(err instanceof Error ? err.message : "Failed to abandon quiz");
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!quiz || !attempt || !quiz.questions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = answeredQuestions.size;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isTimeUp = timeRemaining !== null && timeRemaining <= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Timer */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAbandon}
                disabled={isCompleting}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Abandon
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-bold">{quiz.title || "Quiz"}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock
                  className={`h-5 w-5 ${
                    timeRemaining !== null && timeRemaining < 300
                      ? "text-destructive animate-pulse"
                      : ""
                  }`}
                />
                <span
                  className={`text-lg font-bold ${
                    timeRemaining !== null && timeRemaining < 300
                      ? "text-destructive"
                      : ""
                  }`}
                >
                  {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
                </span>
              </div>
              {isTimeUp && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Time&apos;s up! Submitting...
                  </AlertDescription>
                </Alert>
              )}
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">
                      Question {currentQuestion.question_number}
                    </CardTitle>
                    <p className="text-base font-medium">
                      {currentQuestion.question_text}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={
                      flaggedQuestions.has(currentQuestion.id)
                        ? "text-primary"
                        : ""
                    }
                  >
                    <Flag
                      className={`h-4 w-4 ${
                        flaggedQuestions.has(currentQuestion.id)
                          ? "fill-current"
                          : ""
                      }`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedAnswers[currentQuestion.id]?.toString() || ""}
                  onValueChange={(value) =>
                    handleAnswerSelect(currentQuestion.id, parseInt(value))
                  }
                  disabled={isTimeUp || isCompleting}
                >
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 p-4 border rounded-lg mb-2 cursor-pointer transition-colors ${
                        selectedAnswers[currentQuestion.id] === index
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        !isTimeUp &&
                        !isCompleting &&
                        handleAnswerSelect(currentQuestion.id, index)
                      }
                    >
                      <RadioGroupItem
                        value={index.toString()}
                        id={`option-${index}`}
                      />
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                      {selectedAnswers[currentQuestion.id] === index && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentQuestionIndex === 0 || isCompleting}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  {!isLastQuestion ? (
                    <Button
                      onClick={() =>
                        setCurrentQuestionIndex((prev) =>
                          Math.min(totalQuestions - 1, prev + 1),
                        )
                      }
                      disabled={isCompleting}
                      className="flex-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleComplete}
                      disabled={isCompleting || isTimeUp}
                      className="flex-1"
                    >
                      {isCompleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Complete Quiz
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-sm">Questions</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {answeredCount} of {totalQuestions} answered
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {quiz.questions.map((question, index) => {
                    const isAnswered = answeredQuestions.has(question.id);
                    const isFlagged = flaggedQuestions.has(question.id);
                    const isCurrent = index === currentQuestionIndex;

                    return (
                      <button
                        key={question.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        disabled={isCompleting}
                        className={`aspect-square rounded-md text-xs font-medium transition-colors ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : isAnswered
                              ? "bg-green-500/20 text-green-600 border border-green-500/30"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                        } ${isFlagged ? "ring-2 ring-primary" : ""}`}
                        title={`Question ${index + 1}${isFlagged ? " (Flagged)" : ""}`}
                      >
                        {index + 1}
                        {isFlagged && (
                          <Flag className="h-2 w-2 mx-auto mt-0.5 fill-current" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-muted" />
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span>Current</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
