import { useEffect, useRef, useState } from "react";
import { Avatar, Badge, Box, Button, HStack, IconButton, Input, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Bot, Check, FileText, MessageCircle, Plus, Send, User, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { keys } from "@/api/queries";
import { ChatConversationDetail, ChatConversationSummary, ChatSource, ProposedAction } from "@/api/types";
import { MarkdownMessage } from "./MarkdownMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  action?: ProposedAction;
  refused?: boolean;
}

const prompts = [
  "Résume le règlement intérieur en tableau",
  "Combien de jours de congés me restent-ils ?",
  "Prépare une demande de document",
  "Explique mon parcours onboarding",
];

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [openingId, setOpeningId] = useState<string>();
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const bottom = useRef<HTMLDivElement>(null);
  const client = useQueryClient();
  const conversationsQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => api.get<ChatConversationSummary[]>("/chat/conversations"),
  });

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const startNewChat = () => {
    setConversationId(undefined);
    setMessages([]);
    setInput("");
  };

  const openConversation = async (id: string) => {
    if (openingId || id === conversationId) return;
    setOpeningId(id);
    try {
      const conversation = await api.get<ChatConversationDetail>(`/chat/conversations/${id}`);
      setConversationId(conversation.id);
      setMessages(
        conversation.messages
          .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
          .map((message) => ({
            id: message.id,
            role: message.role === "USER" ? "user" : "assistant",
            content: message.content,
            sources: message.sources,
          })),
      );
    } finally {
      setOpeningId(undefined);
    }
  };

  const send = async (question = input.trim()) => {
    if (!question || isSending) return;
    const assistantId = crypto.randomUUID();
    setMessages((items) => [
      ...items,
      { id: crypto.randomUUID(), role: "user", content: question },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setIsSending(true);
    try {
      await api.streamChat({ question, conversationId }, (event) => {
        if (event.type === "token") {
          setMessages((items) =>
            items.map((message) =>
              message.id === assistantId
                ? { ...message, content: `${message.content}${event.data.content ?? ""}` }
                : message,
            ),
          );
        }
        if (event.type === "done") {
          setConversationId(event.data.conversationId);
          setMessages((items) =>
            items.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: event.data.answer ?? message.content,
                    sources: event.data.sources,
                    action: event.data.proposedAction,
                    refused: event.data.refused,
                  }
                : message,
            ),
          );
          void client.invalidateQueries({ queryKey: ["chat", "conversations"] });
        }
      });
    } catch (error) {
      setMessages((items) =>
        items.map((message) =>
          message.id === assistantId
            ? { ...message, content: error instanceof Error ? error.message : "ARIA est indisponible." }
            : message,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const action = async (draft: ProposedAction, decision: "confirm" | "cancel") => {
    if (decision === "confirm" && files[draft.id]) {
      const form = new FormData();
      form.set("attachment", files[draft.id]!);
      await api.post(`/chat/actions/${draft.id}/confirm`, form);
    } else {
      await api.post(`/chat/actions/${draft.id}/${decision}`);
    }
    setMessages((items) =>
      items.map((message) =>
        message.action?.id === draft.id
          ? {
              ...message,
              action: undefined,
              content: `${message.content}\n\nAction ${decision === "confirm" ? "exécutée" : "annulée"}.`,
            }
          : message,
      ),
    );
    await Promise.all([
      client.invalidateQueries({ queryKey: keys.vacations }),
      client.invalidateQueries({ queryKey: ["document-requests"] }),
      client.invalidateQueries({ queryKey: keys.notifications }),
    ]);
  };

  return (
    <Box
      h="calc(100vh - 150px)"
      display="grid"
      gridTemplateColumns={{ base: "1fr", xl: "320px 1fr" }}
      bg="white"
      borderRadius="20px"
      boxShadow="0 18px 40px rgba(112,144,176,.12)"
      overflow="hidden"
    >
      <Box display={{ base: "none", xl: "block" }} bg="app.bg" borderRightWidth="1px" borderColor="app.border" p={6} overflowY="auto">
        <Avatar bg="brand.500" icon={<Bot size={25} />} />
        <Text fontSize="3xl" fontWeight="900" mt={4}>ARIA</Text>
        <Text color="gray.500" fontSize="sm">Assistant RH sécurisé connecté aux données autorisées.</Text>
        <Button mt={6} w="100%" leftIcon={<Plus size={16} />} onClick={startNewChat}>Nouvelle conversation</Button>
        <Stack mt={6}>
          {prompts.map((prompt) => (
            <Button key={prompt} variant="outline" justifyContent="flex-start" whiteSpace="normal" h="auto" py={3} onClick={() => void send(prompt)}>
              {prompt}
            </Button>
          ))}
        </Stack>
        <Box mt={8}>
          <Text fontSize="xs" fontWeight="900" color="gray.400" textTransform="uppercase" mb={3}>Chats récents</Text>
          <Stack spacing={2}>
            {conversationsQuery.data?.length ? conversationsQuery.data.map((conversation) => (
              <Button
                key={conversation.id}
                variant={conversation.id === conversationId ? "solid" : "ghost"}
                justifyContent="flex-start"
                leftIcon={<MessageCircle size={15} />}
                whiteSpace="normal"
                h="auto"
                py={3}
                onClick={() => void openConversation(conversation.id)}
                isLoading={openingId === conversation.id}
              >
                <Box textAlign="left" minW={0}>
                  <Text noOfLines={1}>{conversation.title || "Conversation ARIA"}</Text>
                  <Text fontSize="xs" opacity={0.7}>
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </Text>
                </Box>
              </Button>
            )) : <Text fontSize="sm" color="gray.500">Aucun historique pour le moment.</Text>}
          </Stack>
        </Box>
      </Box>
      <Box display="flex" flexDirection="column" minH={0}>
        <Box p={5} borderBottomWidth="1px" borderColor="app.border">
          <Text fontWeight="900" fontSize="lg">Conversation RH</Text>
          <Text fontSize="sm" color="gray.500">Politiques, congés, documents, onboarding et actions assistées.</Text>
        </Box>
        <Box flex="1" overflowY="auto" p={5} bg="app.bg">
          {messages.length === 0 ? (
            <Stack minH="100%" align="center" justify="center">
              <Avatar bg="brand.500" icon={<Bot size={32} />} size="xl" />
              <Text fontSize="2xl" fontWeight="900">Comment puis-je aider ?</Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} w="100%" maxW="760px">
                {prompts.map((prompt) => <Button key={prompt} variant="outline" onClick={() => void send(prompt)}>{prompt}</Button>)}
              </SimpleGrid>
            </Stack>
          ) : null}
          <Stack spacing={4}>
            {messages.map((message) => (
              <Stack key={message.id} direction={message.role === "user" ? "row-reverse" : "row"} align="flex-start">
                <Avatar
                  bg={message.role === "assistant" ? "brand.500" : "gray.200"}
                  color={message.role === "assistant" ? "white" : "gray.700"}
                  icon={message.role === "assistant" ? <Bot size={18} /> : <User size={18} />}
                />
                <Box
                  maxW="82%"
                  p={4}
                  borderRadius="18px"
                  bg={message.role === "assistant" ? "white" : "brand.500"}
                  color={message.role === "assistant" ? "gray.800" : "white"}
                >
                  {message.role === "assistant" ? <MarkdownMessage content={message.content || "…"} /> : <Text>{message.content}</Text>}
                  {message.sources?.map((source) => (
                    <HStack key={`${source.documentId}-${source.chunkOrder}`} mt={2} fontSize="xs" color="gray.500">
                      <FileText size={14} />
                      <Text>{source.title}</Text>
                    </HStack>
                  ))}
                  {message.action ? (
                    <Box mt={3} bg="brand.50" p={3} borderRadius="14px" color="gray.800">
                      {message.action.payload?.formData && typeof message.action.payload.formData === "object" ? (
                        <Stack mb={3} spacing={1}>
                          <Text fontSize="xs" fontWeight="900" color="gray.500">Informations capturées</Text>
                          {Object.entries(message.action.payload.formData as Record<string, unknown>).map(([key, value]) => (
                            <Text key={key} fontSize="sm">
                              <Text as="span" fontWeight="800">{String((message.action?.payload?.formDataLabels as Record<string, unknown> | undefined)?.[key] ?? key).replace(/[[\]]/g, "")}</Text>: {value === true ? "fourni (sensible)" : String(value)}
                            </Text>
                          ))}
                        </Stack>
                      ) : null}
                      <Button as="label" size="sm" variant="outline">
                        Justificatif optionnel
                        <Input hidden type="file" onChange={(event) => setFiles((value) => ({ ...value, [message.action!.id]: event.target.files?.[0] }))} />
                      </Button>
                      <HStack mt={2}>
                        <Button size="sm" leftIcon={<Check size={15} />} onClick={() => void action(message.action!, "confirm")}>Accepter</Button>
                        <Button size="sm" variant="outline" leftIcon={<X size={15} />} onClick={() => void action(message.action!, "cancel")}>Annuler</Button>
                      </HStack>
                    </Box>
                  ) : null}
                </Box>
              </Stack>
            ))}
            {isSending ? <Text fontSize="xs" color="gray.500">ARIA réfléchit...</Text> : null}
            <div ref={bottom} />
          </Stack>
        </Box>
        <HStack p={4} borderTopWidth="1px" borderColor="app.border">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void send(); }}
            placeholder="Posez votre question RH..."
          />
          <IconButton aria-label="Envoyer" icon={<Send size={18} />} onClick={() => void send()} isDisabled={!input.trim() || isSending} />
        </HStack>
      </Box>
    </Box>
  );
}
