import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const query = useQuery({ queryKey: ["settings"], queryFn: () => api.get<{ locale: string; settings: Record<string, unknown> }>("/users/me/settings") });
  const [locale, setLocale] = useState("fr-FR");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (query.data?.locale) setLocale(query.data.locale); }, [query.data]);
  const mutation = useMutation({
    mutationFn: () => api.patch("/users/me/settings", { locale, settings: { ...(query.data?.settings ?? {}), theme } }),
    onSuccess: () => setSaved(true),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); setSaved(false); mutation.mutate(); };
  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">Paramètres</h1>
      <div className="rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 space-y-5">
        <label className="flex justify-between items-center"><span><b>Mode sombre</b><small className="block text-slate-500">Réduit la fatigue visuelle.</small></span><input type="checkbox" checked={theme === "dark"} onChange={() => setTheme(theme === "dark" ? "light" : "dark")} /></label>
        <label className="block"><span className="font-semibold">Langue</span><select value={locale} onChange={(event) => setLocale(event.target.value)} className="mt-2 w-full border rounded-xl p-3 dark:bg-slate-800"><option value="fr-FR">Français</option><option value="en-US">English</option><option value="ar-MA">العربية</option></select></label>
      </div>
      <button disabled={mutation.isPending} className="w-full rounded-2xl bg-blue-600 text-white py-4 font-bold">{mutation.isPending ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}</button>
    </form>
  );
}
