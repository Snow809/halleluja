import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEmployee } from "../../api/queries";
import { useAuth } from "../../contexts/AuthContext";

export function EmployeeDetail() {
  const { id } = useParams();
  const { shell } = useAuth();
  const navigate = useNavigate();
  const query = useEmployee(id);
  if (query.isLoading) return <p>Chargement…</p>;
  if (!query.data) return <p>Employé introuvable.</p>;
  const employee = query.data;
  const showSalary = shell === "hr" || shell === "admin";
  return <div className="max-w-6xl mx-auto space-y-6"><button onClick={() => navigate(`/${shell}/employees`)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"><ArrowLeft size={17} /> Retour à l’annuaire</button><div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-blue-700 text-white"><h1 className="text-3xl font-extrabold">{employee.firstName} {employee.lastName}</h1><p className="text-white/75 mt-2">{employee.position?.title} · {employee.department?.name}</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[
    ["Matricule", employee.employeeNumber], ["E-mail", employee.email], ["Téléphone", employee.phone ?? "—"], ["Localisation", employee.location ?? "—"],
    ["Présence", `${employee.presenceScore}%`], ["Performance", `${employee.performanceScore}%`], ["Engagement", `${employee.engagementScore}%`], ["Congés", `${employee.vacationBalanceDays} j`],
    ...(showSalary ? [["Salaire", `${Number(employee.salary ?? 0).toLocaleString("fr-FR")} MAD`]] : []),
  ].map(([label, value]) => <div key={label} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800"><div className="text-xs uppercase text-slate-400">{label}</div><div className="font-bold mt-2">{value}</div></div>)}</div><div className="grid lg:grid-cols-2 gap-6"><div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Demandes récentes</h2>{(employee.requests ?? []).map((request) => <div key={request.id} className="p-3 border-b dark:border-slate-800"><b>{request.requestType}</b><span className="float-right text-xs">{request.status}</span></div>)}</div><div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Absences</h2>{(employee.absences ?? []).map((absence) => <div key={absence.id} className="p-3 border-b dark:border-slate-800"><b>{absence.absenceType}</b><div className="text-xs text-slate-500">{absence.startDate.slice(0,10)} → {absence.endDate.slice(0,10)}</div></div>)}</div></div></div>;
}
