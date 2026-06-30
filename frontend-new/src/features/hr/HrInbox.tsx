import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";

type ContactStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
interface ContactRequest { id: string; name: string; email: string; phone?: string; message: string; status: ContactStatus; createdAt: string }
const labels: Record<ContactStatus, string> = { OPEN: "Ouverte", IN_PROGRESS: "En cours", RESOLVED: "Résolue" };
export function HrInbox() {
  const query = useQuery({ queryKey: keys.hrContacts, queryFn: () => api.get<ContactRequest[]>("/hr-contact-requests") });
  const update = useMutationWithInvalidation(({ id, status }: { id: string; status: ContactStatus }) => api.patch(`/hr-contact-requests/${id}/status`, { status }), [keys.hrContacts, keys.notifications]);
  const requests = query.data ?? [];
  return <Stack spacing={5} maxW="1100px"><PageHeader title="Boîte de réception RH" subtitle="Demandes confidentielles envoyées par les collaborateurs." />{requests.map((r) => <Panel key={r.id}><Stack><Stack direction={{ base: "column", md: "row" }} justify="space-between"><Box><Text fontWeight="900">{r.name}</Text><Text color="gray.500" fontSize="sm">{r.email}{r.phone ? ` · ${r.phone}` : ""}</Text><Text color="gray.400" fontSize="xs">{new Date(r.createdAt).toLocaleString("fr-FR")}</Text></Box><StatusBadge value={labels[r.status]} /></Stack><Text whiteSpace="pre-wrap">{r.message}</Text><Stack direction="row">{(["OPEN", "IN_PROGRESS", "RESOLVED"] as ContactStatus[]).map((status) => <Button key={status} size="sm" variant={r.status === status ? "solid" : "outline"} isDisabled={r.status === status || update.isPending} onClick={() => update.mutate({ id: r.id, status })}>{labels[status]}</Button>)}</Stack></Stack></Panel>)}{query.isSuccess && !requests.length ? <Panel><EmptyState title="Aucune demande de contact" /></Panel> : null}</Stack>;
}

