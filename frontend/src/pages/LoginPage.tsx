import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LockKeyhole, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (requestError: any) {
      const status = requestError.response?.status;
      const message = requestError.response?.data?.message;
      if (status === 403) setError(message ?? "Verify your email and wait for account approval before logging in.");
      else if (status === 503) setError("The service is temporarily unavailable. Please try again shortly.");
      else if (status === 400) setError(message ?? "Enter a valid email address and password.");
      else setError(message ?? "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendVerification() {
    setError("");
    setResendMessage("");
    try {
      const response = await api.post<{ message: string }>("/auth/resend-verification", { email });
      setResendMessage(response.data.message);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "Unable to resend the verification email.");
    }
  }

  return (
    <main className="flex min-h-screen bg-[#eef3f0]">
      <section className="hidden min-h-screen w-[42%] bg-[#0d1c1e] px-14 py-12 text-white lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600">
            <ReceiptText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">BizManager</h1>
            <p className="text-sm text-emerald-100">Business System</p>
          </div>
        </div>
        <div className="mt-28 max-w-md">
          <p className="text-sm font-semibold uppercase text-emerald-300">Sales Recording</p>
          <h2 className="mt-4 text-5xl font-bold leading-tight">Fast invoices for daily business.</h2>
          <p className="mt-6 text-lg text-slate-300">
            Login to create transactions, print clean invoices, and keep every record safely in PostgreSQL.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-1 items-center justify-center px-5">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-950">Login</h2>
            <p className="mt-2 text-sm text-slate-500">Use your admin or employee account.</p>
          </div>

          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
          />

          <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />

          {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

          <button
            className="mt-7 h-11 w-full rounded-md bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
          <button className="mt-4 w-full text-sm font-semibold text-emerald-700 hover:underline" disabled={isLoading || !email} type="button" onClick={resendVerification}>
            Resend verification email
          </button>
          {resendMessage ? <p className="mt-3 text-center text-sm font-medium text-emerald-700">{resendMessage}</p> : null}
          <p className="mt-5 text-center text-sm text-slate-600"><Link className="font-semibold text-emerald-700 hover:underline" to="/register">Don't have an account? Create Account</Link></p>
        </form>
      </section>
    </main>
  );
}
