import { FormEvent, useState } from "react";
import { api } from "../../api/client";
import { keys, useMutationWithInvalidation, useVacations } from "../../api/queries";
import { useAuth } from "../../contexts/AuthContext";

export function RequestVacation() {
  const { user } = useAuth();
  const vacations = useVacations();
  const [type, setType] = useState("Congés payés");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const mutation = useMutationWithInvalidation<FormData, unknown>(
    (form) => api.post("/employees/me/vacations", form),
    [keys.vacations, ["dashboard", "recent-requests"]],
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const form = new FormData();
    form.set("type", type); form.set("startDate", startDate); form.set("endDate", endDate); form.set("durationDays", String(durationDays)); form.set("reason", reason);
    if (attachment) form.set("attachment", attachment);
    mutation.mutate(form);
  };
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">Demande de congés</h1>
      <div className="grid grid-cols-2 gap-4">{[["Congés", user?.employee?.vacationBalanceDays ?? 0], ["RTT", user?.employee?.rttBalanceDays ?? 0]].map(([label, value]) => <div key={String(label)} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><div className="text-4xl font-bold text-blue-600">{value} j</div><div className="text-sm text-slate-500">{label} restants</div></div>)}</div>
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 space-y-4">
          <select value={type} onChange={(event) => setType(event.target.value)} className="w-full p-3 rounded-xl border dark:bg-slate-800"><option>Congés payés</option><option>RTT</option><option>Congé maladie</option><option>Congé exceptionnel</option><option>Sans solde</option></select>
          <div className="grid sm:grid-cols-2 gap-3"><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="p-3 rounded-xl border dark:bg-slate-800" /><input required type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="p-3 rounded-xl border dark:bg-slate-800" /></div>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="w-full p-3 rounded-xl border dark:bg-slate-800" rows={3} placeholder="Motif (optionnel)" />
          <label className="block text-sm"><span>Justificatif (optionnel)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setAttachment(event.target.files?.[0])} className="block mt-2" /></label>
          <button disabled={mutation.isPending} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold">{mutation.isPending ? "Envoi…" : mutation.isSuccess ? "Demande envoyée ✓" : "Envoyer"}</button>
          {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
        </form>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Historique</h2><div className="space-y-3">{(vacations.data ?? []).map((request) => <div key={request.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800"><div className="flex justify-between"><b>{request.requestType}</b><span className="text-xs">{request.status}</span></div><div className="text-sm text-slate-500 mt-1">{request.startDate?.slice(0,10)} → {request.endDate?.slice(0,10)}</div></div>)}</div></div>
      </div>
    </div>
  );
}
