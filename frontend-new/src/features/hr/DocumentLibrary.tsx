import { FormEvent, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, Eye, FileText, RefreshCw, Upload } from "lucide-react";
import { api } from "@/api/client";
import { keys, useTemplates } from "@/api/queries";
import type { DocumentPreview, DocumentTemplate, GeneratedDocument, HrDocument, TemplateField } from "@/api/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { PageHeader, Panel } from "@/purity/dashboard";
import { Card, CardBody } from "@/purity";
import { StatusBadge } from "@/purity/components/StatusBadge";

export function DocumentLibrary() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: "", visibility: "", category: "", fileType: "", indexedStatus: "" });
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  const documents = useQuery({ queryKey: ["documents", filters], queryFn: () => api.get<HrDocument[]>(`/documents?${params}`) });
  const generated = useQuery({ queryKey: ["generated-documents"], queryFn: () => api.get<GeneratedDocument[]>("/generated-documents") });
  const templates = useTemplates();
  const previewModal = useDisclosure();
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [template, setTemplate] = useState({ title: "", documentType: "", category: "", description: "" });

  const refreshDocuments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["documents"] }),
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] }),
      queryClient.invalidateQueries({ queryKey: keys.templates }),
    ]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append("title", title);
    form.append("category", category || "Général");
    form.append("visibility", visibility);
    form.append("file", file);
    await api.post("/documents/upload", form);
    setTitle("");
    setCategory("");
    setFile(null);
    await refreshDocuments();
  };

  const updateDocument = async (id: string, action: "validate" | "archive") => {
    await api.patch(`/documents/${id}/${action}`, {});
    await refreshDocuments();
  };

  const reindexDocument = async (id: string) => {
    await api.post(`/rag/index/${id}`);
    await refreshDocuments();
  };

  const reindexAll = async () => {
    await api.post("/rag/reindex");
    await refreshDocuments();
  };

  const exportDocuments = async () => {
    const csv = await api.text(`/documents/export?${params}`);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "documents.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const previewDocument = async (id: string, source: "hr" | "generated") => {
    setPreviewLoadingId(`${source}-${id}`);
    try {
      const result = source === "hr" ? await api.get<DocumentPreview>(`/documents/${id}/preview`) : await api.get<DocumentPreview>(`/generated-documents/${id}/preview`);
      setPreview(result);
      previewModal.onOpen();
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const download = async (id: string, source: "hr" | "generated") => {
    const result = source === "hr" ? await api.get<{ url: string }>(`/documents/${id}/download`) : await api.get<{ url: string }>(`/generated-documents/${id}/download`);
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const createTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!templateFile) return;
    const form = new FormData();
    form.append("title", template.title);
    form.append("documentType", template.documentType);
    form.append("category", template.category || "Général");
    form.append("description", template.description);
    form.append("file", templateFile);
    await api.post<DocumentTemplate>("/documents/templates", form);
    setTemplate({ title: "", documentType: "", category: "", description: "" });
    setTemplateFile(null);
    await refreshDocuments();
  };

  const toggleTemplate = async (item: DocumentTemplate) => {
    await api.patch(`/documents/templates/${item.id}/active`, { isActive: !item.isActive });
    await refreshDocuments();
  };

  const saveTemplateFields = async (templateId: string, fields: TemplateField[]) => {
    await api.patch(`/documents/templates/${templateId}/fields`, { fields });
    setEditingTemplate(null);
    await refreshDocuments();
  };

  return (
    <Stack spacing={5}>
      <PageHeader
        title="Bibliothèque de documents"
        subtitle="Documents RH, modèles, indexation RAG et aperçus anonymisés."
        actions={<HStack><Button variant="outline" leftIcon={<Download size={16} />} onClick={exportDocuments}>Exporter CSV</Button><Button leftIcon={<RefreshCw size={16} />} onClick={reindexAll}>Réindexer tout</Button></HStack>}
      />

      <Panel title="Filtres documents">
        <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} spacing={3}>
          <Select placeholder="Statut" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option><option value="APPROVED">APPROVED</option><option value="ARCHIVED">ARCHIVED</option>
          </Select>
          <Select placeholder="Visibilité" value={filters.visibility} onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}>
            <option value="PUBLIC">PUBLIC</option><option value="ROLE_RESTRICTED">ROLE_RESTRICTED</option><option value="EMPLOYEE_PRIVATE">EMPLOYEE_PRIVATE</option>
          </Select>
          <Input placeholder="Catégorie" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
          <Input placeholder="Type fichier" value={filters.fileType} onChange={(e) => setFilters({ ...filters, fileType: e.target.value })} />
          <Select placeholder="Indexation" value={filters.indexedStatus} onChange={(e) => setFilters({ ...filters, indexedStatus: e.target.value })}>
            <option value="NOT_INDEXED">NOT_INDEXED</option><option value="INDEXING">INDEXING</option><option value="INDEXED">INDEXED</option><option value="FAILED">FAILED</option>
          </Select>
        </SimpleGrid>
      </Panel>

      <Panel title="Importer un document">
        <SimpleGrid as="form" onSubmit={submit} columns={{ base: 1, md: 2, xl: 4 }} spacing={4} alignItems="end">
          <FormControl isRequired><FormLabel>Titre</FormLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormControl>
          <FormControl><FormLabel>Catégorie</FormLabel><Input value={category} onChange={(e) => setCategory(e.target.value)} /></FormControl>
          <FormControl><FormLabel>Visibilité</FormLabel><Select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="PUBLIC">Public</option><option value="ROLE_RESTRICTED">RH/Admin</option><option value="EMPLOYEE_PRIVATE">Employé privé</option></Select></FormControl>
          <HStack spacing={3} minW={0}>
            <Button as="label" variant="outline" leftIcon={<Upload size={18} />} cursor="pointer" minW="150px" flex="1">
              <Text as="span" noOfLines={1}>{file?.name ?? "Choisir un fichier"}</Text>
              <Input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>
            <Button type="submit" minW="120px">Importer</Button>
          </HStack>
        </SimpleGrid>
      </Panel>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
        {(documents.data ?? []).map((d) => {
          const key = `hr-${d.id}`;
          return (
            <Card key={d.id}>
              <CardBody>
                <Text fontWeight="900" fontSize="lg">{d.title}</Text>
                <Text fontSize="sm" color="gray.500">{d.category} · {d.fileType}</Text>
                <HStack mt={3} flexWrap="wrap">
                  <StatusBadge value={d.status} /><StatusBadge value={d.visibility} /><StatusBadge value={d.indexedStatus ?? "NOT_INDEXED"} />
                </HStack>
                <Text mt={2} fontSize="xs" color={d.indexedStatus === "FAILED" ? "red.500" : "gray.500"}>
                  {d.chunkCount ?? 0} chunk(s){d.indexError ? ` · ${d.indexError}` : ""}
                </Text>
                <HStack mt={4} flexWrap="wrap">
                  {d.status === "PENDING_REVIEW" ? <Button size="sm" onClick={() => void updateDocument(d.id, "validate")}>Valider</Button> : null}
                  {d.status === "APPROVED" ? (
                    <>
                      <Tooltip label="Prévisualiser"><IconButton size="sm" aria-label="Prévisualiser" icon={previewLoadingId === key ? <Spinner size="sm" /> : <Eye size={15} />} onClick={() => void previewDocument(d.id, "hr")} /></Tooltip>
                      <Button size="sm" leftIcon={<Download size={15} />} onClick={() => void download(d.id, "hr")}>Télécharger</Button>
                      <Button size="sm" variant="outline" leftIcon={<RefreshCw size={15} />} onClick={() => void reindexDocument(d.id)}>Indexer</Button>
                    </>
                  ) : null}
                  {d.status !== "ARCHIVED" ? <Button size="sm" variant="outline" leftIcon={<Archive size={15} />} onClick={() => void updateDocument(d.id, "archive")}>Archiver</Button> : null}
                </HStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>

      <Panel title="Documents générés">
        <Stack spacing={3}>
          {(generated.data ?? []).map((doc) => {
            const key = `generated-${doc.id}`;
            return (
              <HStack key={doc.id} p={4} bg="gray.50" borderRadius="14px">
                <Box color="brand.500"><FileText /></Box>
                <Box flex="1"><HStack><Text fontWeight="900">{doc.documentType}</Text><Badge colorScheme="blue">anonymisé pour RH</Badge><StatusBadge value={doc.status} /></HStack><Text fontSize="xs" color="gray.500">{doc.fileType} · {new Date(doc.generatedAt).toLocaleDateString("fr-FR")}</Text></Box>
                <IconButton aria-label="Prévisualiser" icon={previewLoadingId === key ? <Spinner size="sm" /> : <Eye size={18} />} onClick={() => void previewDocument(doc.id, "generated")} />
                <IconButton aria-label="Télécharger" icon={<Download size={18} />} onClick={() => void download(doc.id, "generated")} />
              </HStack>
            );
          })}
        </Stack>
      </Panel>

      <Panel title="Modèles demandables">
        <SimpleGrid as="form" onSubmit={createTemplate} columns={{ base: 1, md: 2, xl: 6 }} spacing={3} alignItems="center">
          <Input placeholder="Titre" value={template.title} onChange={(e) => setTemplate({ ...template, title: e.target.value })} />
          <Input placeholder="Type" value={template.documentType} onChange={(e) => setTemplate({ ...template, documentType: e.target.value })} />
          <Input placeholder="Catégorie" value={template.category} onChange={(e) => setTemplate({ ...template, category: e.target.value })} />
          <Input placeholder="Description" value={template.description} onChange={(e) => setTemplate({ ...template, description: e.target.value })} />
          <Button as="label" variant="outline" cursor="pointer" minW="120px"><Text as="span" noOfLines={1}>{templateFile?.name ?? "DOCX"}</Text><Input hidden type="file" accept=".docx" onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)} /></Button>
          <Button type="submit" isDisabled={!templateFile} minW="120px">Ajouter</Button>
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4} mt={5}>
          {(templates.data ?? []).map((t) => (
            <Box key={t.id} p={4} bg="gray.50" borderRadius="14px">
              <HStack justify="space-between" align="flex-start">
                <Box><Text fontWeight="900">{t.title}</Text><Text fontSize="sm" color="gray.500">{t.documentType}</Text><Text fontSize="xs" color="gray.400">{t.fieldSchema?.length ?? 0} champ(s) détecté(s)</Text></Box>
                <StatusBadge value={t.isActive ? "ACTIVE" : "INACTIVE"} />
              </HStack>
              <HStack mt={3}><Button size="sm" variant="outline" onClick={() => void toggleTemplate(t)}>{t.isActive ? "Désactiver" : "Activer"}</Button><Button size="sm" onClick={() => setEditingTemplate(t)}>Mapper les champs</Button></HStack>
            </Box>
          ))}
        </SimpleGrid>
      </Panel>
      {editingTemplate ? <TemplateFieldMapper template={editingTemplate} onCancel={() => setEditingTemplate(null)} onSave={(fields) => saveTemplateFields(editingTemplate.id, fields)} /> : null}
      <DocumentPreviewModal preview={preview} isOpen={previewModal.isOpen} onClose={previewModal.onClose} />
    </Stack>
  );
}

