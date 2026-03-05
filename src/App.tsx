import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');
import { 
  Plus, 
  Calendar as CalendarIcon, 
  List, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  Pill,
  Clock,
  Settings,
  CheckCircle2,
  X,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Drug, isTakingDrugOnDate, PillTrackData, MedicationLog } from './utils/scheduler';
import { cn } from './utils/cn';

const DRUG_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 
  'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'
];

const DRUG_COLOR_VARIANTS: Record<string, { 
  bg: string, 
  text: string, 
  border: string, 
  bgLight: string,
  hoverBorder: string
}> = {
  'bg-emerald-500': { 
    bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', 
    bgLight: 'bg-emerald-500/10', hoverBorder: 'hover:border-emerald-500/30'
  },
  'bg-blue-500': { 
    bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', 
    bgLight: 'bg-blue-500/10', hoverBorder: 'hover:border-blue-500/30'
  },
  'bg-violet-500': { 
    bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500', 
    bgLight: 'bg-violet-500/10', hoverBorder: 'hover:border-violet-500/30'
  },
  'bg-amber-500': { 
    bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', 
    bgLight: 'bg-amber-500/10', hoverBorder: 'hover:border-amber-500/30'
  },
  'bg-rose-500': { 
    bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', 
    bgLight: 'bg-rose-500/10', hoverBorder: 'hover:border-rose-500/30'
  },
  'bg-indigo-500': { 
    bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', 
    bgLight: 'bg-indigo-500/10', hoverBorder: 'hover:border-indigo-500/30'
  },
  'bg-cyan-500': { 
    bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', 
    bgLight: 'bg-cyan-500/10', hoverBorder: 'hover:border-cyan-500/30'
  },
  'bg-orange-500': { 
    bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', 
    bgLight: 'bg-orange-500/10', hoverBorder: 'hover:border-orange-500/30'
  },
};

const getDrugVariants = (color: string) => {
  return DRUG_COLOR_VARIANTS[color] || DRUG_COLOR_VARIANTS['bg-emerald-500'];
};

const STORAGE_KEY = 'PILLTRACK_DATA';

const INITIAL_DATA: PillTrackData = {
  settings: {
    notificationsEnabled: false,
    language: 'zh-cn'
  },
  drugs: [
    {
      id: '1',
      name: '激素药',
      dosage: '早饭后',
      amount: '1粒',
      interval: 2,
      startDate: '2026-03-05',
      color: 'bg-blue-500',
      stock: 30,
      decrementPerDose: 1
    },
    {
      id: '2',
      name: '羟氯喹',
      dosage: '晚饭后',
      amount: '2粒',
      interval: 2,
      startDate: '2026-03-05',
      color: 'bg-rose-500',
      stock: 60,
      decrementPerDose: 2
    }
  ],
  logs: []
};

