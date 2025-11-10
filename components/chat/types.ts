export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total
