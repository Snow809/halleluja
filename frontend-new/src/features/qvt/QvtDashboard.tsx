import { Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Building2, HeartPulse, Users } from "lucide-react";
import { api } from "@/api/client";
import type { QvtAggregateSummary, QvtDepartmentSummary } from "@/api/types";
import { EmptyState, PageHeader, Panel, StatCard } from "@/purity/dashboard";

export function QvtDashboard({ scope }: { scope: "qvt" | "manager" }) {
  const client = useQueryClient();
  const endpoint = scope === "manager" ? "/qvt/manager/team-summary" : "/qvt/summary";
  const summary = useQuery({
    queryKey: ["qvt", scope, "summary"],
    queryFn: () => api.get<QvtAggregateSummary>(endpoint),
  });
  const departments = useQuery({
    queryKey: ["qvt", "departments", "breakdown", "dashboard"],
    queryFn: () => api.get<QvtDepartmentSummary[]>("/qvt/departments/breakdown"),
    enabled: scope === "qvt",
  });
  const recompute = useMutation({
    mutationFn: () => api.post("/qvt/predictions/recompute", {}),
    onSuccess: () => client.invalidateQueries({ queryKey: ["qvt"] }),
  });

  const data = summary.data;
  const title = scope === "manager" ? "QVT équipe" : "Dashboard QVT";
  const subtitle =
    scope === "manager"
      ? "Vue agrégée de votre équipe. Aucun collaborateur individuel n’est exposé."
      : "Vue entreprise anonymisée. Utilisez Analyses anonymes pour comparer les départements.";

  return (
    <Stack spacing={5}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          scope === "qvt" ? (
            <Button isLoading={recompute.isPending} onClick={() => recompute.mutate()}>
              Recalculer les prédictions
            </Button>
          ) : undefined
        }
      />

      {!data ? null : !data.available ? (
        <EmptyState title={data.recommendation} />
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
            <StatCard label="Périmètre" value={scope === "manager" ? "Équipe" : "Entreprise"} icon={scope === "manager" ? Users : Building2} />
            <StatCard label="Effectif agrégé" value={data.employeeCount} icon={Users} />
            <StatCard label="Burnout moyen" value={`${Math.round(data.averageBurnoutRisk ?? 0)}%`} tone="orange" icon={HeartPulse} />
            <StatCard label="Désengagement moyen" value={`${Math.round(data.averageDisengagementRisk ?? 0)}%`} tone="blue" icon={Activity} />
          </SimpleGrid>

          {scope === "qvt" ? (
            <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={5}>
              <Panel>
                <Stack spacing={3}>
                  <Text fontWeight="900" fontSize="lg">
                    Couverture par département
                  </Text>
                  <Text color="gray.600">
                    {departments.data?.filter((department) => department.available).length ?? 0} département(s) exploitables,{" "}
                    {departments.data?.filter((department) => !department.available).length ?? 0} masqué(s) par le seuil d’anonymat.
                  </Text>
                  <Button as="a" href="/qvt/analytics" variant="outline" alignSelf="start">
                    Ouvrir l’analyse par département
                  </Button>
                  {departments.isError ? (
                    <Text color="red.500" fontWeight="700">
                      Le détail par département n’est pas encore disponible côté backend. Redémarrez le backend.
                    </Text>
                  ) : null}
                </Stack>
              </Panel>
              <Panel>
                <Stack spacing={3}>
                  <Text fontWeight="900" fontSize="lg">
                    Départements les plus exposés
                  </Text>
                  {(departments.data ?? [])
                    .filter((department) => department.available)
                    .sort((a, b) => Math.max(b.averageBurnoutRisk ?? 0, b.averageDisengagementRisk ?? 0) - Math.max(a.averageBurnoutRisk ?? 0, a.averageDisengagementRisk ?? 0))
                    .slice(0, 4)
                    .map((department) => (
                      <Box key={department.departmentId} p={4} bg="gray.50" borderRadius="16px">
                        <Text fontWeight="900">{department.departmentName}</Text>
                        <Text color="gray.500">
                          Burnout {Math.round(department.averageBurnoutRisk ?? 0)}% · Désengagement{" "}
                          {Math.round(department.averageDisengagementRisk ?? 0)}%
                        </Text>
                      </Box>
                    ))}
                  {departments.isSuccess && !departments.data?.some((department) => department.available) ? (
                    <Text color="gray.500">Aucun département exploitable pour le moment.</Text>
                  ) : null}
                </Stack>
              </Panel>
              <Panel>
                <Stack spacing={3}>
                  <Text fontWeight="900" fontSize="lg">
                    Recommandation entreprise
                  </Text>
                  <Text color="gray.600">{data.recommendation}</Text>
                  <Text fontSize="sm" color="gray.400">
                    Version modèle : {data.modelVersion ?? "n/a"} · entraîné le {data.trainedAt ?? "n/a"}
                  </Text>
                </Stack>
              </Panel>
            </SimpleGrid>
          ) : (
          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
            <Panel>
              <Stack spacing={4}>
                <Text fontWeight="900" fontSize="lg">
                  Facteurs collectifs principaux
                </Text>
                {(data.topDrivers ?? []).map((driver) => (
                  <Box key={driver.key} p={4} bg="gray.50" borderRadius="16px">
                    <Text fontWeight="800">{driver.label}</Text>
                    <Text color="gray.500">Moyenne groupe : {Number(driver.value).toFixed(1)} / 10</Text>
                  </Box>
                ))}
              </Stack>
            </Panel>
            <Panel>
              <Stack spacing={3}>
                <Text fontWeight="900" fontSize="lg">
                  Recommandation modèle
                </Text>
                <Text color="gray.600">{data.recommendation}</Text>
                <Text fontSize="sm" color="gray.400">
                  Version modèle : {data.modelVersion ?? "n/a"} · entraîné le {data.trainedAt ?? "n/a"}
                </Text>
              </Stack>
            </Panel>
          </SimpleGrid>
          )}
        </>
      )}
    </Stack>
  );
}
