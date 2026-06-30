import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { FileText } from "lucide-react";
import { api } from "@/api/client";
import { keys, useDocumentRequests, useMutationWithInvalidation, useTemplates } from "@/api/queries";
import { PageHeader, Panel, EmptyState } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { Card, CardBody } from "@/purity";

type DocumentRequestPayload = {
  templateId: string;
  note?: string;
  formData?: Record<string, string>;
};

export function RequestDocument() {
  const templates = useTemplates();
  const requests = useDocumentRequests();
  const [templateId, setTemplateId] = useState("");
  const [note, setNote] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});

  const mutation = useMutationWithInvalidation<DocumentRequestPayload, unknown>(
    (body) => api.post("/employees/me/documents/requests", body),
    [["document-requests"], keys.myDocuments],
  );

  const selected = (templates.data ?? []).find((template) => template.id === templateId);
  const fields = selected?.missingDataHints ?? [];
  const canSubmit = Boolean(templateId) && fields.every((field) => !field.required || formData[field.key]?.trim());

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    setFormData({});
  };

  const updateField = (key: string, value: string) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  return (
    <Stack spacing={5}>
      <PageHeader title="Demande de document" subtitle="Choisissez un modèle RH actif et suivez sa production." />
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <Panel title="Catalogue de modèles">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {(templates.data ?? []).map((template) => (
              <Card
                key={template.id}
                as="button"
                textAlign="left"
                borderColor={template.id === templateId ? "brand.500" : "transparent"}
                borderWidth="2px"
                onClick={() => selectTemplate(template.id)}
              >
                <CardBody>
                  <Stack direction="row">
                    <Box color="brand.500">
                      <FileText size={22} />
                    </Box>
                    <Box>
                      <Text fontWeight="900">{template.title}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {template.description}
                      </Text>
                    </Box>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {templates.isSuccess && !templates.data.length ? <EmptyState title="Aucun modèle actif disponible" /> : null}

          <Stack mt={5} spacing={4}>
            <Text fontSize="sm" color="gray.500">
              {selected ? `Sélection : ${selected.title}` : "Sélectionnez un modèle pour continuer."}
            </Text>

            {selected && fields.length > 0 ? (
              <Stack bg="gray.50" borderRadius="16px" p={4} spacing={3}>
                <Text fontWeight="900">Informations nécessaires</Text>
                {fields.map((field) => (
                  <FormControl key={field.key} isRequired={field.required}>
                    <FormLabel>{field.label.replace(/[[\]]/g, "")}</FormLabel>
                    <Input
                      type={field.inputType === "number" ? "number" : field.inputType === "date" ? "date" : "text"}
                      value={formData[field.key] ?? ""}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      placeholder={field.inputType === "year" ? "2026" : undefined}
                    />
                  </FormControl>
                ))}
              </Stack>
            ) : null}

            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note complémentaire..."
            />
            <Button
              isDisabled={!canSubmit}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate({ templateId, note: note || undefined, formData })}
            >
              Envoyer la demande
            </Button>
          </Stack>
        </Panel>

        <Panel title="Demandes récentes">
          <Stack spacing={3}>
            {(requests.data?.requests ?? []).map((request) => (
              <Box key={request.id} p={4} bg="gray.50" borderRadius="14px">
                <Text fontWeight="900">{request.requestType}</Text>
                <Stack direction="row" justify="space-between" mt={2}>
                  <Text fontSize="xs" color="gray.500">
                    {request.kind}
                  </Text>
                  <StatusBadge value={request.status} />
                </Stack>
              </Box>
            ))}
            {requests.isSuccess && !(requests.data?.requests ?? []).length ? (
              <EmptyState title="Aucune demande récente" />
            ) : null}
          </Stack>
        </Panel>
      </SimpleGrid>
    </Stack>
  );
}
