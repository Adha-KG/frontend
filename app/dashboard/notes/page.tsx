"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  notesAPI,
  documentsAPI,
  Note,
  NoteListItem,
  NoteStyle,
  Document,
} from "@/lib/api";
import {
  FileText,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Send,
  StickyNote,
  ChevronLeft,
  RefreshCw,
  FileDown,
  Plus,
  Check,
  Upload,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function NotesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Documents state (for generating notes)
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]); // includes processing ones
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Generate form state
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteStyle, setNoteStyle] = useState<NoteStyle>("moderate");
  const [userPrompt, setUserPrompt] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [showGenerateForm, setShowGenerateForm] = useState(true);

  // Q&A state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const notesList = await notesAPI.listNotes(50, 0);
      setNotes(notesList);
    } catch (err: unknown) {
      console.error("Failed to load notes:", err);
      setError(err instanceof Error ? err.message : "Failed to load notes");
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await documentsAPI.getDocuments();
      setAllDocuments(docs);
      // Only show completed documents for selection
      setDocuments(docs.filter((d) => d.embedding_status === "completed"));
    } catch (err: unknown) {
      console.error("Failed to load documents:", err);
    }
  }, []);

  const refreshSelectedNote = useCallback(async () => {
    if (!selectedNote || !selectedNote.id) return;

    try {
      const updatedNote = await notesAPI.getNote(selectedNote.id);
      setSelectedNote(updatedNote);
    } catch (err: unknown) {
      console.error("Failed to refresh note:", err);
    }
  }, [selectedNote]);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      loadNotes();
      loadDocuments();
    }
  }, [router, loadNotes, loadDocuments]);

  // Poll for status updates when there are generating notes
  useEffect(() => {
    const hasGenerating = notes.some(
      (n) =>
        n.status === "generating" ||
        n.status === "retrieving" ||
        n.status === "summarizing" ||
        n.status === "synthesizing",
    );
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      loadNotes();
      if (selectedNote && selectedNote.status !== "completed") {
        refreshSelectedNote();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [notes, selectedNote, loadNotes, refreshSelectedNote]);

  // Poll for document processing status
  useEffect(() => {
    const hasProcessing = allDocuments.some(
      (d) =>
        d.embedding_status === "processing" || d.embedding_status === "pending",
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [allDocuments, loadDocuments]);

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const pdfFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === "application/pdf") {
        if (file.size <= 50 * 1024 * 1024) {
          pdfFiles.push(file);
        } else {
          setError(`File "${file.name}" exceeds 50MB limit`);
        }
      } else {
        setError(`File "${file.name}" is not a PDF`);
      }
    }

    if (pdfFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...pdfFiles]);
      setError(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const responses = await documentsAPI.uploadDocuments(selectedFiles);

      // Clear selected files
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload documents to show the new ones (they'll be processing)
      await loadDocuments();

      // Show success message
      setError(null);
      console.log(
        `Uploaded ${responses.length} file(s). They will be available for note generation once processed.`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const handleGenerateNotes = async () => {
    if (selectedDocIds.length === 0) {
      setError("Please select at least one document");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await notesAPI.generateNotes({
        document_ids: selectedDocIds,
        note_style: noteStyle,
        user_prompt: userPrompt || undefined,
        title: noteTitle || undefined,
      });

      // Clear form
      setSelectedDocIds([]);
      setUserPrompt("");
      setNoteTitle("");
      setShowGenerateForm(false);

      // Reload notes and select the new one
      await loadNotes();
      const newNote = await notesAPI.getNote(response.id);
      setSelectedNote(newNote);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate notes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectNote = async (note: NoteListItem) => {
    setIsLoading(true);
    setAnswer(null);
    setQuestion("");

    try {
      const fullNote = await notesAPI.getNote(note.id);
      setSelectedNote(fullNote);
    } catch (err: unknown) {
      console.error("Failed to load note:", err);
      setError(err instanceof Error ? err.message : "Failed to load note");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedNote || !question.trim()) return;

    setIsAsking(true);
    setError(null);

    try {
      const response = await notesAPI.askQuestion(selectedNote.id, question);
      setAnswer(response.answer);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setIsAsking(false);
    }
  };

  const handleDownloadMarkdown = async (noteId: string, title: string) => {
    try {
      const blob = await notesAPI.downloadNotesMarkdown(noteId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "notes"}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download notes");
    }
  };

  const handleDownloadPDF = async (noteId: string, title: string) => {
    try {
      const blob = await notesAPI.downloadNotesPDF(noteId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "notes"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await notesAPI.deleteNote(noteId);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      await loadNotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-muted text-foreground border-border";
      case "generating":
      case "retrieving":
      case "summarizing":
      case "synthesizing":
        return "bg-primary/10 text-primary border-primary/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    if (
      status === "generating" ||
      status === "retrieving" ||
      status === "summarizing" ||
      status === "synthesizing"
    ) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    if (status === "completed") {
      return <Check className="h-3 w-3" />;
    }
    return null;
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
              <StickyNote className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">AI Notes Generator</h1>
                <p className="text-sm text-muted-foreground">
                  Generate intelligent study notes from your documents
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadNotes();
                loadDocuments();
              }}
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

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Generate & Notes List */}
          <div className="lg:col-span-4 space-y-4">
            {/* Generate Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Generate Notes
                  </span>
                  {showGenerateForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGenerateForm(false)}
                    >
                      Hide
                    </Button>
                  )}
                </CardTitle>
                {!showGenerateForm && (
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowGenerateForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Notes
                    </Button>
                  </CardContent>
                )}
              </CardHeader>
              {showGenerateForm && (
                <CardContent className="space-y-4">
                  {/* Upload New Files Section */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload New PDFs
                    </Label>
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                      {selectedFiles.length > 0 && (
                        <Button
                          size="sm"
                          onClick={handleUploadFiles}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>Upload ({selectedFiles.length})</>
                          )}
                        </Button>
                      )}
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-1.5 bg-muted rounded text-xs"
                          >
                            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate flex-1">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => handleRemoveFile(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Show processing documents */}
                    {allDocuments.some(
                      (d) => d.embedding_status === "processing",
                    ) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing documents...
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Document Selection */}
                  <div className="space-y-2">
                    <Label>Select Documents for Notes</Label>
                    {documents.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No processed documents</p>
                        <p className="text-xs">
                          Upload PDFs above to get started
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={doc.id}
                              checked={selectedDocIds.includes(doc.id)}
                              onCheckedChange={() =>
                                handleDocumentToggle(doc.id)
                              }
                            />
                            <label
                              htmlFor={doc.id}
                              className="text-sm truncate flex-1 cursor-pointer"
                            >
                              {doc.original_filename}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedDocIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedDocIds.length} document(s) selected
                      </p>
                    )}
                  </div>

                  {/* Note Title */}
                  <div className="space-y-2">
                    <Label htmlFor="note-title">Title (Optional)</Label>
                    <Input
                      id="note-title"
                      placeholder="E.g., Chapter 5 Notes"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Note Style */}
                  <div className="space-y-2">
                    <Label>Note Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        ["short", "moderate", "descriptive"] as NoteStyle[]
                      ).map((style) => (
                        <Button
                          key={style}
                          variant={noteStyle === style ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNoteStyle(style)}
                          className="capitalize"
                          disabled={isGenerating}
                        >
                          {style}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {noteStyle === "short" &&
                        "Brief bullet points, only key facts"}
                      {noteStyle === "moderate" &&
                        "Balanced notes with main points and details"}
                      {noteStyle === "descriptive" &&
                        "Comprehensive notes with full explanations"}
                    </p>
                  </div>

                  {/* Custom Instructions */}
                  <div className="space-y-2">
                    <Label htmlFor="user-prompt">
                      Custom Instructions (Optional)
                    </Label>
                    <Input
                      id="user-prompt"
                      placeholder="E.g., Focus on methodology..."
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleGenerateNotes}
                    disabled={isGenerating || selectedDocIds.length === 0}
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
                        <StickyNote className="h-4 w-4 mr-2" />
                        Generate Notes
                      </>
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Notes List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Your Notes ({notes.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notes generated yet</p>
                      <p className="text-xs mt-1">
                        Select documents and generate notes
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedNote?.id === note.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground hover:bg-muted/50"
                        }`}
                        onClick={() => handleSelectNote(note)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {note.title || `Note ${note.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            className="text-muted-foreground hover:text-destructive ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(note.status)}`}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(note.status)}
                              {note.status}
                            </span>
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {note.note_style}
                          </span>
                        </div>
                        {note.document_ids && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {note.document_ids.length} document(s)
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area - Notes Display */}
          <div className="lg:col-span-8">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!selectedNote ? (
              <Card className="h-[600px] flex items-center justify-center">
                <CardContent className="text-center">
                  <StickyNote className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Note Selected
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Generate notes from your documents or select an existing
                    note
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <StickyNote className="h-5 w-5" />
                        {selectedNote.title ||
                          `Note ${selectedNote.id.slice(0, 8)}`}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status:{" "}
                        <span className="capitalize">
                          {selectedNote.status}
                        </span>
                        {selectedNote.document_ids && (
                          <> | {selectedNote.document_ids.length} document(s)</>
                        )}
                      </p>
                    </div>
                    {selectedNote.status === "completed" &&
                      selectedNote.note_text && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownloadMarkdown(
                                selectedNote.id,
                                selectedNote.title || "notes",
                              )
                            }
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            Markdown
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownloadPDF(
                                selectedNote.id,
                                selectedNote.title || "notes",
                              )
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                        </div>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedNote.status === "completed" ? (
                    <Tabs defaultValue="notes" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="notes">
                          <StickyNote className="h-4 w-4 mr-2" />
                          Notes
                        </TabsTrigger>
                        <TabsTrigger value="qa">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Ask Questions
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="notes" className="mt-4">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-2 text-sm text-muted-foreground">
                              Loading notes...
                            </p>
                          </div>
                        ) : selectedNote.note_text ? (
                          <div suppressHydrationWarning>
                            <div className="markdown-content prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {selectedNote.note_text}
                              </ReactMarkdown>
                            </div>
                            {selectedNote.metadata && (
                              <div className="mt-8 pt-4 border-t text-xs text-muted-foreground space-y-1">
                                {selectedNote.metadata.note_style && (
                                  <p>
                                    Style:{" "}
                                    <span className="capitalize">
                                      {selectedNote.metadata.note_style}
                                    </span>
                                  </p>
                                )}
                                {selectedNote.metadata.total_chunks && (
                                  <p>
                                    Processed{" "}
                                    {selectedNote.metadata.total_chunks} chunks
                                    from{" "}
                                    {selectedNote.metadata.total_documents || 1}{" "}
                                    document(s)
                                  </p>
                                )}
                                <p>Generated with AI</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No notes content available</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="qa" className="mt-4">
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ask a question about this document..."
                              value={question}
                              onChange={(e) => setQuestion(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAskQuestion();
                                }
                              }}
                            />
                            <Button
                              onClick={handleAskQuestion}
                              disabled={isAsking || !question.trim()}
                            >
                              {isAsking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {answer && (
                            <Card>
                              <CardContent className="pt-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                  >
                                    {answer}
                                  </ReactMarkdown>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {!answer && !isAsking && (
                            <div className="text-center py-12 text-muted-foreground">
                              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                Ask questions about the source documents
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : selectedNote.status === "failed" ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                      <h3 className="text-lg font-semibold mb-2">
                        Generation Failed
                      </h3>
                      <p className="text-sm text-destructive">
                        {selectedNote.error ||
                          "An error occurred during generation"}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                      <h3 className="text-lg font-semibold mb-2">
                        Generating Your Notes
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedNote.status === "generating" &&
                          "Starting note generation..."}
                        {selectedNote.status === "retrieving" &&
                          "Retrieving document chunks..."}
                        {selectedNote.status === "summarizing" &&
                          "Summarizing content with AI..."}
                        {selectedNote.status === "synthesizing" &&
                          "Synthesizing final notes..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This usually takes 1-3 minutes. The page will update
                        automatically.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
