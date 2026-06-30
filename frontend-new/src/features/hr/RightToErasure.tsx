import { FormEvent, useState } from "react";
import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useDisclosure,
} from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import type { DataErasureRequest, Employee } from "@/api/types";
import { PageHeader, Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity/components/StatusBadge";

const reasons = [
  "Fin de relation contractuelle",
  "Demande explicite du collaborateur",
  "Données obsolètes à vérifier",
  "Compte inactif à planifier pour purge",
];

export function RightToErasure() {
  const queryClient = useQueryClient();
  const detailModal = useDisclosure();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [notes, setNotes] = useState("");

  const candidates = useQuery({
    queryKey: ["data-erasure", "candidates", search],
    queryFn: () => api.get<Employee[]>(`/data-erasure/candidates?search=${encodeURIComponent(search)}`),
  });
  const requests = useQuery({
    queryKey: ["data-erasure", "requests"],
    queryFn: () => api.get<DataErasureRequest[]>("/data-erasure/requests"),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["data-erasure", "candidates"] }),
      queryClient.invalidateQueries({ queryKey: ["data-erasure", "requests"] }),
    ]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!employeeId) return;
    await api.post<DataErasureRequest>("/data-erasure/requests", { employeeId, reason, notes });
    setEmployeeId("");
    setNotes("");
    await invalidate();
  };

  const updateStatus = async (id: string, status: DataErasureRequest["status"]) => {
    await api.patch(`/data-erasure/requests/${id}/status`, { status });
    await invalidate();
  };

  const openDetails = (employee: Employee) => {
    setSelected(employee);
    detailModal.onOpen();
  };

  return (
    <Stack spacing={5}>
      <PageHeader
        title="Droit à l’oubli"
        subtitle="Prévisualisez les dossiers candidats et placez les demandes en file de revue. Aucune suppression automatique."
      />

      <Panel title="Candidats">
        <Stack spacing={4}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, email ou matricule..." />
          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
            {(candidates.data ?? []).map((employee) => (
              <Box key={employee.id} p={4} bg="gray.50" borderRadius="16px">
                <HStack justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="900">
                      {employee.firstName} {employee.lastName}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {employee.employeeNumber} · {employee.email}
                    </Text>
                    <HStack mt={2}>
                      <StatusBadge value={employee.status} />
                      {employee.department?.name ? <Badge>{employee.department.name}</Badge> : null}
                    </HStack>
                  </Box>
                  <HStack>
                    <Button size="sm" variant="outline" leftIcon={<Eye size={15} />} onClick={() => openDetails(employee)}>
                      Voir
                    </Button>
                    <Button size="sm" leftIcon={<Trash2 size={15} />} onClick={() => setEmployeeId(employee.id)}>
                      Sélectionner
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Panel>

      <Panel title="Créer une demande de file d’effacement">
        <Stack as="form" onSubmit={submit} spacing={4}>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Sélectionner un collaborateur">
            {(candidates.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName} — {employee.email}
              </option>
            ))}
          </Select>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes internes optionnelles..." />
          <Button alignSelf="flex-start" type="submit" leftIcon={<Trash2 size={16} />} isDisabled={!employeeId}>
            Ajouter à la file
          </Button>
        </Stack>
      </Panel>

      <Panel title="File de revue">
        <Stack spacing={3}>
          {(requests.data ?? []).map((request) => (
            <HStack key={request.id} p={4} bg="gray.50" borderRadius="14px" justify="space-between" align="start">
              <Box>
                <Text fontWeight="900">
                  {request.employee?.firstName} {request.employee?.lastName}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {request.reason} · {new Date(request.createdAt).toLocaleDateString("fr-FR")}
                </Text>
                {request.notes ? <Text fontSize="sm" mt={2}>{request.notes}</Text> : null}
              </Box>
              <HStack>
                <StatusBadge value={request.status} />
                {request.status === "PENDING" ? (
                  <>
                    <Button size="sm" onClick={() => void updateStatus(request.id, "APPROVED_FOR_FUTURE_PURGE")}>
                      Approuver pour purge future
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void updateStatus(request.id, "CANCELLED")}>
                      Annuler
                    </Button>
                  </>
                ) : null}
              </HStack>
            </HStack>
          ))}
        </Stack>
      </Panel>

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="22px">
          <ModalHeader>Aperçu collaborateur</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selected ? (
              <Stack spacing={3}>
                <Text fontWeight="900">
                  {selected.firstName} {selected.lastName}
                </Text>
                <Text>Email : {selected.email}</Text>
                <Text>Matricule : {selected.employeeNumber}</Text>
                <Text>Statut : {selected.status}</Text>
                <Text>Poste : {selected.position?.title ?? "Non assigné"}</Text>
                <Text>Département : {selected.department?.name ?? "Non assigné"}</Text>
                <Text>Date d’arrivée : {new Date(selected.hireDate).toLocaleDateString("fr-FR")}</Text>
                <Text color="gray.500" fontSize="sm">
                  Cette vue est informative. La demande placera uniquement le dossier en file de revue, sans suppression.
                </Text>
              </Stack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button onClick={detailModal.onClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
