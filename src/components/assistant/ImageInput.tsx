import React, { useRef, useState } from 'react';
import { Camera, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { validateImageFile } from '../../services/assistant/assistantService.ts';

interface ImageInputProps {
  selectedFile: File | null;
  onSelectImage: (file: File | null) => void;
  disabled?: boolean;
}

export const ImageInput: React.FC<ImageInputProps> = ({
  selectedFile,
  onSelectImage,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update preview URL when selectedFile changes
  React.useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      onSelectImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    onSelectImage(file);
  };

  const handleRemove = () => {
    onSelectImage(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Hidden real file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        aria-label="Upload math problem photo"
      />

      {/* Error notification if validation failed */}
      {errorMessage && (
        <div className="p-2.5 rounded-me bg-status-error-bg border border-status-error/30 text-status-error text-xs flex items-center gap-1.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Selected Image Preview Box */}
      {selectedFile && previewUrl ? (
        <div className="relative p-2.5 rounded-me bg-bg-surface border border-lavender-dusty flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={previewUrl}
              alt="Uploaded mathematics problem preview"
              className="w-12 h-12 rounded object-cover border border-border-soft shrink-0"
            />
            <div className="overflow-hidden text-left">
              <span className="text-xs font-semibold text-charcoal truncate block">
                {selectedFile.name}
              </span>
              <span className="text-[11px] text-charcoal-muted block">
                {(selectedFile.size / 1024).toFixed(0)} KB • {selectedFile.type.replace('image/', '').toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-xs text-lavender-deep hover:text-lavender-deep/80 px-2 py-1 font-medium transition-calm"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="p-1 rounded text-charcoal-muted hover:text-status-error hover:bg-status-error-bg transition-calm"
              title="Remove image"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Image selection button */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs text-charcoal-muted hover:text-charcoal px-2.5 py-1.5 rounded-me border border-border-soft hover:border-lavender-dusty transition-calm bg-bg-surface"
          title="Upload math problem photo (JPG, PNG, WEBP)"
        >
          <Camera className="w-3.5 h-3.5 text-lavender-deep" />
          <span>Attach Photo</span>
        </button>
      )}
    </div>
  );
};
