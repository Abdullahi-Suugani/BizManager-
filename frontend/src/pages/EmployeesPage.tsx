import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { User } from "../types/auth";

type Employee = User & { emailVerified: boolean; accountStatus: "ACTIVE" | "PENDING" | "SUSPENDED"; createdAt: string };

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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

  async function toggleStatus(employee: Employee) {
    setError(""); setMessage("");
    try {
      await api.patch(`/employees/${employee.id}`, { accountStatus: employee.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" });
      setMessage(employee.accountStatus === "SUSPENDED" ? "Employee reactivated." : "Employee deactivated.");
      await loadEmployees();
    } catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to update employee."); }
  }

  return <main className="min-h-screen bg-[#f5f7f6] p-4 text-slate-950 sm:p-8">
    <section className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-3xl font-bold text-emerald-800">Employees</h1><p className="mt-2 text-slate-600">Admin-only employee account management.</p></div>
      <form onSubmit={createEmployee} className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <input required minLength={2} placeholder="Full name" className="h-11 rounded border px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="Email" className="h-11 rounded border px-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required minLength={8} type="password" placeholder="Temporary password" className="h-11 rounded border px-3" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="h-11 rounded bg-emerald-700 font-semibold text-white">Create employee</button>
      </form>
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-5 text-slate-600">Loading employees...</p> : <table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id} className="border-t"><td className="p-3">{employee.name}</td><td className="p-3">{employee.email}</td><td className="p-3">{employee.accountStatus}</td><td className="p-3"><button onClick={() => void toggleStatus(employee)} className="font-semibold text-emerald-700">{employee.accountStatus === "SUSPENDED" ? "Reactivate" : "Deactivate"}</button></td></tr>)}</tbody></table>}
      </div>
    </section>
  </main>;
}