export default function App() {
  const [data, setData] = useState<PillTrackData>(INITIAL_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [view, setView] = useState<'daily' | 'calendar' | 'manage'>('daily');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [calendarMonth, setCalendarMonth] = useState(dayjs());
  const [showWelcome, setShowWelcome] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setData(parsed);
        if (parsed.drugs.length === 0) setShowWelcome(true);
      } catch (e) {
        console.error('Failed to parse saved data', e);
        setShowWelcome(true);
      }
    } else {
      setShowWelcome(true);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (data !== INITIAL_DATA) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  const toggleLog = (drugId: string, date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const drug = data.drugs.find(d => d.id === drugId);
    if (!drug) return;

    const existingLogIndex = data.logs.findIndex(l => l.drugId === drugId && l.takenAt === dateStr);
    const isTaken = existingLogIndex !== -1;

    const newLogs = isTaken 
      ? data.logs.filter((_, i) => i !== existingLogIndex)
      : [...data.logs, { drugId, takenAt: dateStr }];

    const newDrugs = data.drugs.map(d => {
      if (d.id === drugId && d.stock !== undefined && d.decrementPerDose !== undefined) {
        return { 
          ...d, 
          stock: isTaken 
            ? Number((d.stock + d.decrementPerDose).toFixed(2)) 
            : Number(Math.max(0, d.stock - d.decrementPerDose).toFixed(2)) 
        };
      }
      return d;
    });

    setData(prev => ({ ...prev, drugs: newDrugs, logs: newLogs }));
  };

  const handleSaveDrug = (drugData: Partial<Drug>) => {
    const newDrugs = editingDrug 
      ? data.drugs.map(d => d.id === editingDrug.id ? { ...d, ...drugData } as Drug : d)
      : [...data.drugs, {
          id: crypto.randomUUID(),
          name: drugData.name || '未命名药物',
          dosage: drugData.dosage || '',
          amount: drugData.amount || '',
          interval: drugData.interval ?? 0,
          startDate: drugData.startDate || dayjs().format('YYYY-MM-DD'),
          color: drugData.color || DRUG_COLORS[data.drugs.length % DRUG_COLORS.length],
          stock: drugData.stock ?? 0,
          decrementPerDose: drugData.decrementPerDose ?? 1,
        } as Drug];

    setData(prev => ({ ...prev, drugs: newDrugs }));
    setIsModalOpen(false);
    setEditingDrug(null);
    setShowWelcome(false);
  };

  const handleDeleteDrug = (id: string) => {
    if (confirm('确定要删除这种药物吗？')) {
      setData(prev => ({
        ...prev,
        drugs: prev.drugs.filter(d => d.id !== id),
        logs: prev.logs.filter(l => l.drugId !== id)
      }));
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pilltrack-backup-${dayjs().format('YYYY-MM-DD')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.drugs && imported.logs) {
          setData(imported);
          alert('数据导入成功！');
        }
      } catch (e) {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
  };

  const drugsToday = useMemo(() => {
    return data.drugs.filter(d => isTakingDrugOnDate(d, selectedDate));
  }, [data.drugs, selectedDate]);

  const isLogged = (drugId: string, date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return data.logs.some(l => l.drugId === drugId && l.takenAt === dateStr);
  };

  if (showWelcome && data.drugs.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 mb-8"
        >
          <Pill size={48} />
        </motion.div>
        <h1 className="text-3xl font-bold mb-4">欢迎使用 药提醒</h1>
        <p className="text-black/40 mb-12 max-w-xs">您的私人用药助手，帮您精准管理每一种药物的服用周期。</p>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full max-w-xs bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
        >
          添加我的第一种药
        </button>
        
        {/* Modal for initial drug */}
        <AnimatePresence>
          {isModalOpen && (
            <DrugModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              onSave={handleSaveDrug} 
              editingDrug={null}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Pill size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">药提醒</h1>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">PillTrack</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'manage' && (
            <>
              <button 
                onClick={exportData}
                className="p-2 text-black/40 hover:text-emerald-500 transition-colors"
                title="导出备份"
              >
                <Download size={20} />
              </button>
              <label className="p-2 text-black/40 hover:text-emerald-500 cursor-pointer transition-colors" title="导入备份">
                <Upload size={20} />
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
            </>
          )}
        </div>
      </header>

      <main className="px-4 pt-6 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {view === 'daily' && (
            <motion.div 
              key="daily"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-black/5">
                <button 
                  onClick={() => setSelectedDate(prev => prev.subtract(1, 'day'))}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                  <h2 className="text-xl font-bold">{selectedDate.format('MM月DD日')}</h2>
                  <p className="text-xs text-black/40 font-bold uppercase tracking-widest">{selectedDate.format('dddd')}</p>
                </div>
                <button 
                  onClick={() => setSelectedDate(prev => prev.add(1, 'day'))}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {drugsToday.length > 0 ? (
                  drugsToday.map((drug) => (
                    <div key={drug.id} className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm flex items-center justify-between group transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", drug.color)}>
                          <Pill size={28} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{drug.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-black/40 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Clock size={12} /> {drug.dosage}</span>
                            <span className="w-1 h-1 bg-black/10 rounded-full" />
                            <span>{drug.amount}</span>
                          </div>
                          {drug.stock !== undefined && (
                            <div className={cn(
                              "text-[10px] font-bold mt-1",
                              drug.stock < (drug.decrementPerDose || 1) * 3 
                                ? "text-rose-500" 
                                : getDrugVariants(drug.color).text
                            )}>
                              剩余: {drug.stock}
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleLog(drug.id, selectedDate)}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2",
                          isLogged(drug.id, selectedDate)
                            ? `${drug.color} border-transparent text-white shadow-lg`
                            : `bg-white border-black/5 text-black/10 ${getDrugVariants(drug.color).hoverBorder}`
                        )}
                      >
                        <CheckCircle2 size={28} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-4 opacity-30">
                    <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={40} />
                    </div>
                    <p className="font-bold uppercase tracking-widest text-sm">今日无服药计划</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                  <h2 className="text-xl font-bold">{calendarMonth.format('YYYY年MM月')}</h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}
                      className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={() => setCalendarMonth(dayjs())}
                      className="px-3 py-1 text-[10px] font-bold uppercase bg-black/5 rounded-lg"
                    >
                      本月
                    </button>
                    <button 
                      onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}
                      className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 bg-black/[0.02]">
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} className="py-3 text-center text-[10px] font-bold text-black/30 uppercase tracking-widest">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-[minmax(80px,auto)]">
                  {Array.from({ length: calendarMonth.startOf('month').day() }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-t border-r border-black/5 last:border-r-0 bg-black/[0.01]" />
                  ))}
                  {Array.from({ length: calendarMonth.daysInMonth() }).map((_, i) => {
                    const day = calendarMonth.date(i + 1);
                    const drugsOnDay = data.drugs.filter(d => isTakingDrugOnDate(d, day));
                    const isToday = day.isSame(dayjs(), 'day');
                    
                    return (
                      <div key={i} className={cn(
                        "border-t border-r border-black/5 last:border-r-0 p-1 relative min-h-[80px]",
                        isToday && "bg-emerald-50/50"
                      )}>
                        <span className={cn(
                          "text-[10px] font-bold ml-1 mt-1 block",
                          isToday ? "text-emerald-600" : "text-black/30"
                        )}>
                          {i + 1}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {drugsOnDay.map(drug => {
                            const taken = isLogged(drug.id, day);
                            const variants = getDrugVariants(drug.color);
                            return (
                              <div 
                                key={drug.id} 
                                className={cn(
                                  "px-1 py-0.5 rounded-[4px] text-[8px] font-bold truncate transition-all flex items-center gap-1 border", 
                                  taken 
                                    ? `${variants.bg} text-white border-transparent shadow-sm` 
                                    : `${variants.text} ${variants.border} ${variants.bgLight}`
                                )} 
                              >
                                <span className="truncate">{drug.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'manage' && (
            <motion.div 
              key="manage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">药物管理</h2>
                <button 
                  onClick={() => {
                    setEditingDrug(null);
                    setIsModalOpen(true);
                  }}
                  className="bg-emerald-500 text-white px-5 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  <Plus size={18} /> 添加药物
                </button>
              </div>

              <div className="grid gap-4">
                {data.drugs.map(drug => (
                  <div key={drug.id} className="bg-white p-5 rounded-3xl border border-black/5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", drug.color)}>
                        <Pill size={28} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{drug.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-black/40 font-bold uppercase tracking-wider">
                            每隔 {drug.interval} 天服用
                          </p>
                          {drug.stock !== undefined && (
                            <>
                              <span className="w-1 h-1 bg-black/10 rounded-full" />
                              <p className={cn(
                                "text-xs font-bold",
                                drug.stock < (drug.decrementPerDose || 1) * 3 
                                  ? "text-rose-500" 
                                  : getDrugVariants(drug.color).text
                              )}>
                                库存: {drug.stock}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingDrug(drug);
                          setIsModalOpen(true);
                        }}
                        className="p-2.5 text-black/20 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteDrug(drug.id)}
                        className="p-2.5 text-black/20 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {data.drugs.length === 0 && (
                  <div className="py-20 text-center opacity-20">
                    <p className="font-bold uppercase tracking-widest text-sm">暂无药物数据</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-black/5 px-8 py-4 flex items-center justify-between pb-safe-offset-4">
        <button 
          onClick={() => setView('daily')}
          className={cn(
            "flex flex-col items-center gap-1.5 transition-all",
            view === 'daily' ? "text-emerald-500" : "text-black/20"
          )}
        >
          <List size={26} />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">今日</span>
        </button>
        <button 
          onClick={() => setView('calendar')}
          className={cn(
            "flex flex-col items-center gap-1.5 transition-all",
            view === 'calendar' ? "text-emerald-500" : "text-black/20"
          )}
        >
          <CalendarIcon size={26} />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">日历</span>
        </button>
        <button 
          onClick={() => setView('manage')}
          className={cn(
            "flex flex-col items-center gap-1.5 transition-all",
            view === 'manage' ? "text-emerald-500" : "text-black/20"
          )}
        >
          <Settings size={26} />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">管理</span>
        </button>
      </nav>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <DrugModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveDrug} 
            editingDrug={editingDrug}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DrugModal({ isOpen, onClose, onSave, editingDrug }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (drug: Partial<Drug>) => void,
  editingDrug: Drug | null
}) {
  const [interval, setIntervalVal] = useState(editingDrug?.interval ?? 0);
  const [startDate, setStartDate] = useState(editingDrug?.startDate || dayjs().format('YYYY-MM-DD'));
  const [selectedColor, setSelectedColor] = useState(editingDrug?.color || DRUG_COLORS[0]);

  const previewDates = useMemo(() => {
    const dates = [];
    const start = dayjs(startDate);
    for (let i = 0; i < 5; i++) {
      dates.push(start.add(i * (interval + 1), 'day').format('MM/DD'));
    }
    return dates;
  }, [startDate, interval]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold tracking-tight">{editingDrug ? '编辑药物' : '添加新药物'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: any = Object.fromEntries(formData.entries());
            
            onSave({
              ...data,
              interval: Number(data.interval),
              stock: Number(data.stock),
              decrementPerDose: Number(data.decrementPerDose),
              color: selectedColor,
            });
          }}
          className="p-8 space-y-8"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">药物名称</label>
            <input 
              name="name" 
              required 
              defaultValue={editingDrug?.name}
              placeholder="例如：激素药、羟氯喹"
              className="w-full bg-[#F5F5F5] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">选择主题颜色</label>
            <div className="flex flex-wrap gap-3">
              {DRUG_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all border-4",
                    color,
                    selectedColor === color ? "border-black/20 scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">服用时间</label>
              <input 
                name="dosage" 
                defaultValue={editingDrug?.dosage}
                placeholder="例如：早晚饭后"
                className="w-full bg-[#F5F5F5] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">单次用量</label>
              <input 
                name="amount" 
                defaultValue={editingDrug?.amount}
                placeholder="例如：1袋、2粒"
                className="w-full bg-[#F5F5F5] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">服用频率 (每隔 N 天)</label>
              <div className="flex items-center gap-4 bg-[#F5F5F5] p-2 rounded-2xl">
                <span className="text-sm font-bold pl-4">每隔</span>
                <input 
                  type="number" name="interval" min="0"
                  value={interval}
                  onChange={(e) => setIntervalVal(Number(e.target.value))}
                  className="w-20 bg-white border-none rounded-xl px-4 py-3 text-center focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-black text-lg"
                />
                <span className="text-sm font-bold pr-4">天服用一次</span>
              </div>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-2xl space-y-2 border border-emerald-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">服药预览 (前5次)</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {previewDates.map((d, i) => (
                  <div key={i} className="bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-700 whitespace-nowrap">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">起始日期</label>
            <input 
              type="date" name="startDate" 
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#F5F5F5] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">当前库存</label>
              <input 
                type="number" name="stock" min="0" step="0.1"
                defaultValue={editingDrug?.stock ?? 0}
                className="w-full bg-[#F5F5F5] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">单次扣除</label>
              <input 
                type="number" name="decrementPerDose" min="0" step="0.1"
                defaultValue={editingDrug?.decrementPerDose ?? 1}
                className="w-full bg-[#F5F5F5] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-emerald-500 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl shadow-emerald-500/40 hover:bg-emerald-600 transition-all active:scale-[0.98] tracking-widest"
            >
              {editingDrug ? '保存修改' : '立即添加'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