function TemplateFieldMapper({ template, onCancel, onSave }: { template: DocumentTemplate; onCancel(): void; onSave(fields: TemplateField[]): void }) {
  const [fields, setFields] = useState<TemplateField[]>(template.fieldSchema ?? []);
  const patchField = (index: number, patch: Partial<TemplateField>) => setFields(fields.map((field, i) => i === index ? { ...field, ...patch } : field));
  return (
    <Panel title={`Mapping modèle · ${template.title}`}>
      <Stack spacing={3}>
        {fields.map((field, index) => (
          <SimpleGrid key={`${field.key}-${index}`} columns={{ base: 1, xl: 5 }} spacing={3} p={3} bg="gray.50" borderRadius="14px" alignItems="center">
            <Text fontWeight="bold">{field.label}</Text>
            <Input value={field.key} onChange={(e) => patchField(index, { key: e.target.value })} />
            <Select value={field.source} onChange={(e) => patchField(index, { source: e.target.value as TemplateField["source"] })}>
              <option value="EMPLOYEE">Employee field</option><option value="SYSTEM">Company/system</option><option value="REQUEST">Request input</option>
            </Select>
            <Checkbox isChecked={field.required} onChange={(e) => patchField(index, { required: e.target.checked })}>Obligatoire</Checkbox>
            <Checkbox isChecked={Boolean(field.sensitive)} onChange={(e) => patchField(index, { sensitive: e.target.checked })}>Sensible/anonymisé</Checkbox>
          </SimpleGrid>
        ))}
        <HStack><Button onClick={() => onSave(fields)}>Enregistrer mapping</Button><Button variant="outline" onClick={onCancel}>Annuler</Button></HStack>
      </Stack>
    </Panel>
  );
}
