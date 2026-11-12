import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Product, AssemblyOperation } from '../types';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Printer,
  X,
  FileText,
  Layers as IconLayers,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Zap,
  Search,
  ChevronDown,
  ChevronUp,
  Keyboard
} from 'lucide-react';

interface SearchableProductSelectProps {
  label: string;
  placeholder: string;
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  onEnterSelect?: () => void;
  currency: string;
  theme: 'red' | 'emerald';
}

const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
};

const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  label,
  placeholder,
  products,
  selectedProductId,
  onSelect,
  onEnterSelect,
  currency,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  // Filter products by multi-word Arabic-normalized search across name, brand, barcode, and unit
  const filteredProducts = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    if (!q) return products;
    const words = q.split(/\s+/).filter(Boolean);
    return products.filter(p => {
      const targetText = normalizeArabic(
        `${p.name} ${p.brand || ''} ${p.barcode || ''} ${p.unit || ''}`
      );
      return words.every(w => targetText.includes(w));
    });
  }, [products, searchQuery]);

  // Sync highlightedIndex with currently selected product when opening or filtering
  useEffect(() => {
    if (filteredProducts.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const currentIdx = filteredProducts.findIndex(p => p.id === selectedProductId);
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
  }, [filteredProducts, selectedProductId, isOpen]);

  // Auto-scroll highlighted option into view when navigating with arrows
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProduct = (prod: Product, focusNext = false) => {
    onSelect(prod.id);
    setIsOpen(false);
    setSearchQuery('');
    if (focusNext && onEnterSelect) {
      setTimeout(() => onEnterSelect(), 30);
    }
  };

  // Step prev/next product directly via keyboard arrows or arrow buttons
  const stepProductSelection = (direction: 1 | -1) => {
    if (filteredProducts.length === 0) return;
    const currentIdx = filteredProducts.findIndex(p => p.id === selectedProductId);
    let nextIdx = 0;
    if (currentIdx === -1) {
      nextIdx = direction === 1 ? 0 : filteredProducts.length - 1;
    } else {
      nextIdx = (currentIdx + direction + filteredProducts.length) % filteredProducts.length;
    }
    setHighlightedIndex(nextIdx);
    onSelect(filteredProducts[nextIdx].id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredProducts.length > 0) {
        const nextIdx =
          highlightedIndex < filteredProducts.length - 1 ? highlightedIndex + 1 : 0;
        setHighlightedIndex(nextIdx);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredProducts.length > 0) {
        const prevIdx =
          highlightedIndex > 0 ? highlightedIndex - 1 : filteredProducts.length - 1;
        setHighlightedIndex(prevIdx);
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleSelectProduct(filteredProducts[highlightedIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
      }
    }
  };

  const isRed = theme === 'red';

  const displayValue = isOpen
    ? searchQuery
    : selectedProduct
    ? `${selectedProduct.name} (الرصيد: ${selectedProduct.quantity} ${selectedProduct.unit} | التكلفة: ${selectedProduct.purchasePrice} | بيع: ${selectedProduct.sellingPrice})`
    : '';

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-black text-slate-900">{label}</label>
        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
          <Keyboard className="w-3 h-3 text-slate-500" />
          <span>ابحث بالكتابة أو تنقل بالأسهم ⬆️⬇️ ثم Enter</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search
            className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              isRed ? 'text-red-600' : 'text-amber-600'
            }`}
          />

          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onFocus={() => {
              setIsOpen(true);
            }}
            onClick={() => {
              if (!isOpen) setIsOpen(true);
            }}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedProduct && isOpen
                ? `ابحث هنا... (المحدد حالياً: ${selectedProduct.name})`
                : placeholder
            }
            className={`w-full bg-white border-2 ${
              isRed
                ? 'border-red-500 focus:border-red-800 focus:ring-2 focus:ring-red-500/20'
                : 'border-amber-500 focus:border-amber-800 focus:ring-2 focus:ring-amber-500/20'
            } rounded-xl py-2 pr-9 pl-16 text-xs sm:text-sm font-black text-slate-900 placeholder:text-slate-500 focus:outline-none shadow-sm transition-all`}
          />

          {/* Clear Search / Toggle Dropdown Buttons inside input */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(searchQuery || (isOpen && selectedProduct)) && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setSearchQuery('');
                  setIsOpen(true);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                title="مسح نص البحث لعرض كل الأصناف"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsOpen(prev => !prev);
                if (!isOpen) {
                  setTimeout(() => inputRef.current?.focus(), 10);
                }
              }}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-700 transition-colors"
              title="فتح / إغلاق قائمة الأصناف"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Direct Up/Down Stepper Buttons for one-click or keyboard-like stepping */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => stepProductSelection(-1)}
            className="p-1 bg-white hover:bg-slate-100 border-2 border-slate-500 rounded-lg text-slate-800 transition-colors shadow-2xs active:scale-95"
            title="الصنف السابق (سهم لأعلى)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => stepProductSelection(1)}
            className="p-1 bg-white hover:bg-slate-100 border-2 border-slate-500 rounded-lg text-slate-800 transition-colors shadow-2xs active:scale-95"
            title="الصنف التالي (سهم لأسفل)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border-2 border-slate-600 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-100">
          {/* Dropdown Top Helper Bar */}
          <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-bold">
            <span>
              النتائج المطابقة: <strong className="text-amber-400">{filteredProducts.length}</strong> من{' '}
              {products.length} صنف
            </span>
            <span className="text-slate-300">
              ⬆️⬇️ للتنقل | <strong className="text-amber-300">Enter</strong> للاختيار |{' '}
              <strong className="text-slate-400">Esc</strong> للإغلاق
            </span>
          </div>

          <div ref={listRef} className="max-h-64 overflow-y-auto divide-y divide-slate-200">
            {filteredProducts.length === 0 ? (
              <div className="p-5 text-center text-slate-500 font-black text-xs">
                لا يوجد صنف يطابق &quot;{searchQuery}&quot; — جرب كتابة جزء آخر من اسم الصنف
              </div>
            ) : (
              filteredProducts.map((prod, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isSelected = prod.id === selectedProductId;
                return (
                  <div
                    key={prod.id}
                    ref={el => {
                      optionRefs.current[idx] = el;
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={e => {
                      e.preventDefault(); // Prevent blur before selection completes
                      handleSelectProduct(prod);
                    }}
                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors ${
                      isHighlighted
                        ? isRed
                          ? 'bg-red-600 text-white font-black'
                          : 'bg-amber-700 text-white font-black'
                        : isSelected
                        ? 'bg-amber-50 text-slate-950 font-black'
                        : 'hover:bg-slate-100 text-slate-800 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{prod.name}</span>
                      {prod.brand && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                            isHighlighted
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {prod.brand}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded font-black ${
                          isHighlighted
                            ? 'bg-white/20 text-white'
                            : prod.quantity > prod.minAlertQuantity
                            ? 'bg-amber-100 text-slate-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        الرصيد: {prod.quantity} {prod.unit}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-black ${
                          isHighlighted
                            ? 'bg-slate-900/40 text-amber-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}
                      >
                        التكلفة: {prod.purchasePrice}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-black ${
                          isHighlighted
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-amber-50 text-amber-900 border border-amber-300'
                        }`}
                      >
                        سعر البيع: {prod.sellingPrice}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AssemblyManager: React.FC = () => {
  const {
    products,
    updateProduct,
    assemblyOperations,
    executeDirectDisassembly,
    settings,
    setActiveTab,
  } = useApp();

  // Auto-generate voucher number
  const nextVoucherNumber = useMemo(() => {
    const num = (assemblyOperations?.length || 0) + 1;
    return `DSM-${Date.now().toString().slice(-4)}${num.toString().padStart(3, '0')}`;
  }, [assemblyOperations]);

  // Form State
  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Source Item State (الصنف المراد فكه - لفة)
  const [sourceProductId, setSourceProductId] = useState<string>('');
  const [sourceUnitCost, setSourceUnitCost] = useState<number>(0);
  const [sourceQty, setSourceQty] = useState<number>(1);

  // Target Item State (الصنف الناتج من الفك - أمتار)
  const [targetProductId, setTargetProductId] = useState<string>('');
  const [targetQty, setTargetQty] = useState<number>(100);
  const [targetSellingPrice, setTargetSellingPrice] = useState<number>(0);

  // Additional Notes
  const [notes, setNotes] = useState<string>('');

  // Result & Print Slip State
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    message: string;
    op?: AssemblyOperation;
  } | null>(null);
  const [slipToPrint, setSlipToPrint] = useState<AssemblyOperation | null>(null);

  // Auto-set initial voucher number
  useEffect(() => {
    setVoucherNumber(nextVoucherNumber);
  }, [nextVoucherNumber]);

  // Auto-select initial products if available
  useEffect(() => {
    if (products.length > 0) {
      if (!sourceProductId) {
        const rollProd =
          products.find(p => p.unit?.includes('لفة') || p.name.includes('لفة')) || products[0];
        if (rollProd) {
          setSourceProductId(rollProd.id);
          setSourceUnitCost(rollProd.purchasePrice || 0);
        }
      }
      if (!targetProductId) {
        const meterProd =
          products.find(
            p => (p.unit?.includes('متر') || p.name.includes('متر')) && p.id !== sourceProductId
          ) ||
          products[1] ||
          products[0];
        if (meterProd) {
          setTargetProductId(meterProd.id);
          setTargetSellingPrice(meterProd.sellingPrice || 0);
        }
      }
    }
  }, [products]);

  // Selected source product details
  const sourceProduct = useMemo(() => {
    return products.find(p => p.id === sourceProductId) || null;
  }, [products, sourceProductId]);

  // Selected target product details
  const targetProduct = useMemo(() => {
    return products.find(p => p.id === targetProductId) || null;
  }, [products, targetProductId]);

  // Update source cost when source product changes
  const handleSourceProductChange = (prodId: string) => {
    setSourceProductId(prodId);
    const p = products.find(prod => prod.id === prodId);
    if (p) {
      setSourceUnitCost(p.purchasePrice || 0);
    }
  };

  // Update target selling price when target product changes
  const handleTargetProductChange = (prodId: string) => {
    setTargetProductId(prodId);
    const p = products.find(prod => prod.id === prodId);
    if (p) {
      setTargetSellingPrice(p.sellingPrice || 0);
    }
  };

  // Automatically update product sellingPrice in system when edited in الطرف الثاني
  const handleTargetSellingPriceChange = (newPrice: number) => {
    const cleanPrice = Math.max(0, newPrice);
    setTargetSellingPrice(cleanPrice);
    if (targetProductId && cleanPrice > 0) {
      updateProduct(targetProductId, { sellingPrice: cleanPrice });
    }
  };

  // Total Value Calculation = (Source Qty * Source Unit Cost)
  const totalValue = useMemo(() => {
    return Math.round(sourceQty * sourceUnitCost * 100) / 100;
  }, [sourceQty, sourceUnitCost]);

  // Target Unit Cost Calculation = Total Value / Target Qty
  const targetUnitCost = useMemo(() => {
    if (targetQty <= 0) return 0;
    return Math.round((totalValue / targetQty) * 100) / 100;
  }, [totalValue, targetQty]);

  // Check stock availability
  const hasSufficientStock = useMemo(() => {
    if (!sourceProduct) return false;
    return sourceProduct.quantity >= sourceQty;
  }, [sourceProduct, sourceQty]);

  // Projected stock levels
  const projectedSourceStock = useMemo(() => {
    if (!sourceProduct) return 0;
    return Math.max(0, sourceProduct.quantity - sourceQty);
  }, [sourceProduct, sourceQty]);

  const projectedTargetStock = useMemo(() => {
    if (!targetProduct) return 0;
    return targetProduct.quantity + targetQty;
  }, [targetProduct, targetQty]);

  // Preset Ratio Applier (e.g. 1 لفة = 100 متر)
  const applyPresetRatio = (metersPerRoll: number) => {
    setTargetQty(sourceQty * metersPerRoll);
  };

  // Submit Handler
  const handleSubmitDisassembly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceProductId || !targetProductId) {
      setExecutionResult({
        success: false,
        message: 'يرجى اختيار كل من الصنف المراد فكه والصنف الناتج من الفك.',
      });
      return;
    }

    if (sourceProductId === targetProductId) {
      setExecutionResult({
        success: false,
        message: 'لا يمكن اختيار نفس الصنف في طرفي الفك والتحويل!',
      });
      return;
    }

    if (!hasSufficientStock) {
      setExecutionResult({
        success: false,
        message: `عجز في رصيد الصنف المراد فكه بالمخزن. المتوفر حالياً: ${
          sourceProduct?.quantity || 0
        } ${sourceProduct?.unit || 'وحدة'}.`,
      });
      return;
    }

    const res = executeDirectDisassembly({
      voucherNumber,
      sourceProductId,
      sourceQty,
      sourceUnitCost,
      targetProductId,
      targetQty,
      targetUnitCost,
      targetSellingPrice,
      notes: notes.trim() || undefined,
    });

    setExecutionResult(res);

    if (res.success) {
      setNotes('');
      setVoucherNumber(
        `DSM-${Date.now().toString().slice(-4)}${((assemblyOperations?.length || 0) + 2)
          .toString()
          .padStart(3, '0')}`
      );
    }
  };

  // Filter Disassembly History
  const disassemblyLogs = useMemo(() => {
    return assemblyOperations.filter(op => op.type === 'disassembly');
  }, [assemblyOperations]);

  return (
    <div className="space-y-4 font-sans select-none pb-8 text-xs">
      {/* HEADER BANNER */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border-2 border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shrink-0">
            <IconLayers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white">
                قسم فك الأصناف (من لفة / عبوة إلى أمتار / أجزاء)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ربط مخزني لحظي ⚡
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              نموذج موحد لفك اللفات والعبوات وتجزئتها إلى أمتار أو قطع، مع ميزة البحث الكتابي الفوري والتنقل بالأسهم.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
          <div className="bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-600 text-right">
            <span className="text-[10px] text-slate-300 block font-bold">أذونات الفك المسجلة</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {disassemblyLogs.length} إذن
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
            title="إغلاق والعودة للقائمة الرئيسية"
          >
            <X className="w-4 h-4" />
            <span>إغلاق والعودة للقائمة الرئيسية</span>
          </button>
        </div>
      </div>

      {/* ALERT NOTIFICATION */}
      {executionResult && (
        <div
          className={`p-4 rounded-2xl border-2 text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            executionResult.success
              ? 'bg-amber-50 border-amber-500 text-slate-900 font-black'
              : 'bg-red-50 border-red-500 text-red-950 font-black'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {executionResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm">{executionResult.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {executionResult.op && (
              <button
                type="button"
                onClick={() => setSlipToPrint(executionResult.op!)}
                className="px-3 py-1.5 bg-slate-900 text-amber-300 hover:text-amber-200 rounded-xl font-black flex items-center gap-1.5 text-xs transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>معاينة وطباعة إذن الفك</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setExecutionResult(null)}
              className="text-slate-500 hover:text-slate-800 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FORM CONTAINER: SINGLE FOCUSED DISASSEMBLY FORM */}
      <form
        onSubmit={handleSubmitDisassembly}
        className="bg-white rounded-2xl shadow-md border-2 border-slate-400 overflow-visible"
      >
        <div className="bg-slate-900 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>نموذج فك وتحويل الصنف بالمخزن</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-600">
            إذن رقم: {voucherNumber}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* SECTION 1: VOUCHER INFO & DATE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-400 items-end">
            {/* 1. رقم إذن الفك */}
            <div className="sm:col-span-1 md:col-span-6 lg:col-span-6">
              <label className="text-[11px] font-black text-slate-900 block mb-1">
                1. رقم إذن الفك (تلقائي)
              </label>
              <input
                type="text"
                readOnly
                value={voucherNumber}
                className="w-full bg-slate-100 border-2 border-slate-500 rounded-xl py-2 px-3 font-mono font-black text-slate-900 text-xs sm:text-sm shadow-inner text-center"
              />
            </div>

            {/* 2. التاريخ */}
            <div className="sm:col-span-1 md:col-span-6 lg:col-span-6">
              <label className="text-[11px] font-black text-slate-900 block mb-1">
                2. التاريخ
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-3 font-mono font-black text-slate-900 text-xs sm:text-sm focus:border-slate-900 focus:outline-none shadow-sm text-center"
              />
            </div>
          </div>

          {/* SECTION 2: SIDE-BY-SIDE CONVERSION CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* RIGHT BOX IN RTL: SOURCE PRODUCT (الصنف المراد فكه - لفة) */}
            <div className="md:col-span-6 bg-red-50/40 rounded-2xl p-4 border-2 border-red-400 space-y-3 relative">
              <div className="flex items-center justify-between pb-2 border-b-2 border-red-300">
                <span className="font-black text-red-950 text-xs sm:text-sm flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span>الطرف الأول: الصنف المراد فكه (سيتم خصمه -)</span>
                </span>
                {sourceProduct && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-black ${
                      hasSufficientStock
                        ? 'bg-amber-100 text-slate-800 border border-amber-400'
                        : 'bg-red-100 text-red-800 border border-red-400'
                    }`}
                  >
                    رصيد المخزن: {sourceProduct.quantity} {sourceProduct.unit}
                  </span>
                )}
              </div>

              {/* 3. اختيار الصنف المراد فكه (بحث كتابي + تنقل بالأسهم) */}
              <SearchableProductSelect
                label="3. اختيار الصنف المراد فكه *"
                placeholder="اكتب اسم الصنف للبحث أو تنقل بالأسهم (مثال: سلك سويدي)..."
                products={products}
                selectedProductId={sourceProductId}
                onSelect={handleSourceProductChange}
                currency={settings.currency}
                theme="red"
              />

              <div className="grid grid-cols-2 gap-3">
                {/* 4. تكلفة الصنف */}
                <div>
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    4. تكلفة الصنف ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={sourceUnitCost}
                    onChange={e => setSourceUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-2 text-center font-mono font-black text-slate-900 text-xs sm:text-sm focus:border-red-700 focus:outline-none shadow-sm"
                  />
                </div>

                {/* 5. العدد المراد فكه */}
                <div>
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    5. العدد (اللفة / الكمية)
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value={sourceQty}
                    onChange={e => setSourceQty(Math.max(0.001, parseFloat(e.target.value) || 1))}
                    className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-2 text-center font-mono font-black text-red-700 text-xs sm:text-sm focus:border-red-700 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Stock Impact Preview for Source Product */}
              {sourceProduct && (
                <div className="p-2.5 bg-white rounded-xl border-2 border-red-300 text-[11px] flex items-center justify-between">
                  <span className="text-slate-700 font-black">الرصيد المتوقع بالمخزن بعد الفك:</span>
                  <span
                    className={`font-mono font-black ${
                      projectedSourceStock < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {projectedSourceStock} {sourceProduct.unit}
                  </span>
                </div>
              )}
            </div>

            {/* LEFT BOX IN RTL: TARGET PRODUCT (الصنف الناتج من الفك - أمتار) */}
            <div className="md:col-span-6 bg-amber-50/40 rounded-2xl p-4 border-2 border-amber-400 space-y-3 relative">
              <div className="flex items-center justify-between pb-2 border-b-2 border-amber-300">
                <span className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>الطرف الثاني: الصنف الناتج من الفك (سيتم إضافته +)</span>
                </span>
                {targetProduct && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-black bg-amber-100 text-slate-800 border border-amber-400">
                    رصيد المخزن الحالي: {targetProduct.quantity} {targetProduct.unit}
                  </span>
                )}
              </div>

              {/* 6. اختيار الصنف الناتج من الفك (بحث كتابي + تنقل بالأسهم) */}
              <SearchableProductSelect
                label="6. اختيار الصنف الناتج من الفك *"
                placeholder="اكتب اسم الصنف الفرعي (الأمتار / القطع) أو تنقل بالأسهم..."
                products={products}
                selectedProductId={targetProductId}
                onSelect={handleTargetProductChange}
                currency={settings.currency}
                theme="emerald"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 7. العدد الناتج */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black text-slate-900">
                      7. العدد (الكمية الناتجة)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyPresetRatio(100)}
                        className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-slate-800 border border-amber-400"
                        title="تحويل 1 لفة = 100 متر"
                      >
                        100م
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetRatio(50)}
                        className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-slate-800 border border-amber-400"
                        title="تحويل 1 لفة = 50 متر"
                      >
                        50م
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value={targetQty}
                    onChange={e => setTargetQty(Math.max(0.001, parseFloat(e.target.value) || 1))}
                    className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-2 text-center font-mono font-black text-amber-800 text-xs sm:text-sm focus:border-amber-700 focus:outline-none shadow-sm"
                  />
                </div>

                {/* 8. التكلفة الناتجة للوحدة */}
                <div>
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    8. تكلفة الوحدة الناتجة
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={targetUnitCost}
                    className="w-full bg-slate-100 border-2 border-slate-500 rounded-xl py-2 px-2 text-center font-mono font-black text-slate-900 text-xs sm:text-sm shadow-inner"
                  />
                </div>

                {/* 9. سعر البيع للصنف الذى تم فكه (يحدث تلقائياً سعر بيع المنتج) */}
                <div>
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    9. سعر البيع (يحدث تلقائياً)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={targetSellingPrice || ''}
                    placeholder="سعر البيع..."
                    onChange={e => handleTargetSellingPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-amber-50 hover:bg-white focus:bg-white border-2 border-amber-600 rounded-xl py-2 px-2 text-center font-mono font-black text-slate-900 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-sm"
                    title="تحديد سعر بيع الصنف الناتج من الفك — يقوم بتحديث سعر بيع المنتج تلقائياً في النظام"
                  />
                </div>
              </div>

              {/* Stock Impact Preview for Target Product */}
              {targetProduct && (
                <div className="p-2.5 bg-white rounded-xl border-2 border-amber-300 text-[11px] flex items-center justify-between">
                  <span className="text-slate-700 font-black">الرصيد المتوقع بالمخزن بعد الفك:</span>
                  <span className="font-mono font-black text-amber-800">
                    +{targetQty} {targetProduct.unit} (الإجمالي الجديد: {projectedTargetStock}{' '}
                    {targetProduct.unit})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: TOTAL VALUE DISPLAY & SUBMIT ACTION */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border-2 border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 9. الإجمالي */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-300 font-bold block">
                  9. إجمالي قيمة عملية الفك والتحويل:
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-amber-400">
                  {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                  {settings.currency}
                </span>
              </div>
            </div>

            {/* Notes Input */}
            <div className="w-full sm:w-auto flex-1 max-w-xs">
              <input
                type="text"
                placeholder="ملاحظات إضافية على إذن الفك..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl py-2 px-3 text-xs font-bold text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* 10. Submit Disassembly Button */}
            <button
              type="submit"
              disabled={!hasSufficientStock || !sourceProductId || !targetProductId}
              className={`w-full sm:w-auto py-3 px-6 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                !hasSufficientStock || !sourceProductId || !targetProductId
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95 shadow-amber-900/30 cursor-pointer'
              }`}
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>تأكيد وتنفيذ إذن فك الصنف وإعادة تغذية المخزن تلقائياً ⚡</span>
            </button>
          </div>
        </div>
      </form>

      {/* DISASSEMBLY LOGS & VOUCHER ARCHIVE TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-400 overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
          <div className="flex items-center gap-2 font-black text-slate-900 text-xs sm:text-sm">
            <FileText className="w-4.5 h-4.5 text-amber-600" />
            <span>سجل وأرشيف أذونات فك الأصناف بالمخزن</span>
          </div>
          <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg">
            عدد الأذونات: {disassemblyLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto border-2 border-slate-400 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-extrabold">
              <tr>
                <th className="p-3 border-l border-slate-800">رقم إذن الفك</th>
                <th className="p-3 border-l border-slate-800">التاريخ</th>
                <th className="p-3 border-l border-slate-800">الصنف المخصوم (اللفة)</th>
                <th className="p-3 text-center border-l border-slate-800">الكمية المخصومة</th>
                <th className="p-3 border-l border-slate-800">الصنف المضاف (الأمتار)</th>
                <th className="p-3 text-center border-l border-slate-800">الكمية المضافة</th>
                <th className="p-3 text-center border-l border-slate-800">سعر البيع</th>
                <th className="p-3 text-center border-l border-slate-800">الإجمالي</th>
                <th className="p-3 border-l border-slate-800">المسؤول</th>
                <th className="p-3 text-center">معاينة الإذن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {disassemblyLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-black">
                    لا توجد أذونات فك أصناف مسجلة حالياً.
                  </td>
                </tr>
              ) : (
                disassemblyLogs.map(op => {
                  const sourceComp = op.componentsAffected?.find(c => c.direction === 'deducted');
                  const targetComp = op.componentsAffected?.find(c => c.direction === 'added');
                  const targetProdId = targetComp?.productId || op.targetProductId;
                  const liveTargetProd = products.find(p => p.id === targetProdId);
                  const currentSellingPrice =
                    liveTargetProd?.sellingPrice ?? targetComp?.sellingPrice ?? op.sellingPrice ?? 0;

                  return (
                    <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 border-l border-slate-200">
                        {op.operationNumber}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-[11px] border-l border-slate-200">
                        {new Date(op.date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3 font-bold text-red-700 border-l border-slate-200">
                        {sourceComp?.productName || op.targetProductName}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-red-700 border-l border-slate-200">
                        -{sourceComp?.quantity || op.quantity} {sourceComp?.unit || 'وحدة'}
                      </td>
                      <td className="p-3 font-bold text-amber-800 border-l border-slate-200">
                        {targetComp?.productName || op.targetProductName}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-amber-800 border-l border-slate-200">
                        +{targetComp?.quantity || op.quantity} {targetComp?.unit || 'وحدة'}
                      </td>
                      <td className="p-2 text-center font-mono font-black text-slate-900 border-l border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={currentSellingPrice}
                          onChange={e => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            if (targetProdId && val > 0) {
                              updateProduct(targetProdId, { sellingPrice: val });
                              if (targetProdId === targetProductId) {
                                setTargetSellingPrice(val);
                              }
                            }
                          }}
                          className="w-24 bg-amber-50 hover:bg-white focus:bg-white border border-amber-500 rounded-lg py-1 px-2 text-center font-mono font-black text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          title="تعديل سعر بيع المنتج مباشرة"
                        />
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-900 border-l border-slate-200">
                        {op.totalCost.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-slate-700 border-l border-slate-200 text-xs">
                        {op.performedBy}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSlipToPrint(op)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>معاينة إذن الفك</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE SLIP MODAL */}
      {slipToPrint && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-2 border-slate-500 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <h3 className="font-black text-base text-slate-900">
                إذن فك وتحويل مخزني رسمي
              </h3>
              <button
                type="button"
                onClick={() => setSlipToPrint(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Paper Layout */}
            <div className="p-5 border-2 border-dashed border-slate-400 rounded-2xl space-y-4 bg-slate-50/50 text-xs">
              <div className="text-center pb-3 border-b border-slate-200">
                <h4 className="font-black text-lg text-slate-950">{settings.storeName}</h4>
                <p className="text-xs text-slate-500 font-bold">قسم مراقبة وحركة المخزون</p>
                <div className="flex justify-center gap-4 text-xs font-mono font-bold mt-2 text-slate-700">
                  <span>رقم الإذن: {slipToPrint.operationNumber}</span>
                  <span>التاريخ: {new Date(slipToPrint.date).toLocaleString('ar-EG')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-300">
                  <span className="text-slate-500 font-bold">نوع الحركة:</span>
                  <strong className="text-slate-900">فك وتحويل صنف من لفّة إلى أمتار</strong>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-300">
                  <span className="text-slate-500 font-bold">المسؤول المنفذ:</span>
                  <strong className="text-slate-900">{slipToPrint.performedBy}</strong>
                </div>
              </div>

              {/* Component breakdown */}
              <div>
                <span className="text-xs font-black text-slate-800 block mb-1">
                  تفاصيل الأصناف والكميات المتأثرة بالمخزن:
                </span>
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2">الصنف</th>
                        <th className="p-2 text-center">الكمية</th>
                        <th className="p-2 text-center">تأثير المخزن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(slipToPrint.componentsAffected || []).map((comp, i) => (
                        <tr key={i}>
                          <td className="p-2 font-bold text-slate-900">{comp.productName}</td>
                          <td className="p-2 text-center font-mono font-bold">
                            {comp.quantity} {comp.unit}
                          </td>
                          <td className="p-2 text-center font-bold">
                            <span
                              className={
                                comp.direction === 'deducted'
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              }
                            >
                              {comp.direction === 'deducted' ? 'خصم (-)' : 'إضافة (+)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                <span>إجمالي القيمة:</span>
                <span className="font-mono font-black text-base text-slate-900">
                  {slipToPrint.totalCost.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSlipToPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإذن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
