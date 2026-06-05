import React, { useState } from "react";
import { Order, Purchase, Payment, Expense } from "../types";
import { matchesRobustSearch } from "../lib/searchUtils";
import { MOROCCAN_CITIES, CONDITIONS, DELIVERY_STATUSES, LIVREURS, formatCurrency, formatDateDisplay, generateWhatsAppUrl, validatePhone, getCalculatedFields } from "../data";
import { Home, Users, Package, CreditCard, MoreHorizontal, ShieldCheck, TrendingUp, AlertTriangle, Sprout, ShoppingCart, Info, Search, Plus, Filter, Phone, PhoneCall, MessageCircle, X, ChevronDown, Check, Coins, Calendar, RefreshCcw } from "lucide-react";

interface MobileViewProps {
  sales: Order[];
  purchases: Purchase[];
  payments: Payment[];
  expenses: Expense[];
  onAddSale: (newSale: Order) => void;
  onUpdateOrder: (rowNum: number, updates: any) => void;
  onAddExpense: (newExpense: Expense) => void;
}

export const MobileView: React.FC<MobileViewProps> = ({ sales, purchases, payments, expenses, onAddSale, onUpdateOrder, onAddExpense }) => {
  const distinctCities = React.useMemo(() => {
    return Array.from(new Set(sales.map(s => s.City).filter(Boolean))) as string[];
  }, [sales]);
  const cityOptions = distinctCities.length > 0 ? distinctCities : MOROCCAN_CITIES;

  const distinctLivreurs = React.useMemo(() => {
    return Array.from(new Set(sales.map(s => s.Livreur).filter(Boolean))) as string[];
  }, [sales]);
  const livreurOptions = distinctLivreurs.length > 0 ? distinctLivreurs : LIVREURS;

  const productOptions = React.useMemo(() => {
    return Array.from(new Set([
      ...purchases.map(p => p.Code),
      ...sales.map(s => s["Product name"])
    ].filter(Boolean))) as string[];
  }, [purchases, sales]);

  const expenseTapersOptions = React.useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.Taper).filter(Boolean))) as string[];
  }, [expenses]);
  const finalExpenseTapers = expenseTapersOptions.length > 0 ? expenseTapersOptions : ["إعلانات انستغرام", "إعلانات فيسبوك", "مصاريف شحن", "مصاريف عامة"];

  const [activePage, setActivePage] = useState<"home" | "sales" | "purchases" | "payments" | "more">("home");
  const [moreSubTab, setMoreSubTab] = useState<"reports" | "expenses" | "settings">("reports");

  // Search & Filter state
  const [salesSearch, setSalesSearch] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Detail Modal popup for a specific order
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // Add Sale Modal popup
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [newSaleForm, setNewSaleForm] = useState({
    "Full name": "",
    "Phone": "",
    "City": "",
    "Region": "",
    "Product name": "",
    "Variant price": "" as any,
    "Product URL": "",
    "Total quantity": 1,
    "Condition": "",
    "delivery": "",
    "Livreur": ""
  });

  // Expense popup launcher
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    "Prix": "" as any,
    "Taper": ""
  });

  const [phoneError, setPhoneError] = useState("");

  const handleProductSelect = (code: string) => {
    const parent = purchases.find(p => p.Code && p.Code.toUpperCase() === code.toUpperCase());
    setNewSaleForm(prev => ({
      ...prev,
      "Product name": code,
      "Variant price": parent ? parent["Prix de vente"] : 0,
      "Product URL": parent ? `https://yourstore.com/products/${code.toLowerCase()}` : ""
    }));
  };

  // Recent 10 Orders List
  const recentOrders = [...sales].sort((a,b) => {
    const dA = a["Order date"] || "";
    const dB = b["Order date"] || "";
    return dB.localeCompare(dA);
  }).slice(0, 10);

  // Compute stats including 3 new delivery statuses
  const totalOrdersCount = sales.length;
  // Delivered count
  const deliveredCount = sales.filter(s => s.delivery === "Delivered").length;
  // Retour count
  const retourCount = sales.filter(s => s.delivery === "Retour").length;

  // Cancellation conditions includes all 4 indices (annuler + 3 new cancellation statuses grouped)
  const cancellationStatuses = ["annuler", "Client Injoignable", "Annulé Au Téléphone", "Annulé Sur Place"];
  const cancelledCount = sales.filter(s => cancellationStatuses.includes(s.delivery)).length;

  const totalDeliveredRevenue = sales.reduce((acc, s) => s.delivery === "Delivered" ? acc + (s["Total price"] || 0) : acc, 0);
  const totalDeliveredProfit = sales.reduce((acc, s) => s.delivery === "Delivered" ? acc + (s["Bénéfice"] || 0) : acc, 0);
  const totalExpensesSum = expenses.reduce((acc, ex) => acc + (ex.Prix || 0), 0);
  
  // Net Profit = Σ(Bénéfice) - Σ(Expenses.Prix)
  const netProfit = totalDeliveredProfit - totalExpensesSum;

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(newSaleForm.Phone)) {
      setPhoneError("رقم الهاتف غير صحيح (يجب أن يبدأ بـ 0 ويتكون من 10 أرقام)");
      return;
    }
    setPhoneError("");

    const orderId = `WSP-${String(sales.length + 1001).padStart(4, "0")}`;
    const dateToday = new Date().toISOString().split("T")[0];
    
    // Automatically calculate price on Delivered and supplier info
    const calcs = getCalculatedFields(
      newSaleForm["Product name"],
      parseFloat(newSaleForm["Variant price"]) || 0,
      parseFloat(newSaleForm["Total quantity"]) || 0,
      newSaleForm.delivery,
      purchases
    );

    const fullNewSale: Order = {
      _rowNum: sales.length + 2,
      "Order ID": orderId,
      "Order date": dateToday,
      "Full name": newSaleForm["Full name"],
      "Phone": newSaleForm.Phone,
      "City": newSaleForm.City,
      "Region": newSaleForm.Region,
      "Product name": newSaleForm["Product name"],
      "Product URL": newSaleForm["Product URL"],
      "Variant price": parseFloat(newSaleForm["Variant price"]) || 0,
      "Total quantity": parseFloat(newSaleForm["Total quantity"]) || 0,
      "Total price": newSaleForm.delivery === "Delivered" ? (parseFloat(newSaleForm["Variant price"]) || 0) * (parseFloat(newSaleForm["Total quantity"]) || 0) : 0,
      "Condition": newSaleForm.Condition,
      "Livreur": newSaleForm.Livreur,
      "delivery": newSaleForm.delivery,
      "WHATSAPP": generateWhatsAppUrl(newSaleForm.Phone),
      ...calcs
    };

    onAddSale(fullNewSale);
    setIsAddSaleOpen(false);
    // Reset form
    setNewSaleForm({
      "Full name": "",
      "Phone": "",
      "City": "",
      "Region": "",
      "Product name": "",
      "Variant price": "" as any,
      "Product URL": "",
      "Total quantity": 1,
      "Condition": "",
      "delivery": "",
      "Livreur": ""
    });
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expId = `EXP-${String(expenses.length + 101).padStart(3, "0")}`;
    const dateToday = new Date().toISOString().split("T")[0];

    const expObj: Expense = {
      _rowNum: expenses.length + 2,
      ID: expId,
      date: dateToday,
      Prix: parseFloat(newExpenseForm.Prix) || 0,
      Taper: newExpenseForm.Taper
    };

    onAddExpense(expObj);
    setIsAddExpenseOpen(false);
    setNewExpenseForm({ Prix: "" as any, Taper: "" });
  };

  // Detail Modal Inline Save recurrence (recalls statistics immediately)
  const handleDetailUpdate = (rowNum: number, field: string, value: any, currentSale: Order) => {
    const updatedObj = { ...currentSale, [field]: value };
    const calcs = getCalculatedFields(
      updatedObj["Product name"],
      updatedObj["Variant price"],
      updatedObj["Total quantity"],
      updatedObj.delivery,
      purchases
    );

    const priceRecalc = updatedObj.delivery === "Delivered" ? updatedObj["Variant price"] * updatedObj["Total quantity"] : 0;
    
    const updates = {
      [field]: value,
      "Total price": priceRecalc,
      ...calcs
    };

    onUpdateOrder(rowNum, updates);

    // Dynamic state feed inside detail open modal
    setSelectedOrderDetail(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updates
      } as Order;
    });
  };

  // Filter Sales list for mobile UI
  const filteredSalesList = sales.filter(s => {
    const matchesSearch = matchesRobustSearch(s, salesSearch);

    const matchesCond = !selectedCondition ? true : s.Condition === selectedCondition;
    const matchesDeliv = !selectedDelivery ? true : s.delivery === selectedDelivery;

    return matchesSearch && matchesCond && matchesDeliv;
  });

  return (
    <div className="mx-auto my-4 w-full max-w-[410px] h-[780px] bg-[#070a13] border-[6px] border-slate-800 rounded-[44px] shadow-2xl relative overflow-hidden flex flex-col font-sans select-none" dir="rtl">
      {/* Device Top Speaker Notch / Indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-full z-50 flex items-center justify-around px-4">
        <span className="w-1.5 h-1.5 bg-camera-indigo rounded-full block bg-cyan-500"></span>
        <span className="w-12 h-1 bg-slate-700/80 rounded-full block"></span>
      </div>

      {/* Screen container */}
      <div className="flex-1 overflow-hidden flex flex-col pt-8 pb-14 h-full">
        
        {/* VIEW 1: HOME PAGE */}
        {activePage === "home" && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 h-full" id="pageHome">
            {/* Header branding */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-gray-500 text-[10px] block">لوحة تحكم اليوكان</span>
                <span className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                  مراقبة المبيعات الهاتفية
                  <span className="text-[10px] py-0.5 px-2 rounded-full bg-blue-600/20 text-blue-400 font-bold border border-blue-500/10">مباشر</span>
                </span>
              </div>
              <button onClick={() => setIsAddSaleOpen(true)} className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick KPIs Summary Ring banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111930]/60 border border-white/5 p-4 rounded-xl relative glass-effect">
                <div className="text-gray-400 text-[10px] mb-0.5 font-medium">إجمالي الاستلام (مستلم)</div>
                <div className="text-sm font-bold font-mono text-emerald-400">{formatCurrency(totalDeliveredRevenue)}</div>
                <p className="text-[9px] text-gray-500 mt-0.5">منصف {deliveredCount} طلبات موصلة</p>
              </div>
              <div className="bg-[#111930]/60 border border-white/5 p-4 rounded-xl relative glass-effect">
                <div className="text-gray-400 text-[10px] mb-0.5 font-medium">حساب صافي الأرباح</div>
                <div className={`text-sm font-bold font-mono ${netProfit >= 0 ? "text-blue-400" : "text-rose-400"}`}>{formatCurrency(netProfit)}</div>
                <p className="text-[9px] text-gray-500 mt-0.5">بعد خصم تكاليف المشروع</p>
              </div>
            </div>

            {/* 4 KPI status counts */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-emerald-950/20 border border-emerald-500/10 p-2.5 rounded-lg flex flex-col justify-center items-center">
                <span className="text-[9px] text-gray-400 mb-0.5 font-medium">المستلمة</span>
                <span className="font-bold text-emerald-400 font-mono text-xs">{deliveredCount}</span>
              </div>
              <div className="bg-amber-950/20 border border-amber-500/10 p-2.5 rounded-lg flex flex-col justify-center items-center">
                <span className="text-[9px] text-gray-400 mb-0.5 font-medium">المرتجعة</span>
                <span className="font-bold text-amber-400 font-mono text-xs">{retourCount}</span>
              </div>
              <div className="bg-rose-950/20 border border-rose-500/10 p-2.5 rounded-lg flex flex-col justify-center items-center">
                <span className="text-[9px] text-gray-400 mb-0.5 font-medium">الملغاة</span>
                <span className="font-bold text-red-400 font-mono text-xs">{cancelledCount}</span>
              </div>
              <div className="bg-blue-950/20 border border-blue-500/10 p-2.5 rounded-lg flex flex-col justify-center items-center">
                <span className="text-[9px] text-gray-400 mb-0.5 font-medium">المجموع</span>
                <span className="font-bold text-blue-400 font-mono text-xs">{totalOrdersCount}</span>
              </div>
            </div>

            {/* Recent Orders Preview Header */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs font-bold text-gray-200">آخر 10 عمليات تسجيل بالشرق</span>
                <span className="text-[10px] text-blue-400 hover:underline cursor-pointer" onClick={() => setActivePage("sales")}>عرض الكل ←</span>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-0.5">
                {recentOrders.map((ord, i) => (
                  <div
                    key={ord["Order ID"] + i}
                    onClick={() => setSelectedOrderDetail(ord)}
                    className="p-3 bg-[#111930]/40 border border-white/5 rounded-xl hover:bg-white/5 transition-all cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-blue-400 font-bold text-xs uppercase">{ord["Order ID"]}</span>
                        <span className="text-[9px] text-gray-400 font-medium truncate max-w-[100px]">{ord["Full name"]}</span>
                      </div>
                      <span className="font-semibold text-gray-200 text-xs block truncate max-w-[150px] uppercase font-mono">{ord["Product name"]}</span>
                    </div>

                    <div className="text-left">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border block mb-1 ${
                        ord.delivery === "Delivered" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : ["Retour", "annuler", "Client Injoignable", "Annulé Au Téléphone", "Annulé Sur Place"].includes(ord.delivery)
                          ? "bg-red-500/10 text-rose-400 border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {ord.delivery || ord.Condition || "معلق"}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-gray-300">{formatCurrency(ord.delivery === "Delivered" ? (ord["Variant price"] * ord["Total quantity"]) : 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: SALES PAGE */}
        {activePage === "sales" && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 h-full" id="pageSales">
            {/* Header search / Filter bar */}
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب ، اسم العميل..."
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white"
                />
                <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-2.5" />
              </div>
              <button
                onClick={() => setIsFilterSheetOpen(true)}
                className="p-2 bg-white/5 border border-white/5 rounded-xl text-gray-400"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list content */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-[500px]">
              {filteredSalesList.length === 0 ? (
                <div className="py-20 text-center text-gray-500 text-xs">لا تتوفر طلبيات مطابقة للبحث</div>
              ) : (
                filteredSalesList.map((ord, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedOrderDetail(ord)}
                    className="p-3 bg-[#111930]/40 border border-white/5 rounded-xl hover:bg-white/5 transition-all cursor-pointer flex justify-between items-start"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-blue-400 font-bold text-xs uppercase">{ord["Order ID"]}</span>
                        <span className="text-gray-200 font-bold text-xs">{ord["Full name"]}</span>
                      </div>
                      <span className="text-[11px] text-gray-400 block font-mono">{ord.Phone}</span>
                      <span className="text-[11px] text-gray-400 block">{ord.City} • {ord.Region || ord.City}</span>
                      
                      <div className="pt-1 flex gap-1 items-center">
                        <span className="px-1.5 py-0.5 bg-white/5 text-[9px] rounded text-gray-300 font-mono uppercase">{ord["Product name"]}</span>
                        <span className="text-[10px] text-gray-500 font-mono">الكمية: {ord["Total quantity"] || 1}</span>
                      </div>
                    </div>

                    <div className="text-left flex flex-col justify-between h-full items-end min-h-[70px]">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        ord.delivery === "Delivered"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : ["Retour", "annuler", "Client Injoignable", "Annulé Au Téléphone", "Annulé Sur Place"].includes(ord.delivery)
                          ? "bg-red-500/10 text-rose-300 border-red-500/15"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/15"
                      }`}>
                        {ord.delivery || ord.Condition || "غير محدد"}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">{formatCurrency(ord["Variant price"] * ord["Total quantity"])}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: PURCHASES VIEW */}
        {activePage === "purchases" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-full" id="pagePurchases">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">السلع والوارد شحن</h3>
            
            <div className="space-y-3">
              {purchases.map((p, idx) => (
                <div key={idx} className="p-3 bg-[#111930]/40 border border-white/5 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-white block uppercase font-mono">{p.Produit}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-mono tracking-tight font-semibold">المورد: {p.Fournisseur}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 bg-rose-500/10 text-rose-400 font-bold border border-red-500/15 rounded-full font-mono">{p.Code}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center font-mono">
                    <div>
                      <span className="text-[9px] text-gray-500 block">الكمية الموفرة</span>
                      <span className="text-xs text-white font-bold">{p.nombre} قطعة</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">سعر التكلفة</span>
                      <span className="text-xs text-rose-400 font-bold">{formatCurrency(p["Prix Unit"])}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">البيع المقترح</span>
                      <span className="text-xs text-emerald-400 font-bold">{formatCurrency(p["Prix de vente"])}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: PAYMENTS VIEW */}
        {activePage === "payments" && (
          <div className="flex-1 overflow-y-auto p-4 h-full" id="pagePayments">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">حوالات وجدول الدفعات المسددة</h3>
            <div className="space-y-3">
              {payments.map((pay, idx) => (
                <div key={idx} className="p-3 bg-[#111930]/40 border border-white/5 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white block font-mono">{pay.ID}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">المستلم: {pay.Fournisseur}</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-xs font-bold text-emerald-400 block">{formatCurrency(pay.Payment)}</span>
                    <span className="text-[9px] text-gray-500 block">{formatDateDisplay(pay.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: MORE TABS (EXPENSES & REPORTS & SETTINGS SUB SECTION) */}
        {activePage === "more" && (
          <div className="flex-1 overflow-hidden flex flex-col h-full" id="pageMore">
            {/* Horizontal Sub selector */}
            <div className="flex border-b border-white/5 bg-[#0d1426] p-1 gap-2 mx-4 mt-2 mb-3 rounded-xl">
              <button
                onClick={() => setMoreSubTab("reports")}
                className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-colors ${
                  moreSubTab === "reports" ? "bg-white/5 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                التقارير
              </button>
              <button
                onClick={() => setMoreSubTab("expenses")}
                className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-colors ${
                  moreSubTab === "expenses" ? "bg-white/5 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                المصاريف
              </button>
              <button
                onClick={() => setMoreSubTab("settings")}
                className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-colors ${
                  moreSubTab === "settings" ? "bg-white/5 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                التهيئة
              </button>
            </div>

            {/* Scrollable Sub view */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4">
              
              {/* SUB A: MOBILE REPORTS */}
              {moreSubTab === "reports" && (
                <div className="space-y-4 animate-fade-in text-right">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">الملخص المالي الرقمي</h4>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">أرباح المبيعات المستلمة:</span>
                      <span className="font-mono text-emerald-400 font-bold">{formatCurrency(totalDeliveredProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">أعباء وتكاليف المشروع:</span>
                      <span className="font-mono text-rose-400 font-bold">{formatCurrency(totalExpensesSum)}</span>
                    </div>
                    <div className="border-t border-white/5 pt-2 flex justify-between items-center text-xs">
                      <span className="text-white font-bold">صافي الربح الفعلي:</span>
                      <span className={`font-mono text-sm font-bold ${netProfit >= 0 ? "text-blue-400" : "text-rose-400"}`}>{formatCurrency(netProfit)}</span>
                    </div>
                  </div>

                  {/* Top 5 Products inline code lists */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-400 block">أعلى مدن مغربية طلباً</span>
                    <div className="space-y-1">
                      {MOROCCAN_CITIES.slice(0, 4).map((c, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-[#111930]/40 rounded-lg text-xs font-mono">
                          <span className="text-gray-300 font-sans">{c}</span>
                          <span className="text-gray-500 font-bold">نشاط ممتاز</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB B: MOBILE EXPENSES */}
              {moreSubTab === "expenses" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-200">فواتير المصاريف المسجلة</span>
                    <button
                      onClick={() => setIsAddExpenseOpen(true)}
                      className="text-[10px] bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة مصروف
                    </button>
                  </div>

                  <div className="space-y-3">
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="p-3 bg-[#111930]/40 border border-white/5 rounded-xl flex justify-between items-center text-right font-sans">
                        <div>
                          <span className="text-xs font-bold text-white block">{exp.Taper}</span>
                          <span className="text-[10px] text-gray-500 block mt-0.5 uppercase font-mono">{exp.ID}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-xs font-bold text-rose-400 block">{formatCurrency(exp.Prix)}</span>
                          <span className="text-[9px] text-gray-500 block">{formatDateDisplay(exp.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB C: MOBILE SETTINGS */}
              {moreSubTab === "settings" && (
                <div className="space-y-4 animate-fade-in text-right">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2 text-xs">
                    <span className="text-gray-300 block font-bold">لوحة تحكم الهاتف Youcan UI</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                      نسخة الهاتف محسنة ومعدة خصيصاً لموظفي التوصيل والشاحنين في الميدان لتعديل حالات الشحنات فورا بطرق سريعة.
                    </p>
                    <div className="pt-2 border-t border-white/5 leading-relaxed text-[10px] text-gray-400 font-mono">
                      <div>إصدار السيرفر: v2.1.1</div>
                      <div>بوابة الربط: 1sRl7IlEBVzu...</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* --- FLOATING BOTTOM MENU NAV FOR DEVICES (env safe bounds) --- */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#0a1020]/95 border-t border-white/5 flex items-center justify-around px-4 z-40 select-none pb-safe-bottom" style={{ boxSizing: "border-box" }}>
        <button
          onClick={() => setActivePage("home")}
          className={`flex flex-col items-center justify-center p-1.5 transition-all outline-none ${
            activePage === "home" ? "text-blue-400 scale-105" : "text-gray-500 hover:text-white"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1 font-sans">الرئيسية</span>
        </button>

        <button
          onClick={() => setActivePage("sales")}
          className={`flex flex-col items-center justify-center p-1.5 transition-all outline-none ${
            activePage === "sales" ? "text-blue-400 scale-105" : "text-gray-500 hover:text-white"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1 font-sans">المبيعات</span>
        </button>

        <button
          onClick={() => setActivePage("purchases")}
          className={`flex flex-col items-center justify-center p-1.5 transition-all outline-none ${
            activePage === "purchases" ? "text-blue-400 scale-105" : "text-gray-500 hover:text-white"
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1 font-sans">المشتريات</span>
        </button>

        <button
          onClick={() => setActivePage("payments")}
          className={`flex flex-col items-center justify-center p-1.5 transition-all outline-none ${
            activePage === "payments" ? "text-blue-400 scale-105" : "text-gray-500 hover:text-white"
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1 font-sans">الدفعات</span>
        </button>

        <button
          onClick={() => setActivePage("more")}
          className={`flex flex-col items-center justify-center p-1.5 transition-all outline-none ${
            activePage === "more" ? "text-blue-400 scale-105" : "text-gray-500 hover:text-white"
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1 font-sans">المزيد</span>
        </button>
      </div>

      {/* --- ADD EXPENSE BOTTOM SHEET DIALOG --- */}
      {isAddExpenseOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-[#111930] border-t border-white/10 rounded-t-3xl p-6 text-right animate-slide-up max-h-[75%]" dir="rtl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <span className="text-white font-bold text-sm">تسجيل مصروفات الهاتف</span>
              <button onClick={() => setIsAddExpenseOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">نوع المصروفات (Taper)</label>
                <select
                  required
                  value={newExpenseForm.Taper}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, Taper: e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
                >
                  <option value="" disabled className="italic">اختر نوع المصروف...</option>
                  {finalExpenseTapers.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">القيمة الإجمالية (Prix DH)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newExpenseForm.Prix === "" || newExpenseForm.Prix === undefined ? "" : newExpenseForm.Prix}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, Prix: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 font-bold text-white text-xs rounded-xl transition-colors"
              >
                تأكيد وتسجيل المصاريف بالملف
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FILTER SLIDE UP SHEET DRAWER FOR SALES --- */}
      {isFilterSheetOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-[#111930] border-t border-white/10 rounded-t-[32px] p-6 text-right animate-slide-up" dir="rtl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <span className="text-white font-bold text-xs flex items-center gap-1">
                <Filter className="w-4 h-4 text-blue-500" />
                تصفية متطورة للمبيعات
              </span>
              <button onClick={() => setIsFilterSheetOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-full bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">الإجراء (Condition)</label>
                <select
                  translate="no"
                  value={selectedCondition}
                  onChange={e => setSelectedCondition(e.target.value)}
                  className="notranslate w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
                >
                  <option value="" translate="no" className="notranslate">الكل</option>
                  {CONDITIONS.map(c => (
                    <option key={c.value} value={c.value} translate="no" className="notranslate">{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">حالة الاستلام (Delivery)</label>
                <select
                  value={selectedDelivery}
                  onChange={e => setSelectedDelivery(e.target.value)}
                  className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">الكل</option>
                  {DELIVERY_STATUSES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedCondition("");
                    setSelectedDelivery("");
                    setIsFilterSheetOpen(false);
                  }}
                  className="flex-1 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-gray-400 text-xs transition-colors"
                >
                  تصفير فوري
                </button>
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  تطبيق التصفية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD SALE BOTTOM SHEET DIALOG --- */}
      {isAddSaleOpen && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-[#111930] rounded-t-[32px] border-t border-white/10 p-5 text-right flex flex-col max-h-[85%] overflow-hidden" dir="rtl">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5 shrink-0">
              <span className="text-white font-bold text-xs flex items-center gap-1">
                <Plus className="w-4 h-4 text-blue-500" />
                تحضير وإضافة طلب يوكان جديد
              </span>
              <button onClick={() => setIsAddSaleOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">اسم العميل ورقم هاتفه</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="محمد المغربي"
                    value={newSaleForm["Full name"]}
                    onChange={e => setNewSaleForm({ ...newSaleForm, "Full name": e.target.value })}
                    className="bg-[#0d1426] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="0612345678"
                    maxLength={10}
                    value={newSaleForm.Phone}
                    onChange={e => setNewSaleForm({ ...newSaleForm, Phone: e.target.value })}
                    className="bg-[#0d1426] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs font-mono text-left"
                    dir="ltr"
                  />
                </div>
                {phoneError && <span className="text-red-400 block text-[9px] mt-1 pr-1">{phoneError}</span>}
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">المدينة والعنوان (Adresse)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newSaleForm.City}
                    required
                    onChange={e => setNewSaleForm({ ...newSaleForm, City: e.target.value })}
                    className="bg-[#0d1426] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="" disabled className="italic">اختر المدينة...</option>
                    {cityOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="العنوان بالتفصيل"
                    value={newSaleForm.Region}
                    onChange={e => setNewSaleForm({ ...newSaleForm, Region: e.target.value })}
                    className="bg-[#0d1426] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-gray-400 block">فهرست السلعة المتوفرة</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-0.5">اختر المنتج بالكود</span>
                    <select
                      value={newSaleForm["Product name"]}
                      required
                      onChange={e => handleProductSelect(e.target.value)}
                      className="w-full bg-[#0d1426] border border-white/10 text-white rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="" disabled className="italic">اختر المنتج...</option>
                      {productOptions.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[9px] text-gray-500 block mb-0.5">سعر البيع المقترح</span>
                    <input
                      type="number"
                      required
                      value={newSaleForm["Variant price"] === "" || newSaleForm["Variant price"] === undefined ? "" : newSaleForm["Variant price"]}
                      onChange={e => setNewSaleForm({ ...newSaleForm, "Variant price": e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#0d1426] border border-white/10 text-white rounded-lg px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">الحالة (Condition)</label>
                  <select
                    translate="no"
                    value={newSaleForm.Condition}
                    required
                    onChange={e => setNewSaleForm({ ...newSaleForm, Condition: e.target.value })}
                    className="notranslate w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="" disabled className="italic" translate="no">اختر الإجراء...</option>
                    {CONDITIONS.map(c => (
                      <option key={c.value} value={c.value} translate="no" className="notranslate">{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">حالة التوصيل</label>
                  <select
                    value={newSaleForm.delivery}
                    onChange={e => setNewSaleForm({ ...newSaleForm, delivery: e.target.value })}
                    className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="">بانتظار الشحن</option>
                    {DELIVERY_STATUSES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5 font-sans">الموزع (Livreur)</label>
                  <select
                    value={newSaleForm.Livreur}
                    required
                    onChange={e => setNewSaleForm({ ...newSaleForm, Livreur: e.target.value })}
                    className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="" disabled className="italic">اختر الموزع...</option>
                    {livreurOptions.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0"
              >
                تأكيد وتسجيل الطلبية بالصف
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- CELL PHONE ORDER DETAIL AUTO SAVE SHEET --- */}
      {selectedOrderDetail && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-[#111930] rounded-t-[32px] border-t border-white/10 p-5 text-right flex flex-col max-h-[85%] overflow-hidden" dir="rtl">
            <div className="flex justify-between items-center mb-3 shrink-0 pb-2 border-b border-white/5">
              <span className="text-white font-bold text-xs flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-400" />
                تحرير وتعديل معطيات الطلب المباشرة
              </span>
              <button onClick={() => setSelectedOrderDetail(null)} className="p-1 rounded-full bg-white/5 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 font-sans">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 font-mono space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">رقم البوابة (Order ID):</span>
                  <span className="text-white font-bold uppercase">{selectedOrderDetail["Order ID"]}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">اسم الزبون بالكامل:</span>
                  <span className="text-white font-sans">{selectedOrderDetail["Full name"]}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">الهاتف:</span>
                  <span className="text-white">{selectedOrderDetail.Phone}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">السلعة المستهدفة:</span>
                  <span className="text-blue-400 font-bold uppercase">{selectedOrderDetail["Product name"]}</span>
                </div>
              </div>

              {/* Instant Call actions */}
              <div className="flex gap-2 shrink-0 select-none">
                <a
                  href={`tel:${selectedOrderDetail.Phone}`}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  اتصال مباشر
                </a>
                <a
                  href={generateWhatsAppUrl(selectedOrderDetail.Phone || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  شات واتساب
                </a>
              </div>

              {/* Editable selects which auto-saves on-the-fly! (Section 7.4) */}
              <div className="p-3 bg-[#0d1426] rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-gray-400 block">منطقة التعديل الفوري الذكي (Auto-Save)</span>
                
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">الإجراء التشغيلي (Condition)</label>
                  <select
                    translate="no"
                    value={selectedOrderDetail.Condition || "Confirmed"}
                    onChange={e => handleDetailUpdate(selectedOrderDetail._rowNum || 2, "Condition", e.target.value, selectedOrderDetail)}
                    className={`notranslate w-full rounded-xl px-2.5 py-1.5 text-xs ${
                      ["Ne repond pas", "Anule", "Pas intéresse"].includes(selectedOrderDetail.Condition || "Confirmed")
                        ? "bg-red-600 text-white border-red-500 font-semibold"
                        : "bg-[#111930] border-white/5 text-white"
                    }`}
                  >
                    {CONDITIONS.map(c => (
                      <option 
                        key={c.value} 
                        value={c.value}
                        translate="no"
                        className={`notranslate bg-[#0f172a] ${
                          ["Ne repond pas", "Anule", "Pas intéresse"].includes(c.value)
                            ? "text-red-500 font-semibold"
                            : "text-white"
                        }`}
                      >
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">الموزع المكلف (Livreur)</label>
                  <select
                    value={selectedOrderDetail.Livreur || "CATHEDIS Express"}
                    onChange={e => handleDetailUpdate(selectedOrderDetail._rowNum || 2, "Livreur", e.target.value, selectedOrderDetail)}
                    className="w-full bg-[#111930] border border-white/5 text-white rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    {LIVREURS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">حالة التسليم والارتجاع (Delivery)</label>
                  <select
                    value={selectedOrderDetail.delivery || ""}
                    onChange={e => handleDetailUpdate(selectedOrderDetail._rowNum || 2, "delivery", e.target.value, selectedOrderDetail)}
                    className="w-full bg-[#111930] border border-white/5 text-white rounded-xl px-2.5 py-1.5 text-xs text-blue-400"
                  >
                    <option value="">بانتظار الشحن والتوصيل</option>
                    {DELIVERY_STATUSES.map(d => (
                      <option key={d.value} value={d.value} className="text-white">{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-emerald-500/10 text-emerald-400 text-[10px] p-2 rounded-lg text-center font-bold">
                  ✓ يتم تحديث قاعدة البيانات فوراً وتحديث KPIs تلقائياً
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
