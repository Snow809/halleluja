import { FormEvent, useMemo, useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Select, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { Paperclip } from "lucide-react";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation, useVacations } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";
import { PageHeader } from "@/purity/dashboard";
import { StatCard } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";

const leaveTypes = ["Congés payés", "RTT", "Congé maladie", "Congé exceptionnel", "Sans solde"];
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString("fr-FR") : "—");

export function RequestVacation() {
  const { user } = useAuth();
  const vacations = useVacations();
  const [type, setType] = useState(leaveTypes[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const mutation = useMutationWithInvalidation<FormData, unknown>((form) => api.post("/employees/me/vacations", form), [keys.vacations, ["dashboard", "recent-requests"]]);
  const durationDays = useMemo(() => !startDate || !endDate ? 0 : Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1), [endDate, startDate]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const form = new FormData();
    form.set("type", type); form.set("startDate", startDate); form.set("endDate", endDate); form.set("durationDays", String(durationDays || 1)); form.set("reason", reason);
    if (attachment) form.set("attachment", attachment);
    mutation.mutate(form);
  };
  return (
    <Stack spacing={5}>
      <PageHeader title="Demande de congés" subtitle="Posez une absence avec suivi RH." />
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={5}><StatCard label="Congés disponibles" value={`${user?.employee?.vacationBalanceDays ?? 0} j`} /><StatCard label="RTT disponibles" value={`${user?.employee?.rttBalanceDays ?? 0} j`} /><StatCard label="Durée prévue" value={durationDays ? `${durationDays} j` : "—"} tone="green" /></SimpleGrid>
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <Panel title="Nouvelle demande"><Stack as="form" onSubmit={submit} spacing={4}><FormControl><FormLabel>Type d’absence</FormLabel><Select value={type} onChange={(e) => setType(e.target.value)}>{leaveTypes.map((x) => <option key={x}>{x}</option>)}</Select></FormControl><SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}><FormControl isRequired><FormLabel>Début</FormLabel><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></FormControl><FormControl isRequired><FormLabel>Fin</FormLabel><Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></FormControl></SimpleGrid><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif..." /><Button as="label" variant="outline" leftIcon={<Paperclip size={18} />} cursor="pointer">{attachment?.name ?? "Justificatif optionnel"}<Input hidden type="file" onChange={(e) => setAttachment(e.target.files?.[0])} /></Button><Button type="submit" isLoading={mutation.isPending}>Envoyer la demande</Button></Stack></Panel>
        <Panel title="Historique"><Stack spacing={3}>{(vacations.data ?? []).map((r) => <Box key={r.id} p={4} bg="gray.50" borderRadius="14px"><Stack direction="row" justify="space-between"><Box><Text fontWeight="900">{r.requestType}</Text><Text fontSize="sm" color="gray.500">{formatDate(r.startDate)} → {formatDate(r.endDate)}</Text></Box><StatusBadge value={r.status} /></Stack></Box>)}{vacations.isSuccess && !vacations.data?.length ? <EmptyState title="Aucune demande enregistrée" /> : null}</Stack></Panel>
      </SimpleGrid>
    </Stack>
  );
}

