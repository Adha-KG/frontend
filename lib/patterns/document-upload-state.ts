/**
 * State Design Pattern Implementation
 *
 * This demonstrates the State Design Pattern for managing document upload states.
 * The pattern allows an object to alter its behavior when its internal state changes.
 *
 * Structure:
 * - State interface: Defines the contract for all concrete states
 * - Concrete States: Implement specific behaviors for each state
 * - Context: Maintains a reference to the current state and delegates behavior to it
 */

// ============================================================================
// State Interface
// ============================================================================

/**
 * Abstract state interface that defines the contract for all document upload states
 */
export interface DocumentUploadState {
  /**
   * Handle file selection/upload initiation
   */
  handleUpload(context: DocumentUploadContext, files: File[]): void;

  /**
   * Handle upload cancellation
   */
  handleCancel(context: DocumentUploadContext): void;

  /**
   * Handle upload completion
   */
  handleComplete(context: DocumentUploadContext, result: unknown): void;

  /**
   * Handle upload error
   */
  handleError(context: DocumentUploadContext, error: Error): void;

  /**
   * Get the current state name
   */
  getStateName(): string;

  /**
   * Check if upload can be cancelled in this state
   */
  canCancel(): boolean;

  /**
   * Get UI message for this state
   */
  getMessage(): string;
}

// ============================================================================
// Context Class
// ============================================================================

/**
 * Context class that maintains the current state and delegates behavior to it
 */
export class DocumentUploadContext {
  private state: DocumentUploadState;
  private files: File[] = [];
  private error: Error | null = null;
  private result: unknown = null;
  private progress: number = 0;

  constructor(initialState: DocumentUploadState) {
    this.state = initialState;
  }

  /**
   * Transition to a new state
   */
  setState(newState: DocumentUploadState): void {
    console.log(
      `State transition: ${this.state.getStateName()} -> ${newState.getStateName()}`,
    );
    this.state = newState;
  }

  /**
   * Get current state
   */
  getState(): DocumentUploadState {
    return this.state;
  }

  /**
   * Delegate upload handling to current state
   */
  upload(files: File[]): void {
    this.state.handleUpload(this, files);
  }

  /**
   * Delegate cancellation to current state
   */
  cancel(): void {
    this.state.handleCancel(this);
  }

  /**
   * Delegate completion to current state
   */
  complete(result: unknown): void {
    this.state.handleComplete(this, result);
  }

  /**
   * Delegate error handling to current state
   */
  handleError(error: Error): void {
    this.state.handleError(this, error);
  }

  // Getters and setters
  setFiles(files: File[]): void {
    this.files = files;
  }

  getFiles(): File[] {
    return this.files;
  }

  setError(error: Error | null): void {
    this.error = error;
  }

  getError(): Error | null {
    return this.error;
  }

  setResult(result: unknown): void {
    this.result = result;
  }

  getResult(): unknown {
    return this.result;
  }

  setProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(100, progress));
  }

  getProgress(): number {
    return this.progress;
  }

  /**
   * Check if upload can be cancelled
   */
  canCancel(): boolean {
    return this.state.canCancel();
  }

  /**
   * Get current state message
   */
  getMessage(): string {
    return this.state.getMessage();
  }
}

// ============================================================================
// Concrete State Classes
// ============================================================================

/**
 * Idle State: Initial state when no upload is in progress
 */
export class IdleState implements DocumentUploadState {
  handleUpload(context: DocumentUploadContext, files: File[]): void {
    if (files.length === 0) {
      return;
    }
    context.setFiles(files);
    context.setError(null);
    context.setProgress(0);
    context.setState(new UploadingState());
  }

  handleCancel(_context: DocumentUploadContext): void {
    // Nothing to cancel in idle state
  }

  handleComplete(_context: DocumentUploadContext, _result: unknown): void {
    // Cannot complete from idle state
  }

  handleError(_context: DocumentUploadContext, _error: Error): void {
    // No error in idle state
  }

  getStateName(): string {
    return "Idle";
  }

  canCancel(): boolean {
    return false;
  }

  getMessage(): string {
    return "Ready to upload documents";
  }
}

