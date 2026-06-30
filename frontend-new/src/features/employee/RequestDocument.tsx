import { useState } from "react";
import { Box, Button, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { FileText } from "lucide-react";
import { api } from "@/api/client";
import { keys, useDocumentRequests, useMutationWithInvalidation, useTemplates } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { EmptyState } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { Card, CardBody } from "@/purity";

export function RequestDocument() {
  const templates = useTemplates();
  const requests = useDocumentRequests();
  const [templateId, setTemplateId] = useState("");
  const [note, setNote] = useState("");
  const mutation = useMutationWithInvalidation<{ templateId: string; note?: string }, unknown>((body) => api.post("/employees/me/documents/requests", body), [["document-requests"], keys.myDocuments]);
  const selected = (templates.data ?? []).find((template) => template.id === templateId);
  return (
    <Stack spacing={5}>
      <PageHeader title="Demande de document" subtitle="Choisissez un modèle RH actif et suivez sa production." />
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <Panel title="Catalogue de modèles">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>{(templates.data ?? []).map((template) => <Card key={template.id} as="button" textAlign="left" borderColor={template.id === templateId ? "brand.500" : "transparent"} borderWidth="2px" onClick={() => setTemplateId(template.id)}><CardBody><Stack direction="row"><Box color="brand.500"><FileText size={22} /></Box><Box><Text fontWeight="900">{template.title}</Text><Text fontSize="sm" color="gray.500">{template.description}</Text></Box></Stack></CardBody></Card>)}</SimpleGrid>
          {templates.isSuccess && !templates.data.length ? <EmptyState title="Aucun modèle actif disponible" /> : null}
          <Stack mt={5}><Text fontSize="sm" color="gray.500">{selected ? `Sélection : ${selected.title}` : "Sélectionnez un modèle pour continuer."}</Text><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note complémentaire..." /><Button isDisabled={!templateId} isLoading={mutation.isPending} onClick={() => mutation.mutate({ templateId, note: note || undefined })}>Envoyer la demande</Button></Stack>
        </Panel>
        <Panel title="Demandes récentes"><Stack spacing={3}>{(requests.data?.requests ?? []).map((request) => <Box key={request.id} p={4} bg="gray.50" borderRadius="14px"><Text fontWeight="900">{request.requestType}</Text><Stack direction="row" justify="space-between" mt={2}><Text fontSize="xs" color="gray.500">{request.kind}</Text><StatusBadge value={request.status} /></Stack></Box>)}{requests.isSuccess && !(requests.data?.requests ?? []).length ? <EmptyState title="Aucune demande récente" /> : null}</Stack></Panel>
      </SimpleGrid>
    </Stack>
  );
}

