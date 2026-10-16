import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export function ChangePasswordPage() {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try { await api.post("/auth/change-password", { currentPassword, newPassword }); logout(); window.location.assign("/login"); }
    catch (requestError: any) { setError(requestError.response?.data?.message ?? "Unable to change password."); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#eef3f0] px-5"><form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl"><h1 className="text-2xl font-bold">Set your password</h1><p className="mt-2 text-sm text-slate-600">Your administrator provided a temporary password. Choose a private password before continuing.</p><input required type="password" placeholder="Temporary password" className="mt-6 h-11 w-full rounded border px-3" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /><input required minLength={8} type="password" placeholder="New password" className="mt-3 h-11 w-full rounded border px-3" value={newPassword} onChange={e => setNewPassword(e.target.value)} />{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button className="mt-6 h-11 w-full rounded bg-emerald-700 font-semibold text-white">Save password</button></form></main>;
}
