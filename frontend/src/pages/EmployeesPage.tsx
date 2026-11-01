import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { User } from "../types/auth";

type Employee = User & { emailVerified: boolean; accountStatus: "ACTIVE" | "PENDING" | "SUSPENDED"; createdAt: string };

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      await api.post("/employees", form);
      setForm({ name: "", email: "", password: "" });
      setMessage("Employee created.");
      await loadEmployees();
    } catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to create employee."); }
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
      await api.patch(`/employees/${editing.id}`, { name: form.name, email: form.email, ...(form.password ? { password: form.password } : {}) });
      setEditing(null); setForm({ name: "", email: "", password: "" }); setMessage("Employee updated."); await loadEmployees();
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
      <form onSubmit={editing ? updateEmployee : createEmployee} className="grid min-w-0 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
        <input required minLength={2} aria-label="Full name" placeholder="Full name" className="h-11 min-w-0 rounded border px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" aria-label="Email" placeholder="Email" className="h-11 min-w-0 rounded border px-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="relative">
          <input required={!editing} minLength={editing ? undefined : 8} type="password" aria-label={editing ? "New password (optional)" : "Temporary password"} placeholder={editing ? "New password (optional)" : "Temporary password"} className="h-11 w-full min-w-0 rounded border px-3 pr-24" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {!editing ? <button type="button" aria-label="Generate temporary password" onClick={generateTemporaryPassword} className="absolute right-2 top-1/2 min-h-11 -translate-y-1/2 px-2 text-sm font-semibold text-emerald-700">Generate</button> : null}
        </div>
        <div className="flex gap-2">
          <button className="min-h-11 flex-1 rounded bg-emerald-700 px-3 font-semibold text-white">{editing ? "Save employee" : "Create employee"}</button>
          {editing ? <button type="button" onClick={() => { setEditing(null); setForm({ name: "", email: "", password: "" }); }} className="min-h-11 rounded border px-3 font-semibold">Cancel</button> : null}
        </div>
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
                    <button onClick={() => { setEditing(employee); setForm({ name: employee.name, email: employee.email, password: "" }); }} className="min-h-11 font-semibold text-emerald-700">Edit</button>
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
                      <button onClick={() => { setEditing(employee); setForm({ name: employee.name, email: employee.email, password: "" }); }} className="font-semibold text-emerald-700">Edit</button>
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
