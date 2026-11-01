import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

type Settings = {
  businessName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  currency: string;
  showBusinessContact: boolean;
  showInvoiceLogo: boolean;
  showPaymentStatus: boolean;
  logoData: string | null;
};

const initial: Settings = {
  businessName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  currency: "USD",
  showBusinessContact: true,
  showInvoiceLogo: false,
  showPaymentStatus: true,
  logoData: null
};

export function SettingsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ settings: Settings }>("/settings")
      .then((response) => setForm(response.data.settings))
      .catch((requestError: any) => setError(requestError.response?.data?.message ?? "Unable to load settings."))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const response = await api.put<{ settings: Settings }>("/settings", form);
      setForm(response.data.settings);
      setMessage("Settings saved.");
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to save settings.");
    }
  }

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Business logos must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const logoData = reader.result;
      if (typeof logoData !== "string") {
        setError("Unable to read the selected business logo.");
        return;
      }
      setForm((current) => ({ ...current, logoData }));
      setError("");
      setMessage("");
    };
    reader.onerror = () => setError("Unable to read the selected business logo.");
    reader.readAsDataURL(file);
  }

  return (
    <AppShell currentPath={location.pathname} isMenuOpen={false} onMenuOpen={() => {}} onMenuClose={() => {}}>
      <section className="min-w-0 flex-1 bg-[#f5f7f6] p-4 pt-16 text-slate-950 sm:p-8 sm:pt-8">
        <div className="mx-auto max-w-3xl space-y-5">
          <h1 className="text-3xl font-bold text-emerald-800">Settings</h1>
          {loading ? <p>Loading settings...</p> : (
            <form onSubmit={save} className="space-y-4 rounded border bg-white p-5">
              <label className="block text-sm">
                Business name
                <input required className="mt-1 h-10 w-full rounded border px-3" value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  Contact email
                  <input type="email" className="mt-1 h-10 w-full rounded border px-3" value={form.contactEmail ?? ""} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
                </label>
                <label className="block text-sm">
                  Contact phone
                  <input className="mt-1 h-10 w-full rounded border px-3" value={form.contactPhone ?? ""} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
                </label>
              </div>
              <label className="block text-sm">
                Address
                <textarea className="mt-1 w-full rounded border px-3 py-2" value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </label>
              <label className="block text-sm">
                Currency
                <input maxLength={3} className="mt-1 h-10 w-full rounded border px-3 uppercase" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} />
              </label>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Business logo</p>
                {form.logoData ? <img src={form.logoData} alt="Business logo preview" className="max-h-24 max-w-48 object-contain" /> : <p className="text-slate-500">No business logo uploaded.</p>}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadLogo(event.target.files?.[0])} />
                <p className="text-xs text-slate-500">PNG, JPEG, or WebP; maximum 2 MB. The saved logo stays here and can be replaced by uploading another image.</p>
              </div>
              <div className="space-y-2 text-sm">
                {([["showBusinessContact", "Show business contact"], ["showInvoiceLogo", "Show invoice logo by default"], ["showPaymentStatus", "Show payment status"]] as const).map(([key, label]) => (
                  <label key={key} className="block">
                    <input type="checkbox" className="mr-2" checked={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />
                    {label}
                  </label>
                ))}
                <p className="text-xs text-slate-500">The print dialog's Show Business Logo option starts off for each print, regardless of this saved preference.</p>
              </div>
              {user?.role === "ADMIN" && <button className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white">Save settings</button>}
              {message && <p className="text-emerald-700">{message}</p>}
              {error && <p className="text-red-600">{error}</p>}
            </form>
          )}
        </div>
      </section>
    </AppShell>
  );
}
