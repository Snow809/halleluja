import { FormEvent, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
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
import { Archive, Download, Eye, FileText, Upload } from "lucide-react";
import { api } from "@/api/client";
import { keys, useTemplates } from "@/api/queries";
import type { DocumentPreview, DocumentTemplate, GeneratedDocument, HrDocument } from "@/api/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { PageHeader, Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity/components/StatusBadge";

export function DocumentLibrary() {
  const queryClient = useQueryClient();
  const documents = useQuery({ queryKey: ["documents"], queryFn: () => api.get<HrDocument[]>("/documents") });
  const generated = useQuery({ queryKey: ["generated-documents"], queryFn: () => api.get<GeneratedDocument[]>("/generated-documents") });
  const templates = useTemplates();
  const previewModal = useDisclosure();
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

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

  const previewDocument = async (id: string, source: "hr" | "generated") => {
    setPreviewLoadingId(`${source}-${id}`);
    try {
      const result =
        source === "hr"
          ? await api.get<DocumentPreview>(`/documents/${id}/preview`)
          : await api.get<DocumentPreview>(`/generated-documents/${id}/preview`);
      setPreview(result);
      previewModal.onOpen();
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const download = async (id: string, source: "hr" | "generated") => {
    const result =
      source === "hr"
        ? await api.get<{ url: string }>(`/documents/${id}/download`)
        : await api.get<{ url: string }>(`/generated-documents/${id}/download`);
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

  return (
    <Stack spacing={5}>
      <PageHeader title="Bibliothèque de documents" subtitle="Documents RH, modèles et aperçus anonymisés." />

      <Panel title="Importer un document">
        <SimpleGrid as="form" onSubmit={submit} columns={{ base: 1, md: 2, xl: 4 }} spacing={4} alignItems="end">
          <FormControl isRequired>
            <FormLabel>Titre</FormLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Catégorie</FormLabel>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Visibilité</FormLabel>
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="PUBLIC">Public</option>
              <option value="ROLE_RESTRICTED">RH/Admin</option>
              <option value="EMPLOYEE_PRIVATE">Employé privé</option>
            </Select>
          </FormControl>
          <HStack spacing={3} minW={0}>
            <Button as="label" variant="outline" leftIcon={<Upload size={18} />} cursor="pointer" minW="118px" flex="1" maxW="220px">
              <Text as="span" noOfLines={1}>{file?.name ?? "Fichier"}</Text>
              <Input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>
            <Button type="submit" minW="118px">Importer</Button>
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
                <Stack direction="row" mt={3}>
                  <StatusBadge value={d.status} />
                  <StatusBadge value={d.visibility} />
                </Stack>
                <HStack mt={4}>
                  {d.status === "PENDING_REVIEW" ? <Button size="sm" onClick={() => void updateDocument(d.id, "validate")}>Valider</Button> : null}
                  {d.status === "APPROVED" ? (
                    <>
                      <Tooltip label="Prévisualiser">
                        <IconButton
                          size="sm"
                          aria-label="Prévisualiser"
                          icon={previewLoadingId === key ? <Spinner size="sm" /> : <Eye size={15} />}
                          onClick={() => void previewDocument(d.id, "hr")}
                        />
                      </Tooltip>
                      <Button size="sm" minW="130px" leftIcon={<Download size={15} />} onClick={() => void download(d.id, "hr")}>Télécharger</Button>
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
                <Box flex="1">
                  <HStack>
                    <Text fontWeight="900">{doc.documentType}</Text>
                    <Badge colorScheme="blue">anonymisé pour RH</Badge>
                    <StatusBadge value={doc.status} />
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {doc.fileType} · {new Date(doc.generatedAt).toLocaleDateString("fr-FR")}
                  </Text>
                </Box>
                <IconButton
                  aria-label="Prévisualiser"
                  icon={previewLoadingId === key ? <Spinner size="sm" /> : <Eye size={18} />}
                  onClick={() => void previewDocument(doc.id, "generated")}
                />
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
          <Button as="label" variant="outline" cursor="pointer" minW="92px">
            <Text as="span" noOfLines={1}>{templateFile?.name ?? "DOCX"}</Text>
            <Input hidden type="file" accept=".docx" onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)} />
          </Button>
          <Button type="submit" isDisabled={!templateFile} minW="104px">Ajouter</Button>
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4} mt={5}>
          {(templates.data ?? []).map((t) => (
            <Box key={t.id} p={4} bg="gray.50" borderRadius="14px">
              <Stack direction="row" justify="space-between">
                <Box>
                  <Text fontWeight="900">{t.title}</Text>
                  <Text fontSize="sm" color="gray.500">{t.documentType}</Text>
                </Box>
                <StatusBadge value={t.isActive ? "ACTIVE" : "INACTIVE"} />
              </Stack>
              <Button mt={3} size="sm" variant="outline" onClick={() => void toggleTemplate(t)}>
                {t.isActive ? "Désactiver" : "Activer"}
              </Button>
            </Box>
          ))}
        </SimpleGrid>
      </Panel>
      <DocumentPreviewModal preview={preview} isOpen={previewModal.isOpen} onClose={previewModal.onClose} />
    </Stack>
  );
}
