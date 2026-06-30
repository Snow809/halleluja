import { Alert, AlertIcon, Button, FormControl, FormLabel, Input, Select, Stack, Text, Textarea } from "@chakra-ui/react";
import { FormEvent, useMemo, useState } from "react";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation, useTemplates } from "@/api/queries";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import type { TemplateField } from "@/api/types";

function fieldInputType(field: TemplateField) {
  if (field.inputType === "date") return "date";
  if (field.inputType === "number" || field.inputType === "year") return "number";
  return "text";
}

export function RequestDocumentPage() {
  const templates = useTemplates();
  const activeTemplates = (templates.data ?? []).filter((template) => template.isActive);
  const [templateId, setTemplateId] = useState("");
  const [note, setNote] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const mutation = useMutationWithInvalidation<{ templateId: string; note?: string; formData: Record<string, string> }, unknown>(
    (body) => api.post("/employees/me/documents/requests", body),
    [keys.documentRequests, keys.notifications],
  );
  const selected = useMemo(() => activeTemplates.find((template) => template.id === templateId), [activeTemplates, templateId]);
  const fields = selected?.missingDataHints?.filter((field) => field.source === "REQUEST") ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!templateId) return;
    setError("");
    try {
      await mutation.mutateAsync({ templateId, note: note || undefined, formData });
      setTemplateId("");
      setNote("");
      setFormData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demande impossible.");
    }
  };

  return (
    <Stack spacing={5}>
      <SectionHeader title="Demande document" subtitle="Les champs sensibles sont transmis seulement pour générer le document." />
      <MobileCard as="form" onSubmit={submit}>
        <Stack spacing={4}>
          {error ? <Alert status="error" borderRadius="16px"><AlertIcon />{error}</Alert> : null}
          <FormControl isRequired>
            <FormLabel>Modèle</FormLabel>
            <Select value={templateId} onChange={(event) => { setTemplateId(event.target.value); setFormData({}); }} placeholder="Choisir un document">
              {activeTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
            </Select>
          </FormControl>
          {fields.map((field) => (
            <FormControl key={field.key} isRequired={field.required}>
              <FormLabel>{field.label.replace(/[[\]]/g, "")}{field.sensitive ? " · sensible" : ""}</FormLabel>
              <Input
                type={fieldInputType(field)}
                value={formData[field.key] ?? ""}
                onChange={(event) => setFormData((value) => ({ ...value, [field.key]: event.target.value }))}
                autoComplete="off"
              />
            </FormControl>
          ))}
          {selected && !fields.length ? <Text fontSize="sm" color="gray.500">Ce modèle peut être préparé avec les données autorisées déjà disponibles.</Text> : null}
          <FormControl>
            <FormLabel>Note</FormLabel>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optionnel" />
          </FormControl>
          <Button type="submit" isLoading={mutation.isPending} isDisabled={!templateId}>Envoyer la demande</Button>
        </Stack>
      </MobileCard>
    </Stack>
  );
}
