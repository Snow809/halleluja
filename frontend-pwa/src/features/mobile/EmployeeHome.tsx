import { Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Bot, CalendarDays, FileText, MapPin } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import { useDocumentRequests, useVacations } from "@/api/queries";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/utils/format";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <MobileCard>
      <Text fontSize="xs" color="gray.500" fontWeight="900">{label}</Text>
      <Text fontSize="2xl" fontWeight="900">{value}</Text>
    </MobileCard>
  );
}

export function EmployeeHome() {
  const { user } = useAuth();
  const employee = user?.employee;
  const vacations = useVacations();
  const documents = useDocumentRequests();
  const pending = vacations.data?.filter((item) => item.status === "PENDING").length ?? 0;

  return (
    <Stack spacing={5}>
      <SectionHeader
        title={`Bonjour ${employee?.firstName ?? user?.fullName?.split(" ")[0] ?? ""}`}
        subtitle={employee?.position?.title ? `${employee.position.title} · ${employee.department?.name ?? ""}` : "Votre espace RH mobile"}
        action={<Button as={RouterLink} to="/assistant" size="sm" leftIcon={<Bot size={16} />}>ARIA</Button>}
      />
      <SimpleGrid columns={2} spacing={3}>
        <Metric label="Congés" value={`${employee?.vacationBalanceDays ?? "—"} j`} />
        <Metric label="RTT" value={`${employee?.rttBalanceDays ?? "—"} j`} />
        <Metric label="Présence" value={`${employee?.presenceScore ?? "—"}%`} />
        <Metric label="En attente" value={pending} />
      </SimpleGrid>
      <MobileCard>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="900">Actions rapides</Text>
        </HStack>
        <SimpleGrid columns={2} spacing={3}>
          <Button as={RouterLink} to="/employee/vacations" leftIcon={<CalendarDays size={16} />}>Congé</Button>
          <Button as={RouterLink} to="/employee/request-document" variant="outline" leftIcon={<FileText size={16} />}>Document</Button>
        </SimpleGrid>
      </MobileCard>
      <MobileCard>
        <Text fontWeight="900" mb={3}>Dernières demandes</Text>
        <Stack spacing={3}>
          {(vacations.data ?? []).slice(0, 3).map((request) => (
            <HStack key={request.id} justify="space-between" align="flex-start">
              <Stack spacing={0}>
                <Text fontWeight="800">{request.requestType}</Text>
                <Text fontSize="sm" color="gray.500">{formatDate(request.startDate)} → {formatDate(request.endDate)}</Text>
              </Stack>
              <StatusBadge value={request.status} />
            </HStack>
          ))}
          {!vacations.isLoading && !(vacations.data ?? []).length ? <Text color="gray.500" fontSize="sm">Aucune demande de congé.</Text> : null}
        </Stack>
      </MobileCard>
      <MobileCard>
        <Text fontWeight="900" mb={2}>Profil</Text>
        <Stack spacing={2} color="gray.600" fontSize="sm">
          <HStack><MapPin size={16} /><Text>{employee?.location ?? "Localisation non renseignée"}</Text></HStack>
          <Text>{documents.data?.generated?.length ?? 0} document(s) généré(s)</Text>
        </Stack>
      </MobileCard>
    </Stack>
  );
}
