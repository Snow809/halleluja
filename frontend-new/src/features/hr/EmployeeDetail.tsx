import {
  Avatar,
  Box,
  Button,
  Divider,
  HStack,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, FileText, History, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { keys, useEmployee, useEmployeeAudit, useEmployeeTimeline } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";
import { PageHeader, Panel, StatCard } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";
import { TimelineRow } from "@/purity/timeline";

export function EmployeeDetail() {
  const { id } = useParams();
  const { shell } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useEmployee(id);
  const timeline = useEmployeeTimeline(id);
  const audit = useEmployeeAudit(shell === "admin" ? id : undefined);
  const activate = useMutation({
    mutationFn: (workflowType: "ONBOARDING" | "OFFBOARDING") => api.post("/onboarding/activate", { employeeId: id, workflowType }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["employees", id] }),
        client.invalidateQueries({ queryKey: keys.employees }),
        client.invalidateQueries({ queryKey: ["employee-timeline", id] }),
      ]);
    },
  });

  if (query.isLoading) return <Panel><Text>Chargement...</Text></Panel>;
  if (!query.data) return <Panel><EmptyState title="Employé introuvable" /></Panel>;

  const e = query.data;
  const fullName = `${e.firstName} ${e.lastName}`;
  const showSalary = shell === "hr" || shell === "admin";
  const canActivate = shell === "hr" || shell === "admin";
  const busy = e.status === "ONBOARDING" || e.status === "OFFBOARDING";

  return (
    <Stack spacing={5}>
      <Button alignSelf="flex-start" variant="outline" leftIcon={<ArrowLeft size={18} />} onClick={() => navigate(`/${shell}/employees`)}>
        Retour à l’annuaire
      </Button>
      <PageHeader
        title={fullName}
        subtitle={`${e.position?.title ?? "Poste non renseigné"} · ${e.department?.name ?? "Département non renseigné"}`}
        actions={canActivate ? (
          <HStack>
            <Button isDisabled={busy} isLoading={activate.isPending} onClick={() => activate.mutate("ONBOARDING")}>
              Activer onboarding
            </Button>
            <Button variant="outline" isDisabled={busy} onClick={() => activate.mutate("OFFBOARDING")}>
              Activer offboarding
            </Button>
          </HStack>
        ) : undefined}
      />

      <Panel>
        <HStack spacing={5} align="center">
          <Avatar name={fullName} size="xl" bg="brand.500" color="white" />
          <Box>
            <Text fontSize="2xl" fontWeight="900">{fullName}</Text>
            <HStack mt={2}><StatusBadge value={e.employeeNumber} /><StatusBadge value={e.status} /></HStack>
          </Box>
        </HStack>
      </Panel>

      <Tabs variant="soft-rounded" colorScheme="brand">
        <TabList flexWrap="wrap" gap={2}>
          <Tab>Overview</Tab>
          <Tab>Requests</Tab>
          <Tab>Congés / absences</Tab>
          <Tab>Documents</Tab>
          <Tab>Onboarding / offboarding</Tab>
          {shell === "admin" ? <Tab>Audit</Tab> : null}
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
              {[
                ["E-mail", e.email],
                ["Téléphone", e.phone ?? "—"],
                ["Localisation", e.location ?? "—"],
                ["Présence", `${e.presenceScore}%`],
                ["Performance", `${e.performanceScore}%`],
                ["Engagement", `${e.engagementScore}%`],
                ["Congés", `${e.vacationBalanceDays} j`],
                ...(showSalary ? [["Salaire", `${Number(e.salary ?? 0).toLocaleString("fr-FR")} MAD`]] : []),
              ].map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
            </SimpleGrid>
          </TabPanel>

          <TabPanel px={0}>
            <Panel title="Cycle de vie des demandes">
              <Stack spacing={3}>
                {(e.requests ?? []).length ? (e.requests ?? []).map((r) => (
                  <Box key={r.id} p={4} bg="gray.50" borderRadius="16px">
                    <HStack justify="space-between"><Text fontWeight="900">{r.requestType}</Text><StatusBadge value={r.status} /></HStack>
                    <Text fontSize="sm" color="gray.500" mt={1}>{r.detail}</Text>
                    <Text fontSize="xs" color="gray.400" mt={2}>{new Date(r.createdAt).toLocaleString("fr-FR")}</Text>
                  </Box>
                )) : <EmptyState title="Aucune demande" description="Les demandes de cet employé apparaîtront ici." />}
              </Stack>
            </Panel>
          </TabPanel>

          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
              <Panel title="Absences">
                <Stack spacing={3}>
                  {(e.absences ?? []).length ? (e.absences ?? []).map((a) => (
                    <Box key={a.id} p={4} bg="gray.50" borderRadius="16px">
                      <HStack justify="space-between"><Text fontWeight="900">{a.absenceType}</Text><StatusBadge value={a.status} /></HStack>
                      <Text fontSize="sm" color="gray.500">{new Date(a.startDate).toLocaleDateString("fr-FR")} → {new Date(a.endDate).toLocaleDateString("fr-FR")}</Text>
                    </Box>
                  )) : <EmptyState title="Aucune absence" />}
                </Stack>
              </Panel>
              <Panel title="Timeline RH">
                {(timeline.data ?? []).length ? timeline.data!.slice(0, 8).map((event, index, arr) => (
                  <TimelineRow key={`${event.type}-${event.id}`} icon={History} title={`${event.title} · ${event.status}`} date={new Date(event.date).toLocaleString("fr-FR")} index={index} arrLength={arr.length} />
                )) : <EmptyState title="Aucun événement" />}
              </Panel>
            </SimpleGrid>
          </TabPanel>

          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
              <Panel title="Documents RH">
                <Stack spacing={3}>{(e.hrDocuments ?? []).map((doc) => <DocumentLine key={doc.id} icon={<FileText size={16} />} title={doc.title} status={doc.status} subtitle={`${doc.category} · ${doc.fileType}`} />)}</Stack>
              </Panel>
              <Panel title="Documents générés">
                <Stack spacing={3}>{(e.generatedDocs ?? []).map((doc) => <DocumentLine key={doc.id} icon={<FileText size={16} />} title={doc.documentType} status={doc.status} subtitle={new Date(doc.generatedAt).toLocaleDateString("fr-FR")} />)}</Stack>
              </Panel>
            </SimpleGrid>
          </TabPanel>

          <TabPanel px={0}>
            <Panel title="Workflow">
              <Text color="gray.500">Le statut actuel est <b>{e.status}</b>. Les tâches actives sont visibles dans le parcours onboarding/offboarding de l’utilisateur.</Text>
            </Panel>
          </TabPanel>

          {shell === "admin" ? (
            <TabPanel px={0}>
              <Panel title="Audit employé">
                {(audit.data ?? []).length ? audit.data!.map((log) => (
                  <Box key={log.id} py={3}>
                    <HStack justify="space-between"><Text fontWeight="900">{log.action}</Text><StatusBadge value={log.status} /></HStack>
                    <Text fontSize="sm" color="gray.500">{log.user?.fullName ?? "Système"} · {new Date(log.createdAt).toLocaleString("fr-FR")}</Text>
                    <Divider mt={3} />
                  </Box>
                )) : <EmptyState title="Aucun audit spécifique" />}
              </Panel>
            </TabPanel>
          ) : null}
        </TabPanels>
      </Tabs>
    </Stack>
  );
}

function DocumentLine({ icon, title, subtitle, status }: { icon: ReactNode; title: string; subtitle: string; status: string }) {
  return (
    <HStack p={4} bg="gray.50" borderRadius="16px" justify="space-between">
      <HStack><Box color="brand.500">{icon}</Box><Box><Text fontWeight="900">{title}</Text><Text fontSize="sm" color="gray.500">{subtitle}</Text></Box></HStack>
      <StatusBadge value={status} />
    </HStack>
  );
}
