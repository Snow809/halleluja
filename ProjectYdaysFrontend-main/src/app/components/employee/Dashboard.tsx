import { FormEvent, useState } from "react";
import { Calendar, FileText, Map, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useDashboardQuery, useMyDocuments, useOnboarding } from "../../api/queries";
import { useAuth } from "../../contexts/AuthContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const presence = useDashboardQuery<Array<{ month: string; jours: number }>>("presence-data");
  const activities = useDashboardQuery<Array<{ type: string; text: string; time: string }>>("recent-activities");
  const documents = useMyDocuments();
  const onboarding = useOnboarding();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const contact = useMutation({
    mutationFn: () => api.post("/hr-contact-requests", {
      name: user?.fullName,
      email: user?.email,
      phone: user?.employee?.phone,
      message,
    }),
    onSuccess: () => { setMessage(""); setSent(true); },
  });
  const submit = (event: FormEvent) => { event.preventDefault(); contact.mutate(); };
  const employee = user?.employee;
  if (!employee) return null;
  const documentCount = (documents.data?.hrDocs.length ?? 0) + (documents.data?.generated.length ?? 0);
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-3xl p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <p className="text-white/75">Bonjour,</p><h1 className="text-3xl font-extrabold mt-1">{user.fullName}</h1><p className="text-white/75 mt-2">{employee.position?.title} · {employee.department?.name}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Congés restants", `${employee.vacationBalanceDays} j`, Calendar],
          ["RTT restants", `${employee.rttBalanceDays} j`, Map],
          ["Documents", String(documentCount), FileText],
          ["Score présence", `${employee.presenceScore}%`, TrendingUp],
        ].map(([label, value, Icon]) => <div key={String(label)} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><Icon className="text-blue-600" /><div className="text-3xl font-bold mt-4">{value}</div><div className="text-sm text-slate-500">{label}</div></div>)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800">
          <h2 className="font-bold mb-5">Jours travaillés par mois</h2>
          <ChartContainer config={{ jours: { label: "Jours", color: "#2563eb" } }} className="h-72 w-full">
            <AreaChart data={presence.data ?? []}><CartesianGrid vertical={false} /><XAxis dataKey="month" /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey="jours" stroke="#2563eb" fill="#93c5fd" /></AreaChart>
          </ChartContainer>
        </div>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-5">Activité récente</h2><div className="space-y-4">{(activities.data ?? []).map((item, index) => <div key={`${item.time}-${index}`}><div className="text-sm font-semibold">{item.text}</div><div className="text-xs text-slate-400">{item.time}</div></div>)}</div></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold">Onboarding</h2><div className="text-4xl font-extrabold text-blue-600 mt-4">{onboarding.data?.progress ?? 0}%</div><p className="text-sm text-slate-500 mt-2">{onboarding.data ? `${onboarding.data.steps.filter((step) => step.status === "DONE").length}/${onboarding.data.steps.length} étapes terminées` : "Aucun parcours actif"}</p></div>
        <form onSubmit={submit} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold">Contacter RH</h2><textarea required value={message} onChange={(event) => setMessage(event.target.value)} className="w-full mt-4 p-3 rounded-xl border dark:bg-slate-800" rows={3} placeholder="Votre message…" /><button disabled={contact.isPending} className="mt-3 px-5 py-2.5 rounded-xl bg-blue-600 text-white">{contact.isPending ? "Envoi…" : sent ? "Envoyé ✓" : "Envoyer"}</button></form>
      </div>
    </div>
  );
}
