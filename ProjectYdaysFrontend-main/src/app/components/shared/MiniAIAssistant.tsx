import { useEffect, useRef, useState } from "react";
import { Bot, Check, Send, X } from "lucide-react";
import { api } from "../../api/client";
import { keys, useChatMutation } from "../../api/queries";
import { MarkdownMessage } from "./MarkdownMessage";
import { ProposedAction } from "../../api/types";
import { useQueryClient } from "@tanstack/react-query";

interface MiniMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: ProposedAction;
}

export function MiniAIAssistant({ onClose }: { onClose(): void }) {
  const [messages, setMessages] = useState<MiniMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [actionFiles, setActionFiles] = useState<Record<string, File | undefined>>({});
  const mutation = useChatMutation();
  const queryClient = useQueryClient();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const send = async () => {
    const question = input.trim();
    if (!question || mutation.isPending) return;
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", content: question }]);
    setInput("");
    try {
      const response = await mutation.mutateAsync({ question, conversationId });
      setConversationId(response.conversationId);
      setMessages((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          action: response.proposedAction,
        },
      ]);
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "ARIA est indisponible.",
        },
      ]);
    }
  };

  const decide = async (draft: ProposedAction, decision: "confirm" | "cancel") => {
    if (decision === "confirm" && actionFiles[draft.id]) {
      const form = new FormData();
      form.set("attachment", actionFiles[draft.id]!);
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
      queryClient.invalidateQueries({ queryKey: keys.vacations }),
      queryClient.invalidateQueries({ queryKey: ["document-requests"] }),
      queryClient.invalidateQueries({ queryKey: keys.notifications }),
    ]);
  };

  return (
    <section
      aria-label="Mini assistant ARIA"
      className="fixed bottom-4 right-4 z-[80] flex h-[min(620px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="flex items-center justify-between border-b p-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><Bot size={19} /></span>
          <div><h2 className="font-bold">ARIA</h2><p className="text-xs text-slate-500">Assistant IA</p></div>
        </div>
        <button aria-label="Fermer le mini assistant" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? <p className="pt-10 text-center text-sm text-slate-400">Posez votre question à ARIA.</p> : null}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
              {message.role === "assistant" ? <MarkdownMessage content={message.content} /> : message.content}
              {message.action ? (
                <div className="mt-3 space-y-2">
                  {message.action.payload.allowsAttachment ? <label className="block text-xs"><span className="mb-1 block font-semibold">Justificatif optionnel</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setActionFiles((files) => ({ ...files, [message.action!.id]: event.target.files?.[0] }))} /></label> : null}
                  <div className="flex gap-2">
                  <button onClick={() => void decide(message.action!, "confirm")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white"><Check size={14} /> Accepter</button>
                  <button onClick={() => void decide(message.action!, "cancel")} className="flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-2 text-xs text-slate-700"><X size={14} /> Annuler</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {mutation.isPending ? <p className="text-xs text-slate-400">ARIA réfléchit…</p> : null}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2 border-t p-3 dark:border-slate-800">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Écrivez un message…"
          className="flex-1 resize-none rounded-xl border p-3 outline-none focus:border-blue-500 dark:bg-slate-800"
        />
        <button aria-label="Envoyer" onClick={() => void send()} disabled={!input.trim() || mutation.isPending} className="grid w-12 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40"><Send size={18} /></button>
      </div>
    </section>
  );
}
