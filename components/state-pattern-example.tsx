"use client";

/**
 * Example Component demonstrating the State Design Pattern
 *
 * This component shows how to use the DocumentUploadContext with the State Pattern
 * to manage document upload states in a clean, maintainable way.
 */

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UploadCloud,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  createDocumentUploadContext,
  DocumentUploadContext,
  type DocumentUploadState,
} from "@/lib/patterns/document-upload-state";
import { documentsAPI, type UploadResponse } from "@/lib/api";

export function StatePatternExample() {
  const [context] = useState<DocumentUploadContext>(() =>
    createDocumentUploadContext(),
  );
  const [currentState, setCurrentState] = useState<DocumentUploadState>(
    context.getState(),
  );
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<UploadResponse[] | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when context state changes
  useEffect(() => {
    const updateState = () => {
      setCurrentState(context.getState());
      setError(context.getError());
      const contextResult = context.getResult();
      setResult(
        Array.isArray(contextResult)
          ? (contextResult as UploadResponse[])
          : null,
      );
      setProgress(context.getProgress());
    };

    // Initial state
    updateState();

    // Poll for state changes (in a real app, you'd use an event emitter or observer pattern)
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, [context]);

  const handleFileSelect = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    // Use the state pattern to handle upload
    context.upload(selectedFiles);
    setCurrentState(context.getState());

    // Simulate upload process
    simulateUpload();
  };

  const simulateUpload = async () => {
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        context.setProgress(i);
        setProgress(i);

        if (i === 100) {
          // Upload complete, now processing
          try {
            const uploadResults = await documentsAPI.uploadDocuments(
              context.getFiles(),
            );
            context.complete(uploadResults);
            setCurrentState(context.getState());
            setResult(uploadResults);

            // Simulate processing delay
            setTimeout(() => {
              context.complete({ ...uploadResults, processed: true });
              setCurrentState(context.getState());
            }, 2000);
          } catch (err) {
            context.handleError(
              err instanceof Error ? err : new Error("Upload failed"),
            );
            setCurrentState(context.getState());
            setError(context.getError());
          }
        }
      }
    } catch (err) {
      context.handleError(
        err instanceof Error ? err : new Error("Upload failed"),
      );
      setCurrentState(context.getState());
      setError(context.getError());
    }
  };

  const handleCancel = () => {
    context.cancel();
    setCurrentState(context.getState());
    setError(null);
    setResult(null);
    setProgress(0);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelect(droppedFiles);
  };

  const getStateIcon = () => {
    switch (currentState.getStateName()) {
      case "Idle":
        return <UploadCloud className="w-6 h-6" />;
      case "Uploading":
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case "Processing":
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case "Completed":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "Error":
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getStateColor = () => {
    switch (currentState.getStateName()) {
      case "Idle":
        return "bg-gray-100 text-gray-800";
      case "Uploading":
        return "bg-blue-100 text-blue-800";
      case "Processing":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>State Design Pattern Example</CardTitle>
        <CardDescription>
          Demonstrates the State Design Pattern for managing document upload
          states. The context delegates behavior to the current state object.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State Display */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {getStateIcon()}
            <div>
              <p className="font-semibold">Current State</p>
              <p className="text-sm text-muted-foreground">
                {currentState.getMessage()}
              </p>
            </div>
          </div>
          <Badge className={getStateColor()}>
            {currentState.getStateName()}
          </Badge>
        </div>

        {/* State Information */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>State Pattern Benefits:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Each state encapsulates its own behavior</li>
              <li>State transitions are explicit and controlled</li>
              <li>Easy to add new states without modifying existing code</li>
              <li>Context delegates behavior to the current state</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <UploadCloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium mb-2">Drop files here or click to upload</p>
          <p className="text-sm text-muted-foreground">
            {currentState.getMessage()}
          </p>
        </div>

        {/* Progress Bar */}
        {(currentState.getStateName() === "Uploading" ||
          currentState.getStateName() === "Processing") && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {result && currentState.getStateName() === "Completed" && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Upload completed successfully! {result.length} file(s) uploaded.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={
              currentState.getStateName() === "Uploading" ||
              currentState.getStateName() === "Processing"
            }
            className="flex-1"
          >
            {currentState.getStateName() === "Idle"
              ? "Select Files"
              : "Select New Files"}
          </Button>
          {context.canCancel() && (
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* State Transition Diagram */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="font-semibold mb-2 text-sm">State Transitions:</p>
          <div className="text-xs space-y-1 font-mono">
            <p>Idle → Uploading (on file selection)</p>
            <p>Uploading → Processing (on upload complete)</p>
            <p>Uploading → Error (on upload error)</p>
            <p>Processing → Completed (on processing complete)</p>
            <p>Processing → Error (on processing error)</p>
            <p>Completed → Idle (on reset/new upload)</p>
            <p>Error → Idle (on reset/new upload)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
