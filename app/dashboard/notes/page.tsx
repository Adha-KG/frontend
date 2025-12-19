"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notesAPI, NoteFile, NoteContent, NoteStyle } from "@/lib/api";
import {
  Upload,
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
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function NotesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<NoteFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<NoteFile | null>(null);
  const [noteContent, setNoteContent] = useState<NoteContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  // Upload form state
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [noteStyle, setNoteStyle] = useState<NoteStyle>("moderate");
  const [userPrompt, setUserPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    try {
      const response = await notesAPI.listFiles(50, 0);
      setFiles(response.files);
    } catch (err: unknown) {
      console.error("Failed to load files:", err);
      setError(err instanceof Error ? err.message : "Failed to load files");
    }
  };

  const refreshSelectedFile = useCallback(async () => {
    if (!selectedFile || !selectedFile.id) return;

    try {
      const updatedFile = await notesAPI.getFileStatus(selectedFile.id);
      setSelectedFile(updatedFile);

      // If file just completed, load the notes
      if (
        updatedFile.status === "completed" &&
        selectedFile.status !== "completed"
      ) {
        console.log("File just completed! Loading notes...");
        const content = await notesAPI.getNotes(updatedFile.id);
        console.log("Auto-loaded notes:", content);
        setNoteContent(content);
      }
    } catch (err: unknown) {
      console.error("Failed to refresh file status:", err);
    }
  }, [selectedFile]);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      loadFiles();
    }
  }, [router]);

  // Poll for status updates every 5 seconds when there are processing files
  useEffect(() => {
    const hasProcessing = files.some(
      (f) =>
        f.status === "processing" ||
        f.status === "indexed" ||
        f.status === "summarizing" ||
        f.status === "uploaded",
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadFiles();
      // Reload notes if selected file is processing
      if (selectedFile && selectedFile.status !== "completed") {
        refreshSelectedFile();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [files, selectedFile, refreshSelectedFile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB");
      return;
    }

    setSelectedPdfFile(file);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedPdfFile) {
      setError("Please select a PDF file first");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await notesAPI.uploadPDF(
        selectedPdfFile,
        noteStyle,
        userPrompt || undefined,
      );

      // Clear form
      setSelectedPdfFile(null);
      setUserPrompt("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload files and select the newly uploaded one
      await loadFiles();

      // Find and select the new file
      const newFiles = await notesAPI.listFiles(50, 0);
      const newFile = newFiles.files.find((f) => f.id === response.file_id);
      if (newFile) {
        handleSelectFile(newFile);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectFile = async (file: NoteFile) => {
    setSelectedFile(file);
    setNoteContent(null);
    setAnswer(null);
    setQuestion("");

    if (file.status === "completed") {
      setIsLoading(true);
      try {
        console.log("Fetching notes for file:", file.id);
        const content = await notesAPI.getNotes(file.id);
        console.log("Received notes content:", content);
        console.log("Note text length:", content.note_text?.length || 0);
        setNoteContent(content);
      } catch (err: unknown) {
        console.error("Failed to load notes:", err);
        setError(err instanceof Error ? err.message : "Failed to load notes");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedFile || !question.trim()) return;

    setIsAsking(true);
    setError(null);

    try {
      const response = await notesAPI.askQuestion(selectedFile.id, question);
      setAnswer(response.answer);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setIsAsking(false);
    }
  };

  const handleDownloadMarkdown = async (fileId: string, filename: string) => {
    try {
      const blob = await notesAPI.downloadNotesMarkdown(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_notes.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download notes");
    }
  };

  const handleDownloadPDF = async (fileId: string, filename: string) => {
    try {
      const blob = await notesAPI.downloadNotesPDF(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_notes.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await notesAPI.deleteFile(fileId);
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
        setNoteContent(null);
      }
      await loadFiles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-muted text-foreground border-border";
      case "processing":
      case "indexed":
      case "summarizing":
      case "uploaded":
        return "bg-primary/10 text-primary border-primary/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    if (
      status === "processing" ||
      status === "indexed" ||
      status === "summarizing" ||
      status === "uploaded"
    ) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
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
                  Upload PDFs and generate intelligent study notes
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFiles}
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
          {/* Left Sidebar - Upload & File List */}
          <div className="lg:col-span-4 space-y-4">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload PDF
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Selection */}
                <div className="space-y-2">
                  <Label>Select PDF File</Label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                  {selectedPdfFile && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">
                        {selectedPdfFile.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPdfFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Note Style */}
                <div className="space-y-2">
                  <Label>Note Style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["short", "moderate", "descriptive"] as NoteStyle[]).map(
                      (style) => (
                        <Button
                          key={style}
                          variant={noteStyle === style ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNoteStyle(style)}
                          className="capitalize"
                          disabled={isUploading}
                        >
                          {style}
                        </Button>
                      ),
                    )}
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
                    disabled={isUploading}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading || !selectedPdfFile}
                  className="w-full"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading & Processing...
                    </>
                  ) : (
                    <>
                      <StickyNote className="h-4 w-4 mr-2" />
                      Generate Notes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Files List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Your Files ({files.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No files uploaded yet</p>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedFile?.id === file.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground hover:bg-muted/50"
                        }`}
                        onClick={() => handleSelectFile(file)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {file.original_filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.id);
                            }}
                            className="text-muted-foreground hover:text-destructive ml-2"
                            aria-label={`Delete ${file.original_filename}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(file.status)}`}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(file.status)}
                              {file.status}
                            </span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        {file.error && (
                          <p className="text-xs text-destructive mt-1">
                            {file.error}
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

            {!selectedFile ? (
              <Card className="h-[600px] flex items-center justify-center">
                <CardContent className="text-center">
                  <StickyNote className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    No File Selected
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a PDF or select a file to view notes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {selectedFile.original_filename}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status:{" "}
                        <span className="capitalize">
                          {selectedFile.status}
                        </span>
                      </p>
                    </div>
                    {selectedFile.status === "completed" && noteContent && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownloadMarkdown(
                              selectedFile.id,
                              selectedFile.original_filename,
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
                              selectedFile.id,
                              selectedFile.original_filename,
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
                  {selectedFile.status === "completed" ? (
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
                        ) : noteContent && noteContent.note_text ? (
                          <div suppressHydrationWarning>
                            <div className="markdown-content">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                  h1: ({ children, ...props }) => (
                                    <h1
                                      className="text-3xl font-bold mt-6 mb-4"
                                      {...props}
                                    >
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children, ...props }) => (
                                    <h2
                                      className="text-2xl font-bold mt-5 mb-3"
                                      {...props}
                                    >
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children, ...props }) => (
                                    <h3
                                      className="text-xl font-semibold mt-4 mb-2"
                                      {...props}
                                    >
                                      {children}
                                    </h3>
                                  ),
                                  h4: ({ children, ...props }) => (
                                    <h4
                                      className="text-lg font-semibold mt-3 mb-2"
                                      {...props}
                                    >
                                      {children}
                                    </h4>
                                  ),
                                  p: ({ children, ...props }) => (
                                    <p
                                      className="mb-4 leading-7 text-foreground"
                                      {...props}
                                    >
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children, ...props }) => (
                                    <ul
                                      className="list-disc ml-6 mb-4 space-y-2"
                                      {...props}
                                    >
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children, ...props }) => (
                                    <ol
                                      className="list-decimal ml-6 mb-4 space-y-2"
                                      {...props}
                                    >
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children, ...props }) => (
                                    <li
                                      className="leading-7 text-foreground"
                                      {...props}
                                    >
                                      {children}
                                    </li>
                                  ),
                                  code: ({
                                    children,
                                    className,
                                    ...props
                                  }: React.ComponentPropsWithoutRef<"code">) => {
                                    const isInline =
                                      !className?.includes("language-");
                                    return isInline ? (
                                      <code
                                        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    ) : (
                                      <code
                                        className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4 text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                  blockquote: ({ children, ...props }) => (
                                    <blockquote
                                      className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
                                      {...props}
                                    >
                                      {children}
                                    </blockquote>
                                  ),
                                  a: ({ children, ...props }) => (
                                    <a
                                      className="text-primary hover:underline"
                                      {...props}
                                    >
                                      {children}
                                    </a>
                                  ),
                                  strong: ({ children, ...props }) => (
                                    <strong
                                      className="font-bold text-foreground"
                                      {...props}
                                    >
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children, ...props }) => (
                                    <em
                                      className="italic text-foreground"
                                      {...props}
                                    >
                                      {children}
                                    </em>
                                  ),
                                  hr: ({ ...props }) => (
                                    <hr
                                      className="my-6 border-border"
                                      {...props}
                                    />
                                  ),
                                  table: ({ children, ...props }) => (
                                    <table
                                      className="w-full border-collapse mb-4 border border-border"
                                      {...props}
                                    >
                                      {children}
                                    </table>
                                  ),
                                  thead: ({ children, ...props }) => (
                                    <thead className="bg-muted" {...props}>
                                      {children}
                                    </thead>
                                  ),
                                  tbody: ({ children, ...props }) => (
                                    <tbody {...props}>{children}</tbody>
                                  ),
                                  tr: ({ children, ...props }) => (
                                    <tr
                                      className="border-b border-border"
                                      {...props}
                                    >
                                      {children}
                                    </tr>
                                  ),
                                  th: ({ children, ...props }) => (
                                    <th
                                      className="px-4 py-2 text-left font-semibold text-foreground"
                                      {...props}
                                    >
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children, ...props }) => (
                                    <td
                                      className="px-4 py-2 text-foreground"
                                      {...props}
                                    >
                                      {children}
                                    </td>
                                  ),
                                }}
                              >
                                {noteContent.note_text}
                              </ReactMarkdown>
                            </div>
                            {noteContent.metadata && (
                              <div className="mt-8 pt-4 border-t text-xs text-muted-foreground space-y-1">
                                {noteContent.metadata.note_style && (
                                  <p>
                                    Style:{" "}
                                    <span className="capitalize">
                                      {noteContent.metadata.note_style}
                                    </span>
                                  </p>
                                )}
                                {noteContent.metadata.total_chunks && (
                                  <p>
                                    Processed{" "}
                                    {noteContent.metadata.total_chunks} chunks
                                  </p>
                                )}
                                <p>Generated with AI</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No notes available</p>
                            {noteContent && (
                              <p className="text-xs mt-2">
                                Note content exists but note_text is empty
                              </p>
                            )}
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
                                Ask questions about the document content
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                      <h3 className="text-lg font-semibold mb-2">
                        Processing Your Document
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedFile.status === "uploaded" &&
                          "Preparing to process..."}
                        {selectedFile.status === "processing" &&
                          "Extracting text and chunking..."}
                        {selectedFile.status === "indexed" &&
                          "Creating embeddings..."}
                        {selectedFile.status === "summarizing" &&
                          "Generating notes with AI..."}
                        {selectedFile.status === "failed" && (
                          <span className="text-destructive">
                            {selectedFile.error || "Processing failed"}
                          </span>
                        )}
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
