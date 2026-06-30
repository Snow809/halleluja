import { Box, Divider, IconButton, Modal, ModalBody, ModalContent, ModalHeader, ModalOverlay, Stack, Text } from "@chakra-ui/react";
import { X } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { useNotifications } from "@/api/queries";

export function AllNotifications({ isOpen, onClose }: { isOpen: boolean; onClose(): void }) {
  const { user } = useAuth();
  const { data = [] } = useNotifications(user?.userId);
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent borderRadius="20px">
        <ModalHeader>
          <Text>Toutes les notifications</Text>
          <IconButton aria-label="Fermer" icon={<X size={18} />} variant="ghost" position="absolute" right={3} top={3} onClick={onClose} />
        </ModalHeader>
        <Divider />
        <ModalBody p={4}>
          <Stack spacing={3} maxH="70vh" overflowY="auto">
            {data.map((item) => (
              <Box key={item.id} borderRadius="14px" p={4} bg={item.readAt ? "white" : "brand.50"} borderWidth="1px" borderColor="app.border">
                <Text fontWeight="900">{item.title}</Text>
                <Text fontSize="sm" color="gray.500">{item.message}</Text>
                <Text fontSize="xs" color="gray.400" mt={2}>{new Date(item.createdAt).toLocaleString("fr-FR")}</Text>
              </Box>
            ))}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

