import { NewProduct, ProductEditor } from "@/components/admin/product-editor";
import { Empty, PageHead } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";

export default async function ProductsPage() {
  const { supabase } = await requireStaff();
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, subtitle, tagline, description, price_kobo, size_ml, status, track_inventory, low_stock_threshold, cutout_url, square_url, tint_top, tint_bottom, benefits, how_to_use, batches(id, code, infused_on, expires_on, qty_produced, qty_available)")
    .order("sort");

  return (
    <>
      <PageHead eyebrow="Catalogue" title="Products & batches">
        <NewProduct />
      </PageHead>
      {products?.length ? (
        <div className="space-y-6">
          {products.map((p) => (
            <ProductEditor key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty>No products in the database yet — run the seed (supabase/seed.sql) to add Nazia’s two oils.</Empty>
      )}
    </>
  );
}
