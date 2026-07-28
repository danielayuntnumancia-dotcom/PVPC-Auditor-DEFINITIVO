import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Bot, 
  Calendar, 
  Zap, 
  TrendingUp, 
  FileText, 
  UploadCloud, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  ChevronLeft,
  Folder,
  AlertTriangle, 
  Check, 
  X, 
  Send,
  History,
  Save,
  ArrowLeft,
  Scale,
  BarChart2,
  Edit3,
  Paperclip,
  Image
} from 'lucide-react';
import { BillData, BillResults, SourceFile, ChatMessage, HistoryEntry, MarketAnalysisData, MarketOffer } from './types';
import { calcularFactura, DEFAULT_PVPC_VALUES, formatDate, validateBillData, safeParse, deepClone, downloadFile } from './utils';
import BillChart from './components/BillChart';
import ComparisonChart from './components/ComparisonChart';
import CustomDatePicker from './components/CustomDatePicker';
import MessageRenderer from './components/MessageRenderer';
import { 
  db, 
  auth, 
  isFirebaseConfigured, 
  handleFirestoreError, 
  OperationType,
  loginWithGoogle,
  logoutUser
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function parseMesFacturacionInfo(mesFacturacion?: string) {
  if (!mesFacturacion) return { year: 0, monthIndex: -1 };
  const clean = mesFacturacion.toLowerCase().trim();
  
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  
  let monthIndex = -1;
  if (clean.includes('enero')) monthIndex = 0;
  else if (clean.includes('febrero')) monthIndex = 1;
  else if (clean.includes('marzo')) monthIndex = 2;
  else if (clean.includes('abril')) monthIndex = 3;
  else if (clean.includes('mayo')) monthIndex = 4;
  else if (clean.includes('junio')) monthIndex = 5;
  else if (clean.includes('julio')) monthIndex = 6;
  else if (clean.includes('agosto')) monthIndex = 7;
  else if (clean.includes('septiembre') || clean.includes('setiembre')) monthIndex = 8;
  else if (clean.includes('octubre')) monthIndex = 9;
  else if (clean.includes('noviembre')) monthIndex = 10;
  else if (clean.includes('diciembre')) monthIndex = 11;
  
  return { year, monthIndex };
}

export default function App() {
  // --- ESTADOS GLOBALES DE NAVEGACIÓN Y SECCIÓN ---
  const [activeSection, setActiveSection] = useState<'calculadora' | 'ia' | 'historial' | 'comparador'>('calculadora');
  const [selectedHistoryEntryId, setSelectedHistoryEntryId] = useState<string | null>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [isAdvancedPricesOpen, setIsAdvancedPricesOpen] = useState<boolean>(false);
  const [isAdvancedFixedPricesOpen, setIsAdvancedFixedPricesOpen] = useState<boolean>(false);
  
  // --- ESTADO DE PRECIOS REALES ESIOS ---
  const [isFetchingPvpc, setIsFetchingPvpc] = useState<boolean>(false);
  const [pvpcFetchMethod, setPvpcFetchMethod] = useState<string | null>(null);
  const [pvpcFetchSuccess, setPvpcFetchSuccess] = useState<boolean>(false);
  const [pvpcFetchError, setPvpcFetchError] = useState<string | null>(null);

  // --- ANALIZADOR DE MERCADO CON IA ---
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysisData | null>(null);
  const [isAnalyzingMarket, setIsAnalyzingMarket] = useState<boolean>(false);
  const [marketAnalysisError, setMarketAnalysisError] = useState<string | null>(null);

  const handleAnalyzeMarket = async (
    avgPunta: number,
    avgLlano: number,
    avgValle: number,
    avgKwPunta: number,
    avgKwValle: number,
    avgDias: number
  ) => {
    setIsAnalyzingMarket(true);
    setMarketAnalysisError(null);
    setMarketAnalysis(null);

    try {
      const response = await fetch('/api/audit/compare-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avgPunta,
          avgLlano,
          avgValle,
          avgKwPunta,
          avgKwValle,
          avgDias
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor de comparación de tarifas.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMarketAnalysis(data);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setMarketAnalysisError(msg || 'Error inesperado al analizar el mercado.');
    } finally {
      setIsAnalyzingMarket(false);
    }
  };
  
  // --- HISTORIAL DE CAMBIOS DIARIOS ---
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    return safeParse<HistoryEntry[] | null>(localStorage.getItem('pvpc_history'), []) || [];
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});
  const [isSimulationsCollapsed, setIsSimulationsCollapsed] = useState<boolean>(false);

  const getSortedHistoryData = () => {
    const list: HistoryEntry[] = [];
    const officialByYear: Record<number, HistoryEntry[]> = {};
    
    history.forEach((entry) => {
      if (entry.tipo === 'oficial') {
        const { year } = parseMesFacturacionInfo(entry.mesFacturacion);
        const targetYear = year || new Date(entry.timestamp).getFullYear() || 2026;
        if (!officialByYear[targetYear]) {
          officialByYear[targetYear] = [];
        }
        officialByYear[targetYear].push(entry);
      }
    });

    const sortedYears = Object.keys(officialByYear)
      .map(Number)
      .sort((a, b) => b - a);

    sortedYears.forEach((year) => {
      const entries = officialByYear[year] || [];
      entries.sort((a, b) => {
        const infoA = parseMesFacturacionInfo(a.mesFacturacion);
        const infoB = parseMesFacturacionInfo(b.mesFacturacion);
        if (infoA.monthIndex !== infoB.monthIndex) {
          return infoB.monthIndex - infoA.monthIndex;
        }
        return b.timestamp - a.timestamp;
      });
      list.push(...entries);
    });

    const simulationEntries = history
      .filter(entry => entry.tipo !== 'oficial')
      .sort((a, b) => b.timestamp - a.timestamp);
      
    list.push(...simulationEntries);

    return {
      sortedList: list,
      sortedYears,
      officialByYear,
      simulationEntries
    };
  };

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveSimSuccess, setSaveSimSuccess] = useState<boolean>(false);
  const [saveOfficialSuccess, setSaveOfficialSuccess] = useState<boolean>(false);

  // --- ESTADOS DE MODALES PERSONALIZADOS ---
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const [promptInputValue, setPromptInputValue] = useState<string>('');
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmTitle, setConfirmTitle] = useState<string>('');
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  const triggerAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

  // --- ESTADOS DE EDICIÓN DEL HISTORIAL ---
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDateStr, setEditDateStr] = useState<string>('');
  const [editTipo, setEditTipo] = useState<'simulacion' | 'oficial'>('simulacion');
  const [editMesFacturacion, setEditMesFacturacion] = useState<string>('');
  const [editBillData, setEditBillData] = useState<BillData | null>(null);

  // Backup and Export State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);

  const handleEditHistoryInit = (entry: HistoryEntry) => {
    setEditingEntryId(entry.id);
    setEditDateStr(entry.dateStr);
    setEditTipo(entry.tipo);
    setEditMesFacturacion(entry.mesFacturacion || '');
    setEditBillData(deepClone(entry.billData));
    setShowEditModal(true);
  };

  const handleSaveEditedHistory = () => {
    if (!editingEntryId || !editBillData) return;

    if (!editDateStr.trim()) {
      triggerAlert("Por favor, introduce una fecha válida para el registro.");
      return;
    }

    if (editTipo === 'oficial' && !editMesFacturacion.trim()) {
      triggerAlert("Por favor, introduce el mes de facturación de la factura oficial.");
      return;
    }

    // Recalcular la factura para reflejar cualquier cambio en kW o kWh, precios, etc.
    const calculated = calcularFactura(editBillData);

    const updatedEntry: HistoryEntry = {
      id: editingEntryId,
      dateStr: editDateStr.trim(),
      tipo: editTipo,
      timestamp: Date.now(),
      mesFacturacion: editTipo === 'oficial' ? editMesFacturacion.trim() : undefined,
      billData: deepClone(editBillData),
      results: calculated
    };

    setHistory(prev => {
      return prev.map(entry => {
        if (entry.id === editingEntryId) {
          return {
            ...entry,
            ...updatedEntry
          };
        }
        return entry;
      });
    });

    if (user && db) {
      const existingEntry = history.find(e => e.id === editingEntryId);
      const entryToSave = {
        ...updatedEntry,
        timestamp: existingEntry?.timestamp || Date.now()
      };
      setDoc(doc(db, 'users', user.uid, 'history', editingEntryId), entryToSave)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/history/${editingEntryId}`));
    }

    setShowEditModal(false);
    setEditingEntryId(null);
    setEditBillData(null);
  };

  // --- ESTADO DE LA CALCULADORA ---
  const [billData, setBillData] = useState<BillData>(() => {
    return safeParse<BillData | null>(localStorage.getItem('pvpc_bill_data'), DEFAULT_PVPC_VALUES) || DEFAULT_PVPC_VALUES;
  });

  const [ieeSelection, setIeeSelection] = useState<'standard' | 'mincomunitario' | 'custom'>(() => {
    if ((billData.ieeMinComunitario ?? 0) > 0) return 'mincomunitario';
    const currentVal = billData.iee;
    return (currentVal === 5.11269632 || currentVal === 5.112696) ? 'standard' : 'custom';
  });

  useEffect(() => {
    if ((billData.ieeMinComunitario ?? 0) > 0) {
      setIeeSelection('mincomunitario');
    } else {
      const currentVal = billData.iee;
      setIeeSelection((currentVal === 5.11269632 || currentVal === 5.112696) ? 'standard' : 'custom');
    }
  }, [billData.iee, billData.ieeMinComunitario]);

  const [alqContadorSelection, setAlqContadorSelection] = useState<'auto' | 'custom'>(() => {
    return Math.abs(billData.alqContador - 0.026667) < 0.000001 ? 'auto' : 'custom';
  });

  useEffect(() => {
    setAlqContadorSelection(Math.abs(billData.alqContador - 0.026667) < 0.000001 ? 'auto' : 'custom');
  }, [billData.alqContador]);

  const [editIeeSelection, setEditIeeSelection] = useState<'standard' | 'mincomunitario' | 'custom'>('standard');

  useEffect(() => {
    if (editBillData) {
      if ((editBillData.ieeMinComunitario ?? 0) > 0) {
        setEditIeeSelection('mincomunitario');
      } else {
        const currentVal = editBillData.iee;
        setEditIeeSelection((currentVal === 5.11269632 || currentVal === 5.112696) ? 'standard' : 'custom');
      }
    }
  }, [editBillData?.iee, editBillData?.ieeMinComunitario]);

  const hasError = (fieldName: string) => validationResult.errors.some(e => e.field === fieldName);

  const validationResult = validateBillData(billData);
  const isValid = validationResult.isValid;

  const [isBasicMode, setIsBasicMode] = useState<boolean>(false);


  // --- ESTADOS DEL ASESOR IA (FUENTES Y CHAT) ---
  const [sources, setSources] = useState<SourceFile[]>(() => {
    return safeParse<SourceFile[] | null>(localStorage.getItem('pvpc_sources'), []) || [];
  });
  
  const [chats, setChats] = useState<ChatMessage[]>(() => {
    return safeParse<ChatMessage[] | null>(localStorage.getItem('pvpc_chats'), [
      {
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! Soy tu Asesor IA Energético. Puedes subir tus facturas eléctricas en el panel de la izquierda para que las analice, extraiga sus datos y podamos conversar sobre cómo optimizar tu consumo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]) || [];
  });

  const [activeSourceId, setActiveSourceId] = useState<string | undefined>(undefined);
  const [chatInput, setChatInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [chatImageBase64, setChatImageBase64] = useState<string | null>(null);
  const [chatImageMimeType, setChatImageMimeType] = useState<string | null>(null);
  const [chatImageName, setChatImageName] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState<boolean>(false);
  const [isDraggingChatFile, setIsDraggingChatFile] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChatFileAttachment = (file: File) => {
    if (!file) return;
    
    if (file.type.startsWith('image/')) {
      setChatImageName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1];
        setChatImageBase64(base64);
        setChatImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or other documents are uploaded as active sources
      handleFileUpload(file);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (chatInput) {
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
      }
    }
  }, [chatInput]);

  // --- FLUX DE DATOS CRUZADOS (PROMPT DE CARGA) ---
  const [pendingData, setPendingData] = useState<Partial<BillData> | null>(null);
  const [showLoadPrompt, setShowLoadPrompt] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- ESTADO DE AUTENTICACIÓN FIREBASE ---
  const [user, setUser] = useState<User | null>(null);

  // --- SYNC WITH FIRESTORE ON AUTH CHANGE ---
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const ALLOWED_EMAILS = [
      'daniel.ayuntnumancia@gmail.com'
    ];

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Check if user is logged in and their email is in the allowed list
      if (firebaseUser && firebaseUser.email && !ALLOWED_EMAILS.includes(firebaseUser.email)) {
        console.warn(`Access denied for unauthorized email: ${firebaseUser.email}`);
        await logoutUser();
        setUser(null);
        alert('Acceso denegado: Este correo no tiene permiso para usar la aplicación.');
        return;
      }

      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // 1. Fetch active billData
          const billRef = doc(db, 'users', firebaseUser.uid, 'profile', 'billData');
          const billSnap = await getDoc(billRef);
          if (billSnap.exists()) {
            setBillData(billSnap.data() as BillData);
          } else {
            await setDoc(billRef, billData);
          }

          // 2. Fetch history
          const historySnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'history'));
          if (!historySnap.empty) {
            const hList: HistoryEntry[] = [];
            historySnap.forEach(d => hList.push(d.data() as HistoryEntry));
            hList.sort((a, b) => b.timestamp - a.timestamp);
            setHistory(hList);
          } else if (history.length > 0) {
            for (const item of history) {
              await setDoc(doc(db, 'users', firebaseUser.uid, 'history', item.id), item);
            }
          }

          // 3. Fetch sources
          const sourcesSnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'sources'));
          if (!sourcesSnap.empty) {
            const sList: SourceFile[] = [];
            sourcesSnap.forEach(d => sList.push(d.data() as SourceFile));
            sList.sort((a, b) => b.timestamp - a.timestamp);
            setSources(sList);
          } else if (sources.length > 0) {
            for (const item of sources) {
              await setDoc(doc(db, 'users', firebaseUser.uid, 'sources', item.id), item);
            }
          }

          // 4. Fetch chats
          const chatsSnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'chats'));
          if (!chatsSnap.empty) {
            const cList: ChatMessage[] = [];
            chatsSnap.forEach(d => cList.push(d.data() as ChatMessage));
            cList.sort((a, b) => {
              const tA = new Date(a.timestamp).getTime() || 0;
              const tB = new Date(b.timestamp).getTime() || 0;
              return tA - tB;
            });
            setChats(cList);
          } else if (chats.length > 1) {
            for (const item of chats) {
              await setDoc(doc(db, 'users', firebaseUser.uid, 'chats', item.id), item);
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Error doing initial sync with Firestore:", msg);
        }
      } else {
        // User logged out. Clear localStorage and reset state
        localStorage.removeItem('pvpc_bill_data');
        localStorage.removeItem('pvpc_history');
        localStorage.removeItem('pvpc_sources');
        localStorage.removeItem('pvpc_chats');

        setBillData(DEFAULT_PVPC_VALUES);
        setHistory([]);
        setSources([]);
        setChats([
          {
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! Soy tu Asesor IA Energético. Puedes subir tus facturas eléctricas en el panel de la izquierda para que las analice, extraiga sus datos y podamos conversar sobre cómo optimizar tu consumo.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // --- DEBOUNCED SYNC FOR ACTIVE BILLDATA ---
  useEffect(() => {
    if (!user || !db) return;
    const delayDebounceFn = setTimeout(() => {
      setDoc(doc(db, 'users', user.uid, 'profile', 'billData'), billData)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/profile/billData`));
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [billData, user]);

  // --- PERSISTENCIA EN LOCALSTORAGE ---
  useEffect(() => {
    localStorage.setItem('pvpc_bill_data', JSON.stringify(billData));
  }, [billData]);

  useEffect(() => {
    localStorage.setItem('pvpc_sources', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('pvpc_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('pvpc_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const handleSaveSimulation = () => {
    if (!isValid) return;
    localStorage.setItem('pvpc_bill_data', JSON.stringify(billData));
    
    const todayStr = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const calculated = calcularFactura(billData);
    
    const newEntry: HistoryEntry = {
      id: `hist-${Date.now()}`,
      dateStr: todayStr,
      timestamp: Date.now(),
      billData: deepClone(billData),
      results: calculated,
      tipo: 'simulacion'
    };
    
    setHistory(prev => {
      const filtered = prev.filter(item => item.dateStr !== todayStr || item.tipo !== 'simulacion');
      return [newEntry, ...filtered];
    });

    if (user && db) {
      setDoc(doc(db, 'users', user.uid, 'history', newEntry.id), newEntry)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/history/${newEntry.id}`));
    }

    setSelectedHistoryEntryId(newEntry.id);
    setIsHistoryOpen(true);
    
    setSaveSimSuccess(true);
    setTimeout(() => {
      setSaveSimSuccess(false);
    }, 2000);
  };

  const handleSaveOfficial = () => {
    if (!isValid) return;
    setPromptInputValue('');
    setShowPromptModal(true);
  };

  const handleConfirmSaveOfficial = () => {
    if (!isValid) return;
    const valorMes = promptInputValue.trim();
    if (!valorMes) {
      triggerAlert("Por favor, introduce un mes y año válido.");
      return;
    }
    
    localStorage.setItem('pvpc_bill_data', JSON.stringify(billData));
    
    const todayStr = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const calculated = calcularFactura(billData);
    
    const newEntry: HistoryEntry = {
      id: `hist-${Date.now()}`,
      dateStr: todayStr,
      timestamp: Date.now(),
      billData: deepClone(billData),
      results: calculated,
      tipo: 'oficial',
      mesFacturacion: valorMes
    };
    
    setHistory(prev => {
      return [newEntry, ...prev];
    });

    if (user && db) {
      setDoc(doc(db, 'users', user.uid, 'history', newEntry.id), newEntry)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/history/${newEntry.id}`));
    }

    setSelectedHistoryEntryId(newEntry.id);
    setIsHistoryOpen(true);
    setShowPromptModal(false);
    
    setSaveOfficialSuccess(true);
    setTimeout(() => {
      setSaveOfficialSuccess(false);
    }, 2000);
  };

  const exportFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const exportData = history.filter(h => selectedExportIds.includes(h.id));
    if (exportData.length === 0) return;
    const jsonStr = JSON.stringify(exportData, null, 2);
    downloadFile(jsonStr, `backup_pvpc_${Date.now()}.json`, 'application/json');
    setShowExportModal(false);
  };

  const handleExportCSV = () => {
    const exportData = history.filter(h => selectedExportIds.includes(h.id));
    if (exportData.length === 0) return;
    
    // Create CSV header
    const headers = [
      "ID", "Fecha", "Tipo", "Mes Facturacion", 
      "Total Factura (€)", "Total Energia (€)", "Total Peajes (€)", 
      "Total Impuestos (€)", "Base Imponible (€)", "IVA (€)"
    ];
    
    // Map data
    const rows = exportData.map(entry => {
      return [
        entry.id,
        entry.dateStr,
        entry.tipo,
        entry.mesFacturacion || '-',
        entry.results.totalFactura.toFixed(2),
        entry.results.totalEnergia.toFixed(2),
        entry.results.totalPeajes.toFixed(2),
        (entry.results.totalIee + entry.results.totalAlquiler + entry.results.totalBonoSocial).toFixed(2),
        (entry.results.totalFijo + entry.results.totalVariable + entry.results.totalIee + entry.results.totalAlquiler + entry.results.totalBonoSocial).toFixed(2),
        entry.results.totalIva.toFixed(2)
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    downloadFile(csvContent, `export_pvpc_${Date.now()}.csv`, 'text/csv');
    setShowExportModal(false);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content) as HistoryEntry[];
        
        if (!Array.isArray(importedData)) throw new Error("Formato inválido");
        
        setHistory(prev => {
          const newHistory = [...prev];
          let importedCount = 0;
          importedData.forEach(item => {
            if (!newHistory.find(h => h.id === item.id)) {
              newHistory.push(item);
              importedCount++;
            }
          });
          
          if (user && db) {
            importedData.forEach(item => {
              setDoc(doc(db, 'users', user.uid, 'history', item.id), item)
                .catch(err => console.error("Error syncing imported item to Firestore", err));
            });
          }
          
          return newHistory.sort((a, b) => b.timestamp - a.timestamp);
        });
        
        triggerAlert("Backup importado correctamente.");
      } catch (err) {
        triggerAlert("Error al leer el archivo de backup. Asegúrate de que sea un .json válido.");
      }
      
      if (exportFileInputRef.current) {
        exportFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };


  const handleRestoreHistory = (entry: HistoryEntry) => {
    triggerConfirm(
      'Restaurar Datos',
      `¿Quieres restaurar los datos guardados el día ${entry.dateStr} en el simulador activo?`,
      () => {
        setBillData(entry.billData);
      }
    );
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      'Eliminar Registro',
      '¿Seguro que quieres eliminar este registro del historial permanentemente?',
      () => {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (user && db) {
          deleteDoc(doc(db, 'users', user.uid, 'history', id))
            .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/history/${id}`));
        }
      }
    );
  };

  const handleFetchRealPrices = async () => {
    if (hasError('fechaInicio') || hasError('fechaFin')) {
      setIsFetchingPvpc(false);
      return;
    }
    setIsFetchingPvpc(true);
    setPvpcFetchError(null);
    setPvpcFetchSuccess(false);
    setPvpcFetchMethod(null);

    try {
      const response = await fetch("/api/audit/pvpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fechaInicio: billData.fechaInicio,
          fechaFin: billData.fechaFin
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor (Código: ${response.status})`);
      }

      const data = await response.json();
      
      // Update variables in billData
      setBillData(prev => ({
        ...prev,
        costeEnergiaPunta: data.costeEnergiaPunta,
        costeEnergiaLlano: data.costeEnergiaLlano,
        costeEnergiaValle: data.costeEnergiaValle
      }));

      setPvpcFetchMethod(data.metodo || "Cargado correctamente");
      setPvpcFetchSuccess(true);
      
      // Auto open advanced prices panel so user can see what has been updated
      setIsAdvancedPricesOpen(true);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setPvpcFetchError(msg || "Error al conectar con el servidor para obtener los precios.");
    } finally {
      setIsFetchingPvpc(false);
    }
  };

  const handleFetchEsiosPrices = async () => {
    if (hasError('fechaInicio') || hasError('fechaFin')) {
      setIsFetchingPvpc(false);
      return;
    }
    setIsFetchingPvpc(true);
    setPvpcFetchError(null);
    setPvpcFetchSuccess(false);
    setPvpcFetchMethod(null);

    try {
      const response = await fetch("/api/audit/esios-energy-costs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fechaInicio: billData.fechaInicio,
          fechaFin: billData.fechaFin
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor (Código: ${response.status})`);
      }

      const data = await response.json();
      
      // Update variables in billData
      setBillData(prev => ({
        ...prev,
        costeEnergiaPunta: data.costeEnergiaPunta,
        costeEnergiaLlano: data.costeEnergiaLlano,
        costeEnergiaValle: data.costeEnergiaValle
      }));

      setPvpcFetchMethod(data.metodo || "Datos oficiales de ESIOS");
      setPvpcFetchSuccess(true);
      
      // Auto open advanced prices panel so user can see what has been updated
      setIsAdvancedPricesOpen(true);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setPvpcFetchError(msg || "Error al conectar con el servidor de ESIOS. Asegúrate de configurar el token de API de ESIOS.");
    } finally {
      setIsFetchingPvpc(false);
    }
  };

  const handleFetchPublicPVPC = async () => {
    if (hasError('fechaInicio') || hasError('fechaFin')) {
      setIsFetchingPvpc(false);
      return;
    }
    setIsFetchingPvpc(true);
    setPvpcFetchError(null);
    setPvpcFetchSuccess(false);
    setPvpcFetchMethod(null);

    try {
      const response = await fetch("/api/audit/pvpc-public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fechaInicio: billData.fechaInicio,
          fechaFin: billData.fechaFin
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor (Código: ${response.status})`);
      }

      const data = await response.json();
      
      // Update variables in billData
      setBillData(prev => ({
        ...prev,
        costeEnergiaPunta: data.costeEnergiaPunta,
        costeEnergiaLlano: data.costeEnergiaLlano,
        costeEnergiaValle: data.costeEnergiaValle
      }));

      setPvpcFetchMethod(data.metodo || "Datos públicos de ESIOS");
      setPvpcFetchSuccess(true);
      
      // Auto open advanced prices panel so user can see what has been updated
      setIsAdvancedPricesOpen(true);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setPvpcFetchError(msg || "Error al conectar con el servidor público de ESIOS.");
    } finally {
      setIsFetchingPvpc(false);
    }
  };

  // --- SINCRONIZACIÓN AUTOMÁTICA DE PRECIOS AL CAMBIAR LAS FECHAS ---
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!billData.fechaInicio || !billData.fechaFin) return;
    if (hasError('fechaInicio') || hasError('fechaFin')) return;

    // Resetear temporalmente el éxito anterior para indicar cambio de fechas
    setPvpcFetchSuccess(false);
    setPvpcFetchMethod(null);
    setPvpcFetchError(null);

    const timer = setTimeout(() => {
      handleFetchRealPrices();
    }, 600);

    return () => clearTimeout(timer);
  }, [billData.fechaInicio, billData.fechaFin]);

  // --- EJECUCIÓN DEL MOTOR DE CÁLCULO ---
  const results: BillResults | null = validationResult.isValid
    ? calcularFactura(billData)
    : null;

  // --- ESCANEO DE FACTURA REAL CON IA (OCR ESTRUCTURADO) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File;
    if (e instanceof File) {
      file = e;
    } else {
      if (!e.target.files || e.target.files.length === 0) return;
      file = e.target.files[0];
    }
    setIsUploading(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await fetch("/api/audit/scan-bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: base64Data,
          mimeType: file.type
        })
      });

      if (!response.ok) {
        throw new Error(`Error en el escaneo (Código: ${response.status})`);
      }

      const extractedData = await response.json();

      const parsedData: Partial<BillData> = {
        fechaInicio: extractedData.fechaInicio || "2026-05-01",
        fechaFin: extractedData.fechaFin || "2026-05-31",
        kwhPunta: extractedData.kwhPunta || 0,
        kwhLlano: extractedData.kwhLlano || 0,
        kwhValle: extractedData.kwhValle || 0,
        kwPunta: extractedData.kwPunta || 4.5,
        kwValle: extractedData.kwValle || 4.5,
        iva: extractedData.iva || 21,
      };

      const newSource: SourceFile = {
        id: `src-${Date.now()}`,
        name: file.name,
        timestamp: Date.now(),
        explanation: extractedData.explicacion || `Se han extraído correctamente los datos de ${file.name}.`,
        parsedData: parsedData
      };

      setSources(prev => [newSource, ...prev]);
      setActiveSourceId(newSource.id);
      setPendingData(parsedData);
      setShowLoadPrompt(true);

      if (user && db) {
        setDoc(doc(db, 'users', user.uid, 'sources', newSource.id), newSource)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/sources/${newSource.id}`));
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `He analizado tu factura **${file.name}**. Esto es lo que he extraído:\n\n* **Periodo:** ${parsedData.fechaInicio} a ${parsedData.fechaFin}\n* **Consumo:** Punta ${parsedData.kwhPunta} kWh | Llano ${parsedData.kwhLlano} kWh | Valle ${parsedData.kwhValle} kWh\n* **Potencia:** Punta ${parsedData.kwPunta} kW | Valle ${parsedData.kwValle} kW\n\n**Análisis de mi IA:**\n${newSource.explanation}\n\n¿Quieres que hablemos sobre cómo optimizar este consumo o prefieres cargarlo en la calculadora directamente?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceFileId: newSource.id
      };

      setChats(prev => [...prev, assistantMsg]);

      if (user && db) {
        setDoc(doc(db, 'users', user.uid, 'chats', assistantMsg.id), assistantMsg)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/chats/${assistantMsg.id}`));
      }

    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error al procesar la factura: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const confirmarCargaACalculadora = () => {
    if (pendingData) {
      setBillData(prev => ({ ...prev, ...pendingData }));
      setShowLoadPrompt(false);
      setPendingData(null);
      setActiveSection('calculadora');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatImageBase64) return;

    const currentInput = chatInput;
    const currentImgBase64 = chatImageBase64;
    const currentImgMimeType = chatImageMimeType;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentInput || 'Te he adjuntado una imagen para analizar.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceFileId: activeSourceId || null
    };

    if (currentImgBase64) {
      userMsg.imageUrl = `data:${currentImgMimeType};base64,${currentImgBase64}`;
    }

    setChats(prev => [...prev, userMsg]);
    if (user && db) {
      setDoc(doc(db, 'users', user.uid, 'chats', userMsg.id), userMsg)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/chats/${userMsg.id}`));
    }

    setChatInput('');
    setChatImageBase64(null);
    setChatImageMimeType(null);
    setChatImageName(null);
    setIsChatLoading(true);

    try {
      const conversationHistory = chats
        .filter(msg => !msg.sourceFileId || !activeSourceId || msg.sourceFileId === activeSourceId)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      let activeBillData = billData;
      if (activeSourceId) {
        const source = sources.find(s => s.id === activeSourceId);
        if (source && source.parsedData) {
          activeBillData = {
            ...billData,
            ...source.parsedData
          };
        }
      }

      const isGrounded = currentInput.toLowerCase().includes('buscar') || 
                          currentInput.toLowerCase().includes('url') || 
                          currentInput.toLowerCase().includes('http') ||
                          currentInput.toLowerCase().includes('web');

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: currentInput || "Analiza esta imagen de oferta por favor, y dime si merece la pena comparada con mi consumo.",
          history: conversationHistory,
          mode: isGrounded ? 'grounded' : 'normal',
          billData: activeBillData,
          marketAnalysis: marketAnalysis, // Interconnect comparator results!
          image: currentImgBase64,
          mimeType: currentImgMimeType,
          sources: sources,
          historyEntries: history
        })
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor de IA (Código: ${response.status})`);
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        citations: data.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceFileId: activeSourceId || null
      };

      setChats(prev => [...prev, aiMsg]);
      if (user && db) {
        setDoc(doc(db, 'users', user.uid, 'chats', aiMsg.id), aiMsg)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/chats/${aiMsg.id}`));
      }

    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      const errMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error de comunicación: ${msg}. Inténtalo de nuevo por favor.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceFileId: activeSourceId || null
      };

      setChats(prev => [...prev, errMsg]);
      if (user && db) {
        setDoc(doc(db, 'users', user.uid, 'chats', errMsg.id), errMsg)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/chats/${errMsg.id}`));
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChats = async () => {
    setChats([chats[0]]);
    if (user && db) {
      try {
        const chatsSnap = await getDocs(collection(db, 'users', user.uid, 'chats'));
        const batch = writeBatch(db);
        chatsSnap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      } catch (err: unknown) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/chats`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row antialiased">
      
      {/* --- CABECERA MÓVIL --- */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400 fill-current" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white leading-none">PVPC AUDITOR</span>
            <span className="text-[8px] text-slate-500 font-mono">v4.1 Debug</span>
          </div>
        </div>
        
        {isFirebaseConfigured && (
          <div>
            {user ? (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img referrerPolicy="no-referrer" src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full border border-slate-700 shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-[10px] text-indigo-300 font-bold shrink-0">
                    {(user.displayName || user.email || 'U').substring(0, 1).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={logoutUser}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded text-[10px] text-slate-400 font-medium transition"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition shadow-md shadow-indigo-950/20"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        )}
      </header>
      
      {/* --- NOTIFICACIÓN FLOTANTE / INTERFAZ DE DATOS CRUZADOS --- */}
      {showLoadPrompt && (
        <div className="fixed top-6 right-6 left-6 md:left-auto md:w-96 bg-indigo-950 border border-indigo-500 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-900 rounded-lg text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-white">¿Cargar datos en la calculadora?</h4>
              <p className="text-xs text-slate-300 mt-1">Se han detectado consumos, fechas e impuestos (IVA al {pendingData?.iva}%) listos para auditar matemáticamente.</p>
              <div className="flex gap-2 mt-3 justify-end">
                <button 
                  onClick={() => { setShowLoadPrompt(false); setPendingData(null); }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Solo chatear
                </button>
                <button 
                  onClick={confirmarCargaACalculadora}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1 shadow transition"
                >
                  <Check className="w-3 h-3" /> Cargar e ir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NAVEGACIÓN DE ESCRITORIO (SIDEBAR) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 p-6 shrink-0">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-900/30">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white tracking-tight">PVPC AUDITOR</h1>
            <p className="text-xs text-slate-400 font-medium">Auditor Energético</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
          <button
            onClick={() => setActiveSection('calculadora')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'calculadora'
                ? 'bg-slate-800 text-white shadow-inner border-l-4 border-emerald-500'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-5 h-5" />
            Calculadora
          </button>
          <button
            onClick={() => setActiveSection('ia')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'ia'
                ? 'bg-slate-800 text-white shadow-inner border-l-4 border-indigo-500'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Bot className="w-5 h-5" />
            Asesor IA
          </button>
          
          <button
            onClick={() => setActiveSection('comparador')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'comparador'
                ? 'bg-slate-800 text-white shadow-inner border-l-4 border-amber-500'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Scale className="w-5 h-5" />
            Comparador
          </button>

          <div className="pt-2">
            <button
              onClick={() => {
                setIsHistoryOpen(!isHistoryOpen);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeSection === 'historial'
                  ? 'bg-slate-800 text-white shadow-inner border-l-4 border-indigo-400'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5" />
                <span>Historial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-slate-900 text-indigo-400 font-mono px-2 py-0.5 rounded-full font-bold">
                  {history.length}
                </span>
                {isHistoryOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
            </button>
            
            {/* Lista de días con entradas guardadas */}
            {isHistoryOpen && (
              <div className="mt-2 pl-4 space-y-1 max-h-56 overflow-y-auto custom-scrollbar border-l border-slate-800 ml-6">
                {history.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-1 pl-2">Sin registros</p>
                ) : (() => {
                  const { sortedYears, officialByYear, simulationEntries } = getSortedHistoryData();
                  return (
                    <>
                      {sortedYears.map((year) => {
                        const isCollapsed = collapsedYears[year] === true;
                        const yearEntries = officialByYear[year] || [];
                        return (
                          <div key={year} className="mb-2">
                            <button
                              onClick={() => {
                                setCollapsedYears(prev => ({ ...prev, [year]: !prev[year] }));
                              }}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition duration-150"
                            >
                              <div className="flex items-center gap-1.5">
                                <Folder className={`w-3.5 h-3.5 ${isCollapsed ? 'text-slate-500' : 'text-indigo-400'}`} />
                                <span>{year}</span>
                                <span className="text-[10px] text-slate-500 font-normal">({yearEntries.length})</span>
                              </div>
                              {isCollapsed ? (
                                <ChevronRight className="w-3 h-3 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-indigo-400" />
                              )}
                            </button>
                            
                            {!isCollapsed && (
                              <div className="mt-1 pl-2 space-y-1 border-l border-slate-800/80 ml-3.5">
                                {yearEntries.map((entry) => (
                                  <button
                                    key={entry.id}
                                    onClick={() => {
                                      setSelectedHistoryEntryId(entry.id);
                                      setActiveSection('historial');
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium flex flex-col gap-0.5 transition-all duration-150 ${
                                      activeSection === 'historial' && selectedHistoryEntryId === entry.id
                                        ? 'bg-slate-900 text-emerald-400 font-bold border-r-2 border-emerald-500'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span className="truncate font-semibold">{entry.mesFacturacion || entry.dateStr}</span>
                                      <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                        {entry.results.totalFactura.toFixed(1)}€
                                      </span>
                                    </div>
                                    <span className="text-[8px] text-slate-500 font-mono self-start truncate">
                                      {entry.dateStr}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {simulationEntries.length > 0 && (
                        <div className="mb-2">
                          <button
                            onClick={() => {
                              setIsSimulationsCollapsed(!isSimulationsCollapsed);
                            }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900/60 transition duration-150"
                          >
                            <div className="flex items-center gap-1.5">
                              <Folder className={`w-3.5 h-3.5 ${isSimulationsCollapsed ? 'text-slate-500' : 'text-emerald-500'}`} />
                              <span>Simulaciones</span>
                              <span className="text-[10px] text-slate-500 font-normal">({simulationEntries.length})</span>
                            </div>
                            {isSimulationsCollapsed ? (
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-emerald-400" />
                            )}
                          </button>
                          
                          {!isSimulationsCollapsed && (
                            <div className="mt-1 pl-2 space-y-1 border-l border-slate-800/80 ml-3.5">
                              {simulationEntries.map((entry) => (
                                <button
                                  key={entry.id}
                                  onClick={() => {
                                    setSelectedHistoryEntryId(entry.id);
                                    setActiveSection('historial');
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium flex flex-col gap-0.5 transition-all duration-150 ${
                                    activeSection === 'historial' && selectedHistoryEntryId === entry.id
                                      ? 'bg-slate-900 text-emerald-400 font-bold border-r-2 border-emerald-500'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="truncate">{entry.dateStr}</span>
                                    <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                      {entry.results.totalFactura.toFixed(1)}€
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </nav>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-2 py-1 text-[8px] font-mono text-slate-600">
            Firebase Status: {isFirebaseConfigured ? 'ON' : 'OFF'}
          </div>
          {isFirebaseConfigured ? (
            user ? (
              <div className="space-y-2 px-1 text-left">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img referrerPolicy="no-referrer" src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-slate-700 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xs text-indigo-300 font-bold shrink-0">
                      {(user.displayName || user.email || 'U').substring(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{user.displayName || 'Usuario'}</p>
                    <p className="text-[10px] text-slate-500 truncate leading-none">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logoutUser}
                  className="w-full py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-[10px] font-medium text-slate-400 transition"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/20 transition duration-150"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Conectar con Google</span>
              </button>
            )
          ) : (
            <div className="px-2 py-1.5 text-center bg-slate-900/50 rounded-lg border border-slate-800/60">
              <p className="text-[10px] text-slate-400 font-medium">Modo Sin Nube</p>
            </div>
          )}
          
          <p className="text-[10px] text-slate-500 font-mono text-center">v4.1 • Tarifa PVPC 2.0TD</p>
        </div>
      </aside>

      {/* --- NAVEGACIÓN MÓVIL (BOTTOM NAV) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex justify-around items-center z-40 px-4">
        <button
          onClick={() => setActiveSection('calculadora')}
          className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition ${
            activeSection === 'calculadora' ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px] font-medium">Calculadora</span>
        </button>
        <button
          onClick={() => setActiveSection('ia')}
          className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition ${
            activeSection === 'ia' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-[10px] font-medium">Asesor IA</span>
        </button>
        <button
          onClick={() => setActiveSection('comparador')}
          className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition ${
            activeSection === 'comparador' ? 'text-amber-400' : 'text-slate-500'
          }`}
        >
          <Scale className="w-5 h-5" />
          <span className="text-[10px] font-medium">Comparador</span>
        </button>
        <button
          onClick={() => {
            setActiveSection('historial');
            const sortedData = getSortedHistoryData();
            if (sortedData.sortedList.length > 0 && !selectedHistoryEntryId) {
              setSelectedHistoryEntryId(sortedData.sortedList[0].id);
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition ${
            activeSection === 'historial' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium">Historial</span>
        </button>
      </nav>

      {/* --- CONTENIDO PRINCIPAL DINÁMICO --- */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 h-screen flex flex-col">
        
        {/* SECCIÓN 1: CALCULADORA */}
        {activeSection === 'calculadora' && (
          <div className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 animate-in fade-in duration-200">
            
            {/* Cabecera Interna */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-md">
              <div>
                <h2 className="text-xl font-bold text-white">Simulador Analítico de Suministro</h2>
                <p className="text-xs text-slate-400 mt-0.5">Introduce tus parámetros de consumo para obtener un reflejo exacto y transparente del coste indexado.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">


                <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 font-medium">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>{isValid && results ? results.dias : '—'} días auditados</span>
                </div>

                {/* Botón 1: Guardar Simulación (diseño secundario/azul) */}
                <button
                  type="button"
                  onClick={handleSaveSimulation}
                  disabled={!isValid}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    !isValid 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : saveSimSuccess 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white shadow-lg'
                  }`}
                >
                  {saveSimSuccess ? (
                    <>
                      <Check className="w-4 h-4 animate-bounce" />
                      <span>¡Simulación Guardada!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-blue-400" />
                      <span>Guardar Simulación</span>
                    </>
                  )}
                </button>

                {/* Botón 2: Guardar Factura Oficial (diseño primario/verde) */}
                <button
                  type="button"
                  onClick={handleSaveOfficial}
                  disabled={!isValid}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    !isValid
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : saveOfficialSuccess 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' 
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  }`}
                >
                  {saveOfficialSuccess ? (
                    <>
                      <Check className="w-4 h-4 animate-bounce" />
                      <span>¡Factura Oficial Guardada!</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Guardar Factura Oficial</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error de validación destacado */}
            {!isValid && validationResult.errors.length > 0 && (
              <div className="bg-rose-950/40 border border-rose-900/50 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-rose-300">Datos inválidos</h3>
                  <ul className="text-xs text-rose-200/90 list-disc list-inside mt-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Panel Bento Grid Estilo Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Formulario de Inputs Técnicos */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Bloque Periodo e Impuestos */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                  <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-800 pb-2">Control de Periodo e Impuestos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">F. Inicio</label>
                      <CustomDatePicker 
                        value={billData.fechaInicio} 
                        onChange={val => setBillData(p => ({...p, fechaInicio: val}))}
                        label="Fecha Inicio" hasError={hasError("fechaInicio")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">F. Fin</label>
                      <CustomDatePicker 
                        value={billData.fechaFin} 
                        onChange={val => setBillData(p => ({...p, fechaFin: val}))}
                        label="Fecha Fin" hasError={hasError("fechaFin")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">IVA Aplicable (%)</label>
                      <select 
                        value={billData.iva}
                        onChange={e => setBillData(p => ({...p, iva: Number(e.target.value)}))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={21}>21% (Estándar)</option>
                        <option value={10}>10% (Reducido)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Imp. Eléctrico (IEE)</label>
                      <select 
                        value={ieeSelection}
                        onChange={e => {
                          const val = e.target.value as 'standard' | 'mincomunitario' | 'custom';
                          setIeeSelection(val);
                          if (val === 'standard') {
                            setBillData(p => ({...p, iee: 5.11269632, ieeMinComunitario: 0}));
                          } else if (val === 'mincomunitario') {
                            setBillData(p => ({...p, ieeMinComunitario: 0.001, iee: 0}));
                          } else {
                            setBillData(p => ({...p, ieeMinComunitario: 0}));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer mb-1.5"
                      >
                        <option value="standard">5,11269632%</option>
                        <option value="mincomunitario">Mínimo</option>
                        <option value="custom">Personalizado</option>
                      </select>
                      {/* Mínimo comunitario: input €/kWh */}
                      <input 
                        type="number" min="0" max="1" step="0.0001"
                        value={billData.ieeMinComunitario ?? 0.001}
                        onChange={e => setBillData(p => ({...p, ieeMinComunitario: parseFloat(e.target.value) || 0}))}
                        className={`w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono ${
                          ieeSelection === 'mincomunitario' ? 'block animate-in slide-in-from-top-1 duration-150' : 'hidden'
                        }`}
                        placeholder="0.001 €/kWh"
                      />
                      {/* Personalizado: input % */}
                      <input 
                        type="number" aria-invalid={hasError("iee")} aria-describedby="billing-error-iee" min="0" max="100" step="0.01"
                        value={billData.iee} 
                        onChange={e => setBillData(p => ({...p, iee: parseFloat(e.target.value) || 0}))}
                        className={`w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono ${
                          ieeSelection === 'custom' ? 'block animate-in slide-in-from-top-1 duration-150' : 'hidden'
                        }`}
                        placeholder="0.00"
                      />
{hasError("iee") && <div id="billing-error-iee" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "iee")?.message}</div>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Alq. Cont. (€/día)</label>
                      <select
                        value={alqContadorSelection}
                        onChange={e => {
                          const val = e.target.value as 'auto' | 'custom';
                          setAlqContadorSelection(val);
                          if (val === 'auto') {
                            setBillData(p => ({...p, alqContador: 0.026667}));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer mb-1.5"
                      >
                        <option value="auto">Automático (0,026667)</option>
                        <option value="custom">Personalizado</option>
                      </select>
                      <input 
                        type="number" aria-invalid={hasError("alqContador")} aria-describedby="billing-error-alqContador" min="0" max="5" step="0.000001" 
                        value={billData.alqContador} 
                        onChange={e => setBillData(p => ({...p, alqContador: Number(e.target.value)}))}
                        className={`w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono ${
                          alqContadorSelection === 'custom' ? 'block animate-in slide-in-from-top-1 duration-150' : 'hidden'
                        }`}
                      />
{hasError("alqContador") && <div id="billing-error-alqContador" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "alqContador")?.message}</div>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Bono Social (€)</label>
                      <input 
                        type="number" aria-invalid={hasError("bonoSocial")} aria-describedby="billing-error-bonoSocial" min="-50" max="50" step="0.01" 
                        value={billData.bonoSocial} 
                        onChange={e => setBillData(p => ({...p, bonoSocial: Number(e.target.value)}))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
{hasError("bonoSocial") && <div id="billing-error-bonoSocial" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "bonoSocial")?.message}</div>}
                    </div>
                  </div>

                  {/* Sincronización de Costes de Energía Reales (REE ESIOS / Lumios) */}
                  <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-white">¿Sincronizar coste real de la energía?</span>
                      </div>
                      <p className="text-[11px] text-slate-400 max-w-md">
                        Carga automáticamente el coste real medio de la luz para las fechas de esta factura conectándose con **REE (Lumios / ESIOS)** o buscando inteligentemente con IA.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isFetchingPvpc}
                      onClick={handleFetchRealPrices}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 active:scale-95 cursor-pointer shrink-0"
                    >
                      {isFetchingPvpc ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Consultando Lumios...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          <span>Obtener Coste Real</span>
                        </>
                      )}
                    </button>


                  </div>

                  {/* Mensajes de Feedback de la Importación */}
                  {pvpcFetchSuccess && (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-800/80 rounded-xl text-xs text-emerald-200/90 flex flex-col gap-1.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>¡Coste de energía actualizado con éxito!</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {pvpcFetchMethod}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-4 text-[10px] font-mono text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800/40">
                        <div>P1 - Punta: <span className="text-white font-bold">{(billData.costeEnergiaPunta ?? billData.costeEnergiaVariable).toFixed(6)} €/kWh</span></div>
                        <div>P2 - Llano: <span className="text-white font-bold">{(billData.costeEnergiaLlano ?? billData.costeEnergiaVariable).toFixed(6)} €/kWh</span></div>
                        <div>P3 - Valle: <span className="text-white font-bold">{(billData.costeEnergiaValle ?? billData.costeEnergiaVariable).toFixed(6)} €/kWh</span></div>
                      </div>
                    </div>
                  )}

                  {pvpcFetchError && (
                    <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-fadeIn">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-rose-200">Error al sincronizar precios</p>
                        <p className="text-[11px] text-slate-300">{pvpcFetchError}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloque Potencias y Consumos */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-800 pb-2">Término Fijo (Potencias)</h3>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Potencia Punta (kW)</label>
                        <input type="number" aria-invalid={hasError("kwPunta")} aria-describedby="billing-error-kwPunta" min="0" max="100" step="0.1" value={billData.kwPunta} onChange={e => setBillData(p => ({...p, kwPunta: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white" />
{hasError("kwPunta") && <div id="billing-error-kwPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwPunta")?.message}</div>}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Potencia Valle (kW)</label>
                        <input type="number" aria-invalid={hasError("kwValle")} aria-describedby="billing-error-kwValle" min="0" max="100" step="0.1" value={billData.kwValle} onChange={e => setBillData(p => ({...p, kwValle: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white" />
{hasError("kwValle") && <div id="billing-error-kwValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwValle")?.message}</div>}
                      </div>
                    </div>

                    {/* Menu Desplegable de Costes Unitarios de Potencia */}
                    {!isBasicMode && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setIsAdvancedFixedPricesOpen(!isAdvancedFixedPricesOpen)}
                        className="w-full flex items-center justify-between text-xs font-semibold tracking-wider text-slate-400 hover:text-white uppercase transition duration-200 py-1"
                      >
                        <span>Ajustar Costes Unitarios (€/kW/año) de Potencia</span>
                        {isAdvancedFixedPricesOpen ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </button>

                      {isAdvancedFixedPricesOpen && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-250">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="border-l-2 border-red-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">Peaje Punta (€/kW/año)</label>
                              <input
                                type="number" aria-invalid={hasError("precioKwPunta")} aria-describedby="billing-error-precioKwPunta" min="-100" max="100" step="0.000001"
                                value={billData.precioKwPunta}
                                onChange={e => setBillData(p => ({ ...p, precioKwPunta: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("precioKwPunta") && <div id="billing-error-precioKwPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "precioKwPunta")?.message}</div>}
                            </div>
                            <div className="border-l-2 border-emerald-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">Peaje Valle (€/kW/año)</label>
                              <input
                                type="number" aria-invalid={hasError("precioKwValle")} aria-describedby="billing-error-precioKwValle" min="-100" max="100" step="0.000001"
                                value={billData.precioKwValle}
                                onChange={e => setBillData(p => ({ ...p, precioKwValle: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("precioKwValle") && <div id="billing-error-precioKwValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "precioKwValle")?.message}</div>}
                            </div>
                            <div className="border-l-2 border-slate-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">Margen Comercial (€/kW/año)</label>
                              <input
                                type="number" aria-invalid={hasError("precioMargen")} aria-describedby="billing-error-precioMargen" min="-100" max="100" step="0.000001"
                                value={billData.precioMargen}
                                onChange={e => setBillData(p => ({ ...p, precioMargen: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("precioMargen") && <div id="billing-error-precioMargen" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "precioMargen")?.message}</div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-800 pb-2">Término Variable (Consumo Real en kWh)</h3>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="border-l-4 border-red-500 pl-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs text-slate-400">P1 - Punta</label>
                          <span className="text-[10px] text-red-400 font-mono font-bold">
                            {billData.kwhPunta + billData.kwhLlano + billData.kwhValle > 0 
                              ? ((billData.kwhPunta / (billData.kwhPunta + billData.kwhLlano + billData.kwhValle)) * 100).toFixed(1) 
                              : "0.0"}%
                          </span>
                        </div>
                        <input type="number" aria-invalid={hasError("kwhPunta")} aria-describedby="billing-error-kwhPunta" min="0" max="999999" step="1" value={billData.kwhPunta} onChange={e => setBillData(p => ({...p, kwhPunta: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-sm font-mono text-white" />
{hasError("kwhPunta") && <div id="billing-error-kwhPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwhPunta")?.message}</div>}
                      </div>
                      <div className="border-l-4 border-yellow-500 pl-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs text-slate-400">P2 - Llano</label>
                          <span className="text-[10px] text-yellow-400 font-mono font-bold">
                            {billData.kwhPunta + billData.kwhLlano + billData.kwhValle > 0 
                              ? ((billData.kwhLlano / (billData.kwhPunta + billData.kwhLlano + billData.kwhValle)) * 100).toFixed(1) 
                              : "0.0"}%
                          </span>
                        </div>
                        <input type="number" aria-invalid={hasError("kwhLlano")} aria-describedby="billing-error-kwhLlano" min="0" max="999999" step="1" value={billData.kwhLlano} onChange={e => setBillData(p => ({...p, kwhLlano: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-sm font-mono text-white" />
{hasError("kwhLlano") && <div id="billing-error-kwhLlano" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwhLlano")?.message}</div>}
                      </div>
                      <div className="border-l-4 border-emerald-500 pl-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs text-slate-400">P3 - Valle</label>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            {billData.kwhPunta + billData.kwhLlano + billData.kwhValle > 0 
                              ? ((billData.kwhValle / (billData.kwhPunta + billData.kwhLlano + billData.kwhValle)) * 100).toFixed(1) 
                              : "0.0"}%
                          </span>
                        </div>
                        <input type="number" aria-invalid={hasError("kwhValle")} aria-describedby="billing-error-kwhValle" min="0" max="999999" step="1" value={billData.kwhValle} onChange={e => setBillData(p => ({...p, kwhValle: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-sm font-mono text-white" />
{hasError("kwhValle") && <div id="billing-error-kwhValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwhValle")?.message}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Menu Desplegable de Costes y Precios Unitarios (Peajes y Energía P1, P2, P3) */}
                  <div className="pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setIsAdvancedPricesOpen(!isAdvancedPricesOpen)}
                      className="w-full flex items-center justify-between text-xs font-semibold tracking-wider text-slate-400 hover:text-white uppercase transition duration-200 py-1"
                    >
                      <span>Ajustar Costes Unitarios (€/kWh) de Peajes y Energía (P1, P2, P3)</span>
                      {isAdvancedPricesOpen ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>

                    {isAdvancedPricesOpen && (
                      <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-250">
                        {/* Costes Peajes/Cargos */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-300">Peajes de Acceso (€/kWh) de P1, P2 y P3</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="border-l-2 border-red-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">P1 - Punta (€/kWh)</label>
                              <input
                                type="number" aria-invalid={hasError("precioKwhPunta")} aria-describedby="billing-error-precioKwhPunta" min="-1" max="5" step="0.000001"
                                value={billData.precioKwhPunta}
                                onChange={e => setBillData(p => ({ ...p, precioKwhPunta: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("precioKwhPunta") && <div id="billing-error-precioKwhPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "precioKwhPunta")?.message}</div>}
                            </div>
                            <div className="border-l-2 border-yellow-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">P2 - Llano (€/kWh)</label>
                              <input
                                type="number" aria-invalid={hasError("precioKwhLlano")} aria-describedby="billing-error-precioKwhLlano" min="-1" max="5" step="0.000001"
                                value={billData.precioKwhLlano}
                                onChange={e => setBillData(p => ({ ...p, precioKwhLlano: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("precioKwhLlano") && <div id="billing-error-precioKwhLlano" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "precioKwhLlano")?.message}</div>}
                            </div>
                            <div className="border-l-2 border-emerald-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">P3 - Valle (€/kWh)</label>
                              <input
                                type="number" aria-invalid={hasError("precioKwhValle")} aria-describedby="billing-error-precioKwhValle" min="-1" max="5" step="0.000001"
                                value={billData.precioKwhValle}
                                onChange={e => setBillData(p => ({ ...p, precioKwhValle: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("precioKwhValle") && <div id="billing-error-precioKwhValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "precioKwhValle")?.message}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Coste Energía Variable */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-300">Coste de la Energía Variable (€/kWh) de P1, P2 y P3</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="border-l-2 border-red-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">P1 - Punta (€/kWh)</label>
                              <input
                                type="number" aria-invalid={hasError("costeEnergiaPunta")} aria-describedby="billing-error-costeEnergiaPunta" min="-1" max="5" step="0.000001"
                                value={billData.costeEnergiaPunta ?? billData.costeEnergiaVariable}
                                onChange={e => setBillData(p => ({ ...p, costeEnergiaPunta: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("costeEnergiaPunta") && <div id="billing-error-costeEnergiaPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "costeEnergiaPunta")?.message}</div>}
                            </div>
                            <div className="border-l-2 border-yellow-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">P2 - Llano (€/kWh)</label>
                              <input
                                type="number" aria-invalid={hasError("costeEnergiaLlano")} aria-describedby="billing-error-costeEnergiaLlano" min="-1" max="5" step="0.000001"
                                value={billData.costeEnergiaLlano ?? billData.costeEnergiaVariable}
                                onChange={e => setBillData(p => ({ ...p, costeEnergiaLlano: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("costeEnergiaLlano") && <div id="billing-error-costeEnergiaLlano" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "costeEnergiaLlano")?.message}</div>}
                            </div>
                            <div className="border-l-2 border-emerald-500 pl-2">
                              <label className="block text-[10px] text-slate-400 mb-1">P3 - Valle (€/kWh)</label>
                              <input
                                type="number" aria-invalid={hasError("costeEnergiaValle")} aria-describedby="billing-error-costeEnergiaValle" min="-1" max="5" step="0.000001"
                                value={billData.costeEnergiaValle ?? billData.costeEnergiaVariable}
                                onChange={e => setBillData(p => ({ ...p, costeEnergiaValle: Number(e.target.value) }))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                              />
{hasError("costeEnergiaValle") && <div id="billing-error-costeEnergiaValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "costeEnergiaValle")?.message}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACCORDEÓN: SANDBOX DE OPTIMIZACIÓN */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setIsSandboxOpen(!isSandboxOpen)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-900/50 transition duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white">Sandbox de Ahorro e Impacto Anual</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Desplaza hipotéticamente cargas horarias o ajusta potencias fijas para ver proyecciones.</p>
                      </div>
                    </div>
                    {isSandboxOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>

                  {isSandboxOpen && (
                    <div className="p-6 border-t border-slate-800 bg-slate-900/40 space-y-6 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-center py-10">
                        <p className="text-sm text-slate-400 font-medium">Simulador de ahorro pendiente de activación. Estos controles no modifican la factura.</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Réplica de Factura Estilo Cuadrícula Espejo */}
              {results ? (
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full min-h-[500px]">
                  
                  {/* Sello de Alerta Presupuestaria */}
                  {results.alertaPresupuesto && (
                    <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-bl-xl shadow-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Presupuesto Excedido
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="border-b border-slate-800 pb-4">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-500 font-semibold">Desglose Analítico</span>
                      <h3 className="font-bold text-lg text-white mt-0.5">Réplica de Factura</h3>
                    </div>

                    <div className="space-y-3.5 text-sm">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Término Fijo (Potencia)</span>
                        <span className="font-mono text-white">{results.totalFijo.toFixed(2)} €</span>
                      </div>

                      <div className="pl-3 border-l border-dashed border-slate-700 text-[11px] space-y-0.5">
                        <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] pb-0.5">Peajes de Potencia y Margen</div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• P1 (Punta)</span>
                          <span className="font-mono">{results.fijoPunta.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• P2 (Valle)</span>
                          <span className="font-mono">{results.fijoValle.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• Margen comercialización</span>
                          <span className="font-mono">{results.fijoMargen.toFixed(2)} €</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-slate-300">
                        <span>Término Variable (Consumo)</span>
                        <span className="font-mono text-white">{results.totalVariable.toFixed(2)} €</span>
                      </div>

                      {/* --- Peajes de Acceso desglosados --- */}
                      <div className="pl-3 border-l border-dashed border-slate-700 text-[11px] space-y-0.5">
                        <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] pb-0.5">Peajes de Acceso</div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• Punta (P1)</span>
                          <span className="font-mono">{results.peajesPunta.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• Llano (P2)</span>
                          <span className="font-mono">{results.peajesLlano.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• Valle (P3)</span>
                          <span className="font-mono">{results.peajesValle.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 border-t border-slate-800 pt-0.5 mt-0.5">
                          <span className="italic">Total peajes</span>
                          <span className="font-mono">{results.totalPeajes.toFixed(2)} €</span>
                        </div>
                      </div>

                      {/* --- Coste Energía desglosado --- */}
                      <div className="pl-3 border-l border-dashed border-amber-900/50 text-[11px] space-y-0.5">
                        <div className="text-amber-600/80 font-semibold uppercase tracking-wider text-[10px] pb-0.5">Coste de la Energía (OMIE)</div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• Punta (P1)</span>
                          <span className="font-mono">{results.energiaPunta.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• Llano (P2)</span>
                          <span className="font-mono">{results.energiaLlano.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>• Valle (P3)</span>
                          <span className="font-mono">{results.energiaValle.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 border-t border-slate-800 pt-0.5 mt-0.5">
                          <span className="italic">Total energía</span>
                          <span className="font-mono">{results.totalEnergia.toFixed(2)} €</span>
                        </div>
                      </div>


                      <div className="flex justify-between items-center text-slate-300">
                        <span>Imp. Eléctrico (IEE)</span>
                        <span className="font-mono text-white">{results.totalIee.toFixed(2)} €</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-300">
                        <span>Alquiler de Contador</span>
                        <span className="font-mono text-white">{results.totalAlquiler.toFixed(2)} €</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-300">
                        <span>Bono Social</span>
                        <span className="font-mono text-white">{results.totalBonoSocial.toFixed(2)} €</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-3">
                        <span>Base Imponible</span>
                        <span className="font-mono">{(results.totalFijo + results.totalVariable + results.totalIee + results.totalRegulados).toFixed(2)} €</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-300">
                        <span>IVA Aplicado ({billData.iva}%)</span>
                        <span className="font-mono text-white">{results.totalIva.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 mt-6">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-sm text-slate-300">Total Estimado:</span>
                      <span className="text-4xl font-black font-mono tracking-tight text-emerald-400">{results.totalFactura.toFixed(2)}€</span>
                    </div>
                  </div>



                </div>
              </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center h-full min-h-[500px] text-center">
                    <div className="p-4 bg-slate-900 rounded-full border border-slate-800 mb-4 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-slate-300 font-bold mb-2">Faltan datos por completar</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Rellena las fechas y los consumos en el panel de configuración para calcular tu factura estimada.</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* SECCIÓN 2: ASESOR IA (SPLIT WORKSPACE ESTILO GEMINI / NOTEBOOKLM) */}
        {activeSection === 'ia' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-200">
            
            {/* PANEL IZQUIERDO: CONTROL DE FUENTES DOCUMENTALES */}
            {isSourcesCollapsed ? (
              <div
                onClick={() => setIsSourcesCollapsed(false)}
                className="flex md:flex-col w-full md:w-10 h-11 md:h-full bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 hover:bg-slate-900/80 items-center justify-between md:justify-start py-2 px-4 md:py-6 md:px-0 gap-2 md:gap-6 cursor-pointer text-slate-400 hover:text-indigo-400 transition-all shrink-0 select-none group"
                title="Haga clic para desplegar las Fuentes de Datos"
              >
                <div className="flex items-center md:flex-col gap-2 md:gap-6">
                  <Folder className="w-5 h-5 group-hover:scale-110 transition duration-150 text-indigo-400" />
                  <span className="text-xs font-bold tracking-wider text-slate-400 group-hover:text-indigo-300 md:hidden">
                    Fuentes de Datos (Desplegar)
                  </span>
                  <div className="hidden md:flex flex-col items-center gap-1">
                    {"FUENTES".split("").map((char, i) => (
                      <span key={i} className="text-[10px] font-bold tracking-widest leading-none text-slate-500 group-hover:text-indigo-300">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 rotate-90 md:rotate-0 md:mt-auto animate-pulse" />
              </div>
            ) : (
              <div className="w-full md:w-80 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-1/3 md:h-full p-4 shrink-0 overflow-y-auto animate-in slide-in-from-left duration-200">
                <div className="mb-4 flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Fuentes de Datos</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sube facturas para contextualizar el motor cognitivo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSourcesCollapsed(true)}
                    className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition duration-150 cursor-pointer flex items-center justify-center border border-slate-800"
                    title="Plegar Fuentes"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
  
                {/* Zona Uploader Drag&Drop */}
                <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center bg-slate-900/40 hover:bg-slate-900/80 group">
                  <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
                  <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100">Subir factura (PDF/Imagen)</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-mono">Límite 50MB</span>
                  <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" disabled={isUploading} />
                </label>
  
                {isUploading && (
                  <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-400 animate-pulse">Gemini procesando OCR estructurado...</span>
                  </div>
                )}
  
                {/* Listado de Fuentes Cargadas */}
                <div className="mt-6 space-y-2 flex-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Documentos Activos</span>
                  
                  <button 
                     onClick={() => setActiveSourceId(undefined)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                      activeSourceId === undefined 
                        ? 'bg-indigo-950/60 border border-indigo-900/50 text-indigo-300' 
                        : 'text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Conocimiento Base Global</span>
                    </div>
                  </button>
  
                  {sources.map(src => (
                    <div 
                      key={src.id}
                      className={`group w-full flex items-center justify-between rounded-lg border p-1.5 transition ${
                        activeSourceId === src.id
                          ? 'bg-slate-800 border-indigo-500 text-white'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-950'
                      }`}
                    >
                      <button 
                        onClick={() => setActiveSourceId(src.id)}
                        className="flex-1 text-left px-2 py-1 flex items-center gap-2 overflow-hidden"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{src.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono">{formatDate(src.parsedData.fechaInicio || '')}</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => {
                          setSources(prev => prev.filter(s => s.id !== src.id));
                          if (activeSourceId === src.id) setActiveSourceId(undefined);
                          if (user && db) {
                            deleteDoc(doc(db, 'users', user.uid, 'sources', src.id))
                              .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/sources/${src.id}`));
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PANEL DERECHO: INTERFAZ DE CHAT DE PANTALLA DIVIDIDA */}
            <div 
              className={`flex-1 flex flex-col h-2/3 md:h-full bg-slate-900/60 relative transition-all ${
                isDraggingChatFile ? 'ring-2 ring-indigo-500/50 bg-indigo-950/20' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingChatFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingChatFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingChatFile(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  handleChatFileAttachment(file);
                }
              }}
            >
              
              {/* Drag over overlay visual hint */}
              {isDraggingChatFile && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs border-2 border-dashed border-indigo-500 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
                  <div className="p-4 bg-indigo-900/30 rounded-full mb-3 text-indigo-400 border border-indigo-500/20 animate-pulse">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Cargar en el Asesor IA</h4>
                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    Suelta una **imagen de oferta** para adjuntarla al chat, o un **PDF/documento de factura** para agregarlo a tus Fuentes de datos.
                  </p>
                </div>
              )}
              
              {/* Context Indicador Superior */}
              <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></div>
                  <span className="text-xs font-medium text-slate-300 truncate">
                    {activeSourceId 
                      ? `Conversando sobre: ${sources.find(s => s.id === activeSourceId)?.name}`
                      : 'Conversando con el Asesor Global (Sin fuente vinculada)'
                    }
                  </span>
                </div>
                {chats.length > 1 && (
                  <button 
                    onClick={handleClearChats}
                    className="text-[10px] font-medium text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                  >
                    Limpiar Historial
                  </button>
                )}
              </div>

              {/* Ventana de Conversación con Scroll Independiente */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chats
                  .filter(msg => !msg.sourceFileId || !activeSourceId || msg.sourceFileId === activeSourceId)
                  .map(msg => (
                    <div 
                      key={msg.id}
                      className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center border ${
                        msg.role === 'user' 
                          ? 'bg-slate-800 border-slate-700 text-slate-200' 
                          : 'bg-indigo-950 border-indigo-900 text-indigo-400'
                      }`}>
                        {msg.role === 'user' ? 'Tú' : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-950 border border-slate-800/60 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-line text-white">{msg.content}</p>
                        ) : (
                          <MessageRenderer content={msg.content} />
                        )}
                        
                        {/* Render client-side uploaded image thumbnail if present in message */}
                        {msg.imageUrl && (
                          <div className="mt-3 max-w-xs rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                            <img 
                              src={msg.imageUrl} 
                              alt="Adjunto" 
                              className="w-full h-auto object-cover max-h-48 cursor-pointer hover:opacity-90 transition" 
                              onClick={() => window.open(msg.imageUrl, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Citations/References rendering */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800/50 flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Fuentes verificadas por Gemini:</span>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cite, idx) => (
                                <a 
                                  key={idx} 
                                  href={cite.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded transition"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>{cite.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <span className="block text-[9px] text-right mt-1.5 text-slate-400/80 font-mono">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}

                {/* Gemini Loading / Typing Indicator Skeleton */}
                {isChatLoading && (
                  <div className="flex gap-3 max-w-3xl mr-auto animate-pulse">
                    <div className="p-2.5 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center border bg-indigo-950 border-indigo-900 text-indigo-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-slate-950 border border-slate-800/60 text-slate-400 rounded-tl-none flex flex-col gap-2 min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        <span className="text-xs text-slate-400 font-medium ml-1">Gemini está analizando y calculando...</span>
                      </div>
                      <div className="h-2.5 bg-slate-900 rounded-full w-full"></div>
                      <div className="h-2 bg-slate-900 rounded-full w-4/5"></div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Image attachment preview above input */}
              {chatImageBase64 && (
                <div className="px-6 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg border border-slate-800 overflow-hidden bg-slate-900 shrink-0">
                      <img src={`data:${chatImageMimeType};base64,${chatImageBase64}`} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">{chatImageName || "Foto de oferta.jpg"}</p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">{chatImageMimeType}</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setChatImageBase64(null);
                      setChatImageMimeType(null);
                      setChatImageName(null);
                    }}
                    className="p-1.5 hover:bg-slate-900 rounded-full text-slate-400 hover:text-rose-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input Fijo Inferior */}
              <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800/80">
                <div className="relative flex items-center max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-xl focus-within:border-indigo-500 transition px-3 py-1 gap-2">
                  
                  {/* File upload click trigger for Chat Attachment */}
                  <label className="p-2 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg cursor-pointer transition shrink-0">
                    <Image className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        const file = e.target.files[0];
                        setChatImageName(file.name);
                        const reader = new FileReader();
                        reader.onload = () => {
                          const res = reader.result as string;
                          const base64 = res.split(',')[1];
                          setChatImageBase64(base64);
                          setChatImageMimeType(file.type);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  <textarea
                    ref={textareaRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    onPaste={(e) => {
                      const items = e.clipboardData.items;
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                          const file = items[i].getAsFile();
                          if (file) {
                            handleChatFileAttachment(file);
                            e.preventDefault();
                          }
                        }
                      }
                    }}
                    placeholder={activeSourceId ? "Hazle una pregunta a Gemini sobre esta fuente... (Shift+Enter para nueva línea)" : "Haz cualquier pregunta, arrastra imágenes/PDFs de facturas o pega fotos... (Shift+Enter para nueva línea)"}
                    className="w-full bg-transparent border-0 text-sm text-white focus:outline-none py-2 resize-none max-h-32 min-h-[36px] placeholder-slate-500"
                    disabled={isChatLoading}
                    rows={1}
                  />

                  <button
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md disabled:opacity-40 disabled:hover:bg-indigo-600 shrink-0"
                    disabled={(!chatInput.trim() && !chatImageBase64) || isChatLoading}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* SECCIÓN 3: HISTORIAL (MIGRADO A UN APARTADO PROPIO) */}
        {activeSection === 'historial' && (
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-900/50 animate-in fade-in duration-200">
            {(() => {
              const { sortedList, sortedYears, officialByYear, simulationEntries } = getSortedHistoryData();
              const selectedEntry = sortedList.find(e => e.id === selectedHistoryEntryId) || sortedList[0];
              
              if (history.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center py-20">
                    <div className="p-4 bg-slate-950 rounded-full border border-slate-800/60 text-slate-700 mb-4 animate-pulse">
                      <History className="w-12 h-12" />
                    </div>
                    <h4 className="text-base font-bold text-white tracking-tight">Evolución de Mediciones</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Aún no tienes ningún registro diario guardado para auditar la evolución de tus consumos.
                    </p>
                    <div className="mt-5 flex items-center gap-3 justify-center">
                      <button
                        onClick={() => setActiveSection('calculadora')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/20"
                      >
                        Ir al Simulador y Guardar
                      </button>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={exportFileInputRef}
                        onChange={handleImportJSON}
                      />
                      <button
                        onClick={() => exportFileInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
                      >
                        <UploadCloud className="w-4 h-4" /> Importar Backup
                      </button>
                    </div>
                  </div>
                );
              }

              const results = selectedEntry.results;
              const bData = selectedEntry.billData;
              const totalKwh = bData.kwhPunta + bData.kwhLlano + bData.kwhValle;

              const costeP1Energy = bData.kwhPunta * (bData.costeEnergiaPunta ?? bData.costeEnergiaVariable);
              const costeP2Energy = bData.kwhLlano * (bData.costeEnergiaLlano ?? bData.costeEnergiaVariable);
              const costeP3Energy = bData.kwhValle * (bData.costeEnergiaValle ?? bData.costeEnergiaVariable);

              return (
                <div className="p-4 md:p-8 space-y-6 max-w-[1600px] w-full mx-auto pb-12">
                  
                  {/* Selector de día elegante y compacto en cabecera */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-bold block">Historial de Registros</span>
                      <p className="text-xs text-slate-400 mt-0.5">Selecciona un día para visualizar su desglose de auditoría.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={exportFileInputRef}
                        onChange={handleImportJSON}
                      />
                      <button
                        onClick={() => exportFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/30 text-emerald-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Importar
                      </button>
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/30 text-indigo-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Save className="w-3.5 h-3.5" /> Exportar / Backup
                      </button>
                      <select
                        value={selectedEntry.id}
                      onChange={(e) => setSelectedHistoryEntryId(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl text-xs py-2 px-3 text-slate-300 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      {sortedYears.map((year) => {
                        const yearEntries = officialByYear[year] || [];
                        if (yearEntries.length === 0) return null;
                        return (
                          <optgroup key={`select-year-${year}`} label={`Facturas Oficiales ${year}`} className="bg-slate-950 text-indigo-400 font-bold">
                            {yearEntries.map((entry) => (
                              <option key={entry.id} value={entry.id} className="text-slate-300 font-medium bg-slate-900">
                                {entry.mesFacturacion} — {entry.results.totalFactura.toFixed(2)} € ({entry.results.dias} días)
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                      {simulationEntries.length > 0 && (
                        <optgroup label="Simulaciones" className="bg-slate-950 text-emerald-400 font-bold">
                          {simulationEntries.map((entry) => (
                            <option key={entry.id} value={entry.id} className="text-slate-300 font-medium bg-slate-900">
                              Simulación Día {entry.dateStr} — {entry.results.totalFactura.toFixed(2)} € ({entry.results.dias} días)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>

                  {/* Cabecera del Registro */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase font-mono bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                            DÍA {selectedEntry.dateStr}
                          </span>
                          {selectedEntry.tipo === 'oficial' && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase font-mono tracking-wider flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Factura Oficial: {selectedEntry.mesFacturacion}
                            </span>
                          )}
                          {results.alertaPresupuesto && (
                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Presupuesto Excedido
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-white mt-2">Auditoría Eléctrica del Día</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedEntry.results.engineVersion !== "2.0.0" && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                              <div className="flex gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <p className="text-xs text-amber-400">Esta factura fue calculada con una versión anterior. Los datos se recalcularán con el motor 2.0.0 solo si guardas una nueva versión.</p>
                              </div>
                            </div>
                          )}
                          Periodo auditado: {formatDate(bData.fechaInicio)} al {formatDate(bData.fechaFin)} ({results.dias} días)
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-right sm:min-w-[160px]">
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Total Factura</span>
                          <span className="text-2xl font-black font-mono text-emerald-400">{results.totalFactura.toFixed(2)}€</span>
                          <div className="text-[10px] text-slate-500 mt-1 space-y-0.5 border-t border-slate-800/80 pt-1 font-mono">
                            <div>IVA ({bData.iva}%): {results.totalIva.toFixed(2)}€</div>
                            <div>IEE ({bData.iee.toFixed(2)}%): {results.totalIee.toFixed(2)}€</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                'Cargar Configuración',
                                `¿Quieres cargar la configuración del día ${selectedEntry.dateStr} en el simulador activo?`,
                                () => {
                                  setBillData(deepClone(bData));
                                  setActiveSection('calculadora');
                                }
                              );
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 text-xs font-semibold transition duration-150 h-10"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Cargar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditHistoryInit(selectedEntry)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 text-xs font-semibold transition duration-150 h-10"
                            title="Editar este registro"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              handleDeleteHistory(selectedEntry.id, e);
                              setSelectedHistoryEntryId(null);
                            }}
                            className="p-2 bg-slate-900 border border-slate-800 hover:bg-rose-950/30 hover:border-rose-900 text-slate-400 hover:text-rose-400 rounded-xl transition h-10 w-10 flex items-center justify-center"
                            title="Eliminar este registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                  </div>

                  {/* Bento Grid del Detalle */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Card 1: Término Fijo (Potencia) */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-1">Término Fijo (Potencia)</span>
                        <span className="text-3xl font-black font-mono text-white tracking-tight">{results.totalFijo.toFixed(2)} <span className="text-sm font-normal text-slate-400">€</span></span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Potencia Punta:</span>
                          <span className="font-mono text-slate-200 font-semibold">{bData.kwPunta.toFixed(1)} kW</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Potencia Valle:</span>
                          <span className="font-mono text-slate-200 font-semibold">{bData.kwValle.toFixed(1)} kW</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Margen Comercial:</span>
                          <span className="font-mono text-slate-300">{bData.precioMargen.toFixed(3)} €/kW/año</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Término Variable (Consumos) */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-1">Término Variable</span>
                      <span className="text-3xl font-black font-mono text-white tracking-tight">{totalKwh.toFixed(1)} <span className="text-sm font-normal text-slate-400">kWh</span></span>
                      
                      <div className="mt-4 space-y-2.5">
                        {/* P1 Punta */}
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-red-500 font-semibold">P1 Punta (Punta)</span>
                            <span className="font-mono font-medium text-slate-200">{bData.kwhPunta} kWh ({totalKwh > 0 ? ((bData.kwhPunta/totalKwh)*100).toFixed(1) : 0}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full rounded-full" style={{ width: `${totalKwh > 0 ? (bData.kwhPunta/totalKwh)*100 : 0}%` }}></div>
                          </div>
                        </div>
                        {/* P2 Llano */}
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-yellow-500 font-semibold">P2 Llano (Llano)</span>
                            <span className="font-mono font-medium text-slate-200">{bData.kwhLlano} kWh ({totalKwh > 0 ? ((bData.kwhLlano/totalKwh)*100).toFixed(1) : 0}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${totalKwh > 0 ? (bData.kwhLlano/totalKwh)*100 : 0}%` }}></div>
                          </div>
                        </div>
                        {/* P3 Valle */}
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-emerald-500 font-semibold">P3 Valle (Valle)</span>
                            <span className="font-mono font-medium text-slate-200">{bData.kwhValle} kWh ({totalKwh > 0 ? ((bData.kwhValle/totalKwh)*100).toFixed(1) : 0}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${totalKwh > 0 ? (bData.kwhValle/totalKwh)*100 : 0}%` }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                        <span>Peajes de Acceso (Variable):</span>
                        <span className="font-mono font-bold text-slate-200">{results.totalPeajes.toFixed(2)} €</span>
                      </div>
                    </div>

                    {/* Card 3: Coste de la Energía Desglosado */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-1">Coste de la Energía</span>
                        <span className="text-3xl font-black font-mono text-white tracking-tight">{results.totalEnergia.toFixed(2)} <span className="text-sm font-normal text-slate-400">€</span></span>
                        
                        <div className="mt-4 space-y-2.5">
                          {/* P1 Punta Cost */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-red-500 font-semibold">P1 Punta</span>
                              <span className="font-mono text-slate-200 font-bold">{costeP1Energy.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>Precio medio:</span>
                              <span>{(bData.costeEnergiaPunta ?? bData.costeEnergiaVariable).toFixed(4)} €/kWh</span>
                            </div>
                          </div>
                          
                          {/* P2 Llano Cost */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-yellow-500 font-semibold">P2 Llano</span>
                              <span className="font-mono text-slate-200 font-bold">{costeP2Energy.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>Precio medio:</span>
                              <span>{(bData.costeEnergiaLlano ?? bData.costeEnergiaVariable).toFixed(4)} €/kWh</span>
                            </div>
                          </div>

                          {/* P3 Valle Cost */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-emerald-500 font-semibold">P3 Valle</span>
                              <span className="font-mono text-slate-200 font-bold">{costeP3Energy.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>Precio medio:</span>
                              <span>{(bData.costeEnergiaValle ?? bData.costeEnergiaVariable).toFixed(4)} €/kWh</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Gráfico de Distribución de Costes (Ancho Completo) */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow">
                    <div className="border-b border-slate-800 pb-3 mb-4">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold">Análisis de Distribución</span>
                      <h3 className="font-bold text-sm text-white mt-0.5">Porcentaje de Coste por Concepto</h3>
                    </div>
                    <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
                      <BillChart results={results} />
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        )}

        {/* SECCIÓN 4: COMPARADOR DE TARIFAS */}
        {activeSection === 'comparador' && (
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-900/50 animate-in fade-in duration-200 p-4 md:p-8 max-w-[1600px] w-full mx-auto pb-12 space-y-6">
            {(() => {
              const officialBills = history.filter(item => item.tipo === 'oficial');
              const hasOfficial = officialBills.length > 0;

              if (!hasOfficial) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center py-20 bg-slate-950 rounded-2xl border border-slate-800 shadow-md max-w-md mx-auto my-auto">
                    <div className="p-4 bg-slate-900/60 rounded-full border border-slate-800 text-amber-500 mb-4 animate-pulse">
                      <Scale className="w-12 h-12" />
                    </div>
                    <h4 className="text-base font-bold text-white tracking-tight">Comparador de Tarifas</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-2">
                      Guarda primero tus facturas reales desde la calculadora para poder analizar y comparar el mercado.
                    </p>
                    <button
                      onClick={() => setActiveSection('calculadora')}
                      className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/20 flex items-center gap-2"
                    >
                      <Calculator className="w-4 h-4" />
                      Ir a la Calculadora
                    </button>
                  </div>
                );
              }

              const totalSpent = officialBills.reduce((acc, b) => acc + b.results.totalFactura, 0);
              const avgCost = totalSpent / officialBills.length;
              const avgPunta = officialBills.reduce((acc, b) => acc + b.billData.kwhPunta, 0) / officialBills.length;
              const avgLlano = officialBills.reduce((acc, b) => acc + b.billData.kwhLlano, 0) / officialBills.length;
              const avgValle = officialBills.reduce((acc, b) => acc + b.billData.kwhValle, 0) / officialBills.length;
              const avgKwPunta = officialBills.reduce((acc, b) => acc + b.billData.kwPunta, 0) / officialBills.length;
              const avgKwValle = officialBills.reduce((acc, b) => acc + b.billData.kwValle, 0) / officialBills.length;
              const avgDias = officialBills.reduce((acc, b) => acc + b.results.dias, 0) / officialBills.length;
              const avgTotalKwh = avgPunta + avgLlano + avgValle;

              return (
                <div className="space-y-6">
                  {/* Cabecera del Comparador */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 font-bold block">Inteligencia de Datos</span>
                      <h2 className="text-xl font-bold text-white mt-1">Comparador de Tarifas Eléctricas</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Análisis comparativo de mercado utilizando el promedio de <span className="text-amber-400 font-bold font-mono">{officialBills.length}</span> facturas oficiales guardadas.
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-right self-start md:self-auto">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Facturas Oficiales</span>
                      <span className="text-xl font-black font-mono text-amber-400">{officialBills.length}</span>
                    </div>
                  </div>

                  {/* Histórico Gráfico de Gasto y Consumo Mensual */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-md">
                    <ComparisonChart officialBills={officialBills} />
                  </div>

                  {/* Bento Grid de Averages */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* Bento Tarjeta 1: Gasto Medio Mensual */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow flex flex-col justify-between">
                      <div>
                        <div className="border-b border-slate-800 pb-2 mb-4 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">Gasto Medio</span>
                          <span className="p-1 bg-emerald-950/40 text-emerald-400 rounded">
                            <Zap className="w-4 h-4" />
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Promedio calculado del coste total de tus facturas.</p>
                        <div className="my-6">
                          <span className="text-5xl font-black font-mono text-emerald-400">{avgCost.toFixed(2)}€</span>
                          <span className="text-xs text-slate-500 ml-1">/mes</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-900 pt-3 space-y-1 text-[11px] text-slate-500 font-mono">
                        <div className="flex justify-between">
                          <span>Inversión Total:</span>
                          <span className="text-slate-300 font-bold">{totalSpent.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Periodo promedio:</span>
                          <span className="text-slate-300 font-bold">{avgDias.toFixed(0)} días</span>
                        </div>
                      </div>
                    </div>

                    {/* Bento Tarjeta 2: Consumo Medio por Tramos */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow md:col-span-1 lg:col-span-2 flex flex-col justify-between">
                      <div>
                        <div className="border-b border-slate-800 pb-2 mb-4 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-bold">Consumo Energético</span>
                          <span className="p-1 bg-indigo-950/40 text-indigo-400 rounded">
                            <TrendingUp className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-baseline gap-2 mb-4">
                          <p className="text-xs text-slate-400">Consumo total promedio de energía:</p>
                          <span className="text-lg font-black font-mono text-indigo-400">{avgTotalKwh.toFixed(1)} kWh</span>
                        </div>

                        {/* Tramos de Consumo */}
                        <div className="space-y-4">
                          {/* Punta */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                P1 Punta
                              </span>
                              <span className="font-mono text-slate-200 font-bold">{avgPunta.toFixed(1)} kWh ({(avgTotalKwh > 0 ? (avgPunta / avgTotalKwh) * 100 : 0).toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${avgTotalKwh > 0 ? (avgPunta / avgTotalKwh) * 100 : 0}%` }} />
                            </div>
                          </div>

                          {/* Llano */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-yellow-500 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                P2 Llano
                              </span>
                              <span className="font-mono text-slate-200 font-bold">{avgLlano.toFixed(1)} kWh ({(avgTotalKwh > 0 ? (avgLlano / avgTotalKwh) * 100 : 0).toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${avgTotalKwh > 0 ? (avgLlano / avgTotalKwh) * 100 : 0}%` }} />
                            </div>
                          </div>

                          {/* Valle */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                P3 Valle
                              </span>
                              <span className="font-mono text-slate-200 font-bold">{avgValle.toFixed(1)} kWh ({(avgTotalKwh > 0 ? (avgValle / avgTotalKwh) * 100 : 0).toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${avgTotalKwh > 0 ? (avgValle / avgTotalKwh) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bento Tarjeta 3: Potencias Contratadas y Recomendaciones de IA */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow md:col-span-2 lg:col-span-3 flex flex-col justify-between">
                      <div>
                        <div className="border-b border-slate-800 pb-2 mb-4 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Parámetros Técnicos Promedio</span>
                          <span className="p-1 bg-slate-900 text-slate-400 rounded">
                            <Bot className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-2">
                          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">Potencia Punta Media</span>
                              <span className="text-xl font-bold font-mono text-white">{avgKwPunta.toFixed(2)} kW</span>
                            </div>
                            <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded font-bold font-mono">P1</span>
                          </div>
                          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">Potencia Valle Media</span>
                              <span className="text-xl font-bold font-mono text-white">{avgKwValle.toFixed(2)} kW</span>
                            </div>
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-bold font-mono">P3</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">
                          ¿Quieres comprobar si tienes contratada la potencia idónea o si existe una tarifa libre/regulada de mercado que reduzca tu coste en base a este perfil real?
                        </p>
                      </div>

                      {/* Botón de Analizar Mercado */}
                      <div className="mt-6 border-t border-slate-900 pt-6 text-center">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
                          <Scale className="w-6 h-6 text-slate-500" />
                          <h4 className="text-sm font-bold text-slate-300">Buscador de Ofertas Deshabilitado</h4>
                          <p className="text-xs text-slate-500 max-w-sm">
                            El sistema de búsqueda en tiempo real mediante IA está temporalmente desactivado para evitar mostrar enlaces rotos o precios desactualizados del mercado.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* --- MODAL PERSONALIZADO: PROMPT DE FACTURA OFICIAL --- */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Guardar Factura Oficial</h3>
              </div>
              <button 
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">
                Introduce el mes y año de la factura (ej. Julio 2026)
              </label>
              <input
                type="text"
                value={promptInputValue}
                onChange={(e) => setPromptInputValue(e.target.value)}
                placeholder="Julio 2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium placeholder-slate-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmSaveOfficial();
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveOfficial}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/20"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PERSONALIZADO: ALERT GENERAL --- */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Aviso del Suministro</h3>
              </div>
              <button 
                onClick={() => setShowAlertModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              {alertMessage}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-900/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PERSONALIZADO: CONFIRMACIÓN GENERAL --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <AlertTriangle className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-white">{confirmTitle || 'Confirmación'}</h3>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmMessage}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onConfirmAction) onConfirmAction();
                  setShowConfirmModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-900/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PERSONALIZADO: EDICIÓN DEL HISTORIAL --- */}
      {showEditModal && editBillData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-indigo-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Editar Registro del Historial</h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Formulario (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
              
              {/* Sección 1: Datos de Clasificación */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800/60 pb-1.5">Identificación del Registro</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Fecha de Registro */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Fecha de Registro</label>
                    <input
                      type="text"
                      value={editDateStr}
                      onChange={(e) => setEditDateStr(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Tipo de Registro */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Tipo de Registro</label>
                    <select
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value as 'simulacion' | 'oficial')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="simulacion">Simulación</option>
                      <option value="oficial">Factura Oficial</option>
                    </select>
                  </div>

                  {/* Mes de Facturación */}
                  {editTipo === 'oficial' && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                      <label className="text-[11px] font-semibold text-slate-400">Mes de Facturación</label>
                      <input
                        type="text"
                        value={editMesFacturacion}
                        onChange={(e) => setEditMesFacturacion(e.target.value)}
                        placeholder="Ej. Julio 2026"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 2: Fechas del Periodo */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800/60 pb-1.5">Periodo de Facturación</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Fecha Inicio</label>
                    <input
                      type="date"
                      value={editBillData.fechaInicio}
                      onChange={(e) => setEditBillData({ ...editBillData, fechaInicio: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Fecha Fin</label>
                    <input
                      type="date"
                      value={editBillData.fechaFin}
                      onChange={(e) => setEditBillData({ ...editBillData, fechaFin: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Potencias Contratadas (kW) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800/60 pb-1.5">Potencias Contratadas (kW)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Punta (P1) - kW</label>
                    <input
                      type="number" aria-invalid={hasError("kwPunta")} aria-describedby="billing-error-kwPunta" min="0" max="100" step="0.1"
                      value={editBillData.kwPunta}
                      onChange={(e) => setEditBillData({ ...editBillData, kwPunta: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("kwPunta") && <div id="billing-error-kwPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwPunta")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Valle (P3) - kW</label>
                    <input
                      type="number" aria-invalid={hasError("kwValle")} aria-describedby="billing-error-kwValle" min="0" max="100" step="0.1"
                      value={editBillData.kwValle}
                      onChange={(e) => setEditBillData({ ...editBillData, kwValle: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("kwValle") && <div id="billing-error-kwValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwValle")?.message}</div>}
                  </div>
                </div>
              </div>

              {/* Sección 4: Consumos del Periodo (kWh) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800/60 pb-1.5">Consumo de Energía (kWh)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-semibold text-slate-400">Consumo Punta (P1)</label>
                      <span className="text-[10px] text-red-400 font-mono font-bold">
                        {editBillData.kwhPunta + editBillData.kwhLlano + editBillData.kwhValle > 0 
                          ? ((editBillData.kwhPunta / (editBillData.kwhPunta + editBillData.kwhLlano + editBillData.kwhValle)) * 100).toFixed(1) 
                          : "0.0"}%
                      </span>
                    </div>
                    <input
                      type="number" aria-invalid={hasError("kwhPunta")} aria-describedby="billing-error-kwhPunta" min="0" max="999999" step="1"
                      value={editBillData.kwhPunta}
                      onChange={(e) => setEditBillData({ ...editBillData, kwhPunta: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("kwhPunta") && <div id="billing-error-kwhPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwhPunta")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-semibold text-slate-400">Consumo Llano (P2)</label>
                      <span className="text-[10px] text-yellow-400 font-mono font-bold">
                        {editBillData.kwhPunta + editBillData.kwhLlano + editBillData.kwhValle > 0 
                          ? ((editBillData.kwhLlano / (editBillData.kwhPunta + editBillData.kwhLlano + editBillData.kwhValle)) * 100).toFixed(1) 
                          : "0.0"}%
                      </span>
                    </div>
                    <input
                      type="number" aria-invalid={hasError("kwhLlano")} aria-describedby="billing-error-kwhLlano" min="0" max="999999" step="1"
                      value={editBillData.kwhLlano}
                      onChange={(e) => setEditBillData({ ...editBillData, kwhLlano: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("kwhLlano") && <div id="billing-error-kwhLlano" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwhLlano")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-semibold text-slate-400">Consumo Valle (P3)</label>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        {editBillData.kwhPunta + editBillData.kwhLlano + editBillData.kwhValle > 0 
                          ? ((editBillData.kwhValle / (editBillData.kwhPunta + editBillData.kwhLlano + editBillData.kwhValle)) * 100).toFixed(1) 
                          : "0.0"}%
                      </span>
                    </div>
                    <input
                      type="number" aria-invalid={hasError("kwhValle")} aria-describedby="billing-error-kwhValle" min="0" max="999999" step="1"
                      value={editBillData.kwhValle}
                      onChange={(e) => setEditBillData({ ...editBillData, kwhValle: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("kwhValle") && <div id="billing-error-kwhValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "kwhValle")?.message}</div>}
                  </div>
                </div>
              </div>

              {/* Sección 5: Impuestos y Regulados */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800/60 pb-1.5">Conceptos de Facturación e Impuestos</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">IVA (%)</label>
                    <select
                      value={editBillData.iva}
                      onChange={(e) => setEditBillData({ ...editBillData, iva: parseInt(e.target.value, 10) || 21 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
                    >
                      <option value="10">10%</option>
                      <option value="21">21%</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">IEE (%)</label>
                    <select
                      value={editIeeSelection}
                      onChange={e => {
                        const val = e.target.value as 'standard' | 'custom';
                        setEditIeeSelection(val);
                        if (val === 'standard') {
                          setEditBillData(p => p ? { ...p, iee: 5.11269632 } : null);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer mb-1.5"
                    >
                      <option value="standard">5,11269632%</option>
                      <option value="custom">Personalizado</option>
                    </select>
                    <input
                      type="number" aria-invalid={hasError("iee")} aria-describedby="billing-error-iee" min="0" max="100" step="0.01"
                      value={editBillData.iee}
                      onChange={(e) => setEditBillData(p => p ? { ...p, iee: parseFloat(e.target.value) || 0 } : null)}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono ${
                        editIeeSelection === 'custom' ? 'block animate-in slide-in-from-top-1 duration-150' : 'hidden'
                      }`}
                    />
{hasError("iee") && <div id="billing-error-iee" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "iee")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Alq. Contador (€/día)</label>
                    <input
                      type="number" aria-invalid={hasError("alqContador")} aria-describedby="billing-error-alqContador" min="0" max="5" step="0.000001"
                      value={editBillData.alqContador}
                      onChange={(e) => setEditBillData({ ...editBillData, alqContador: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("alqContador") && <div id="billing-error-alqContador" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "alqContador")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Bono Social (€)</label>
                    <input
                      type="number" aria-invalid={hasError("bonoSocial")} aria-describedby="billing-error-bonoSocial" min="-50" max="50" step="0.01"
                      value={editBillData.bonoSocial}
                      onChange={(e) => setEditBillData({ ...editBillData, bonoSocial: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("bonoSocial") && <div id="billing-error-bonoSocial" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "bonoSocial")?.message}</div>}
                  </div>
                </div>
              </div>

              {/* Sección 6: Precios de la Energía */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800/60 pb-1.5">Precios de Energía Aplicados (€/kWh)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Precio Punta (P1)</label>
                    <input
                      type="number" aria-invalid={hasError("costeEnergiaPunta")} aria-describedby="billing-error-costeEnergiaPunta" min="-1" max="5" step="0.000001"
                      value={editBillData.costeEnergiaPunta ?? editBillData.costeEnergiaVariable}
                      onChange={(e) => setEditBillData({ 
                        ...editBillData, 
                        costeEnergiaPunta: parseFloat(e.target.value) || 0,
                        costeEnergiaVariable: editBillData.costeEnergiaVariable || parseFloat(e.target.value) || 0
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("costeEnergiaPunta") && <div id="billing-error-costeEnergiaPunta" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "costeEnergiaPunta")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Precio Llano (P2)</label>
                    <input
                      type="number" aria-invalid={hasError("costeEnergiaLlano")} aria-describedby="billing-error-costeEnergiaLlano" min="-1" max="5" step="0.000001"
                      value={editBillData.costeEnergiaLlano ?? editBillData.costeEnergiaVariable}
                      onChange={(e) => setEditBillData({ ...editBillData, costeEnergiaLlano: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("costeEnergiaLlano") && <div id="billing-error-costeEnergiaLlano" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "costeEnergiaLlano")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Precio Valle (P3)</label>
                    <input
                      type="number" aria-invalid={hasError("costeEnergiaValle")} aria-describedby="billing-error-costeEnergiaValle" min="-1" max="5" step="0.000001"
                      value={editBillData.costeEnergiaValle ?? editBillData.costeEnergiaVariable}
                      onChange={(e) => setEditBillData({ ...editBillData, costeEnergiaValle: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("costeEnergiaValle") && <div id="billing-error-costeEnergiaValle" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "costeEnergiaValle")?.message}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Presupuesto (€)</label>
                    <input
                      type="number" aria-invalid={hasError("presupuesto")} aria-describedby="billing-error-presupuesto" min="0" max="99999" step="0.01"
                      value={editBillData.presupuesto}
                      onChange={(e) => setEditBillData({ ...editBillData, presupuesto: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 font-mono"
                    />
{hasError("presupuesto") && <div id="billing-error-presupuesto" className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-1 rounded">{validationResult.errors.find(e => e.field === "presupuesto")?.message}</div>}
                  </div>
                </div>
              </div>

            </div>

            {/* Pie de Página */}
            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/80 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedHistory}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-950/40 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Exportación y Copia de Seguridad */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800/80">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Save className="w-5 h-5 text-indigo-400" />
                  Exportar / Copia de Seguridad
                </h3>
                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Selecciona las facturas y simulaciones que quieres exportar. El formato <strong className="text-indigo-400">JSON</strong> sirve para restaurar copias de seguridad. El formato <strong className="text-emerald-400">CSV</strong> sirve para abrir en Excel.
              </p>
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setSelectedExportIds(history.map(h => h.id))}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg transition"
                >
                  Seleccionar Todo
                </button>
                <button 
                  onClick={() => setSelectedExportIds([])}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg transition"
                >
                  Deseleccionar Todo
                </button>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-slate-950/30">
              {history.map(entry => (
                <label key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedExportIds.includes(entry.id) ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedExportIds.includes(entry.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedExportIds(prev => [...prev, entry.id]);
                      } else {
                        setSelectedExportIds(prev => prev.filter(id => id !== entry.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/30 bg-slate-800 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-200">
                        {entry.tipo === 'oficial' ? `Factura: ${entry.mesFacturacion}` : `Simulación Día: ${entry.dateStr}`}
                      </span>
                      <span className="text-sm font-mono text-white">{entry.results.totalFactura.toFixed(2)} €</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${entry.tipo === 'oficial' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                      {entry.tipo === 'oficial' ? 'Oficial' : 'Simulación'}
                    </span>
                  </div>
                </label>
              ))}
              {history.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-10">No hay registros en el historial para exportar.</div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800/80 bg-slate-900 rounded-b-2xl flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={handleExportCSV}
                disabled={selectedExportIds.length === 0}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> Exportar CSV (Excel)
              </button>
              <button
                onClick={handleExportJSON}
                disabled={selectedExportIds.length === 0}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-950/40 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Descargar Backup JSON
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}