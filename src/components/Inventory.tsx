import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, ToxicityClass } from '../types';
import { StockHistoryModal } from './StockHistoryModal';
import { StocktakingModal } from './StocktakingModal';
import {
  Package,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  FileCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  X,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  wires_cables: 'أسلاك وكابلات',
  switches_sockets: 'مفاتيح وبرايز وشاسيهات',
  lighting_bulbs: 'لمبات وكشافات وبانلات',
  breakers_panels: 'قواطع ولوحات توزيع',
  pipes_conduits: 'خراطيم ومواسير وعلب',
  tools_meters: 'عدد وأجهزة قياس واختبار',
  fans_heaters: 'شفاطات ومراوح ودفايات',
  accessories: 'شكرتون ومستلزمات كهرباء',
};

const mapCategoryLabelToKey = (val?: string): ProductCategory => {
  if (!val) return 'wires_cables';
  const clean = val.trim().toLowerCase();
  if (clean.includes('سلك') || clean.includes('كابل') || clean === 'wires_cables') return 'wires_cables';
  if (clean.includes('مفتاح') || clean.includes('بريز') || clean.includes('شاسيه') || clean === 'switches_sockets') return 'switches_sockets';
  if (clean.includes('لمب') || clean.includes('كشاف') || clean.includes('بانل') || clean === 'lighting_bulbs') return 'lighting_bulbs';
  if (clean.includes('قاطع') || clean.includes('لوح') || clean === 'breakers_panels') return 'breakers_panels';
  if (clean.includes('خرطوم') || clean.includes('ماسور') || clean.includes('علب') || clean === 'pipes_conduits') return 'pipes_conduits';
  if (clean.includes('متر') || clean.includes('بنس') || clean.includes('قياس') || clean === 'tools_meters') return 'tools_meters';
  if (clean.includes('مروح') || clean.includes('شفاط') || clean.includes('دفاي') || clean === 'fans_heaters') return 'fans_heaters';
  if (clean.includes('شكرتون') || clean.includes('اكسسوار') || clean === 'accessories') return 'accessories';
  return 'wires_cables';
};

const mapToxicityLabelToKey = (val?: string): ToxicityClass => {
  if (!val) return 'safe';
  const clean = val.trim().toLowerCase();
  if (clean.includes('عميق') || clean.includes('تجميد') || clean.includes('آمن') || clean === 'safe') return 'safe';
  if (clean.includes('كامل') || clean.includes('طهي') || clean.includes('خطر') || clean === 'danger') return 'danger';
  if (clean.includes('نصف') || clean.includes('مطهو') || clean.includes('تحذير') || clean === 'warning') return 'warning';
  if (clean.includes('مبرد') || clean.includes('حفظ') || clean.includes('احترس') || clean === 'caution') return 'caution';
  return 'safe';
};

interface ParsedImportProduct extends Omit<Product, 'id'> {
  existingId?: string;
  isValid: boolean;
}

