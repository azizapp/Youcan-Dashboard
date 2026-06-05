import React, { useState, useMemo } from "react";
import { Order, Purchase, Payment } from "../types";
import { formatCurrency, formatDateDisplay, saveGenericRow } from "../data";
import { 
  Users, 
  Search, 
  RotateCcw, 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Coins, 
  ShoppingBag, 
  DollarSign, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  Calendar,
  Layers,
  FileText
} from "lucide-react";

interface SuppliersTabProps {
  sales: Order[];
  purchases: Purchase[];
  payments: Payment[];
  onAddPayment: () => void;
  onRefresh: () => Promise<void>;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({ 
  sales, 
  purchases, 
  payments, 
  onAddPayment,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState("all");
  
  // Tab within the detail panel: "purchases" | "sales" | "payments"
  const [detailTab, setDetailTab] = useState<"purchases" | "sales" | "payments">("purchases");

  // Local state for recording a payment immediately from here to make it highly interactive!
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);
  const [quickPaymentForm, setQuickPaymentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: ""
  });
  const [isSubmitingPayment, setIsSubmitingPayment] = useState(false);

  // Sorting columns
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("asc");

  // List of all suppliers compiled from Purchases and Payments
  const supplierNames = useMemo(() => {
    const list = Array.from(new Set([
      ...purchases.map(p => p.Fournisseur),
      ...payments.map(p => p.Fournisseur)
    ].filter(Boolean))) as string[];
    return list;
  }, [purchases, payments]);

  // Set first supplier as default if none selected
  useMemo(() => {
    if (supplierNames.length > 0 && !selectedSupplierName) {
      setSelectedSupplierName(supplierNames[0]);
    }
  }, [supplierNames, selectedSupplierName]);

  // Aggregate stats per supplier
  const supplierStats = useMemo(() => {
    return supplierNames.map(name => {
      // 1. Purchases
      const supplierPurchases = purchases.filter(p => p.Fournisseur === name);
      const totalPurchasesValue = supplierPurchases.reduce((acc, p) => acc + (p.total || 0), 0);
      const totalPurchasesQty = supplierPurchases.reduce((acc, p) => acc + (p.nombre || 0), 0);

      // 2. Payments
      const supplierPayments = payments.filter(p => p.Fournisseur === name);
      const totalPaymentsValue = supplierPayments.reduce((acc, p) => acc + (p.Payment || 0), 0);

      // Remaining Due Amount = purchases - payments
      const remainingDue = totalPurchasesValue - totalPaymentsValue;

      // 3. Sales associated with this supplier
      // Match by order's specified supplier OR by product code purchased from this supplier
      const productCodes = supplierPurchases.map(p => (p.Code || "").toUpperCase()).filter(Boolean);
      
      const supplierSales = sales.filter(s => {
        const orderSupplier = s.Fournisseur;
        let isMatch = false;
        if (orderSupplier && orderSupplier.trim().toLowerCase() === name.trim().toLowerCase()) {
          isMatch = true;
        } else {
          const orderProduct = s["Product name"];
          if (orderProduct && productCodes.includes(orderProduct.toUpperCase())) {
            isMatch = true;
          }
        }
        return isMatch && s.delivery === "Delivered";
      });

      // Split sales status
      const deliveredSales = supplierSales.filter(s => s.delivery === "Delivered");
      
      const returnedCanceledSales = supplierSales.filter(s => 
        ["Retour", "annuler", "Client Injoignable", "Annulé Au Téléphone", "Annulé Sur Place"].includes(s.delivery)
      );

      const pendingSales = supplierSales.filter(s => 
        !s.delivery || !["Delivered", "Retour", "annuler", "Client Injoignable", "Annulé Au Téléphone", "Annulé Sur Place"].includes(s.delivery)
      );

      const totalDeliveredQty = deliveredSales.reduce((acc, s) => acc + (s["Total quantity"] || 0), 0);
      const totalDeliveredRevenue = deliveredSales.reduce((acc, s) => acc + (s["Total price"] || 0), 0);
      
      const totalReturnedQty = returnedCanceledSales.reduce((acc, s) => acc + (s["Total quantity"] || 0), 0);
      const totalPendingQty = pendingSales.reduce((acc, s) => acc + (s["Total quantity"] || 0), 0);

      return {
        name,
        totalPurchasesValue,
        totalPurchasesQty,
        totalPaymentsValue,
        remainingDue,
        supplierSales,
        deliveredSales,
        returnedCanceledSales,
        pendingSales,
        totalDeliveredQty,
        totalDeliveredRevenue,
        totalReturnedQty,
        totalPendingQty,
        approxStock: Math.max(0, totalPurchasesQty - totalDeliveredQty)
      };
    });
  }, [supplierNames, purchases, payments, sales]);

