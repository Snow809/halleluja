import {
  Badge,
  Box,
  Button,
  HStack,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Filter, ShieldCheck, Users } from "lucide-react";
import { api } from "@/api/client";
import type { QvtAggregateSummary, QvtDepartmentSummary } from "@/api/types";
import { EmptyState, PageHeader, Panel, StatCard } from "@/purity/dashboard";
import { DataTable } from "@/purity/tables";

function riskTone(value: number | null) {
  if (value === null) return "gray";
  if (value >= 65) return "red";
  if (value >= 40) return "orange";
  return "green";
}

function RiskMeter({ label, value }: { label: string; value: number | null }) {
  const rounded = value === null ? null : Math.round(value);
  return (
    <Stack spacing={1} minW="180px">
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="800" color="gray.500">
          {label}
        </Text>
        <Text fontSize="sm" fontWeight="900" color={`${riskTone(value)}.500`}>
          {rounded === null ? "n/a" : `${rounded}%`}
        </Text>
      </HStack>
      <Progress value={rounded ?? 0} colorScheme={riskTone(value)} size="sm" borderRadius="999px" />
    </Stack>
  );
}

export function QvtAnalytics() {
  const [departmentId, setDepartmentId] = useState("ALL");
  const company = useQuery({
    queryKey: ["qvt", "company", "summary"],
    queryFn: () => api.get<QvtAggregateSummary>("/qvt/summary"),
  });
  const departments = useQuery({
    queryKey: ["qvt", "departments", "breakdown"],
    queryFn: () => api.get<QvtDepartmentSummary[]>("/qvt/departments/breakdown"),
  });

  const departmentList = departments.data ?? [];
  const selected = useMemo(
    () => departmentList.find((department) => department.departmentId === departmentId),
    [departmentId, departmentList],
  );
  const focus = departmentId === "ALL" ? company.data : selected;
  const availableDepartments = departmentList.filter((department) => department.available);
  const hiddenDepartments = departmentList.filter((department) => !department.available);

  return (
    <Stack spacing={5}>
      <PageHeader
        title="Analyses anonymes QVT"
        subtitle="Comparaison par département avec garde-fou d’anonymat : aucun groupe de moins de 3 personnes n’est détaillé."
        actions={
          <HStack>
            <Filter size={18} />
            <Select maxW="280px" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="ALL">Entreprise complète</option>
              {departmentList.map((department) => (
                <option key={department.departmentId} value={department.departmentId}>
                  {department.departmentName}
                </option>
              ))}
            </Select>
          </HStack>
        }
      />

      {departments.isLoading ? (
        <Panel>
          <Text color="gray.500">Chargement des agrégats par département…</Text>
        </Panel>
      ) : null}

      {departments.isError ? (
        <Panel>
          <Stack spacing={2}>
            <Text fontWeight="900" color="red.500">
              Impossible de charger les analyses par département.
            </Text>
            <Text color="gray.600">
              Le frontend attend l’endpoint <strong>/api/qvt/departments/breakdown</strong>. Redémarrez le backend pour charger la
              dernière version.
            </Text>
          </Stack>
        </Panel>
      ) : null}

      {!focus ? null : !focus.available ? (
        <EmptyState title={focus.recommendation} />
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
            <StatCard
              label="Périmètre analysé"
              value={departmentId === "ALL" ? "Entreprise" : selected?.departmentName ?? "Département"}
              icon={Building2}
            />
            <StatCard label="Effectif agrégé" value={focus.employeeCount} icon={Users} />
            <StatCard label="Burnout moyen" value={`${Math.round(focus.averageBurnoutRisk ?? 0)}%`} tone="orange" />
            <StatCard label="Désengagement moyen" value={`${Math.round(focus.averageDisengagementRisk ?? 0)}%`} tone="blue" />
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
            <Panel title="Lecture du périmètre sélectionné">
              <Stack spacing={4}>
                <RiskMeter label="Burnout collectif" value={focus.averageBurnoutRisk} />
                <RiskMeter label="Désengagement collectif" value={focus.averageDisengagementRisk} />
                <Box p={4} bg="gray.50" borderRadius="16px">
                  <Text fontWeight="900" mb={2}>
                    Recommandation
                  </Text>
                  <Text color="gray.600">{focus.recommendation}</Text>
                </Box>
              </Stack>
            </Panel>

            <Panel title="Facteurs agrégés">
              <Stack spacing={3}>
                {(focus.topDrivers ?? []).map((driver) => (
                  <Box key={driver.key} p={4} bg="gray.50" borderRadius="16px">
                    <Text fontWeight="900">{driver.label}</Text>
                    <Text color="gray.500">Moyenne : {Number(driver.value).toFixed(1)} / 10</Text>
                  </Box>
                ))}
              </Stack>
            </Panel>
          </SimpleGrid>
        </>
      )}

      <DataTable title="Comparaison anonymisée par département">
        <Thead>
          <Tr>
            <Th>Département</Th>
            <Th>Effectif</Th>
            <Th>Burnout</Th>
            <Th>Désengagement</Th>
            <Th>Statut confidentialité</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {departmentList.map((department) => (
            <Tr key={department.departmentId}>
              <Td fontWeight="900">{department.departmentName}</Td>
              <Td>{department.employeeCount}</Td>
              <Td>
                <RiskMeter label="Burnout" value={department.averageBurnoutRisk} />
              </Td>
              <Td>
                <RiskMeter label="Désengagement" value={department.averageDisengagementRisk} />
              </Td>
              <Td>
                <Badge colorScheme={department.available ? "green" : "orange"} borderRadius="999px" px={3} py={1}>
                  {department.available ? "Anonyme exploitable" : "Groupe trop petit"}
                </Badge>
              </Td>
              <Td>
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={!department.available}
                  onClick={() => setDepartmentId(department.departmentId)}
                >
                  Voir l’agrégat
                </Button>
              </Td>
            </Tr>
          ))}
          {departments.isSuccess && departmentList.length === 0 ? (
            <Tr>
              <Td colSpan={6}>
                <EmptyState title="Aucun département QVT disponible. Vérifiez le seed ou redémarrez le backend." />
              </Td>
            </Tr>
          ) : null}
        </Tbody>
      </DataTable>

      <Panel>
        <HStack align="start" spacing={3}>
          <Box color="brand.500" mt={1}>
            <ShieldCheck size={20} />
          </Box>
          <Stack spacing={1}>
            <Text fontWeight="900">Protection de l’anonymat</Text>
            <Text color="gray.600">
              Cette page ne retourne jamais de nom, d’identifiant employé, de score individuel ou de facteur individuel. Les départements
              avec moins de 3 collaborateurs sont masqués.
            </Text>
            <Text fontSize="sm" color="gray.400">
              Départements masqués actuellement : {hiddenDepartments.length}. Départements exploitables : {availableDepartments.length}.
            </Text>
          </Stack>
        </HStack>
      </Panel>
    </Stack>
  );
}
