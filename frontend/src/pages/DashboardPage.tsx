import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Menu,
  Printer,
  ReceiptText,
  Search,
  Settings,
  Share2,
  Save,
  Trash2,
  User,
  Users,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

type Item = {
  product: string;
  productId?: string;
  qty: number;
  price: number;
};
type CatalogProduct = { id: string; name: string; code: string; unitPrice: string | number; stockQuantity: string | number };
type DashboardSummary = { salesTotal: number; transactionCount: number; activeProductCount: number; activeEmployeeCount: number };

const navGroups = [
  { title: "Dashboard", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }] },
  {
    title: "Sales",
    items: [
      { label: "New Invoice", icon: ReceiptText, path: "/transactions/new" },
      { label: "Invoices", icon: FileText, path: "/transactions" },
      { label: "Search Records", icon: Search, path: "/search" }
    ]
  },
  { title: "Inventory", items: [{ label: "Products", icon: Boxes, path: "/products" }] },
  { title: "Management", items: [{ label: "Employees", icon: Users, path: "/employees" }, { label: "Reports", icon: BarChart3, path: "/reports" }] },
  { title: "Settings", items: [{ label: "Settings", icon: Settings, path: "/settings" }] }
];

export function DashboardPage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showPreview, setShowPreview] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedTransactionNumber, setSavedTransactionNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([{ product: "", qty: 1, price: 0 }]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api.get<{ products: CatalogProduct[] }>("/products")
      .then((response) => setCatalog(response.data.products))
      .catch(() => setCatalogError("Product catalog unavailable; you can still enter items manually."));
  }, []);

  useEffect(() => {
    api.get<DashboardSummary>("/dashboard/summary").then((response) => setSummary(response.data)).catch(() => undefined);
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.price, 0), [items]);
  const discountedSubtotal = Math.max(subtotal - discount, 0);
  const taxAmount = discountedSubtotal * (taxRate / 100);
  const total = discountedSubtotal + taxAmount;
  const paidAmount = isPaid ? total : 0;
  const remaining = Math.max(total - paidAmount, 0);
  const workspaceGridClass = showPreview
    ? "lg:grid-cols-[minmax(360px,430px)_1fr] xl:grid-cols-[430px_minmax(520px,1fr)_230px]"
    : "lg:grid-cols-[minmax(0,1fr)_230px]";
  const today = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());

  function updateItem(index: number, field: keyof Item, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === "product" ? value : Number(value) || 0 }
          : item
      )
    );
  }

  function selectProduct(index: number, productId: string) {
    const product = catalog.find((entry) => entry.id === productId);
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: product?.id, product: product?.name ?? "", price: product ? Number(product.unitPrice) : 0 } : item));
  }

  async function saveInvoice() {
    setSaveMessage("");
    setSaveError("");

    const validItems = items
      .filter((item) => item.product.trim())
      .map((item) => ({
        ...(item.productId ? { productId: item.productId } : {}),
        itemName: item.product.trim(),
        quantity: item.qty,
        unitPrice: item.price
      }));

    if (!customerName.trim()) {
      setSaveError("Customer name is required");
      return;
    }

    if (validItems.length === 0) {
      setSaveError("Add at least one item");
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.post<{ transaction: { transactionNumber: string } }>("/transactions", {
        customerName,
        customerPhone: phone,
        customerAddress: address,
        discount,
        taxRate,
        isPaid,
        paymentMethod,
        items: validItems
      });

      setSaveMessage(`Saved ${response.data.transaction.transactionNumber}`);
      setSavedTransactionNumber(response.data.transaction.transactionNumber);
      setShowPreview(true);
    } catch {
      setSaveError("Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f5f7f6] text-slate-950">
      <Sidebar currentPath={location.pathname} />
      <MobileSidebar currentPath={location.pathname} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <section className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-3 sm:gap-7">
            <button onClick={() => setIsMenuOpen(true)} className="rounded-md p-2 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="truncate text-lg font-bold text-emerald-800 sm:text-xl">Create Invoice</h2>
          </div>
          <button onClick={logout} className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-slate-100">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200">
              <User className="h-6 w-6" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="font-semibold">{user?.name ?? "User"}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role.toLowerCase()}</p>
            </div>
            <ChevronDown className="h-4 w-4" />
          </button>
        </header>

        <div className={`grid flex-1 gap-4 p-3 sm:p-4 ${workspaceGridClass}`}>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:col-span-2 xl:col-span-3">
            <SummaryCard label="Sales total" value={summary ? `$${summary.salesTotal.toFixed(2)}` : "Loading…"} />
            <SummaryCard label="Transactions" value={summary ? String(summary.transactionCount) : "Loading…"} />
            <SummaryCard label="Active products" value={summary ? String(summary.activeProductCount) : "Loading…"} />
            <SummaryCard label="Active employees" value={summary ? String(summary.activeEmployeeCount) : "Loading…"} />
          </section>
          <section className="flex flex-col rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="shrink-0 border-b border-slate-200 p-4">
              <h3 className="font-bold text-emerald-800">Customer Information</h3>
              <Field label="Customer Name" value={customerName} onChange={setCustomerName} required />
              <Field label="Phone" value={phone} onChange={setPhone} />
              <Field label="Address (Optional)" value={address} onChange={setAddress} />
            </div>

            <div className="flex-1 border-b border-slate-200 p-4">
              <h3 className="mb-4 font-bold text-emerald-800">Invoice Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-10" />
                    <col />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-32" />
                    <col className="w-10" />
                  </colgroup>
                  <thead className="bg-slate-100 text-emerald-900">
                    <tr>
                      <th className="px-2 py-3 text-left">#</th>
                      <th className="px-2 py-3 text-left">Product</th>
                      <th className="px-2 py-3 text-center">Qty</th>
                      <th className="px-2 py-3 text-center">Price</th>
                      <th className="px-2 py-3 text-right">Total</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="px-2 py-2">{index + 1}</td>
                        <td className="px-2 py-2">
                          {catalog.length > 0 ? <select className="w-full rounded border border-slate-200 bg-white px-2 py-1" value={item.productId ?? ""} onChange={(event) => selectProduct(index, event.target.value)}><option value="">Manual item</option>{catalog.map((product) => <option key={product.id} value={product.id}>{product.name} ({Number(product.stockQuantity).toFixed(2)} in stock)</option>)}</select> : <input className="w-full bg-transparent outline-none" value={item.product} onChange={(event) => updateItem(index, "product", event.target.value)} />}
                          {item.productId ? <span className="mt-1 block text-xs text-slate-500">{item.product}</span> : null}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input className="mx-auto h-8 w-16 rounded border border-transparent bg-transparent text-center outline-none focus:border-slate-300" value={item.qty} onChange={(event) => updateItem(index, "qty", event.target.value)} type="number" min="1" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input className="mx-auto h-8 w-20 rounded border border-transparent bg-transparent text-center outline-none focus:border-slate-300" value={item.price === 0 ? "" : item.price} onChange={(event) => updateItem(index, "price", event.target.value)} type="number" min="0" />
                        </td>
                        <td className="px-2 py-2 text-right">${(item.qty * item.price).toFixed(2)}</td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className="text-red-600" aria-label="Remove item">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {catalogError ? <p className="mt-3 text-xs text-amber-700">{catalogError}</p> : null}
              <button onClick={() => setItems([...items, { product: "", qty: 1, price: 0 }])} className="mt-4 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800">
                + Add Item
              </button>
            </div>

            <div className="shrink-0 grid gap-5 p-4 md:grid-cols-2">
              <div className="space-y-3">
                <MoneyRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                <NumberField label="Discount" value={discount} onChange={setDiscount} />
                <NumberField label="Tax (%)" value={taxRate} onChange={setTaxRate} />
                <MoneyRow label="Total" value={`$${total.toFixed(2)}`} strong />
              </div>
              <div className="space-y-3 border-t border-slate-200 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                <label className="grid grid-cols-[96px_minmax(120px,1fr)] items-center gap-3 text-sm">
                  <span>Paid Amount</span>
                  <select className="h-10 rounded-md border border-slate-300 px-3" value={isPaid ? "YES" : "NO"} onChange={(event) => setIsPaid(event.target.value === "YES")}>
                    <option>NO</option>
                    <option>YES</option>
                  </select>
                </label>
                <label className="grid grid-cols-[96px_minmax(120px,1fr)] items-center gap-3 text-sm">
                  <span>Payment Method</span>
                  <select className="h-10 rounded-md border border-slate-300 px-3" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Mobile Money</option>
                    <option>Bank Transfer</option>
                  </select>
                </label>
                <MoneyRow label="Remaining Balance" value={`$${remaining.toFixed(2)}`} danger={remaining > 0} />
              </div>
            </div>
          </section>

          {showPreview ? (
          <InvoicePreview transactionNumber={savedTransactionNumber || "Not saved"} customerName={customerName} phone={phone} address={address} items={items} subtotal={subtotal} discount={discount} taxRate={taxRate} taxAmount={taxAmount} total={total} paidAmount={paidAmount} paymentMethod={paymentMethod} remaining={remaining} date={today} />
          ) : null}

          <aside className={`space-y-4 ${showPreview ? "lg:col-span-2 xl:col-span-1" : ""}`}>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-5 text-sm font-bold uppercase">Actions</h3>
              <button onClick={saveInvoice} disabled={isSaving} className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:bg-slate-400">
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Invoice"}
              </button>
              <button onClick={() => setShowPreview((current) => !current)} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white">
                <ReceiptText className="h-4 w-4" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
              {saveMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{saveMessage}</p> : null}
              {saveError ? <p className="mt-3 text-sm font-semibold text-red-600">{saveError}</p> : null}
              <button
                onClick={() => {
                  setShowPreview(true);
                  window.setTimeout(() => window.print(), 100);
                }}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white font-medium"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
              <button
                onClick={() => {
                  setShowPreview(true);
                  window.setTimeout(() => window.print(), 100);
                }}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white font-medium"
              >
                <FileText className="h-4 w-4" />
                Download PDF
              </button>
              <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white font-medium">
                <Share2 className="h-4 w-4" />
                Share Invoice
              </button>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-5 text-sm font-bold uppercase">Preview Settings</h3>
              {["A4", "Portrait", "Default"].map((value) => (
                <select key={value} className="mb-4 h-11 w-full rounded-md border border-slate-300 px-3">
                  <option>{value}</option>
                </select>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="mt-4 block text-sm">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Summary({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={strong ? "font-bold" : ""}>{label}</span>
      <span className={`${strong ? "font-bold text-emerald-800" : ""} ${danger ? "font-bold text-red-600" : ""}`}>{value}</span>
    </div>
  );
}

function MoneyRow({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="grid grid-cols-[96px_minmax(120px,1fr)] items-center gap-3 text-sm">
      <span className={strong ? "font-bold" : ""}>{label}</span>
      <span className={`text-right ${strong ? "font-bold text-emerald-800" : ""} ${danger ? "font-bold text-red-600" : ""}`}>{value}</span>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid grid-cols-[96px_minmax(120px,1fr)] items-center gap-3 text-sm">
      <span>{label}</span>
      <input
        className="h-10 rounded-md border border-slate-300 px-3 text-right"
        value={value === 0 ? "" : value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        type="number"
        min="0"
      />
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-emerald-800">{value}</p></div>;
}

function InvoicePreview({
  customerName,
  transactionNumber,
  phone,
  address,
  items,
  subtotal,
  discount,
  taxRate,
  taxAmount,
  total,
  paidAmount,
  paymentMethod,
  remaining,
  date
}: {
  transactionNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: Item[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  remaining: number;
  date: string;
}) {
  return (
    <section className="print-area overflow-hidden rounded-sm bg-white px-5 py-6 shadow-xl sm:px-8 lg:px-10 lg:py-8">
      <div className="flex items-start justify-between">
        <h2 className="text-3xl font-extrabold tracking-normal text-emerald-800 sm:text-5xl">INVOICE</h2>
        <div className="text-right">
          <div className="mb-2 text-2xl font-bold text-emerald-700 sm:text-4xl">|||||</div>
          <p className="font-bold text-emerald-800">BIZMANAGER</p>
          <p className="text-xs">BUSINESS SYSTEM</p>
        </div>
      </div>
      <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2 sm:gap-10">
        <div className="space-y-5">
          <PreviewLine label="Invoice No." value={transactionNumber} />
          <PreviewLine label="Date" value={date.toUpperCase()} />
          <PreviewLine label="Payment Method" value={paymentMethod.toUpperCase()} />
        </div>
        <div className="border-t border-slate-300 pt-5 sm:border-l sm:border-t-0 sm:border-slate-900 sm:pl-10 sm:pt-0">
          <PreviewLine label="Customer" value={customerName} />
          <PreviewLine label="Address" value={address} />
          <PreviewLine label="Telephone" value={phone} />
        </div>
      </div>
      <div className="mt-8 overflow-x-auto border-t border-slate-900">
      <table className="w-full min-w-[430px] text-sm">
        <thead className="text-emerald-800">
          <tr>
            <th className="py-4 text-left">Items</th>
            <th className="py-4 text-right">Qty.</th>
            <th className="py-4 text-right">Price</th>
            <th className="py-4 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t border-slate-200">
              <td className="py-3">{item.product || "Item"}</td>
              <td className="py-3 text-right">{item.qty}</td>
              <td className="py-3 text-right">${item.price.toFixed(2)}</td>
              <td className="py-3 text-right">${(item.qty * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="ml-auto mt-10 w-full max-w-72 space-y-3 text-sm">
        <Summary label="SUBTOTAL" value={`$${subtotal.toFixed(2)}`} />
        <Summary label="DISCOUNT" value={`$${discount.toFixed(2)}`} />
        <Summary label={`TAX (${taxRate}%)`} value={`$${taxAmount.toFixed(2)}`} />
        <div className="border-t border-emerald-700 pt-4">
          <Summary label="TOTAL" value={`$${total.toFixed(2)}`} strong />
        </div>
        <Summary label="PAID" value={`$${paidAmount.toFixed(2)}`} />
        <div className="border-t border-emerald-700 pt-4">
          <Summary label="REMAINING BALANCE" value={`$${remaining.toFixed(2)}`} danger={remaining > 0} />
        </div>
      </div>
      <div className="mt-10">
        <p className="text-2xl font-extrabold text-emerald-800">THANK YOU!</p>
        <p className="mt-2 text-sm">We appreciate your business.</p>
        <p className="text-sm">Please come again!</p>
      </div>
    </section>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-600">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 bg-[#0d1c1e] px-5 py-6 text-white lg:block">
      <SidebarContent currentPath={currentPath} />
    </aside>
  );
}

export function MobileSidebar({ currentPath, isOpen, onClose }: { currentPath: string; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="Close menu" />
      <aside className="relative h-full w-[min(86vw,320px)] overflow-y-auto bg-[#0d1c1e] px-5 py-6 text-white shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-2 hover:bg-white/10" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
        <SidebarContent currentPath={currentPath} onNavigate={onClose} />
      </aside>
    </div>
  );
}

function SidebarContent({ currentPath, onNavigate }: { currentPath: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
          <ReceiptText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-6">BizManager</h1>
          <p className="text-sm text-slate-300">Business System</p>
        </div>
      </div>
      <nav className="mt-8 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onNavigate}
                  className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm ${
                    currentPath === item.path ? "bg-emerald-700 text-white" : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}
