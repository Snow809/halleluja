import { useState } from "react";
import { Box, Button, Select, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { Check, RotateCcw } from "lucide-react";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation, useRequests } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { StatCard } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";

export function RequestReview() {
  const [filter, setFilter] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const query = useRequests(filter || undefined);
  const review = useMutationWithInvalidation<{ id: string; status: "PENDING" | "APPROVED" | "REJECTED"; comment?: string }, unknown>(({ id, ...body }) => api.patch(`/employees/requests/${id}/status`, body), [keys.requests, keys.vacations, ["dashboard", "recent-requests"], keys.notifications]);
  const requests = query.data ?? [];
  return <Stack spacing={5}><PageHeader title="Révision des demandes" subtitle="Validez, refusez ou rouvrez les demandes." actions={<Select bg="white" w="230px" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Toutes</option><option value="PENDING">En attente</option><option value="APPROVED">Approuvées</option><option value="REJECTED">Refusées</option></Select>} /><SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}><StatCard label="En attente" value={requests.filter((r) => r.status === "PENDING").length} tone="orange" /><StatCard label="Approuvées" value={requests.filter((r) => r.status === "APPROVED").length} tone="green" /><StatCard label="Refusées" value={requests.filter((r) => r.status === "REJECTED").length} tone="red" /></SimpleGrid><Panel title="File de traitement"><Stack>{requests.map((r) => <Box key={r.id} p={4} bg="gray.50" borderRadius="14px"><Stack direction={{ base: "column", md: "row" }} justify="space-between"><Box><Text fontWeight="900">{r.employee?.firstName} {r.employee?.lastName}</Text><Text fontSize="sm" color="gray.500">{r.requestType} · {r.detail}</Text><Stack direction="row" mt={2}><StatusBadge value={r.kind} /><StatusBadge value={r.status} /></Stack></Box>{r.attachmentName ? <Button variant="outline" onClick={async () => { const result = await api.get<{ url: string }>(`/employees/requests/${r.id}/attachment`); window.open(result.url, "_blank"); }}>Justificatif</Button> : null}</Stack>{r.status === "PENDING" ? <Stack mt={3}><Textarea value={comments[r.id] ?? ""} onChange={(e) => setComments((x) => ({ ...x, [r.id]: e.target.value }))} placeholder="Commentaire..." /><Stack direction="row" justify="flex-end"><Button colorScheme="red" variant="outline" onClick={() => review.mutate({ id: r.id, status: "REJECTED", comment: comments[r.id] })}>Refuser</Button><Button leftIcon={<Check size={16} />} onClick={() => review.mutate({ id: r.id, status: "APPROVED", comment: comments[r.id] })}>Approuver</Button></Stack></Stack> : null}{r.status === "APPROVED" && r.kind === "VACATION" ? <Button mt={3} variant="outline" leftIcon={<RotateCcw size={16} />} onClick={() => review.mutate({ id: r.id, status: "PENDING", comment: "Demande rouverte pour révision" })}>Rouvrir</Button> : null}</Box>)}{query.isSuccess && !requests.length ? <EmptyState title="Aucune demande" /> : null}</Stack></Panel></Stack>;
}

