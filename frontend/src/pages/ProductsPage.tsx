import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
type Product = { id: string; name: string; code: string; unitPrice: string | number; stockQuantity: string | number; isActive: boolean };
type ProductForm = { name: string; code: string; unitPrice: string; stockQuantity: string };
const empty: ProductForm = { name: "", code: "", unitPrice: "", stockQuantity: "" };

export function ProductsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await api.get<{ products: Product[] }>("/products", {
        params: { search: search || undefined, includeInactive: user?.role === "ADMIN" ? "true" : undefined }
      });
      setProducts(response.data.products);
      setError("");
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [search, user?.role]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const body = { ...form, unitPrice: Number(form.unitPrice), stockQuantity: Number(form.stockQuantity) };
      if (editing) await api.put(`/products/${editing.id}`, body);
      else await api.post("/products", body);
      setForm(empty);
      setEditing(null);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to save product.");
    }
  }

  function edit(product: Product) {
    setEditing(product);
    setForm({ name: product.name, code: product.code, unitPrice: String(product.unitPrice), stockQuantity: String(product.stockQuantity) });
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to deactivate product.");
    }
  }

  return (
    <AppShell currentPath={location.pathname} isMenuOpen={menuOpen} onMenuOpen={() => setMenuOpen(true)} onMenuClose={() => setMenuOpen(false)}>
      <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">Products</h1>
              <p className="mt-1 text-sm text-slate-600">Manage product details, pricing, and stock.</p>
            </div>
            <span className="text-sm text-slate-600">{products.length} products</span>
          </div>
          {user?.role === "ADMIN" ? (
            <form onSubmit={save} className="grid min-w-0 gap-3 rounded border bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
              <input required aria-label="Product name" placeholder="Product name" className="h-11 min-w-0 rounded border px-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <input required aria-label="Product code" placeholder="Code" className="h-11 min-w-0 rounded border px-3" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
              <input required min="0" step="0.01" type="number" aria-label="Unit price" placeholder="Unit price" className="h-11 min-w-0 rounded border px-3" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} />
              <input required min="0" step="0.01" type="number" aria-label="Stock quantity" placeholder="Stock" className="h-11 min-w-0 rounded border px-3" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} />
              <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                <button className="min-h-11 flex-1 rounded bg-emerald-700 px-4 font-semibold text-white">{editing ? "Update" : "Add product"}</button>
                {editing ? <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="min-h-11 rounded border px-4 font-semibold">Cancel</button> : null}
              </div>
            </form>
          ) : null}
          <input aria-label="Search products" placeholder="Search products" className="h-11 w-full rounded border bg-white px-3" value={search} onChange={(event) => setSearch(event.target.value)} />
          {error ? <p role="alert" className="font-semibold text-red-600">{error}</p> : null}
          {loading ? <p>Loading products...</p> : products.length === 0 ? (
            <p className="rounded border bg-white p-5 text-slate-600">No products found.</p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {products.map((product) => (
                  <article key={product.id} className="min-w-0 rounded border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold">{product.name}</h2>
                        <p className="break-all text-sm text-slate-500">{product.code}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs">{product.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-slate-500">Unit price</dt><dd className="font-semibold">{Number(product.unitPrice).toFixed(2)}</dd></div>
                      <div><dt className="text-slate-500">Stock</dt><dd className="font-semibold">{Number(product.stockQuantity).toFixed(2)}</dd></div>
                    </dl>
                    {user?.role === "ADMIN" ? <div className="mt-3 flex gap-4 border-t pt-3">
                      <button className="min-h-11 font-semibold text-emerald-700" onClick={() => edit(product)}>Edit</button>
                      {product.isActive ? <button className="min-h-11 font-semibold text-red-600" onClick={() => void deactivate(product.id)}>Deactivate</button> : null}
                    </div> : null}
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded border bg-white md:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-slate-100"><tr><th className="p-3">Name</th><th className="p-3">Code</th><th className="p-3 text-right">Unit price</th><th className="p-3 text-right">Stock</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                  <tbody>{products.map((product) => (
                    <tr key={product.id} className="border-t">
                      <td className="max-w-64 break-words p-3">{product.name}</td>
                      <td className="p-3">{product.code}</td>
                      <td className="p-3 text-right">{Number(product.unitPrice).toFixed(2)}</td>
                      <td className="p-3 text-right">{Number(product.stockQuantity).toFixed(2)}</td>
                      <td className="p-3">{product.isActive ? "Active" : "Inactive"}</td>
                      <td className="p-3">{user?.role === "ADMIN" ? <div className="flex gap-3">
                        <button className="font-semibold text-emerald-700" onClick={() => edit(product)}>Edit</button>
                        {product.isActive ? <button className="font-semibold text-red-600" onClick={() => void deactivate(product.id)}>Deactivate</button> : null}
                      </div> : null}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
