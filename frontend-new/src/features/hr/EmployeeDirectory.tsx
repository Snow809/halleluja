import { useMemo, useState } from "react";
import { Avatar, Box, Input, InputGroup, InputLeftElement, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEmployees } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";
import { PageHeader } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";
import { Card, CardBody } from "@/purity";

export function EmployeeDirectory() {
  const query = useEmployees();
  const { shell } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const employees = useMemo(() => (query.data ?? []).filter((e) => `${e.firstName} ${e.lastName} ${e.position?.title ?? ""} ${e.department?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  return <Stack spacing={5}><PageHeader title="Annuaire employés" subtitle="Collaborateurs, équipes et contexte RH." actions={<InputGroup w={{ base: "100%", sm: "380px" }}><InputLeftElement><Search size={18} /></InputLeftElement><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} /></InputGroup>} /><SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>{employees.map((e) => <Card key={e.id} as="button" textAlign="left" onClick={() => navigate(`/${shell}/employees/${e.id}`)}><CardBody><Stack direction="row"><Avatar name={`${e.firstName} ${e.lastName}`} bg="brand.500" color="white" /><Box><Text fontWeight="900">{e.firstName} {e.lastName}</Text><Text color="gray.500" fontSize="sm">{e.position?.title ?? "Sans poste"}</Text><Stack direction="row" mt={2}><StatusBadge value={e.department?.name ?? "Sans département"} /><StatusBadge value={e.isOnLeave ? "En congé" : e.status} /></Stack></Box></Stack></CardBody></Card>)}</SimpleGrid>{!query.isLoading && !employees.length ? <EmptyState title="Aucun employé trouvé" /> : null}</Stack>;
}

