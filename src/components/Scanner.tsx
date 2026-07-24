import React, { useState, useRef } from "react";
import { FileText, Upload, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { BillData } from "../types";

interface ScannerProps {
  onScanSuccess: (data: Partial<BillData>, explanation: string) => void;
}

// Sample mock base64 of a generic tiny transparent pixel or simple vector to send if they click Demo Scan
const SIMPLE_MOCK_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function Scanner({ onScanSuccess }: ScannerProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag listeners
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/") && selectedFile.type !== "application/pdf") {
      setError("Por favor, sube un archivo de imagen (PNG, JPG) o un documento PDF.");
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setFile(selectedFile);

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null); // No preview for PDF
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccessMsg(null);
  };

  // Perform Gemini analysis on selected file or a demo document
  const analyzeWithGemini = async (isDemo = false) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Dynamic state messages for improved UX
    const messages = [
      "Subiendo archivo de factura...",
      "Iniciando Gemini 3.1 Pro...",
      "Leyendo cabecera y fechas de la factura...",
      "Analizando término de potencia contratada (kW)...",
      "Calculando peajes y consumos activos en Punta, Llano y Valle (kWh)...",
      "Revisando impuestos, alquiler de contador e importes finales...",
      "Generando informe detallado de auditoría PVPC...",
    ];

    let msgIndex = 0;
    setStatusText(messages[0]);
    const interval = setInterval(() => {
      if (msgIndex < messages.length - 1) {
        msgIndex++;
        setStatusText(messages[msgIndex]);
      }
    }, 1500);

    try {
      let base64Data = "";
      let mimeType = "image/png";

      if (isDemo) {
        base64Data = SIMPLE_MOCK_BASE64;
        mimeType = "image/png";
      } else {
        if (!file) throw new Error("No hay ningún archivo seleccionado.");
        
        // Convert selected file to Base64
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data:image/...;base64, prefix
            const commaIndex = result.indexOf(",");
            resolve(result.substring(commaIndex + 1));
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
        mimeType = file.type;
      }

      // API Call
      const response = await fetch("/api/audit/scan-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data, mimeType }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Fallo en la comunicación con el servidor de IA.");
      }

      const data = await response.json();

      clearInterval(interval);
      setLoading(false);
      
      // Notify parent component with parsed data
      onScanSuccess(
        {
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          kwPunta: Number(data.kwPunta) || 4.4,
          kwValle: Number(data.kwValle) || 4.4,
          kwhPunta: Number(data.kwhPunta) || 0,
          kwhLlano: Number(data.kwhLlano) || 0,
          kwhValle: Number(data.kwhValle) || 0,
          presupuesto: data.costeTotal ? Math.ceil(data.costeTotal * 1.2) : 100,
        },
        data.explicacion
      );

      setSuccessMsg(`Factura escaneada con éxito. Tipo de mercado detectado: ${data.esPVPC ? "PVPC (Regulado)" : "Mercado Libre"}.`);
    } catch (err: unknown) {
      clearInterval(interval);
      setLoading(false);
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al escanear la factura. Inténtalo de nuevo.");
    }
  };

  return (
    <div id="scanner-panel" className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/5"
            : "border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50"
        }`}
        onClick={file ? undefined : triggerFileInput}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />

        {file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-500 dark:text-emerald-400">
              <FileText size={24} />
              <span className="font-bold text-sm font-sans truncate max-w-[250px]">{file.name}</span>
            </div>
            {previewUrl && (
              <div className="mx-auto max-w-[150px] max-h-[150px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                <img
                  src={previewUrl}
                  alt="Factura subida"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="flex justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg transition-colors font-bold cursor-pointer"
              >
                Eliminar
              </button>
              {!loading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    analyzeWithGemini();
                  }}
                  className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg transition-all font-bold flex items-center gap-1 shadow-sm shadow-emerald-500/10 cursor-pointer"
                >
                  <Sparkles size={12} /> Analizar Factura
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex flex-col items-center">
            <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full text-emerald-500">
              <Upload size={24} />
            </div>
            <p className="font-bold text-sm text-slate-700 dark:text-slate-200 font-sans">
              Arrastra tu factura aquí o <span className="text-emerald-500 dark:text-emerald-400 underline font-extrabold">búscala</span>
            </p>
            <p className="text-3xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Admite fotos, capturas de pantalla o PDF de tu última factura
            </p>
          </div>
        )}
      </div>

      {/* Instant Action Options */}
      {!file && !loading && (
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/20 p-3 rounded-xl border border-slate-150 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Sparkles size={14} className="text-emerald-500 shrink-0" />
            <span className="font-sans">¿No tienes una factura a mano?</span>
          </div>
          <button
            onClick={() => analyzeWithGemini(true)}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-950/40 dark:hover:bg-slate-950/80 text-emerald-500 dark:text-emerald-400 border border-slate-200 dark:border-slate-850 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            Prueba Escaneo Demo con IA
          </button>
        </div>
      )}

      {/* Loading States */}
      {loading && (
        <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <Loader2 className="text-emerald-500 animate-spin shrink-0" size={20} />
          <div className="space-y-1">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-sans">
              Procesando factura con Gemini 3.1 Pro...
            </p>
            <p className="text-3xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-450">
              {statusText}
            </p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-sans">
              ¡Lectura de Factura Exitosa!
            </p>
            <p className="text-2xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans">
              {successMsg} El formulario se ha pre-rellenado con los datos extraídos de la factura para que puedas auditarla de inmediato.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/5 dark:bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 font-sans">
              Error de análisis
            </p>
            <p className="text-2xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans">
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
