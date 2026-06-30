import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { BlueBarChart } from "@/purity/charts";
import { EmptyState, PageHeader, Panel, SalesOverview, StatCard } from "@/purity/dashboard";
import { StatusBadge } from "@/purity";

interface Summary {
  questionsAsked: number;
  refusals: number;
  averageLatencyMs: number;
  totalTokens: number;
  daily: Array<{ date: string; queries: number }>;
}

interface Message {
  id: string;
  content?: string;
  safetyStatus: string;
  createdAt: string;
  model?: string;
  latencyMs?: number;
  totalTokens?: number;
}

export function AISupervision() {
  const summary = useQuery({ queryKey: ["chat", "supervision", "summary"], queryFn: () => api.get<Summary>("/chat/supervision/summary") });
  const messages = useQuery({ queryKey: ["chat", "supervision", "messages"], queryFn: () => api.get<Message[]>("/chat/supervision/messages") });
  const data = summary.data;
  const daily = data?.daily ?? [];

  return (
    <Stack spacing={5}>
      <PageHeader title="Supervision IA — ARIA" subtitle="Usages, refus, latences et tokens." />
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
        <StatCard label="Questions" value={data?.questionsAsked ?? 0} />
        <StatCard label="Refus" value={data?.refusals ?? 0} tone="orange" />
        <StatCard label="Latence moyenne" value={`${data?.averageLatencyMs ?? 0} ms`} />
        <StatCard label="Tokens" value={data?.totalTokens ?? 0} />
      </SimpleGrid>
      <SalesOverview
        title="Activité sur 7 jours"
        subtitle="Questions traitées par ARIA"
        chart={<BlueBarChart labels={daily.map((item) => item.date)} data={daily.map((item) => item.queries)} name="Questions" />}
      />
      <Panel title="Journal">
        <Stack>
          {(messages.data ?? []).map((message) => (
            <Box key={message.id} p={3} bg="gray.50" borderRadius="14px">
              <Stack direction="row" justify="space-between">
                <StatusBadge value={message.safetyStatus} />
                <Text fontSize="xs" color="gray.500">{new Date(message.createdAt).toLocaleString("fr-FR")}</Text>
              </Stack>
              <Text mt={2} color="gray.600" fontSize="sm">
                {message.content ?? `${message.model ?? "modèle"} · ${message.latencyMs ?? 0} ms · ${message.totalTokens ?? 0} tokens`}
              </Text>
            </Box>
          ))}
          {messages.isSuccess && !messages.data?.length ? <EmptyState title="Aucun message supervisé" /> : null}
        </Stack>
      </Panel>
    </Stack>
  );
}
