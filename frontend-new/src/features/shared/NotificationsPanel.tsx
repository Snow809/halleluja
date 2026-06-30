import { Box, Button, Divider, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { Bell, CheckCheck, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { keys, useNotifications } from "@/api/queries";
import { useAuth } from "@/app/AuthContext";

export function NotificationsPanel({ onClose, onShowAll }: { onClose(): void; onShowAll(): void }) {
  const { user } = useAuth();
  const query = useNotifications(user?.userId);
  const client = useQueryClient();
  const notifications = query.data ?? [];
  const unread = notifications.filter((item) => !item.readAt).length;
  const markAll = async () => {
    await api.patch("/notifications/read-all");
    await client.invalidateQueries({ queryKey: keys.notifications });
  };
  return (
    <Box position="fixed" right={{ base: 3, sm: 8 }} top="86px" zIndex={1500} w="min(410px, calc(100vw - 24px))" bg="white" borderRadius="20px" boxShadow="0 20px 50px rgba(112,144,176,.22)" overflow="hidden">
      <HStack justify="space-between" px={4} py={3}>
        <HStack><Bell size={20} color="#2f76df" /><Box><Text fontWeight="900">Notifications</Text><Text fontSize="xs" color="gray.500">{unread} non lue(s)</Text></Box></HStack>
        <IconButton aria-label="Fermer" icon={<X size={18} />} size="sm" variant="ghost" onClick={onClose} />
      </HStack>
      <Divider />
      <Stack maxH="390px" overflowY="auto" py={2} spacing={1}>
        {notifications.slice(0, 8).map((item) => (
          <Box key={item.id} mx={2} p={3} borderRadius="14px" bg={item.readAt ? "white" : "brand.50"} cursor="pointer" onClick={async () => {
            if (!item.readAt) await api.patch(`/notifications/${item.id}/read`);
            await client.invalidateQueries({ queryKey: keys.notifications });
          }}>
            <Text fontWeight="900" fontSize="sm">{item.title}</Text>
            <Text fontSize="xs" color="gray.500">{item.message}</Text>
          </Box>
        ))}
      </Stack>
      <Divider />
      <HStack p={3}><Button flex="1" variant="outline" leftIcon={<CheckCheck size={16} />} onClick={markAll}>Tout lire</Button><Button flex="1" onClick={onShowAll}>Tout voir</Button></HStack>
    </Box>
  );
}

