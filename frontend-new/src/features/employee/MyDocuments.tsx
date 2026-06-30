import { useMemo, useState } from "react";
import { Box, HStack, IconButton, Input, InputGroup, InputLeftElement, Stack, Text } from "@chakra-ui/react";
import { Download, FileText, Search } from "lucide-react";
import { api } from "@/api/client";
import { useMyDocuments } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { EmptyState } from "@/purity/dashboard";

export function MyDocuments() {
  const query = useMyDocuments();
  const [search, setSearch] = useState("");
  const docs = useMemo(() => [
    ...(query.data?.hrDocs ?? []).map((d) => ({ ...d, name: d.title, date: d.createdAt, source: "hr" as const })),
    ...(query.data?.generated ?? []).map((d) => ({ ...d, name: d.documentType, category: "Générés", date: d.generatedAt, source: "generated" as const })),
  ].filter((d) => d.name.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  const download = async (doc: typeof docs[number]) => {
    const result = doc.source === "hr" ? await api.get<{ url: string }>(`/documents/${doc.id}/download`) : await api.get<{ url: string }>(`/generated-documents/${doc.id}/download`);
    window.open(result.url, "_blank", "noopener,noreferrer");
  };
  return <Stack spacing={5} maxW="1100px"><PageHeader title="Mes documents" subtitle="Téléchargez les documents validés et générés." /><InputGroup><InputLeftElement><Search size={18} /></InputLeftElement><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." /></InputGroup><Panel><Stack>{docs.map((doc) => <HStack key={`${doc.source}-${doc.id}`} p={4} bg="gray.50" borderRadius="14px"><Box color="brand.500"><FileText /></Box><Box flex="1"><Text fontWeight="900">{doc.name}</Text><Text fontSize="xs" color="gray.500">{doc.category} · {new Date(doc.date).toLocaleDateString("fr-FR")}</Text></Box><IconButton aria-label="Télécharger" icon={<Download size={18} />} onClick={() => void download(doc)} /></HStack>)}{!query.isLoading && !docs.length ? <EmptyState title="Aucun document disponible" /> : null}</Stack></Panel></Stack>;
}

