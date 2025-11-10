"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { documentsAPI, chatAPI, queryAPI, authAPI } from "@/lib/api";
import type { Document, ChatSession, QueryResponse } from "@/lib/api";
import { Header } from "@/components/chat/header";
import { UploadPDFsCard } from "@/components/chat/upload-pdfs-card";
import { DocumentsList } from "@/components/chat/documents-list";
import { ChatSessionsList } from "@/components/chat/chat-sessions-list";
import { ActiveSessionInfo } from "@/components/chat/active-session-info";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import type { Message } from "@/components/chat/types";
import { MAX_FILE_SIZE, MAX_TOTAL_SIZE } from "@/components/chat/types";

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

  const router = useRouter();

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

  const completedDocumentsCount = documents.filter(
    (d) => d.embedding_status === "completed",
  ).length;

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
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <div className="w-full max-w-full px-4 pt-4 flex-shrink-0">
        <Header
          username={username}
          onRefresh={initializeData}
          onLogout={handleLogout}
        />

        {/* Error Alert */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content - Flex layout for better space distribution */}
      <div className="flex gap-4 flex-1 min-h-0 px-4 pb-4 overflow-hidden">
        {/* Left Sidebar - Fixed with internal scroll */}
        <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <UploadPDFsCard
              files={files}
              isUploading={isUploading}
              isDragging={isDragging}
              onFilesChange={handleFilesChange}
              onRemoveFile={removeFile}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />

            <DocumentsList
              documents={documents}
              selectedDocuments={selectedDocuments}
              onToggleSelection={toggleDocumentSelection}
              onDeleteDocument={deleteDocument}
            />

            <ChatSessionsList
              chatSessions={chatSessions}
              currentSessionId={currentSessionId}
              onSwitchSession={switchChatSession}
              onDeleteSession={deleteChatSession}
              onCreateNewSession={() => createNewChatSession()}
            />
          </div>
        </div>

        {/* Right Panel: Chat Interface - Much Larger */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <ActiveSessionInfo
            currentSessionId={currentSessionId}
            selectedDocumentsCount={selectedDocuments.length}
            onClearSession={clearSession}
          />

          <ChatMessages
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isWaitingForResponse={isWaitingForResponse}
            completedDocumentsCount={completedDocumentsCount}
          />

          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            isSending={isSending}
            completedDocumentsCount={completedDocumentsCount}
            onSubmit={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