export const Inventory: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    logWaste,
    currentUser,
    salesInvoices = [],
    purchaseInvoices = [],
    salesReturns = [],
    purchaseReturns = [],
    assemblyOperations = [],
    wasteRecords = []
  } = useApp();

  // Active Dropdown Menu State for Options
  const [openMenuProductId, setOpenMenuProductId] = useState<string | null>(null);

  // Product Movement Modal State
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');

  // Waste reasons state
  const [wasteReason, setWasteReason] = useState<'damaged_packaging' | 'defrosting' | 'expired' | 'other'>('defrosting');
  const [wasteNotes, setWasteNotes] = useState<string>('');

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stock Adjust Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');

  // Excel Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStocktakingModal, setShowStocktakingModal] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreview, setImportPreview] = useState<ParsedImportProduct[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Computed Product Movements for movement modal
  const productMovements = useMemo(() => {
    if (!movementProduct) return [];
    const list: {
      id: string;
      date: string;
      typeName: string;
      refNumber: string;
      partyName?: string;
      qtyIn: number;
      qtyOut: number;
      price?: number;
      notes?: string;
      isPositive: boolean;
    }[] = [];

    // Sales
    salesInvoices.forEach(inv => {
      inv.items?.forEach((item, idx) => {
        if (item.productId === movementProduct.id || item.productName === movementProduct.name) {
          list.push({
            id: `sale-${inv.id}-${idx}`,
            date: inv.date,
            typeName: 'مبيعات (-)',
            refNumber: inv.invoiceNumber,
            partyName: inv.customerName,
            qtyIn: 0,
            qtyOut: item.quantity,
            price: item.unitPrice,
            notes: inv.notes,
            isPositive: false,
          });
        }
      });
    });

    // Purchases
    purchaseInvoices.forEach(inv => {
      inv.items?.forEach((item, idx) => {
        if (item.productId === movementProduct.id || item.productName === movementProduct.name) {
          list.push({
            id: `pur-${inv.id}-${idx}`,
            date: inv.date,
            typeName: 'مشتريات (+)',
            refNumber: inv.invoiceNumber,
            partyName: inv.supplierName,
            qtyIn: item.quantity,
            qtyOut: 0,
            price: item.unitPrice,
            notes: inv.notes,
            isPositive: true,
          });
        }
      });
    });

    // Sales Returns
    salesReturns.forEach(ret => {
      ret.items?.forEach((item, idx) => {
        if (item.productId === movementProduct.id || item.productName === movementProduct.name) {
          list.push({
            id: `sret-${ret.id}-${idx}`,
            date: ret.date,
            typeName: 'مرتجع مبيعات (+)',
            refNumber: ret.returnNumber,
            partyName: ret.customerName,
            qtyIn: item.quantity,
            qtyOut: 0,
            price: item.unitPrice,
            notes: ret.notes,
            isPositive: true,
          });
        }
      });
    });

    // Purchase Returns
    purchaseReturns.forEach(ret => {
      ret.items?.forEach((item, idx) => {
        if (item.productId === movementProduct.id || item.productName === movementProduct.name) {
          list.push({
            id: `pret-${ret.id}-${idx}`,
            date: ret.date,
            typeName: 'مرتجع مشتريات (-)',
            refNumber: ret.returnNumber,
            partyName: ret.supplierName,
            qtyIn: 0,
            qtyOut: item.quantity,
            price: item.unitPrice,
            notes: ret.notes,
            isPositive: false,
          });
        }
      });
    });

    // Disassembly Operations
    assemblyOperations.forEach(op => {
      if (op.targetProductId === movementProduct.id || op.targetProductName === movementProduct.name) {
        list.push({
          id: `dsm-src-${op.id}`,
          date: op.date,
          typeName: 'فك أصناف (مصدر -)',
          refNumber: op.operationNumber || `DSM-${op.id.slice(0, 6)}`,
          partyName: op.operatorName || op.performedBy || 'إذن فك مخزني',
          qtyIn: 0,
          qtyOut: op.quantity,
          notes: op.notes,
          isPositive: false,
        });
      }
      op.componentsAffected?.forEach((comp, idx) => {
        if (comp.productId === movementProduct.id || comp.productName === movementProduct.name) {
          list.push({
            id: `dsm-tgt-${op.id}-${idx}`,
            date: op.date,
            typeName: 'فك أصناف (ناتج +)',
            refNumber: op.operationNumber || `DSM-${op.id.slice(0, 6)}`,
            partyName: op.operatorName || op.performedBy || 'إذن فك مخزني',
            qtyIn: comp.quantity,
            qtyOut: 0,
            notes: op.notes,
            isPositive: true,
          });
        }
      });
    });

    // Waste / Stock Adjustments
    wasteRecords.forEach(w => {
      if (w.productId === movementProduct.id || w.productName === movementProduct.name) {
        list.push({
          id: `waste-${w.id}`,
          date: w.date,
          typeName: 'تسوية / هالك (-)',
          refNumber: `WST-${w.id.slice(0, 6)}`,
          partyName: 'تعديل رصيد',
          qtyIn: 0,
          qtyOut: w.quantity,
          notes: w.notes,
          isPositive: false,
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movementProduct, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, assemblyOperations, wasteRecords]);

  // Download Sample Template
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'اسم الصنف': 'لفة سلك 2.5 مم معتمد السويدي الأصلي',
        'التصنيف': 'أسلاك وكابلات',
        'وحدة القياس': 'لفة (100 متر)',
        'سعر الشراء': 1850,
        'سعر البيع': 2100,
        'الكمية بالمخزن': 45,
        'حد الطلب الأدنى': 5,
        'الباركود': '6221000111222',
      },
      {
        'اسم الصنف': 'لقمة مفتاح إنارة مفرد فينوس مسطح',
        'التصنيف': 'مفاتيح وبرايز وشاسيهات',
        'وحدة القياس': 'قطعة',
        'سعر الشراء': 22,
        'سعر البيع': 30,
        'الكمية بالمخزن': 120,
        'حد الطلب الأدنى': 20,
        'الباركود': '6221000333444',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج الأصناف');
    XLSX.writeFile(wb, 'نموذج_استيراد_الأصناف_الكهربائية.xlsx');
  };

  // Export current products to Excel
  const handleExportProductsToExcel = () => {
    const exportData = products.map((p, idx) => ({
      'م': idx + 1,
      'اسم الصنف': p.name,
      'التصنيف': CATEGORY_LABELS[p.category] || p.category,
      'سعر الشراء': p.purchasePrice,
      'سعر البيع': p.sellingPrice,
      'الكمية بالمخزن': p.quantity,
      'الباركود': p.barcode,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المخزون الحالي');
    XLSX.writeFile(
      wb,
      `تقرير_مخزون_الأصناف_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
          defval: '',
        });

        const parsedItems: ParsedImportProduct[] = rawData.map(row => {
          const name = (
            row['اسم الصنف'] ||
            row['الاسم'] ||
            row['Product Name'] ||
            row['Name'] ||
            ''
          )
            .toString()
            .trim();
          const catRaw = (row['التصنيف'] || row['Category'] || '').toString();
          const activeIngredient = (
            row['بلد المنشأ'] ||
            row['الشركة المصنعة'] ||
            ''
          )
            .toString()
            .trim();
          const concentration = (
            row['العبوة'] ||
            ''
          )
            .toString()
            .trim();
          const unit = (
            row['وحدة القياس'] ||
            row['الوحدة'] ||
            'قطعة'
          )
            .toString()
            .trim();
          const purchasePrice =
            parseFloat(
              (
                row['سعر الشراء'] ||
                row['Purchase Price'] ||
                0
              ).toString()
            ) || 0;
          const sellingPrice =
            parseFloat(
              (row['سعر البيع'] || row['Selling Price'] || 0).toString()
            ) || 0;
          const quantity =
            parseFloat(
              (
                row['الكمية بالمخزن'] ||
                row['الكمية'] ||
                row['الرصيد'] ||
                0
              ).toString()
            ) || 0;
          const minAlertQuantity =
            parseFloat(
              (
                row['حد الطلب الأدنى'] ||
                5
              ).toString()
            ) || 5;
          const barcodeRaw = (
            row['الباركود'] ||
            ''
          )
            .toString()
            .trim();
          const barcode =
            barcodeRaw ||
            `${Math.floor(1000000000 + Math.random() * 9000000000)}`;

          const existing = products.find(
            p =>
              p.name.trim().toLowerCase() === name.toLowerCase() ||
              (barcodeRaw && p.barcode === barcodeRaw)
          );

          return {
            name,
            category: mapCategoryLabelToKey(catRaw),
            activeIngredient,
            concentration,
            dosageInfo: '',
            targetPests: '',
            toxicity: mapToxicityLabelToKey(''),
            barcode,
            unit,
            purchasePrice,
            sellingPrice,
            quantity,
            minAlertQuantity,
            batchNumber: '',
            expiryDate: '',
            notes: 'تم الاستيراد من ملف Excel',
            isWeighable: false,
            tareWeight: 0,
            existingId: existing ? existing.id : undefined,
            isValid: Boolean(name),
          };
        });

        setImportPreview(parsedItems);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('حدث خطأ أثناء قراءة الملف. يرجى التأكد من اختيار ملف Excel (.xlsx أو .xls) أو CSV صحيح.');
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Execute Import
  const handleExecuteImport = () => {
    const validItems = importPreview.filter(item => item.isValid);
    if (validItems.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;

    validItems.forEach(item => {
      const { existingId, isValid, ...prodData } = item;
      if (updateExisting && existingId) {
        updateProduct(existingId, prodData);
        updatedCount++;
      } else {
        addProduct(prodData);
        addedCount++;
      }
    });

    setImportSuccessMessage(
      `تم استيراد ${addedCount} صنف جديد وتحديث ${updatedCount} صنف موجود بنجاح! 🎉`
    );

    setTimeout(() => {
      setShowImportModal(false);
      setImportSuccessMessage(null);
      setImportPreview([]);
      setImportFileName('');
    }, 2000);
  };

  // Form State
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    category: 'wires_cables',
    activeIngredient: '',
    concentration: '',
    dosageInfo: '',
    targetPests: '',
    toxicity: 'caution',
    barcode: '',
    unit: 'قطعة',
    purchasePrice: 0,
    sellingPrice: 0,
    quantity: 0,
    minAlertQuantity: 5,
    batchNumber: '',
    expiryDate: '',
    notes: '',
    isWeighable: false,
    tareWeight: 0,
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'wires_cables',
      activeIngredient: '',
      concentration: '',
      dosageInfo: '',
      targetPests: '',
      toxicity: 'caution',
      barcode: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      unit: 'قطعة',
      purchasePrice: 100,
      sellingPrice: 130,
      quantity: 10,
      minAlertQuantity: 5,
      batchNumber: '',
      expiryDate: '',
      notes: '',
      isWeighable: false,
      tareWeight: 0,
    });
    setShowProductModal(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category: prod.category,
      activeIngredient: prod.activeIngredient || '',
      concentration: prod.concentration || '',
      dosageInfo: prod.dosageInfo || '',
      targetPests: prod.targetPests || '',
      toxicity: prod.toxicity || 'caution',
      barcode: prod.barcode,
      unit: prod.unit,
      purchasePrice: prod.purchasePrice,
      sellingPrice: prod.sellingPrice,
      quantity: prod.quantity,
      minAlertQuantity: prod.minAlertQuantity,
      batchNumber: prod.batchNumber || '',
      expiryDate: prod.expiryDate || '',
      notes: prod.notes || '',
      isWeighable: prod.isWeighable || false,
      tareWeight: prod.tareWeight || 0,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
    } else {
      addProduct(formData);
    }

    setShowProductModal(false);
  };

  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustAmount <= 0) return;

    if (adjustType === 'deduct') {
      logWaste(adjustingProduct.id, adjustAmount, wasteReason, wasteNotes.trim() || 'تسوية رصيد بالخصم');
    } else {
      adjustStock(adjustingProduct.id, adjustAmount);
    }

    setAdjustingProduct(null);
    setAdjustAmount(0);
    setWasteNotes('');
  };

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q);

      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;

      let matchesStock = true;
      if (stockStatusFilter === 'low') matchesStock = p.quantity <= p.minAlertQuantity;
      if (stockStatusFilter === 'out') matchesStock = p.quantity === 0;
      if (stockStatusFilter === 'available') matchesStock = p.quantity > p.minAlertQuantity;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockStatusFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const isAllPaginatedProductsSelected = useMemo(() => {
    if (paginatedProducts.length === 0) return false;
    return paginatedProducts.every(p => selectedProductIds.includes(p.id));
  }, [paginatedProducts, selectedProductIds]);

  const toggleSelectAllProducts = () => {
    if (isAllPaginatedProductsSelected) {
      const pageIds = new Set(paginatedProducts.map(p => p.id));
      setSelectedProductIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedProducts.map(p => p.id);
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOneProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteProducts = () => {
    if (selectedProductIds.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${selectedProductIds.length} صنف محدد نهائياً من المخزن؟`)) {
      selectedProductIds.forEach(id => deleteProduct(id));
      setSelectedProductIds([]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 leading-tight">
            <Package className="w-5 h-5 text-amber-600" />
            إدارة المخازن
          </h2>
          <p className="text-[11px] text-slate-500">
            متابعة دقيقة للأرصدة والمخزون الحقيقي والأصناف
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Professional Stocktaking / Audit Button */}
          <button
            onClick={() => setShowStocktakingModal(true)}
            className="bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 hover:from-amber-800 hover:to-slate-800 text-amber-400 border-2 border-amber-500/70 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            title="فتح منظومة الجرد الفعلي والتسوية المخزنية الدقيقة"
          >
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            <span>جرد المخزون الفعلي والتسوية</span>
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportProductsToExcel}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="تصدير قائمة المخزون الحالية إلى ملف إكسيل"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>تصدير لإكسيل</span>
          </button>

          {/* Excel Import Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-slate-800 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            <span>استيراد من إكسيل (Excel)</span>
          </button>

          {/* New Product Button */}
          <button
            onClick={openAddModal}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-300 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم المنتج..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pr-10 pl-4 py-1.5 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto text-sm shrink-0">
          {selectedProductIds.length > 0 && (
            <button
              onClick={handleBatchDeleteProducts}
              className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedProductIds.length})</span>
            </button>
          )}

          <select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded-xl py-1.5 px-3 text-sm font-extrabold bg-slate-50 text-slate-900 focus:outline-none shadow-sm"
          >
            <option value="all">كل التصنيفات ({products.length})</option>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={stockStatusFilter}
            onChange={e => {
              setStockStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded-xl py-1.5 px-3 text-sm font-extrabold bg-slate-50 text-slate-900 focus:outline-none shadow-sm"
          >
            <option value="all">كل حالات المخزون</option>
            <option value="available">متوفر بكمية جيدة</option>
            <option value="low">نواقص (دون حد الطلب)</option>
            <option value="out">نفد تماماً (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-visible">
        <div className="overflow-x-auto min-h-[320px]">
          <table className="w-full text-right text-[14.3px] border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-100 border-b border-slate-800 font-bold text-[14.3px]">
                <th className="py-2 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPaginatedProductsSelected}
                    onChange={toggleSelectAllProducts}
                    className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                    title="تحديد الكل"
                  />
                </th>
                <th className="py-2 px-3">اسم المنتج</th>
                <th className="py-2 px-3">سعر الشراء</th>
                <th className="py-2 px-3">سعر البيع</th>
                <th className="py-2 px-3">هامش الربح</th>
                <th className="py-2 px-3">الرصيد بالمخزن</th>
                <th className="py-2 px-3 text-center">خيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-[14.3px]">
              {paginatedProducts.map(p => {
                const profitMargin =
                  p.purchasePrice > 0
                    ? Math.round(((p.sellingPrice - p.purchasePrice) / p.purchasePrice) * 100)
                    : 0;
                const isMenuOpen = openMenuProductId === p.id;
                const isSelected = selectedProductIds.includes(p.id);

                return (
                  <tr key={p.id} className={`hover:bg-slate-50 transition-colors text-[14.3px] ${isSelected ? 'bg-amber-50/80 font-bold' : ''}`}>
                    <td className="py-1.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOneProduct(p.id)}
                        className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="text-[14.3px] font-black text-slate-900 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setMovementProduct(p)}
                          className="hover:text-amber-700 transition-colors text-right font-black text-[14.3px]"
                          title="انقر لفتح كشف حركة الصنف"
                        >
                          {p.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovementProduct(p)}
                          className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-bold flex items-center gap-1 transition-colors"
                          title="عرض كشف حركة الصنف"
                        >
                          <Activity className="w-3 h-3 text-amber-600" />
                          <span>حركة الصنف</span>
                        </button>
                      </div>
                    </td>

                    <td className="py-1.5 px-3 font-mono font-black text-slate-900 text-[14.3px]">
                      {p.purchasePrice}
                    </td>

                    <td className="py-1.5 px-3 font-mono font-black text-slate-800 text-[14.3px]">
                      {p.sellingPrice}
                    </td>

                    <td className="py-1.5 px-3 font-mono text-[14.3px] font-black text-amber-700">
                      +{profitMargin}%
                    </td>

                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900 text-[14.3px]">
                      <div className="flex items-center gap-2">
                        <span>{p.quantity}</span>
                        <button
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustAmount(0);
                            setAdjustType('add');
                          }}
                          className="text-[14.3px] font-black text-slate-400 hover:text-amber-700 p-1 hover:bg-slate-100 rounded transition-colors"
                          title="تسوية الرصيد يدوي"
                        >
                          ±
                        </button>
                      </div>
                    </td>

                    <td className="py-1.5 px-3 text-center relative">
                      <div className="relative inline-block text-right">
                        <button
                          onClick={() => setOpenMenuProductId(isMenuOpen ? null : p.id)}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1 rounded-xl text-[14.3px] flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                          <span>خيارات</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <>
                            {/* Backdrop overlay to close menu */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuProductId(null)}
                            />

                            {/* Dropdown Menu */}
                            <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-300 z-50 py-1 font-sans text-xs overflow-hidden animate-in fade-in zoom-in-95">
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setOpenMenuProductId(null);
                                  openEditModal(p);
                                }}
                                className="w-full text-right px-4 py-2.5 text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-bold flex items-center gap-2 transition-colors border-b border-slate-100"
                              >
                                <Edit className="w-4 h-4 text-amber-600" />
                                <span>تعديل</span>
                              </button>

                              {/* Movement Button */}
                              <button
                                onClick={() => {
                                  setOpenMenuProductId(null);
                                  setMovementProduct(p);
                                }}
                                className="w-full text-right px-4 py-2.5 text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-bold flex items-center gap-2 transition-colors border-b border-slate-100"
                              >
                                <Activity className="w-4 h-4 text-amber-600" />
                                <span>حركة الصنف</span>
                              </button>

                              {/* Delete Button */}
                              {(currentUser?.role === 'admin' || currentUser?.role === 'storekeeper') && (
                                <button
                                  onClick={() => {
                                    setOpenMenuProductId(null);
                                    if (window.confirm(`هل أنت متأكد من حذف صنف "${p.name}" نهائياً من المخزن؟`)) {
                                      deleteProduct(p.id);
                                    }
                                  }}
                                  className="w-full text-right px-4 py-2.5 text-red-600 hover:bg-red-50 font-bold flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                  <span>حذف</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-[14.3px]">
                    لا توجد أصناف تطابق شروط التصفية
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredProducts.length > 0 && (
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-300 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold">
              عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filteredProducts.length)} من إجمالي {filteredProducts.length} صنف
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-3 font-bold text-slate-800">
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Movement Modal (كارت حركة الصنف - متطابق مع النموذج والمسميات المطلوبة) */}
      {movementProduct && (
        <StockHistoryModal
          product={movementProduct}
          onClose={() => setMovementProduct(null)}
        />
      )}

      {/* Professional High-Precision Stocktaking Modal */}
      {showStocktakingModal && (
        <StocktakingModal
          isOpen={showStocktakingModal}
          onClose={() => setShowStocktakingModal(false)}
        />
      )}

      {/* Product Add / Edit Modal - Enlarged container (+4 degrees) and text sizes (+2 degrees) */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-8">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-8 sm:p-10 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 font-sans text-right" dir="rtl">
            <div className="flex items-center justify-between pb-5 border-b border-slate-200 mb-6">
              <h3 className="font-extrabold text-slate-900 text-2xl">
                {editingProduct ? `تعديل صنف: ${editingProduct.name}` : 'إضافة صنف جديد للمخزن'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-sm sm:text-base">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">اسم الصنف *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم الصنف..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full py-2.5 px-3.5 border-2 border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-600 font-bold text-sm sm:text-base bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">التصنيف *</label>
                  <select
                    value={formData.category}
                    onChange={e =>
                      setFormData({ ...formData, category: e.target.value as ProductCategory })
                    }
                    className="w-full py-2.5 px-3.5 border-2 border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-600 font-bold text-sm sm:text-base bg-white transition-colors"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing, Quantity */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">سعر الشراء</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={e =>
                      setFormData({ ...formData, purchasePrice: Number(e.target.value) })
                    }
                    className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl font-mono font-bold text-sm sm:text-base bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">سعر البيع</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={e =>
                      setFormData({ ...formData, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full py-2.5 px-3 border-2 border-amber-600 rounded-xl font-mono font-black text-slate-900 text-sm sm:text-base bg-amber-50/70 transition-colors"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">الكمية الحالية</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl font-mono font-bold text-sm sm:text-base bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">حد الطلب الأدنى</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minAlertQuantity}
                    onChange={e => setFormData({ ...formData, minAlertQuantity: Number(e.target.value) })}
                    className="w-full py-2.5 px-3 border-2 border-red-500 rounded-xl font-mono font-bold text-red-700 bg-red-50/70 text-sm sm:text-base transition-colors"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">الوحدة</label>
                  <input
                    type="text"
                    required
                    placeholder="قطعة، لفة..."
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full py-2.5 px-3 border-2 border-slate-600 rounded-xl font-bold text-sm sm:text-base bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Barcode Field */}
              <div>
                <label className="font-bold text-slate-900 block mb-1 text-sm sm:text-base">رقم الباركود</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full py-2.5 px-3.5 border-2 border-slate-600 rounded-xl font-mono text-sm sm:text-base bg-white transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t-2 border-slate-300 mt-4">
                <button
                  type="submit"
                  className="flex-1 bg-amber-700 hover:bg-amber-600 text-white font-black py-3 rounded-xl transition-all shadow-md text-sm sm:text-base border-2 border-amber-950"
                >
                  {editingProduct ? 'تحديث بيانات الصنف' : 'حفظ وإضافة للمخزن'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-3 px-6 rounded-xl text-sm sm:text-base border-2 border-slate-400 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Quick Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 text-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              تسوية رصيد مخزن: {adjustingProduct.name}
            </h3>
            <p className="text-slate-500 mb-4">
              الرصيد الفعلي الحالي: {adjustingProduct.quantity}
            </p>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    adjustType === 'add'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  + زيادة رصيد
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    adjustType === 'deduct'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  - عجز / هالك / إتلاف
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الكمية المراد تسويتها</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount || ''}
                  onChange={e => setAdjustAmount(Number(e.target.value))}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold"
                  placeholder="0"
                />
              </div>

              {adjustType === 'deduct' && (
                <div className="space-y-3 pt-1 border-t border-slate-100 mt-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">سبب الهلاك والتلف *</label>
                    <select
                      value={wasteReason}
                      onChange={e => setWasteReason(e.target.value as any)}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl font-bold bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="defrosting">تلف كلي أو عيب تصنيع 📦</option>
                      <option value="damaged_packaging">تلف العبوة أو كسر 📦</option>
                      <option value="expired">انتهاء فترة الصلاحية 📅</option>
                      <option value="other">أسباب تشغيلية أخرى ⚠️</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">تفاصيل وملاحظات الهالك</label>
                    <input
                      type="text"
                      value={wasteNotes}
                      onChange={e => setWasteNotes(e.target.value)}
                      placeholder="تفاصيل التلف..."
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-700 text-white font-bold py-2 rounded-xl"
                >
                  تأكيد التسوية
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 text-xs">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm">استيراد الأصناف والمخزون من ملف إكسيل (Excel / CSV)</h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Success Message */}
              {importSuccessMessage && (
                <div className="bg-amber-100 border border-amber-300 text-amber-800 p-3 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                      <Download className="w-4 h-4 text-amber-700" />
                      1. تحميل نموذج Excel تجريبي جاهز
                    </h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed mb-3">
                      تحميل ملف إكسيل يحتوي على الهيكل والتصنيفات المعتمدة للأصناف (اسم الصنف، السعر، الكمية، إلخ).
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSampleTemplate}
                    className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل نموذج الأصناف (.xlsx)</span>
                  </button>
                </div>

                <div className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-amber-600 mb-2 animate-bounce" />
                  <span className="font-bold text-slate-800 text-xs">اختر أو اسحب ملف Excel هنا</span>
                  <span className="text-[10px] text-slate-500 mt-1">يدعم ملفات .xlsx / .xls / .csv</span>

                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="mt-3 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                  />
                  {importFileName && (
                    <span className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      📁 {importFileName}
                    </span>
                  )}
                </div>
              </div>

              {isProcessingFile && (
                <div className="text-center py-6 text-slate-600 font-bold flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري تحليل ملف الإكسيل ومطابقة العناوين...</span>
                </div>
              )}

              {!isProcessingFile && importPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2 font-extrabold text-slate-800">
                      <FileCheck className="w-4 h-4 text-amber-600" />
                      <span>معاينة الأصناف المقروءة ({importPreview.length} صنف)</span>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={updateExisting}
                        onChange={e => setUpdateExisting(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>تحديث بيانات الأصناف المكررة برقم الباركود أو الاسم</span>
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-[11px] border-collapse">
                      <thead className="sticky top-0 bg-slate-800 text-white font-bold">
                        <tr>
                          <th className="p-2 text-center">م</th>
                          <th className="p-2">اسم الصنف</th>
                          <th className="p-2 text-center">شراء</th>
                          <th className="p-2 text-center">بيع</th>
                          <th className="p-2 text-center">الرصيد</th>
                          <th className="p-2 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {importPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{i + 1}</td>
                            <td className="p-2 font-sans font-bold text-slate-900">{item.name || '—'}</td>
                            <td className="p-2 text-center text-slate-700">{item.purchasePrice}</td>
                            <td className="p-2 text-center font-bold text-amber-700">{item.sellingPrice}</td>
                            <td className="p-2 text-center font-bold text-slate-900">{item.quantity}</td>
                            <td className="p-2 text-center font-sans">
                              {!item.isValid ? (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  اسم مفقود 🔴
                                </span>
                              ) : item.existingId ? (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  تحديث صنف 🟡
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  صنف جديد 🟢
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-bold">
                {importPreview.length > 0
                  ? `الأصناف الصالحة للاستيراد: ${importPreview.filter(x => x.isValid).length} من أصل ${importPreview.length}`
                  : 'يرجى رفع ملف Excel للبدء'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                    setImportFileName('');
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={importPreview.filter(x => x.isValid).length === 0}
                  onClick={handleExecuteImport}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-extrabold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>تأكيد واستيراد الأصناف للمخزن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