  // Overall KPIs across all suppliers
  const totalPurchasesOverall = useMemo(() => purchases.reduce((acc, p) => acc + (p.total || 0), 0), [purchases]);
  const totalPaymentsOverall = useMemo(() => payments.reduce((acc, p) => acc + (p.Payment || 0), 0), [payments]);
  const totalBalanceDueOverall = totalPurchasesOverall - totalPaymentsOverall;
  const totalDeliveredQtyOverall = useMemo(() => {
    return sales.filter(s => s.delivery === "Delivered").reduce((acc, s) => acc + (s["Total quantity"] || 0), 0);
  }, [sales]);

  // Filter & Sort stats
  const filteredSupplierStats = useMemo(() => {
    let items = supplierStats.filter(stat => {
      if (!searchQuery) return true;
      return stat.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (sortField === "name") {
      items.sort((a,b) => sortDirection === "asc" ? a.name.localeCompare(b.name, "ar") : b.name.localeCompare(a.name, "ar"));
    } else if (sortField === "purchases") {
      items.sort((a,b) => sortDirection === "asc" ? a.totalPurchasesValue - b.totalPurchasesValue : b.totalPurchasesValue - a.totalPurchasesValue);
    } else if (sortField === "due") {
      items.sort((a,b) => sortDirection === "asc" ? a.remainingDue - b.remainingDue : b.remainingDue - a.remainingDue);
    } else if (sortField === "delivered") {
      items.sort((a,b) => sortDirection === "asc" ? a.totalDeliveredQty - b.totalDeliveredQty : b.totalDeliveredQty - a.totalDeliveredQty);
    }

    return items;
  }, [supplierStats, searchQuery, sortField, sortDirection]);

  // Get details of active selection
  const activeSupplierDetail = useMemo(() => {
    return supplierStats.find(s => s.name === selectedSupplierName);
  }, [supplierStats, selectedSupplierName]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
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

  const handleQuickPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierName) return;
    const amountVal = parseFloat(quickPaymentForm.amount);
    if (!amountVal || amountVal <= 0) return;

    setIsSubmitingPayment(true);
    try {
      // Standard ID structure PAY-XXXX
      const payId = `PAY-${String(payments.length + 1001).padStart(4, "0")}`;
      const res = await saveGenericRow("Payments", undefined, {
        ID: payId,
        date: quickPaymentForm.date,
        Fournisseur: selectedSupplierName,
        Payment: amountVal
      });

      if (res.success) {
        setQuickPaymentForm({
          date: new Date().toISOString().split("T")[0],
          amount: ""
        });
        setIsQuickPaymentOpen(false);
        await onRefresh();
      } else {
        alert("فشل تسجيل عملية السداد بالملف السحابي.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitingPayment(false);
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl" id="suppliers-tab-container">
      
      {/* 4 KPI overview cards at the top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="suppliers-overview-cards">
        
        {/* Total Purchases */}
        <div className="bg-[#111930]/65 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect flex gap-4 items-center">
          <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500"></div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold">إجمالي المشتريات من الموردين</div>
            <div className="text-xl font-bold font-mono text-white mt-1">{formatCurrency(totalPurchasesOverall)}</div>
            <div className="text-[10px] text-gray-500 mt-1">تراكم الشراء والسلع بالكامل</div>
          </div>
        </div>

        {/* Total Payments */}
        <div className="bg-[#111930]/65 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect flex gap-4 items-center">
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500"></div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold">إجمالي المبالغ المدفوعة</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatCurrency(totalPaymentsOverall)}</div>
            <div className="text-[10px] text-gray-500 mt-1">المحولة للموزعين والموردين</div>
          </div>
        </div>

        {/* Total Remaining Balance */}
        <div className="bg-[#111930]/65 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect flex gap-4 items-center">
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500"></div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold font-sans">صافي المستحق للموردين ⚠️</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{formatCurrency(totalBalanceDueOverall)}</div>
            <div className="text-[10px] text-gray-500 mt-1">ذمم مالية متبقية قيد التصفية</div>
          </div>
        </div>

        {/* Total Delivered Qty */}
        <div className="bg-[#111930]/65 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect flex gap-4 items-center">
          <div className="absolute top-0 right-0 left-0 h-1 bg-purple-500"></div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-semibold">إجمالي المبيعات المكتملة</div>
            <div className="text-xl font-bold font-mono text-purple-400 mt-1">{totalDeliveredQtyOverall} قطعة</div>
            <div className="text-[10px] text-gray-500 mt-1">تم شحنها واستلام قيمتها بالكامل</div>
          </div>
        </div>

      </div>

      {/* Main Grid: Suppliers directory on left, Details panel on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]" id="suppliers-main-panels">
        
        {/* Left Side: Directory of Suppliers */}
        <div className="lg:col-span-5 bg-[#111930]/40 border border-white/5 rounded-2xl p-4 flex flex-col space-y-4 glass-effect">
          
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 self-start sm:self-auto">
              <Users className="w-4 h-4 text-blue-400" />
              <span>فهرست الشركاء والموردين ({supplierNames.length})</span>
            </h2>
            
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="ابحث بالمورد..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1426] border border-white/10 text-[11px] rounded-xl pr-8 pl-3 py-1.5 text-white focus:outline-none focus:border-blue-500/50"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-2" />
            </div>
          </div>

          {/* Quick list table of suppliers */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#0c1325] text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5">
                  <th onClick={() => handleSort("name")} className="px-3 py-3 cursor-pointer hover:bg-white/[0.03]">
                    <div className="flex items-center gap-1 justify-start">
                      <span>الشريك</span>
                      {renderSortIcon("name")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("purchases")} className="px-3 py-3 cursor-pointer hover:bg-white/[0.03] text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <span>إجمالي الشراء</span>
                      {renderSortIcon("purchases")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("due")} className="px-3 py-3 cursor-pointer hover:bg-white/[0.03] text-left text-amber-400">
                    <div className="flex items-center gap-1 justify-end">
                      <span>المستحق ⚠️</span>
                      {renderSortIcon("due")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSupplierStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-12 text-center text-gray-500 font-medium font-sans">
                      لا تتوفر مسميات موردين في الملفات حالياً
                    </td>
                  </tr>
                ) : (
                  filteredSupplierStats.map((stat, idx) => (
                    <tr 
                      key={stat.name + idx}
                      onClick={() => setSelectedSupplierName(stat.name)}
                      className={`cursor-pointer transition-colors ${
                        selectedSupplierName === stat.name 
                          ? "bg-blue-600/10 text-white border-r-2 border-blue-500" 
                          : "text-gray-300 hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Name */}
                      <td className="px-3 py-3 font-semibold text-xs py-3.5 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stat.remainingDue > 0 ? "bg-amber-400" : "bg-emerald-400"}`}></span>
                        <span>{stat.name}</span>
                      </td>

                      {/* Purchased Value */}
                      <td className="px-3 py-3 text-left font-mono font-bold text-gray-400">
                        {formatCurrency(stat.totalPurchasesValue)}
                      </td>

                      {/* Remaining Balance Due */}
                      <td className={`px-3 py-3 text-left font-mono font-bold ${stat.remainingDue > 0 ? "text-amber-400 font-black" : "text-gray-500"}`}>
                        {formatCurrency(stat.remainingDue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Side: Selected Supplier Deep details dashboard */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {activeSupplierDetail ? (
            <div className="bg-[#111930]/40 border border-white/5 rounded-2xl p-5 flex flex-col space-y-6 glass-effect min-h-[500px]">
              
              {/* Profile Bar */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-white/5">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">تفاصيل الحساب المالي للمورد</span>
                  <h3 className="text-lg font-black text-white mt-1 font-sans flex items-center gap-2">
                    {activeSupplierDetail.name}
                    <span className="text-xs font-normal py-0.5 px-2 bg-blue-600/15 border border-blue-500/10 text-blue-400 rounded-full font-mono">
                      مخزون تقريبي: {activeSupplierDetail.approxStock} قطعة
                    </span>
                  </h3>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setIsQuickPaymentOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-emerald-900/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل دفعة للمورد</span>
                  </button>
                </div>
              </div>

              {/* Stats highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0d1426]/50 p-4 rounded-xl border border-white/5">
                
                {/* 1. Purchases */}
                <div>
                  <span className="text-[9px] text-gray-400 block font-medium">إجمالي المشتريات</span>
                  <span className="text-sm font-bold font-mono text-white block mt-0.5">
                    {formatCurrency(activeSupplierDetail.totalPurchasesValue)}
                  </span>
                  <span className="text-[9.5px] text-gray-500 block font-sans">
                    ({activeSupplierDetail.totalPurchasesQty} قطعة متسلمة بالكامل)
                  </span>
                </div>

                {/* 2. Total Payments */}
                <div>
                  <span className="text-[9px] text-gray-400 block font-medium">إجمالي المبالغ المسددة</span>
                  <span className="text-sm font-bold font-mono text-emerald-400 block mt-0.5">
                    {formatCurrency(activeSupplierDetail.totalPaymentsValue)}
                  </span>
                  <span className="text-[9.5px] text-gray-500 block">
                    مجموع الحوالات البنكية والنقدية
                  </span>
                </div>

                {/* 3. Outstanding balance */}
                <div>
                  <span className="text-[9px] text-gray-400 block font-semibold text-amber-400">باقي المستحقات بذمتكم ⚠️</span>
                  <span className="text-sm font-black font-mono text-amber-400 block mt-0.5">
                    {formatCurrency(activeSupplierDetail.remainingDue)}
                  </span>
                  <span className="text-[9.5px] text-gray-500 block">
                    الرصيد المالي المتبقي سداده
                  </span>
                </div>

                {/* 4. Delivered actual quantity */}
                <div>
                  <span className="text-[9px] text-gray-400 block font-medium">الكمية المسلمة فعلياً للزبون</span>
                  <span className="text-sm font-bold font-mono text-purple-400 block mt-0.5">
                    {activeSupplierDetail.totalDeliveredQty} قطعة
                  </span>
                  <span className="text-[9.5px] text-gray-500 block">
                    مبيعات بنجاح ({formatCurrency(activeSupplierDetail.totalDeliveredRevenue)})
                  </span>
                </div>

              </div>

              {/* Sale status meters */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium font-sans">
                <div className="bg-emerald-950/20 border border-emerald-500/10 p-2.5 rounded-xl flex flex-col justify-center">
                  <span className="text-gray-400 text-[9px] mb-1">تمت تصفيتها وبيعت</span>
                  <span className="text-emerald-400 font-bold flex items-center justify-center gap-1 font-mono text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activeSupplierDetail.totalDeliveredQty} قطعة
                  </span>
                </div>
                
                <div className="bg-red-950/20 border border-red-500/10 p-2.5 rounded-xl flex flex-col justify-center">
                  <span className="text-gray-400 text-[9px] mb-1">المرتجع أو الملغى</span>
                  <span className="text-rose-400 font-bold flex items-center justify-center gap-1 font-mono text-xs">
                    <XCircle className="w-3.5 h-3.5" />
                    {activeSupplierDetail.totalReturnedQty} قطعة
                  </span>
                </div>

                <div className="bg-amber-950/20 border border-amber-500/10 p-2.5 rounded-xl flex flex-col justify-center">
                  <span className="text-gray-400 text-[9px] mb-1">قيد الشحن والتوصيل</span>
                  <span className="text-amber-400 font-bold flex items-center justify-center gap-1 font-mono text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {activeSupplierDetail.totalPendingQty} قطعة
                  </span>
                </div>
              </div>

              {/* Details Tab breakdown */}
              <div className="flex flex-col flex-1 space-y-3 min-h-[300px]">
                
                <div className="flex border-b border-white/5 bg-[#0d1426] p-1 gap-2 rounded-xl">
                  <button
                    onClick={() => setDetailTab("purchases")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      detailTab === "purchases" ? "bg-white/5 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>المشتريات والسلع الموردة ({activeSupplierDetail.deliveredSales.length + activeSupplierDetail.returnedCanceledSales.length + activeSupplierDetail.pendingSales.length === 0 ? 0 : purchases.filter(p => p.Fournisseur === activeSupplierDetail.name).length})</span>
                  </button>

                  <button
                    onClick={() => setDetailTab("sales")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      detailTab === "sales" ? "bg-white/5 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>تفاصيل مبيعات السلعة ({(() => {
                      const uniqueProds = activeSupplierDetail.supplierSales
                        .map(s => (s["Product name"] || "").trim().toUpperCase())
                        .filter(Boolean);
                      return new Set(uniqueProds).size;
                    })()})</span>
                  </button>

                  <button
                    onClick={() => setDetailTab("payments")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      detailTab === "payments" ? "bg-white/5 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>آداء السداد والأرشيف ({payments.filter(p => p.Fournisseur === activeSupplierDetail.name).length})</span>
                  </button>
                </div>

                {/* SubTab Content View */}
                <div className="flex-1 bg-black/10 rounded-xl p-3 border border-white/5 overflow-y-auto max-h-[350px]">
                  
                  {/* DETAIL A: PURCHASES SUMMARY LIST */}
                  {detailTab === "purchases" && (
                    <div className="space-y-3">
                      {purchases.filter(p => p.Fournisseur === activeSupplierDetail.name).length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-xs">لا تتوفر فواتير شراء مرصودة لهذه المورّد</div>
                      ) : (
                        purchases.filter(p => p.Fournisseur === activeSupplierDetail.name).map((p, i) => (
                          <div key={p.ID || i} className="p-3 bg-[#0d1426]/50 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-white uppercase font-mono">{p.Produit}</span>
                                <span className="text-[9px] px-2 py-0.5 bg-rose-500/10 border border-red-500/10 text-rose-400 font-bold rounded-md font-mono">{p.Code}</span>
                              </div>
                              <span className="text-[10px] text-gray-500 block font-mono">شحنة رقم: {p.ID} • تاريخ الاستلام: {formatDateDisplay(p.date)}</span>
                            </div>

                            <div className="text-right sm:text-left flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start shrink-0">
                              <span className="text-xs font-bold font-mono text-white">{formatCurrency(p.total || 0)}</span>
                              <span className="text-[9.5px] text-gray-500 block mt-0.5 font-sans">
                                {p.nombre} قطعة • تكلفة الحبة {formatCurrency(p["Prix Unit"])}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* DETAIL B: ASSOCIATED SALES */}
                  {detailTab === "sales" && (() => {
                    // Aggregate elements by uppercase product name
                    const aggregatedSalesMap = new Map<string, { productName: string; totalQuantity: number; totalPrice: number }>();
                    activeSupplierDetail.supplierSales.forEach(s => {
                      const rawProdName = (s["Product name"] || "بدون كود").trim();
                      const normKey = rawProdName.toUpperCase();
                      const curr = aggregatedSalesMap.get(normKey);
                      if (curr) {
                        curr.totalQuantity += (s["Total quantity"] || 1);
                        curr.totalPrice += (s["Total price"] || 0);
                      } else {
                        aggregatedSalesMap.set(normKey, {
                          productName: rawProdName,
                          totalQuantity: s["Total quantity"] || 1,
                          totalPrice: s["Total price"] || 0,
                        });
                      }
                    });
                    const aggregatedSales = Array.from(aggregatedSalesMap.values());

                    return (
                      <div className="space-y-3">
                        {aggregatedSales.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-xs">لا تتوفر طلبيات مبيعات هاتفية مسجلة بكود سلعة هذا المورد</div>
                        ) : (
                          aggregatedSales.map((s, idx) => (
                            <div key={idx} className="p-4 bg-[#0d1426]/60 hover:bg-[#0d1426]/85 rounded-2xl border border-white/5 hover:border-emerald-500/10 flex items-center justify-between gap-4 text-right transition-all duration-150">
                              {/* Product Name (Explicitly aligned right, placed first in HTML to appear on far-right in RTL render) */}
                              <div className="flex-1 min-w-0 text-right">
                                <span className="font-extrabold text-white font-sans text-base block tracking-wide uppercase truncate">
                                  {s.productName}
                                </span>
                                {(() => {
                                  const matchingPurchase = purchases.find(p => p.Fournisseur === activeSupplierDetail.name && p.Code && p.Code.trim().toUpperCase() === s.productName.toUpperCase())
                                    || purchases.find(p => p.Code && p.Code.trim().toUpperCase() === s.productName.toUpperCase());
                                  return matchingPurchase?.Produit ? (
                                    <span className="text-xs text-gray-400 block mt-1 font-sans">
                                      {matchingPurchase.Produit}
                                    </span>
                                  ) : null;
                                })()}
                              </div>

                              {/* Status badge, quantity, and price (Aligned left, placed second in HTML to appear on far-left) */}
                              <div className="flex flex-col items-left text-left shrink-0 gap-1.5">
                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold border bg-emerald-950/40 text-emerald-400 border-emerald-500/20 uppercase tracking-wider self-end">
                                  DELIVERED
                                </span>
                                
                                <div className="text-xs text-gray-300 font-medium font-sans mt-0.5 text-left">
                                  العدد : <span className="text-blue-400 font-extrabold font-mono text-sm">{s.totalQuantity}</span> • مجموع المبلغ : <span className="text-gray-100 font-bold font-mono text-sm">{formatCurrency(s.totalPrice)}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}

                  {/* DETAIL C: PAYMENTS LEDGER */}
                  {detailTab === "payments" && (
                    <div className="space-y-2">
                      {payments.filter(p => p.Fournisseur === activeSupplierDetail.name).length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-xs">لم يتم رصد أو تسجيل أي حوالة مالية مسلمة لهده الجهة حتى الآن</div>
                      ) : (
                        payments.filter(p => p.Fournisseur === activeSupplierDetail.name).map((pay, i) => (
                          <div key={pay.ID || i} className="p-3 bg-[#0d1426]/50 rounded-xl border border-white/5 flex justify-between items-center text-right font-sans">
                            <div>
                              <span className="text-xs font-bold text-white block font-mono">{pay.ID}</span>
                              <span className="text-[10px] text-gray-500 block mt-0.5">تاريخ حوالة الصرف: {formatDateDisplay(pay.date)}</span>
                            </div>
                            <div className="text-left font-mono">
                              <span className="text-xs font-bold text-emerald-400 block">{formatCurrency(pay.Payment || 0)}</span>
                              <span className="text-[9px] text-gray-500 block">مرصدة ومثبتة بالملف</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>

              </div>

            </div>
          ) : (
            <div className="bg-[#111930]/40 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center glass-effect grow">
              <Users className="w-12 h-12 text-gray-500 mb-2 animate-pulse" />
              <p className="text-gray-400 text-sm font-semibold font-sans">برجاء تحديد مورد من القائمة بالجانب الأيمن لعرض ماله وما عليه بالتفصيل</p>
            </div>
          )}

        </div>

      </div>

      {/* Quick Interactive Add Payment Modal */}
      {isQuickPaymentOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111930] border border-white/10 w-full max-w-sm rounded-2xl p-6 text-right animate-slide-up" dir="rtl">
            <h4 className="text-sm font-bold text-white mb-2 pb-2 border-b border-white/5">
              تسجيل دفعة للمورّد: <span className="text-blue-400">{selectedSupplierName}</span>
            </h4>

            <form onSubmit={handleQuickPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">اسم المورّد مستلم الحوالة</label>
                <input
                  type="text"
                  disabled
                  value={selectedSupplierName}
                  className="w-full bg-[#0d1426]/50 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-xs font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">تاريخ الحوالة المالية</label>
                <input
                  type="date"
                  required
                  value={quickPaymentForm.date}
                  onChange={e => setQuickPaymentForm({ ...quickPaymentForm, date: e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">المبلغ المراد دفعه بالدرهم (MAD / DH) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="مثال: 5000"
                  value={quickPaymentForm.amount}
                  onChange={e => setQuickPaymentForm({ ...quickPaymentForm, amount: e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-bold font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsQuickPaymentOpen(false)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitingPayment}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold font-sans transition-colors inline-flex justify-center items-center gap-1 shadow-lg shadow-emerald-950/25"
                >
                  {isSubmitingPayment ? "جاري الحفظ..." : "تسجيل الدفعة السحابية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
