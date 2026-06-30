import { useState } from "react";
import { Button, HStack, Input, Select, SimpleGrid, Stack, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { Download } from "lucide-react";
import { api } from "@/api/client";
import { useAuditLogs } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { DataTable } from "@/purity/tables";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";

export function AuditLogs() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [status, setStatus] = useState("");
  const logs = useAuditLogs({ actor, action, resourceType, status });

  async function exportCsv() {
    const params = new URLSearchParams();
    if (actor) params.set("actor", actor);
    if (action) params.set("action", action);
    if (resourceType) params.set("resourceType", resourceType);
    if (status) params.set("status", status);
    const csv = await api.text(`/audit-logs/export?${params}`);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Stack spacing={5}>
      <PageHeader title="Audit" subtitle="Traçabilité des actions RH, documents, ARIA et sécurité." actions={<Button leftIcon={<Download size={16} />} onClick={exportCsv}>Exporter CSV</Button>} />
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={3}>
        <Input placeholder="Acteur" value={actor} onChange={(e) => setActor(e.target.value)} />
        <Input placeholder="Action" value={action} onChange={(e) => setAction(e.target.value)} />
        <Select placeholder="Ressource" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
          <option value="Employee">Employee</option>
          <option value="HrRequest">HrRequest</option>
          <option value="HrDocument">HrDocument</option>
          <option value="DocumentTemplate">DocumentTemplate</option>
          <option value="GeneratedDocument">GeneratedDocument</option>
          <option value="AI">AI</option>
        </Select>
        <Select placeholder="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="DENIED">DENIED</option>
        </Select>
      </SimpleGrid>
      <DataTable>
        <Thead><Tr><Th>Date</Th><Th>Acteur</Th><Th>Action</Th><Th>Ressource</Th><Th>Statut</Th></Tr></Thead>
        <Tbody>
          {(logs.data ?? []).map((log) => (
            <Tr key={log.id}>
              <Td>{new Date(log.createdAt).toLocaleString("fr-FR")}</Td>
              <Td>{log.user?.fullName ?? "Système"}</Td>
              <Td><Text fontWeight="bold">{log.action}</Text></Td>
              <Td>{log.resourceType}{log.resourceId ? <Text color="gray.400" fontSize="xs">{log.resourceId}</Text> : null}</Td>
              <Td><StatusBadge value={log.status} /></Td>
            </Tr>
          ))}
        </Tbody>
      </DataTable>
      {!logs.isLoading && !logs.data?.length ? <EmptyState title="Aucun événement d’audit" /> : null}
    </Stack>
  );
}
