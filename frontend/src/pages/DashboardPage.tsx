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
  ShieldCheck,
  Warehouse,
  Trash2,
  User,
  Users,
  X
} from "lucide-react";
import { api } from "../services/api";
import { InvoiceDocument, InvoicePrintHost, type InvoiceDocumentData } from "../components/InvoiceDocument";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../utils/permissions";
import type { Permission } from "../types/auth";

type Item = {
  product: string;
  productId?: string;
  qty: number;
  price: number;
};
type CatalogProduct = { id: string; name: string; code: string; unitPrice: string | number; stockQuantity?: string | number };
type DirectoryCustomer = { id: string; name: string; phone: string | null; address: string | null };
type DashboardSummary = { salesTotal: number; transactionCount: number; activeProductCount: number; activeEmployeeCount: number };
type InvoiceSettings = { logoData: string | null };
const emptyItem = (): Item => ({ product: "", qty: 1, price: 0 });
const roundMoney = (value: number) => Number(value.toFixed(2));

const navGroups: { title: string; items: { label: string; icon: typeof LayoutDashboard; path: string; permission?: Permission; adminsOnly?: boolean }[] }[] = [
  { title: "Dashboard", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }] },
  {
    title: "Sales",
    items: [
      { label: "New Invoice", icon: ReceiptText, path: "/transactions/new", permission: "invoices.create" },
      { label: "Invoices", icon: FileText, path: "/transactions", permission: "invoices.view" },
      { label: "Search Records", icon: Search, path: "/search", permission: "invoices.view" }
    ]
  },
  { title: "Inventory", items: [{ label: "Products", icon: Boxes, path: "/products", permission: "products.view" }, { label: "Inventory", icon: Warehouse, path: "/inventory", permission: "inventory.view" }, { label: "Customers", icon: Users, path: "/customers", permission: "customers.view" }] },
  { title: "Management", items: [{ label: "Employees", icon: Users, path: "/employees", adminsOnly: true }, { label: "Activity Logs", icon: ShieldCheck, path: "/activity", adminsOnly: true }, { label: "Reports", icon: BarChart3, path: "/reports", permission: "reports.view" }] },
  { title: "Settings", items: [{ label: "Settings", icon: Settings, path: "/settings", adminsOnly: true }] }
];

