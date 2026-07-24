import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { formatDate } from "../utils";

interface CustomDatePickerProps {
  hasError?: boolean;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function CustomDatePicker({ value, onChange, label, hasError = false }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date or fallback to today
  const parsedDate = value ? new Date(value) : new Date();
  const initialYear = isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear();
  const initialMonth = isNaN(parsedDate.getTime()) ? new Date().getMonth() : parsedDate.getMonth();

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);

  // Keep internal calendar view in sync when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
      }
    }
  }, [value]);

  // Click outside listener to close calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const padZero = (n: number) => n.toString().padStart(2, "0");

  const handleSelectDay = (year: number, month: number, day: number) => {
    const ymd = `${year}-${padZero(month + 1)}-${padZero(day)}`;
    onChange(ymd);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const ymd = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;
    onChange(ymd);
    setIsOpen(false);
  };

  // Generate calendar grid days (6 weeks = 42 cells)
  const generateGrid = () => {
    const cells = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // getDay() is 0 (Sunday) to 6 (Saturday).
    // Convert to Monday (0) through Sunday (6):
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    // 1. Previous month padded days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYearNum = currentMonth === 0 ? currentYear - 1 : currentYear;
      cells.push({
        day: dayNum,
        month: prevMonthIdx,
        year: prevYearNum,
        isCurrentMonth: false,
      });
    }

    // 2. Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      cells.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      });
    }

    // 3. Next month padded days to fill the rest of 42 cells
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYearNum = currentMonth === 11 ? currentYear + 1 : currentYear;
      cells.push({
        day: i,
        month: nextMonthIdx,
        year: nextYearNum,
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  const gridDays = generateGrid();

  const isSelected = (year: number, month: number, day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return (
      !isNaN(d.getTime()) &&
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day
    );
  };

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const years = Array.from({ length: 15 }, (_, i) => 2020 + i);

  return (
    <div className="relative w-full select-none" ref={containerRef}>
      <button
        type="button"
        id={`datepicker-trigger-${label.toLowerCase().replace(/\s+/g, "-")}`} aria-invalid={hasError} aria-describedby={`billing-error-${label.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-xs p-2.5 bg-slate-900/60 border rounded-xl focus:outline-hidden transition-all cursor-pointer flex justify-between items-center select-none
          ${isOpen 
            ? "border-[#00b472] ring-1 ring-[#00b472] text-white" 
            : hasError ? "border-rose-500 ring-1 ring-rose-500 text-rose-300" : "border-slate-800 text-slate-300 hover:border-slate-700"
          }
        `}
      >
        <span className="font-mono font-medium">{formatDate(value)}</span>
        <Calendar size={14} className={isOpen ? "text-[#00b472]" : "text-slate-400"} />
      </button>

      {isOpen && (
        <div
          id={`datepicker-popover-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className="absolute left-0 mt-2 w-[310px] bg-[#0c1322] border border-slate-800/80 rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-50 p-5 animate-fadeIn"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-4">
              <div className="relative flex items-center group">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="appearance-none pr-5 text-[15px] font-bold bg-transparent text-white focus:outline-hidden cursor-pointer hover:text-[#00b472] transition-colors font-sans border-none outline-hidden"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx} className="bg-[#0c1322] text-white">
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-[#00b472] transition-colors" />
              </div>

              <div className="relative flex items-center group">
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="appearance-none pr-5 text-[15px] font-bold bg-transparent text-white focus:outline-hidden cursor-pointer hover:text-[#00b472] transition-colors font-sans border-none outline-hidden"
                >
                  {years.map((y) => (
                    <option key={y} value={y} className="bg-[#0c1322] text-white">
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-[#00b472] transition-colors" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="text-xs font-bold text-slate-500 font-sans"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((item, idx) => {
              const selected = isSelected(item.year, item.month, item.day);
              const today = isToday(item.year, item.month, item.day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.year, item.month, item.day)}
                  className={`
                    h-9 text-xs rounded-xl font-sans font-medium transition-all flex flex-col items-center justify-center relative cursor-pointer
                    ${
                      selected
                        ? "bg-[#00b472] text-white font-bold shadow-md shadow-[#00b472]/20"
                        : item.isCurrentMonth
                        ? "text-slate-100 hover:bg-slate-800/60 hover:text-white"
                        : "text-[#334155] hover:bg-slate-800/20"
                    }
                    ${today && !selected ? "border border-[#00b472] text-white" : ""}
                  `}
                >
                  <span className={today && !selected ? "font-semibold translate-y-[-1px]" : ""}>
                    {item.day}
                  </span>
                  {today && !selected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00b472]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick buttons */}
          <div className="flex items-center justify-between border-t border-slate-800/60 mt-4 pt-4">
            <button
              type="button"
              onClick={handleToday}
              className="text-[13px] font-bold uppercase tracking-wider text-[#00b472] hover:text-[#00c97f] transition-colors font-sans cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-[#00b472]/10"
            >
              HOY
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[13px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors font-sans cursor-pointer py-1 px-2 -mr-2 rounded-lg hover:bg-slate-800/40"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
