import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Brain, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const { login, user, shell } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && shell) navigate(`/${shell}/dashboard`, { replace: true });
  }, [user, shell, navigate]);

  if (user && shell) return <Navigate to={`/${shell}/dashboard`} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, remember);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <div className="w-full max-w-md rounded-3xl bg-white/85 backdrop-blur-xl shadow-2xl p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white grid place-items-center shadow-lg">
            <Brain size={32} />
          </div>
          <h1 className="text-3xl font-extrabold mt-4">Intelli-Talent</h1>
          <p className="text-sm text-slate-500 mt-2">Connectez-vous à votre espace RH</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {error ? <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div> : null}
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Adresse e-mail</span>
            <span className="relative block mt-2">
              <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 outline-none focus:border-blue-500" placeholder="vous@entreprise.com" />
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Mot de passe</span>
            <span className="relative block mt-2">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-12 outline-none focus:border-blue-500" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-3.5 text-slate-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            Se souvenir de moi
          </label>
          <button disabled={loading} className="w-full rounded-2xl py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-6">Comptes seed : admin@ydays.local, hr@ydays.local, manager@ydays.local, collab@ydays.local</p>
      </div>
    </div>
  );
}
