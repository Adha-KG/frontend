import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Loader2, Trash2 } from "lucide-react";
import type { Document } from "@/lib/api";

interface DocumentsListProps {
  documents: Document[];
  selectedDocuments: string[];
  onToggleSelection: (documentId: string) => void;
  onDeleteDocument: (documentId: string) => void;
}

export function DocumentsList({
  documents,
  selectedDocuments,
  onToggleSelection,
  onDeleteDocument,
}: DocumentsListProps) {
  const getDocumentStatus = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Ready", color: "bg-green-100 text-green-800" };
      case "processing":
        return { text: "Processing", color: "bg-yellow-100 text-yellow-800" };
      case "failed":
        return { text: "Failed", color: "bg-red-100 text-red-800" };
      default:
        return { text: "Pending", color: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <Card className="flex-1 min-h-0 flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Documents ({documents.length})
          </div>
          {selectedDocuments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedDocuments.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0">
        {documents.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => {
              const status = getDocumentStatus(document.embedding_status);
              return (
                <div
                  key={document.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer
                    ${
                      selectedDocuments.includes(document.id)
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50"
                    }`}
                  onClick={() =>
                    document.embedding_status === "completed" &&
                    onToggleSelection(document.id)
                  }
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`p-1 rounded ${selectedDocuments.includes(document.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      <FileText className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {document.original_filename}
                      </p>
                      <div className="flex items-center gap-1">
                        <Badge className={`text-xs ${status.color}`}>
                          {status.text}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {selectedDocuments.includes(document.id) &&
                      document.embedding_status === "completed" && (
                        <CheckCircle className="w-3 h-3 text-primary" />
                      )}
                    {document.embedding_status === "processing" && (
                      <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDocument(document.id);
                      }}
                      className="p-1 h-auto text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
