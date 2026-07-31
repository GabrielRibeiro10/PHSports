import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Star, Trash2, X } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AdminCard,
  EmptyState,
  PageHeader,
  StatusPill,
  TableSkeleton,
} from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteReview, reviewsQueryOptions, updateReview } from "@/lib/adminData";

export const Route = createFileRoute("/admin/avaliacoes")({
  head: () => ({
    meta: [{ title: "Avaliações — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <ReviewsPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

function ReviewsPage() {
  const qc = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery(reviewsQueryOptions);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const invalidate = () => qc.invalidateQueries({ queryKey: reviewsQueryOptions.queryKey });

  const save = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      updateReview(id, values as never),
    onSuccess: () => {
      toast.success("Avaliação atualizada");
      invalidate();
    },
    onError: () => toast.error("Não foi possível atualizar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      toast.success("Avaliação excluída");
      invalidate();
    },
    onError: () => toast.error("Não foi possível excluir"),
  });

  return (
    <div>
      <PageHeader title="Avaliações" description="Modere e responda as avaliações dos clientes." />

      {isLoading ? (
        <AdminCard><TableSkeleton rows={4} cols={3} /></AdminCard>
      ) : reviews.length === 0 ? (
        <AdminCard>
          <EmptyState
            icon={<Star className="size-5" />}
            title="Nenhuma avaliação"
            description="Avaliações enviadas pelos clientes aparecem aqui para aprovação."
          />
        </AdminCard>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <AdminCard key={r.id} className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="font-bold">{r.author_name || "Cliente"}</span>
                <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                <StatusPill status={r.status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{r.comment}</p>
              <Textarea
                className="mt-3"
                rows={2}
                placeholder="Responder avaliação…"
                value={replies[r.id] ?? r.reply ?? ""}
                onChange={(e) => setReplies((p) => ({ ...p, [r.id]: e.target.value }))}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => save.mutate({ id: r.id, values: { status: "aprovada" } })}>
                  <Check /> Aprovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => save.mutate({ id: r.id, values: { status: "reprovada" } })}>
                  <X /> Reprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save.mutate({ id: r.id, values: { reply: replies[r.id] ?? r.reply ?? "" } })}
                >
                  Salvar resposta
                </Button>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => remove.mutate(r.id)}>
                  <Trash2 /> Excluir
                </Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
