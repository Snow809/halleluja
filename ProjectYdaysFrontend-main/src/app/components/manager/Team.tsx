import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useEmployees } from "../../api/queries";

export function Team() {
  const query = useEmployees();
  const [search, setSearch] = useState("");
  const employees = useMemo(() => (query.data ?? []).filter((employee) => `${employee.firstName} ${employee.lastName} ${employee.position?.title ?? ""}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  return <div className="max-w-7xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Mon équipe</h1><div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 flex gap-3"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} className="flex-1 bg-transparent outline-none" placeholder="Rechercher…" /></div><div className="rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 dark:bg-slate-800"><th className="p-4 text-left">Collaborateur</th><th>Performance</th><th>Présence</th><th>Congés</th><th>Statut</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id} className="border-t dark:border-slate-800"><td className="p-4"><b>{employee.firstName} {employee.lastName}</b><div className="text-xs text-slate-500">{employee.position?.title}</div></td><td className="text-center">{employee.performanceScore}%</td><td className="text-center">{employee.presenceScore}%</td><td className="text-center">{employee.vacationBalanceDays} j</td><td className="text-center">{employee.isOnLeave ? "En congé" : employee.status}</td></tr>)}</tbody></table></div></div>;
}
