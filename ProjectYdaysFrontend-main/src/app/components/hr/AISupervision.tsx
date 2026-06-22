import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

interface Summary {
  questionsAsked: number;
  refusals: number;
  averageLatencyMs: number;
  totalTokens: number;
  daily: Array<{ date: string; queries: number }>;
}

interface SupervisionMessage {
  id: string; role: string; content?: string; safetyStatus: string; model?: string; latencyMs?: number; totalTokens?: number; createdAt: string;
}

export function AISupervision() {
  const summary = useQuery({ queryKey: ["ai-supervision", "summary"], queryFn: () => api.get<Summary>("/chat/supervision/summary") });
  const messages = useQuery({ queryKey: ["ai-supervision", "messages"], queryFn: () => api.get<SupervisionMessage[]>("/chat/supervision/messages") });
  const data = summary.data;
  return <div className="max-w-7xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Supervision IA — ARIA</h1><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[
    ["Questions", data?.questionsAsked ?? 0], ["Refus", data?.refusals ?? 0], ["Latence moyenne", `${data?.averageLatencyMs ?? 0} ms`], ["Tokens", data?.totalTokens ?? 0],
  ].map(([label, value]) => <div key={String(label)} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><div className="text-3xl font-bold text-blue-600">{value}</div><div className="text-sm text-slate-500">{label}</div></div>)}</div><div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Activité sur 7 jours</h2><ChartContainer config={{ queries: { label: "Questions", color: "#2563eb" } }} className="h-64 w-full"><BarChart data={data?.daily ?? []}><XAxis dataKey="date" /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="queries" fill="#2563eb" radius={[6,6,0,0]} /></BarChart></ChartContainer></div><div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Journal de supervision</h2><div className="space-y-3">{(messages.data ?? []).map((message) => <div key={message.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800"><div className="flex justify-between"><b>{message.safetyStatus}</b><span className="text-xs">{new Date(message.createdAt).toLocaleString("fr-FR")}</span></div><div className="text-sm text-slate-500 mt-1">{message.content ?? `${message.model ?? "modèle"} · ${message.latencyMs ?? 0} ms · ${message.totalTokens ?? 0} tokens`}</div></div>)}</div></div></div>;
}
