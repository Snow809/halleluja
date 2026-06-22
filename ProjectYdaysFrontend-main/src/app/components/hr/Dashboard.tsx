import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useDashboardQuery } from "../../api/queries";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

export function HRDashboard() {
  const headcount = useDashboardQuery<{ headcount: number }>("headcount");
  const absenteeism = useDashboardQuery<{ rate: number; pendingLeaves: number }>("absenteeism");
  const onboarding = useDashboardQuery<{ averageProgress: number }>("onboarding-progress");
  const hiring = useDashboardQuery<Array<{ month: string; recrues: number }>>("hiring-data");
  const departments = useDashboardQuery<Array<{ id: string; name: string; value: number }>>("department-distribution");
  const requests = useDashboardQuery<Array<{ id: string; name: string; type: string; date: string; status: string }>>("recent-requests");
  const alerts = useDashboardQuery<Array<{ id: string; title: string; description: string; type: string }>>("hr-alerts");
  const colors = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#e11d48", "#0891b2"];
  return (
    <div className="max-w-7xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Tableau de bord RH</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[
        ["Effectif", headcount.data?.headcount ?? "—"],
        ["Demandes en attente", absenteeism.data?.pendingLeaves ?? "—"],
        ["Progression onboarding", `${onboarding.data?.averageProgress ?? 0}%`],
        ["Absentéisme", `${absenteeism.data?.rate ?? 0}%`],
      ].map(([label, value]) => <div key={String(label)} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><div className="text-3xl font-bold text-blue-600">{value}</div><div className="text-sm text-slate-500 mt-1">{label}</div></div>)}</div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Recrues par mois</h2><ChartContainer config={{ recrues: { label: "Recrues", color: "#2563eb" } }} className="h-64 w-full"><BarChart data={hiring.data ?? []}><XAxis dataKey="month" /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="recrues" fill="#2563eb" radius={[6,6,0,0]} /></BarChart></ChartContainer></div>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Répartition par département</h2><ChartContainer config={{ value: { label: "Employés", color: "#2563eb" } }} className="h-64 w-full"><PieChart><Pie data={departments.data ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>{(departments.data ?? []).map((item, index) => <Cell key={item.id} fill={colors[index % colors.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer></div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6"><div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Demandes récentes</h2><div className="space-y-3">{(requests.data ?? []).map((request) => <div key={request.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between"><div><b>{request.name}</b><div className="text-xs text-slate-500">{request.type} · {request.date}</div></div><span className="text-xs">{request.status}</span></div>)}</div></div><div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Alertes</h2><div className="space-y-3">{(alerts.data ?? []).map((alert) => <div key={alert.id} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20"><b className="text-sm">{alert.title}</b><p className="text-xs text-slate-500 mt-1">{alert.description}</p></div>)}</div></div></div>
    </div>
  );
}
