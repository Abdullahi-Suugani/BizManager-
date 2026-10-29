import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export function ChangePasswordPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      logout();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been changed. Sign in again with your new password.");
    } catch (requestError: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(requestError)
          ? requestError.response?.data?.message ?? "Unable to change your password. Please try again."
          : "Unable to change your password. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f0] px-5">
        <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold">Password changed</h1>
          <p role="status" className="mt-3 text-sm text-emerald-700">{success}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-6 h-11 w-full rounded bg-emerald-700 font-semibold text-white"
          >
            Go to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3f0] px-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Change password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your current password and choose a new password.</p>
        <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          required
          autoComplete="current-password"
          type="password"
          className="mt-2 h-11 w-full rounded border px-3"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="new-password">New password</label>
        <input
          id="new-password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          type="password"
          className="mt-2 h-11 w-full rounded border px-3"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">Use 12–128 characters, including uppercase and lowercase letters, a number, and a symbol.</p>
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          type="password"
          className="mt-2 h-11 w-full rounded border px-3"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          disabled={isLoading}
          className="mt-6 h-11 w-full rounded bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Changing password..." : "Change password"}
        </button>
      </form>
    </main>
  );
}
