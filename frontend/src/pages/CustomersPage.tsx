import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { canAccess } from "../utils/permissions";

type Customer = { id: string; name: string; phone: string | null; address: string | null; createdAt: string; _count: { invoices: number } };
const emptyForm = { name: "", phone: "", address: "" };

export function CustomersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = canAccess(user, "customers.manage");

  async function load() {
    setError("");
    try {
      const response = await api.get<{ customers: Customer[] }>("/customers");
      setCustomers(response.data.customers);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to load customers.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      if (editingId) await api.put(`/customers/${editingId}`, form);
      else await api.post("/customers", form);
      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? "Customer updated." : "Customer created.");
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to save customer.");
    }
  }

  async function remove(customer: Customer) {
    if (!confirm(`Delete ${customer.name}? Existing invoice customer details will remain unchanged.`)) return;
    setError(""); setMessage("");
    try {
      await api.delete(`/customers/${customer.id}`);
      setMessage("Customer deleted. Invoice snapshots were preserved.");
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to delete customer.");
    }
  }

  return <AppShell currentPath={location.pathname} isMenuOpen={menuOpen} onMenuOpen={() => setMenuOpen(true)} onMenuClose={() => setMenuOpen(false)}>
    <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header><h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">Customers</h1><p className="mt-2 text-slate-600">Manage customer contact records. Existing invoice details remain as saved snapshots.</p></header>
        {canManage ? <form onSubmit={save} className="grid min-w-0 gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input required minLength={2} aria-label="Customer name" placeholder="Customer name" className="h-11 min-w-0 rounded border px-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input aria-label="Phone" placeholder="Phone" className="h-11 min-w-0 rounded border px-3" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <input aria-label="Address" placeholder="Address" className="h-11 min-w-0 rounded border px-3" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          <div className="flex gap-2"><button className="min-h-11 flex-1 rounded bg-emerald-700 px-3 font-semibold text-white">{editingId ? "Save customer" : "Add customer"}</button>{editingId ? <button type="button" className="min-h-11 rounded border px-3" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
        </form> : null}
        {message ? <p className="font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p role="alert" className="font-semibold text-red-600">{error}</p> : null}
        <div className="grid gap-3 md:hidden">{customers.map((customer) => <article key={customer.id} className="rounded border bg-white p-4">
          <h2 className="font-semibold">{customer.name}</h2><p className="mt-1 text-sm text-slate-600">{customer.phone || "No phone"}{customer.address ? ` · ${customer.address}` : ""}</p><p className="mt-2 text-sm">Invoices: {customer._count.invoices}</p>
          {canManage ? <div className="mt-2 flex gap-4 border-t pt-2"><button className="min-h-11 font-semibold text-emerald-700" onClick={() => { setEditingId(customer.id); setForm({ name: customer.name, phone: customer.phone ?? "", address: customer.address ?? "" }); }}>Edit</button><button className="min-h-11 font-semibold text-red-700" onClick={() => void remove(customer)}>Delete</button></div> : null}
        </article>)}{customers.length === 0 ? <p className="rounded border bg-white p-4 text-slate-600">No customers found.</p> : null}</div>
        <div className="hidden overflow-x-auto rounded border bg-white md:block"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Address</th><th className="p-3">Invoices</th>{canManage ? <th className="p-3">Actions</th> : null}</tr></thead><tbody>
          {customers.map((customer) => <tr key={customer.id} className="border-t"><td className="p-3">{customer.name}</td><td className="p-3">{customer.phone || "—"}</td><td className="p-3">{customer.address || "—"}</td><td className="p-3">{customer._count.invoices}</td>{canManage ? <td className="p-3"><div className="flex gap-3"><button className="font-semibold text-emerald-700" onClick={() => { setEditingId(customer.id); setForm({ name: customer.name, phone: customer.phone ?? "", address: customer.address ?? "" }); }}>Edit</button><button className="font-semibold text-red-700" onClick={() => void remove(customer)}>Delete</button></div></td> : null}</tr>)}
          {customers.length === 0 ? <tr><td colSpan={canManage ? 5 : 4} className="p-4 text-slate-600">No customers found.</td></tr> : null}
        </tbody></table></div>
      </div>
    </section>
  </AppShell>;
}