/**
 * Uploading State: Files are being uploaded to the server
 */
export class UploadingState implements DocumentUploadState {
  handleUpload(_context: DocumentUploadContext, _files: File[]): void {
    // Already uploading, ignore new upload requests
    console.warn("Upload already in progress");
  }

  handleCancel(context: DocumentUploadContext): void {
    context.setFiles([]);
    context.setError(null);
    context.setProgress(0);
    context.setState(new IdleState());
  }

  handleComplete(context: DocumentUploadContext, result: unknown): void {
    context.setResult(result);
    context.setProgress(100);
    context.setState(new ProcessingState());
  }

  handleError(context: DocumentUploadContext, error: Error): void {
    context.setError(error);
    context.setState(new ErrorState());
  }

  getStateName(): string {
    return "Uploading";
  }

  canCancel(): boolean {
    return true;
  }

  getMessage(): string {
    return "Uploading documents...";
  }
}

/**
 * Processing State: Documents are being processed/embedded
 */
export class ProcessingState implements DocumentUploadState {
  handleUpload(_context: DocumentUploadContext, _files: File[]): void {
    // Cannot start new upload while processing
    console.warn("Cannot upload while documents are processing");
  }

  handleCancel(_context: DocumentUploadContext): void {
    // Processing cannot be cancelled (it's server-side)
    console.warn("Processing cannot be cancelled");
  }

  handleComplete(context: DocumentUploadContext, result: unknown): void {
    context.setResult(result);
    context.setState(new CompletedState());
  }

  handleError(context: DocumentUploadContext, error: Error): void {
    context.setError(error);
    context.setState(new ErrorState());
  }

  getStateName(): string {
    return "Processing";
  }

  canCancel(): boolean {
    return false;
  }

  getMessage(): string {
    return "Processing documents...";
  }
}

/**
 * Completed State: Upload and processing completed successfully
 */
export class CompletedState implements DocumentUploadState {
  handleUpload(context: DocumentUploadContext, files: File[]): void {
    // Reset and start new upload
    context.setFiles([]);
    context.setError(null);
    context.setResult(null);
    context.setProgress(0);
    context.setState(new IdleState());
    context.upload(files);
  }

  handleCancel(context: DocumentUploadContext): void {
    // Reset to idle
    context.setFiles([]);
    context.setError(null);
    context.setResult(null);
    context.setProgress(0);
    context.setState(new IdleState());
  }

  handleComplete(context: DocumentUploadContext, result: unknown): void {
    // Already completed
    context.setResult(result);
  }

  handleError(context: DocumentUploadContext, error: Error): void {
    // Should not error in completed state, but handle gracefully
    context.setError(error);
    context.setState(new ErrorState());
  }

  getStateName(): string {
    return "Completed";
  }

  canCancel(): boolean {
    return false;
  }

  getMessage(): string {
    return "Upload completed successfully!";
  }
}

/**
 * Error State: An error occurred during upload or processing
 */
export class ErrorState implements DocumentUploadState {
  handleUpload(context: DocumentUploadContext, files: File[]): void {
    // Reset error and start new upload
    context.setError(null);
    context.setFiles([]);
    context.setResult(null);
    context.setProgress(0);
    context.setState(new IdleState());
    context.upload(files);
  }

  handleCancel(context: DocumentUploadContext): void {
    // Reset to idle
    context.setError(null);
    context.setFiles([]);
    context.setResult(null);
    context.setProgress(0);
    context.setState(new IdleState());
  }

  handleComplete(_context: DocumentUploadContext, _result: unknown): void {
    // Cannot complete from error state
    console.warn("Cannot complete from error state");
  }

  handleError(context: DocumentUploadContext, error: Error): void {
    // Update error
    context.setError(error);
  }

  getStateName(): string {
    return "Error";
  }

  canCancel(): boolean {
    return true;
  }

  getMessage(): string {
    return "An error occurred during upload";
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function to create a new DocumentUploadContext with initial Idle state
 */
export function createDocumentUploadContext(): DocumentUploadContext {
  return new DocumentUploadContext(new IdleState());
}
