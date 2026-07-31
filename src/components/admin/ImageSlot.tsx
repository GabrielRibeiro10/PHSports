import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  upload: (file: File) => Promise<string>;
  className?: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ImageSlot({ label, value, onChange, upload, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    setBusy(true);
    try {
      onChange(await upload(file));
      toast.success(`${label} atualizada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload da imagem");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("grid gap-1.5", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary/40 transition-all hover:border-primary/50 hover:bg-secondary",
          dragging && "border-primary bg-primary/5",
        )}
      >
        {value ? (
          <img src={value} alt={label} className="size-full object-cover" />
        ) : (
          <div className="grid place-items-center gap-1 p-2 text-center text-muted-foreground">
            <ImagePlus className="size-5" />
            <span className="text-[10px] leading-tight">Arraste ou clique</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw className="size-3" /> {value ? "Trocar" : "Enviar"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Remover ${label}`}
            className="inline-flex items-center justify-center rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
