"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  UploadCloud,
  Send,
  FileText,
  X,
  CheckCircle,
  Loader2,
  Plus,
  MessageSquare,
  LogOut,
  ArrowLeft,
  Trash2,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { documentsAPI, chatAPI, queryAPI, authAPI } from "@/lib/api";
import type { Document, ChatSession, QueryResponse } from "@/lib/api";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function PDFChatterPage() {
  // Authentication state
  const [username, setUsername] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Document management state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  // Chat state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initializeData = async () => {
    try {
      const [userProfile, documentsData, sessionsData] = await Promise.all([
        authAPI.getCurrentUser(),
        documentsAPI.getDocuments(),
        chatAPI.getChatSessions(),
      ]);

      setUsername(userProfile.username || userProfile.email);
      setDocuments(documentsData);
      setChatSessions(sessionsData);

      const activeSession = sessionsData.find((session) => session.is_active);
      if (activeSession) {
        setCurrentSessionId(activeSession.id);
        await loadChatMessages(activeSession.id);
      }
    } catch (error) {
      console.error("Failed to initialize data:", error);
      if (error instanceof Error && error.message.includes("401")) {
        handleLogout();
      } else {
        setError("Failed to load data. Please refresh the page.");
      }
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    setIsAuthenticated(true);
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const hasProcessingDocs = documents.some(
      (doc) =>
        doc.embedding_status === "processing" ||
        doc.embedding_status === "pending",
    );

    if (hasProcessingDocs) {
      const pollInterval = setInterval(async () => {
        try {
          const updatedDocuments = await documentsAPI.getDocuments();
          setDocuments(updatedDocuments);

          const stillProcessing = updatedDocuments.some(
            (doc) =>
              doc.embedding_status === "processing" ||
              doc.embedding_status === "pending",
          );
          if (!stillProcessing) {
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error("Error polling document status:", error);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    }
  }, [documents, isAuthenticated]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatMessages = async (sessionId: string) => {
    try {
      setIsLoadingMessages(true);
      const chatMessages = await chatAPI.getChatMessages(sessionId, 50);

      const formattedMessages: Message[] = chatMessages.map((msg, index) => {
        let isUserMessage = false;

        if (msg.content.startsWith("Q: ") && msg.content.includes("\nA: ")) {
          return {
            role: "user",
            content: msg.content.substring(3).split("\nA: ")[0],
            timestamp: msg.created_at,
          };
        }

        const userIndicators = [
          "?",
          "what",
          "how",
          "why",
          "when",
          "where",
          "who",
          "which",
          "explain",
          "tell me",
          "can you",
          "could you",
          "please",
          "help me",
          "i need",
          "show me",
        ];

        const assistantIndicators = [
          "based on",
          "according to",
          "the document",
          "as mentioned",
          "here is",
          "here are",
          "to answer",
          "in summary",
          "## ",
          "### ",
          "**",
          "```",
          "comprehensive",
          "detailed explanation",
          "study guide",
        ];

        const lowerContent = msg.content.toLowerCase();

        const hasUserIndicators = userIndicators.some((indicator) =>
          lowerContent.includes(indicator.toLowerCase()),
        );

        const hasAssistantIndicators = assistantIndicators.some((indicator) =>
          lowerContent.includes(indicator.toLowerCase()),
        );

        const isLikelyQuestion =
          msg.content.length < 500 && msg.content.endsWith("?");
        const isLikelyResponse =
          msg.content.length > 200 || msg.content.includes("\n\n");

        const isEvenIndex = index % 2 === 0;

        if (hasUserIndicators && !hasAssistantIndicators) {
          isUserMessage = true;
        } else if (hasAssistantIndicators && !hasUserIndicators) {
          isUserMessage = false;
        } else if (isLikelyQuestion) {
          isUserMessage = true;
        } else if (isLikelyResponse) {
          isUserMessage = false;
        } else {
          isUserMessage = isEvenIndex;
        }

        return {
          role: isUserMessage ? "user" : "assistant",
          content: msg.content,
          timestamp: msg.created_at,
        };
      });

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setError("Failed to load chat messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("tokenType");
    router.push("/login");
  };

  const validateFiles = (files: File[]) => {
    const errors = [];
    let totalSize = 0;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(
          `${file.name} is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 50MB.`,
        );
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      errors.push(
        `Total file size too large (${(totalSize / (1024 * 1024)).toFixed(1)}MB). Maximum total size is 100MB.`,
      );
    }

    return errors;
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf",
      );

      const validationErrors = validateFiles(newFiles);
      if (validationErrors.length > 0) {
        setError(validationErrors.join(" "));
        e.target.value = "";
        return;
      }

      setFiles(newFiles);
      e.target.value = "";

      if (newFiles.length > 0) {
        await uploadPDFs(newFiles);
      }
    }
  };

  const uploadPDFs = async (filesToUpload: File[]) => {
    setIsUploading(true);
    setError("");

    try {
      const uploadResults = await documentsAPI.uploadDocuments(filesToUpload);
      console.log("Upload results:", uploadResults);

      const updatedDocuments = await documentsAPI.getDocuments();
      setDocuments(updatedDocuments);
      setFiles([]);

      setError("");
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload PDFs. Please try again.",
      );
      setFiles([]);
    } finally {
      setIsUploading(false);
    }
  };

  const createNewChatSession = async (preserveMessages = false) => {
    try {
      const sessionName = `Chat - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      const newSession = await chatAPI.createChatSession({
        session_name: sessionName,
        session_type: "conversation",
        document_ids: selectedDocuments,
      });

      setChatSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);

      if (!preserveMessages) {
        setMessages([]);
      }

      return newSession.id;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      setError("Failed to create new chat session");
      return null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = prompt.trim();
    setPrompt("");

    setIsSending(true);
    setIsWaitingForResponse(true);
    setError("");

    const userMsg: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Create a placeholder assistant message for streaming
    const assistantMsg: Message = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      let sessionId = currentSessionId;

      if (!sessionId) {
        sessionId = await createNewChatSession(true);
        if (!sessionId) {
          throw new Error("Failed to create chat session");
        }
      }

      // Use streaming API with callback to update message incrementally
      const response: QueryResponse = await queryAPI.queryRAGStream(
        userMessage,
        {
          session_id: sessionId,
        },
        (chunk: string) => {
          // Update the assistant message with each chunk
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content += chunk;
            }
            return newMessages;
          });
        },
      );

      // Update the final message with complete response
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content = response.answer;
        }
        return newMessages;
      });

      if (response.is_new_session) {
        const updatedSessions = await chatAPI.getChatSessions();
        setChatSessions(updatedSessions);
      }
    } catch (error) {
      console.error("Question error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to get response. Please try again.",
      );

      // Remove both user and assistant messages on error
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the last two messages (user and assistant placeholder)
        return newMessages.slice(0, -2);
      });
    } finally {
      setIsSending(false);
      setIsWaitingForResponse(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId],
    );
  };

  const clearSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setSelectedDocuments([]);
  };

  const deleteDocument = async (documentId: string) => {
    try {
      await documentsAPI.deleteDocument(documentId);

      const updatedDocuments = await documentsAPI.getDocuments();
      setDocuments(updatedDocuments);

      setSelectedDocuments((prev) => prev.filter((id) => id !== documentId));

      if (selectedDocuments.includes(documentId)) {
        clearSession();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete document",
      );
    }
  };

  const switchChatSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    await loadChatMessages(sessionId);
  };

  const deleteChatSession = async (sessionId: string) => {
    try {
      await chatAPI.deleteChatSession(sessionId);

      const updatedSessions = await chatAPI.getChatSessions();
      setChatSessions(updatedSessions);

      if (currentSessionId === sessionId) {
        clearSession();
      }
    } catch (error) {
      console.error("Failed to delete chat session:", error);
      setError("Failed to delete chat session");
    }
  };

  const handleCardClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf",
    );

    if (droppedFiles.length > 0) {
      const validationErrors = validateFiles(droppedFiles);
      if (validationErrors.length > 0) {
        setError(validationErrors.join(" "));
        return;
      }

      setFiles(droppedFiles);
      await uploadPDFs(droppedFiles);
    }
  };

  const getDocumentStatus = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Ready", color: "bg-green-100 text-green-800" };
      case "processing":
        return { text: "Processing", color: "bg-yellow-100 text-yellow-800" };
      case "failed":
        return { text: "Failed", color: "bg-red-100 text-red-800" };
      default:
        return { text: "Pending", color: "bg-gray-100 text-gray-800" };
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <div className="w-full max-w-full px-4 pt-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Chat with your PDFs</h1>
              <p className="text-muted-foreground text-sm">
                Welcome back, {username}! Upload PDFs and start chatting with AI
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={initializeData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50 flex-shrink-0">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content - Flex layout for better space distribution */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left Sidebar - Collapsible on smaller screens */}
          <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto max-h-full">
            {/* Upload New PDFs */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload PDFs
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  onClick={handleCardClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all duration-200 text-center
                    ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-6 h-6 mb-2 animate-spin text-primary mx-auto" />
                      <p className="text-xs">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 mb-2 text-primary/70 mx-auto" />
                      <p className="text-xs font-medium mb-1">
                        Drop PDFs here or click
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Max 50MB per file
                      </p>
                    </>
                  )}
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFilesChange}
                  />
                </div>

                {/* New files preview */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium">Files to upload:</p>
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3 h-3 text-primary flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="p-1 h-auto flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Documents - Compact version */}
            <Card className="flex-1 min-h-0 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents ({documents.length})
                  </div>
                  {selectedDocuments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedDocuments.length} selected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pt-0">
                {documents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((document) => {
                      const status = getDocumentStatus(
                        document.embedding_status,
                      );
                      return (
                        <div
                          key={document.id}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer
                            ${
                              selectedDocuments.includes(document.id)
                                ? "border-primary bg-primary/5"
                                : "border-muted hover:border-muted-foreground/50"
                            }`}
                          onClick={() =>
                            document.embedding_status === "completed" &&
                            toggleDocumentSelection(document.id)
                          }
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className={`p-1 rounded ${selectedDocuments.includes(document.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                            >
                              <FileText className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {document.original_filename}
                              </p>
                              <div className="flex items-center gap-1">
                                <Badge className={`text-xs ${status.color}`}>
                                  {status.text}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {selectedDocuments.includes(document.id) &&
                              document.embedding_status === "completed" && (
                                <CheckCircle className="w-3 h-3 text-primary" />
                              )}
                            {document.embedding_status === "processing" && (
                              <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDocument(document.id);
                              }}
                              className="p-1 h-auto text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Sessions - Compact version */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat Sessions
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createNewChatSession()}
                    className="p-1"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 overflow-y-auto pt-0">
                {chatSessions.length === 0 ? (
                  <div className="text-center py-3 text-muted-foreground">
                    <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No chat sessions yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {chatSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer
                          ${
                            currentSessionId === session.id
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          }`}
                        onClick={() => switchChatSession(session.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {session.session_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.message_count} messages
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChatSession(session.id);
                          }}
                          className="p-1 h-auto text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Chat Interface - Much Larger */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Active Session Info */}
            {currentSessionId && selectedDocuments.length > 0 && (
              <Card className="bg-primary/5 border-primary/20 mb-4 flex-shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-full">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Active Chat Session
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedDocuments.length} document
                          {selectedDocuments.length > 1 ? "s" : ""} available
                          for queries
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSession}
                      className="text-xs"
                    >
                      Clear Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Messages - Much Larger Area */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="p-4 flex-1 overflow-hidden flex flex-col min-h-0">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 && !isWaitingForResponse ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium mb-2">
                        Ready to Chat!
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {documents.filter(
                          (d) => d.embedding_status === "completed",
                        ).length === 0
                          ? "Upload and process some PDFs first to get started"
                          : "Ask me anything about your documents"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-4 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="text-base leading-relaxed">
                            {message.role === "assistant" ? (
                              <div className="prose prose-sm max-w-none prose-slate dark:prose-invert prose-headings:font-semibold prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-foreground prose-pre:bg-muted-foreground/10">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={{
                                    h1: ({ children, ...props }) => (
                                      <h1
                                        className="text-xl font-bold mb-3 mt-0 text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children, ...props }) => (
                                      <h2
                                        className="text-lg font-semibold mb-2 mt-0 text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children, ...props }) => (
                                      <h3
                                        className="text-base font-medium mb-2 mt-0 text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </h3>
                                    ),
                                    p: ({ children, ...props }) => (
                                      <p
                                        className="mb-3 mt-0 leading-relaxed text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </p>
                                    ),
                                    ul: ({ children, ...props }) => (
                                      <ul
                                        className="mb-3 mt-0 pl-6 list-disc space-y-1"
                                        {...props}
                                      >
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children, ...props }) => (
                                      <ol
                                        className="mb-3 mt-0 pl-6 list-decimal space-y-1"
                                        {...props}
                                      >
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children, ...props }) => (
                                      <li
                                        className="text-foreground leading-relaxed"
                                        {...props}
                                      >
                                        {children}
                                      </li>
                                    ),
                                    strong: ({ children, ...props }) => (
                                      <strong
                                        className="font-semibold text-foreground"
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
                                    blockquote: ({ children, ...props }) => (
                                      <blockquote
                                        className="border-l-4 border-primary/30 pl-4 my-2 italic text-foreground/80"
                                        {...props}
                                      >
                                        {children}
                                      </blockquote>
                                    ),
                                    code: ({
                                      children,
                                      className,
                                      ...props
                                    }) => {
                                      const isInline =
                                        !className?.includes("language-");
                                      return isInline ? (
                                        <code
                                          className="bg-muted-foreground/10 text-foreground px-1.5 py-0.5 rounded text-sm font-mono"
                                          {...props}
                                        >
                                          {children}
                                        </code>
                                      ) : (
                                        <code
                                          className="block bg-muted-foreground/10 text-foreground p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre"
                                          {...props}
                                        >
                                          {children}
                                        </code>
                                      );
                                    },
                                    pre: ({ children, ...props }) => (
                                      <pre
                                        className="bg-muted-foreground/10 p-3 rounded overflow-x-auto mb-3 mt-0"
                                        {...props}
                                      >
                                        {children}
                                      </pre>
                                    ),
                                    table: ({ children, ...props }) => (
                                      <div className="overflow-x-auto mb-3">
                                        <table
                                          className="min-w-full border border-muted-foreground/20 rounded"
                                          {...props}
                                        >
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    thead: ({ children, ...props }) => (
                                      <thead
                                        className="bg-muted-foreground/5"
                                        {...props}
                                      >
                                        {children}
                                      </thead>
                                    ),
                                    th: ({ children, ...props }) => (
                                      <th
                                        className="border border-muted-foreground/20 px-3 py-2 text-left font-semibold text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children, ...props }) => (
                                      <td
                                        className="border border-muted-foreground/20 px-3 py-2 text-foreground"
                                        {...props}
                                      >
                                        {children}
                                      </td>
                                    ),
                                    hr: ({ ...props }) => (
                                      <hr
                                        className="border-muted-foreground/20 my-4"
                                        {...props}
                                      />
                                    ),
                                    a: ({ children, ...props }) => (
                                      <a
                                        className="text-primary hover:text-primary/80 underline"
                                        {...props}
                                      >
                                        {children}
                                      </a>
                                    ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                                {/* Streaming cursor indicator */}
                                {isWaitingForResponse &&
                                  index === messages.length - 1 &&
                                  message.content !== "" && (
                                    <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse"></span>
                                  )}
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap text-base">
                                {message.content}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Loading indicator when waiting for response but no content yet */}
                    {isWaitingForResponse &&
                      (messages.length === 0 ||
                        messages[messages.length - 1]?.role !== "assistant" ||
                        messages[messages.length - 1]?.content === "") && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-lg p-4 bg-muted">
                            <div className="flex items-center space-x-3">
                              <div className="flex space-x-1">
                                <div
                                  className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                ></div>
                              </div>
                              <span className="text-sm text-muted-foreground font-medium">
                                AI is thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Input - Fixed at bottom with better spacing and styling */}
            <div className="mt-4 mb-12 flex-shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder={
                    documents.filter((d) => d.embedding_status === "completed")
                      .length === 0
                      ? "Upload and process PDFs first to start chatting..."
                      : "Ask me anything about your documents..."
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={
                    isSending ||
                    documents.filter((d) => d.embedding_status === "completed")
                      .length === 0
                  }
                  className="flex-1 h-16 px-6 py-4 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm placeholder:text-lg"
                  style={{
                    fontSize: "1.125rem", // 18px - More reasonable size
                    lineHeight: "1.75rem",
                  }}
                />
                <Button
                  type="submit"
                  disabled={
                    !prompt.trim() ||
                    isSending ||
                    documents.filter((d) => d.embedding_status === "completed")
                      .length === 0
                  }
                  size="lg"
                  className="px-6 h-16 text-lg font-medium rounded-xl"
                >
                  {isSending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
