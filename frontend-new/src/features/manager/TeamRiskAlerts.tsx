import { Box, Button, Input, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import { PageHeader } from "@/purity/dashboard";
import { StatCard } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";
import { EmptyState } from "@/purity/dashboard";

interface RiskAlert { id: string; level: string; title: string; detail: string; recommendation: string; factors: string[]; aiScore: number; resolvedAt?: string; employee: { firstName: string; lastName: string; position?: { title: string }; department?: { name: string } } }
export function TeamRiskAlerts() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["risk-alerts"], queryFn: () => api.get<RiskAlert[]>("/employee-risk-alerts") });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const alerts = query.data ?? [];
  const followUp = async (a: RiskAlert) => { await api.patch(`/employee-risk-alerts/${a.id}/follow-up`, { note: notes[a.id] ?? "" }); await client.invalidateQueries({ queryKey: ["risk-alerts"] }); };
  const resolve = async (a: RiskAlert) => { await api.patch(`/employee-risk-alerts/${a.id}/resolve`); await client.invalidateQueries({ queryKey: ["risk-alerts"] }); };
  return <Stack spacing={5}><PageHeader title="Alertes risques" subtitle="Situations sensibles, recommandations et suivi." /><SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}><StatCard label="Alertes ouvertes" value={alerts.filter((a) => !a.resolvedAt).length} tone="orange" /><StatCard label="Risque élevé" value={alerts.filter((a) => a.level === "HIGH" && !a.resolvedAt).length} tone="red" /><StatCard label="Résolues" value={alerts.filter((a) => a.resolvedAt).length} tone="green" /></SimpleGrid>{alerts.map((a) => <Panel key={a.id}><Stack><Stack direction={{ base: "column", md: "row" }} justify="space-between"><Box><Text fontWeight="900" fontSize="lg">{a.employee.firstName} {a.employee.lastName}</Text><Text color="gray.500">{a.employee.position?.title} · {a.employee.department?.name}</Text></Box><Stack direction="row"><Text fontWeight="900" fontSize="2xl">{a.aiScore}%</Text><StatusBadge value={a.level} /></Stack></Stack><Text fontWeight="900">{a.title}</Text><Text color="gray.500">{a.detail}</Text><Box bg="brand.50" p={4} borderRadius="14px"><Text fontSize="sm"><b>Recommandation :</b> {a.recommendation}</Text></Box>{!a.resolvedAt ? <Stack direction={{ base: "column", md: "row" }}><Input value={notes[a.id] ?? ""} onChange={(e) => setNotes((x) => ({ ...x, [a.id]: e.target.value }))} placeholder="Note de suivi" /><Button variant="outline" onClick={() => void followUp(a)}>Enregistrer</Button><Button onClick={() => void resolve(a)}>Résoudre</Button></Stack> : <Text color="green.500" fontWeight="900">Résolue</Text>}</Stack></Panel>)}{query.isSuccess && !alerts.length ? <EmptyState title="Aucune alerte active" /> : null}</Stack>;
}

