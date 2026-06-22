import { Bar, BarChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useDashboardQuery, useRequests } from "../../api/queries";
import { Employee } from "../../api/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

export function ManagerDashboard() {
  const team = useDashboardQuery<Employee[]>("team");
  const performance = useDashboardQuery<Array<{ subject: string; A: number }>>("team-perf");
  const output = useDashboardQuery<Array<{ day: string; tasks: number }>>("weekly-output");
  const requests = useRequests("PENDING");
  const risks = useQuery({ queryKey: ["risk-alerts"], queryFn: () => api.get<any[]>("/employee-risk-alerts") });
  const average = team.data?.length ? Math.round(team.data.reduce((sum, employee) => sum + employee.performanceScore, 0) / team.data.length) : 0;
  return <div className="max-w-7xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Vue d’ensemble manager</h1><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[["Membres équipe", team.data?.length ?? 0],["Demandes en attente", requests.data?.length ?? 0],["Score équipe", `${average}%`],["Alertes risques", risks.data?.filter((item) => !item.resolvedAt).length ?? 0]].map(([label,value]) => <div key={String(label)} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><div className="text-3xl font-bold text-blue-600">{value}</div><div className="text-sm text-slate-500">{label}</div></div>)}</div><div className="grid lg:grid-cols-2 gap-6"><div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Performance globale</h2><ChartContainer config={{ A: { label: "Score", color: "#2563eb" } }} className="h-72 w-full"><RadarChart data={performance.data ?? []}><PolarGrid /><PolarAngleAxis dataKey="subject" /><Radar dataKey="A" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.5} /><ChartTooltip content={<ChartTooltipContent />} /></RadarChart></ChartContainer></div><div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Productivité hebdomadaire</h2><ChartContainer config={{ tasks: { label: "Tâches", color: "#2563eb" } }} className="h-72 w-full"><BarChart data={output.data ?? []}><XAxis dataKey="day" /><YAxis /><Bar dataKey="tasks" fill="#2563eb" radius={[6,6,0,0]} /><ChartTooltip content={<ChartTooltipContent />} /></BarChart></ChartContainer></div></div></div>;
}
