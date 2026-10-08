import { useQuery } from "@tanstack/react-query";
import { announcementQuery } from "@/lib/announcement";

/** Faixa de aviso/promoção no topo da loja. Só aparece se estiver ativa em Configurações. */
export function AnnouncementBar() {
  const { data } = useQuery(announcementQuery);
  if (!data?.active) return null;
  const external = data.href?.startsWith("https://");
  return (
    <div className="bg-brand px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm" role="note">
      <span>{data.text}</span>
      {data.href && (
        <a
          href={data.href}
          className="ml-2 font-black underline underline-offset-2"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {data.label || "Saiba mais"}
        </a>
      )}
    </div>
  );
}
