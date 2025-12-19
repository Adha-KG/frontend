"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  quizAPI,
  documentsAPI,
  type Document,
  type QuizStreamEvent,
} from "@/lib/api";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  ChevronLeft,
  FileText,
  CheckCircle2,
} from "lucide-react";

export default function GenerateQuizPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [title, setTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamMessage, setStreamMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      loadDocuments();
    }
  }, [router]);

  const loadDocuments = async () => {
    try {
      const docs = await documentsAPI.getDocuments();
      // Only show documents with completed embedding status
      const completedDocs = docs.filter(
        (doc) => doc.embedding_status === "completed",
      );
      setDocuments(completedDocs);
    } catch (err: unknown) {
      console.error("Failed to load documents:", err);
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
  };

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId],
    );
  };

  const handleGenerate = async () => {
    if (selectedDocuments.length === 0) {
      setError("Please select at least one document");
      return;
    }

    if (numQuestions < 1 || numQuestions > 50) {
      setError("Number of questions must be between 1 and 50");
      return;
    }

    if (timeLimitMinutes < 1 || timeLimitMinutes > 180) {
      setError("Time limit must be between 1 and 180 minutes");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStreamStatus(null);
    setStreamMessage(null);

    try {
      const quiz = await quizAPI.generateQuizStream(
        {
          document_ids: selectedDocuments,
          num_questions: numQuestions,
          time_limit_minutes: timeLimitMinutes,
          difficulty: difficulty,
          title: title || undefined,
        },
        (event: QuizStreamEvent) => {
          setStreamStatus(event.status);
          if (event.message) {
            setStreamMessage(event.message);
          }
        },
      );

      // Redirect to quiz detail page
      router.push(`/dashboard/quizzes/${quiz.id}`);
    } catch (err: unknown) {
      console.error("Failed to generate quiz:", err);
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
      setIsGenerating(false);
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "creating":
        return "Creating quiz...";
      case "searching":
        return "Searching documents...";
      case "processing":
        return "Processing content...";
      case "generating":
        return "Generating questions...";
      case "saving":
        return "Saving quiz...";
      case "complete":
        return "Quiz generated successfully!";
      default:
        return "Processing...";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
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
              <h1 className="text-2xl font-bold">Generate Quiz</h1>
              <p className="text-sm text-muted-foreground">
                Create an AI-powered quiz from your documents
              </p>
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

        {isGenerating && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">
                    {streamStatus
                      ? getStatusMessage(streamStatus)
                      : "Generating quiz..."}
                  </p>
                  {streamMessage && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {streamMessage}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quiz Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title (Optional)</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Biology Chapter 5 Quiz"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="num-questions">
                    Number of Questions: {numQuestions}
                  </Label>
                  <Input
                    id="num-questions"
                    type="number"
                    min="1"
                    max="50"
                    value={numQuestions}
                    onChange={(e) =>
                      setNumQuestions(parseInt(e.target.value) || 1)
                    }
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Between 1 and 50 questions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-limit">
                    Time Limit (minutes): {timeLimitMinutes}
                  </Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min="1"
                    max="180"
                    value={timeLimitMinutes}
                    onChange={(e) =>
                      setTimeLimitMinutes(parseInt(e.target.value) || 1)
                    }
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Between 1 and 180 minutes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as const).map((level) => (
                      <Button
                        key={level}
                        variant={difficulty === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDifficulty(level)}
                        disabled={isGenerating}
                        className="capitalize"
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Documents</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose documents to generate questions from
                </p>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No documents available. Upload documents first.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => router.push("/dashboard")}
                    >
                      Go to Documents
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`doc-${doc.id}`}
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={() => handleDocumentToggle(doc.id)}
                          disabled={isGenerating}
                        />
                        <Label
                          htmlFor={`doc-${doc.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {doc.original_filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Selected Documents</p>
                  <p className="text-2xl font-bold">
                    {selectedDocuments.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDocuments.length === 0
                      ? "Select at least one document"
                      : selectedDocuments.length === 1
                        ? "document selected"
                        : "documents selected"}
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Quiz Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions:</span>
                      <span className="font-medium">{numQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time Limit:</span>
                      <span className="font-medium">
                        {timeLimitMinutes} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Difficulty:</span>
                      <span className="font-medium capitalize">
                        {difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={handleGenerate}
                  disabled={
                    isGenerating ||
                    selectedDocuments.length === 0 ||
                    documents.length === 0
                  }
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>

                {selectedDocuments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Select documents to continue
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
