import React, { useState } from "react";
import { Order, Purchase } from "../types";
import { MOROCCAN_CITIES, CONDITIONS, DELIVERY_STATUSES, LIVREURS, formatCurrency, formatDateDisplay, generateWhatsAppUrl } from "../data";
import { Search, Filter, Plus, Calendar, RotateCcw, Edit, Phone, MessageCircle, ExternalLink, ChevronRight, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { WhatsAppSequentialSendModal } from "./WhatsAppSequentialSendModal";

interface SalesTabProps {
  sales: Order[];
  purchases: Purchase[];
  onAddSale: () => void;
  onEditSale: (order: Order) => void;
  onUpdateOrder: (rowNum: number, updates: any) => void;
  salesPreset?: "all" | "delivery_requests" | "delivery_status" | "no_status";
  setSalesPreset?: (preset: "all" | "delivery_requests" | "delivery_status" | "no_status") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCondition: string;
  setSelectedCondition: (cond: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedLivreur: string;
  setSelectedLivreur: (liv: string) => void;
  selectedDateRange: string;
  setSelectedDateRange: (range: string) => void;
  filteredSales: Order[];
}

export const SalesTab: React.FC<SalesTabProps> = ({ 
  sales, 
  purchases, 
  onAddSale, 
  onEditSale, 
  onUpdateOrder,
  salesPreset = "all",
  setSalesPreset,
  searchQuery,
  setSearchQuery,
  selectedCondition,
  setSelectedCondition,
  selectedCity,
  setSelectedCity,
  selectedLivreur,
  setSelectedLivreur,
  selectedDateRange,
  setSelectedDateRange,
  filteredSales
}) => {
  const distinctCities = React.useMemo(() => {
    return Array.from(new Set(sales.map(s => s.City).filter(Boolean))) as string[];
  }, [sales]);
  const cityOptions = distinctCities.length > 0 ? distinctCities : MOROCCAN_CITIES;

  const distinctLivreurs = React.useMemo(() => {
    return Array.from(new Set(sales.map(s => s.Livreur).filter(Boolean))) as string[];
  }, [sales]);
  const livreurOptions = distinctLivreurs.length > 0 ? distinctLivreurs : LIVREURS;

  // States for sequential WhatsApp messaging
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const selectedOrders = React.useMemo(() => {
    return sales.filter(s => selectedOrderIds.includes(s["Order ID"]));
  }, [sales, selectedOrderIds]);

  // Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Sorting State
  const [sortField, setSortField] = useState<string>("Order date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Multi-direction sort (from smallest to largest and vice versa)
  const sortedSales = React.useMemo(() => {
    const items = [...filteredSales];
    if (!sortField) return items;

    items.sort((a, b) => {
      let valA = a[sortField as keyof Order];
      let valB = b[sortField as keyof Order];

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      // Order date sorting logic (The latest date should be default)
      if (sortField === "Order date") {
        const dateA = new Date(String(valA).split(" ")[0]).getTime() || 0;
        const dateB = new Date(String(valB).split(" ")[0]).getTime() || 0;
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      }

      // Numeric sorting (Prix / totals)
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      // Alphabetical sorting
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === "asc" ? strA.localeCompare(strB, "ar") : strB.localeCompare(strA, "ar");
    });

    return items;
  }, [filteredSales, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-500 shrink-0" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-blue-400 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400 shrink-0" />
    );
  };

  // Calculate current page slice
  const totalPages = Math.ceil(sortedSales.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSales = sortedSales.slice(startIndex, startIndex + itemsPerPage);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCondition("");
    setSelectedCity("");
    setSelectedLivreur("");
    setSelectedDateRange("all");
    setCurrentPage(1);
  };

  // Handle rapid inline update with statistics auto-recalculation (Section 4.1 sync)
  const handleInlineChange = (rowNum: number, field: string, value: any, currentSale: Order) => {
    executeInlineChange(rowNum, field, value, currentSale);
  };

  const executeInlineChange = (rowNum: number, field: string, value: any, currentSale: Order) => {
    const freshSale = { ...currentSale, [field]: value };
    
    // Find unit buying price (Achat lookup)
    const purchase = purchases.find(p => p.Code && p.Code.toUpperCase() === (freshSale["Product name"] || "").toUpperCase());
    const unitCost = purchase ? purchase["Prix Unit"] : 0;
    const supplierName = purchase ? purchase["Fournisseur"] : "";

    let totalPrice = 0;
    let finalUnitPrice = unitCost;
    let deliveryFee = 0;
    let profit = 0;
    let supplierPrice = 0;
    let finalSupplier = "";

    const activeDelivery = freshSale.delivery;

    if (activeDelivery === "Delivered") {
      totalPrice = (freshSale["Variant price"] || 0) * (freshSale["Total quantity"] || 1);
      finalUnitPrice = unitCost;
      deliveryFee = 40;
      supplierPrice = unitCost * (freshSale["Total quantity"] || 1);
      profit = totalPrice - supplierPrice - deliveryFee;
      finalSupplier = supplierName;
    } else if (["Retour", "annuler", "Client Injoignable", "Annulé Au Téléphone", "Annulé Sur Place"].includes(activeDelivery)) {
      totalPrice = 0;
      finalUnitPrice = 0;
      deliveryFee = 0;
      profit = 0;
      supplierPrice = 0;
      finalSupplier = "";
    } else {
      // Pending
      totalPrice = 0;
      finalUnitPrice = 0;
      deliveryFee = 0;
      profit = 0;
      supplierPrice = 0;
      finalSupplier = "";
    }

    const updates = {
      [field]: value,
      "Total price": totalPrice,
      "prix d'achat": finalUnitPrice,
      "Frais livraison": deliveryFee,
      "Bénéfice": profit,
      "Fournisseur": finalSupplier,
      "Fourni price": supplierPrice
    };

    onUpdateOrder(rowNum, updates);
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Sidebar Filter Preset Status Banner */}
      {salesPreset && salesPreset !== "all" && (
        <div className="bg-[#111930] border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-400 font-semibold shadow-md shadow-blue-900/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></span>
            <span>تصفية نشطة من القائمة الجانبية:</span>
            <span className="px-3 py-1 bg-blue-500/15 text-blue-300 rounded-lg border border-blue-500/25">
              {salesPreset === "delivery_requests" && "طلبات التوصيل (Condition: Confirmed، الموزع فارغ، حالة التسليم فارغة)"}
              {salesPreset === "delivery_status" && "حالة التسليم (Condition: Confirmed، الموزع مملوء، حاله التسليم فارغة)"}
              {salesPreset === "no_status" && "بدون حاله (Condition فارغ، الموزع فارغ، حالة التسليم فارغة)"}
            </span>
          </div>
          <button
            onClick={() => setSalesPreset?.("all")}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold shadow-sm"
          >
            إلغاء التصفية وعرض جميع الطلبات
          </button>
        </div>
      )}

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold select-none transition-all ${
              isFilterOpen 
                ? "bg-blue-600/10 text-blue-400 border-blue-600/20" 
                : "bg-[#111930]/60 text-gray-400 border-white/5 hover:bg-white/5"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>تصفية متطورة</span>
          </button>
          
          <div className="relative flex-1 md:w-80">
            <input
              type="text"
              placeholder="ابحث برقم الطلب، اسم العميل، الهاتف..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0d1426] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-3" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {selectedOrderIds.length > 0 && (
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40 animate-pulse border border-emerald-500/20"
            >
              <MessageCircle className="w-4 h-4 text-emerald-100 shrink-0" />
              <span>إرسال واتساب تتابعي ({selectedOrderIds.length})</span>
            </button>
          )}

          <button
            onClick={onAddSale}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طلب جديد</span>
          </button>
        </div>
      </div>

      {/* Advanced Collapsible Filter Panel */}
      {isFilterOpen && (
        <div className="bg-[#111930]/65 border border-white/5 p-5 rounded-2xl gap-4 grid grid-cols-2 md:grid-cols-5 items-end glass-effect animate-slide-down">
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5 font-medium">النطاق الزمني</label>
            <div className="relative">
              <select
                value={selectedDateRange}
                onChange={e => { setSelectedDateRange(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs appearance-none font-sans"
              >
                <option value="all">كل الأوقات</option>
                <option value="today">اليوم</option>
                <option value="yesterday">الأمس</option>
                <option value="week">آخر 7 أيام</option>
                <option value="month">الشهر الحالي</option>
                <option value="year">السنة الحالية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5 font-medium">الحالة (Condition)</label>
            <select
              translate="no"
              value={selectedCondition}
              onChange={e => { setSelectedCondition(e.target.value); setCurrentPage(1); }}
              className="notranslate w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
            >
              <option value="" translate="no" className="notranslate">الكل</option>
              {CONDITIONS.map(c => (
                <option key={c.value} value={c.value} translate="no" className="notranslate">{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5 font-medium">المدينة</label>
            <select
              value={selectedCity}
              onChange={e => { setSelectedCity(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
            >
              <option value="">الكل</option>
              {cityOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5 font-medium">الموزع (Livreur)</label>
            <select
              value={selectedLivreur}
              onChange={e => { setSelectedLivreur(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
            >
              <option value="">الكل</option>
              {livreurOptions.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearFilters}
            className="col-span-2 md:col-span-1 px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين الفلاتر</span>
          </button>
        </div>
      )}

      {/* Sales Table Section */}
      <div className="bg-[#111930]/40 border border-white/5 rounded-2xl overflow-hidden glass-effect">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-[#0d1426] text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5 select-none font-mono">
              <tr>
                <th className="px-4 py-4 w-12 text-center select-none">
                  <input
                    type="checkbox"
                    checked={currentSales.length > 0 && currentSales.every(s => selectedOrderIds.includes(s["Order ID"]))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const ids = currentSales.map(s => s["Order ID"]);
                        setSelectedOrderIds(prev => Array.from(new Set([...prev, ...ids])));
                      } else {
                        const ids = currentSales.map(s => s["Order ID"]);
                        setSelectedOrderIds(prev => prev.filter(id => !ids.includes(id)));
                      }
                    }}
                    className="rounded border-white/10 bg-[#0d1426] text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                </th>
                <th onClick={() => handleSort("Order ID")} className="px-4 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors whitespace-nowrap min-w-[130px] w-[130px]">
                  <div className="flex items-center gap-1 justify-start">
                    <span>الرقم</span>
                    {renderSortIcon("Order ID")}
                  </div>
                </th>
                <th onClick={() => handleSort("Order date")} className="px-4 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors whitespace-nowrap min-w-[160px] w-[160px]">
                  <div className="flex items-center gap-1 justify-start">
                    <span>التاريخ</span>
                    {renderSortIcon("Order date")}
                  </div>
                </th>
                <th onClick={() => handleSort("Full name")} className="px-4 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-1 justify-start">
                    <span>العميل</span>
                    {renderSortIcon("Full name")}
                  </div>
                </th>
                <th onClick={() => handleSort("Phone")} className="px-4 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-1 justify-start">
                    <span>الهاتف</span>
                    {renderSortIcon("Phone")}
                  </div>
                </th>
                <th onClick={() => handleSort("City")} className="px-4 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors whitespace-nowrap min-w-[100px]">
                  <div className="flex items-center gap-1 justify-start">
                    <span>المدينة</span>
                    {renderSortIcon("City")}
                  </div>
                </th>
                <th onClick={() => handleSort("Product name")} className="px-4 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-1 justify-start">
                    <span>المنتج</span>
                    {renderSortIcon("Product name")}
                  </div>
                </th>
                <th onClick={() => handleSort("Variant price")} className="px-4 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors font-sans">
                  <div className="flex items-center gap-1 justify-start">
                    <span>السعر</span>
                    {renderSortIcon("Variant price")}
                  </div>
                </th>
                <th onClick={() => handleSort("Condition")} className="px-2 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors max-w-[80px]">
                  <div className="flex items-center gap-1 justify-start">
                    <span>الإجراء</span>
                    {renderSortIcon("Condition")}
                  </div>
                </th>
                <th onClick={() => handleSort("Livreur")} className="px-2 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors max-w-[95px]">
                  <div className="flex items-center gap-1 justify-start">
                    <span>الموزع</span>
                    {renderSortIcon("Livreur")}
                  </div>
                </th>
                <th onClick={() => handleSort("delivery")} className="px-2 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors max-w-[80px]">
                  <div className="flex items-center gap-1 justify-start">
                    <span>الحالة</span>
                    {renderSortIcon("delivery")}
                  </div>
                </th>
                <th className="px-5 py-4 text-center">
                  <span>خيارات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-sans text-gray-200">
              {currentSales.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-16 text-center text-gray-500 font-medium">
                    لا تتوفر طلبيات مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                currentSales.map((sale, idx) => {
                  const rowNum = sale._rowNum || (idx + 2);
                  return (
                    <tr key={sale["Order ID"] + idx} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Selection Checkbox */}
                      <td className="px-4 py-3.5 text-center select-none w-12">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(sale["Order ID"])}
                          onChange={() => {
                            setSelectedOrderIds(prev => {
                              if (prev.includes(sale["Order ID"])) {
                                return prev.filter(id => id !== sale["Order ID"]);
                              } else {
                                return [...prev, sale["Order ID"]];
                              }
                            });
                          }}
                          className="rounded border-white/10 bg-[#0d1426] text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Order ID */}
                      <td className="px-4 py-3.5 font-mono text-blue-400 font-bold tracking-wide cell-order-id select-all whitespace-nowrap min-w-[130px] w-[130px]">
                        {sale["Order ID"]}
                      </td>

                      {/* Order date */}
                      <td className="px-4 py-3.5 text-gray-400 font-mono whitespace-nowrap min-w-[160px] w-[160px]">
                        {formatDateDisplay(sale["Order date"])}
                      </td>

                      {/* Full Name */}
                      <td className="px-4 py-3.5 font-bold text-white max-w-[120px] truncate cell-fullname">
                        {sale["Full name"]}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5 font-mono tracking-tight text-white/90 whitespace-nowrap">
                        {sale.Phone || "-"}
                      </td>

                      {/* City */}
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[100px]">
                        <div className="font-semibold text-gray-100">
                          {sale.City ? sale.City.split(/[-–—,/()\\]/)[0].trim() : "-"}
                        </div>
                      </td>

                      {/* Product CODE */}
                      <td className="px-4 py-3.5 max-w-[150px] truncate">
                        <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-gray-300 font-mono text-[10px] uppercase font-semibold">
                          {sale["Product name"]}
                        </span>
                      </td>

                      {/* Variant Price */}
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-200">
                        {formatCurrency(sale["Variant price"] || 0)}
                      </td>

                      {/* Condition Selection Dropdown */}
                      <td className="px-2 py-3.5 max-w-[80px]">
                        <select
                          translate="no"
                          value={sale.Condition || "Confirmed"}
                          onChange={e => handleInlineChange(rowNum, "Condition", e.target.value, sale)}
                          className={`notranslate border rounded-lg px-1.5 py-0.5 text-[10px] font-sans focus:border-blue-500/50 max-w-[75px] w-full ${
                            ["Ne repond pas", "Anule", "Pas intéresse"].includes(sale.Condition || "Confirmed")
                              ? "bg-red-600 text-white border-red-500 font-semibold"
                              : (sale.Condition || "Confirmed") === "Confirmed"
                              ? "bg-[#0d1426] text-blue-400 border-blue-500/30"
                              : "bg-[#0d1426] text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {CONDITIONS.map(cond => (
                            <option 
                              key={cond.value} 
                              value={cond.value} 
                              translate="no"
                              className={`notranslate bg-[#0f172a] ${
                                ["Ne repond pas", "Anule", "Pas intéresse"].includes(cond.value)
                                  ? "text-red-500 font-semibold"
                                  : cond.value === "Confirmed"
                                  ? "text-blue-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {cond.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Livreur Selection Dropdown */}
                      <td className="px-2 py-3.5 max-w-[95px]">
                        <select
                          value={sale.Livreur || ""}
                          onChange={e => handleInlineChange(rowNum, "Livreur", e.target.value, sale)}
                          className={`bg-[#0d1426] border rounded-lg px-1.5 py-0.5 text-[10px] font-sans focus:border-blue-500/50 max-w-[90px] w-full ${
                            sale.Livreur
                              ? "text-blue-400 border-blue-500/30"
                              : "text-amber-400 border-amber-500/30"
                          }`}
                        >
                          <option value="" className="bg-[#0f172a] text-amber-400">بدون موزع</option>
                          {LIVREURS.map(liv => (
                            <option 
                              key={liv} 
                              value={liv} 
                              className="bg-[#0f172a] text-blue-400"
                            >
                              {liv}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Delivery Status Selection (Section 4.1 Sync Trigger) */}
                      <td className="px-2 py-3.5 max-w-[80px]">
                        <select
                          value={sale.delivery || ""}
                          onChange={e => handleInlineChange(rowNum, "delivery", e.target.value, sale)}
                          className={`border rounded-lg px-1.5 py-0.5 text-[10px] font-medium font-sans focus:outline-none bg-[#0d1426] max-w-[75px] w-full ${
                            sale.delivery === "Delivered"
                              ? "text-blue-400 border-blue-500/30"
                              : "text-amber-400 border-amber-500/30"
                          }`}
                        >
                          <option value="" className="bg-[#0d1426] text-amber-400 italic">بانتظار الشحن</option>
                          {DELIVERY_STATUSES.map(stat => (
                            <option 
                              key={stat.value} 
                              value={stat.value} 
                              className={`bg-[#0d1426] ${stat.value === "Delivered" ? "text-blue-400" : "text-amber-400"}`}
                            >
                              {stat.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Action buttons (Row controls) */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex gap-1.5 items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                          {/* Edit Details */}
                          <button
                            onClick={() => onEditSale(sale)}
                            title="تعديل تفاصيل الطلب"
                            className="p-1.5 bg-white/5 hover:bg-blue-600/10 hover:text-blue-400 rounded-lg text-gray-400 transition-all border border-transparent hover:border-blue-500/15"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Call Client */}
                          {sale.Phone && (
                            <a
                              href={`tel:${sale.Phone}`}
                              title="اتصال هاتفي بالفور"
                              className="p-1.5 bg-white/5 hover:bg-cyan-600/10 hover:text-cyan-400 rounded-lg text-gray-400 transition-all border border-transparent hover:border-cyan-500/15"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* WhatsApp Chat */}
                          {sale.Phone && (
                            <a
                              href={generateWhatsAppUrl(sale.Phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="محادثة واتساب سريعة"
                              className="p-1.5 bg-white/5 hover:bg-emerald-600/10 hover:text-emerald-400 rounded-lg text-gray-400 transition-all border border-transparent hover:border-emerald-500/15"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}


                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Footer with responsive pagination */}
        <div className="px-6 py-4 bg-[#0d1426] border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-gray-400">
          <span className="font-mono">
            عرض {currentSales.length} طلبات من أصل {filteredSales.length} (إجمالي {sales.length} طلب بالملف)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 px-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 text-[11px]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              السابق
            </button>
            <div className="flex gap-1 items-center">
              {Array.from({ length: totalPages }).map((_, pageIdx) => {
                const pageNum = pageIdx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`py-1 px-3 rounded-lg text-[11px] font-mono transition-all font-bold border ${
                      currentPage === pageNum
                        ? "bg-blue-600/10 text-blue-400 border-blue-500/20"
                        : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 px-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 text-[11px]"
            >
              التالي
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for inline edits */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
        type="warning"
      />

      {/* WhatsApp Sequential Sending Assistant Modal */}
      <WhatsAppSequentialSendModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        selectedOrders={selectedOrders}
        onUpdateOrder={onUpdateOrder}
      />
    </div>
  );
};
