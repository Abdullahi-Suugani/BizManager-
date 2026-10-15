import { useEffect, useState } from "react";
import { api } from "../services/api";

type Item = { id: string; itemName: string; quantity: string | number; unitPrice: string | number; amount: string | number };
type Transaction = { id: string; transactionNumber: string; customerName: string | null; customerPhone: string | null; customerAddress: string | null; discount: string | number; taxRate: string | number; taxAmount: string | number; isPaid: boolean; paymentMethod: string; totalAmount: string | number; createdAt: string; employee: { name: string; email: string }; items: Item[] };

function InvoiceDocument({ transaction }: { transaction: Transaction }) {
  return <article className="invoice-document mx-auto max-w-3xl rounded border bg-white p-8 shadow-sm"><div className="flex justify-between border-b pb-5"><div><h1 className="text-3xl font-bold text-emerald-800">INVOICE</h1><p className="mt-1 font-semibold">{transaction.transactionNumber}</p><p className="mt-3 text-sm">Customer: {transaction.customerName ?? "—"}</p><p className="text-sm">Phone: {transaction.customerPhone ?? "—"}</p><p className="text-sm">Address: {transaction.customerAddress ?? "—"}</p></div><div className="text-right text-sm"><p>{new Date(transaction.createdAt).toLocaleDateString()}</p><p className="text-slate-500">Created by {transaction.employee.name}</p><p className="mt-2">Payment: {transaction.paymentMethod} ({transaction.isPaid ? "Paid" : "Unpaid"})</p></div></div><table className="mt-6 w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{transaction.items.map((item) => <tr key={item.id} className="border-b"><td className="py-2">{item.itemName}</td><td className="py-2 text-right">{item.quantity}</td><td className="py-2 text-right">${Number(item.unitPrice).toFixed(2)}</td><td className="py-2 text-right">${Number(item.amount).toFixed(2)}</td></tr>)}</tbody></table><div className="mt-6 space-y-1 text-right text-sm"><p>Discount: ${Number(transaction.discount).toFixed(2)}</p><p>Tax ({Number(transaction.taxRate).toFixed(2)}%): ${Number(transaction.taxAmount).toFixed(2)}</p><p className="text-xl font-bold">Total: ${Number(transaction.totalAmount).toFixed(2)}</p></div></article>;
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

  async function load(requestedPage = page) {
    setError("");
    try {
      const response = await api.get<{ transactions: Transaction[]; pagination: { totalPages: number } }>("/transactions", { params: { invoiceNumber: invoiceNumber || undefined, item: item || undefined, from: from || undefined, to: to || undefined, page: requestedPage, pageSize: 20 } });
      setTransactions(response.data.transactions); setTotalPages(response.data.pagination.totalPages);
    } catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to load invoices."); }
  }
  useEffect(() => { void load(); }, [page]);
  function submit(event: React.FormEvent) { event.preventDefault(); setPage(1); void load(1); }

  return <main className="min-h-screen bg-[#f5f7f6] p-4 text-slate-950 sm:p-8"><section className="mx-auto max-w-6xl space-y-5"><div><h1 className="text-3xl font-bold text-emerald-800">{search ? "Search Records" : "Invoices"}</h1><p className="mt-2 text-slate-600">{search ? "Search saved transactions and line items." : "Saved invoices from the database."}</p></div><form onSubmit={submit} className="grid gap-3 rounded border bg-white p-4 md:grid-cols-5"><input className="h-10 rounded border px-3" placeholder="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /><input className="h-10 rounded border px-3" placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} /><input className="h-10 rounded border px-3" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input className="h-10 rounded border px-3" type="date" value={to} onChange={(e) => setTo(e.target.value)} /><button className="h-10 rounded bg-emerald-700 font-semibold text-white">{search ? "Search" : "Filter"}</button></form>{error ? <p className="font-semibold text-red-600">{error}</p> : null}<div className="overflow-x-auto rounded border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Employee</th><th className="p-3">Items</th><th className="p-3 text-right">Total</th><th className="p-3" /></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id} className="border-t"><td className="p-3 font-semibold">{transaction.transactionNumber}</td><td className="p-3">{new Date(transaction.createdAt).toLocaleDateString()}</td><td className="p-3">{transaction.employee.name}</td><td className="p-3">{transaction.items.map((entry) => entry.itemName).join(", ")}</td><td className="p-3 text-right">${Number(transaction.totalAmount).toFixed(2)}</td><td className="p-3"><button onClick={() => setSelected(transaction)} className="font-semibold text-emerald-700">View</button></td></tr>)}</tbody></table>{transactions.length === 0 ? <p className="p-5 text-slate-600">No saved invoices found.</p> : null}</div><div className="flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span className="text-sm">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div>{selected ? <div className="space-y-3"><div className="flex justify-between"><h2 className="text-xl font-bold">Invoice details</h2><button onClick={() => window.print()} className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white">Print</button></div><InvoiceDocument transaction={selected} /></div> : null}</section></main>;
}
