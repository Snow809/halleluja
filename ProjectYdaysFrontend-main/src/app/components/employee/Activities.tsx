import { useDashboardQuery } from "../../api/queries";

export function EmployeeActivities() {
  const query = useDashboardQuery<Array<{ type: string; text: string; time: string }>>("recent-activities");
  return <div className="max-w-4xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Activité</h1><div className="rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 space-y-4">{query.isLoading ? <p>Chargement…</p> : (query.data ?? []).map((item, index) => <div key={`${item.time}-${index}`} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800"><div className="font-semibold">{item.text}</div><div className="text-xs text-slate-500 mt-1">{item.time}</div></div>)}</div></div>;
}
