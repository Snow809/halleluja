import { useState } from "react";
import { api } from "../../api/client";
import { keys, useDocumentRequests, useMutationWithInvalidation, useTemplates } from "../../api/queries";

export function RequestDocument() {
  const templates = useTemplates();
  const requests = useDocumentRequests();
  const [templateId, setTemplateId] = useState("");
  const [note, setNote] = useState("");
  const mutation = useMutationWithInvalidation<{ templateId: string; note?: string }, unknown>(
    (body) => api.post("/employees/me/documents/requests", body),
    [["document-requests"], keys.myDocuments],
  );
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">Demande de document</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800">
          <div className="grid sm:grid-cols-2 gap-3">{(templates.data ?? []).map((template) => <button key={template.id} onClick={() => setTemplateId(template.id)} className={`p-4 rounded-2xl border text-left ${templateId === template.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}><div className="font-bold">{template.title}</div><div className="text-xs text-slate-500 mt-1">{template.description}</div></button>)}</div>
          {templates.isSuccess && templates.data.length === 0 ? <p className="text-slate-500">Aucun modèle actif.</p> : null}
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="w-full mt-4 p-3 rounded-xl border dark:bg-slate-800" placeholder="Note complémentaire" />
          <button disabled={!templateId || mutation.isPending} onClick={() => mutation.mutate({ templateId, note: note || undefined })} className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white disabled:opacity-40">{mutation.isPending ? "Envoi…" : mutation.isSuccess ? "Demande envoyée ✓" : "Envoyer la demande"}</button>
        </div>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800"><h2 className="font-bold mb-4">Demandes récentes</h2><div className="space-y-3">{(requests.data?.requests ?? []).map((request) => <div key={request.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"><b className="text-sm">{request.requestType}</b><div className="text-xs text-slate-500 mt-1">{request.status}</div></div>)}</div></div>
      </div>
    </div>
  );
}
