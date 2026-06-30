import { Box, Button, Flex, HStack, Progress, Stack, Text } from "@chakra-ui/react";
import { CheckCircle, Circle, Lock } from "lucide-react";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation, useOnboarding } from "@/api/queries";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";
import { Card, CardBody } from "@/purity";

export function OnboardingJourney() {
  const query = useOnboarding();
  const completion = useMutationWithInvalidation<string, unknown>((id) => api.patch(`/onboarding/steps/${id}/complete`, {}), [keys.onboarding, ["dashboard", "onboarding-progress"], ["notifications"]]);
  if (query.isLoading) return <Panel><Text color="gray.500">Chargement du parcours...</Text></Panel>;
  if (!query.data) return <Panel><EmptyState title="Aucun parcours actif" description="Votre onboarding ou offboarding apparaîtra ici dès qu’un RH l’active." /></Panel>;
  const plan = query.data;
  return <Stack spacing={5}><PageHeader title={`Parcours d’${plan.workflowType === "OFFBOARDING" ? "offboarding" : "onboarding"}`} subtitle="Suivez les tâches générées pour votre poste." /><Panel title="Progression globale" action={<Text fontSize="2xl" color="brand.500" fontWeight="900">{plan.progress}%</Text>}><Progress value={plan.progress} colorScheme="brand" borderRadius="full" /></Panel><Stack spacing={4}>{plan.steps.map((step, i) => { const done = step.status === "DONE"; const Icon = done ? CheckCircle : step.locked ? Lock : Circle; return <Card key={step.id}><CardBody><Stack direction={{ base: "column", md: "row" }} align={{ md: "center" }} spacing={4}><Flex w="46px" h="46px" borderRadius="14px" align="center" justify="center" bg={done ? "green.50" : step.locked ? "gray.100" : "brand.50"} color={done ? "green.500" : step.locked ? "gray.400" : "brand.500"}><Icon size={22} /></Flex><Box flex="1"><Text fontSize="xs" color="gray.400" fontWeight="900">Étape {i + 1} · {step.phase}</Text><Text fontSize="lg" fontWeight="900">{step.title}</Text><Text color="gray.500">{step.description}</Text></Box><HStack><StatusBadge value={step.status} />{step.status !== "DONE" && !step.locked ? <Button onClick={() => completion.mutate(step.id)} isLoading={completion.isPending}>Terminer</Button> : null}</HStack></Stack></CardBody></Card>; })}</Stack></Stack>;
}

