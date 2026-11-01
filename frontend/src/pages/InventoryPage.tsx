import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { canAccess } from "../utils/permissions";

type Product = { id: string; name: string; code: string; stockQuantity: string | number; minimumStock: string | number };
type Batch = { id: string; batchNumber: string; remainingQuantity: string | number; expirationDate: string | null; product: { name: string } };
type Movement = { id: string; type: string; quantity: string | number; reason: string | null; createdAt: string; product: { name: string } };
type InventoryData = { products: Product[]; expiringBatches: Batch[]; movements: Movement[] };

export function InventoryPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState<InventoryData>({ products: [], expiringBatches: [], movements: [] });
  const [formMode, setFormMode] = useState<"receive" | "movement">("receive");
  const [form, setForm] = useState({ productId: "", batchNumber: "", quantity: "", expirationDate: "", purchaseCost: "", type: "DAMAGED", reason: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = canAccess(user, "inventory.manage");

  async function load() {
    try {
      const response = await api.get<InventoryData>("/products/inventory");
      setData(response.data);
      setForm((current) => ({ ...current, productId: current.productId || response.data.products[0]?.id || "" }));
      setError("");
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to load inventory.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      if (formMode === "receive") {
        await api.post("/products/batches", {
          productId: form.productId,
          batchNumber: form.batchNumber,
          receivedQuantity: Number(form.quantity),
          ...(form.expirationDate ? { expirationDate: form.expirationDate } : {}),
          purchaseCost: Number(form.purchaseCost || 0)
        });
        setMessage("Stock receipt recorded.");
        setForm((current) => ({ ...current, batchNumber: "", quantity: "", expirationDate: "", purchaseCost: "" }));
      } else {
        await api.post("/products/movements", {
          productId: form.productId,
          type: form.type,
          quantity: Number(form.quantity),
          reason: form.reason || undefined
        });
        setMessage("Inventory movement recorded.");
        setForm((current) => ({ ...current, quantity: "", reason: "" }));
      }
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to save inventory change.");
    }
  }

  return <AppShell currentPath={location.pathname} isMenuOpen={menuOpen} onMenuOpen={() => setMenuOpen(true)} onMenuClose={() => setMenuOpen(false)}>
    <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header><h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">Inventory</h1><p className="mt-2 text-slate-600">View current stock, expiry alerts, and stock movement history.</p></header>
        {canManage ? <form onSubmit={submit} className="grid min-w-0 gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="button" className={`min-h-11 rounded px-4 font-semibold ${formMode === "receive" ? "bg-emerald-700 text-white" : "border"}`} onClick={() => setFormMode("receive")}>Receive stock</button>
            <button type="button" className={`min-h-11 rounded px-4 font-semibold ${formMode === "movement" ? "bg-emerald-700 text-white" : "border"}`} onClick={() => setFormMode("movement")}>Record movement</button>
          </div>
          <select required aria-label="Product" className="h-11 min-w-0 rounded border px-3" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
            {data.products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.code})</option>)}
          </select>
          {formMode === "receive" ? <>
            <input required aria-label="Batch number" placeholder="Batch number" className="h-11 min-w-0 rounded border px-3" value={form.batchNumber} onChange={(event) => setForm({ ...form, batchNumber: event.target.value })} />
            <input required type="number" min="0.01" step="0.01" aria-label="Quantity received" placeholder="Quantity received" className="h-11 min-w-0 rounded border px-3" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
            <input type="date" aria-label="Expiration date" className="h-11 min-w-0 rounded border px-3" value={form.expirationDate} onChange={(event) => setForm({ ...form, expirationDate: event.target.value })} />
            <input type="number" min="0" step="0.01" aria-label="Purchase cost" placeholder="Purchase cost" className="h-11 min-w-0 rounded border px-3" value={form.purchaseCost} onChange={(event) => setForm({ ...form, purchaseCost: event.target.value })} />
          </> : <>
            <select aria-label="Movement type" className="h-11 min-w-0 rounded border px-3" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="RETURNED">Returned</option><option value="DAMAGED">Damaged</option><option value="EXPIRED">Expired</option><option value="ADJUSTMENT">Adjustment</option>
            </select>
            <input required type="number" min="0.01" step="0.01" aria-label="Movement quantity" placeholder="Quantity" className="h-11 min-w-0 rounded border px-3" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
            <input aria-label="Reason" placeholder="Reason" className="h-11 min-w-0 rounded border px-3" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          </>}
          <button disabled={!form.productId} className="min-h-11 rounded bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{formMode === "receive" ? "Save stock receipt" : "Save movement"}</button>
        </form> : null}
        {message ? <p className="font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p role="alert" className="font-semibold text-red-600">{error}</p> : null}
        <section className="rounded border bg-white"><h2 className="border-b p-4 font-bold">Stock levels</h2><div className="grid gap-3 p-3 md:hidden">{data.products.map((product) => <article key={product.id} className="rounded border p-3"><h3 className="font-semibold">{product.name}</h3><p className="text-sm text-slate-600">Code: {product.code}</p><p className="mt-2 text-sm">Stock: <strong>{Number(product.stockQuantity).toFixed(2)}</strong> · Minimum: {Number(product.minimumStock).toFixed(2)}</p></article>)}</div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Product</th><th className="p-3">Code</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Minimum stock</th><th className="p-3">Status</th></tr></thead><tbody>{data.products.map((product) => <tr key={product.id} className="border-t"><td className="p-3">{product.name}</td><td className="p-3">{product.code}</td><td className="p-3 text-right">{Number(product.stockQuantity).toFixed(2)}</td><td className="p-3 text-right">{Number(product.minimumStock).toFixed(2)}</td><td className="p-3">{Number(product.stockQuantity) <= Number(product.minimumStock) ? "Low stock" : "In stock"}</td></tr>)}</tbody></table></div>
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded border bg-white"><h2 className="border-b p-4 font-bold">Upcoming expiry</h2><ul className="divide-y">{data.expiringBatches.map((batch) => <li key={batch.id} className="p-3 text-sm"><strong>{batch.product.name}</strong> · {batch.batchNumber} · {Number(batch.remainingQuantity).toFixed(2)} remaining · {batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : "No expiry date"}</li>)}{data.expiringBatches.length === 0 ? <li className="p-4 text-sm text-slate-600">No batches expiring soon.</li> : null}</ul></div>
          <div className="rounded border bg-white"><h2 className="border-b p-4 font-bold">Recent stock movements</h2><ul className="divide-y">{data.movements.slice(0, 20).map((movement) => <li key={movement.id} className="p-3 text-sm"><strong>{movement.product.name}</strong> · {movement.type} · {Number(movement.quantity).toFixed(2)} · {new Date(movement.createdAt).toLocaleString()}</li>)}{data.movements.length === 0 ? <li className="p-4 text-sm text-slate-600">No inventory movement history.</li> : null}</ul></div>
        </section>
      </div>
    </section>
  </AppShell>;
}
