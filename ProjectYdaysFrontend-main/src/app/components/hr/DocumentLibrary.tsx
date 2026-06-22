import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { HrDocument } from "../../api/types";
import { TemplateManagement } from "./TemplateManagement";

export function DocumentLibrary() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get<HrDocument[]>("/documents"),
  });
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Politiques");
  const [visibility, setVisibility] = useState("ROLE_RESTRICTED");
  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.set("file", file!);
      form.set("title", title);
      form.set("category", category);
      form.set("visibility", visibility);
      if (visibility === "ROLE_RESTRICTED") form.set("allowedRoles", "ADMIN,HR");
      return api.post("/documents/upload", form);
    },
    onSuccess: async () => {
      setFile(undefined);
      setTitle("");
      await client.invalidateQueries({ queryKey: ["documents"] });
    },
  });
  const update = async (id: string, action: "validate" | "archive") => {
    await api.patch(`/documents/${id}/${action}`, {});
    await client.invalidateQueries({ queryKey: ["documents"] });
  };
  const download = async (id: string) => {
    const result = await api.get<{ url: string }>(`/documents/${id}/download`);
    window.open(result.url, "_blank", "noopener,noreferrer");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (file) upload.mutate();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section className="space-y-6">
        <h1 className="text-3xl font-extrabold">Bibliothèque de documents</h1>
        <form onSubmit={submit} className="grid gap-3 rounded-3xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-5">
          <input required value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border p-3 dark:bg-slate-800" placeholder="Titre" />
          <input required value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border p-3 dark:bg-slate-800" placeholder="Catégorie" />
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="rounded-xl border p-3 dark:bg-slate-800">
            <option value="PUBLIC">Public</option>
            <option value="ROLE_RESTRICTED">RH/Admin</option>
            <option value="EMPLOYEE_PRIVATE">Employé privé</option>
          </select>
          <input required type="file" accept=".pdf,.docx,.txt" onChange={(event) => setFile(event.target.files?.[0])} />
          <button className="rounded-xl bg-blue-600 text-white">{upload.isPending ? "Import…" : "Importer"}</button>
        </form>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(query.data ?? []).map((doc) => (
            <article key={doc.id} className="rounded-3xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="font-bold">{doc.title}</div>
              <div className="text-sm text-slate-500">{doc.category} · {doc.fileType}</div>
              <div className="mt-2 text-xs">{doc.status} · {doc.visibility}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {doc.status === "PENDING_REVIEW" ? <button onClick={() => void update(doc.id, "validate")} className="rounded-xl bg-emerald-600 px-3 py-2 text-white">Valider</button> : null}
                {doc.status === "APPROVED" ? <button onClick={() => void download(doc.id)} className="rounded-xl bg-blue-600 px-3 py-2 text-white">Télécharger</button> : null}
                {doc.status !== "ARCHIVED" ? <button onClick={() => void update(doc.id, "archive")} className="rounded-xl border px-3 py-2">Archiver</button> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
      <TemplateManagement />
    </div>
  );
}
