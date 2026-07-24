import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesQueryOptions } from "@/lib/catalog";
import type { CategoryId } from "@/lib/products";
import {
  adminProductsQueryOptions,
  slugify,
  upsertProduct,
  uploadProductImage,
  type AdminProductRow,
} from "@/lib/adminCatalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdminProductRow | null;
};

const emptyForm = {
  slug: "",
  name: "",
  club: "",
  price: "",
  oldPrice: "",
  category: "masculino" as CategoryId,
  colors: "",
  sizes: "",
  description: "",
  active: true,
};

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery(categoriesQueryOptions);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [slugTouched, setSlugTouched] = useState(false);
  const isEditing = !!product;

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    setSlugTouched(!!product);
    if (product) {
      setForm({
        slug: product.slug,
        name: product.name,
        club: product.club,
        price: String(product.price),
        oldPrice: String(product.old_price),
        category: product.category,
        colors: (product.colors ?? []).join(", "),
        sizes: (product.sizes ?? []).join(", "),
        description: product.description ?? "",
        active: product.active,
      });
      setImagePreview(product.image_url);
    } else {
      setForm(emptyForm);
      setImagePreview("");
    }
  }, [open, product]);

  const mutation = useMutation({
    mutationFn: async () => {
      let imageUrl = imagePreview;
      const slug = form.slug || slugify(form.name);
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile, slug || "produto");
      }
      if (!imageUrl) throw new Error("Selecione uma imagem para o produto.");

      const colors = form.colors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const sizes = form.sizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await upsertProduct(product?.id ?? null, {
        slug,
        name: form.name.trim(),
        club: form.club.trim(),
        image_url: imageUrl,
        price: Number(form.price) || 0,
        old_price: Number(form.oldPrice) || 0,
        category: form.category,
        colors,
        sizes: sizes.length ? sizes : null,
        description: form.description.trim() || null,
        active: form.active,
        sort_order: product?.sort_order ?? 0,
      });
    },
    onSuccess: () => {
      toast.success(isEditing ? "Produto atualizado" : "Produto criado");
      queryClient.invalidateQueries({ queryKey: adminProductsQueryOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar produto");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            As alterações aparecem na loja automaticamente assim que forem salvas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="p-image">Imagem</Label>
            <div className="flex items-center gap-3">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt=""
                  className="size-16 shrink-0 rounded-md border border-border object-cover"
                />
              )}
              <Input
                id="p-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  if (file) setImagePreview(URL.createObjectURL(file));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Nome</Label>
              <Input
                id="p-name"
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-club">Clube</Label>
              <Input
                id="p-club"
                required
                value={form.club}
                onChange={(e) => setForm((f) => ({ ...f, club: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-slug">Slug (URL do produto)</Label>
            <Input
              id="p-slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-price">Preço (R$)</Label>
              <Input
                id="p-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-old-price">Preço antigo (R$)</Label>
              <Input
                id="p-old-price"
                type="number"
                step="0.01"
                min="0"
                value={form.oldPrice}
                onChange={(e) => setForm((f) => ({ ...f, oldPrice: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-category">Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as CategoryId }))}
              >
                <SelectTrigger id="p-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-colors">Cores (hex, separadas por vírgula)</Label>
              <Input
                id="p-colors"
                placeholder="#000000, #FFFFFF"
                value={form.colors}
                onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-sizes">Tamanhos (opcional)</Label>
              <Input
                id="p-sizes"
                placeholder="P, M, G"
                value={form.sizes}
                onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-description">Descrição (opcional)</Label>
            <Textarea
              id="p-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="p-active"
              checked={form.active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
            />
            <Label htmlFor="p-active">Visível na loja</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
