import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Stack,
  Text,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { Download, Eye, FileText, Search } from "lucide-react";
import { api } from "@/api/client";
import { useMyDocuments } from "@/api/queries";
import type { DocumentPreview } from "@/api/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { EmptyState, PageHeader, Panel } from "@/purity/dashboard";

type UiDocument = {
  id: string;
  name: string;
  category: string;
  date: string;
  fileType: string;
  source: "hr" | "generated";
};

export function MyDocuments() {
  const query = useMyDocuments();
  const previewModal = useDisclosure();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  const docs = useMemo<UiDocument[]>(
    () =>
      [
        ...(query.data?.hrDocs ?? []).map((d) => ({
          id: d.id,
          name: d.title,
          category: d.category,
          date: d.createdAt,
          fileType: d.fileType,
          source: "hr" as const,
        })),
        ...(query.data?.generated ?? []).map((d) => ({
          id: d.id,
          name: d.documentType,
          category: "Générés",
          date: d.generatedAt,
          fileType: d.fileType,
          source: "generated" as const,
        })),
      ].filter((d) => d.name.toLowerCase().includes(search.toLowerCase())),
    [query.data, search],
  );

  const previewDocument = async (doc: UiDocument) => {
    setPreviewLoadingId(`${doc.source}-${doc.id}`);
    try {
      const result =
        doc.source === "hr"
          ? await api.get<DocumentPreview>(`/documents/${doc.id}/preview`)
          : await api.get<DocumentPreview>(`/generated-documents/${doc.id}/preview`);
      setPreview(result);
      previewModal.onOpen();
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const download = async (doc: UiDocument) => {
    const result =
      doc.source === "hr"
        ? await api.get<{ url: string }>(`/documents/${doc.id}/download`)
        : await api.get<{ url: string }>(`/generated-documents/${doc.id}/download`);
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Stack spacing={5} maxW="1100px">
      <PageHeader title="Mes documents" subtitle="Prévisualisez et téléchargez les documents validés." />
      <InputGroup>
        <InputLeftElement>
          <Search size={18} />
        </InputLeftElement>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." />
      </InputGroup>
      <Panel>
        <Stack>
          {docs.map((doc) => {
            const key = `${doc.source}-${doc.id}`;
            return (
              <HStack key={key} p={4} bg="gray.50" borderRadius="14px" spacing={4}>
                <Box color="brand.500">
                  <FileText />
                </Box>
                <Box flex="1">
                  <HStack>
                    <Text fontWeight="900">{doc.name}</Text>
                    <Badge colorScheme={doc.fileType.toUpperCase() === "PDF" ? "blue" : "gray"}>{doc.fileType}</Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {doc.category} · {new Date(doc.date).toLocaleDateString("fr-FR")}
                  </Text>
                </Box>
                <Tooltip label="Prévisualiser">
                  <IconButton
                    aria-label="Prévisualiser"
                    icon={previewLoadingId === key ? <Spinner size="sm" /> : <Eye size={18} />}
                    onClick={() => void previewDocument(doc)}
                  />
                </Tooltip>
                <Tooltip label="Télécharger">
                  <IconButton aria-label="Télécharger" icon={<Download size={18} />} onClick={() => void download(doc)} />
                </Tooltip>
              </HStack>
            );
          })}
          {!query.isLoading && !docs.length ? <EmptyState title="Aucun document disponible" /> : null}
        </Stack>
      </Panel>
      <DocumentPreviewModal preview={preview} isOpen={previewModal.isOpen} onClose={previewModal.onClose} />
    </Stack>
  );
}
