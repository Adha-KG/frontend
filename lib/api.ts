// API service layer for StudyMate AI frontend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types for API responses
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    created_at: string;
    last_sign_in_at?: string;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  storage_path: string;
  embedding_status: "pending" | "processing" | "completed" | "failed";
  chroma_collection_name: string;
  chroma_document_ids?: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ChatSession {
  id: string;
  session_name: string;
  session_type: string;
  is_active: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  document_ids: string[];
}

export interface SourceDocument {
  page_content?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  content: string;
  tokens_used?: number;
  source_documents?: SourceDocument[];
  retrieval_query?: string;
  created_at: string;
}

export interface QueryResponse {
  answer: string;
  session_id: string;
  session_name: string;
  is_new_session: boolean;
  message_count: number;
}

export interface UploadResponse {
  filename: string;
  stored_as: string;
  task_id?: string;
  document_id: string;
  message: string;
}

export interface UserStats {
  user_id: string;
  total_documents: number;
  total_chat_sessions: number;
  documents_by_status: {
    completed: number;
    processing: number;
    failed: number;
    pending: number;
  };
}

// Notes API types (unified with documents)
export interface Note {
  id: string;
  user_id: string;
  document_ids: string[];
  title?: string;
  note_text?: string;
  note_style: NoteStyle;
  metadata?: {
    total_chunks?: number;
    total_documents?: number;
    synthesis_method?: string;
    note_style?: string;
    llm_provider?: string;
    llm_model?: string;
    tokens_used?: number;
    [key: string]: unknown;
  };
  status:
    | "generating"
    | "retrieving"
    | "summarizing"
    | "synthesizing"
    | "completed"
    | "failed";
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteListItem {
  id: string;
  document_ids: string[];
  title?: string;
  status: string;
  note_style: string;
  created_at: string;
  updated_at: string;
}

export interface NoteGenerateRequest {
  document_ids: string[];
  note_style?: NoteStyle;
  user_prompt?: string;
  title?: string;
}

export interface NoteGenerateResponse {
  id: string;
  user_id: string;
  document_ids: string[];
  title?: string;
  status: string;
  task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteAnswer {
  answer: string;
  sources: Array<{
    chunk_index: number;
    document_id?: string;
    relevance_score: number;
    preview: string;
  }>;
  model_info: {
    provider: string;
    model: string;
    tokens_used: number;
  };
}

export type NoteStyle = "short" | "moderate" | "descriptive";

// Legacy types for backward compatibility (deprecated)
export interface NoteFile {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  sha256: string;
  file_size: number;
  status:
    | "uploaded"
    | "processing"
    | "indexed"
    | "summarizing"
    | "completed"
    | "failed";
  error?: string;
  user_prompt?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface NoteUploadResponse {
  file_id: string;
  task_id: string;
  filename: string;
  status: string;
  message: string;
}

export interface NoteContent {
  file_id: string;
  note_text: string;
  metadata?: {
    total_chunks?: number;
    synthesis_method?: string;
    note_style?: string;
    [key: string]: unknown;
  };
  created_at: string;
  original_filename?: string;
  llm_provider?: string;
  llm_model?: string;
  updated_at?: string;
}

// Quiz API types
export interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[]; // Always 4 options
  correct_answer: number; // 0-3 index
  explanation?: string;
  question_number: number;
}

export interface QuizResponse {
  id: string;
  user_id: string;
  title?: string;
  document_ids: string[];
  num_questions: number;
  time_limit_minutes: number;
  difficulty?: "easy" | "medium" | "hard";
  status: "generating" | "ready" | "failed";
  questions?: QuizQuestion[];
  created_at: string;
  updated_at: string;
}

export interface QuizListResponse {
  id: string;
  user_id: string;
  title?: string;
  document_ids: string[];
  num_questions: number;
  time_limit_minutes: number;
  difficulty?: "easy" | "medium" | "hard";
  status: "generating" | "ready" | "failed";
  created_at: string;
  updated_at: string;
}

export interface QuizAnswerResponse {
  id: string;
  question_id: string;
  selected_answer?: number; // 0-3
  is_correct?: boolean;
  time_spent_seconds?: number;
  answered_at?: string;
}

export interface QuizAttemptResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  time_spent_seconds?: number;
  status: "in_progress" | "completed" | "timeout" | "abandoned";
  score?: number; // correct answers count
  total_questions: number;
  percentage_score?: number;
  answers?: QuizAnswerResponse[];
  created_at: string;
  updated_at: string;
}

export interface QuizAttemptListResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  time_spent_seconds?: number;
  status: "in_progress" | "completed" | "timeout" | "abandoned";
  score?: number;
  total_questions: number;
  percentage_score?: number;
  created_at: string;
  updated_at: string;
}

