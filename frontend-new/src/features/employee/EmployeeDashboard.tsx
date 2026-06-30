import { useState } from "react";
import { Box, Button, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Activity, Bot, CalendarDays, FolderOpen, TrendingUp } from "lucide-react";
import { api } from "@/api/client";
import { useDashboardQuery, useMyDocuments, useOnboarding } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";
import { BlueAreaChart } from "@/purity/charts";
import { EmptyState, PageHeader, Panel, SalesOverview, StatCard } from "@/purity/dashboard";
import { TimelineRow } from "@/purity/timeline";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const presence = useDashboardQuery<Array<{ month: string; jours: number }>>("presence-data");
  const activities = useDashboardQuery<Array<{ type: string; text: string; time: string }>>("recent-activities");
  const documents = useMyDocuments();
  const onboarding = useOnboarding();
  const [message, setMessage] = useState("");
  const contact = useMutation({
    mutationFn: () => api.post("/hr-contact-requests", { name: user?.fullName, email: user?.email, phone: user?.employee?.phone, message }),
    onSuccess: () => setMessage(""),
  });
  const employee = user?.employee;
  if (!employee) return null;

  const documentCount = (documents.data?.hrDocs.length ?? 0) + (documents.data?.generated.length ?? 0);
  const presenceData = presence.data ?? [];
  const activityData = activities.data ?? [];

  return (
    <Stack spacing={5}>
      <PageHeader
        title="Dashboard collaborateur"
        subtitle={`${employee.position?.title ?? "Collaborateur"} · ${employee.department?.name ?? "Département non renseigné"}`}
        actions={<Button as={RouterLink} to="/assistant" leftIcon={<Bot size={18} />}>Demander à ARIA</Button>}
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
        <StatCard label="Congés" value={`${employee.vacationBalanceDays} j`} icon={CalendarDays} />
        <StatCard label="RTT" value={`${employee.rttBalanceDays} j`} icon={CalendarDays} />
        <StatCard label="Documents" value={documentCount} icon={FolderOpen} />
        <StatCard label="Présence" value={`${employee.presenceScore}%`} tone="green" icon={TrendingUp} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <SalesOverview
          title="Présence mensuelle"
          subtitle={<><Text as="span" color="brand.500" fontWeight="bold">{employee.presenceScore}%</Text> de présence actuelle</>}
          chart={<BlueAreaChart labels={presenceData.map((item) => item.month)} data={presenceData.map((item) => item.jours)} name="Jours" />}
        />

        <Panel title="Activité récente">
          <Stack spacing={1}>
            {activityData.map((item, index) => (
              <TimelineRow key={`${item.time}-${index}`} icon={Activity} title={item.text} date={item.time} index={index} arrLength={activityData.length} />
            ))}
            {activities.isSuccess && !activityData.length ? <EmptyState title="Aucune activité récente" /> : null}
          </Stack>
        </Panel>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <Panel title="Onboarding">
          <Text fontSize="3xl" fontWeight="900" color="brand.500">{onboarding.data?.progress ?? 0}%</Text>
          <Text color="gray.500">{onboarding.data ? `${onboarding.data.steps.length} tâche(s)` : "Aucun parcours actif"}</Text>
        </Panel>
        <Panel title="Contacter RH">
          <Stack as="form" onSubmit={(event) => { event.preventDefault(); contact.mutate(); }}>
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Votre message..." />
            <Button type="submit" isLoading={contact.isPending}>Envoyer</Button>
          </Stack>
        </Panel>
      </SimpleGrid>
    </Stack>
  );
}
