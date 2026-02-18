
import React, { useState } from 'react';
import { 
  Scale, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  Info, 
  Gavel, 
  Sparkles, 
  BookOpen,
  MapPin,
  Search,
  Loader2
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalculatorService } from './services/calculatorService';
import { GoogleGenAI, Type } from '@google/genai';

const App: React.FC = () => {
  const [trialDate, setTrialDate] = useState<string>('2026-02-26');
  const [location, setLocation] = useState<string>('Madrid');
  const [holidaysInput, setHolidaysInput] = useState<string>('');
  const [detectedHolidays, setDetectedHolidays] = useState<{date: string, name: string}[]>([]);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiAdviceLoading, setIsAiAdviceLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  const findHolidaysWithAI = async (loc: string, date: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const currentYear = new Date().getFullYear();
    const targetYear = new Date(date).getFullYear();
    
    const prompt = `Busca los días festivos oficiales (nacionales, autonómicos y locales) en ${loc} para el año ${targetYear} (y ${targetYear - 1} si es necesario para el periodo actual). 
    Necesito una lista de fechas en formato JSON con la fecha (YYYY-MM-DD) y el nombre del festivo. Solo devuelve el JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              holidays: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD" },
                    name: { type: Type.STRING, description: "Nombre del festivo" }
                  },
                  required: ["date", "name"]
                }
              }
            },
            required: ["holidays"]
          }
        },
      });

      const data = JSON.parse(response.text);
      return data.holidays || [];
    } catch (error) {
      console.error("Error fetching holidays:", error);
      return [];
    }
  };

  const handleCalculate = async () => {
    if (!trialDate || !location) return;
    setIsLoading(true);
    setAiAdvice(null);
    
    try {
      // 1. Buscar festivos automáticamente
      const holidays = await findHolidaysWithAI(location, trialDate);
      setDetectedHolidays(holidays);
      
      // 2. Preparar fechas para el servicio
      const aiHolidayDates = holidays.map((h: any) => h.date).join('\n');
      const allHolidaysStr = `${aiHolidayDates}\n${holidaysInput}`;
      const parsedHolidays = CalculatorService.parseHolidays(allHolidaysStr);
      
      // 3. Calcular
      const calculation = CalculatorService.calculateDeadline(new Date(trialDate), parsedHolidays);
      setResult(calculation);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getLegalAdvice = async () => {
    if (!result) return;
    setIsAiAdviceLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como un experto abogado laboralista en España.
      Tengo un juicio en ${location} el día ${format(new Date(trialDate), "eeee d 'de' MMMM 'de' yyyy", { locale: es })}.
      El plazo límite (Art. 82.5 y 45 LRJS) es el ${format(result.prorrogueDate, "eeee d 'de' MMMM 'de' yyyy", { locale: es })} a las 15:00h.
      Considerando que el juicio es en ${location}, mencióname si hay algún aspecto procesal local importante y dame 3 consejos de experto para la prueba.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiAdvice(response.text);
    } catch (error) {
      setAiAdvice("Error al obtener consejo legal.");
    } finally {
      setIsAiAdviceLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-lg">
            <Scale size={28} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Calculadora LRJS Inteligente</h1>
            <p className="text-slate-400 text-sm">Cómputo Automático de Festivos Locales & Art. 82.5</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Inputs Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin size={18} className="text-amber-600" />
                    Lugar del Juicio
                  </label>
                  <input 
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Madrid, Barcelona, Sevilla..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CalendarIcon size={18} className="text-amber-600" />
                    Fecha del Juicio
                  </label>
                  <input 
                    type="date"
                    value={trialDate}
                    onChange={(e) => setTrialDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Gavel size={18} className="text-amber-600" />
                  Festivos adicionales (opcional)
                </label>
                <textarea 
                  value={holidaysInput}
                  onChange={(e) => setHolidaysInput(e.target.value)}
                  placeholder="YYYY-MM-DD (uno por línea)"
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono text-sm"
                />
              </div>

              <button 
                onClick={handleCalculate}
                disabled={isLoading}
                className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-md transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Consultando Calendario Judicial...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Calcular Fecha Límite
                  </>
                )}
              </button>
            </div>

            {/* Detected Holidays List */}
            {detectedHolidays.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Search size={14} /> Festivos detectados en {location}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {detectedHolidays.map((h, i) => (
                    <div key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-medium text-slate-700 shadow-sm flex items-center gap-2">
                      <span className="text-amber-600 font-bold">{format(new Date(h.date), "dd/MM")}</span>
                      <span>{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-100 rounded-xl p-5 border-l-4 border-slate-400">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                <BookOpen size={16} /> Fundamento Jurídico
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                El motor de búsqueda identifica festivos nacionales (BOE), autonómicos y locales para la plaza de <strong>{location}</strong>. Se computan 10 días hábiles hacia atrás desde la víspera del juicio.
              </p>
            </div>
          </div>

          {/* Results Sidebar */}
          <div className="md:col-span-1">
            {result ? (
              <div className="space-y-4 sticky top-8">
                <div className="bg-white rounded-xl shadow-xl border-2 border-amber-500 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-amber-500 p-3 text-center">
                    <span className="text-xs font-black uppercase tracking-widest text-white">Límite Improrrogable</span>
                  </div>
                  <div className="p-6 text-center space-y-2">
                    <p className="text-sm text-slate-500 font-medium">Plazo de Gracia (LexNET):</p>
                    <p className="text-xl font-bold text-slate-900 capitalize">
                      {format(result.prorrogueDate, "eeee,", { locale: es })}
                    </p>
                    <p className="text-2xl font-black text-amber-600">
                      {format(result.prorrogueDate, "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-2">15:00 h</p>
                  </div>
                  <div className="bg-amber-50 p-4 border-t border-amber-100">
                    <div className="flex gap-3">
                      <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                      <p className="text-[10px] leading-tight text-amber-800 font-medium">
                        El sistema no permite presentaciones fuera de plazo. Recomendamos no agotar el día de gracia.
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={getLegalAdvice}
                  disabled={isAiAdviceLoading}
                  className="w-full py-3 px-4 bg-slate-900 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {isAiAdviceLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <><Sparkles size={16} className="text-amber-400" /> Estrategia Procesal</>
                  )}
                </button>

                {aiAdvice && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 animate-in zoom-in-95 duration-300 shadow-sm">
                    <div className="text-[11px] text-indigo-800 leading-relaxed whitespace-pre-wrap italic">
                      {aiAdvice}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center space-y-3 opacity-50">
                <Info size={40} className="text-slate-300" />
                <p className="text-sm font-medium text-slate-400">Calcula para ver el resultado y obtener consejos estratégicos.</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdown */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Cronología de los 10 días hábiles</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Cómputo Retroactivo</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="flex flex-nowrap gap-2">
                {result.businessDaysTrack.map((date: Date, idx: number) => (
                  <div key={idx} className="flex-1 min-w-[100px] p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Día {10 - idx}</p>
                    <p className="text-xs font-bold text-slate-700 capitalize">{format(date, "eee d MMM", { locale: es })}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2 border border-blue-100">
                <Info size={14} className="text-blue-600" />
                <p className="text-[11px] text-blue-800">
                  Vencimiento ordinario: <strong>{format(result.theoreticalDeadline, "d 'de' MMMM", { locale: es })}</strong> a las 23:59h.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-6 px-4 mt-auto">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <p className="text-[10px] text-slate-400">
            Powered by Gemini 3 Pro with Google Search for Real-time Legal Calendar Processing.
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">
            © 2024 Calculadora Laboral - Herramienta para profesionales del Derecho del Trabajo.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
