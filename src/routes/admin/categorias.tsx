import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCategoriesQueryOptions,
  uploadCategoryImage,
  updateCategory,
  type AdminCategoryRow,
} from "@/lib/adminCatalog";

export const Route = createFileRoute("/admin/categorias")({
  head: () => ({
    meta: [{ title: "Categorias — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <AdminCategoriesPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

function AdminCategoriesPage() {
  const { data: categories = [], isLoading } = useQuery(adminCategoriesQueryOptions);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Edite o nome, a chamada e a imagem de cada categoria exibida na página inicial.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: AdminCategoryRow }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(category.name);
  const [tagline, setTagline] = useState(category.tagline);
  const [emoji, setEmoji] = useState(category.emoji);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(category.image_url);

  useEffect(() => {
    setName(category.name);
    setTagline(category.tagline);
    setEmoji(category.emoji);
    setImagePreview(category.image_url);
    setImageFile(null);
  }, [category]);

  const mutation = useMutation({
    mutationFn: async () => {
      let image_url = category.image_url;
      if (imageFile) {
        image_url = await uploadCategoryImage(imageFile, category.id);
      }
      await updateCategory(category.id, { name, tagline, emoji, image_url });
    },
    onSuccess: () => {
      toast.success(`Categoria "${name}" atualizada`);
      queryClient.invalidateQueries({ queryKey: adminCategoriesQueryOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Não foi possível salvar a categoria"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="grid gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <img
          src={imagePreview}
          alt=""
          className="size-16 shrink-0 rounded-md border border-border object-cover"
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setImageFile(file);
            if (file) setImagePreview(URL.createObjectURL(file));
          }}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`name-${category.id}`}>Nome</Label>
          <Input
            id={`name-${category.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`emoji-${category.id}`}>Emoji</Label>
          <Input
            id={`emoji-${category.id}`}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-16 text-center"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`tagline-${category.id}`}>Chamada</Label>
        <Input
          id={`tagline-${category.id}`}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={mutation.isPending} className="justify-self-start">
        {mutation.isPending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
