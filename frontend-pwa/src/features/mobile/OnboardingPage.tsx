import { Button, Circle, HStack, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation, useOnboarding } from "@/api/queries";
import { EmptyState } from "@/components/EmptyState";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import { formatDate } from "@/utils/format";

export function OnboardingPage() {
  const query = useOnboarding();
  const complete = useMutationWithInvalidation<string, unknown>((id) => api.patch(`/onboarding/steps/${id}/complete`, {}), [keys.onboarding]);
  const plan = query.data;

  return (
    <Stack spacing={5}>
      <SectionHeader title={plan?.workflowType === "OFFBOARDING" ? "Offboarding" : "Onboarding"} subtitle="Votre parcours et vos tâches." />
      {!query.isLoading && !plan ? <EmptyState title="Aucun parcours actif" message="Vous n’avez pas de workflow en cours." /> : null}
      <Stack spacing={3}>
        {plan?.steps?.map((step, index) => {
          const done = Boolean(step.completedAt);
          return (
            <MobileCard key={step.id} opacity={step.locked ? 0.58 : 1}>
              <HStack align="flex-start" spacing={3}>
                <Circle size="34px" bg={done ? "green.400" : "brand.500"} color="white" fontWeight="900">{done ? <Check size={16} /> : index + 1}</Circle>
                <Stack spacing={1} flex="1">
                  <Text fontWeight="900">{step.title}</Text>
                  <Text fontSize="sm" color="gray.500">{step.phase} · échéance {formatDate(step.dueDate)}</Text>
                  <Text fontSize="sm">{step.description}</Text>
                  {!done && !step.locked ? <Button size="sm" alignSelf="flex-start" isLoading={complete.isPending} onClick={() => complete.mutate(step.id)}>Marquer terminé</Button> : null}
                </Stack>
              </HStack>
            </MobileCard>
          );
        })}
      </Stack>
    </Stack>
  );
}
