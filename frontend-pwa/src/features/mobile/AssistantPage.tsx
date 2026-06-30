import { Avatar, Box, Button, HStack, IconButton, Input, Stack, Text } from "@chakra-ui/react";
import { Bot, Check, FileText, MessageCircle, Plus, Send, User, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { keys } from "@/api/queries";
import type { ChatConversationDetail, ChatConversationSummary, ChatSource, ProposedAction } from "@/api/types";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";
import { MarkdownMessage } from "./MarkdownMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  action?: ProposedAction;
}

const prompts = [
  "Combien de jours de congés me restent-ils ?",
  "Prépare une demande de document",
  "Je veux me reposer demain",
];

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const client = useQueryClient();
  const conversations = useQuery({ queryKey: ["chat", "conversations"], queryFn: () => api.get<ChatConversationSummary[]>("/chat/conversations") });

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const openConversation = async (id: string) => {
    const conversation = await api.get<ChatConversationDetail>(`/chat/conversations/${id}`);
    setConversationId(conversation.id);
    setMessages(conversation.messages.map((message) => ({
      id: message.id,
      role: message.role === "USER" ? "user" : "assistant",
      content: message.content,
      sources: message.sources,
    })));
  };

  const send = async (question = input.trim()) => {
    if (!question || isSending) return;
    const assistantId = crypto.randomUUID();
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", content: question }, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);
    try {
      await api.streamChat({ question, conversationId }, (event) => {
        if (event.type === "token") {
          setMessages((items) => items.map((message) => message.id === assistantId ? { ...message, content: `${message.content}${event.data.content ?? ""}` } : message));
        }
        if (event.type === "done") {
          setConversationId(event.data.conversationId);
          setMessages((items) => items.map((message) => message.id === assistantId ? { ...message, content: event.data.answer ?? message.content, sources: event.data.sources, action: event.data.proposedAction } : message));
          void client.invalidateQueries({ queryKey: ["chat", "conversations"] });
        }
      });
    } catch (err) {
      setMessages((items) => items.map((message) => message.id === assistantId ? { ...message, content: err instanceof Error ? err.message : "ARIA est indisponible." } : message));
    } finally {
      setIsSending(false);
    }
  };

  const decide = async (draft: ProposedAction, decision: "confirm" | "cancel") => {
    await api.post(`/chat/actions/${draft.id}/${decision}`);
    setMessages((items) => items.map((message) => message.action?.id === draft.id ? { ...message, action: undefined, content: `${message.content}\n\nAction ${decision === "confirm" ? "exécutée" : "annulée"}.` } : message));
    await Promise.all([
      client.invalidateQueries({ queryKey: keys.vacations }),
      client.invalidateQueries({ queryKey: keys.documentRequests }),
      client.invalidateQueries({ queryKey: keys.notifications }),
    ]);
  };

  return (
    <Stack spacing={4} h="calc(100vh - 118px)">
      <SectionHeader title="ARIA" subtitle="Assistant RH sécurisé." action={<IconButton aria-label="Nouvelle conversation" icon={<Plus size={18} />} onClick={() => { setConversationId(undefined); setMessages([]); }} />} />
      {!messages.length ? (
        <Stack spacing={3}>
          {prompts.map((prompt) => <Button key={prompt} variant="outline" whiteSpace="normal" h="auto" py={3} onClick={() => void send(prompt)}>{prompt}</Button>)}
          <Text fontSize="xs" fontWeight="900" color="gray.400" textTransform="uppercase">Chats récents</Text>
          {conversations.data?.slice(0, 10).map((conversation) => (
            <Button key={conversation.id} leftIcon={<MessageCircle size={16} />} justifyContent="flex-start" variant="ghost" onClick={() => void openConversation(conversation.id)}>
              <Text noOfLines={1}>{conversation.title || "Conversation ARIA"}</Text>
            </Button>
          ))}
        </Stack>
      ) : null}
      <Stack flex="1" overflowY="auto" spacing={4} pr={1}>
        {messages.map((message) => (
          <HStack key={message.id} justify={message.role === "user" ? "flex-end" : "flex-start"} align="flex-start">
            {message.role === "assistant" ? <Avatar icon={<Bot size={17} />} bg="brand.500" color="white" size="sm" /> : null}
            <Box maxW="82%" bg={message.role === "user" ? "brand.500" : "white"} color={message.role === "user" ? "white" : "gray.800"} borderRadius="22px" p={4} boxShadow={message.role === "assistant" ? "sm" : "none"}>
              {message.role === "assistant" ? <MarkdownMessage content={message.content || "…"} /> : <Text>{message.content}</Text>}
              {message.sources?.map((source) => (
                <HStack key={`${source.documentId}-${source.chunkOrder}`} mt={2} fontSize="xs" color="gray.500"><FileText size={13} /><Text>{source.title}</Text></HStack>
              ))}
              {message.action ? (
                <MobileCard mt={3} bg="brand.50" boxShadow="none" color="gray.800">
                  <Text fontSize="sm" fontWeight="900" mb={2}>{message.action.summary}</Text>
                  <HStack>
                    <Button size="sm" leftIcon={<Check size={14} />} onClick={() => void decide(message.action!, "confirm")}>Accepter</Button>
                    <Button size="sm" variant="outline" leftIcon={<X size={14} />} onClick={() => void decide(message.action!, "cancel")}>Annuler</Button>
                  </HStack>
                </MobileCard>
              ) : null}
            </Box>
            {message.role === "user" ? <Avatar icon={<User size={17} />} bg="gray.200" color="gray.700" size="sm" /> : null}
          </HStack>
        ))}
        {isSending ? <Text fontSize="xs" color="gray.500">ARIA réfléchit...</Text> : null}
        <div ref={bottom} />
      </Stack>
      <HStack>
        <Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder="Posez votre question RH..." bg="white" />
        <IconButton aria-label="Envoyer" icon={<Send size={18} />} isDisabled={!input.trim() || isSending} onClick={() => void send()} />
      </HStack>
    </Stack>
  );
}
