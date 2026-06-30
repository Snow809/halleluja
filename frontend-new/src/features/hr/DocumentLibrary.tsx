import { FormEvent, useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Select, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, Upload } from "lucide-react";
import { api } from "@/api/client";
import { HrDocument, DocumentTemplate } from "@/api/types";
import { keys, useTemplates } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { Card, CardBody } from "@/purity";

export function DocumentLibrary() {
  const client = useQueryClient();
  const documents = useQuery({ queryKey: ["documents"], queryFn: () => api.get<HrDocument[]>("/documents") });
  const templates = useTemplates();
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Politiques");
  const [visibility, setVisibility] = useState("ROLE_RESTRICTED");
  const [template, setTemplate] = useState({ title: "", documentType: "", category: "Attestations", description: "" });
  const upload = useMutation({ mutationFn: () => { const form = new FormData(); form.set("file", file!); form.set("title", title); form.set("category", category); form.set("visibility", visibility); if (visibility === "ROLE_RESTRICTED") form.set("allowedRoles", "ADMIN,HR"); return api.post("/documents/upload", form); }, onSuccess: async () => { setFile(undefined); setTitle(""); await client.invalidateQueries({ queryKey: ["documents"] }); } });
  const submit = (e: FormEvent) => { e.preventDefault(); if (file) upload.mutate(); };
  const update = async (id: string, action: "validate" | "archive") => { await api.patch(`/documents/${id}/${action}`, {}); await client.invalidateQueries({ queryKey: ["documents"] }); };
  const download = async (id: string) => { const r = await api.get<{ url: string }>(`/documents/${id}/download`); window.open(r.url, "_blank", "noopener,noreferrer"); };
  const createTemplate = async (e: FormEvent) => { e.preventDefault(); const body = new FormData(); Object.entries(template).forEach(([k, v]) => body.set(k, v)); await api.post("/documents/templates", body); setTemplate({ title: "", documentType: "", category: "Attestations", description: "" }); await client.invalidateQueries({ queryKey: keys.templates }); };
  const toggleTemplate = async (t: DocumentTemplate) => { await api.patch(`/documents/templates/${t.id}/active`, { isActive: !t.isActive }); await client.invalidateQueries({ queryKey: keys.templates }); };
  return <Stack spacing={5}><PageHeader title="Bibliothèque de documents" subtitle="Documents RH, validation, visibilité et modèles demandables." /><Panel title="Importer un document"><Stack as="form" onSubmit={submit} direction={{ base: "column", xl: "row" }} spacing={4} align={{ xl: "end" }}><FormControl isRequired><FormLabel>Titre</FormLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormControl><FormControl><FormLabel>Catégorie</FormLabel><Input value={category} onChange={(e) => setCategory(e.target.value)} /></FormControl><FormControl><FormLabel>Visibilité</FormLabel><Select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="PUBLIC">Public</option><option value="ROLE_RESTRICTED">RH/Admin</option><option value="EMPLOYEE_PRIVATE">Employé privé</option></Select></FormControl><Button as="label" variant="outline" leftIcon={<Upload size={18} />} cursor="pointer">{file?.name ?? "Fichier"}<Input hidden type="file" onChange={(e) => setFile(e.target.files?.[0])} /></Button><Button type="submit" isLoading={upload.isPending}>Importer</Button></Stack></Panel><SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>{(documents.data ?? []).map((d) => <Card key={d.id}><CardBody><Text fontWeight="900" fontSize="lg">{d.title}</Text><Text fontSize="sm" color="gray.500">{d.category} · {d.fileType}</Text><Stack direction="row" mt={3}><StatusBadge value={d.status} /><StatusBadge value={d.visibility} /></Stack><Stack direction="row" mt={4}>{d.status === "PENDING_REVIEW" ? <Button size="sm" onClick={() => void update(d.id, "validate")}>Valider</Button> : null}{d.status === "APPROVED" ? <Button size="sm" leftIcon={<Download size={15} />} onClick={() => void download(d.id)}>Télécharger</Button> : null}{d.status !== "ARCHIVED" ? <Button size="sm" variant="outline" leftIcon={<Archive size={15} />} onClick={() => void update(d.id, "archive")}>Archiver</Button> : null}</Stack></CardBody></Card>)}</SimpleGrid><Panel title="Modèles demandables"><Stack as="form" onSubmit={createTemplate} direction={{ base: "column", xl: "row" }} spacing={3}><Input placeholder="Titre" value={template.title} onChange={(e) => setTemplate({ ...template, title: e.target.value })} /><Input placeholder="Type" value={template.documentType} onChange={(e) => setTemplate({ ...template, documentType: e.target.value })} /><Input placeholder="Catégorie" value={template.category} onChange={(e) => setTemplate({ ...template, category: e.target.value })} /><Input placeholder="Description" value={template.description} onChange={(e) => setTemplate({ ...template, description: e.target.value })} /><Button type="submit">Ajouter</Button></Stack><SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4} mt={5}>{(templates.data ?? []).map((t) => <Box key={t.id} p={4} bg="gray.50" borderRadius="14px"><Stack direction="row" justify="space-between"><Box><Text fontWeight="900">{t.title}</Text><Text fontSize="sm" color="gray.500">{t.documentType}</Text></Box><StatusBadge value={t.isActive ? "ACTIVE" : "INACTIVE"} /></Stack><Button mt={3} size="sm" variant="outline" onClick={() => void toggleTemplate(t)}>{t.isActive ? "Désactiver" : "Activer"}</Button></Box>)}</SimpleGrid></Panel></Stack>;
}

