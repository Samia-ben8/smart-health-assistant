import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import SlotPicker from "./SlotPicker";

const CHAT_URL = "http://localhost:8000/chat";
const SLOT_MARKER = "[SLOT_PICKER]";

// Persistante entre rechargements pour préserver l'état serveur
const getSessionId = () => {
  if (typeof window === "undefined") return "user_" + Math.random().toString(36).slice(2, 9);
  let sid = localStorage.getItem("chat_session_id");
  if (!sid) {
    sid = "user_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("chat_session_id", sid);
  }
  return sid;
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  showSlotPicker?: boolean;
  slotPickerUsed?: boolean;
}

interface ChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Chatbot = ({ isOpen, onToggle }: ChatbotProps) => {
  const [sessionId] = useState(getSessionId);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour 👋 Je suis l'assistant du Cabinet Médical Intelligent.\n\nJe peux vous aider à :\n• Prendre un rendez-vous\n• Modifier un rendez-vous\n• Répondre à vos questions\n\nQuel est votre nom et prénom ?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const postToBackend = async (rawMessage: string) => {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: rawMessage, session_id: sessionId }),
    });
    if (!res.ok) throw new Error("Erreur serveur");
    return res.json();
  };

  const appendAssistantReply = (data: any) => {
    const raw: string = data.response ?? data.reply ?? "Je n'ai pas compris, pouvez-vous reformuler ?";
    const showSlotPicker = raw.includes(SLOT_MARKER) || data.action === "pick_slot";
    const clean = raw.replace(SLOT_MARKER, "").trim();

    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: clean,
        showSlotPicker,
      },
    ]);
  };

  const sendMessage = async (overrideText?: string, displayText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayText ?? text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (overrideText === undefined) setInput("");
    setLoading(true);

    try {
      const data = await postToBackend(text);
      appendAssistantReply(data);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Erreur de connexion au serveur. Vérifiez que le backend est lancé sur http://localhost:8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelected = (msgId: string, date: string, time: string) => {
    // Verrouille le picker utilisé
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, slotPickerUsed: true } : m)),
    );
    const display = `📅 ${format(new Date(date), "EEEE d MMMM yyyy", { locale: fr })} à ${time}`;
    sendMessage(JSON.stringify({ date, time }), display);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={onToggle}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <MessageCircle size={28} className="text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] bg-card rounded-2xl shadow-chat border flex flex-col overflow-hidden">
            <div className="bg-gradient-hero px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                <Bot size={18} />
                <span className="text-sm">Assistant Médical</span>
              </div>
              <button onClick={onToggle} className="text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className={`flex ${msg.role === "user" ? "justify-end" : ""}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {msg.showSlotPicker && (
                    <SlotPicker
                      disabled={msg.slotPickerUsed}
                      onSelect={(date, time) => handleSlotSelected(msg.id, date, time)}
                    />
                  )}
                </div>
              ))}

              {loading && <div className="text-sm text-muted-foreground">...</div>}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre message..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading}
                className="bg-primary text-primary-foreground rounded-lg px-3 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
