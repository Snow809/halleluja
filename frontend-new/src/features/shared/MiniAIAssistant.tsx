import { useEffect, useRef, useState } from "react";
import { Avatar, Box, Button, HStack, IconButton, Input, Stack, Text } from "@chakra-ui/react";
import { Bot, Check, Send, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { keys } from "@/api/queries";
import { ProposedAction } from "@/api/types";
import { MarkdownMessage } from "./MarkdownMessage";

interface Message { id: string; role: "user" | "assistant"; content: string; action?: ProposedAction }

export function MiniAIAssistant({ onClose }: { onClose(): void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const bottom = useRef<HTMLDivElement>(null);
  const client = useQueryClient();
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
  const send = async () => {
    const question = input.trim();
    if (!question || isSending) return;
    const id = crypto.randomUUID();
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", content: question }, { id, role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);
    try {
      await api.streamChat({ question, conversationId }, (event) => {
        if (event.type === "token") setMessages((items) => items.map((m) => m.id === id ? { ...m, content: `${m.content}${event.data.content ?? ""}` } : m));
        if (event.type === "done") {
          setConversationId(event.data.conversationId);
          setMessages((items) => items.map((m) => m.id === id ? { ...m, content: event.data.answer ?? m.content, action: event.data.proposedAction } : m));
        }
      });
    } catch (error) {
      setMessages((items) => items.map((m) => m.id === id ? { ...m, content: error instanceof Error ? error.message : "ARIA est indisponible." } : m));
    } finally {
      setIsSending(false);
    }
  };
  const decide = async (draft: ProposedAction, decision: "confirm" | "cancel") => {
    if (decision === "confirm" && files[draft.id]) {
      const form = new FormData();
      form.set("attachment", files[draft.id]!);
      await api.post(`/chat/actions/${draft.id}/confirm`, form);
    } else await api.post(`/chat/actions/${draft.id}/${decision}`);
    setMessages((items) => items.map((m) => m.action?.id === draft.id ? { ...m, action: undefined, content: `${m.content}\n\nAction ${decision === "confirm" ? "exécutée" : "annulée"}.` } : m));
    await Promise.all([client.invalidateQueries({ queryKey: keys.vacations }), client.invalidateQueries({ queryKey: ["document-requests"] }), client.invalidateQueries({ queryKey: keys.notifications })]);
  };
  return (
    <Box position="fixed" right={4} bottom={4} zIndex={1400} w="min(430px, calc(100vw - 2rem))" h="min(630px, calc(100vh - 2rem))" bg="white" borderRadius="20px" boxShadow="0 24px 70px rgba(112,144,176,.30)" display="flex" flexDirection="column" overflow="hidden">
      <HStack p={4} justify="space-between" borderBottomWidth="1px" borderColor="app.border">
        <HStack><Avatar bg="brand.500" icon={<Bot size={20} />} /><Box><Text fontWeight="900">ARIA</Text><Text fontSize="xs" color="gray.500">Assistant RH</Text></Box></HStack>
        <IconButton aria-label="Fermer" icon={<X size={18} />} variant="ghost" onClick={onClose} />
      </HStack>
      <Box flex="1" overflowY="auto" p={4} bg="app.bg">
        <Stack spacing={3}>
          {messages.length === 0 ? <Text color="gray.500" textAlign="center" pt={10}>Posez votre question à ARIA.</Text> : null}
          {messages.map((message) => (
            <Stack key={message.id} direction={message.role === "user" ? "row-reverse" : "row"}>
              <Box maxW="88%" p={3} borderRadius="16px" bg={message.role === "user" ? "brand.500" : "white"} color={message.role === "user" ? "white" : "gray.800"} borderWidth={message.role === "assistant" ? "1px" : 0} borderColor="app.border">
                {message.role === "assistant" ? <MarkdownMessage content={message.content || "…"} /> : <Text>{message.content}</Text>}
                {message.action ? <Stack mt={3}><Button as="label" size="sm" variant="outline">Justificatif optionnel<Input hidden type="file" onChange={(e) => setFiles((x) => ({ ...x, [message.action!.id]: e.target.files?.[0] }))} /></Button><HStack><Button size="sm" leftIcon={<Check size={15} />} onClick={() => void decide(message.action!, "confirm")}>Accepter</Button><Button size="sm" variant="outline" leftIcon={<X size={15} />} onClick={() => void decide(message.action!, "cancel")}>Annuler</Button></HStack></Stack> : null}
              </Box>
            </Stack>
          ))}
          {isSending ? <Text fontSize="xs" color="gray.500">ARIA réfléchit...</Text> : null}
          <div ref={bottom} />
        </Stack>
      </Box>
      <HStack p={3} borderTopWidth="1px" borderColor="app.border"><Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} placeholder="Écrivez un message..." /><IconButton aria-label="Envoyer" icon={<Send size={18} />} onClick={() => void send()} isDisabled={!input.trim() || isSending} /></HStack>
    </Box>
  );
}

