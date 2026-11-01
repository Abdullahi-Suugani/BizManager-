import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
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
import { api } from "../services/api";

type Item = {
  product: string;
  productId?: string;
  qty: number;
  price: number;
};
type CatalogProduct = { id: string; name: string; code: string; unitPrice: string | number; stockQuantity: string | number };
type DashboardSummary = { salesTotal: number; transactionCount: number; activeProductCount: number; activeEmployeeCount: number };
type InvoiceSettings = { businessName: string; logoData: string | null };
const emptyItem = (): Item => ({ product: "", qty: 1, price: 0 });
const roundMoney = (value: number) => Number(value.toFixed(2));

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
  const { id: editId } = useParams();
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
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editId));
  const [editLoaded, setEditLoaded] = useState(!editId);
  const [itemMode, setItemMode] = useState<"manual" | "products">("manual");
  const [manualItems, setManualItems] = useState<Item[]>([emptyItem()]);
  const [productItems, setProductItems] = useState<Item[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({ businessName: "BizManager Business", logoData: null });
  const [showBusinessLogo, setShowBusinessLogo] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ products: CatalogProduct[] }>("/products")
      .then((response) => setCatalog(response.data.products))
      .catch(() => setCatalogError("Product catalog unavailable; you can still enter items manually."));
  }, []);

  useEffect(() => {
    api.get<{ settings: InvoiceSettings }>("/settings/invoice")
      .then((response) => setInvoiceSettings(response.data.settings))
      .catch(() => setSettingsError("Business invoice settings are unavailable."));
  }, []);

  useEffect(() => {
    api.get<DashboardSummary>("/dashboard/summary").then((response) => setSummary(response.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editId) return;
    setIsLoadingEdit(true);
    api.get<{ transaction: { transactionNumber: string; createdAt: string; customerName: string | null; customerPhone: string | null; customerAddress: string | null; discount: string | number; taxRate: string | number; isPaid: boolean; paymentMethod: string; items: { productId: string | null; itemName: string; quantity: string | number; unitPrice: string | number }[] } }>(`/transactions/${editId}`)
      .then(({ data: { transaction } }) => {
        setCustomerName(transaction.customerName ?? "");
        setPhone(transaction.customerPhone ?? "");
        setAddress(transaction.customerAddress ?? "");
        setDiscount(Number(transaction.discount));
        setTaxRate(Number(transaction.taxRate));
        setIsPaid(transaction.isPaid);
        setPaymentMethod(transaction.paymentMethod);
        setSavedTransactionNumber(transaction.transactionNumber);
        setInvoiceDate(transaction.createdAt);
        const toItem = (entry: typeof transaction.items[number]): Item => ({
          product: entry.itemName,
          ...(entry.productId ? { productId: entry.productId } : {}),
          qty: Number(entry.quantity),
          price: Number(entry.unitPrice)
        });
        const manual = transaction.items.filter((entry) => !entry.productId).map(toItem);
        const products = transaction.items.filter((entry) => entry.productId).map(toItem);
        setManualItems(manual.length ? manual : [emptyItem()]);
        setProductItems(products);
        setItemMode(manual.length ? "manual" : "products");
        setShowPreview(true);
        setEditLoaded(true);
      })
      .catch((requestError: any) => setSaveError(requestError.response?.data?.message ?? "Unable to load invoice for editing."))
      .finally(() => setIsLoadingEdit(false));
  }, [editId]);

  useEffect(() => {
    const resetLogoOption = () => setShowBusinessLogo(false);
    window.addEventListener("afterprint", resetLogoOption);
    return () => window.removeEventListener("afterprint", resetLogoOption);
  }, []);

  const items = useMemo(() => [...manualItems, ...productItems], [manualItems, productItems]);
  const subtotal = useMemo(() => roundMoney(items.reduce((sum, item) => sum + roundMoney(item.qty * item.price), 0)), [items]);
  const discountedSubtotal = roundMoney(Math.max(subtotal - discount, 0));
  const taxAmount = roundMoney(discountedSubtotal * (taxRate / 100));
  const total = roundMoney(discountedSubtotal + taxAmount);
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
  const displayDate = invoiceDate ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(invoiceDate)) : today;

  function setModeItems(mode: "manual" | "products", updater: (current: Item[]) => Item[]) {
    const setter = mode === "manual" ? setManualItems : setProductItems;
    setter(updater);
  }

  function switchItemMode(mode: "manual" | "products") {
    setItemMode(mode);
  }

  function updateItem(index: number, field: keyof Item, value: string) {
    setModeItems(itemMode, (current) =>
      current.map((entry, itemIndex) => itemIndex === index
        ? { ...entry, [field]: field === "product" ? value : Number.isFinite(Number(value)) ? Number(value) : 0 }
        : entry)
    );
  }

  function selectProduct(index: number, productId: string) {
    const product = catalog.find((entry) => entry.id === productId);
    setModeItems("products", (current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, productId: product?.id, product: product?.name ?? "", price: product ? Number(product.unitPrice) : 0 }
      : item));
  }

  function printInvoice() {
    setShowPreview(true);
    window.setTimeout(() => window.print(), 100);
  }

  async function saveInvoice() {
    if (isSaving || isLoadingEdit || !editLoaded) return;
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
    if (validItems.some((entry) => entry.quantity <= 0 || entry.unitPrice < 0)) {
      setSaveError("Item quantities must be positive and unit prices cannot be negative.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        customerName,
        customerPhone: phone,
        customerAddress: address,
        discount,
        taxRate,
        isPaid,
        paymentMethod,
        items: validItems
      };
      const response = editId
        ? await api.put<{ transaction: { transactionNumber: string } }>(`/transactions/${editId}`, payload)
        : await api.post<{ transaction: { transactionNumber: string } }>("/transactions", payload);

      setSaveMessage(`${editId ? "Updated" : "Saved"} ${response.data.transaction.transactionNumber}`);
      setSavedTransactionNumber(response.data.transaction.transactionNumber);
      setShowPreview(true);
    } catch (error: any) {
      setSaveError(error.response?.data?.message ?? "Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 flex-1">
    <div className={`grid min-h-full gap-4 p-3 sm:p-4 ${workspaceGridClass}`}>
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
              <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Invoice item entry method">
                <button type="button" aria-pressed={itemMode === "manual"} onClick={() => switchItemMode("manual")} className={`rounded-md px-4 py-2 text-sm font-semibold ${itemMode === "manual" ? "bg-emerald-700 text-white" : "border border-slate-300 text-slate-700"}`}>
                  Write Items Manually
                </button>
                <button type="button" aria-pressed={itemMode === "products"} onClick={() => switchItemMode("products")} className={`rounded-md px-4 py-2 text-sm font-semibold ${itemMode === "products" ? "bg-emerald-700 text-white" : "border border-slate-300 text-slate-700"}`}>
                  Select Existing Products
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-slate-100 text-emerald-900">
                    <tr>
                      <th className="px-2 py-3 text-left">#</th>
                      <th className="px-2 py-3 text-left">Item Name</th>
                      <th className="px-2 py-3 text-center">Quantity</th>
                      <th className="px-2 py-3 text-center">Unit Price</th>
                      <th className="px-2 py-3 text-right">Total</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {(itemMode === "manual" ? manualItems : productItems).map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="px-2 py-2">{index + 1}</td>
                        <td className="px-2 py-2">
                          {itemMode === "manual" ? (
                            <input aria-label={`Item ${index + 1} name`} className="w-full rounded border border-slate-200 px-2 py-1" placeholder="Item name" value={item.product} onChange={(event) => updateItem(index, "product", event.target.value)} />
                          ) : (
                            <select aria-label={`Item ${index + 1} product`} className="w-full rounded border border-slate-200 bg-white px-2 py-1" value={item.productId ?? ""} onChange={(event) => selectProduct(index, event.target.value)}>
                              <option value="">Choose a product</option>
                              {catalog.map((product) => <option key={product.id} value={product.id}>{product.name} ({Number(product.stockQuantity).toFixed(2)} in stock)</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input aria-label={`Item ${index + 1} quantity`} className="mx-auto h-8 w-20 rounded border border-slate-300 text-center" value={item.qty} onChange={(event) => updateItem(index, "qty", event.target.value)} type="number" min="0.01" step="0.01" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input aria-label={`Item ${index + 1} unit price`} className="mx-auto h-8 w-24 rounded border border-slate-300 text-center" value={item.price} onChange={(event) => updateItem(index, "price", event.target.value)} type="number" min="0" step="0.01" readOnly={itemMode === "products"} />
                        </td>
                        <td className="px-2 py-2 text-right">${(item.qty * item.price).toFixed(2)}</td>
                        <td className="px-2 py-2 text-right">
                          <button type="button" onClick={() => setModeItems(itemMode, (current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-red-600" aria-label="Remove item">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {catalogError ? <p className="mt-3 text-xs text-amber-700">{catalogError}</p> : null}
              <button type="button" onClick={() => setModeItems(itemMode, (current) => [...current, emptyItem()])} className="mt-4 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800">
                + Add {itemMode === "manual" ? "Manual Item" : "Product"}
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
          <InvoicePreview transactionNumber={savedTransactionNumber || "Not saved"} customerName={customerName} phone={phone} address={address} items={items.filter((entry) => entry.product.trim())} subtotal={subtotal} discount={discount} taxRate={taxRate} taxAmount={taxAmount} total={total} paidAmount={paidAmount} paymentMethod={paymentMethod} remaining={remaining} date={displayDate} businessName={invoiceSettings.businessName} logoData={invoiceSettings.logoData} showBusinessLogo={showBusinessLogo} />
          ) : null}

          <aside className={`space-y-4 ${showPreview ? "lg:col-span-2 xl:col-span-1" : ""}`}>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-5 text-sm font-bold uppercase">Actions</h3>
              <button onClick={saveInvoice} disabled={isSaving || isLoadingEdit || !editLoaded} className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:bg-slate-400">
                <Save className="h-4 w-4" />
                {isLoadingEdit ? "Loading invoice..." : isSaving ? "Saving..." : editId ? "Update Invoice" : "Save Invoice"}
              </button>
              <button onClick={() => setShowPreview((current) => !current)} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white">
                <ReceiptText className="h-4 w-4" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
              {saveMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{saveMessage}</p> : null}
              {saveError ? <p className="mt-3 text-sm font-semibold text-red-600">{saveError}</p> : null}
              {settingsError ? <p className="mt-3 text-sm text-amber-700">{settingsError}</p> : null}
              <label className="mt-4 flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={showBusinessLogo} onChange={(event) => setShowBusinessLogo(event.target.checked)} />
                Show Business Logo
              </label>
              {!invoiceSettings.logoData ? <p className="mt-1 text-xs text-slate-500">Upload a logo in Business Settings to display it on invoices.</p> : null}
              <button
                onClick={printInvoice}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white font-medium"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
              <button
                onClick={printInvoice}
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
  date,
  businessName,
  logoData,
  showBusinessLogo
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
  businessName: string;
  logoData: string | null;
  showBusinessLogo: boolean;
}) {
  return (
    <section className="print-area overflow-hidden rounded-sm bg-white px-5 py-6 shadow-xl sm:px-8 lg:px-10 lg:py-8">
      <div className="grid gap-6 text-sm sm:grid-cols-2 sm:gap-10">
        <div className="space-y-5">
          <PreviewLine label="Invoice No." value={transactionNumber} />
          <PreviewLine label="Date" value={date.toUpperCase()} />
          <PreviewLine label="Payment Method" value={paymentMethod.toUpperCase()} />
        </div>
        <div className="border-t border-slate-300 pt-5 sm:border-l sm:border-t-0 sm:border-slate-900 sm:pl-10 sm:pt-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-5">
              <PreviewLine label="Customer" value={customerName} />
              <PreviewLine label="Address" value={address} />
              <PreviewLine label="Telephone" value={phone} />
            </div>
            {showBusinessLogo && logoData ? <img src={logoData} alt="Business logo" className="max-h-20 max-w-32 object-contain" /> : null}
          </div>
        </div>
      </div>
      <div className="mt-8 overflow-x-auto border-t border-slate-900">
      <table className="w-full min-w-[430px] text-sm">
        <thead className="text-emerald-800">
          <tr>
            <th className="py-4 text-left">Item Name</th>
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
    <aside className="hidden h-full w-72 shrink-0 overflow-y-auto bg-[#0d1c1e] px-5 py-6 text-white lg:block">
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
