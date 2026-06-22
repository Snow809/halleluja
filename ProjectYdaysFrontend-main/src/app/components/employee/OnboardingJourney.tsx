import { CheckCircle, Lock } from "lucide-react";
import { api } from "../../api/client";
import { keys, useMutationWithInvalidation, useOnboarding } from "../../api/queries";

export function OnboardingJourney() {
  const query = useOnboarding();
  const completion = useMutationWithInvalidation<string, unknown>(
    (id) => api.patch(`/onboarding/steps/${id}/complete`, {}),
    [keys.onboarding, ["dashboard", "onboarding-progress"]],
  );
  if (query.isLoading) return <p>Chargement du parcours…</p>;
  if (!query.data) return <div className="max-w-3xl mx-auto p-10 rounded-3xl bg-white dark:bg-slate-900 text-center">Aucun parcours onboarding actif.</div>;
  const plan = query.data;
  return (
    <div className="max-w-4xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Parcours d’onboarding</h1><div className="p-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white"><div className="flex justify-between"><b>Progression globale</b><span>{plan.progress}%</span></div><div className="h-3 bg-white/20 rounded-full mt-4 overflow-hidden"><div className="h-full bg-white" style={{ width: `${plan.progress}%` }} /></div></div><div className="space-y-4">{plan.steps.map((step) => <div key={step.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 flex items-center gap-4">{step.status === "DONE" ? <CheckCircle className="text-emerald-500" /> : step.locked ? <Lock className="text-slate-400" /> : <div className="w-6 h-6 rounded-full border-2" />}<div className="flex-1"><div className="font-bold">{step.title}</div><div className="text-xs text-slate-500">{step.phase} · échéance {new Date(step.dueDate).toLocaleDateString("fr-FR")}</div></div>{step.status !== "DONE" && !step.locked ? <button onClick={() => completion.mutate(step.id)} disabled={completion.isPending} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Terminer</button> : null}</div>)}</div></div>
  );
}
