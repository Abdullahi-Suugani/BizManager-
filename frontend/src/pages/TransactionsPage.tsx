import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { InvoiceDocument, InvoicePrintHost, type InvoiceDocumentData } from "../components/InvoiceDocument";

type Item = { id: string; itemName: string; quantity: string | number; unitPrice: string | number; amount: string | number };
type Transaction = {
  id: string;
  transactionNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  isPaid: boolean;
  amountPaid?: string | number;
  paymentMethod: string;
  totalAmount: string | number;
  createdAt: string;
  employee: { name: string; email: string };
  items: Item[];
};
type InvoiceSettings = { logoData: string | null };

export function TransactionsPage({ search = false }: { search?: boolean }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [item, setItem] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<InvoiceSettings>({ logoData: null });
  const [settingsError, setSettingsError] = useState("");
  const [showBusinessLogo, setShowBusinessLogo] = useState(false);

  const invoiceDocument: InvoiceDocumentData | null = selected ? {
    transactionNumber: selected.transactionNumber,
    customerName: selected.customerName ?? "",
    customerAddress: selected.customerAddress ?? "",
    customerPhone: selected.customerPhone ?? "",
    paymentMethod: selected.paymentMethod,
    date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(selected.createdAt)),
    items: selected.items.map((entry) => ({
      itemName: entry.itemName,
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      amount: entry.amount
    })),
    subtotal: selected.items.reduce((sum, entry) => sum + Number(entry.amount), 0),
    total: Number(selected.totalAmount),
    amountPaid: selected.amountPaid !== undefined
      ? Number(selected.amountPaid)
      : selected.isPaid ? Number(selected.totalAmount) : 0,
    remaining: Math.max(Number(selected.totalAmount) - (selected.amountPaid !== undefined
      ? Number(selected.amountPaid)
      : selected.isPaid ? Number(selected.totalAmount) : 0), 0),
    logoData: settings.logoData,
    showBusinessLogo
  } : null;

  async function load(requestedPage = page) {
    setError("");
    try {
      const response = await api.get<{ transactions: Transaction[]; pagination: { totalPages: number } }>("/transactions", { params: { invoiceNumber: invoiceNumber || undefined, item: item || undefined, from: from || undefined, to: to || undefined, page: requestedPage, pageSize: 20 } });
      setTransactions(response.data.transactions);
      setTotalPages(response.data.pagination.totalPages);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to load invoices.");
    }
  }

  useEffect(() => { void load(); }, [page]);
  useEffect(() => {
    api.get<{ settings: InvoiceSettings }>("/settings/invoice")
      .then((response) => setSettings(response.data.settings))
      .catch((requestError: any) => setSettingsError(requestError.response?.data?.message ?? "Unable to load business invoice settings."));
  }, []);
  useEffect(() => {
    const resetLogoOption = () => setShowBusinessLogo(false);
    window.addEventListener("afterprint", resetLogoOption);
    return () => window.removeEventListener("afterprint", resetLogoOption);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    void load(1);
  }

  return (
    <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">{search ? "Search Records" : "Invoices"}</h1>
          <p className="mt-2 text-slate-600">{search ? "Search saved transactions and line items." : "Saved invoices from the database."}</p>
        </div>
        <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input className="h-11 min-w-0 rounded border px-3" aria-label="Invoice number" placeholder="Invoice number" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
          <input className="h-11 min-w-0 rounded border px-3" aria-label="Item" placeholder="Item" value={item} onChange={(event) => setItem(event.target.value)} />
          <input className="h-11 min-w-0 rounded border px-3" aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className="h-11 min-w-0 rounded border px-3" aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <button className="min-h-11 rounded bg-emerald-700 font-semibold text-white">{search ? "Search" : "Filter"}</button>
        </form>
        {error ? <p className="font-semibold text-red-600">{error}</p> : null}
        <div className="rounded border bg-white">
          <div className="grid gap-3 p-3 md:hidden">
            {transactions.map((transaction) => (
              <article key={transaction.id} className="min-w-0 rounded border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="break-all font-semibold">{transaction.transactionNumber}</h2>
                    <p className="text-sm text-slate-600">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                  </div>
                  <strong className="shrink-0">${Number(transaction.totalAmount).toFixed(2)}</strong>
                </div>
                <p className="mt-2 break-words text-sm"><span className="text-slate-500">Customer:</span> {transaction.customerName || "—"}</p>
                <p className="mt-1 break-words text-sm"><span className="text-slate-500">Items:</span> {transaction.items.map((entry) => entry.itemName).join(", ")}</p>
                <div className="mt-2 flex gap-4 border-t pt-2">
                  <button onClick={() => setSelected(transaction)} className="min-h-11 font-semibold text-emerald-700">View invoice</button>
                  <Link to={`/transactions/${transaction.id}/edit`} className="inline-flex min-h-11 items-center font-semibold text-emerald-700">Edit</Link>
                </div>
              </article>
            ))}
            {transactions.length === 0 ? <p className="p-3 text-slate-600">No saved invoices found.</p> : null}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Employee</th><th className="p-3">Items</th><th className="p-3 text-right">Total</th><th className="p-3" /></tr></thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t">
                  <td className="p-3 font-semibold">{transaction.transactionNumber}</td>
                  <td className="p-3">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{transaction.employee.name}</td>
                  <td className="p-3">{transaction.items.map((entry) => entry.itemName).join(", ")}</td>
                  <td className="p-3 text-right">${Number(transaction.totalAmount).toFixed(2)}</td>
                  <td className="flex gap-3 p-3">
                    <button onClick={() => setSelected(transaction)} className="font-semibold text-emerald-700">View</button>
                    <Link to={`/transactions/${transaction.id}/edit`} className="font-semibold text-emerald-700">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 ? <p className="p-5 text-slate-600">No saved invoices found.</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-11 rounded border px-3 py-2 disabled:opacity-40">Previous</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="min-h-11 rounded border px-3 py-2 disabled:opacity-40">Next</button>
        </div>
        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Invoice details</h2>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={showBusinessLogo} onChange={(event) => setShowBusinessLogo(event.target.checked)} />
                Show Business Logo
              </label>
              <div className="flex w-full gap-2 sm:w-auto">
                <button onClick={() => window.print()} className="min-h-11 flex-1 rounded bg-emerald-700 px-4 py-2 font-semibold text-white sm:flex-none">Print</button>
                <button onClick={() => window.print()} className="min-h-11 flex-1 rounded border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 sm:flex-none">Download PDF</button>
              </div>
            </div>
            {settingsError ? <p className="text-sm text-amber-700">{settingsError}</p> : null}
            {!settings.logoData ? <p className="text-xs text-slate-500">Upload a logo in Business Settings to display it on invoices.</p> : null}
            {invoiceDocument ? (
              <>
                <InvoiceDocument invoice={invoiceDocument} />
                <InvoicePrintHost invoice={invoiceDocument} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
