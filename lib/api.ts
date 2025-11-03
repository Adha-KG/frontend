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

// Health check
export const healthAPI = {
  async checkHealth(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },
};
