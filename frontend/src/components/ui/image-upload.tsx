"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // reset so the same file can be re-picked
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {value ? (
        /* Preview */
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-24 w-24 rounded-lg object-cover border border-border"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:opacity-90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={uploading}
          className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-brand hover:bg-brand-muted/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span className="text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              <span className="text-xs">Click or drag to upload</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-status-danger">{error}</p>
      )}
    </div>
  );
}
