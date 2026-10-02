import type { ReactNode } from "react";
import { LoopVideo } from "@/components/LoopVideo";
import posterD from "@/assets/cat-video-d.webp";
import posterM from "@/assets/cat-video-m.webp";
import videoDAv1 from "@/assets/cat-video-d-av1.mp4";
import videoD from "@/assets/cat-video-d.mp4";
import videoMAv1 from "@/assets/cat-video-m-av1.mp4";
import videoM from "@/assets/cat-video-m.mp4";

const DESKTOP = { av1: videoDAv1, h264: videoD, poster: posterD };
const MOBILE = { av1: videoMAv1, h264: videoM, poster: posterM };

/** Fundo em vídeo (loop com fusão suave, sem "recomeço") + véu escuro, atrás das categorias e do carrossel de clubes. */
export function VideoBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden bg-[#0b0f14]">
      <LoopVideo desktop={DESKTOP} mobile={MOBILE} className="absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.55),rgb(0_0_0/0.3)_45%,rgb(0_0_0/0.55))]"
      />
      {children}
    </div>
  );
}
