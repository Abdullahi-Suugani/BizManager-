import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Role } from "../types/auth";

type Activity = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: Role | null;
  action: string;
  recordType: string;
  recordId: string | null;
  description: string;
  occurredAt: string;
  previousValues: unknown;
  newValues: unknown;
  success: boolean;
};

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(requestedPage = page) {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<{ logs: Activity[]; pagination: { totalPages: number } }>("/activity", {
        params: {
          search: search || undefined,
          role: role || undefined,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
          page: requestedPage,
          pageSize: 25
        }
      });
      setLogs(response.data.logs);
      setTotalPages(response.data.pagination.totalPages);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, []);

  function filter(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    void load(1);
  }

  return <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <header><h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">Activity Logs</h1><p className="mt-2 text-slate-600">Read-only record of account and business changes.</p></header>
      <form onSubmit={filter} className="grid min-w-0 gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input aria-label="Search user name" placeholder="Search user name" className="h-11 min-w-0 rounded border px-3" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Filter by role" className="h-11 min-w-0 rounded border px-3" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="">All roles</option><option value="SUPER_ADMIN">Super Admin</option><option value="ADMIN">Admin</option><option value="EMPLOYEE">Employee</option>
        </select>
        <input aria-label="Filter by action" placeholder="Action (e.g. INVOICE_CREATED)" className="h-11 min-w-0 rounded border px-3" value={action} onChange={(event) => setAction(event.target.value)} />
        <input aria-label="Start date" type="date" className="h-11 min-w-0 rounded border px-3" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input aria-label="End date" type="date" className="h-11 min-w-0 rounded border px-3" value={to} onChange={(event) => setTo(event.target.value)} />
        <button className="min-h-11 rounded bg-emerald-700 px-4 font-semibold text-white">Filter</button>
      </form>
      {error ? <p role="alert" className="font-semibold text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded border bg-white">
        {loading ? <p className="p-5 text-slate-600">Loading activity...</p> : <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-100"><tr><th className="p-3">Date and time</th><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Action</th><th className="p-3">Record</th><th className="p-3">Status</th><th className="p-3">Details</th></tr></thead>
          <tbody>{logs.map((entry) => <tr key={entry.id} className="border-t">
            <td className="whitespace-nowrap p-3">{new Date(entry.occurredAt).toLocaleString()}</td>
            <td className="p-3">{entry.actorName}</td>
            <td className="p-3">{entry.actorRole ?? "Unknown"}</td>
            <td className="p-3">{entry.action}</td>
            <td className="p-3">{entry.recordType}{entry.recordId ? ` · ${entry.recordId}` : ""}</td>
            <td className={`p-3 font-semibold ${entry.success ? "text-emerald-700" : "text-red-700"}`}>{entry.success ? "Success" : "Failed"}</td>
            <td className="p-3"><button className="min-h-10 font-semibold text-emerald-700" onClick={() => setSelected(entry)}>View details</button></td>
          </tr>)}
          {logs.length === 0 ? <tr><td className="p-5 text-slate-600" colSpan={7}>No activity matches these filters.</td></tr> : null}</tbody>
        </table>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button disabled={page <= 1} className="min-h-11 rounded border bg-white px-4 disabled:opacity-50" onClick={() => { const next = page - 1; setPage(next); void load(next); }}>Previous</button>
        <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} className="min-h-11 rounded border bg-white px-4 disabled:opacity-50" onClick={() => { const next = page + 1; setPage(next); void load(next); }}>Next</button>
      </div>
      {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Activity details">
        <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{selected.action}</h2><p className="mt-1 text-sm text-slate-600">{selected.description}</p></div><button className="min-h-10 px-2 font-semibold" onClick={() => setSelected(null)}>Close</button></div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">User</dt><dd>{selected.actorName}</dd></div><div><dt className="text-slate-500">Role</dt><dd>{selected.actorRole ?? "Unknown"}</dd></div><div><dt className="text-slate-500">Record type</dt><dd>{selected.recordType}</dd></div><div><dt className="text-slate-500">Record ID</dt><dd className="break-all">{selected.recordId ?? "—"}</dd></div><div><dt className="text-slate-500">Timestamp</dt><dd>{new Date(selected.occurredAt).toLocaleString()}</dd></div><div><dt className="text-slate-500">Result</dt><dd>{selected.success ? "Success" : "Failed"}</dd></div></dl>
          <h3 className="mt-5 font-semibold">Previous values</h3><pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(selected.previousValues, null, 2) ?? "Not recorded"}</pre>
          <h3 className="mt-4 font-semibold">New values</h3><pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(selected.newValues, null, 2) ?? "Not recorded"}</pre>
        </section>
      </div> : null}
    </div>
  </section>;
}
