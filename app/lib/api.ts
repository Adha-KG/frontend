import { useAuth } from "@clerk/nextjs";

/**
 * Sends a chat message to the FastAPI backend
 */
export async function sendMessage(message: string) {
  const { getToken } = useAuth();
  const token = await getToken();

  const response = await fetch("http://localhost:8000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) throw new Error("Request failed");
  return response.json();
}
