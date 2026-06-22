import { useMemo, useState } from "react";
import { Search, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEmployees } from "../../api/queries";
import { useAuth } from "../../contexts/AuthContext";

export function EmployeeDirectory() {
  const query = useEmployees();
  const { shell } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const employees = useMemo(() => (query.data ?? []).filter((employee) => `${employee.firstName} ${employee.lastName} ${employee.position?.title ?? ""}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  return <div className="max-w-7xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Annuaire des employés</h1><div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 flex gap-3"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} className="flex-1 bg-transparent outline-none" placeholder="Rechercher…" /></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{employees.map((employee) => <button key={employee.id} onClick={() => navigate(`/${shell}/employees/${employee.id}`)} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 text-left hover:border-blue-400"><UserCircle className="text-blue-600" size={36} /><div className="font-bold text-lg mt-3">{employee.firstName} {employee.lastName}</div><div className="text-sm text-slate-500">{employee.position?.title ?? "Sans poste"} · {employee.department?.name ?? "Sans département"}</div><div className="text-xs mt-3">{employee.isOnLeave ? "En congé" : employee.status}</div></button>)}</div>{!query.isLoading && employees.length === 0 ? <p className="text-center text-slate-500">Aucun employé trouvé.</p> : null}</div>;
}
