import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { X } from "lucide-react";
import type { ContentLang } from "@/data/portfolioContent";
import { sendContactMessage } from "@/lib/contact";

export type ContactLang = ContentLang;
type ContactTopic = "project" | "music" | "recommendation" | "collaboration" | "other";

const TOPICS: ContactTopic[] = ["project", "music", "recommendation", "collaboration", "other"];

interface Copy {
  title: string;
  lead: string;
  name: string;
  email: string;
  topic: string;
  topics: Record<ContactTopic, string>;
  message: string;
  messagePlaceholder: string;
  send: string;
  sending: string;
  sent: string;
  error: string;
  close: string;
  senderFallback: string;
}

const COPY: Record<ContactLang, Copy> = {
  pt: {
    title: "Ative sua linha",
    lead: "Me conte o que você quer construir: produto, música, pesquisa, design system ou uma ideia que ainda precisa ganhar trilho.",
    name: "Nome",
    email: "E-mail",
    topic: "Assunto",
    topics: {
      project: "Projeto",
      music: "Música",
      recommendation: "Recomendação",
      collaboration: "Colaboração",
      other: "Outro",
    },
    message: "Mensagem",
    messagePlaceholder: "Chegue com uma ideia e a gente desenha o resto...",
    send: "enviar",
    sending: "Enviando...",
    sent: "Mensagem enviada! Logo te respondo.",
    error: "Não consegui enviar agora. Tenta novamente em instantes.",
    close: "Fechar formulário",
    senderFallback: "Contato",
  },
  en: {
    title: "Activate your line",
    lead: "Tell me what you want to build: product, music, research, design systems or an idea that still needs a route.",
    name: "Name",
    email: "Email",
    topic: "Topic",
    topics: {
      project: "Project",
      music: "Music",
      recommendation: "Recommendation",
      collaboration: "Collaboration",
      other: "Other",
    },
    message: "Message",
    messagePlaceholder: "Bring an idea and we'll draw the rest...",
    send: "send",
    sending: "Sending...",
    sent: "Message sent! I'll get back to you soon.",
    error: "Couldn't send right now. Try again in a moment.",
    close: "Close form",
    senderFallback: "Contact",
  },
};

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  language?: ContactLang;
  accent?: string;
}

export function ContactModal({
  open,
  onClose,
  language = "pt",
  accent = "#8a78a8",
}: ContactModalProps) {
  const copy = COPY[language] ?? COPY.pt;
  const ids = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState<ContactTopic>("project");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const selectedTopic = copy.topics[topic] ?? copy.topics.project;

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const botcheck = String(data.get("botcheck") ?? "").trim();
    const subject = `[MATS Subway] ${selectedTopic} - ${name || copy.senderFallback}`;

    setStatus("sending");
    try {
      const result = await sendContactMessage({
        subject,
        name,
        email,
        topic: selectedTopic,
        message,
        botcheck,
      });
      if (result.success) {
        setStatus("sent");
        window.setTimeout(onClose, 1600);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="contact-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${ids}-title`}
      aria-describedby={`${ids}-lead`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="contact-panel"
        onSubmit={handleSubmit}
        style={{ "--contact-accent": accent } as CSSProperties}
      >
        <button type="button" className="contact-close" onClick={onClose} aria-label={copy.close}>
          <X className="h-4 w-4" />
        </button>

        <h2 id={`${ids}-title`} className="contact-title">
          {copy.title}
        </h2>
        <p id={`${ids}-lead`} className="contact-lead">
          {copy.lead}
        </p>
        <input
          type="checkbox"
          name="botcheck"
          tabIndex={-1}
          autoComplete="off"
          style={{ display: "none" }}
          aria-hidden="true"
        />

        <div className="contact-grid">
          <label className="contact-field">
            <span>{copy.name}</span>
            <input ref={firstFieldRef} name="name" type="text" autoComplete="name" required />
          </label>
          <label className="contact-field">
            <span>{copy.email}</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
        </div>

        <label className="contact-field">
          <span>{copy.topic}</span>
          <div className="contact-topics" role="radiogroup" aria-label={copy.topic}>
            {TOPICS.map((topicKey) => (
              <button
                key={topicKey}
                type="button"
                role="radio"
                aria-checked={topic === topicKey}
                className={`contact-chip${topic === topicKey ? " is-active" : ""}`}
                onClick={() => setTopic(topicKey)}
              >
                {copy.topics[topicKey]}
              </button>
            ))}
          </div>
        </label>

        <label className="contact-field">
          <span>{copy.message}</span>
          <textarea name="message" rows={4} required placeholder={copy.messagePlaceholder} />
        </label>

        <button
          type="submit"
          className="contact-submit"
          disabled={status === "sending" || status === "sent"}
        >
          {status === "sending" ? copy.sending : copy.send}
        </button>
        {status === "sent" && (
          <p className="contact-status contact-status-ok" role="status">
            {copy.sent}
          </p>
        )}
        {status === "error" && (
          <p className="contact-status contact-status-error" role="alert">
            {copy.error}
          </p>
        )}
      </form>
    </div>
  );
}
