import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Message } from "./types";

interface ChatMessagesProps {
  messages: Message[];
  isLoadingMessages: boolean;
  isWaitingForResponse: boolean;
  completedDocumentsCount: number;
}

export function ChatMessages({
  messages,
  isLoadingMessages,
  isWaitingForResponse,
  completedDocumentsCount,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
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
              <h3 className="text-lg font-medium mb-2">Ready to Chat!</h3>
              <p className="text-muted-foreground mb-4">
                {completedDocumentsCount === 0
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
                              <em className="italic text-foreground" {...props}>
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
                            code: ({ children, className, ...props }) => {
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
  );
}
