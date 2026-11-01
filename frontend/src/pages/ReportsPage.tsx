import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../services/api";
import { AppShell } from "../components/AppShell";

type Report = {
  transactionCount: number;
  salesTotal: number;
  byEmployee: { employeeId: string; name: string; email: string; transactionCount: number; salesTotal: number }[];
};

export function ReportsPage() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    if (from && to && from > to) {
      setLoading(false);
      setError("The end date must be on or after the start date");
      return;
    }
    try {
      const response = await api.get<Report>("/reports/sales", {
        params: { from: from || undefined, to: to || undefined }
      });
      setReport(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to load report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell currentPath={location.pathname} isMenuOpen={menuOpen} onMenuOpen={() => setMenuOpen(true)} onMenuClose={() => setMenuOpen(false)}>
      <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">Reports</h1>
            <p className="mt-1 text-slate-600">Review sales totals and employee activity.</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="grid min-w-0 gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <label className="min-w-0 text-sm">From
              <input type="date" className="mt-1 h-11 w-full min-w-0 rounded border px-2" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="min-w-0 text-sm">To
              <input type="date" className="mt-1 h-11 w-full min-w-0 rounded border px-2" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <button className="min-h-11 rounded bg-emerald-700 px-5 font-semibold text-white">Apply</button>
          </form>
          {loading ? <p>Loading report...</p> : error ? <p role="alert" className="font-semibold text-red-600">{error}</p> : report ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded border bg-white p-4 sm:p-5">
                  <p className="text-sm text-slate-500">Sales total</p>
                  <p className="mt-2 break-words text-2xl font-bold text-emerald-800 sm:text-3xl">${report.salesTotal.toFixed(2)}</p>
                </div>
                <div className="min-w-0 rounded border bg-white p-4 sm:p-5">
                  <p className="text-sm text-slate-500">Transactions</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-800 sm:text-3xl">{report.transactionCount}</p>
                </div>
              </div>
              <div className="rounded border bg-white">
                <h2 className="p-4 text-lg font-bold sm:text-xl">Sales by employee</h2>
                <div className="grid gap-3 p-3 md:hidden">
                  {report.byEmployee.map((employee) => (
                    <article key={employee.employeeId} className="min-w-0 rounded border p-3">
                      <h3 className="break-words font-semibold">{employee.name}</h3>
                      <p className="break-all text-sm text-slate-600">{employee.email}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-slate-500">Transactions</dt><dd className="font-semibold">{employee.transactionCount}</dd></div>
                        <div><dt className="text-slate-500">Sales</dt><dd className="font-semibold">${employee.salesTotal.toFixed(2)}</dd></div>
                      </dl>
                    </article>
                  ))}
                  {report.byEmployee.length === 0 ? <p className="p-2 text-slate-600">No transactions found for this period.</p> : null}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-100"><tr><th className="p-3">Employee</th><th className="p-3">Transactions</th><th className="p-3 text-right">Sales</th></tr></thead>
                    <tbody>{report.byEmployee.map((employee) => (
                      <tr key={employee.employeeId} className="border-t">
                        <td className="break-words p-3">{employee.name}</td>
                        <td className="p-3">{employee.transactionCount}</td>
                        <td className="p-3 text-right">${employee.salesTotal.toFixed(2)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {report.byEmployee.length === 0 ? <p className="p-4 text-slate-600">No transactions found for this period.</p> : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
