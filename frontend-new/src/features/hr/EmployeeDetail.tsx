import { Avatar, Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { keys, useEmployee } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";
import { PageHeader } from "@/purity/dashboard";
import { StatCard } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";

export function EmployeeDetail() {
  const { id } = useParams();
  const { shell } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useEmployee(id);
  const activate = useMutation({ mutationFn: (workflowType: "ONBOARDING" | "OFFBOARDING") => api.post("/onboarding/activate", { employeeId: id, workflowType }), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["employees", id] }), client.invalidateQueries({ queryKey: keys.employees })]); } });
  if (query.isLoading) return <Panel><Text>Chargement...</Text></Panel>;
  if (!query.data) return <Panel><EmptyState title="Employé introuvable" /></Panel>;
  const e = query.data;
  const showSalary = shell === "hr" || shell === "admin";
  const canActivate = shell === "hr" || shell === "admin";
  const busy = e.status === "ONBOARDING" || e.status === "OFFBOARDING";
  return <Stack spacing={5}><Button alignSelf="flex-start" variant="outline" leftIcon={<ArrowLeft size={18} />} onClick={() => navigate(`/${shell}/employees`)}>Retour</Button><PageHeader title={`${e.firstName} ${e.lastName}`} subtitle={`${e.position?.title ?? ""} · ${e.department?.name ?? ""}`} actions={canActivate ? <Stack direction="row"><Button isDisabled={busy} isLoading={activate.isPending} onClick={() => activate.mutate("ONBOARDING")}>Activer onboarding</Button><Button variant="outline" isDisabled={busy} onClick={() => activate.mutate("OFFBOARDING")}>Activer offboarding</Button></Stack> : undefined} /><Panel><Stack direction="row" align="center"><Avatar name={`${e.firstName} ${e.lastName}`} size="xl" bg="brand.500" color="white" /><Box><Text fontSize="2xl" fontWeight="900">{e.firstName} {e.lastName}</Text><Stack direction="row"><StatusBadge value={e.employeeNumber} /><StatusBadge value={e.status} /></Stack></Box></Stack></Panel><SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>{[["E-mail", e.email], ["Téléphone", e.phone ?? "—"], ["Localisation", e.location ?? "—"], ["Présence", `${e.presenceScore}%`], ["Performance", `${e.performanceScore}%`], ["Engagement", `${e.engagementScore}%`], ["Congés", `${e.vacationBalanceDays} j`], ...(showSalary ? [["Salaire", `${Number(e.salary ?? 0).toLocaleString("fr-FR")} MAD`]] : [])].map(([label, value]) => <StatCard key={label} label={label} value={value} />)}</SimpleGrid><SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}><Panel title="Demandes récentes"><Stack>{(e.requests ?? []).map((r) => <Box key={r.id} p={3} bg="gray.50" borderRadius="14px"><Stack direction="row" justify="space-between"><Text fontWeight="900">{r.requestType}</Text><StatusBadge value={r.status} /></Stack></Box>)}</Stack></Panel><Panel title="Absences"><Stack>{(e.absences ?? []).map((a) => <Box key={a.id} p={3} bg="gray.50" borderRadius="14px"><Text fontWeight="900">{a.absenceType}</Text><Text fontSize="xs" color="gray.500">{new Date(a.startDate).toLocaleDateString("fr-FR")} → {new Date(a.endDate).toLocaleDateString("fr-FR")}</Text></Box>)}</Stack></Panel></SimpleGrid></Stack>;
}

