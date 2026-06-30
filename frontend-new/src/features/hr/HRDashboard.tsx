import { Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { Bot, CalendarDays, TrendingUp, Users } from "lucide-react";
import { useDashboardQuery } from "@/api/queries";
import { BlueBarChart, BlueDonutChart } from "@/purity/charts";
import { EmptyState, PageHeader, Panel, SalesOverview, StatCard } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";

export function HRDashboard() {
  const headcount = useDashboardQuery<{ headcount: number }>("headcount");
  const absenteeism = useDashboardQuery<{ rate: number; pendingLeaves: number }>("absenteeism");
  const onboarding = useDashboardQuery<{ averageProgress: number }>("onboarding-progress");
  const hiring = useDashboardQuery<Array<{ month: string; recrues: number }>>("hiring-data");
  const departments = useDashboardQuery<Array<{ id: string; name: string; value: number }>>("department-distribution");
  const requests = useDashboardQuery<Array<{ id: string; name: string; type: string; date: string; status: string }>>("recent-requests");
  const hiringData = hiring.data ?? [];
  const departmentData = departments.data ?? [];

  return (
    <Stack spacing={5}>
      <PageHeader
        title="Dashboard RH"
        subtitle="Pilotage des effectifs, demandes et alertes."
        actions={<Button as={RouterLink} to="/assistant" leftIcon={<Bot size={18} />}>Demander à ARIA</Button>}
      />
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
        <StatCard label="Effectif" value={headcount.data?.headcount ?? "—"} icon={Users} />
        <StatCard label="Demandes congés" value={absenteeism.data?.pendingLeaves ?? "—"} icon={CalendarDays} />
        <StatCard label="Onboarding moyen" value={`${onboarding.data?.averageProgress ?? 0}%`} tone="green" icon={TrendingUp} />
        <StatCard label="Absentéisme" value={`${absenteeism.data?.rate ?? 0}%`} tone="orange" />
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <SalesOverview
          title="Recrues par mois"
          subtitle="Suivi des nouvelles arrivées"
          chart={<BlueBarChart labels={hiringData.map((item) => item.month)} data={hiringData.map((item) => item.recrues)} name="Recrues" />}
        />
        <SalesOverview
          title="Répartition département"
          subtitle="Distribution active des collaborateurs"
          chart={<BlueDonutChart labels={departmentData.map((item) => item.name)} data={departmentData.map((item) => item.value)} />}
        />
      </SimpleGrid>
      <Panel title="Demandes récentes">
        <Stack>
          {(requests.data ?? []).map((request) => (
            <Box key={request.id} p={4} bg="gray.50" borderRadius="14px">
              <Stack direction="row" justify="space-between">
                <Box>
                  <Text fontWeight="900">{request.name}</Text>
                  <Text fontSize="sm" color="gray.500">{request.type} · {request.date}</Text>
                </Box>
                <StatusBadge value={request.status} />
              </Stack>
            </Box>
          ))}
          {requests.isSuccess && !requests.data?.length ? <EmptyState title="Aucune demande récente" /> : null}
        </Stack>
      </Panel>
    </Stack>
  );
}
