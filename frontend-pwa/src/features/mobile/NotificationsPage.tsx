import { Button, HStack, Stack, Text } from "@chakra-ui/react";
import { api } from "@/api/client";
import { keys, useMutationWithInvalidation, useNotifications } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import { formatDate } from "@/utils/format";

export function NotificationsPage() {
  const { user } = useAuth();
  const query = useNotifications(user?.userId);
  const readAll = useMutationWithInvalidation<void, unknown>(() => api.patch("/notifications/read-all"), [keys.notifications]);

  return (
    <Stack spacing={5}>
      <SectionHeader title="Notifications" subtitle="Alertes liées à votre compte." action={<Button size="sm" variant="outline" onClick={() => readAll.mutate()} isLoading={readAll.isPending}>Tout lu</Button>} />
      <Stack spacing={3}>
        {(query.data ?? []).map((item) => (
          <MobileCard key={item.id} opacity={item.readAt ? 0.65 : 1}>
            <HStack justify="space-between" align="flex-start">
              <Stack spacing={1}>
                <Text fontWeight="900">{item.title}</Text>
                <Text fontSize="sm" color="gray.600">{item.message}</Text>
                <Text fontSize="xs" color="gray.400">{formatDate(item.createdAt)}</Text>
              </Stack>
            </HStack>
          </MobileCard>
        ))}
        {query.isSuccess && !query.data.length ? <EmptyState title="Aucune notification" /> : null}
      </Stack>
    </Stack>
  );
}
