import { useMemo, useState } from "react";
import { Avatar, Box, HStack, Input, InputGroup, InputLeftElement, Text } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { useEmployees } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { DataTable, Tbody, Td, Th, Thead, Tr } from "@/purity/tables";
import { StatusBadge } from "@/purity";

export function Team() {
  const query = useEmployees();
  const [search, setSearch] = useState("");
  const employees = useMemo(() => (query.data ?? []).filter((e) => `${e.firstName} ${e.lastName} ${e.position?.title ?? ""}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  return <><PageHeader title="Mon équipe" subtitle="Collaborateurs rattachés à votre périmètre." actions={<InputGroup w="320px"><InputLeftElement><Search size={18} /></InputLeftElement><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." /></InputGroup>} /><DataTable><Thead><Tr><Th>Collaborateur</Th><Th textAlign="center">Performance</Th><Th textAlign="center">Présence</Th><Th textAlign="center">Congés</Th><Th textAlign="center">Statut</Th></Tr></Thead><Tbody>{employees.map((e) => <Tr key={e.id}><Td><HStack><Avatar name={`${e.firstName} ${e.lastName}`} bg="brand.500" color="white" /><Box><Text fontWeight="900">{e.firstName} {e.lastName}</Text><Text fontSize="xs" color="gray.500">{e.position?.title}</Text></Box></HStack></Td><Td textAlign="center">{e.performanceScore}%</Td><Td textAlign="center">{e.presenceScore}%</Td><Td textAlign="center">{e.vacationBalanceDays} j</Td><Td textAlign="center"><StatusBadge value={e.isOnLeave ? "En congé" : e.status} /></Td></Tr>)}</Tbody></DataTable></>;
}

