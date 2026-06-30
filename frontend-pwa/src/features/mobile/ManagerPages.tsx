import { Avatar, Button, HStack, Select, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/api/client";
import { keys, useEmployees, useMutationWithInvalidation, useRequests } from "@/api/queries";
import { EmptyState } from "@/components/EmptyState";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, personName } from "@/utils/format";
import type { QvtAggregateSummary } from "@/api/types";
import { useQuery } from "@tanstack/react-query";

export function ManagerHome() {
  const employees = useEmployees();
  const requests = useRequests("PENDING");
  return (
    <Stack spacing={5}>
      <SectionHeader title="Dashboard manager" subtitle="Pilotage rapide de votre périmètre." />
      <SimpleGrid columns={2} spacing={3}>
        <Metric label="Équipe" value={employees.data?.length ?? "—"} />
        <Metric label="Demandes" value={requests.data?.length ?? "—"} />
        <Metric label="Présence moy." value={`${average(employees.data?.map((e) => e.presenceScore)) ?? "—"}%`} />
        <Metric label="Performance" value={`${average(employees.data?.map((e) => e.performanceScore)) ?? "—"}%`} />
      </SimpleGrid>
      <ManagerRequests compact />
    </Stack>
  );
}

export function ManagerTeam() {
  const query = useEmployees();
  return (
    <Stack spacing={5}>
      <SectionHeader title="Mon équipe" subtitle="Vue mobile sans données sensibles." />
      <Stack spacing={3}>
        {(query.data ?? []).map((employee) => (
          <MobileCard key={employee.id}>
            <HStack>
              <Avatar name={personName(employee)} bg="brand.500" color="white" />
              <Stack spacing={0} flex="1">
                <Text fontWeight="900">{personName(employee)}</Text>
                <Text fontSize="sm" color="gray.500">{employee.position?.title ?? "Poste non renseigné"}</Text>
              </Stack>
              <StatusBadge value={employee.isOnLeave ? "En congé" : employee.status} />
            </HStack>
            <HStack mt={3} color="gray.500" fontSize="sm" justify="space-between">
              <Text>Présence {employee.presenceScore}%</Text>
              <Text>Performance {employee.performanceScore}%</Text>
            </HStack>
          </MobileCard>
        ))}
        {query.isSuccess && !query.data.length ? <EmptyState title="Aucun collaborateur" /> : null}
      </Stack>
    </Stack>
  );
}

export function ManagerRequests({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState(compact ? "PENDING" : "");
  const [comments, setComments] = useState<Record<string, string>>({});
  const query = useRequests(filter);
  const review = useMutationWithInvalidation<{ id: string; status: string; comment?: string }, unknown>(
    ({ id, status, comment }) => api.patch(`/employees/requests/${id}/status`, { status, comment }),
    [keys.requests, keys.vacations, keys.notifications],
  );
  const requests = compact ? (query.data ?? []).slice(0, 3) : query.data ?? [];

  return (
    <Stack spacing={4}>
      {!compact ? <SectionHeader title="Demandes équipe" subtitle="Approuver, refuser ou rouvrir une demande." action={<Select size="sm" w="145px" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Toutes</option><option value="PENDING">En attente</option><option value="APPROVED">Approuvées</option><option value="REJECTED">Refusées</option></Select>} /> : <Text fontWeight="900">Demandes à traiter</Text>}
      {requests.map((request) => (
        <MobileCard key={request.id}>
          <HStack justify="space-between" align="flex-start">
            <Stack spacing={1}>
              <Text fontWeight="900">{personName(request.employee)}</Text>
              <Text fontSize="sm" color="gray.500">{request.requestType} · {formatDate(request.startDate)} → {formatDate(request.endDate)}</Text>
            </Stack>
            <StatusBadge value={request.status} />
          </HStack>
          {request.status === "PENDING" ? (
            <Stack mt={3}>
              <Textarea size="sm" value={comments[request.id] ?? ""} onChange={(event) => setComments((value) => ({ ...value, [request.id]: event.target.value }))} placeholder="Commentaire optionnel" />
              <HStack>
                <Button size="sm" colorScheme="red" variant="outline" leftIcon={<X size={15} />} onClick={() => review.mutate({ id: request.id, status: "REJECTED", comment: comments[request.id] })}>Refuser</Button>
                <Button size="sm" leftIcon={<Check size={15} />} onClick={() => review.mutate({ id: request.id, status: "APPROVED", comment: comments[request.id] })}>Approuver</Button>
              </HStack>
            </Stack>
          ) : request.status === "APPROVED" ? (
            <Button mt={3} size="sm" variant="outline" leftIcon={<RotateCcw size={15} />} onClick={() => review.mutate({ id: request.id, status: "PENDING", comment: "Demande rouverte depuis le mobile" })}>Rouvrir</Button>
          ) : null}
        </MobileCard>
      ))}
      {query.isSuccess && !requests.length ? <EmptyState title="Aucune demande" /> : null}
    </Stack>
  );
}

export function ManagerQvt() {
  const query = useQuery({ queryKey: ["qvt", "manager"], queryFn: () => api.get<QvtAggregateSummary>("/qvt/manager/team-summary") });
  const data = query.data;
  return (
    <Stack spacing={5}>
      <SectionHeader title="QVT équipe" subtitle="Vue agrégée uniquement, aucun score individuel." />
      {data && !data.available ? <MobileCard><Text fontWeight="900">Données indisponibles</Text><Text color="gray.500">{data.modelStatus === "INSUFFICIENT_GROUP_SIZE" ? "Groupe trop petit pour préserver l’anonymat." : "Modèle non entraîné ou indisponible."}</Text></MobileCard> : null}
      {data?.available ? (
        <>
          <SimpleGrid columns={2} spacing={3}>
            <Metric label="Effectif agrégé" value={data.employeeCount} />
            <Metric label="Burnout moy." value={`${Math.round((data.averageBurnoutRisk ?? 0) * 100)}%`} />
            <Metric label="Désengagement" value={`${Math.round((data.averageDisengagementRisk ?? 0) * 100)}%`} />
            <Metric label="Périmètre" value="Équipe" />
          </SimpleGrid>
          <MobileCard>
            <Text fontWeight="900" mb={2}>Recommandation</Text>
            <Text color="gray.600">{data.recommendation}</Text>
          </MobileCard>
          <MobileCard>
            <Text fontWeight="900" mb={3}>Facteurs collectifs</Text>
            <Stack>
              {data.topDrivers.map((driver) => <Text key={driver.key}>{driver.label} : {driver.value.toFixed(1)} / 10</Text>)}
            </Stack>
          </MobileCard>
        </>
      ) : null}
    </Stack>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <MobileCard>
      <Text fontSize="xs" color="gray.500" fontWeight="900">{label}</Text>
      <Text fontSize="2xl" fontWeight="900">{value}</Text>
    </MobileCard>
  );
}

function average(values?: number[]) {
  const clean = values?.filter((value) => Number.isFinite(value)) ?? [];
  if (!clean.length) return null;
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}
