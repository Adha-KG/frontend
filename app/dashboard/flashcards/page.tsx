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
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    initializeData();
  }, [router]);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("tokenType");
    localStorage.removeItem("userId");
    router.push("/login");
  };

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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">
                    {currentIndex + 1} / {flashcards.length}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Generate New
                  </Button>
                </div>
              </div>

              {/* Flashcard Card */}
              <Card className="min-h-[400px]">
                <CardContent className="p-8">
                  <div
                    className="relative w-full h-full min-h-[350px] cursor-pointer perspective-1000"
                    onClick={handleFlip}
                    style={{ perspective: "1000px" }}
                  >
                    <div
                      className="relative w-full h-full transition-transform duration-500"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped
                          ? "rotateY(180deg)"
                          : "rotateY(0deg)",
                      }}
                    >
                      {/* Front of Card */}
                      <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                        }}
                      >
                        <div className="flex flex-col items-center justify-center h-full space-y-4 p-6 border-2 border-dashed rounded-lg bg-muted/50">
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                          <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Question
                            </p>
                            <p className="text-lg font-semibold break-words">
                              {currentCard.front}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-4">
                            Click to reveal answer
                          </p>
                        </div>
                      </div>

                      {/* Back of Card */}
                      <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                        }}
                      >
                        <div className="flex flex-col items-center justify-center h-full space-y-4 p-6 border-2 border-primary rounded-lg bg-primary/5">
                          <CheckCircle className="h-12 w-12 text-primary" />
                          <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-primary">
                              Answer
                            </p>
                            <p className="text-lg break-words">
                              {currentCard.back}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-4">
                            Click to see question
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <Button variant="outline" onClick={handleFlip}>
                  {isFlipped ? "Show Question" : "Show Answer"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex === flashcards.length - 1}
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
