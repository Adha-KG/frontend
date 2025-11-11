/**
 * Unit Tests for State Design Pattern Implementation
 *
 * These tests verify the functional stability of the State Design Pattern
 * implementation for document upload state management.
 */

/// <reference types="jest" />

import {
  createDocumentUploadContext,
  DocumentUploadContext,
  IdleState,
  UploadingState,
  ProcessingState,
  CompletedState,
  ErrorState,
} from "../document-upload-state";

describe("State Design Pattern - Document Upload State Management", () => {
  describe("State Classes", () => {
    test("IdleState should have correct properties", () => {
      const state = new IdleState();
      expect(state.getStateName()).toBe("Idle");
      expect(state.canCancel()).toBe(false);
      expect(state.getMessage()).toBe("Ready to upload documents");
    });

    test("UploadingState should have correct properties", () => {
      const state = new UploadingState();
      expect(state.getStateName()).toBe("Uploading");
      expect(state.canCancel()).toBe(true);
      expect(state.getMessage()).toBe("Uploading documents...");
    });

    test("ProcessingState should have correct properties", () => {
      const state = new ProcessingState();
      expect(state.getStateName()).toBe("Processing");
      expect(state.canCancel()).toBe(false);
      expect(state.getMessage()).toBe("Processing documents...");
    });

    test("CompletedState should have correct properties", () => {
      const state = new CompletedState();
      expect(state.getStateName()).toBe("Completed");
      expect(state.canCancel()).toBe(false);
      expect(state.getMessage()).toBe("Upload completed successfully!");
    });

    test("ErrorState should have correct properties", () => {
      const state = new ErrorState();
      expect(state.getStateName()).toBe("Error");
      expect(state.canCancel()).toBe(true);
      expect(state.getMessage()).toBe("An error occurred during upload");
    });
  });

  describe("DocumentUploadContext", () => {
    let context: DocumentUploadContext;

    beforeEach(() => {
      context = createDocumentUploadContext();
    });

    test("should initialize with IdleState", () => {
      expect(context.getState().getStateName()).toBe("Idle");
      expect(context.getFiles()).toEqual([]);
      expect(context.getError()).toBeNull();
      expect(context.getProgress()).toBe(0);
    });

    test("should transition from Idle to Uploading on upload", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);

      expect(context.getState().getStateName()).toBe("Uploading");
      expect(context.getFiles()).toEqual(files);
      expect(context.getError()).toBeNull();
    });

    test("should not transition from Idle with empty files", () => {
      context.upload([]);
      expect(context.getState().getStateName()).toBe("Idle");
    });

    test("should transition from Uploading to Processing on complete", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);
      context.complete({ document_id: "123" });

      expect(context.getState().getStateName()).toBe("Processing");
      expect(context.getResult()).toEqual({ document_id: "123" });
      expect(context.getProgress()).toBe(100);
    });

    test("should transition from Uploading to Error on error", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);
      const error = new Error("Upload failed");
      context.handleError(error);

      expect(context.getState().getStateName()).toBe("Error");
      expect(context.getError()).toEqual(error);
    });

    test("should allow cancellation in Uploading state", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);
      expect(context.canCancel()).toBe(true);

      context.cancel();
      expect(context.getState().getStateName()).toBe("Idle");
      expect(context.getFiles()).toEqual([]);
      expect(context.getError()).toBeNull();
      expect(context.getProgress()).toBe(0);
    });

    test("should not allow cancellation in Processing state", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);
      context.complete({});
      expect(context.canCancel()).toBe(false);
    });

    test("should transition from Processing to Completed", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);
      context.complete({ document_id: "123" });
      context.complete({ processed: true });

      expect(context.getState().getStateName()).toBe("Completed");
    });

    test("should transition from Processing to Error on error", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);
      context.complete({});
      context.handleError(new Error("Processing failed"));

      expect(context.getState().getStateName()).toBe("Error");
    });

    test("should reset from Completed to Idle on new upload", () => {
      const files1 = [new File(["test1"], "test1.pdf")];
      const files2 = [new File(["test2"], "test2.pdf")];

      context.upload(files1);
      context.complete({});
      context.complete({ processed: true });

      expect(context.getState().getStateName()).toBe("Completed");

      context.upload(files2);
      expect(context.getState().getStateName()).toBe("Uploading");
      expect(context.getFiles()).toEqual(files2);
      expect(context.getError()).toBeNull();
      expect(context.getResult()).toBeNull();
      expect(context.getProgress()).toBe(0);
    });

    test("should reset from Error to Idle on new upload", () => {
      const files1 = [new File(["test1"], "test1.pdf")];
      const files2 = [new File(["test2"], "test2.pdf")];

      context.upload(files1);
      context.handleError(new Error("Upload failed"));

      expect(context.getState().getStateName()).toBe("Error");

      context.upload(files2);
      expect(context.getState().getStateName()).toBe("Uploading");
      expect(context.getFiles()).toEqual(files2);
      expect(context.getError()).toBeNull();
    });

    test("should reset from Error to Idle on cancel", () => {
      const files = [new File(["test"], "test.pdf")];
      context.upload(files);
      context.handleError(new Error("Upload failed"));

      expect(context.getState().getStateName()).toBe("Error");

      context.cancel();
      expect(context.getState().getStateName()).toBe("Idle");
      expect(context.getFiles()).toEqual([]);
      expect(context.getError()).toBeNull();
    });

    test("should update progress correctly", () => {
      context.setProgress(50);
      expect(context.getProgress()).toBe(50);

      context.setProgress(150); // Should clamp to 100
      expect(context.getProgress()).toBe(100);

      context.setProgress(-10); // Should clamp to 0
      expect(context.getProgress()).toBe(0);
    });

    test("should prevent upload while already uploading", () => {
      const files1 = [new File(["test1"], "test1.pdf")];
      const files2 = [new File(["test2"], "test2.pdf")];

      context.upload(files1);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      context.upload(files2);

      expect(consoleSpy).toHaveBeenCalledWith("Upload already in progress");
      expect(context.getFiles()).toEqual(files1); // Should not change

      consoleSpy.mockRestore();
    });

    test("should prevent upload while processing", () => {
      const files1 = [new File(["test1"], "test1.pdf")];
      const files2 = [new File(["test2"], "test2.pdf")];

      context.upload(files1);
      context.complete({});
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      context.upload(files2);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Cannot upload while documents are processing",
      );
      expect(context.getFiles()).toEqual(files1); // Should not change

      consoleSpy.mockRestore();
    });
  });

  describe("State Transitions - Complete Flow", () => {
    test("should handle complete successful upload flow", () => {
      const context = createDocumentUploadContext();
      const files = [new File(["test"], "test.pdf")];

      // Idle -> Uploading
      context.upload(files);
      expect(context.getState().getStateName()).toBe("Uploading");

      // Uploading -> Processing
      context.complete({ document_id: "123" });
      expect(context.getState().getStateName()).toBe("Processing");

      // Processing -> Completed
      context.complete({ processed: true });
      expect(context.getState().getStateName()).toBe("Completed");
    });

    test("should handle upload error flow", () => {
      const context = createDocumentUploadContext();
      const files = [new File(["test"], "test.pdf")];

      // Idle -> Uploading
      context.upload(files);
      expect(context.getState().getStateName()).toBe("Uploading");

      // Uploading -> Error
      context.handleError(new Error("Network error"));
      expect(context.getState().getStateName()).toBe("Error");
      expect(context.getError()?.message).toBe("Network error");
    });

    test("should handle processing error flow", () => {
      const context = createDocumentUploadContext();
      const files = [new File(["test"], "test.pdf")];

      // Idle -> Uploading -> Processing
      context.upload(files);
      context.complete({ document_id: "123" });
      expect(context.getState().getStateName()).toBe("Processing");

      // Processing -> Error
      context.handleError(new Error("Processing failed"));
      expect(context.getState().getStateName()).toBe("Error");
    });
  });

  describe("Edge Cases", () => {
    test("should handle multiple cancel calls gracefully", () => {
      const context = createDocumentUploadContext();
      const files = [new File(["test"], "test.pdf")];

      context.upload(files);
      context.cancel();
      context.cancel(); // Should not throw

      expect(context.getState().getStateName()).toBe("Idle");
    });

    test("should handle complete calls in wrong state gracefully", () => {
      const context = createDocumentUploadContext();
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Try to complete from Idle (should not transition)
      context.complete({});
      expect(context.getState().getStateName()).toBe("Idle");

      consoleSpy.mockRestore();
    });

    test("should handle error calls in wrong state gracefully", () => {
      const context = createDocumentUploadContext();

      // Error in Idle state should not change state
      context.handleError(new Error("Test"));
      expect(context.getState().getStateName()).toBe("Idle");
    });
  });
});
