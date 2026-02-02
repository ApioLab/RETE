import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Package, Upload, X, ImageIcon, Building2 } from "lucide-react";
import { Product } from "./ProductCard";
import type { Community } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(3, "Nome minimo 3 caratteri"),
  description: z.string().min(10, "Descrizione minimo 10 caratteri"),
  price: z.number().min(1, "Prezzo minimo 1 ECT"),
  category: z.string().min(1, "Seleziona una categoria"),
  available: z.boolean(),
  imageUrl: z.string().optional(),
  communityIds: z.array(z.string()).min(1, "Seleziona almeno una comunità"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product & { communityIds?: string[] };
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel?: () => void;
}

const categories = [
  "Energia",
  "Mobilità",
  "Casa",
  "Elettronica",
  "Servizi",
  "Altro",
];

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: communities = [] } = useQuery<Community[]>({
    queryKey: ["/api/communities"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? 0,
      category: product?.category ?? "",
      available: product?.available ?? true,
      imageUrl: product?.imageUrl ?? "",
      communityIds: product?.communityIds ?? [],
    },
  });

  // Reset form when product changes (for editing different products)
  useEffect(() => {
    form.reset({
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? 0,
      category: product?.category ?? "",
      available: product?.available ?? true,
      imageUrl: product?.imageUrl ?? "",
      communityIds: product?.communityIds ?? [],
    });
    setImagePreview(product?.imageUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [product?.id]);

  const isSubmitting = form.formState.isSubmitting;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("L'immagine deve essere inferiore a 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        form.setValue("imageUrl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (data: ProductFormData) => {
    await onSubmit(data);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold">
            {product ? "Modifica Prodotto" : "Nuovo Prodotto"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormItem>
              <FormLabel>Immagine prodotto</FormLabel>
              <div className="space-y-2">
                {imagePreview ? (
                  <div className="relative w-full aspect-video group">
                    <div className="w-full h-full rounded-lg overflow-hidden bg-muted">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg backdrop-blur-sm transition-all"
                      onClick={removeImage}
                      data-testid="button-remove-image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-image"
                  >
                    <div className="p-3 rounded-full bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Carica un'immagine</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG fino a 2MB</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  data-testid="input-product-image"
                />
              </div>
            </FormItem>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome prodotto</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. Pannello Solare 100W"
                      data-testid="input-product-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrivi il tuo prodotto..."
                      rows={3}
                      data-testid="input-product-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo (ECT)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        data-testid="input-product-price"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="available"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Disponibile</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Il prodotto sarà visibile nel marketplace
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-product-available"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="communityIds"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <FormLabel className="text-base">Comunità</FormLabel>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Seleziona le comunità in cui rendere disponibile questo prodotto
                  </p>
                  <div className="space-y-2 rounded-lg border p-3 max-h-48 overflow-y-auto">
                    {communities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Nessuna comunità disponibile
                      </p>
                    ) : (
                      communities.map((community) => (
                        <div
                          key={community.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`community-${community.id}`}
                            checked={field.value.includes(community.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, community.id]);
                              } else {
                                field.onChange(
                                  field.value.filter((id) => id !== community.id)
                                );
                              }
                            }}
                            data-testid={`checkbox-community-${community.id}`}
                          />
                          <label
                            htmlFor={`community-${community.id}`}
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {community.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                  data-testid="button-cancel"
                >
                  Annulla
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
                data-testid="button-submit-product"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {product ? "Salva Modifiche" : "Crea Prodotto"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
