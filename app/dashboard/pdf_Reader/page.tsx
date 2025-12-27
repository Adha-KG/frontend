"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  LogOut,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  RefreshCw,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { documentsAPI, authAPI } from "@/lib/api";
import type { Document as DocumentType } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

// Set up PDF.js worker
if (typeof window !== "undefined") {
  // Use local worker file from public directory (served by Next.js)
  // This matches react-pdf's PDF.js version (5.4.296)
  // The worker file is copied from node_modules/.pnpm/pdfjs-dist@5.4.296
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  console.log("PDF.js worker source:", pdfjs.GlobalWorkerOptions.workerSrc);
  console.log("PDF.js version:", pdfjs.version);
  console.log("Worker should match version 5.4.296");
}

// Add react-pdf styles
if (typeof document !== "undefined") {
  const styleId = "react-pdf-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .react-pdf__Page {
        max-width: 100%;
      }
      .react-pdf__Page__canvas {
        max-width: 100%;
        height: auto !important;
      }
      .react-pdf__Page__textContent {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        opacity: 0.2;
        line-height: 1;
      }
      .react-pdf__Page__textContent span {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
      }
      .react-pdf__Page__annotations {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
      }
      .react-pdf__Page__annotation {
        position: absolute;
      }
    `;
    document.head.appendChild(style);
  }
}

export default function PDFReaderPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(
    null,
  );
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const handleLogout = useCallback(async () => {
    const { clearAuth } = useAuthStore.getState();

    // Clear Supabase session if it exists
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("Failed to sign out from Supabase:", error);
    }

    // Clear local auth state
    clearAuth();
    router.push("/auth/sign-in");
  }, [router]);

  const initializeData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [userProfile, documentsData] = await Promise.all([
        authAPI.getCurrentUser(),
        documentsAPI.getDocuments(),
      ]);

      // userProfile is fetched but username is not used in the component
      // Keeping the API call for potential future use
      void userProfile;
      setDocuments(documentsData);
    } catch (err) {
      console.error("Failed to initialize data:", err);
      if (err instanceof Error && err.message.includes("401")) {
        handleLogout();
      } else {
        setError("Failed to load documents. Please refresh the page.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    // Check for access_token first (new system), then fall back to token (old system)
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      router.push("/auth/sign-in");
      return;
    }

    initializeData();
  }, [router, initializeData]);

  const handleDocumentSelect = async (document: DocumentType) => {
    setSelectedDocument(document);
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
    setIsLoadingPdf(true);
    setError("");
    setPdfBlob(null); // Clear previous blob
    // Clean up previous URL if exists
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token");
      }

      const apiUrl = documentsAPI.getDocumentViewUrl(document.id);
      console.log("Fetching PDF from:", apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch PDF:", errorText);
        throw new Error(
          `Failed to fetch PDF: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();
      console.log("PDF blob received, size:", blob.size, "type:", blob.type);

      if (blob.type !== "application/pdf" && !blob.type.includes("pdf")) {
        console.warn("Blob type is not PDF:", blob.type);
      }

      // Create object URL from blob
      const objectUrl = URL.createObjectURL(blob);
      console.log("Created object URL:", objectUrl);

      // Clean up previous URL if exists
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfBlob(blob);
      setPdfUrl(objectUrl);
      // Note: isLoadingPdf will be set to false in onDocumentLoadSuccess
      // Don't set it to false here, let the Document component handle it
      console.log("PDF blob set, waiting for Document component to load...");
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load PDF. Please try again.",
      );
      setIsLoadingPdf(false);
      setPdfBlob(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log("PDF loaded successfully, pages:", numPages);
    setNumPages(numPages);
    setIsLoadingPdf(false);
    setError("");
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF in Document component:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    setIsLoadingPdf(false);
    setError(`Failed to load PDF: ${error.message}`);
  };

  const onDocumentLoadProgress = ({
    loaded,
    total,
  }: {
    loaded: number;
    total: number;
  }) => {
    console.log(`PDF loading progress: ${loaded} / ${total}`);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (selectedDocument) {
      const url = documentsAPI.getDocumentViewUrl(selectedDocument.id);
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedDocument.original_filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading PDF Reader...</p>
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
              <h1 className="text-2xl font-bold">PDF Reader</h1>
              <p className="text-muted-foreground text-sm">
                View and read your uploaded PDF documents
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

        {/* Main Content */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Document List Sidebar */}
          <div className="w-64 flex-shrink-0 flex flex-col border-r pr-4">
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg">Your Documents</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents uploaded yet</p>
                    <p className="text-xs mt-1">
                      Upload PDFs from the dashboard to view them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <Card
                        key={doc.id}
                        className={`cursor-pointer transition-colors ${
                          selectedDocument?.id === doc.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => handleDocumentSelect(doc)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start space-x-2">
                            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.original_filename || doc.filename}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {doc.embedding_status || "unknown"}
                                </Badge>
                                {doc.file_size && (
                                  <span className="text-xs text-muted-foreground">
                                    {(doc.file_size / 1024 / 1024).toFixed(2)}{" "}
                                    MB
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedDocument ? (
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {selectedDocument.original_filename ||
                          selectedDocument.filename}
                      </CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Zoom Controls */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={scale <= 0.5}
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                        {Math.round(scale * 100)}%
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={scale >= 3.0}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      {/* Rotate */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRotate}
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      {/* Download */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4 flex flex-col items-center">
                  {isLoadingPdf && !pdfBlob ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <p className="text-muted-foreground">Fetching PDF...</p>
                    </div>
                  ) : pdfBlob ? (
                    <>
                      <div className="mb-4 flex items-center justify-center space-x-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPrevPage}
                          disabled={pageNumber <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {pageNumber} of {numPages || "?"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={!numPages || pageNumber >= numPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <Document
                          key={selectedDocument?.id || "pdf-document"}
                          file={pdfBlob}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          onLoadProgress={onDocumentLoadProgress}
                          loading={
                            <div className="flex flex-col items-center">
                              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                              <p className="text-muted-foreground">
                                Loading PDF...
                              </p>
                            </div>
                          }
                          error={
                            <div className="text-center text-red-600">
                              <p>Failed to load PDF</p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Please try again or select another document
                              </p>
                            </div>
                          }
                        >
                          <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            rotate={rotation}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="shadow-lg"
                          />
                        </Document>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p>No PDF loaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Document Selected
                  </h3>
                  <p className="text-muted-foreground">
                    Select a document from the list to view it
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
