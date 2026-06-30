import { FormEvent, useState } from "react";
import { Avatar, Box, Button, FormControl, FormLabel, HStack, Input, Select, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { BackendRole, Employee } from "@/api/types";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { DataTable, Tbody, Td, Th, Thead, Tr } from "@/purity/tables";
import { StatusBadge } from "@/purity";

interface Account { id: string; email: string; fullName: string; role: BackendRole; isActive: boolean; createdAt: string; employee?: Employee }

export function EmployeeAccountManagement() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["users"], queryFn: () => api.get<Account[]>("/users") });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<BackendRole>("COLLABORATOR");
  const create = useMutation({ mutationFn: () => api.post("/users", { fullName, email, password, role }), onSuccess: async () => { setFullName(""); setEmail(""); setPassword(""); await client.invalidateQueries({ queryKey: ["users"] }); } });
  const workflow = useMutation({ mutationFn: ({ employeeId, workflowType }: { employeeId: string; workflowType: "ONBOARDING" | "OFFBOARDING" }) => api.post("/onboarding/activate", { employeeId, workflowType }), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["users"] }), client.invalidateQueries({ queryKey: ["employees"] })]); } });
  const act = async (account: Account, action: "activate" | "deactivate" | "delete") => { if (action === "delete") await api.delete(`/users/${account.id}`); else await api.patch(`/users/${account.id}/${action}`); await client.invalidateQueries({ queryKey: ["users"] }); };
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  const accounts = query.data ?? [];
  return <Stack spacing={5}><PageHeader title="Gestion des comptes" subtitle="Créez les accès, suspendez les comptes et activez les workflows." /><Panel title="Créer un compte"><Stack as="form" onSubmit={submit} direction={{ base: "column", xl: "row" }} spacing={4} align={{ xl: "end" }}><FormControl isRequired><FormLabel>Nom complet</FormLabel><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></FormControl><FormControl isRequired><FormLabel>E-mail</FormLabel><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormControl><FormControl isRequired><FormLabel>Mot de passe temporaire</FormLabel><Input value={password} onChange={(e) => setPassword(e.target.value)} /></FormControl><FormControl><FormLabel>Rôle</FormLabel><Select value={role} onChange={(e) => setRole(e.target.value as BackendRole)}><option value="COLLABORATOR">Collaborateur</option><option value="MANAGER">Manager</option><option value="HR">RH</option><option value="ADMIN">Admin</option></Select></FormControl><Button type="submit" isLoading={create.isPending}>Créer</Button></Stack></Panel><DataTable><Thead><Tr><Th>Utilisateur</Th><Th>Rôle</Th><Th>Statut</Th><Th>Workflow</Th><Th textAlign="right">Actions</Th></Tr></Thead><Tbody>{accounts.map((a) => { const busy = a.employee?.status === "ONBOARDING" || a.employee?.status === "OFFBOARDING"; return <Tr key={a.id}><Td><HStack><Avatar name={a.fullName} bg="brand.500" color="white" /><Box><Text fontWeight="900">{a.fullName}</Text><Text fontSize="xs" color="gray.500">{a.email}</Text></Box></HStack></Td><Td><StatusBadge value={a.role} /></Td><Td><StatusBadge value={a.isActive ? "ACTIVE" : "INACTIVE"} /></Td><Td>{a.employee?.id ? <Stack direction="row"><Button size="sm" isDisabled={busy} onClick={() => workflow.mutate({ employeeId: a.employee!.id, workflowType: "ONBOARDING" })}>Onboarding</Button><Button size="sm" variant="outline" isDisabled={busy} onClick={() => workflow.mutate({ employeeId: a.employee!.id, workflowType: "OFFBOARDING" })}>Offboarding</Button></Stack> : <Text fontSize="xs" color="gray.500">Aucun profil employé lié</Text>}</Td><Td><Stack direction="row" justify="flex-end"><Button size="sm" onClick={() => void act(a, a.isActive ? "deactivate" : "activate")}>{a.isActive ? "Suspendre" : "Activer"}</Button><Button size="sm" colorScheme="red" variant="outline" onClick={() => void act(a, "delete")}>Supprimer</Button></Stack></Td></Tr>; })}</Tbody></DataTable></Stack>;
}

