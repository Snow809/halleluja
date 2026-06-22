import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { api } from "../../api/client";
import { useMyDocuments } from "../../api/queries";

export function MyDocuments() {
  const query = useMyDocuments();
  const [search, setSearch] = useState("");
  const documents = useMemo(() => [
    ...(query.data?.hrDocs ?? []).map((doc) => ({ ...doc, name: doc.title, date: doc.createdAt, source: "hr" as const })),
    ...(query.data?.generated ?? []).map((doc) => ({ ...doc, name: doc.documentType, category: "Générés", date: doc.generatedAt, source: "generated" as const })),
  ].filter((doc) => doc.name.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  const download = async (doc: typeof documents[number]) => {
    const result = doc.source === "hr"
      ? await api.get<{ url: string }>(`/documents/${doc.id}/download`)
      : await api.get<{ url: string }>(`/generated-documents/${doc.id}/download`);
    window.open(result.url, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="max-w-5xl mx-auto space-y-6"><h1 className="text-3xl font-extrabold">Mes documents</h1><div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 flex gap-3"><Search className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="flex-1 bg-transparent outline-none" placeholder="Rechercher…" /></div><div className="rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 divide-y dark:divide-slate-800">{documents.map((doc) => <div key={`${doc.source}-${doc.id}`} className="p-5 flex items-center gap-4"><FileText className="text-blue-600" /><div className="flex-1"><div className="font-bold">{doc.name}</div><div className="text-xs text-slate-500">{doc.category} · {new Date(doc.date).toLocaleDateString("fr-FR")}</div></div><button onClick={() => void download(doc)} className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Download size={18} /></button></div>)}{!query.isLoading && documents.length === 0 ? <p className="p-10 text-center text-slate-500">Aucun document disponible.</p> : null}</div></div>
  );
}
