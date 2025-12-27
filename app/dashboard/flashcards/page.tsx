"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  BookOpen,
} from "lucide-react";
import { flashcardsAPI, documentsAPI, authAPI } from "@/lib/api";
import type { Flashcard, Document } from "@/lib/api";

export default function FlashcardsPage() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [numFlashcards, setNumFlashcards] = useState(10);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [progressMessage, setProgressMessage] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Check for access_token first (new system), then fall back to token (old system)
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      router.push("/auth/sign-in");
      return;
    }

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

    const initializeData = async () => {
      try {
        const [userProfile, documentsData] = await Promise.all([
          authAPI.getCurrentUser(),
          documentsAPI.getDocuments(),
        ]);

        setUsername(userProfile.username || userProfile.email);
        const completedDocs = documentsData.filter(
          (doc) => doc.embedding_status === "completed",
        );
        setDocuments(completedDocs);
      } catch (error) {
        console.error("Failed to initialize data:", error);
        if (error instanceof Error && error.message.includes("401")) {
          handleLogout();
        } else {
          setError("Failed to load data. Please refresh the page.");
        }
      }
    };

    initializeData();
  }, [router]);

  const handleGenerateFlashcards = async () => {
    if (documents.length === 0) {
      setError(
        "No documents available. Please upload and process documents first.",
      );
      return;
    }

    setIsGenerating(true);
    setError("");
    setProgressMessage("Starting flashcard generation...");
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);

    try {
      await flashcardsAPI.generateFlashcardsStream(
        {
          topic: topic || undefined,
          document_ids:
            selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          num_flashcards: numFlashcards,
        },
        (status, message) => {
          setProgressMessage(message);
        },
        (generatedFlashcards) => {
          setFlashcards(generatedFlashcards);
          setProgressMessage("");
          setIsGenerating(false);
        },
        (errorMsg) => {
          setError(errorMsg);
          setIsGenerating(false);
          setProgressMessage("");
        },
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to generate flashcards. Please try again.";
      setError(errorMessage);
      setIsGenerating(false);
      setProgressMessage("");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReset = () => {
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setTopic("");
    setNumFlashcards(10);
    setSelectedDocumentIds([]);
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-background" />
                </div>
                <div>
                  <h1 className="text-base font-semibold">Smart Flashcards</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    AI-Powered Study Cards
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="hidden sm:flex">
                {username}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generation Form */}
          {flashcards.length === 0 && !isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Flashcards</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic (Optional)</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Machine Learning, Calculus, History..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to generate flashcards from all your documents
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numFlashcards">
                    Number of Flashcards: {numFlashcards}
                  </Label>
                  <input
                    id="numFlashcards"
                    type="range"
                    min="5"
                    max="30"
                    value={numFlashcards}
                    onChange={(e) => setNumFlashcards(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Select between 5 and 30 flashcards
                  </p>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Documents (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Leave unselected to use all documents
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center space-x-2 cursor-pointer"
                          onClick={() => toggleDocumentSelection(doc.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDocumentIds.includes(doc.id)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                            className="rounded"
                          />
                          <label className="text-sm cursor-pointer flex-1 truncate">
                            {doc.original_filename}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {documents.length === 0 && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      No documents available. Please upload and process
                      documents first from the dashboard.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleGenerateFlashcards}
                  disabled={isGenerating || documents.length === 0}
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
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Flashcards
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progress Message */}
          {isGenerating && (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground text-center">
                    {progressMessage || "Generating flashcards..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flashcards Display */}
          {flashcards.length > 0 && !isGenerating && (
            <div className="space-y-6">
              {/* Stats and Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="text-sm font-semibold px-3 py-1.5"
                  >
                    Card {currentIndex + 1} of {flashcards.length}
                  </Badge>
                  <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{
                        width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>

              {/* Flashcard Card */}
              <div className="relative w-full max-w-2xl mx-auto">
                <div
                  className="relative w-full aspect-[4/3] cursor-pointer group"
                  onClick={handleFlip}
                  style={{ perspective: "1200px" }}
                >
                  <div
                    className="relative w-full h-full transition-transform duration-700 ease-in-out"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: isFlipped
                        ? "rotateY(180deg)"
                        : "rotateY(0deg)",
                    }}
                  >
                    {/* Front of Card - Question */}
                    <div
                      className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                    >
                      <div className="flex flex-col items-center justify-center h-full p-8 md:p-12 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 shadow-lg">
                        <div className="absolute top-4 left-4">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium"
                          >
                            Question
                          </Badge>
                        </div>
                        <div className="text-center space-y-6 w-full max-w-xl">
                          <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-primary/10 dark:bg-primary/20">
                              <BookOpen className="h-8 w-8 text-primary" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-relaxed break-words px-4">
                              {currentCard.front}
                            </p>
                          </div>
                        </div>
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                          <p className="text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
                            <span>Click to reveal answer</span>
                            <ChevronRight className="h-3 w-3" />
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Back of Card - Answer */}
                    <div
                      className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl"
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <div className="flex flex-col items-center justify-center h-full p-8 md:p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-white dark:from-primary/20 dark:via-primary/10 dark:to-gray-900 rounded-2xl border-2 border-primary/30 dark:border-primary/40 hover:border-primary/50 dark:hover:border-primary/60 transition-all duration-300 shadow-lg">
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-primary text-primary-foreground text-xs font-medium">
                            Answer
                          </Badge>
                        </div>
                        <div className="text-center space-y-6 w-full max-w-xl">
                          <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-primary/20 dark:bg-primary/30">
                              <CheckCircle className="h-8 w-8 text-primary" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-relaxed break-words px-4">
                              {currentCard.back}
                            </p>
                          </div>
                        </div>
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <ChevronLeft className="h-3 w-3" />
                            <span>Click to see question</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="min-w-[120px]"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <Button
                  variant="default"
                  size="lg"
                  onClick={handleFlip}
                  className="min-w-[140px] bg-primary hover:bg-primary/90"
                >
                  {isFlipped ? (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Show Question
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Show Answer
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleNext}
                  disabled={currentIndex === flashcards.length - 1}
                  className="min-w-[120px]"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
