import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileText, X, Loader2, Plus } from "lucide-react";

interface UploadPDFsCardProps {
  files: File[];
  isUploading: boolean;
  isDragging: boolean;
  onFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function UploadPDFsCard({
  files,
  isUploading,
  isDragging,
  onFilesChange,
  onRemoveFile,
  onDragOver,
  onDragLeave,
  onDrop,
}: UploadPDFsCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCardClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="flex-shrink-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Plus className="w-4 h-4 mr-2" />
          Upload PDFs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          onClick={handleCardClick}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all duration-200 text-center
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 mb-2 animate-spin text-primary mx-auto" />
              <p className="text-xs">Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-6 h-6 mb-2 text-primary/70 mx-auto" />
              <p className="text-xs font-medium mb-1">
                Drop PDFs here or click
              </p>
              <p className="text-xs text-muted-foreground">Max 50MB per file</p>
            </>
          )}
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={onFilesChange}
          />
        </div>

        {/* New files preview */}
        {files.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium">Files to upload:</p>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(index)}
                  className="p-1 h-auto flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
