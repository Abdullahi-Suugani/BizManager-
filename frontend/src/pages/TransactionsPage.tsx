import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type Item = { id: string; itemName: string; quantity: string | number; unitPrice: string | number; amount: string | number };
type Transaction = {
  id: string;
  transactionNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  discount: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  isPaid: boolean;
  paymentMethod: string;
  totalAmount: string | number;
  createdAt: string;
  employee: { name: string; email: string };
  items: Item[];
};
type InvoiceSettings = { businessName: string; logoData: string | null };

function InvoiceDocument({ transaction, settings, showBusinessLogo }: { transaction: Transaction; settings: InvoiceSettings; showBusinessLogo: boolean }) {
  return (
    <article className="print-area invoice-document mx-auto max-w-3xl rounded border bg-white px-8 py-6 shadow-sm">
      <div className="grid gap-6 text-sm sm:grid-cols-2 sm:gap-10">
        <div className="space-y-3">
          <p><span className="text-slate-500">Invoice No.</span><span className="ml-2 font-semibold">{transaction.transactionNumber}</span></p>
          <p><span className="text-slate-500">Date</span><span className="ml-2">{new Date(transaction.createdAt).toLocaleDateString()}</span></p>
          <p><span className="text-slate-500">Payment</span><span className="ml-2">{transaction.paymentMethod} ({transaction.isPaid ? "Paid" : "Unpaid"})</span></p>
          <p className="text-slate-500">Created by {transaction.employee.name}</p>
        </div>
        <div className="border-t border-slate-300 pt-5 sm:border-l sm:border-t-0 sm:border-slate-900 sm:pl-10 sm:pt-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p><span className="text-slate-500">Customer</span><span className="ml-2 font-semibold">{transaction.customerName ?? "—"}</span></p>
              <p><span className="text-slate-500">Phone</span><span className="ml-2">{transaction.customerPhone ?? "—"}</span></p>
              <p><span className="text-slate-500">Address</span><span className="ml-2">{transaction.customerAddress ?? "—"}</span></p>
            </div>
            {showBusinessLogo && settings.logoData ? <img src={settings.logoData} alt="Business logo" className="max-h-20 max-w-32 object-contain" /> : null}
          </div>
        </div>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Item Name</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transaction.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">{item.itemName}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">${Number(item.unitPrice).toFixed(2)}</td>
              <td className="py-2 text-right">${Number(item.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 space-y-1 text-right text-sm">
        <p>Discount: ${Number(transaction.discount).toFixed(2)}</p>
        <p>Tax ({Number(transaction.taxRate).toFixed(2)}%): ${Number(transaction.taxAmount).toFixed(2)}</p>
        <p className="text-xl font-bold">Total: ${Number(transaction.totalAmount).toFixed(2)}</p>
      </div>
    </article>
  );
}

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
  const [settings, setSettings] = useState<InvoiceSettings>({ businessName: "BizManager Business", logoData: null });
  const [settingsError, setSettingsError] = useState("");
  const [showBusinessLogo, setShowBusinessLogo] = useState(false);

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
    <main className="min-h-screen bg-[#f5f7f6] p-4 text-slate-950 sm:p-8">
      <section className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-emerald-800">{search ? "Search Records" : "Invoices"}</h1>
          <p className="mt-2 text-slate-600">{search ? "Search saved transactions and line items." : "Saved invoices from the database."}</p>
        </div>
        <form onSubmit={submit} className="grid gap-3 rounded border bg-white p-4 md:grid-cols-5">
          <input className="h-10 rounded border px-3" placeholder="Invoice number" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
          <input className="h-10 rounded border px-3" placeholder="Item" value={item} onChange={(event) => setItem(event.target.value)} />
          <input className="h-10 rounded border px-3" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className="h-10 rounded border px-3" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <button className="h-10 rounded bg-emerald-700 font-semibold text-white">{search ? "Search" : "Filter"}</button>
        </form>
        {error ? <p className="font-semibold text-red-600">{error}</p> : null}
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
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
        <div className="flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button>
        </div>
        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Invoice details</h2>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={showBusinessLogo} onChange={(event) => setShowBusinessLogo(event.target.checked)} />
                Show Business Logo
              </label>
              <button onClick={() => window.print()} className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white">Print</button>
            </div>
            {settingsError ? <p className="text-sm text-amber-700">{settingsError}</p> : null}
            {!settings.logoData ? <p className="text-xs text-slate-500">Upload a logo in Business Settings to display it on invoices.</p> : null}
            <InvoiceDocument transaction={selected} settings={settings} showBusinessLogo={showBusinessLogo} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
