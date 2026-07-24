import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Trash2, Zap, BrainCircuit, Globe, Bot, User, ArrowRight, ExternalLink } from "lucide-react";
import { ChatMessage, BillData, BillResults } from "../types";
import MessageRenderer from "./MessageRenderer";
import { safeParse } from "../utils";

interface ChatBotProps {
  billData: BillData;
  results: BillResults;
}

const QUICK_QUESTIONS = [
  "¿Cómo puedo reducir mi potencia contratada?",
  "¿Qué horas son las más baratas en el PVPC?",
  "¿Qué es el Bono Social y quién tiene derecho?",
  "¿Me conviene cambiar a una tarifa del mercado libre?"
];

export default function ChatBot({ billData, results }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      role: "assistant",
      content: `¡Hola! Soy **GemProgramador Luz**, tu asesor virtual experto en optimización de facturas eléctricas y tarifas PVPC 2.0TD de España.

He analizado tu simulador actual y observo que tienes una factura estimada de **${results.totalFactura.toFixed(2)} €** por un periodo de **${results.dias} días** de consumo.

¿En qué puedo ayudarte hoy? Puedes preguntarme cosas como:
- *¿Cuál es el desglose de peajes y cargos de mi consumo?*
- *¿Cómo puedo ahorrar desplazando consumo en mis periodos?*
- *¿Está mi potencia contratada de ${billData.kwPunta} kW bien dimensionada?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState<string>("");
  const [mode, setMode] = useState<"normal" | "fast" | "thinking" | "grounded">("normal");
  const [loading, setLoading] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll the chat container to the bottom smoothly without shifting the entire webpage window
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText) return;

    if (!textToSend) setInput("");

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Gather active calculations for full AI context
      const fullBillContext = {
        ...billData,
        dias: results.dias,
        totalFijo: results.totalFijo,
        totalVariable: results.totalVariable,
        totalIee: results.totalIee,
        totalRegulados: results.totalRegulados,
        totalIva: results.totalIva,
        totalFactura: results.totalFactura
      };

      const sources = safeParse<import("../types").SourceFile[] | null>(localStorage.getItem('pvpc_sources'), []) || [];
      const historyEntries = safeParse<import("../types").HistoryEntry[] | null>(localStorage.getItem('pvpc_history'), []) || [];

      // Call Express API
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText,
          history: messages.slice(1).map(m => ({ role: m.role, content: m.content })),
          mode,
          billData: fullBillContext,
          sources,
          historyEntries
        }),
      });

      if (!response.ok) {
        throw new Error("Error en la conexión con el servidor del asesor.");
      }

      const responseData = await response.json();

      const assistantMsg: ChatMessage = {
        id: `msg-assistant-${Date.now()}`,
        role: "assistant",
        content: responseData.text,
        citations: responseData.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Disculpa, ha ocurrido un error al procesar tu consulta con Gemini. Detalle: ${msg || "Error del servidor."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "initial-welcome-reset",
        role: "assistant",
        content: `Asistente reiniciado. Cuéntame, ¿qué aspecto de tu factura eléctrica PVPC quieres optimizar ahora?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  return (
    <div id="chatbot-panel" className="flex flex-col h-[550px] border border-slate-200 dark:border-slate-800/60 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 shadow-3xs">
      
      {/* Chat Header with Mode Selector */}
      <div className="bg-slate-50 dark:bg-slate-950/80 p-4 border-b border-slate-150 dark:border-slate-800/60 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-widest font-sans">
            Asesor Virtual GemProgramador Luz
          </h3>
        </div>

        {/* Modes selectors */}
        <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl gap-1 shrink-0 border border-slate-300/30 dark:border-slate-700/50">
          <button
            onClick={() => setMode("normal")}
            className={`px-2.5 py-1 text-2xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              mode === "normal"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
            title="Modelo estándar equilibrado"
          >
            <Bot size={11} /> Equilibrado
          </button>

          <button
            onClick={() => setMode("fast")}
            className={`px-2.5 py-1 text-2xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              mode === "fast"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
            title="Respuestas veloces y directas"
          >
            <Zap size={11} /> Rápido
          </button>

          <button
            onClick={() => setMode("thinking")}
            className={`px-2.5 py-1 text-2xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              mode === "thinking"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
            title="Razonamiento lógico de alta intensidad"
          >
            <BrainCircuit size={11} /> Reflexión
          </button>

          <button
            onClick={() => setMode("grounded")}
            className={`px-2.5 py-1 text-2xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              mode === "grounded"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
            title="Conectado a Google Search"
          >
            <Globe size={11} /> Web
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold shadow-2xs ${
                msg.role === "user"
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-500/10 dark:bg-emerald-950 text-emerald-500 dark:text-emerald-300 border border-emerald-500/15"
              }`}
            >
              {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
            </div>

            {/* Message Bubble */}
            <div className="space-y-1">
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans ${
                  msg.role === "user"
                    ? "bg-emerald-500 text-white rounded-tr-none font-medium"
                    : "bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-150 dark:border-slate-800/40"
                }`}
              >
                {msg.role === "user" ? (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                ) : (
                  <MessageRenderer content={msg.content} />
                )}

                {/* Citations section if grounded mode returned URLs */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1 text-2xs">
                    <p className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 uppercase tracking-wider text-3xs">
                      <Globe size={10} /> Fuentes consultadas via Google Search:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.citations.map((cite, index) => (
                        <a
                          key={index}
                          href={cite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-lg border border-emerald-500/10 font-bold transition-all cursor-pointer"
                        >
                          <span className="truncate max-w-[120px]">{cite.title}</span>
                          <ExternalLink size={8} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className={`text-3xs text-slate-500 dark:text-slate-400 px-1 font-sans ${msg.role === "user" ? "text-right" : ""}`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}

        {/* Loading / Thinking State */}
        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-start">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-950 text-emerald-500 dark:text-emerald-300 border border-emerald-500/15 flex items-center justify-center shrink-0 shadow-2xs">
              <Bot size={13} className="animate-pulse" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl rounded-tl-none border border-slate-150 dark:border-slate-800/40 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-3xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest pl-1 font-sans">
                  {mode === "thinking"
                    ? "Razonando..."
                    : mode === "grounded"
                    ? "Buscando tarifas actualizadas en la web..."
                    : "Asesorando..."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Questions */}
      {!loading && messages.length < 5 && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-150 dark:border-slate-800/60 flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-3xs px-2.5 py-1 bg-white hover:bg-emerald-500/5 dark:bg-slate-800 dark:hover:bg-emerald-500/5 text-slate-600 hover:text-emerald-500 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-900 rounded-lg transition-all font-bold flex items-center gap-0.5 shadow-3xs cursor-pointer"
            >
              <span>{q}</span>
              <ArrowRight size={8} />
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Area */}
      <div className="p-3.5 border-t border-slate-150 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40 flex items-center gap-2.5">
        <button
          onClick={clearChat}
          className="p-2 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shrink-0 shadow-3xs cursor-pointer"
          title="Reiniciar conversación"
        >
          <Trash2 size={16} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={
            mode === "thinking"
              ? "Pregunta compleja sobre eficiencia (Modo Reflexión)..."
              : mode === "grounded"
              ? "Pregúntame sobre tarifas del mercado actual (Modo Web)..."
              : "Pregúntame cualquier duda de tu factura..."
          }
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-xs bg-slate-800 dark:bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-white dark:text-white shadow-inner"
        />

        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-all shrink-0 shadow-sm disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
