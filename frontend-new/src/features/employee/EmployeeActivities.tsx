import { Box, Stack, Text } from "@chakra-ui/react";
import { useDashboardQuery } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { EmptyState } from "@/purity/dashboard";

export function EmployeeActivities() {
  const query = useDashboardQuery<Array<{ type: string; text: string; time: string }>>("recent-activities");
  return (
    <Stack spacing={5} maxW="980px">
      <PageHeader title="Activité" subtitle="Les dernières informations liées à votre dossier RH." />
      <Panel><Stack spacing={3}>{(query.data ?? []).map((item, i) => <Box key={`${item.time}-${i}`} p={4} bg="gray.50" borderRadius="14px"><Text fontWeight="900">{item.text}</Text><Text fontSize="xs" color="gray.500">{item.time}</Text></Box>)}{query.isSuccess && !query.data?.length ? <EmptyState title="Aucune activité" /> : null}</Stack></Panel>
    </Stack>
  );
}

