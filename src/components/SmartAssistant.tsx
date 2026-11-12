import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import {
  Sparkles,
  Send,
  Bot,
  User,
  TrendingUp,
  AlertTriangle,
  Users,
  Building2,
  Wallet,
  Package,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  X,
  ArrowUpRight,
  Layers,
  Zap,
  Search,
  BadgeDollarSign,
  RotateCcw,
  Percent,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

interface PriceChangeRecord {
  productId: string;
  productName: string;
  unit: string;
  oldPurchasePrice: number;
  newPurchasePrice: number;
  oldSellingPrice: number;
  newSellingPrice: number;
  oldWholesalePrice?: number;
  newWholesalePrice?: number;
}

interface PriceBatchSnapshot {
  id: string;
  description: string;
  timestamp: string;
  changes: PriceChangeRecord[];
  reverted?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  actionTab?: { label: string; tabId: string };
  priceBatch?: PriceBatchSnapshot;
}

interface SmartAssistantProps {
  isFloatingModal?: boolean;
  onCloseModal?: () => void;
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

const CATEGORY_LABELS: Record<string, string> = {
  wires_cables: 'أسلاك وكابلات',
  switches_sockets: 'مفاتيح وبرايز وشاسيهات',
  lighting_bulbs: 'لمبات وكشافات وإنارة',
  breakers_panels: 'قواطع ولوحات توزيع',
  pipes_conduits: 'خراطيم وبواطات ومواسير',
  tools_meters: 'عدد وأجهزة قياس',
  fans_heaters: 'مراوح وشفاطات',
  accessories: 'مستلزمات وإكسسوارات كهربائية',
};

export const SmartAssistant: React.FC<SmartAssistantProps> = ({
  isFloatingModal = false,
  onCloseModal,
}) => {
  const {
    products,
    updateProduct,
    customers,
    suppliers,
    salesInvoices,
    purchaseInvoices,
    expenses,
    safes,
    assemblyOperations,
    metrics,
    settings,
    setActiveTab,
    openStatement,
  } = useApp();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastPriceSnapshots, setLastPriceSnapshots] = useState<PriceBatchSnapshot[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Smart Price Adjuster Studio State
  const [scopeType, setScopeType] = useState<'all' | 'brand' | 'category' | 'single'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('wires_cables');
  const [selectedSingleProductId, setSelectedSingleProductId] = useState<string>('');
  const [singleProductSearch, setSingleProductSearch] = useState<string>('');
  const [isSingleDropdownOpen, setIsSingleDropdownOpen] = useState<boolean>(false);
  const [singleHighlightIdx, setSingleHighlightIdx] = useState<number>(0);

  const [priceFieldTarget, setPriceFieldTarget] = useState<
    'selling' | 'purchase' | 'wholesale' | 'selling_and_wholesale' | 'all_prices'
  >('selling');
  const [adjustmentMode, setAdjustmentMode] = useState<
    'percent_up' | 'percent_down' | 'fixed_up' | 'fixed_down' | 'margin_over_cost' | 'direct_value'
  >('percent_up');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(10);
  const [roundingStep, setRoundingStep] = useState<number>(1); // 0 = exact, 1 = nearest 1 EGP, 5 = nearest 5 EGP

  // Available unique brands
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.brand && p.brand.trim()) set.add(p.brand.trim());
    });
    return Array.from(set);
  }, [products]);

  useEffect(() => {
    if (!selectedBrand && availableBrands.length > 0) {
      setSelectedBrand(availableBrands[0]);
    }
    if (!selectedSingleProductId && products.length > 0) {
      setSelectedSingleProductId(products[0].id);
    }
  }, [availableBrands, products]);

  // Filtered products for single-product combobox in Price Studio
  const filteredSingleProducts = useMemo(() => {
    const q = normalizeArabic(singleProductSearch);
    if (!q) return products;
    const words = q.split(/\s+/).filter(Boolean);
    return products.filter(p => {
      const target = normalizeArabic(`${p.name} ${p.brand || ''} ${p.barcode || ''}`);
      return words.every(w => target.includes(w));
    });
  }, [products, singleProductSearch]);

  // Build comprehensive live store context summary for Gemini & local analyzer
  const storeAnalytics = useMemo(() => {
    const lowStockProducts = products.filter(p => p.quantity <= p.minAlertQuantity);
    const outOfStockProducts = products.filter(p => p.quantity <= 0);
    const topDebtCustomers = [...customers]
      .filter(c => c.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance);
    const topPayableSuppliers = [...suppliers]
      .filter(s => s.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance);

    const productSalesMap = new Map<
      string,
      { name: string; qty: number; revenue: number; profit: number; unit: string }
    >();
    salesInvoices
      .filter(inv => inv.status === 'completed')
      .forEach(inv => {
        inv.items.forEach(item => {
          const prev = productSalesMap.get(item.productId) || {
            name: item.productName,
            qty: 0,
            revenue: 0,
            profit: 0,
            unit: item.unit || 'قطعة',
          };
          const itemProfit = (item.unitPrice - (item.purchaseCost || 0)) * item.quantity;
          productSalesMap.set(item.productId, {
            name: item.productName,
            qty: prev.qty + item.quantity,
            revenue: prev.revenue + item.total,
            profit: prev.profit + itemProfit,
            unit: item.unit || prev.unit,
          });
        });
      });

    const topSellingProducts = Array.from(productSalesMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    const totalSafeBalance = safes.reduce((sum, s) => sum + s.balance, 0);

    const summaryText = `
اسم المؤسسة: ${settings.storeName} (${settings.ownerName})
إجمالي عدد الأصناف بالمخزن: ${products.length} صنف
قيمة المخزون بسعر التكلفة: ${metrics.inventoryCostValue.toLocaleString()} ج.م
قيمة المخزون بسعر البيع: ${metrics.inventoryRetailValue.toLocaleString()} ج.م
الأصناف الناقصة (تحت حد الطلب): ${lowStockProducts.length} صنف
إجمالي المبيعات الكلية: ${metrics.totalSalesRevenue.toLocaleString()} ج.م (مبيعات اليوم: ${metrics.todaySales.toLocaleString()} ج.م)
صافي الربح الفعلي: ${metrics.netProfit.toLocaleString()} ج.م
إجمالي السيولة بالخزائن والمحافظ: ${totalSafeBalance.toLocaleString()} ج.م
إجمالي مديونيات العملاء: ${metrics.customerDebts.toLocaleString()} ج.م
إجمالي مستحقات الموردين: ${metrics.supplierPayables.toLocaleString()} ج.م
قائمة الأصناف وأسعارها الحالية:
${products
  .slice(0, 25)
  .map(
    p =>
      `- ${p.name} (الماركة: ${p.brand || 'عام'}): شراء=${p.purchasePrice} ج.م، بيع=${p.sellingPrice} ج.م، جملة=${
        p.wholesalePrice || p.sellingPrice
      } ج.م، الرصيد=${p.quantity} ${p.unit}`
  )
  .join('\n')}
`.trim();

    return {
      lowStockProducts,
      outOfStockProducts,
      topDebtCustomers,
      topPayableSuppliers,
      topSellingProducts,
      totalSafeBalance,
      summaryText,
    };
  }, [products, customers, suppliers, salesInvoices, safes, metrics, settings]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'model',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      text: `مرحباً بك في **المساعد الذكي لمنظومة ${settings.storeName}** ⚡\n\nيمكنني الآن **تعديل أسعار الأصناف فوراً حسب طلبك** بالإضافة إلى التحليل المالي والمخزني! جرب أن تكتب لي مباشرةً مثلاً:\n• **"ارفع أسعار جميع الأصناف بنسبة 10%"** أو **"خفض أسعار البيع 5%"**\n• **"زود أسعار ماركة السويدي 10%"** أو **"ارفع أسعار فينوس 15 جنيه"**\n• **"عدل سعر بيع سلك نحاس 1.5 إلى 1200"**\n• **"اضبط سعر البيع لكل الأصناف بربح 25% فوق سعر الشراء"**\nكما يمكنك استخدام **«وحدة تعديل الأسعار الذكية»** في القائمة الجانبية اليسرى وتجربة التراجع الفوري بضغطة زر.`,
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Round helper
  const applyRounding = (val: number, step: number) => {
    const clean = Math.max(1, val);
    if (!step || step <= 0) return Math.round(clean * 100) / 100;
    return Math.max(1, Math.round(clean / step) * step);
  };

  // Execute batch price update and record undoable snapshot
  const executeBatchPriceChanges = (
    targetProducts: Product[],
    computeNewPrices: (p: Product) => {
      newPurchase: number;
      newSelling: number;
      newWholesale?: number;
    },
    description: string
  ): PriceBatchSnapshot | null => {
    const changes: PriceChangeRecord[] = [];

    targetProducts.forEach(p => {
      const { newPurchase, newSelling, newWholesale } = computeNewPrices(p);
      const oldW = p.wholesalePrice ?? p.sellingPrice;
      const nextW = newWholesale !== undefined ? newWholesale : oldW;

      if (
        newPurchase !== p.purchasePrice ||
        newSelling !== p.sellingPrice ||
        nextW !== p.wholesalePrice
      ) {
        changes.push({
          productId: p.id,
          productName: p.name,
          unit: p.unit,
          oldPurchasePrice: p.purchasePrice,
          newPurchasePrice: newPurchase,
          oldSellingPrice: p.sellingPrice,
          newSellingPrice: newSelling,
          oldWholesalePrice: p.wholesalePrice,
          newWholesalePrice: nextW,
        });

        updateProduct(p.id, {
          purchasePrice: newPurchase,
          sellingPrice: newSelling,
          wholesalePrice: nextW,
        });
      }
    });

    if (changes.length === 0) return null;

    const snapshot: PriceBatchSnapshot = {
      id: `snap-${Date.now()}`,
      description,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      changes,
      reverted: false,
    };

    setLastPriceSnapshots(prev => [snapshot, ...prev]);
    return snapshot;
  };

  // Revert a price batch snapshot
  const handleUndoPriceBatch = (batchId: string) => {
    const snap = lastPriceSnapshots.find(s => s.id === batchId);
    if (!snap || snap.reverted) return;

    snap.changes.forEach(ch => {
      updateProduct(ch.productId, {
        purchasePrice: ch.oldPurchasePrice,
        sellingPrice: ch.oldSellingPrice,
        wholesalePrice: ch.oldWholesalePrice,
      });
    });

    setLastPriceSnapshots(prev =>
      prev.map(s => (s.id === batchId ? { ...s, reverted: true } : s))
    );

    setMessages(prev =>
      prev.map(m =>
        m.priceBatch?.id === batchId
          ? { ...m, priceBatch: { ...m.priceBatch, reverted: true } }
          : m
      )
    );

    setMessages(prev => [
      ...prev,
      {
        id: `undo-${Date.now()}`,
        role: 'model',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        text: `↩️ **تم التراجع بنجاح عن تعديل الأسعار:** (${snap.description}) وتمت استعادة الأسعار الأصلية لعدد **${snap.changes.length} صنف** في المخزن.`,
      },
    ]);
  };

  // Interactive Studio Handler
  const handleApplyStudioPriceAdjustment = () => {
    let targetList: Product[] = [];
    let scopeDesc = 'جميع الأصناف';

    if (scopeType === 'all') {
      targetList = products;
      scopeDesc = 'جميع أصناف المخزن';
    } else if (scopeType === 'brand') {
      targetList = products.filter(
        p => normalizeArabic(p.brand || '') === normalizeArabic(selectedBrand)
      );
      scopeDesc = `أصناف ماركة (${selectedBrand})`;
    } else if (scopeType === 'category') {
      targetList = products.filter(p => p.category === selectedCategory);
      scopeDesc = `تصنيف (${CATEGORY_LABELS[selectedCategory] || selectedCategory})`;
    } else if (scopeType === 'single') {
      const found = products.find(p => p.id === selectedSingleProductId);
      if (found) {
        targetList = [found];
        scopeDesc = `صنف (${found.name})`;
      }
    }

    if (targetList.length === 0) return;

    const val = Number(adjustmentValue) || 0;
    if (val <= 0) return;

    const modeDescMap: Record<typeof adjustmentMode, string> = {
      percent_up: `زيادة بنسبة +${val}%`,
      percent_down: `تخفيض بنسبة -${val}%`,
      fixed_up: `زيادة بمبلغ +${val} ج.م`,
      fixed_down: `تخفيض بمبلغ -${val} ج.م`,
      margin_over_cost: `هامش ربح +${val}% فوق سعر الشراء`,
      direct_value: `تحديد سعر مباشر ${val} ج.م`,
    };

    const fieldDescMap: Record<typeof priceFieldTarget, string> = {
      selling: 'سعر البيع القطاعي',
      purchase: 'سعر الشراء (التكلفة)',
      wholesale: 'سعر الجملة',
      selling_and_wholesale: 'سعري البيع القطاعي والجملة',
      all_prices: 'جميع الأسعار (الشراء والبيع والجملة)',
    };

    const calcSingleField = (oldPrice: number, baseCost: number) => {
      let raw = oldPrice;
      if (adjustmentMode === 'percent_up') raw = oldPrice * (1 + val / 100);
      else if (adjustmentMode === 'percent_down') raw = oldPrice * (1 - val / 100);
      else if (adjustmentMode === 'fixed_up') raw = oldPrice + val;
      else if (adjustmentMode === 'fixed_down') raw = Math.max(1, oldPrice - val);
      else if (adjustmentMode === 'margin_over_cost') raw = baseCost * (1 + val / 100);
      else if (adjustmentMode === 'direct_value') raw = val;
      return applyRounding(raw, roundingStep);
    };

    const description = `${modeDescMap[adjustmentMode]} على ${fieldDescMap[priceFieldTarget]} لـ ${scopeDesc}`;

    const snap = executeBatchPriceChanges(
      targetList,
      p => {
        let newPurchase = p.purchasePrice;
        let newSelling = p.sellingPrice;
        let newWholesale = p.wholesalePrice ?? p.sellingPrice;

        if (priceFieldTarget === 'purchase' || priceFieldTarget === 'all_prices') {
          newPurchase = calcSingleField(p.purchasePrice, p.purchasePrice);
        }
        if (
          priceFieldTarget === 'selling' ||
          priceFieldTarget === 'selling_and_wholesale' ||
          priceFieldTarget === 'all_prices'
        ) {
          newSelling = calcSingleField(p.sellingPrice, newPurchase);
        }
        if (
          priceFieldTarget === 'wholesale' ||
          priceFieldTarget === 'selling_and_wholesale' ||
          priceFieldTarget === 'all_prices'
        ) {
          newWholesale = calcSingleField(p.wholesalePrice ?? p.sellingPrice, newPurchase);
        }

        return { newPurchase, newSelling, newWholesale };
      },
      description
    );

    if (snap) {
      setMessages(prev => [
        ...prev,
        {
          id: `usr-studio-${Date.now()}`,
          role: 'user',
          text: `تعديل الأسعار: ${description}`,
          timestamp: snap.timestamp,
        },
        {
          id: `ai-studio-${Date.now()}`,
          role: 'model',
          text: `✅ **تم تنفيذ تعديل الأسعار بنجاح في المخزن!**\n• **تفاصيل العملية:** ${description}\n• **عدد الأصناف المعدلة:** **${snap.changes.length} صنف**\n\nفيما يلي كشف الأسعار قبل وبعد التعديل (مع إمكانية التراجع الفوري):`,
          timestamp: snap.timestamp,
          priceBatch: snap,
          actionTab: { label: 'معاينة الأسعار في المخزن', tabId: 'inventory' },
        },
      ]);
    }
  };

  // Natural Language Price Modification Parser (handles chat commands like "ارفع اسعار السويدي 10%" or "عدل سعر سلك 1.5 الى 1200")
  const tryParseAndExecuteNaturalPriceCommand = (
    rawQuery: string
  ): { handled: boolean; replyText?: string; snapshot?: PriceBatchSnapshot } => {
    const qNorm = normalizeArabic(rawQuery);

    // Check if the prompt has price-modification intent
    const hasModifyVerb =
      qNorm.includes('ارفع') ||
      qNorm.includes('زود') ||
      qNorm.includes('زياده') ||
      qNorm.includes('خفض') ||
      qNorm.includes('نقص') ||
      qNorm.includes('قلل') ||
      qNorm.includes('خصم') ||
      qNorm.includes('عدل') ||
      qNorm.includes('غير') ||
      qNorm.includes('خلي') ||
      qNorm.includes('اجعل') ||
      qNorm.includes('اضبط') ||
      qNorm.includes('حدث') ||
      qNorm.includes('تعديل اسعار') ||
      qNorm.includes('تعديل سعر');

    const hasPriceWord =
      qNorm.includes('سعر') ||
      qNorm.includes('اسعار') ||
      qNorm.includes('الاسعار') ||
      qNorm.includes('ربح') ||
      qNorm.includes('تكلفه') ||
      qNorm.includes('جمله') ||
      qNorm.includes('قطاعي') ||
      qNorm.includes('%');

    if (!hasModifyVerb || !hasPriceWord) {
      return { handled: false };
    }

    // Extract numbers (convert Arabic-Indic digits ١٢٣٤٥٦٧٨٩٠ if any)
    const englishDigitsQuery = rawQuery.replace(/[٠-٩]/g, d =>
      '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()
    );

    const isPercent =
      englishDigitsQuery.includes('%') ||
      qNorm.includes('بالمئه') ||
      qNorm.includes('في الميه') ||
      qNorm.includes('بالميه') ||
      qNorm.includes('نسبه');

    const isDecrease =
      qNorm.includes('خفض') ||
      qNorm.includes('نقص') ||
      qNorm.includes('قلل') ||
      qNorm.includes('خصم');

    const isMarginOverCost =
      (qNorm.includes('ربح') || qNorm.includes('فوق الشراء') || qNorm.includes('فوق التكلفه')) &&
      isPercent;

    // Determine which price field(s) to update
    const targetPurchase = qNorm.includes('شراء') || qNorm.includes('تكلفه');
    const targetWholesale = qNorm.includes('جمله');
    const targetSelling =
      qNorm.includes('بيع') ||
      qNorm.includes('قطاعي') ||
      (!targetPurchase && !targetWholesale);

    // Determine target products:
    // 1. Check if "كل" / "جميع" -> all products
    let targetProducts: Product[] = [];
    let targetDescription = '';

    // Check brand match first
    const matchedBrand = availableBrands.find(b => {
      const bNorm = normalizeArabic(b);
      return (
        qNorm.includes(bNorm) ||
        bNorm
          .split(/\s+/)
          .filter(w => w.length >= 4)
          .some(w => qNorm.includes(w))
      );
    });

    // Check category keywords
    const categoryKeywords: { cat: string; label: string; words: string[] }[] = [
      { cat: 'wires_cables', label: 'الأسلاك والكابلات', words: ['اسلاك', 'كابلات', 'كابل'] },
      { cat: 'switches_sockets', label: 'المفاتيح والبرايز', words: ['مفاتيح', 'برايز', 'لقمه', 'شاسيه', 'وش'] },
      { cat: 'lighting_bulbs', label: 'اللمبات والكشافات', words: ['لمبات', 'كشافات', 'اناره', 'سبوت', 'بانل', 'ليد'] },
      { cat: 'breakers_panels', label: 'القواطع واللوحات', words: ['قواطع', 'قاطع', 'اوتوماتيك', 'لوحات'] },
      { cat: 'pipes_conduits', label: 'الخراطيم والمواسير', words: ['خراطيم', 'مواسير', 'بواطات'] },
    ];

    // Check specific single product match (excluding numbers that represent the new price)
    const specificMatches = products.filter(p => {
      const pNorm = normalizeArabic(p.name);
      if (qNorm.includes(pNorm)) return true;
      const pTokens = pNorm.split(/\s+/).filter(w => w.length >= 3);
      const matchedTokens = pTokens.filter(t => qNorm.includes(t));
      return matchedTokens.length >= 2;
    });

    if (
      (qNorm.includes('كل الاصناف') ||
        qNorm.includes('جميع الاصناف') ||
        qNorm.includes('كل الاسعار') ||
        qNorm.includes('جميع الاسعار') ||
        qNorm.includes('المخزن كله')) &&
      !matchedBrand
    ) {
      targetProducts = products;
      targetDescription = 'جميع أصناف المخزن';
    } else if (specificMatches.length > 0 && specificMatches.length <= 4) {
      targetProducts = specificMatches;
      targetDescription =
        specificMatches.length === 1
          ? `صنف (${specificMatches[0].name})`
          : `الأصناف المطابقة (${specificMatches.map(p => p.name).join(' ، ')})`;
    } else if (matchedBrand) {
      targetProducts = products.filter(
        p => normalizeArabic(p.brand || '') === normalizeArabic(matchedBrand)
      );
      targetDescription = `أصناف ماركة (${matchedBrand})`;
    } else {
      const matchedCat = categoryKeywords.find(ck =>
        ck.words.some(w => qNorm.includes(normalizeArabic(w)))
      );
      if (matchedCat) {
        targetProducts = products.filter(p => p.category === matchedCat.cat);
        targetDescription = `تصنيف (${matchedCat.label})`;
      } else if (
        qNorm.includes('ارفع الاسعار') ||
        qNorm.includes('زود الاسعار') ||
        qNorm.includes('خفض الاسعار') ||
        qNorm.includes('الاصناف')
      ) {
        targetProducts = products;
        targetDescription = 'جميع أصناف المخزن';
      }
    }

    if (targetProducts.length === 0) {
      return { handled: false };
    }

    // Extract the adjustment number (usually the last number in the command or the number attached to %)
    const percentMatch = englishDigitsQuery.match(/(\d+(?:\.\d+)?)\s*%/);
    const allNumbers = Array.from(englishDigitsQuery.matchAll(/(\d+(?:\.\d+)?)/g)).map(m =>
      parseFloat(m[1])
    );

    if (allNumbers.length === 0) {
      return { handled: false };
    }

    const numericValue = percentMatch
      ? parseFloat(percentMatch[1])
      : allNumbers[allNumbers.length - 1];

    if (!numericValue || numericValue <= 0) {
      return { handled: false };
    }

    // Determine if it's a direct price assignment (e.g., "عدل سعر سلك 1.5 إلى 1200" or "خلي سعر ... ب 1200")
    const isDirectPriceSet =
      !isPercent &&
      (qNorm.includes('الي ') ||
        qNorm.includes('لـ ') ||
        qNorm.includes('بـ ') ||
        qNorm.includes('يكون ') ||
        qNorm.includes('يساوي ') ||
        qNorm.startsWith('عدل') ||
        qNorm.startsWith('غير') ||
        qNorm.startsWith('خلي') ||
        qNorm.startsWith('اجعل')) &&
      !qNorm.includes('زود') &&
      !qNorm.includes('ارفع') &&
      !qNorm.includes('خفض') &&
      !qNorm.includes('نقص');

    let actionSummary = '';
    if (isMarginOverCost) {
      actionSummary = `ضبط السعر بهامش ربح +${numericValue}% فوق سعر الشراء لـ ${targetDescription}`;
    } else if (isPercent) {
      actionSummary = `${isDecrease ? 'تخفيض' : 'زيادة'} بنسبة ${numericValue}% لـ ${targetDescription}`;
    } else if (isDirectPriceSet) {
      actionSummary = `تحديد السعر الجديد بـ ${numericValue.toLocaleString()} ج.م لـ ${targetDescription}`;
    } else {
      actionSummary = `${isDecrease ? 'تخفيض' : 'زيادة'} بمبلغ ${numericValue.toLocaleString()} ج.م لـ ${targetDescription}`;
    }

    const computeNextPrice = (oldPrice: number, costPrice: number) => {
      if (isMarginOverCost) return applyRounding(costPrice * (1 + numericValue / 100), 1);
      if (isPercent) {
        const factor = isDecrease ? 1 - numericValue / 100 : 1 + numericValue / 100;
        return applyRounding(oldPrice * factor, 1);
      }
      if (isDirectPriceSet) return Math.max(1, numericValue);
      return Math.max(1, Math.round((isDecrease ? oldPrice - numericValue : oldPrice + numericValue) * 100) / 100);
    };

    const snap = executeBatchPriceChanges(
      targetProducts,
      p => {
        const newPurchase = targetPurchase
          ? computeNextPrice(p.purchasePrice, p.purchasePrice)
          : p.purchasePrice;
        const newSelling = targetSelling
          ? computeNextPrice(p.sellingPrice, newPurchase)
          : p.sellingPrice;
        const newWholesale = targetWholesale
          ? computeNextPrice(p.wholesalePrice ?? p.sellingPrice, newPurchase)
          : isPercent && targetSelling && p.wholesalePrice
          ? computeNextPrice(p.wholesalePrice, newPurchase)
          : p.wholesalePrice;

        return { newPurchase, newSelling, newWholesale };
      },
      actionSummary
    );

    if (!snap) {
      return {
        handled: true,
        replyText: `ℹ️ الأسعار الحالية لـ **${targetDescription}** مطابقة بالفعل للقيمة المطلوبة ولا تحتاج لتغيير.`,
      };
    }

    return {
      handled: true,
      replyText: `✅ **تم تنفيذ طلبك وتعديل الأسعار في المخزن فوراً!**\n• **الإجراء المنفذ:** ${actionSummary}\n• **عدد الأصناف التي تم تحديث أسعارها:** **${snap.changes.length} صنف**\n\nفيما يلي جدول مقارنة الأسعار قبل وبعد التعديل (ويمكنك الضغط على **تراجع** لاستعادة الأسعار السابقة في أي وقت):`,
      snapshot: snap,
    };
  };

  // Local intelligent ERP analyzer (guarantees instant, accurate answers from live store data)
  const generateLocalSmartResponse = (
    query: string
  ): { text: string; actionTab?: { label: string; tabId: string } } => {
    const q = normalizeArabic(query);

    // 1. Check if asking about specific product by name or barcode
    const matchedProducts = products.filter(p => {
      const pNorm = normalizeArabic(p.name);
      return (
        pNorm.includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (q.length > 3 &&
          q
            .split(/\s+/)
            .filter(w => w.length > 2 && !['سعر', 'رصيد', 'كميه', 'صنف', 'كشف', 'حركه'].includes(w))
            .some(word => pNorm.includes(word)))
      );
    });

    if (
      (q.includes('سعر') || q.includes('رصيد') || q.includes('كميه') || q.includes('صنف')) &&
      matchedProducts.length > 0 &&
      !q.includes('نواقص') &&
      !q.includes('ارباح')
    ) {
      const list = matchedProducts
        .slice(0, 6)
        .map(
          p =>
            `• **${p.name}** (${p.brand || 'عام'})\n  - الرصيد الحالي: **${p.quantity} ${p.unit}** ${
              p.quantity <= p.minAlertQuantity ? '⚠️ (وصل لحد الطلب)' : '✅'
            }\n  - سعر الشراء: **${p.purchasePrice.toLocaleString()} ج.م** | سعر البيع: **${p.sellingPrice.toLocaleString()} ج.م** | جملة: **${(
              p.wholesalePrice || p.sellingPrice
            ).toLocaleString()} ج.م**\n  - ربح الوحدة: **${(
              p.sellingPrice - p.purchasePrice
            ).toLocaleString()} ج.م**`
        )
        .join('\n\n');

      return {
        text: `📦 **نتائج فحص الأصناف المطابقة في المخزن (${matchedProducts.length} صنف):**\n\n${list}\n\n💡 *لتعديل سعر أي صنف، اكتب لي مثلاً: "عدل سعر بيع ${matchedProducts[0].name} إلى ${
          matchedProducts[0].sellingPrice + 20
        }"*`,
        actionTab: { label: 'فتح المخازن والأصناف', tabId: 'inventory' },
      };
    }

    // 2. Low stock / Inventory shortages
    if (q.includes('نواقص') || q.includes('ناقص') || q.includes('مخزن') || q.includes('جرد')) {
      const { lowStockProducts, outOfStockProducts } = storeAnalytics;
      const lowList =
        lowStockProducts.length > 0
          ? lowStockProducts
              .slice(0, 10)
              .map(
                (p, idx) =>
                  `${idx + 1}. **${p.name}** — المتبقي: **${p.quantity} ${p.unit}** (حد الطلب: ${p.minAlertQuantity} ${p.unit}) | تكلفة الشراء: ${p.purchasePrice.toLocaleString()} ج.م`
              )
              .join('\n')
          : '✅ جميع الأصناف متوفرة بكميات آمنة فوق حد الطلب الأدنى.';

      return {
        text: `📊 **تقرير حالة المخازن والنواقص الحرجة:**\n\n• إجمالي الأصناف المسجلة: **${products.length} صنف**\n• قيمة المخزون (بسعر التكلفة): **${metrics.inventoryCostValue.toLocaleString()} ج.م**\n• قيمة المخزون (بسعر البيع): **${metrics.inventoryRetailValue.toLocaleString()} ج.م**\n• الربح المتوقع من تصريف المخزون الحالي: **${(
          metrics.inventoryRetailValue - metrics.inventoryCostValue
        ).toLocaleString()} ج.م**\n• أصناف نفدت تماماً (رصيد صفر): **${outOfStockProducts.length} صنف**\n• أصناف وصلت لحد النواقص والطلب: **${lowStockProducts.length} صنف**\n\n**أهم الأصناف التي تحتاج طلب شراء عاجل:**\n${lowList}`,
        actionTab: { label: 'فتح نواقص المخزن', tabId: 'expiry' },
      };
    }

    // 3. Customer debts & collection
    if (q.includes('عميل') || q.includes('عملاء') || q.includes('مديون') || q.includes('ديون') || q.includes('مقاول')) {
      const { topDebtCustomers } = storeAnalytics;
      const debtList =
        topDebtCustomers.length > 0
          ? topDebtCustomers
              .slice(0, 8)
              .map(
                (c, i) =>
                  `${i + 1}. **${c.name}** (${c.phone || 'بدون هاتف'}) — المديونية: **${c.currentBalance.toLocaleString()} ج.م**`
              )
              .join('\n')
          : '✅ لا توجد مديونيات متأخرة على العملاء حالياً.';

      return {
        text: `👥 **تقرير مديونيات العملاء والمقاولين وخطة التحصيل:**\n\n• إجمالي عدد العملاء المسجلين: **${customers.length} عميل**\n• عدد العملاء المدينين للمحل: **${topDebtCustomers.length} عميل**\n• إجمالي المديونيات المستحقة للتحصيل: **${metrics.customerDebts.toLocaleString()} ج.م**\n\n**أعلى العملاء مديونية (أولوية التحصيل):**\n${debtList}`,
        actionTab: { label: 'فتح قسم العملاء والتحصيل', tabId: 'customers' },
      };
    }

    // 4. Suppliers & payables
    if (q.includes('مورد') || q.includes('موردين') || q.includes('شركات') || q.includes('مشتريات')) {
      const { topPayableSuppliers } = storeAnalytics;
      const supList =
        topPayableSuppliers.length > 0
          ? topPayableSuppliers
              .slice(0, 8)
              .map(
                (s, i) =>
                  `${i + 1}. **${s.name}** (${s.phone || 'بدون هاتف'}) — المستحق له: **${s.currentBalance.toLocaleString()} ج.م**`
              )
              .join('\n')
          : '✅ لا توجد مديونيات مستحقة للموردين حالياً.';

      return {
        text: `🏢 **تقرير الموردين والشركات وفواتير الشراء:**\n\n• إجمالي الموردين المسجلين: **${suppliers.length} مورد**\n• عدد فواتير المشتريات المسجلة: **${purchaseInvoices.length} فاتورة**\n• إجمالي المستحقات المطلوبة للموردين: **${metrics.supplierPayables.toLocaleString()} ج.م**\n\n**قائمة الموردين المستحق لهم دفعات:**\n${supList}`,
        actionTab: { label: 'فتح قسم الموردين والشركات', tabId: 'suppliers' },
      };
    }

    // 5. Safes, Treasury & Expenses
    if (q.includes('خزين') || q.includes('خزائن') || q.includes('مصروف') || q.includes('سيول') || q.includes('محفظ')) {
      const safesList = safes
        .map(s => `• **${s.name}**: **${s.balance.toLocaleString()} ج.م**`)
        .join('\n');

      const recentExpenses = expenses
        .slice(0, 5)
        .map(
          e =>
            `• ${e.title}: **${e.amount.toLocaleString()} ج.م** (${new Date(e.date).toLocaleDateString('ar-EG')})`
        )
        .join('\n');

      return {
        text: `💰 **تقرير السيولة النقدية بالخزائن والمصروفات التشغيلية:**\n\n• **إجمالي الأرصدة المتاحة بالخزائن والمحافظ:** **${storeAnalytics.totalSafeBalance.toLocaleString()} ج.م**\n${safesList}\n\n• **إجمالي المصروفات التشغيلية المسجلة:** **${metrics.totalExpenses.toLocaleString()} ج.م** (${expenses.length} حركة مصروف)\n\n**أحدث المصروفات المسجلة:**\n${
          recentExpenses || 'لا توجد مصروفات مسجلة.'
        }`,
        actionTab: { label: 'فتح الخزائن والمصروفات', tabId: 'finance' },
      };
    }

    // 6. Assembly & Disassembly
    if (q.includes('فك') || q.includes('تجميع') || q.includes('تصنيع')) {
      const recentOps = assemblyOperations
        .slice(0, 5)
        .map(
          op =>
            `• رقم السند **${op.operationNumber}**: ${
              op.type === 'disassembly' ? 'فك صنف' : 'تجميع صنف'
            } (${op.targetProductName}) — الكمية: **${op.quantity} ${op.targetUnit || ''}** بتكلفة إجمالية **${op.totalCost.toLocaleString()} ج.م**`
        )
        .join('\n');

      return {
        text: `🔧 **تقرير عمليات فك وتجميع الأصناف الكهربائية:**\n\n• إجمالي العمليات المنفذة: **${assemblyOperations.length} عملية**\n\n**أحدث سندات الفك والتجميع:**\n${
          recentOps || 'لم يتم تسجيل عمليات فك أو تجميع بعد.'
        }`,
        actionTab: { label: 'فتح قسم فك الأصناف', tabId: 'assembly' },
      };
    }

    // 7. Default / Sales & Profit Comprehensive Overview
    const topProductsList =
      storeAnalytics.topSellingProducts.length > 0
        ? storeAnalytics.topSellingProducts
            .slice(0, 5)
            .map(
              (p, i) =>
                `${i + 1}. **${p.name}** — المباع: **${p.qty} ${p.unit}** | الإيراد: **${p.revenue.toLocaleString()} ج.م** | صافي الربح: **${p.profit.toLocaleString()} ج.م**`
            )
            .join('\n')
        : 'لا توجد مبيعات مسجلة بعد.';

    const profitMargin =
      metrics.totalSalesRevenue > 0
        ? ((metrics.netProfit / metrics.totalSalesRevenue) * 100).toFixed(1)
        : '0.0';

    return {
      text: `📈 **التحليل المالي والتشغيلي الشامل لمؤسسة ${settings.storeName}:**\n\n• **إجمالي المبيعات المعتمدة:** **${metrics.totalSalesRevenue.toLocaleString()} ج.م** (${
        salesInvoices.filter(i => i.status === 'completed').length
      } فاتورة)\n• **مبيعات اليوم:** **${metrics.todaySales.toLocaleString()} ج.م**\n• **تكلفة البضاعة المباعة:** **${metrics.totalSalesCost.toLocaleString()} ج.م**\n• **مجمل الربح (قبل المصروفات):** **${metrics.grossProfit.toLocaleString()} ج.م**\n• **إجمالي المصروفات:** **${metrics.totalExpenses.toLocaleString()} ج.م**\n• **صافي الربح الفعلي:** **${metrics.netProfit.toLocaleString()} ج.م** (هامش ربح صافي **${profitMargin}%**)\n\n🏆 **أكثر الأصناف تحقيقاً للإيرادات والأرباح:**\n${topProductsList}`,
      actionTab: { label: 'فتح التقارير والرسوم البيانية', tabId: 'reports' },
    };
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    // 1. Check if this is a direct natural language price modification command
    const priceCommandResult = tryParseAndExecuteNaturalPriceCommand(textToSend);
    if (priceCommandResult.handled && priceCommandResult.replyText) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-price-${Date.now()}`,
          role: 'model',
          text: priceCommandResult.replyText!,
          timestamp: new Date().toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          priceBatch: priceCommandResult.snapshot,
          actionTab: { label: 'معاينة الأسعار في المخزن', tabId: 'inventory' },
        },
      ]);
      setIsLoading(false);
      return;
    }

    // 2. Otherwise query server Gemini endpoint or local analytical engine
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })),
          storeSummary: storeAnalytics.summaryText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.reply) {
          const localMatch = generateLocalSmartResponse(textToSend);
          setMessages(prev => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: 'model',
              text: data.reply,
              timestamp: new Date().toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              actionTab: localMatch.actionTab,
            },
          ]);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Fallback to instant local ERP analysis
    }

    const localResult = generateLocalSmartResponse(textToSend);
    setMessages(prev => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: localResult.text,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        actionTab: localResult.actionTab,
      },
    ]);
    setIsLoading(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        text: `تم بدء محادثة جديدة ⚡\nاكتب لي أي أمر لتعديل الأسعار (مثل: **"ارفع أسعار السويدي 10%"** أو **"زود أسعار جميع الأصناف 5%"**) أو اطلب أي تقرير مالي ومخزني.`,
      },
    ]);
  };

  const quickPrompts = [
    {
      label: 'رفع أسعار كل الأصناف +10%',
      prompt: 'ارفع أسعار البيع لكل الأصناف بنسبة 10%',
      icon: Percent,
      color: 'bg-amber-100 text-amber-950 border-amber-600 hover:bg-amber-200',
    },
    {
      label: 'رفع أسعار السويدي +5%',
      prompt: 'ارفع أسعار السويدي بنسبة 5%',
      icon: BadgeDollarSign,
      color: 'bg-amber-50 text-slate-900 border-amber-500 hover:bg-amber-100',
    },
    {
      label: 'تحليل المبيعات والأرباح',
      prompt: 'اعطني تقرير شامل عن المبيعات ومجمل وصافي الأرباح وأكثر الأصناف مبيعاً',
      icon: TrendingUp,
      color: 'bg-amber-50 text-slate-800 border-amber-500 hover:bg-amber-100',
    },
    {
      label: 'جرد نواقص المخزن',
      prompt: 'ما هي الأصناف الناقصة في المخزن التي وصلت لحد الطلب وتحتاج شراء عاجل؟',
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-900 border-rose-500 hover:bg-rose-100',
    },
    {
      label: 'مديونيات العملاء والتحصيل',
      prompt: 'من هم أعلى العملاء والمقاولين مديونية للمحل وما هي خطة التحصيل المقترحة؟',
      icon: Users,
      color: 'bg-amber-50 text-slate-800 border-amber-500 hover:bg-amber-100',
    },
  ];

  // Format bold text (**text**) cleanly in JSX
  const renderFormattedText = (raw: string) => {
    return raw.split('\n').map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={lineIdx} className={`${line.trim() === '' ? 'h-2' : 'leading-relaxed mb-1'}`}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={i} className="font-black text-slate-950">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div
      className={`${
        isFloatingModal
          ? 'fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150'
          : 'space-y-3 font-sans'
      }`}
      dir="rtl"
    >
      <div
        className={`${
          isFloatingModal
            ? 'bg-slate-50 w-full max-w-6xl h-[93vh] rounded-2xl border-2 border-slate-600 shadow-2xl flex flex-col overflow-hidden'
            : 'flex flex-col gap-3'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-900 text-white px-4 py-3 rounded-xl border-2 border-slate-700 shadow-lg flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <Sparkles className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  المساعد الذكي للمنظومة وتعديل الأسعار الفوري (AI ERP Assistant)
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  متصل بالمخزن والأسعار لحظياً
                </span>
              </div>
              <p className="text-xs text-slate-300 font-bold mt-0.5">
                تعديل ذكي لأسعار الأصناف والماركات بالأوامر النصية أو بالنسب المئوية + تقارير المبيعات والمخازن
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastPriceSnapshots.some(s => !s.reverted) && (
              <button
                onClick={() => {
                  const latestActive = lastPriceSnapshots.find(s => !s.reverted);
                  if (latestActive) handleUndoPriceBatch(latestActive.id);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="التراجع عن آخر تعديل أسعار تم تنفيذه"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تراجع عن آخر تعديل أسعار</span>
              </button>
            )}

            <button
              onClick={handleClearChat}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
              title="مسح المحادثة والبدء من جديد"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>محادثة جديدة</span>
            </button>

            {isFloatingModal && onCloseModal ? (
              <button
                onClick={onCloseModal}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>إغلاق النافذة</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="إغلاق والعودة للقائمة الرئيسية"
              >
                <X className="w-4 h-4" />
                <span>إغلاق والعودة للقائمة الرئيسية</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Store KPI Strip */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0 ${
            isFloatingModal ? 'px-3 pt-2' : ''
          }`}
        >
          <div
            onClick={() => handleSendMessage('اعطني تقرير شامل عن المبيعات ومجمل وصافي الأرباح')}
            className="cursor-pointer bg-white hover:bg-amber-50/60 p-2.5 rounded-xl border-2 border-slate-400 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
              <span>صافي الربح الفعلي</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-amber-700">
              {metrics.netProfit.toLocaleString()} <span className="text-[10px]">ج.م</span>
            </div>
          </div>

          <div
            onClick={() => handleSendMessage('ما هو رصيد الخزائن والمحافظ الحالي؟')}
            className="cursor-pointer bg-white hover:bg-amber-50/60 p-2.5 rounded-xl border-2 border-slate-400 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
              <span>السيولة بالخزائن</span>
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-amber-700">
              {storeAnalytics.totalSafeBalance.toLocaleString()}{' '}
              <span className="text-[10px]">ج.م</span>
            </div>
          </div>

          <div
            onClick={() => handleSendMessage('ما هي الأصناف الناقصة في المخزن؟')}
            className="cursor-pointer bg-white hover:bg-amber-50/60 p-2.5 rounded-xl border-2 border-slate-400 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
              <span>نواقص المخزن</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-amber-700">
              {storeAnalytics.lowStockProducts.length} <span className="text-[11px]">صنف</span>
            </div>
          </div>

          <div
            onClick={() => handleSendMessage('من هم أعلى العملاء مديونية للمحل؟')}
            className="cursor-pointer bg-white hover:bg-amber-50/60 p-2.5 rounded-xl border-2 border-slate-400 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
              <span>مديونيات العملاء</span>
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-amber-700">
              {metrics.customerDebts.toLocaleString()} <span className="text-[10px]">ج.م</span>
            </div>
          </div>

          <div
            onClick={() => handleSendMessage('اعرض تقرير مستحقات الموردين والشركات')}
            className="cursor-pointer bg-white hover:bg-purple-50/60 p-2.5 rounded-xl border-2 border-slate-400 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
              <span>مستحقات الموردين</span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-purple-700">
              {metrics.supplierPayables.toLocaleString()} <span className="text-[10px]">ج.م</span>
            </div>
          </div>

          <div
            onClick={() => handleSendMessage('قيمة المخزون الحالية وعدد الأصناف')}
            className="cursor-pointer bg-white hover:bg-amber-50/60 p-2.5 rounded-xl border-2 border-slate-400 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
              <span>قيمة المخزون (بيع)</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm sm:text-base font-black font-mono text-amber-700">
              {metrics.inventoryRetailValue.toLocaleString()}{' '}
              <span className="text-[10px]">ج.م</span>
            </div>
          </div>
        </div>

        {/* Main Workspace Grid: Chat (7 cols) + Smart Price Adjuster & Insights (5 cols) */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 ${
            isFloatingModal ? 'p-3 pt-1 overflow-hidden' : ''
          }`}
        >
          {/* Chat Conversation Box (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-slate-400 shadow-md flex flex-col overflow-hidden h-[560px] lg:h-[630px]">
            {/* Quick Prompt Bar Inside Chat */}
            <div className="bg-slate-100 border-b-2 border-slate-300 p-2.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-[11px] font-black text-slate-700 shrink-0 ml-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                أوامر ذكية:
              </span>
              {quickPrompts.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={isLoading}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${qp.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{qp.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-sm ${
                        isUser
                          ? 'bg-slate-900 text-amber-400 border-slate-700'
                          : 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-600'
                      }`}
                    >
                      {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>

                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 border-2 shadow-sm ${
                        isUser
                          ? 'bg-slate-900 text-white border-slate-700 rounded-tl-none'
                          : 'bg-white text-slate-800 border-slate-400 rounded-tr-none'
                      }`}
                    >
                      <div className="text-sm font-bold">
                        {isUser ? <p>{msg.text}</p> : renderFormattedText(msg.text)}
                      </div>

                      {/* Before & After Price Changes Table when a priceBatch is attached */}
                      {!isUser && msg.priceBatch && (
                        <div className="mt-3 bg-slate-50 rounded-xl border-2 border-slate-400 overflow-hidden">
                          <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between text-xs font-black">
                            <span>
                              جدول الأسعار قبل وبعد التعديل ({msg.priceBatch.changes.length} صنف)
                            </span>
                            {msg.priceBatch.reverted ? (
                              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px]">
                                تم التراجع واستعادة الأسعار السابقة
                              </span>
                            ) : (
                              <button
                                onClick={() => handleUndoPriceBatch(msg.priceBatch!.id)}
                                className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>تراجع عن هذا التعديل</span>
                              </button>
                            )}
                          </div>

                          <div className="max-h-52 overflow-y-auto">
                            <table className="w-full text-right text-xs">
                              <thead className="bg-slate-200 text-slate-900 font-black border-b border-slate-300">
                                <tr>
                                  <th className="p-2">الصنف</th>
                                  <th className="p-2 text-center">شراء (قبل ← بعد)</th>
                                  <th className="p-2 text-center">بيع (قبل ← بعد)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 font-bold">
                                {msg.priceBatch.changes.map(ch => (
                                  <tr key={ch.productId} className="hover:bg-white">
                                    <td className="p-2 text-slate-900 font-black">
                                      {ch.productName}
                                    </td>
                                    <td className="p-2 text-center font-mono">
                                      <span className="text-slate-500 line-through ml-1">
                                        {ch.oldPurchasePrice}
                                      </span>
                                      <span className="text-slate-900 font-black">
                                        ← {ch.newPurchasePrice} ج.م
                                      </span>
                                    </td>
                                    <td className="p-2 text-center font-mono">
                                      <span className="text-rose-600 line-through ml-1">
                                        {ch.oldSellingPrice}
                                      </span>
                                      <span className="text-amber-700 font-black">
                                        ← {ch.newSellingPrice} ج.م
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Optional Action Navigation Button */}
                      {!isUser && msg.actionTab && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setActiveTab(msg.actionTab!.tabId);
                              if (onCloseModal) onCloseModal();
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <span>{msg.actionTab.label}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {msg.timestamp}
                            </span>
                            <button
                              onClick={() => handleCopy(msg.id, msg.text)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                              title="نسخ التقرير"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {(isUser || !msg.actionTab) && (
                        <div className="mt-1.5 flex items-center justify-end gap-2">
                          <span className="text-[10px] font-mono text-slate-400">
                            {msg.timestamp}
                          </span>
                          {!isUser && (
                            <button
                              onClick={() => handleCopy(msg.id, msg.text)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                              title="نسخ النص"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 border-2 border-amber-600 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="bg-white border-2 border-slate-400 rounded-2xl rounded-tr-none p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                      <span>جاري تنفيذ الطلب وتحليل بيانات المؤسسة...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Box with Darker Border */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-slate-100 border-t-2 border-slate-400 flex items-center gap-2 shrink-0"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="اكتب أمر تعديل أسعار (مثال: ارفع أسعار السويدي 10% أو عدل سعر سلك 1.5 إلى 1200) أو اطلب تقريراً..."
                  className="w-full pr-10 pl-4 py-2.5 bg-white border-2 border-slate-500 focus:border-slate-900 rounded-xl text-sm font-black text-slate-900 placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-400 border-2 border-slate-700 font-black px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
              >
                <span>تنفيذ</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Left Column in RTL: SMART PRICE ADJUSTER STUDIO + Quick Insights (5 cols) */}
          <div className="lg:col-span-5 space-y-3 overflow-y-auto max-h-[630px]">
            {/* SMART PRICE ADJUSTER CARD */}
            <div className="bg-white rounded-2xl border-2 border-slate-500 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white px-4 py-3 flex items-center justify-between border-b-2 border-slate-700">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    وحدة تعديل الأسعار الذكية (حسب طلبك)
                  </h3>
                </div>
                <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-md">
                  تحديث فوري للمخزن
                </span>
              </div>

              <div className="p-3.5 space-y-3 text-xs">
                {/* 1. Scope Selection */}
                <div>
                  <label className="text-[11px] font-black text-slate-900 block mb-1">
                    1. نطاق الأصناف المراد تعديل أسعارها:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'all', label: 'كل الأصناف' },
                      { id: 'brand', label: 'ماركة محددة' },
                      { id: 'category', label: 'تصنيف محدد' },
                      { id: 'single', label: 'صنف بعينه' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setScopeType(tab.id as any)}
                        className={`py-1.5 px-2 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer ${
                          scopeType === tab.id
                            ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Selector based on Scope */}
                {scopeType === 'brand' && (
                  <div>
                    <label className="text-[11px] font-black text-slate-800 block mb-1">
                      اختر الماركة / الشركة:
                    </label>
                    <select
                      value={selectedBrand}
                      onChange={e => setSelectedBrand(e.target.value)}
                      className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-3 font-black text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      {availableBrands.map(b => (
                        <option key={b} value={b}>
                          {b} ({products.filter(p => p.brand === b).length} صنف)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scopeType === 'category' && (
                  <div>
                    <label className="text-[11px] font-black text-slate-800 block mb-1">
                      اختر التصنيف المخزني:
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-3 font-black text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label} ({products.filter(p => p.category === k).length} صنف)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scopeType === 'single' && (
                  <div className="relative">
                    <label className="text-[11px] font-black text-slate-800 block mb-1">
                      ابحث عن الصنف أو اختر بالأسهم ⬆️⬇️:
                    </label>
                    <input
                      type="text"
                      value={
                        isSingleDropdownOpen
                          ? singleProductSearch
                          : products.find(p => p.id === selectedSingleProductId)?.name || ''
                      }
                      onFocus={() => setIsSingleDropdownOpen(true)}
                      onChange={e => {
                        setSingleProductSearch(e.target.value);
                        setIsSingleDropdownOpen(true);
                        setSingleHighlightIdx(0);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setIsSingleDropdownOpen(true);
                          setSingleHighlightIdx(prev =>
                            filteredSingleProducts.length > 0
                              ? (prev + 1) % filteredSingleProducts.length
                              : 0
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setIsSingleDropdownOpen(true);
                          setSingleHighlightIdx(prev =>
                            filteredSingleProducts.length > 0
                              ? (prev - 1 + filteredSingleProducts.length) %
                                filteredSingleProducts.length
                              : 0
                          );
                        } else if (e.key === 'Enter' && isSingleDropdownOpen) {
                          e.preventDefault();
                          const chosen = filteredSingleProducts[singleHighlightIdx];
                          if (chosen) {
                            setSelectedSingleProductId(chosen.id);
                            setIsSingleDropdownOpen(false);
                            setSingleProductSearch('');
                          }
                        } else if (e.key === 'Escape') {
                          setIsSingleDropdownOpen(false);
                          setSingleProductSearch('');
                        }
                      }}
                      placeholder="اكتب اسم الصنف للبحث..."
                      className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-3 font-black text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    {isSingleDropdownOpen && (
                      <div className="absolute z-40 left-0 right-0 mt-1 bg-white border-2 border-slate-600 rounded-xl shadow-xl max-h-44 overflow-y-auto divide-y divide-slate-200">
                        {filteredSingleProducts.map((p, idx) => (
                          <div
                            key={p.id}
                            onMouseDown={e => {
                              e.preventDefault();
                              setSelectedSingleProductId(p.id);
                              setIsSingleDropdownOpen(false);
                              setSingleProductSearch('');
                            }}
                            className={`px-3 py-2 cursor-pointer flex items-center justify-between text-xs font-black ${
                              idx === singleHighlightIdx
                                ? 'bg-amber-600 text-white'
                                : 'hover:bg-slate-100 text-slate-900'
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="font-mono shrink-0">
                              بيع: {p.sellingPrice} | شراء: {p.purchasePrice}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Target Price Field & Operation Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-black text-slate-900 block mb-1">
                      2. نوع السعر المراد تعديله:
                    </label>
                    <select
                      value={priceFieldTarget}
                      onChange={e => setPriceFieldTarget(e.target.value as any)}
                      className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-2.5 font-black text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="selling">سعر البيع (قطاعي)</option>
                      <option value="purchase">سعر الشراء (التكلفة)</option>
                      <option value="wholesale">سعر الجملة</option>
                      <option value="selling_and_wholesale">سعر البيع + الجملة معاً</option>
                      <option value="all_prices">جميع الأسعار (شراء وبيع وجملة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-900 block mb-1">
                      3. طريقة التعديل:
                    </label>
                    <select
                      value={adjustmentMode}
                      onChange={e => setAdjustmentMode(e.target.value as any)}
                      className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-2.5 font-black text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="percent_up">زيادة بنسبة مئوية (+%)</option>
                      <option value="percent_down">تخفيض بنسبة مئوية (-%)</option>
                      <option value="fixed_up">زيادة بمبلغ ثابت (+ ج.م)</option>
                      <option value="fixed_down">تخفيض بمبلغ ثابت (- ج.م)</option>
                      <option value="margin_over_cost">نسبة ربح (% فوق سعر الشراء)</option>
                      <option value="direct_value">تحديد سعر جديد مباشر (ج.م)</option>
                    </select>
                  </div>
                </div>

                {/* 3. Value & Rounding */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-black text-slate-900 block mb-1">
                      4. القيمة / النسبة المطلوبة:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={adjustmentValue}
                        onChange={e => setAdjustmentValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-3 text-center font-mono font-black text-slate-900 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-900 block mb-1">
                      5. تقريب الكسور:
                    </label>
                    <select
                      value={roundingStep}
                      onChange={e => setRoundingStep(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-500 rounded-xl py-2 px-2.5 font-black text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option value={1}>لأقرب 1 ج.م صحيح</option>
                      <option value={5}>لأقرب 5 ج.م</option>
                      <option value={0}>بدون تقريب (بالقروش)</option>
                    </select>
                  </div>
                </div>

                {/* Quick Percentage Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-black text-slate-600">نسب سريعة:</span>
                  {[5, 10, 15, 20, 25, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAdjustmentValue(pct)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-black border transition-colors cursor-pointer ${
                        adjustmentValue === pct
                          ? 'bg-amber-500 text-slate-950 border-amber-700'
                          : 'bg-slate-100 text-slate-800 border-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Execute Price Update Button */}
                <button
                  type="button"
                  onClick={handleApplyStudioPriceAdjustment}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer border-2 border-amber-800"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تطبيق تعديل الأسعار فوراً وعرض التقرير ⚡</span>
                </button>
              </div>
            </div>

            {/* Alert Box: Low Stock Items */}
            <div className="bg-white rounded-2xl border-2 border-slate-400 p-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    تنبيهات الأصناف الحرجة ({storeAnalytics.lowStockProducts.length})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('expiry');
                    if (onCloseModal) onCloseModal();
                  }}
                  className="text-[11px] font-black text-amber-700 hover:underline"
                >
                  عرض الكل
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {storeAnalytics.lowStockProducts.length === 0 ? (
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-lg p-2 text-center">
                    ✅ جميع الأصناف بالمخزن فوق حد الطلب الأدنى
                  </p>
                ) : (
                  storeAnalytics.lowStockProducts.slice(0, 5).map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSendMessage(`سعر ورصيد ${p.name}`)}
                      className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 border border-amber-300 text-xs transition-colors"
                    >
                      <span className="font-black text-slate-800 truncate max-w-[180px]">
                        {p.name}
                      </span>
                      <span className="font-mono font-black text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-300 shrink-0">
                        متبقي: {p.quantity} {p.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Safes Live Balances */}
            <div className="bg-white rounded-2xl border-2 border-slate-400 p-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    أرصدة الخزائن والمحافظ
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('finance');
                    if (onCloseModal) onCloseModal();
                  }}
                  className="text-[11px] font-black text-amber-700 hover:underline"
                >
                  فتح الخزائن
                </button>
              </div>

              <div className="space-y-1.5">
                {safes.map(safe => (
                  <div
                    key={safe.id}
                    onClick={() => {
                      if (onCloseModal) onCloseModal();
                      openStatement('safe', safe.id);
                    }}
                    className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-300 text-xs transition-colors"
                    title="اضغط لفتح كشف حركة الخزينة"
                  >
                    <span className="font-black text-slate-800 truncate max-w-[170px]">
                      {safe.name}
                    </span>
                    <span className="font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                      {safe.balance.toLocaleString()} ج.م
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
