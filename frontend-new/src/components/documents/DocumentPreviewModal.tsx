import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { DocumentPreview } from "@/api/types";

export function DocumentPreviewModal({
  preview,
  isOpen,
  onClose,
}: {
  preview: DocumentPreview | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="22px">
        <ModalHeader>
          <Stack direction="row" align="center" spacing={3}>
            <Text>{preview?.fileName ?? "Aperçu document"}</Text>
            {preview?.anonymized ? <Badge colorScheme="blue">anonymisé</Badge> : null}
          </Stack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {preview?.previewable && preview.url ? (
            <iframe
              title={preview.fileName}
              src={preview.url}
              style={{ width: "100%", height: "72vh", border: 0, borderRadius: 16, background: "#f8fafc" }}
            />
          ) : (
            <Stack minH="260px" align="center" justify="center" textAlign="center" color="gray.500">
              <Text fontWeight="bold" color="gray.700">
                Aperçu indisponible
              </Text>
              <Text fontSize="sm">
                Seuls les PDF peuvent être prévisualisés dans le navigateur. Vous pouvez télécharger ce fichier.
              </Text>
            </Stack>
          )}
        </ModalBody>
        <ModalFooter gap={3}>
          {preview?.url ? (
            <Button as="a" href={preview.url} target="_blank" rel="noreferrer">
              Télécharger
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
