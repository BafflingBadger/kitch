"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { CoverImage } from "@/components/cookbooks/cover-image";

export function RecipeImageUpload({
  imageUrl,
  name,
  onUploaded,
}: {
  imageUrl: string | null;
  name: string;
  onUploaded: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }

    setError(null);
    setIsUploading(true);

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const path = `public/${crypto.randomUUID()}.${extension}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("recipes")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    setIsUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    onUploaded(path);
  };

  return (
    <div>
      <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-3xl lg:aspect-[4/3]">
        <CoverImage imageUrl={imageUrl} alt={name} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label="Change photo"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
        >
          <Camera className="h-6 w-6" />
          <span className="text-sm font-medium">
            {isUploading ? "Uploading…" : "Change photo"}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
        />
      </div>
      {error ? <p className="mt-2 text-sm text-kitch-red">{error}</p> : null}
    </div>
  );
}
