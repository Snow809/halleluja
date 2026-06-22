import { useEffect, useRef, useState } from "react";
import { Bot, Check, Send, User, X } from "lucide-react";
import { api } from "../../api/client";
import { useChatMutation } from "../../api/queries";
import { ChatSource, ProposedAction } from "../../api/types";
import { MarkdownMessage } from "./MarkdownMessage";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "../../api/queries";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  action?: ProposedAction;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [actionFiles, setActionFiles] = useState<Record<string, File | undefined>>({});
  const mutation = useChatMutation();
  const queryClient = useQueryClient();
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const send = async (question = input.trim()) => {
    if (!question || mutation.isPending) return;
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", content: question }]);
    setInput("");
    try {
      const response = await mutation.mutateAsync({ question, conversationId });
      setConversationId(response.conversationId);
      setMessages((items) => [...items, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        action: response.proposedAction,
      }]);
    } catch (error) {
      setMessages((items) => [...items, { id: crypto.randomUUID(), role: "assistant", content: error instanceof Error ? error.message : "ARIA est indisponible." }]);
    }
  };

  const action = async (draft: ProposedAction, decision: "confirm" | "cancel") => {
    if (decision === "confirm" && actionFiles[draft.id]) {
      const form = new FormData();
      form.set("attachment", actionFiles[draft.id]!);
      await api.post(`/chat/actions/${draft.id}/confirm`, form);
    } else {
      await api.post(`/chat/actions/${draft.id}/${decision}`);
    }
    setMessages((items) => items.map((message) => message.action?.id === draft.id ? { ...message, action: undefined, content: `${message.content}\n\nAction ${decision === "confirm" ? "exécutée" : "annulée"}.` } : message));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.vacations }),
      queryClient.invalidateQueries({ queryKey: ["document-requests"] }),
      queryClient.invalidateQueries({ queryKey: keys.notifications }),
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-150px)] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 overflow-hidden">
      <div className="p-5 border-b dark:border-slate-800 flex items-center gap-3"><div className="p-3 rounded-2xl bg-blue-600 text-white"><Bot /></div><div><h1 className="font-bold text-xl">ARIA</h1><p className="text-xs text-slate-500">Assistant RH sécurisé</p></div></div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-9 h-9 rounded-xl grid place-items-center ${message.role === "assistant" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>{message.role === "assistant" ? <Bot size={17} /> : <User size={17} />}</div>
            <div className={`max-w-[80%] rounded-2xl p-4 whitespace-pre-wrap ${message.role === "assistant" ? "bg-slate-50 dark:bg-slate-800" : "bg-blue-600 text-white"}`}>
              {message.role === "assistant" ? (
                <div className="text-sm"><MarkdownMessage content={message.content} /></div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              {message.sources?.length ? <section aria-label="Sources de la réponse" className="mt-3 pt-3 border-t text-xs opacity-75">{message.sources.map((source) => <div role="doc-biblioentry" key={`${source.documentId}-${source.chunkOrder}`}>Source : {source.title}</div>)}</section> : null}
              {message.action ? <div className="mt-4 space-y-2">{message.action.payload.allowsAttachment ? <label className="block text-xs"><span className="mb-1 block font-semibold">Justificatif optionnel (PDF/JPG/PNG)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setActionFiles((files) => ({ ...files, [message.action!.id]: event.target.files?.[0] }))} /></label> : null}<div className="flex gap-2"><button onClick={() => void action(message.action!, "confirm")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white flex gap-1"><Check size={15} /> Accepter</button><button onClick={() => void action(message.action!, "cancel")} className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 flex gap-1"><X size={15} /> Annuler</button></div></div> : null}
            </div>
          </div>
        ))}
        {mutation.isPending ? <div className="text-sm text-slate-500">ARIA réfléchit…</div> : null}
        <div ref={bottom} />
      </div>
      <div className="p-4 border-t dark:border-slate-800 flex gap-3">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} className="flex-1 resize-none rounded-2xl border p-3 dark:bg-slate-800" rows={1} placeholder="Posez votre question RH…" />
        <button onClick={() => void send()} disabled={!input.trim() || mutation.isPending} className="w-12 rounded-2xl bg-blue-600 text-white grid place-items-center disabled:opacity-40"><Send size={18} /></button>
      </div>
    </div>
  );
}
