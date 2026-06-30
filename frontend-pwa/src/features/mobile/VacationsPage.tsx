import { Alert, AlertIcon, Button, FormControl, FormLabel, HStack, Input, Select, Stack, Text, Textarea } from "@chakra-ui/react";
import { FormEvent, useState } from "react";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation, useVacations } from "@/api/queries";
import { EmptyState } from "@/components/EmptyState";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/utils/format";

export function VacationsPage() {
  const query = useVacations();
  const [type, setType] = useState("PAID_LEAVE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutationWithInvalidation<FormData, unknown>((body) => api.post("/employees/me/vacations", body), [keys.vacations, keys.notifications]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const days = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1);
    const form = new FormData();
    form.set("type", type);
    form.set("startDate", startDate);
    form.set("endDate", endDate);
    form.set("durationDays", String(days));
    if (reason) form.set("reason", reason);
    try {
      await mutation.mutateAsync(form);
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demande impossible.");
    }
  };

  return (
    <Stack spacing={5}>
      <SectionHeader title="Mes congés" subtitle="Créer et suivre vos demandes." />
      <MobileCard as="form" onSubmit={submit}>
        <Stack spacing={3}>
          <Text fontWeight="900">Nouvelle demande</Text>
          {error ? <Alert status="error" borderRadius="16px"><AlertIcon />{error}</Alert> : null}
          <FormControl><FormLabel>Type</FormLabel><Select value={type} onChange={(event) => setType(event.target.value)}><option value="PAID_LEAVE">Congés payés</option><option value="RTT">RTT</option><option value="SICK_LEAVE">Repos / maladie</option></Select></FormControl>
          <HStack align="flex-start">
            <FormControl><FormLabel>Début</FormLabel><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></FormControl>
            <FormControl><FormLabel>Fin</FormLabel><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></FormControl>
          </HStack>
          <FormControl><FormLabel>Note</FormLabel><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optionnel" /></FormControl>
          <Button type="submit" isLoading={mutation.isPending}>Envoyer</Button>
        </Stack>
      </MobileCard>
      <Stack spacing={3}>
        {(query.data ?? []).map((request) => (
          <MobileCard key={request.id}>
            <HStack justify="space-between" align="flex-start">
              <Stack spacing={1}>
                <Text fontWeight="900">{request.requestType}</Text>
                <Text fontSize="sm" color="gray.500">{formatDate(request.startDate)} → {formatDate(request.endDate)} · {request.durationDays} j</Text>
              </Stack>
              <StatusBadge value={request.status} />
            </HStack>
          </MobileCard>
        ))}
        {query.isSuccess && !query.data.length ? <EmptyState title="Aucun congé" message="Vos demandes apparaîtront ici." /> : null}
      </Stack>
    </Stack>
  );
}
