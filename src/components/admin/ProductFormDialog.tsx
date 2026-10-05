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
import { ImageSlot } from "@/components/admin/ImageSlot";
import { brandsQueryOptions } from "@/lib/adminData";
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
  stock: "0",
  category: "masculino" as CategoryId,
  brandId: "none",
  colors: "",
  sizes: "",
  description: "",
  active: true,
  featured: false,
};

const NO_IMAGE = ["", "", "", ""];

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery(categoriesQueryOptions);
  const { data: brands = [] } = useQuery(brandsQueryOptions);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<string[]>(NO_IMAGE);
  const [slugTouched, setSlugTouched] = useState(false);
  const isEditing = !!product;

  useEffect(() => {
    if (!open) return;
    setSlugTouched(!!product);
    if (product) {
      setForm({
        slug: product.slug,
        name: product.name,
        club: product.club,
        price: String(product.price),
        oldPrice: String(product.old_price),
        stock: String(product.stock ?? 0),
        category: product.category,
        brandId: product.brand_id ?? "none",
        colors: (product.colors ?? []).join(", "),
        sizes: (product.sizes ?? []).join(", "),
        description: product.description ?? "",
        active: product.active,
        featured: product.featured ?? false,
      });
      setImages([
        product.image_url ?? "",
        product.image_url_2 ?? "",
        product.image_url_3 ?? "",
        product.image_url_4 ?? "",
      ]);
    } else {
      setForm(emptyForm);
      setImages(NO_IMAGE);
    }
  }, [open, product]);

  const setImage = (index: number, url: string) =>
    setImages((prev) => prev.map((v, i) => (i === index ? url : v)));

  const mutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || slugify(form.name);
      if (!images[0]) throw new Error("Envie ao menos a imagem principal do produto.");

      await upsertProduct(product?.id ?? null, {
        slug,
        name: form.name.trim(),
        club: form.club.trim(),
        image_url: images[0],
        image_url_2: images[1],
        image_url_3: images[2],
        image_url_4: images[3],
        price: Number(form.price) || 0,
        old_price: Number(form.oldPrice) || 0,
        featured: form.featured,
        brand_id: form.brandId === "none" ? null : form.brandId,
        category: form.category,
        colors: form.colors.split(",").map((c) => c.trim()).filter(Boolean),
        sizes: (() => {
          const s = form.sizes.split(",").map((x) => x.trim()).filter(Boolean);
          return s.length ? s : null;
        })(),
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

  const slugHint = form.slug || slugify(form.name) || "produto";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            As alterações aparecem na loja automaticamente assim que forem salvas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-6">
          <section className="grid gap-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
              Galeria de imagens
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["Imagem Principal", "Secundária 1", "Secundária 2", "Secundária 3"].map((label, i) => (
                <ImageSlot
                  key={label}
                  label={label}
                  value={images[i]}
                  onChange={(url) => setImage(i, url)}
                  upload={(file) => uploadProductImage(file, `${slugHint}-${i + 1}`)}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP até 8 MB. As imagens são comprimidas automaticamente antes do envio.
            </p>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
              Informações
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
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

            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="grid gap-1.5">
                <Label htmlFor="p-brand">Marca</Label>
                <Select
                  value={form.brandId}
                  onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}
                >
                  <SelectTrigger id="p-brand">
                    <SelectValue placeholder="Sem marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem marca</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
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
                <Label htmlFor="p-old-price">Preço promocional de (R$)</Label>
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
                <Label>Estoque</Label>
                <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  {isEditing ? `${form.stock} un. no total.` : "Depois de criar,"} Controle por tamanho em <strong>Estoque</strong> (com histórico).
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                <Label htmlFor="p-sizes">Tamanhos</Label>
                <Input
                  id="p-sizes"
                  placeholder="P, M, G"
                  value={form.sizes}
                  onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-description">Descrição</Label>
              <Textarea
                id="p-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-secondary/40 p-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="p-active"
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
                <Label htmlFor="p-active">Visível na loja</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="p-featured"
                  checked={form.featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                />
                <Label htmlFor="p-featured">Produto em destaque</Label>
              </div>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando…" : "Salvar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