export function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const canCreateInvoices = canAccess(user, "invoices.create");
  const { id: editId } = useParams();
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [customers, setCustomers] = useState<DirectoryCustomer[]>([]);
  const [customerError, setCustomerError] = useState("");
  const canViewCustomers = canAccess(user, "customers.view");
  const [paidAmount, setPaidAmount] = useState(0);
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
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({ logoData: null });
  const [showBusinessLogo, setShowBusinessLogo] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ products: CatalogProduct[] }>("/products")
      .then((response) => setCatalog(response.data.products))
      .catch(() => setCatalogError("Product catalog unavailable; you can still enter items manually."));
  }, []);

  useEffect(() => {
    if (!canViewCustomers) return;
    api.get<{ customers: DirectoryCustomer[] }>("/customers")
      .then((response) => setCustomers(response.data.customers))
      .catch(() => setCustomerError("Customer directory unavailable; you can still enter customer details manually."));
  }, [canViewCustomers]);

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
    api.get<{ transaction: { transactionNumber: string; createdAt: string; customerId: string | null; customerName: string | null; customerPhone: string | null; customerAddress: string | null; isPaid: boolean; amountPaid?: string | number; totalAmount: string | number; paymentMethod: string; items: { productId: string | null; itemName: string; quantity: string | number; unitPrice: string | number }[] } }>(`/transactions/${editId}`)
      .then(({ data: { transaction } }) => {
        if (transaction.items.some((entry) => entry.productId) && !canAccess(user, "products.view")) {
          setSaveError("Permission denied: products.view is required to edit this invoice because it contains catalog products.");
          return;
        }
        setCustomerId(transaction.customerId ?? "");
        setCustomerName(transaction.customerName ?? "");
        setPhone(transaction.customerPhone ?? "");
        setAddress(transaction.customerAddress ?? "");
        setPaidAmount(transaction.amountPaid !== undefined
          ? Number(transaction.amountPaid)
          : transaction.isPaid ? Number(transaction.totalAmount) : 0);
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
  }, [editId, user]);

  useEffect(() => {
    const resetLogoOption = () => setShowBusinessLogo(false);
    window.addEventListener("afterprint", resetLogoOption);
    return () => window.removeEventListener("afterprint", resetLogoOption);
  }, []);

  const items = useMemo(() => [...manualItems, ...productItems], [manualItems, productItems]);
  const subtotal = useMemo(() => roundMoney(items.reduce((sum, item) => sum + roundMoney(item.qty * item.price), 0)), [items]);
  const total = subtotal;
  const remaining = Math.max(roundMoney(total - paidAmount), 0);
  const workspaceGridClass = showPreview
    ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(220px,260px)]"
    : "xl:grid-cols-[minmax(0,1fr)_minmax(220px,260px)]";
  const today = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());
  const displayDate = invoiceDate ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(invoiceDate)) : today;
  const invoiceDocument: InvoiceDocumentData = {
    transactionNumber: savedTransactionNumber || "Not saved",
    customerName,
    customerAddress: address,
    customerPhone: phone,
    paymentMethod,
    date: displayDate,
    items: items.filter((entry) => entry.product.trim()).map((entry) => ({
      itemName: entry.product,
      quantity: entry.qty,
      unitPrice: entry.price
    })),
    subtotal,
    total,
    amountPaid: paidAmount,
    remaining,
    logoData: invoiceSettings.logoData,
    showBusinessLogo
  };
  const summaryCards = [
    ...(canAccess(user, "invoices.view") ? [
      { label: "Sales total", value: summary ? `$${summary.salesTotal.toFixed(2)}` : "Loading…" },
      { label: "Transactions", value: summary ? String(summary.transactionCount) : "Loading…" }
    ] : []),
    ...(canAccess(user, "products.view") ? [{ label: "Active products", value: summary ? String(summary.activeProductCount) : "Loading…" }] : []),
    ...(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ? [{ label: "Active employees", value: summary ? String(summary.activeEmployeeCount) : "Loading…" }] : [])
  ];

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

  function selectCustomer(customerId: string) {
    setCustomerId(customerId);
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return;
    setCustomerName(customer.name);
    setPhone(customer.phone ?? "");
    setAddress(customer.address ?? "");
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
    if (paidAmount < 0 || paidAmount > total) {
      setSaveError("Paid amount must be between zero and the invoice total.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        customerName,
        customerPhone: phone,
        customerAddress: address,
        ...(canViewCustomers ? { customerId: customerId || null } : {}),
        isPaid: total > 0 && paidAmount >= total,
        amountPaid: roundMoney(paidAmount),
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

  if (location.pathname === "/dashboard" && !canCreateInvoices) {
    return <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5"><header><h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">Dashboard</h1><p className="mt-2 text-slate-600">Your business overview.</p></header>
        {summaryCards.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map((card) => <SummaryCard key={card.label} label={card.label} value={card.value} />)}</div> : <p className="rounded border bg-white p-5 text-slate-600">No dashboard features are assigned to your account yet.</p>}
      </div>
    </section>;
  }

  return (
    <section className="min-w-0 flex-1">
    <div className={`grid min-h-full min-w-0 gap-4 p-3 sm:p-4 lg:p-6 ${workspaceGridClass}`}>
          <section className="col-span-full grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 min-[1440px]:grid-cols-4">
            {summaryCards.map((card) => <SummaryCard key={card.label} label={card.label} value={card.value} />)}
          </section>
          <section className="flex min-w-0 flex-col rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="shrink-0 border-b border-slate-200 p-4">
              <h3 className="font-bold text-emerald-800">Customer Information</h3>
              {canViewCustomers ? <label className="mt-3 block text-sm font-medium text-slate-700">
                Use saved customer
                <select className="mt-1 h-11 w-full rounded border border-slate-300 bg-white px-3" value={customerId} onChange={(event) => selectCustomer(event.target.value)}>
                  <option value="">Enter customer details manually</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </label> : null}
              {customerError ? <p role="status" className="mt-2 text-sm text-amber-700">{customerError}</p> : null}
              <Field label="Customer Name" value={customerName} onChange={(value) => { setCustomerName(value); setCustomerId(""); }} required />
              <Field label="Phone" value={phone} onChange={(value) => { setPhone(value); setCustomerId(""); }} />
              <Field label="Address (Optional)" value={address} onChange={(value) => { setAddress(value); setCustomerId(""); }} />
            </div>

            <div className="flex-1 border-b border-slate-200 p-4">
              <h3 className="mb-4 font-bold text-emerald-800">Invoice Items</h3>
              <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Invoice item entry method">
                <button type="button" aria-pressed={itemMode === "manual"} onClick={() => switchItemMode("manual")} className={`rounded-md px-4 py-2 text-sm font-semibold ${itemMode === "manual" ? "bg-emerald-700 text-white" : "border border-slate-300 text-slate-700"}`}>
                  Write Items Manually
                </button>
                {canAccess(user, "products.view") ? <button type="button" aria-pressed={itemMode === "products"} onClick={() => switchItemMode("products")} className={`rounded-md px-4 py-2 text-sm font-semibold ${itemMode === "products" ? "bg-emerald-700 text-white" : "border border-slate-300 text-slate-700"}`}>
                  Select Existing Products
                </button> : null}
              </div>
              <div className={`overflow-x-auto ${showPreview ? "hidden 2xl:block" : "hidden xl:block"}`}>
                <table className="w-full min-w-[620px] text-sm">
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
                      <tr key={`${item.product}-${index}`} className="border-b border-slate-100">
                        <td className="px-2 py-2">{index + 1}</td>
                        <td className="px-2 py-2">
                          {itemMode === "manual" ? (
                            <input aria-label={`Item ${index + 1} name`} className="h-11 w-full min-w-0 rounded border border-slate-200 px-2 py-1" placeholder="Item name" value={item.product} onChange={(event) => updateItem(index, "product", event.target.value)} />
                          ) : (
                            <select aria-label={`Item ${index + 1} product`} className="h-11 w-full min-w-0 rounded border border-slate-200 bg-white px-2 py-1" value={item.productId ?? ""} onChange={(event) => selectProduct(index, event.target.value)}>
                              <option value="">Choose a product</option>
                              {catalog.map((product) => <option key={product.id} value={product.id}>{product.name}{canAccess(user, "inventory.view") ? ` (${Number(product.stockQuantity).toFixed(2)} in stock)` : ""}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input aria-label={`Item ${index + 1} quantity`} className="mx-auto h-11 w-20 rounded border border-slate-300 text-center" value={item.qty} onChange={(event) => updateItem(index, "qty", event.target.value)} type="number" min="0.01" step="0.01" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input aria-label={`Item ${index + 1} unit price`} className="mx-auto h-11 w-24 rounded border border-slate-300 text-center" value={item.price} onChange={(event) => updateItem(index, "price", event.target.value)} type="number" min="0" step="0.01" readOnly={itemMode === "products"} />
                        </td>
                        <td className="px-2 py-2 text-right">${(item.qty * item.price).toFixed(2)}</td>
                        <td className="px-2 py-2 text-right">
                          <button type="button" onClick={() => setModeItems(itemMode, (current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-11 w-11 items-center justify-center text-red-600" aria-label={`Remove item ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`grid gap-3 ${showPreview ? "2xl:hidden" : "xl:hidden"}`}>
                {(itemMode === "manual" ? manualItems : productItems).map((item, index) => (
                  <article key={`${item.product}-${index}`} className="min-w-0 rounded-md border border-slate-200 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="font-semibold">Item {index + 1}</h4>
                      <button type="button" onClick={() => setModeItems(itemMode, (current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-11 min-w-11 items-center justify-center rounded text-red-600" aria-label={`Remove item ${index + 1}`}>
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <label className="block text-sm font-medium">
                      Item name
                      {itemMode === "manual" ? (
                        <input aria-label={`Item ${index + 1} name`} className="mt-1 h-11 w-full min-w-0 rounded border border-slate-300 px-3" placeholder="Item name" value={item.product} onChange={(event) => updateItem(index, "product", event.target.value)} />
                      ) : (
                        <select aria-label={`Item ${index + 1} product`} className="mt-1 h-11 w-full min-w-0 rounded border border-slate-300 bg-white px-3" value={item.productId ?? ""} onChange={(event) => selectProduct(index, event.target.value)}>
                          <option value="">Choose a product</option>
                          {catalog.map((product) => <option key={product.id} value={product.id}>{product.name}{canAccess(user, "inventory.view") ? ` (${Number(product.stockQuantity).toFixed(2)} in stock)` : ""}</option>)}
                        </select>
                      )}
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="min-w-0 text-sm font-medium">Quantity
                        <input aria-label={`Item ${index + 1} quantity`} className="mt-1 h-11 w-full min-w-0 rounded border border-slate-300 px-2" value={item.qty} onChange={(event) => updateItem(index, "qty", event.target.value)} type="number" min="0.01" step="0.01" />
                      </label>
                      <label className="min-w-0 text-sm font-medium">Unit price
                        <input aria-label={`Item ${index + 1} unit price`} className="mt-1 h-11 w-full min-w-0 rounded border border-slate-300 px-2" value={item.price} onChange={(event) => updateItem(index, "price", event.target.value)} type="number" min="0" step="0.01" readOnly={itemMode === "products"} />
                      </label>
                    </div>
                    <p className="mt-3 flex justify-between border-t pt-3 text-sm"><span>Line total</span><strong>${(item.qty * item.price).toFixed(2)}</strong></p>
                  </article>
                ))}
              </div>
              {catalogError ? <p className="mt-3 text-xs text-amber-700">{catalogError}</p> : null}
              <button type="button" onClick={() => setModeItems(itemMode, (current) => [...current, emptyItem()])} className="mt-4 min-h-11 w-full rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 sm:w-auto">
                + Add {itemMode === "manual" ? "Manual Item" : "Product"}
              </button>
            </div>

            <div className="shrink-0 grid gap-5 p-4 md:grid-cols-2">
              <div className="space-y-3">
                <MoneyRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                <MoneyRow label="Total" value={`$${total.toFixed(2)}`} strong />
              </div>
              <div className="space-y-3 border-t border-slate-200 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                <label className="grid grid-cols-[96px_minmax(120px,1fr)] items-center gap-3 text-sm">
                  <span>Paid Amount</span>
                  <input aria-label="Paid amount" className="h-10 rounded-md border border-slate-300 px-3 text-right" type="number" min="0" max={total} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} />
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
          <>
            <div className="min-w-0 overflow-x-hidden xl:col-span-2 2xl:col-span-1">
              <InvoiceDocument invoice={invoiceDocument} />
            </div>
            <InvoicePrintHost invoice={invoiceDocument} />
          </>
          ) : null}

          <aside className={`min-w-0 space-y-4 ${showPreview ? "xl:col-span-2 2xl:col-span-1" : ""}`}>
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

function MoneyRow({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="grid grid-cols-[96px_minmax(120px,1fr)] items-center gap-3 text-sm">
      <span className={strong ? "font-bold" : ""}>{label}</span>
      <span className={`text-right ${strong ? "font-bold text-emerald-800" : ""} ${danger ? "font-bold text-red-600" : ""}`}>{value}</span>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-emerald-800">{value}</p></div>;
}

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="hidden h-full w-72 shrink-0 overflow-y-auto bg-[#0d1c1e] px-5 py-6 text-white lg:block">
      <SidebarContent currentPath={currentPath} />
    </aside>
  );
}

export function MobileSidebar({ currentPath, isOpen, onClose }: { currentPath: string; isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="Close menu" />
      <aside id="mobile-navigation" className="relative h-full w-[min(86vw,320px)] overflow-y-auto bg-[#0d1c1e] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white shadow-2xl">
        <button onClick={onClose} className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] rounded-md p-2 hover:bg-white/10" aria-label="Close menu" autoFocus>
          <X className="h-5 w-5" />
        </button>
        <SidebarContent currentPath={currentPath} onNavigate={onClose} />
      </aside>
    </div>
  );
}

function SidebarContent({ currentPath, onNavigate }: { currentPath: string; onNavigate?: () => void }) {
  const { user } = useAuth();
  const visibleGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminsOnly) return user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      return !item.permission || canAccess(user, item.permission);
    })
  })).filter((group) => group.items.length > 0);
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
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={currentPath === item.path ? "page" : undefined}
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
