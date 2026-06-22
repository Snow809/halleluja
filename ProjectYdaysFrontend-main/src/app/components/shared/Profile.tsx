import { Briefcase, Calendar, Mail, MapPin, Phone, UserCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export function Profile() {
  const { user } = useAuth();
  const employee = user?.employee;
  if (!user) return null;
  if (!employee) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <UserCircle size={64} className="text-blue-600" />
        <h1 className="mt-4 text-3xl font-extrabold">{user.fullName}</h1>
        <p className="mt-2 text-slate-500">{user.email}</p>
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          Ce compte de connexion n’est pas lié à un dossier employé.
        </p>
      </div>
    );
  }
  const rows = [
    ["E-mail", employee.email, Mail],
    ["Téléphone", employee.phone ?? "Non renseigné", Phone],
    ["Localisation", employee.location ?? "Non renseignée", MapPin],
    ["Date d’arrivée", new Date(employee.hireDate).toLocaleDateString("fr-FR"), Calendar],
    ["Poste", employee.position?.title ?? "Non assigné", Briefcase],
  ] as const;
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8">
        <UserCircle size={64} />
        <h1 className="text-3xl font-extrabold mt-4">{user.fullName}</h1>
        <p className="text-white/80">{employee.position?.title ?? user.role} · {employee.department?.name ?? "Sans département"}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {rows.map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 flex gap-4">
            <Icon className="text-blue-600" />
            <div><div className="text-xs uppercase text-slate-400">{label}</div><div className="font-semibold mt-1">{value}</div></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ["Congés", `${employee.vacationBalanceDays} j`],
          ["RTT", `${employee.rttBalanceDays} j`],
          ["Présence", `${employee.presenceScore}%`],
          ["Performance", `${employee.performanceScore}%`],
        ].map(([label, value]) => <div key={label} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 text-center"><div className="text-2xl font-bold text-blue-600">{value}</div><div className="text-xs text-slate-500 mt-2">{label}</div></div>)}
      </div>
    </div>
  );
}
