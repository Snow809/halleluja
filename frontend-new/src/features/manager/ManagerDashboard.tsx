import { Button, SimpleGrid, Stack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { AlertTriangle, Bot, ClipboardList, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useDashboardQuery, useRequests } from "@/api/queries";
import { Employee } from "@/api/types";
import { BlueBarChart, BlueRadarChart } from "@/purity/charts";
import { PageHeader, SalesOverview, StatCard } from "@/purity/dashboard";

export function ManagerDashboard() {
  const team = useDashboardQuery<Employee[]>("team");
  const performance = useDashboardQuery<Array<{ subject: string; A: number }>>("team-perf");
  const output = useDashboardQuery<Array<{ day: string; tasks: number }>>("weekly-output");
  const requests = useRequests("PENDING");
  const risks = useQuery({ queryKey: ["risk-alerts"], queryFn: () => api.get<any[]>("/employee-risk-alerts") });
  const avg = team.data?.length ? Math.round(team.data.reduce((sum, employee) => sum + employee.performanceScore, 0) / team.data.length) : 0;
  const openRisks = risks.data?.filter((item) => !item.resolvedAt).length ?? 0;
  const performanceData = performance.data ?? [];
  const outputData = output.data ?? [];

  return (
    <Stack spacing={5}>
      <PageHeader
        title="Dashboard manager"
        subtitle="Équipe, demandes et signaux faibles."
        actions={<Button as={RouterLink} to="/assistant" leftIcon={<Bot size={18} />}>Conseil ARIA</Button>}
      />
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
        <StatCard label="Membres équipe" value={team.data?.length ?? 0} icon={Users} />
        <StatCard label="Demandes en attente" value={requests.data?.length ?? 0} icon={ClipboardList} />
        <StatCard label="Score équipe" value={`${avg}%`} tone="green" icon={TrendingUp} />
        <StatCard label="Alertes risques" value={openRisks} tone={openRisks ? "orange" : "blue"} icon={AlertTriangle} />
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <SalesOverview
          title="Performance globale"
          subtitle="Radar consolidé de l'équipe"
          chart={<BlueRadarChart labels={performanceData.map((item) => item.subject)} data={performanceData.map((item) => item.A)} name="Performance" />}
        />
        <SalesOverview
          title="Production hebdomadaire"
          subtitle="Volume de tâches traitées"
          chart={<BlueBarChart labels={outputData.map((item) => item.day)} data={outputData.map((item) => item.tasks)} name="Tâches" />}
        />
      </SimpleGrid>
    </Stack>
  );
}
