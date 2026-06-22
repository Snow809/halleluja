import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { keys, useTemplates } from "../../api/queries";
import { DocumentTemplate } from "../../api/types";

const emptyForm = { title: "", documentType: "", category: "Attestations", description: "" };

export function TemplateManagement() {
  const templates = useTemplates();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File>();
  const [editingId, setEditingId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setForm(emptyForm);
    setFile(undefined);
    setEditingId(undefined);
    setError("");
  };
  const edit = (template: DocumentTemplate) => {
    setEditingId(template.id);
    setForm({
      title: template.title,
      documentType: template.documentType,
      category: template.category,
      description: template.description ?? "",
    });
    setFile(undefined);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId && !file) return setError("Un fichier DOCX est requis.");
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.set(key, value));
      if (file) body.set("file", file);
      if (editingId) await api.patch(`/documents/templates/${editingId}`, body);
      else await api.post("/documents/templates", body);
      reset();
      await queryClient.invalidateQueries({ queryKey: keys.templates });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (template: DocumentTemplate) => {
    await api.patch(`/documents/templates/${template.id}/active`, { isActive: !template.isActive });
    await queryClient.invalidateQueries({ queryKey: keys.templates });
  };
  const remove = async (template: DocumentTemplate) => {
    if (!window.confirm(`Supprimer « ${template.title} » ?`)) return;
    await api.delete(`/documents/templates/${template.id}`);
    await queryClient.invalidateQueries({ queryKey: keys.templates });
  };

  return (
    <section className="space-y-4">
      <div><h2 className="text-2xl font-bold">Modèles demandables</h2><p className="text-sm text-slate-500">Ajoutez ou modifiez les modèles DOCX disponibles aux employés.</p></div>
      <form onSubmit={submit} className="grid gap-3 rounded-3xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2 xl:grid-cols-5">
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-800" placeholder="Titre affiché" />
        <input required value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-800" placeholder="Type de document" />
        <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-800" placeholder="Catégorie" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-800" placeholder="Description" />
        <input type="file" accept=".docx" required={!editingId} onChange={(e) => setFile(e.target.files?.[0])} className="text-sm" />
        <div className="flex gap-2 md:col-span-2 xl:col-span-5">
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Ajouter le modèle"}</button>
          {editingId ? <button type="button" onClick={reset} className="rounded-xl border px-5 py-2.5">Annuler</button> : null}
        </div>
        {error ? <p className="text-sm text-red-600 md:col-span-2 xl:col-span-5">{error}</p> : null}
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(templates.data ?? []).map((template) => (
          <article key={template.id} className="rounded-3xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex justify-between gap-3"><div><h3 className="font-bold">{template.title}</h3><p className="text-sm text-slate-500">{template.documentType} · {template.category}</p></div><span className="text-xs">{template.isActive ? "Actif" : "Inactif"}</span></div>
            {template.description ? <p className="mt-3 text-sm">{template.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => edit(template)} className="rounded-xl border px-3 py-2 text-sm">Modifier</button>
              <button onClick={() => void toggle(template)} className="rounded-xl border px-3 py-2 text-sm">{template.isActive ? "Désactiver" : "Activer"}</button>
              <button onClick={() => void remove(template)} className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">Supprimer</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
