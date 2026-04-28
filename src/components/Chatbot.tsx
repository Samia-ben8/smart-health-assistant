import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

const WEBHOOK_URL = "http://localhost:5678/webhook/chat";

// ⚠️ session simple (à améliorer plus tard)
const SESSION_ID = "user_" + Math.random().toString(36).substring(2, 9);

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
        "Bonjour 👋 Je suis l'assistant du Cabinet Médical Intelligent.\n\nJe peux vous aider à :\n• Prendre un rendez-vous\n• Modifier un rendez-vous\n• Répondre à vos questions\n Quel est votre nom et prénom",
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

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

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
        content:
          data.reply || "Je n'ai pas compris, pouvez-vous reformuler ?",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Erreur de connexion au serveur. Vérifiez que n8n et le backend sont lancés.",
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
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <MessageCircle size={28} className="text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] bg-card rounded-2xl shadow-chat border flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-hero px-5 py-4 flex justify-between">
              <div className="flex items-center gap-2">
                <Bot size={18} />
                <span className="text-sm text-white">Assistant Médical</span>
              </div>
              <button onClick={onToggle}>
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : ""}`}>
                  <div className="max-w-[70%] bg-muted p-3 rounded-xl text-sm">
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && <div className="text-sm text-gray-400">...</div>}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre message..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={sendMessage} disabled={loading}>
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