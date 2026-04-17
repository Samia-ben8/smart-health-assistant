import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

const WEBHOOK_URL = "http://localhost:5678/webhook-test/chat";
const SESSION_ID = "user123";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Chatbot = ({ isOpen, onToggle }: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour ! 👋 Je suis l'assistant du Cabinet Médical Intelligent. Comment puis-je vous aider aujourd'hui ?\n\nVous pouvez me demander de :\n• Prendre un rendez-vous\n• Modifier un rendez-vous existant\n• Poser une question médicale",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: SESSION_ID,
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || data.message || data.output || "Je n'ai pas compris. Pouvez-vous reformuler ?",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Désolé, je ne suis pas disponible pour le moment. Veuillez réessayer plus tard ou nous contacter par téléphone.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={onToggle}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity animate-float"
          >
            <MessageCircle size={28} className="text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-card rounded-2xl shadow-chat border border-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-hero px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot size={20} className="text-primary-foreground" />
                </div>
                <div>
                  <div className="text-primary-foreground font-semibold text-sm">Assistant Médical</div>
                  <div className="text-primary-foreground/70 text-xs">En ligne</div>
                </div>
              </div>
              <button onClick={onToggle} className="text-primary-foreground/80 hover:text-primary-foreground">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
                      msg.role === "assistant" ? "bg-accent" : "bg-gradient-hero"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot size={14} className="text-primary" />
                    ) : (
                      <User size={14} className="text-primary-foreground" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-muted text-foreground rounded-tl-sm"
                        : "bg-gradient-hero text-primary-foreground rounded-tr-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full shrink-0 bg-accent flex items-center justify-center">
                    <Bot size={14} className="text-primary" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-soft" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-soft [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-soft [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