export interface QuizGenerateRequest {
  document_ids: string[];
  num_questions: number;
  time_limit_minutes: number;
  difficulty?: "easy" | "medium" | "hard";
  title?: string;
}

export interface QuizStreamEvent {
  status: string;
  message?: string;
  quiz_id?: string;
  quiz?: QuizResponse;
  questions?: QuizQuestion[];
  done: boolean;
  error?: boolean;
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error("Failed to parse response" + error);
  }
};

// Authentication API
export const authAPI = {
  async signUp(userData: {
    email: string;
    password: string;
    username: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return handleResponse<AuthResponse>(response);
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(response);
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<User>(response);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Unable to connect to the server. Please check your connection.",
        );
      }
      throw error;
    }
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse<User>(response);
  },
};

// Documents API
export const documentsAPI = {
  async uploadDocuments(files: File[]): Promise<UploadResponse[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/upload-multiple`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return handleResponse<UploadResponse[]>(response);
  },

  async getDocuments(): Promise<Document[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Document[]>(response);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to the server.");
      }
      throw error;
    }
  },

  async deleteDocument(documentId: string): Promise<{
    message: string;
    document_id: string;
    embeddings_deleted: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Chat Sessions API
export const chatAPI = {
  async createChatSession(sessionData: {
    session_name: string;
    session_type: string;
    document_ids: string[];
  }): Promise<ChatSession> {
    const response = await fetch(`${API_BASE_URL}/chat-sessions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(sessionData),
    });
    return handleResponse<ChatSession>(response);
  },

  async getChatSessions(): Promise<ChatSession[]> {
    const response = await fetch(`${API_BASE_URL}/chat-sessions`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ChatSession[]>(response);
  },

  async updateSessionName(
    sessionId: string,
    newName: string,
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/chat-sessions/${sessionId}/name`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(newName),
      },
    );
    return handleResponse(response);
  },

  async deleteChatSession(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getChatMessages(
    sessionId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const response = await fetch(
      `${API_BASE_URL}/chat-sessions/${sessionId}/messages?limit=${limit}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return handleResponse<ChatMessage[]>(response);
  },

  async addChatMessage(
    sessionId: string,
    messageData: {
      content: string;
      tokens_used?: number;
      source_documents?: SourceDocument[];
      retrieval_query?: string;
    },
  ): Promise<ChatMessage> {
    const response = await fetch(
      `${API_BASE_URL}/chat-sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(messageData),
      },
    );
    return handleResponse<ChatMessage>(response);
  },
};

// Query/RAG API
export const queryAPI = {
  async queryRAG(
    question: string,
    options?: {
      session_id?: string;
      new_chat?: boolean;
    },
  ): Promise<QueryResponse> {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        question,
        ...options,
      }),
    });
    return handleResponse<QueryResponse>(response);
  },

  async queryRAGStream(
    question: string,
    options?: {
      session_id?: string;
      new_chat?: boolean;
    },
    onChunk?: (content: string) => void,
  ): Promise<QueryResponse> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/query/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        ...options,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "An error occurred" }));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split by double newlines (SSE format)
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const event of lines) {
        // Skip empty events
        if (!event.trim()) continue;

        // Process each line in the event (SSE events can have multiple lines)
        const eventLines = event.split("\n");
        for (const eventLine of eventLines) {
          // SSE format: "data: {json}"
          if (eventLine.startsWith("data: ")) {
            try {
              const jsonStr = eventLine.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);

              if (data.error) {
                throw new Error(
                  data.content || "An error occurred during streaming",
                );
              }

              // Check if streaming is done first
              if (data.done) {
                // Final event: content is empty, full_response contains complete response
                return {
                  answer: data.full_response || fullResponse,
                  session_id: data.session_id || options?.session_id || "",
                  session_name: data.session_name || "",
                  is_new_session: data.is_new_session || false,
                  message_count: data.message_count || 0,
                };
              }

              // Process content chunk (can be empty string, which is valid)
              if (data.content !== undefined) {
                fullResponse += data.content;
                if (onChunk && data.content) {
                  // Only call onChunk if content is not empty
                  onChunk(data.content);
                }
              }
            } catch (parseError) {
              // If JSON parsing fails, skip this line
              console.warn("Failed to parse SSE data:", eventLine, parseError);
            }
          }
          // Skip comment lines (SSE format: lines starting with :)
          // Skip empty lines
        }
      }
    }

    // Fallback: return what we have
    return {
      answer: fullResponse,
      session_id: options?.session_id || "",
      session_name: "",
      is_new_session: false,
      message_count: 0,
    };
  },

  async queryWithChatContext(
    sessionId: string,
    question: string,
  ): Promise<QueryResponse> {
    const response = await fetch(
      `${API_BASE_URL}/chat-sessions/${sessionId}/query`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ question }),
      },
    );
    return handleResponse<QueryResponse>(response);
  },
};

// Stats API
export const statsAPI = {
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<UserStats>(response);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to the server.");
      }
      throw error;
    }
  },

  async getAdminStats(): Promise<{
    total_users: number;
    total_documents: number;
    status: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Notes API (unified with documents)
export const notesAPI = {
  /**
   * Generate notes from documents
   * This is the new unified approach - documents are uploaded via documentsAPI.uploadDocuments()
   */
  async generateNotes(
    request: NoteGenerateRequest,
  ): Promise<NoteGenerateResponse> {
    const response = await fetch(`${API_BASE_URL}/notes/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<NoteGenerateResponse>(response);
  },

  /**
   * List all notes for the current user
   */
  async listNotes(
    limit: number = 50,
    offset: number = 0,
  ): Promise<NoteListItem[]> {
    const response = await fetch(
      `${API_BASE_URL}/notes?limit=${limit}&offset=${offset}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return handleResponse<NoteListItem[]>(response);
  },

  /**
   * Get a specific note by ID
   */
  async getNote(noteId: string): Promise<Note> {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Note>(response);
  },

  /**
   * Delete a note
   */
  async deleteNote(
    noteId: string,
  ): Promise<{ message: string; note_id: string }> {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Download notes as markdown file
   */
  async downloadNotesMarkdown(noteId: string): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/notes/${noteId}/download/markdown`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to download notes: ${response.statusText}`);
    }
    return response.blob();
  },

  /**
   * Download notes as PDF
   */
  async downloadNotesPDF(noteId: string): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/notes/${noteId}/download/pdf`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    return response.blob();
  },

  /**
   * Ask a question about the source documents of a note
   */
  async askQuestion(
    noteId: string,
    question: string,
    nResults: number = 5,
  ): Promise<NoteAnswer> {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/ask`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ question, n_results: nResults }),
    });
    return handleResponse<NoteAnswer>(response);
  },

  // ====== Legacy methods (deprecated) ======
  // These are kept for backward compatibility but will return errors from the backend

  /**
   * @deprecated Use documentsAPI.uploadDocuments() then notesAPI.generateNotes()
   */
  async uploadPDF(
    file: File,
    noteStyle: NoteStyle = "moderate",
    userPrompt?: string,
  ): Promise<NoteUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("note_style", noteStyle);
    if (userPrompt) {
      formData.append("user_prompt", userPrompt);
    }

    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/notes/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  /**
   * @deprecated Use notesAPI.getNote() instead
   */
  async getFileStatus(fileId: string): Promise<NoteFile> {
    const response = await fetch(`${API_BASE_URL}/notes/status/${fileId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * @deprecated Use notesAPI.listNotes() instead
   */
  async listFiles(
    limit: number = 10,
    offset: number = 0,
  ): Promise<{ files: NoteFile[]; total: number }> {
    const response = await fetch(
      `${API_BASE_URL}/notes/files?limit=${limit}&offset=${offset}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return handleResponse(response);
  },

  /**
   * @deprecated Use notesAPI.getNote() instead
   */
  async getNotes(fileId: string): Promise<NoteContent> {
    const response = await fetch(`${API_BASE_URL}/notes/${fileId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * @deprecated Use notesAPI.deleteNote() instead
   */
  async deleteFile(fileId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/notes/files/${fileId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Quiz API
export const quizAPI = {
  /**
   * Generate a quiz synchronously
   */
  async generateQuiz(request: QuizGenerateRequest): Promise<QuizResponse> {
    const response = await fetch(`${API_BASE_URL}/quizzes/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<QuizResponse>(response);
  },

  /**
   * Generate a quiz with streaming progress updates
   */
  async generateQuizStream(
    request: QuizGenerateRequest,
    onEvent?: (event: QuizStreamEvent) => void,
  ): Promise<QuizResponse> {
    const token = localStorage.getItem("token");

    // Send initial status event if callback provided
    if (onEvent) {
      onEvent({
        status: "generating",
        message: "Generating quiz...",
        done: false,
      });
    }

    const response = await fetch(`${API_BASE_URL}/quizzes/generate/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "An error occurred" }));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`,
      );
    }

    const quiz: QuizResponse = await response.json();

    // Send completion event if callback provided
    if (onEvent) {
      onEvent({
        status: "complete",
        message: `Generated ${quiz.num_questions} questions`,
        quiz: quiz,
        done: true,
      });
    }

    return quiz;
  },

  /**
   * Get all quizzes for the current user
   */
  async getQuizzes(): Promise<QuizListResponse[]> {
    const response = await fetch(`${API_BASE_URL}/quizzes`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<QuizListResponse[]>(response);
  },

  /**
   * Get quiz details by ID
   */
  async getQuiz(quizId: string): Promise<QuizResponse> {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<QuizResponse>(response);
  },

  /**
   * Start a quiz attempt
   */
  async startAttempt(quizId: string): Promise<QuizAttemptResponse> {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse<QuizAttemptResponse>(response);
  },

  /**
   * Submit an answer for a question
   */
  async submitAnswer(
    attemptId: string,
    questionId: string,
    selectedAnswer: number,
    timeSpentSeconds?: number,
  ): Promise<QuizAnswerResponse> {
    const response = await fetch(
      `${API_BASE_URL}/quizzes/attempts/${attemptId}/answers`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          question_id: questionId,
          selected_answer: selectedAnswer,
          time_spent_seconds: timeSpentSeconds,
        }),
      },
    );
    return handleResponse<QuizAnswerResponse>(response);
  },

  /**
   * Complete a quiz attempt
   */
  async completeAttempt(
    attemptId: string,
    timeSpentSeconds?: number,
  ): Promise<QuizAttemptResponse> {
    const url = new URL(
      `${API_BASE_URL}/quizzes/attempts/${attemptId}/complete`,
    );
    if (timeSpentSeconds !== undefined) {
      url.searchParams.append(
        "time_spent_seconds",
        timeSpentSeconds.toString(),
      );
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return handleResponse<QuizAttemptResponse>(response);
  },

  /**
   * Abandon a quiz attempt
   */
  async abandonAttempt(attemptId: string): Promise<QuizAttemptResponse> {
    const response = await fetch(
      `${API_BASE_URL}/quizzes/attempts/${attemptId}/abandon`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
      },
    );
    return handleResponse<QuizAttemptResponse>(response);
  },

  /**
   * Get attempt details
   */
  async getAttempt(attemptId: string): Promise<QuizAttemptResponse> {
    const response = await fetch(
      `${API_BASE_URL}/quizzes/attempts/${attemptId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return handleResponse<QuizAttemptResponse>(response);
  },

  /**
   * Get all attempts for a quiz
   */
  async getQuizAttempts(quizId: string): Promise<QuizAttemptListResponse[]> {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<QuizAttemptListResponse[]>(response);
  },
};

// Health check
export const healthAPI = {
  async checkHealth(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },
};

// Flashcard types
export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardGenerateRequest {
  topic?: string;
  document_ids?: string[];
  num_flashcards?: number;
}

export interface FlashcardGenerateResponse {
  flashcards: Flashcard[];
  topic?: string;
  num_generated: number;
}

// Flashcards API
export const flashcardsAPI = {
  async generateFlashcards(
    request: FlashcardGenerateRequest,
  ): Promise<FlashcardGenerateResponse> {
    const response = await fetch(`${API_BASE_URL}/flashcards/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<FlashcardGenerateResponse>(response);
  },

  async generateFlashcardsStream(
    request: FlashcardGenerateRequest,
    onProgress?: (status: string, message: string) => void,
    onComplete?: (flashcards: Flashcard[]) => void,
    onError?: (error: string) => void,
  ): Promise<Flashcard[]> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/flashcards/generate/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "An error occurred" }));
      const errorMsg =
        errorData.detail || `HTTP error! status: ${response.status}`;
      if (onError) onError(errorMsg);
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const errorMsg = "Response body is not readable";
      if (onError) onError(errorMsg);
      throw new Error(errorMsg);
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let flashcards: Flashcard[] = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const event of lines) {
        if (!event.trim()) continue;

        const eventLines = event.split("\n");
        for (const eventLine of eventLines) {
          if (eventLine.startsWith("data: ")) {
            try {
              const jsonStr = eventLine.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);

              if (data.error) {
                const errorMsg = data.message || "An error occurred";
                if (onError) onError(errorMsg);
                throw new Error(errorMsg);
              }

              // Handle status updates
              if (data.status && onProgress) {
                onProgress(data.status, data.message || "");
              }

              // Handle completion
              if (data.done) {
                if (data.flashcards) {
                  flashcards = data.flashcards;
                }
                if (onComplete && flashcards.length > 0) {
                  onComplete(flashcards);
                }
                return flashcards;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", eventLine, parseError);
            }
          }
        }
      }
    }

    return flashcards;
  },
};
