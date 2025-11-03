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
    const errorData = await response
      .json()
      .catch(() => ({ detail: "An error occurred" }));
    throw new Error(
      errorData.detail || `HTTP error! status: ${response.status}`,
    );
  }
  return response.json();
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
    const response = await fetch(`${API_BASE_URL}/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User>(response);
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
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Document[]>(response);
  },

  async deleteDocument(
    documentId: string,
  ): Promise<{
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
  ): Promise<ReadableStream> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/query-stream`, {
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

    return response.body!;
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
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<UserStats>(response);
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
