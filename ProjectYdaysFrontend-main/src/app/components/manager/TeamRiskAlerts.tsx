import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

interface RiskAlert {
  id: string; level: string; title: string; detail: string; recommendation: string; factors: string[]; aiScore: number; resolvedAt?: string; followUpNote?: string;
  employee: { firstName: string; lastName: string; position?: { title: string }; department?: { name: string } };
}

export function TeamRiskAlerts() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["risk-alerts"], queryFn: () => api.get<RiskAlert[]>("/employee-risk-alerts") });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const followUp = async (alert: RiskAlert) => { await api.patch(`/employee-risk-alerts/${alert.id}/follow-up`, { note: notes[alert.id] ?? "" }); await client.invalidateQueries({ queryKey: ["risk-alerts"] }); };
  const resolve = async (alert: RiskAlert) => { await api.patch(`/employee-risk-alerts/${alert.id}/resolve`); await client.invalidateQueries({ queryKey: ["risk-alerts"] }); };
  return <div className="max-w-5xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Alertes risques & QVT</h1><div className="space-y-4">{(query.data ?? []).map((alert) => <div key={alert.id} className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border ${alert.level === "HIGH" ? "border-red-300" : "dark:border-slate-800"}`}><div className="flex justify-between"><div><h2 className="font-bold text-lg">{alert.employee.firstName} {alert.employee.lastName}</h2><p className="text-xs text-slate-500">{alert.employee.position?.title} · {alert.employee.department?.name}</p></div><div className="text-right"><b>{alert.aiScore}%</b><div className="text-xs">{alert.level}</div></div></div><h3 className="font-bold mt-5">{alert.title}</h3><p className="text-sm text-slate-600 mt-2">{alert.detail}</p><div className="flex flex-wrap gap-2 mt-3">{alert.factors.map((factor) => <span key={factor} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs">{factor}</span>)}</div><p className="text-sm mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20"><b>Recommandation :</b> {alert.recommendation}</p>{!alert.resolvedAt ? <div className="mt-4 flex flex-col sm:flex-row gap-2"><input value={notes[alert.id] ?? ""} onChange={(event) => setNotes((items) => ({ ...items, [alert.id]: event.target.value }))} className="flex-1 p-3 rounded-xl border dark:bg-slate-800" placeholder="Note de suivi" /><button onClick={() => void followUp(alert)} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Enregistrer le suivi</button><button onClick={() => void resolve(alert)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Résoudre</button></div> : <p className="mt-4 text-emerald-600 font-semibold">Résolue</p>}</div>)}</div></div>;
}
