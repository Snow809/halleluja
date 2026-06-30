import { useMemo, useState } from "react";
import { Avatar, Box, Button, HStack, Input, InputGroup, InputLeftElement, Select, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useEmployees } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";
import { PageHeader } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";
import { Card, CardBody } from "@/purity";

export function EmployeeDirectory() {
  const { shell } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState("");
  const query = useEmployees({ department, status, position, role });
  const employees = useMemo(
    () => (query.data ?? []).filter((e) => `${e.firstName} ${e.lastName} ${e.position?.title ?? ""} ${e.department?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    [query.data, search],
  );

  async function exportCsv() {
    const params = new URLSearchParams();
    if (department) params.set("department", department);
    if (status) params.set("status", status);
    if (position) params.set("position", position);
    if (role) params.set("role", role);
    const csv = await api.text(`/employees/export?${params}`);
    downloadCsv(csv, "employees.csv");
  }

  return (
    <Stack spacing={5}>
      <PageHeader
        title="Annuaire employés"
        subtitle="Collaborateurs, équipes et contexte RH."
        actions={<Button leftIcon={<Download size={16} />} onClick={exportCsv}>Exporter CSV</Button>}
      />
      <Card>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} spacing={3}>
            <InputGroup>
              <InputLeftElement><Search size={18} /></InputLeftElement>
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
            <Input placeholder="Département" value={department} onChange={(e) => setDepartment(e.target.value)} />
            <Input placeholder="Poste" value={position} onChange={(e) => setPosition(e.target.value)} />
            <Select placeholder="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ONBOARDING">ONBOARDING</option>
              <option value="OFFBOARDING">OFFBOARDING</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
            <Select placeholder="Rôle compte" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="COLLABORATOR">Collaborateur</option>
              <option value="MANAGER">Manager</option>
              <option value="HR">RH</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </SimpleGrid>
        </CardBody>
      </Card>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
        {employees.map((e) => (
          <Card key={e.id} as="button" textAlign="left" onClick={() => navigate(`/${shell}/employees/${e.id}`)}>
            <CardBody>
              <HStack align="flex-start">
                <Avatar name={`${e.firstName} ${e.lastName}`} bg="brand.500" color="white" />
                <Box>
                  <Text fontWeight="900">{e.firstName} {e.lastName}</Text>
                  <Text color="gray.500" fontSize="sm">{e.position?.title ?? "Sans poste"}</Text>
                  <HStack mt={2} flexWrap="wrap"><StatusBadge value={e.department?.name ?? "Sans département"} /><StatusBadge value={e.isOnLeave ? "En congé" : e.status} /></HStack>
                </Box>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
      {!query.isLoading && !employees.length ? <EmptyState title="Aucun employé trouvé" /> : null}
    </Stack>
  );
}

function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
