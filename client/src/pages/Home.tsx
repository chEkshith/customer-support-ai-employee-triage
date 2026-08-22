import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { AlertTriangle, ArrowUpRight, Bot, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; meta?: any };

const suggestions = ["How do I download an invoice?", "The API request is timing out", "I cannot log in to my account"];

export default function Home() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chat = trpc.support.chat.useMutation({
    onSuccess: (result) => {
      setConversationId(result.conversationId);
      setMessages((current) => [...current, { role: "assistant", content: result.answer, meta: result }]);
    },
  });
  const reset = trpc.support.reset.useMutation({ onSuccess: () => { setConversationId(undefined); setMessages([]); } });
  const send = (value = input) => { const trimmed = value.trim(); if (!trimmed || chat.isPending) return; setMessages((current) => [...current, { role: "user", content: trimmed }]); setInput(""); chat.mutate({ message: trimmed, conversationId }); };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><div><strong>SupportPilot</strong><span>Tier-1 support intelligence</span></div></div><div className="top-actions"><span className="status"><i /> Local & grounded</span><button className="reset-button" onClick={() => conversationId ? reset.mutate({ conversationId }) : setMessages([])}><RotateCcw size={15} /> New conversation</button></div></header>
    <section className="workspace">
      <div className="intro"><div className="eyebrow"><ShieldCheck size={15} /> SAFE BY DESIGN</div><h1>Support, with<br /><em>receipts.</em></h1><p>Ask a question and get a clear, source-grounded answer. When the evidence is not enough, SupportPilot knows when to bring in a human.</p><div className="guardrail"><div className="guardrail-icon"><Bot size={18} /></div><div><strong>Tier-1 boundaries</strong><span>No refunds, account changes, or invented answers.</span></div></div></div>
      <div className="chat-card"><div className="chat-head"><div><span className="section-kicker">SUPPORTPILOT ASSISTANT</span><h2>How can we help?</h2></div><span className="secure-pill"><i /> Secure session</span></div><div className="chat-body">
        {messages.length === 0 && <div className="empty"><div className="empty-orb"><Sparkles size={22} /></div><h3>What can I help you find?</h3><p>Try one of these common questions to see grounded support in action.</p><div className="suggestions">{suggestions.map((item) => <button key={item} onClick={() => send(item)}>{item}<ArrowUpRight size={14} /></button>)}</div></div>}
        {messages.map((message, index) => <div key={index} className={`message-row ${message.role}`}><div className="avatar">{message.role === "assistant" ? <Sparkles size={15} /> : "Y"}</div><div className="message-content"><div className="message-label">{message.role === "assistant" ? "SupportPilot" : "You"}</div><div className="bubble">{message.content}</div>{message.meta && <div className="response-meta"><div className="meta-line"><span className={`badge ${message.meta.category === "Other / Out of Scope" ? "other" : "good"}`}>{message.meta.category}</span><span className="confidence">{Math.round(message.meta.confidence * 100)}% confidence</span></div>{message.meta.sources?.length > 0 && <div className="sources"><span>Sources</span>{message.meta.sources.map((source: any) => <span className="source" key={source.sourceId}>{source.sourceId}</span>)}</div>}{message.meta.escalated && <div className="escalation"><AlertTriangle size={16} /><div><strong>Human review recommended</strong><span>{message.meta.escalationReasonMessage}</span></div></div>}</div>}</div></div>)}
        {chat.isPending && <div className="typing"><div className="avatar"><Sparkles size={15} /></div><div className="typing-dots"><i /><i /><i /></div></div>}
        {chat.isError && <div className="error-state">We couldn’t process that message. Please try again.</div>}
      </div><form className="composer" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about billing, access, or a technical issue..." aria-label="Support message" /><button disabled={!input.trim() || chat.isPending} aria-label="Send message"><ArrowUpRight size={19} /></button></form><div className="composer-note"><ShieldCheck size={13} /> Responses are grounded in the SupportPilot knowledge base</div></div>
    </section><footer><span>SUPPORTPILOT / DEMO ENVIRONMENT</span><span>AI-assisted · Human-supervised</span></footer>
  </main>;
}
