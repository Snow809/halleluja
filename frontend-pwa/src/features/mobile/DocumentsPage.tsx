import { Button, HStack, Stack, Text } from "@chakra-ui/react";
import { Download, Eye, FileText, Plus } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "@/api/client";
import { useMyDocuments } from "@/api/queries";
import { EmptyState } from "@/components/EmptyState";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";

async function openPreview(kind: "documents" | "generated-documents", id: string, download = false) {
  const endpoint = download ? "download" : "preview";
  const result = await api.get<{ url: string | null; previewable?: boolean }>(`/${kind}/${id}/${endpoint}`);
  if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
}

export function DocumentsPage() {
  const query = useMyDocuments();
  const hrDocs = query.data?.hrDocs ?? [];
  const generated = query.data?.generated ?? [];

  return (
    <Stack spacing={5}>
      <SectionHeader title="Mes documents" subtitle="Prévisualisez et téléchargez vos fichiers." action={<Button as={RouterLink} to="/employee/request-document" size="sm" leftIcon={<Plus size={16} />}>Demander</Button>} />
      <Stack spacing={3}>
        {generated.map((doc) => (
          <MobileCard key={doc.id}>
            <HStack justify="space-between" align="flex-start">
              <Stack spacing={1}>
                <Text fontWeight="900">{doc.documentType}</Text>
                <StatusBadge value={doc.status} />
              </Stack>
              <HStack>
                <Button size="sm" onClick={() => void openPreview("generated-documents", doc.id)} leftIcon={<Eye size={15} />}>Voir</Button>
                <Button size="sm" variant="outline" onClick={() => void openPreview("generated-documents", doc.id, true)} leftIcon={<Download size={15} />}>PDF</Button>
              </HStack>
            </HStack>
          </MobileCard>
        ))}
        {hrDocs.map((doc) => (
          <MobileCard key={doc.id}>
            <HStack justify="space-between" align="flex-start">
              <Stack spacing={1}>
                <HStack><FileText size={16} /><Text fontWeight="900">{doc.title}</Text></HStack>
                <Text fontSize="sm" color="gray.500">{doc.category} · {doc.fileType}</Text>
              </Stack>
              <Button size="sm" onClick={() => void openPreview("documents", doc.id)} leftIcon={<Eye size={15} />}>Voir</Button>
            </HStack>
          </MobileCard>
        ))}
        {query.isSuccess && !hrDocs.length && !generated.length ? <EmptyState title="Aucun document" message="Vos documents apparaîtront ici." /> : null}
      </Stack>
    </Stack>
  );
}
