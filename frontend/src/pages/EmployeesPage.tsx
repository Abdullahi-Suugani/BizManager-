import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { User } from "../types/auth";
import { useAuth } from "../context/AuthContext";

type Employee = User & { emailVerified: boolean; accountStatus: "ACTIVE" | "PENDING" | "SUSPENDED"; createdAt: string };
const permissionOptions = [
  ["invoices.view", "View invoices"],
  ["invoices.create", "Create invoices"],
  ["invoices.edit", "Edit invoices"],
  ["invoices.delete", "Delete invoices"],
  ["products.view", "View products"],
  ["products.manage", "Manage products"],
  ["customers.view", "View customers"],
  ["customers.manage", "Manage customers"],
  ["inventory.view", "View inventory"],
  ["inventory.manage", "Manage inventory"],
  ["reports.view", "View reports"]
] as const;
const initialPermissions = ["invoices.view", "invoices.create", "invoices.edit", "products.view", "inventory.view", "reports.view"];

export function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [permissions, setPermissions] = useState<string[]>(initialPermissions);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadEmployees() {
    try {
      const response = await api.get<{ employees: Employee[] }>("/employees");
      setEmployees(response.data.employees);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEmployees(); }, []);

  async function createEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await api.post("/employees", { ...form, permissions });
      setForm({ name: "", email: "", password: "" });
      setPermissions(initialPermissions);
      setMessage("Employee created.");
      await loadEmployees();
    } catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to create employee."); }
  }

  async function createAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await api.post("/employees/admins", adminForm);
      setAdminForm({ name: "", email: "", password: "" });
      setMessage("Admin account created. They must change their password at first login.");
    } catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to create Admin."); }
  }

  function generateTemporaryPassword() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(18));
    const password = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    setForm((current) => ({ ...current, password }));
  }

  async function updateEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!editing) return;
    try {
      await api.patch(`/employees/${editing.id}`, { name: form.name, email: form.email, permissions, ...(form.password ? { password: form.password } : {}) });
      setEditing(null); setForm({ name: "", email: "", password: "" }); setPermissions(initialPermissions); setMessage("Employee updated."); await loadEmployees();
    } catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to update employee."); }
  }

  async function toggleStatus(employee: Employee) {
    setError(""); setMessage("");
    try {
      await api.patch(`/employees/${employee.id}`, { accountStatus: employee.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" });
      setMessage(employee.accountStatus === "SUSPENDED" ? "Employee reactivated." : "Employee deactivated.");
      await loadEmployees();
    } catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to update employee."); }
  }

  return <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">Employees</h1><p className="mt-2 text-slate-600">Create accounts as Admin. Share temporary passwords securely; employees must change them at first login.</p></div>
      {user?.role === "SUPER_ADMIN" ? <form onSubmit={createAdmin} className="grid min-w-0 gap-3 rounded-md border border-emerald-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <div className="sm:col-span-2 lg:col-span-4"><h2 className="font-bold text-emerald-800">Create Admin account</h2><p className="mt-1 text-sm text-slate-600">Only a Super Admin can create an Admin. The new user must change this password after signing in.</p></div>
        <input required minLength={2} aria-label="Admin full name" placeholder="Full name" className="h-11 min-w-0 rounded border px-3" value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} />
        <input required type="email" aria-label="Admin email" placeholder="Email" className="h-11 min-w-0 rounded border px-3" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
        <input required minLength={12} type="password" aria-label="Temporary Admin password" placeholder="Temporary password (12+ characters)" className="h-11 min-w-0 rounded border px-3" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
        <button className="min-h-11 rounded bg-emerald-700 px-3 font-semibold text-white">Create Admin</button>
      </form> : null}
      <form onSubmit={editing ? updateEmployee : createEmployee} className="grid min-w-0 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
        <div className="sm:col-span-2 xl:col-span-4"><h2 className="font-bold">{editing ? "Edit employee" : "Create employee"}</h2><p className="mt-1 text-sm text-slate-600">Select the features this employee can use. Admin and Super Admin accounts always have full business access.</p></div>
        <input required minLength={2} aria-label="Full name" placeholder="Full name" className="h-11 min-w-0 rounded border px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" aria-label="Email" placeholder="Email" className="h-11 min-w-0 rounded border px-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="relative">
          <input required={!editing} minLength={editing ? undefined : 8} type="password" aria-label={editing ? "New password (optional)" : "Temporary password"} placeholder={editing ? "New password (optional)" : "Temporary password"} className="h-11 w-full min-w-0 rounded border px-3 pr-24" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {!editing ? <button type="button" aria-label="Generate temporary password" onClick={generateTemporaryPassword} className="absolute right-2 top-1/2 min-h-11 -translate-y-1/2 px-2 text-sm font-semibold text-emerald-700">Generate</button> : null}
        </div>
        <div className="flex gap-2">
          <button className="min-h-11 flex-1 rounded bg-emerald-700 px-3 font-semibold text-white">{editing ? "Save employee" : "Create employee"}</button>
          {editing ? <button type="button" onClick={() => { setEditing(null); setForm({ name: "", email: "", password: "" }); setPermissions(initialPermissions); }} className="min-h-11 rounded border px-3 font-semibold">Cancel</button> : null}
        </div>
        <fieldset className="grid gap-2 border-t pt-3 sm:col-span-2 xl:col-span-4 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="px-1 text-sm font-semibold">Employee permissions</legend>
          {permissionOptions.map(([permission, label]) => <label key={permission} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={permissions.includes(permission)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((value) => value !== permission))} />
            {label}
          </label>)}
        </fieldset>
      </form>
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-5 text-slate-600">Loading employees...</p> : (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {employees.map((employee) => (
                <article key={employee.id} className="min-w-0 rounded border p-3">
                  <h2 className="break-words font-semibold">{employee.name}</h2>
                  <p className="break-all text-sm text-slate-600">{employee.email}</p>
                  <p className="mt-2 text-sm">Status: <span className="font-medium">{employee.accountStatus}</span></p>
                  <div className="mt-2 flex flex-wrap gap-3 border-t pt-2">
                    <button onClick={() => { setEditing(employee); setForm({ name: employee.name, email: employee.email, password: "" }); setPermissions(employee.permissions ?? []); }} className="min-h-11 font-semibold text-emerald-700">Edit</button>
                    <button onClick={() => void toggleStatus(employee)} className="min-h-11 font-semibold text-emerald-700">{employee.accountStatus === "SUSPENDED" ? "Reactivate" : "Suspend"}</button>
                  </div>
                </article>
              ))}
              {employees.length === 0 ? <p className="p-2 text-slate-600">No employees found.</p> : null}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-100"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
                <tbody>{employees.map((employee) => (
                  <tr key={employee.id} className="border-t">
                    <td className="p-3">{employee.name}</td><td className="p-3">{employee.email}</td><td className="p-3">{employee.accountStatus}</td>
                    <td className="p-3"><div className="flex gap-4">
                      <button onClick={() => { setEditing(employee); setForm({ name: employee.name, email: employee.email, password: "" }); setPermissions(employee.permissions ?? []); }} className="font-semibold text-emerald-700">Edit</button>
                      <button onClick={() => void toggleStatus(employee)} className="font-semibold text-emerald-700">{employee.accountStatus === "SUSPENDED" ? "Reactivate" : "Suspend"}</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  </section>;
}
