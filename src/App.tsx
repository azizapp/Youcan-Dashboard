import React, { useState, useEffect } from "react";
import { Order, Purchase, Payment, Expense, AppData } from "./types";
import { 
  fetchSheetData, 
  saveGenericRow, 
  updateOrderRow, 
  deleteGenericRow,
  formatCurrency, 
  validatePhone, 
  generateWhatsAppUrl,
  MOROCCAN_CITIES,
  CONDITIONS,
  LIVREURS,
  DELIVERY_STATUSES
} from "./data";
import { SalesTab } from "./components/SalesTab";
import { PurchasesTab } from "./components/PurchasesTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { ExpensesTab } from "./components/ExpensesTab";
import { ReportsTab } from "./components/ReportsTab";
import { SettingsTab } from "./components/SettingsTab";
import { SuppliersTab } from "./components/SuppliersTab";
import { MobileView } from "./components/MobileView";
import { SaleAddModal, PurchaseAddModal, GenericModal } from "./components/Modals";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { LoginPage } from "./components/LoginPage";
import { matchesRobustSearch } from "./lib/searchUtils";

import { 
  ChevronLeft,
  ChevronRight,
  LayoutGrid, 
  ShoppingBag, 
  CreditCard, 
  Receipt, 
  BarChart3, 
  Settings as SettingsIcon, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  Plus, 
  Calendar, 
  Check, 
  Info, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  RefreshCw,
  Truck,
  ClipboardCheck,
  FileQuestion,
  LogOut,
  Users
} from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("is_app_authenticated") === "true";
  });

  // Device View Simulator mode: "desktop" or "mobile"
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  
  // Active page selector for DESKTOP mode
  const [activeTab, setActiveTab] = useState<"sales" | "purchases" | "payments" | "expenses" | "reports" | "settings" | "suppliers">("sales");

  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Quick preset filter for SalesTab
  const [salesPreset, setSalesPreset] = useState<"all" | "delivery_requests" | "delivery_status" | "no_status">("all");

  // Database State
  const [data, setData] = useState<AppData>({
    sales: [],
    purchases: [],
    payments: [],
    expenses: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Background sync tracking state
  const [backgroundSync, setBackgroundSync] = useState<{
    status: "idle" | "syncing" | "error" | "pending";
    lastSyncTime: string;
    lastError: string | null;
    queueSize: number;
  }>({
    status: "idle",
    lastSyncTime: "",
    lastError: null,
    queueSize: 0
  });

  // Modal control states
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Edit / Details targeting states
  const [editingSale, setEditingSale] = useState<Order | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: () => {}
  });

  // Trigger Toast Notification Alert
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load data only from local database.json (instant load)
  const loadLocalDatabaseOnly = async () => {
    try {
      const [salesRes, purchasesRes, paymentsRes, expensesRes] = await Promise.all([
        fetchSheetData("Youcan-Orders"),
        fetchSheetData("Achat"),
        fetchSheetData("Payments"),
        fetchSheetData("Expenses")
      ]);

      if (salesRes.success && purchasesRes.success && paymentsRes.success && expensesRes.success) {
        const cleanedSales = (salesRes.rows || []).map((sale: any) => {
          const rawL = sale.Livreur || "";
          const containsCathedis = rawL.toString().toUpperCase().includes("CATHEDIS");
          return {
            ...sale,
            Livreur: containsCathedis ? "CATHEDIS" : ""
          };
        });

        setData({
          sales: cleanedSales,
          purchases: purchasesRes.rows || [],
          payments: paymentsRes.rows || [],
          expenses: expensesRes.rows || []
        });
        return true;
      }
    } catch (e) {
      console.error("Failed loading local database copy:", e);
    }
    return false;
  };

  // Trigger non-blocking pull of live data in background
  const triggerRemotePull = async () => {
    try {
      const token = sessionStorage.getItem("google_sheets_oauth_token");
      const pullHeaders: Record<string, string> = {};
      if (token) {
        pullHeaders["Authorization"] = `Bearer ${token}`;
      }
      await fetch("/api/google-sheets/sync-pull", {
        method: "POST",
        headers: pullHeaders
      });
    } catch (e) {
      console.warn("Background pull request failed", e);
    }
  };

  const syncDatabase = async () => {
    setIsLoading(true);
    try {
      await loadLocalDatabaseOnly();
      await triggerRemotePull();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Initial Load of Local Data
  useEffect(() => {
    setIsLoading(true);
    loadLocalDatabaseOnly().finally(() => {
      setIsLoading(false);
      triggerRemotePull();
    });
  }, []);

  // 2. Poll background sync status periodically to catch completed tasks
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await fetch("/api/background-sync/status");
        const sData = await res.json();
        if (sData.success) {
          setBackgroundSync(prev => {
            const wasSyncing = prev.status === "syncing" || prev.status === "pending";
            const isNowIdle = sData.status === "idle";
            
            // If we just finished a background sync, reload database content smoothly!
            if (wasSyncing && isNowIdle) {
              loadLocalDatabaseOnly().catch(() => {});
              // Only show toast if user hasn't interacted recently (avoid disruption)
            }
            
            return {
              status: sData.status,
              lastSyncTime: sData.lastSyncTime,
              lastError: sData.lastError,
              queueSize: sData.queueSize
            };
          });
        }
      } catch (e) {
        console.warn("Error polling background sync:", e);
      }
    };

    pollStatus();
    // Poll every 30 seconds instead of 4 to avoid UI disruption
    const interval = setInterval(pollStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Dynamics dropdown choices compiled from actual sheet data columns (with defaults)
  const cityOptions = React.useMemo(() => {
    const list = Array.from(new Set(data.sales.map(s => s.City).filter(Boolean))) as string[];
    return list.length > 0 ? list : MOROCCAN_CITIES;
  }, [data.sales]);

  const livreurOptions = React.useMemo(() => {
    return LIVREURS;
  }, []);

  const productOptions = React.useMemo(() => {
    const list = Array.from(new Set([
      ...data.purchases.map(p => p.Code),
      ...data.sales.map(s => s["Product name"])
    ].filter(Boolean))) as string[];
    return list;
  }, [data.purchases, data.sales]);

  const supplierOptions = React.useMemo(() => {
    const list = Array.from(new Set([
      ...data.purchases.map(p => p.Fournisseur),
      ...data.payments.map(p => p.Fournisseur)
    ].filter(Boolean))) as string[];
    return list;
  }, [data.purchases, data.payments]);

  const productNamesOptions = React.useMemo(() => {
    const list = Array.from(new Set(data.purchases.map(p => p.Produit).filter(Boolean))) as string[];
    return list;
  }, [data.purchases]);

  const expenseTapersOptions = React.useMemo(() => {
    const list = Array.from(new Set(data.expenses.map(e => e.Taper).filter(Boolean))) as string[];
    return list.length > 0 ? list : ["Publicité Instagram", "Publicité Facebook", "Frais de livraison", "Frais généraux"];
  }, [data.expenses]);

  // CRUD Handler - Add/Edit Sale
  const handleSaveSale = async (values: any) => {
    await executeSaveSale(values);
  };

  const executeSaveSale = async (values: any) => {
    try {
      const isEdit = !!editingSale;
      const rowNum = editingSale ? editingSale._rowNum : undefined;
      
      const res = await saveGenericRow("Youcan-Orders", rowNum, values);
      if (res.success) {
        showToast(isEdit ? "تم تحديث بيانات الطلب بنجاح" : "تم حفظ الطلب الجديد في ملف المبيعات", "success");
        setEditingSale(null);
        setIsAddSaleOpen(false);
        await syncDatabase();
      } else {
        showToast(res.error || "فشل حفظ بيانات الطلبية", "error");
      }
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // CRUD Handler - Add/Edit Purchase
  const handleSavePurchase = async (values: any) => {
    try {
      const isEdit = !!editingPurchase;
      const rowNum = editingPurchase ? editingPurchase._rowNum : undefined;
      
      // Compute automatic code-based fields for ID ACH-XXXX
      const codeId = isEdit && editingPurchase ? editingPurchase.ID : `ACH-${String(data.purchases.length + 1001).padStart(4, "0")}`;
      const payload = {
        ...values,
        ID: codeId
      };

      const res = await saveGenericRow("Achat", rowNum, payload);
      if (res.success) {
        showToast(isEdit ? "تم تحديث بيانات شحنة الشراء" : "تم استيراد شحنة الشراء الجديدة وتسجيلها", "success");
        setEditingPurchase(null);
        setIsAddPurchaseOpen(false);
        await syncDatabase();
      } else {
        showToast(res.error || "فشل حفظ البيانات", "error");
      }
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // CRUD Handler - Add/Edit Payment
  const handleSavePayment = async (values: any) => {
    try {
      const isEdit = !!editingPayment;
      const rowNum = editingPayment ? editingPayment._rowNum : undefined;
      const payId = isEdit && editingPayment ? editingPayment.ID : `PAY-${String(data.payments.length + 1001).padStart(4, "0")}`;

      const payload = { ...values, ID: payId };

      const res = await saveGenericRow("Payments", rowNum, payload);
      if (res.success) {
        showToast("تم تحديث سجل الدفعات لمصلحة المورد بنجاح", "success");
        setEditingPayment(null);
        setIsAddPaymentOpen(false);
        await syncDatabase();
      } else {
        showToast(res.error || "فشل رصد وتخزين مستند السداد", "error");
      }
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // CRUD Handler - Add/Edit Expense
  const handleSaveExpense = async (values: any) => {
    await executeSaveExpense(values);
  };

  const executeSaveExpense = async (values: any) => {
    try {
      const isEdit = !!editingExpense;
      const rowNum = editingExpense ? editingExpense._rowNum : undefined;
      const expId = editingExpense ? editingExpense.ID : `EXP-${String(data.expenses.length + 1001).padStart(4, "0")}`;

      const payload = { ...values, ID: expId };

      const res = await saveGenericRow("Expenses", rowNum, payload);
      if (res.success) {
        showToast("تم تسجيل وتعديل بنود المصاريف بنجاح", "success");
        setEditingExpense(null);
        setIsAddExpenseOpen(false);
        await syncDatabase();
      } else {
        showToast(res.error || "فشل حفظ بند المصروف بالملف", "error");
      }
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  const triggerDeleteConfirm = (sheetName: string, rowNum: number, itemLabel: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "تأكيد حذف العنصر نهائياً ⚠️",
      message: `تنبيه فحص نزاهة المدخلات: أنت على وشك حذف العنصر "${itemLabel}" نهائياً من قاعدة البيانات وجدول ملف الزبيناء والشركاء سحابياً! هذا الإجراء خطير جداً وغير قابل للتراجع. هل تود الاستمرار بالحذف؟`,
      type: "danger",
      onConfirm: async () => {
        setConfirmDialog(p => ({ ...p, isOpen: false }));
        try {
          setIsLoading(true);
          const res = await deleteGenericRow(sheetName, rowNum);
          if (res.success) {
            showToast("تم حذف العنصر بنجاح من الملف السحابي وحساب الفروقات الكلية", "success");
            setEditingSale(null);
            setEditingExpense(null);
            await syncDatabase();
          } else {
            showToast(res.error || "فشل حذف العنصر", "error");
          }
        } catch (err: any) {
          showToast(err.toString(), "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Direct Inline Updates (for immediate status modifications without modal popup)
  const handleInlineStatusUpdate = async (rowNum: number, updates: any) => {
    try {
      const res = await updateOrderRow("Youcan-Orders", rowNum, updates);
      if (res.success) {
        // Optimistic local state update to preserve page positioning and table states
        setData(prev => {
          const freshSales = prev.sales.map(s => {
            if (s._rowNum === rowNum) {
              return { ...s, ...updates };
            }
            return s;
          });
          return { ...prev, sales: freshSales };
        });
        showToast("تم تحديث حالة الشحنة تلقائياً وحساب الفروقات المالية والمصاريف بسلاسة", "success");
      } else {
        showToast(res.error || "فشل لتحديث الحالات", "error");
      }
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  // Lifted Filter States for custom filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedLivreur, setSelectedLivreur] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("month");

  // Custom filter check for date ranges
  const isDateInSelectedRange = (dateStr: string, range: string): boolean => {
    if (!dateStr) return false;
    const now = new Date();
    const cleanDateStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.split(" ")[0]; // yyyy-mm-dd
    const orderDate = new Date(cleanDateStr);
    
    // Set time limits to start of days
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const oneWeekAgo = new Date(todayStart);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (range) {
      case "today":
        return orderDate >= todayStart;
      case "yesterday":
        return orderDate >= yesterdayStart && orderDate < todayStart;
      case "week":
        return orderDate >= oneWeekAgo;
      case "month":
        return orderDate >= startOfMonth;
      case "year":
        return orderDate >= startOfYear;
      case "all":
      default:
        return true;
    }
  };

  const filteredSales = React.useMemo(() => {
    return data.sales.filter(sale => {
      // Sidebar Preset Filter
      if (salesPreset === "delivery_requests") {
        const isLivreurEmpty = !sale.Livreur || sale.Livreur.trim() === "";
        const isDeliveryEmpty = !sale.delivery || sale.delivery.trim() === "";
        if (sale.Condition !== "Confirmed" || !isLivreurEmpty || !isDeliveryEmpty) {
          return false;
        }
      } else if (salesPreset === "delivery_status") {
        const isLivreurFilled = !!sale.Livreur && sale.Livreur.trim() !== "";
        const isDeliveryEmpty = !sale.delivery || sale.delivery.trim() === "";
        if (sale.Condition !== "Confirmed" || !isLivreurFilled || !isDeliveryEmpty) {
          return false;
        }
      } else if (salesPreset === "no_status") {
        const isConditionEmpty = !sale.Condition || sale.Condition.trim() === "";
        const isLivreurEmpty = !sale.Livreur || sale.Livreur.trim() === "";
        const isDeliveryEmpty = !sale.delivery || sale.delivery.trim() === "";
        if (!isConditionEmpty || !isLivreurEmpty || !isDeliveryEmpty) {
          return false;
        }
      }

      // Search Query (id, name, phone)
      const matchesSearch = matchesRobustSearch(sale, searchQuery);

      const matchesCondition = !selectedCondition ? true : sale.Condition === selectedCondition;
      const matchesCity = !selectedCity ? true : sale.City === selectedCity;
      const matchesLivreur = !selectedLivreur ? true : sale.Livreur === selectedLivreur;
      const matchesDate = isDateInSelectedRange(sale["Order date"], selectedDateRange);

      return matchesSearch && matchesCondition && matchesCity && matchesLivreur && matchesDate;
    });
  }, [data.sales, salesPreset, searchQuery, selectedCondition, selectedCity, selectedLivreur, selectedDateRange]);

  // 1. Calculate General High Performance Metrics for Desktop HUD Dashboard based on filteredSales
  const statsOverview = React.useMemo(() => {
    const totalSales = filteredSales.length;
    
    // Delivered metrics count and sum
    const deliveredSalesList = filteredSales.filter(s => s.delivery === "Delivered");
    const deliveredCount = deliveredSalesList.length;

    // Delivery rate success percentage
    const deliveryRateExact = totalSales > 0 ? (deliveredCount / totalSales) * 100 : 0;

    // Delivered Revenue Sum
    const totalRevenueSum = deliveredSalesList.reduce((acc, s) => acc + (s["Total price"] || 0), 0);

    // Delivered profit / benefit (Bénéfice)
    const netProfitSum = deliveredSalesList.reduce((acc, s) => acc + (s["Bénéfice"] || 0), 0);
    
    // Total expenses sum ('Prix' column)
    const totalExpenses = data.expenses.reduce((acc, e) => acc + (e.Prix || 0), 0);

    // Dynamic Net profit = Benefit - Expenses (Section 4.2)
    const trueNetProjectProfit = netProfitSum - totalExpenses;

    const tourDeliveryInRoute = filteredSales.filter(s => s.Condition === "Confirmed" && !s.delivery).length;

    // Average Order Value (AOV) based on delivered orders
    const averageOrderValue = deliveredCount > 0 ? totalRevenueSum / deliveredCount : 0;

    return {
      totalSales,
      deliveredCount,
      deliveryRateExact,
      totalRevenueSum,
      trueNetProjectProfit,
      tourDeliveryInRoute,
      averageOrderValue
    };
  }, [filteredSales, data.expenses]);

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={() => {
          localStorage.setItem("is_app_authenticated", "true");
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  return (
    <div className="bg-[#070a13] text-[#f3f4f6] min-h-screen flex flex-col font-sans select-none overflow-x-hidden antialiased pb-12" dir="rtl">
      
      {/* 1. TOP SIMULATOR VIEW SWITCHER HUD (Fidelity constraint) */}
      <div className="bg-[#0a1020]/90 border-b border-white/5 px-6 py-2 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
          <span className="font-mono text-xs text-gray-400 font-bold tracking-wider">YouCan Live Control HUD Panel</span>
        </div>

        {/* Action Toggle controls */}
        <div className="flex gap-1.5 p-1 bg-[#111930] rounded-xl border border-white/5">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              deviceMode === "desktop"
                ? "bg-blue-600 text-white font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>لوحة الحاسوب (Desktop App)</span>
          </button>

          <button
            onClick={() => setDeviceMode("mobile")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              deviceMode === "mobile"
                ? "bg-blue-600 text-white font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>لوحة الهاتف 📱 (Mobile UI)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Background Sync Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] font-sans">
            {backgroundSync.status === "syncing" && (
              <span className="flex items-center gap-1.5 text-yellow-400">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span className="font-semibold text-gray-300">جاري المزامنة في الخلفية...</span>
              </span>
            )}
            {backgroundSync.status === "pending" && (
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="font-semibold text-gray-300">مجدول للمزامنة...</span>
              </span>
            )}
            {backgroundSync.status === "error" && (
              <span className="flex items-center gap-1.5 text-rose-400" title={backgroundSync.lastError || ""}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="font-semibold text-rose-300 flex items-center gap-1">
                  <span>فشل المزامنة</span>
                  <span className="text-[9px] bg-rose-500/10 px-1 rounded text-rose-400 hover:bg-rose-500/20 cursor-help" title={backgroundSync.lastError || ""}>التفاصيل</span>
                </span>
              </span>
            )}
            {backgroundSync.status === "idle" && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span className="font-medium text-gray-400">مزامنة السحابة مفعلة تلقائياً</span>
              </span>
            )}
          </div>

          <button 
            onClick={syncDatabase} 
            disabled={isLoading}
            className="p-1 px-3 bg-white/5 rounded-lg text-[11px] hover:bg-white/10 text-gray-300 font-semibold flex items-center gap-1 border border-white/5 transition-colors font-sans cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>مزامنة فوري</span>
          </button>

          <button 
            onClick={() => {
              localStorage.removeItem("is_app_authenticated");
              setIsAuthenticated(false);
            }}
            className="p-1 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-rose-500/20 transition-colors font-sans cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* 2. DEVICE CHANNELLING VIEW */}
      {deviceMode === "mobile" ? (
        /* Render high fidelity responsive mobile view controller simulator */
        <div className="flex-1 flex justify-center items-center py-6">
          <MobileView 
            sales={data.sales}
            purchases={data.purchases}
            payments={data.payments}
            expenses={data.expenses}
            onAddSale={(newSale) => {
              // Trigger proxy add sales
              handleSaveSale(newSale);
            }}
            onUpdateOrder={(rowNum, updates) => {
              handleInlineStatusUpdate(rowNum, updates);
            }}
            onAddExpense={(newExp) => {
              handleSaveExpense(newExp);
            }}
          />
        </div>
      ) : (
        /* Render main desktop layout with left/right reverse-rtl bar */
        <div className="flex-1 flex flex-row h-[100%] overflow-hidden">
          
          {/* A. SIDEBAR COMPONENT (Section 5.3) */}
          <aside className={`${isSidebarCollapsed ? "w-20" : "w-64"} bg-[#0a1020]/80 border-l border-white/5 flex flex-col justify-between shrink-0 select-none transition-all duration-300 ease-in-out`}>
            
            {/* Top portion */}
            <div>
              <div className={`p-4 flex ${isSidebarCollapsed ? "flex-col gap-4 items-center" : "items-center justify-between"} border-b border-indigo-500/5 transition-all duration-300`}>
                <div className={`flex items-center gap-3 ${isSidebarCollapsed ? "flex-col justify-center" : ""}`}>
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30 shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="transition-opacity duration-300">
                      <h2 className="font-extrabold text-white text-sm font-sans tracking-wide truncate">يوكان داصبورد</h2>
                      <span className="text-[9px] text-gray-500 block font-bold font-mono tracking-tight truncate">Sales Control Hub</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center justify-center shrink-0"
                  title={isSidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
                >
                  {isSidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Navigation Options */}
              <nav className={`p-4 space-y-2 ${isSidebarCollapsed ? "px-2 text-center" : "text-border"}`} dir="rtl">
                <button
                  onClick={() => {
                    setActiveTab("sales");
                    setSalesPreset("all");
                  }}
                  title="جميع الطلبيات (المبيعات)"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "sales" && salesPreset === "all"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <LayoutGrid className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">جميع الطلبيات (المبيعات)</span>}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("sales");
                    setSalesPreset("delivery_requests");
                  }}
                  title="طلبات التوصيل"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "sales" && salesPreset === "delivery_requests"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <Truck className="w-5 h-5 shrink-0 text-amber-400" />
                  {!isSidebarCollapsed && <span className="truncate">طلبات التوصيل</span>}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("sales");
                    setSalesPreset("delivery_status");
                  }}
                  title="حالة التسليم"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "sales" && salesPreset === "delivery_status"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <ClipboardCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                  {!isSidebarCollapsed && <span className="truncate">حالة التسليم</span>}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("sales");
                    setSalesPreset("no_status");
                  }}
                  title="بدون حالة"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "sales" && salesPreset === "no_status"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <FileQuestion className="w-5 h-5 shrink-0 text-rose-400" />
                  {!isSidebarCollapsed && <span className="truncate">بدون حالة</span>}
                </button>

                <button
                  onClick={() => setActiveTab("purchases")}
                  title="المشتريات وإدارة السلع (Achat)"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "purchases"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">المشتريات وإدارة السلع (Achat)</span>}
                </button>

                <button
                  onClick={() => setActiveTab("payments")}
                  title="الدفعات وتصفية الموردين"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "payments"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <CreditCard className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">الدفعات وتصفية الموردين</span>}
                </button>

                <button
                  onClick={() => setActiveTab("suppliers")}
                  title="حسابات الموردين التفصيلية"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "suppliers"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <Users className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">حسابات الموردين التفصيلية</span>}
                </button>

                <button
                  onClick={() => setActiveTab("expenses")}
                  title="المصاريف والربحية (Expenses)"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "expenses"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <Receipt className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">المصاريف والربحية (Expenses)</span>}
                </button>

                <button
                  onClick={() => setActiveTab("reports")}
                  title="التقارير التفصيلية المتقدمة"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "reports"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <BarChart3 className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">التقارير التفصيلية المتقدمة</span>}
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  title="إعدادات النظام والتهيئة"
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"} p-3 text-xs font-bold font-sans rounded-xl border transition-all ${
                    activeTab === "settings"
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/15"
                      : "text-gray-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  <SettingsIcon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">إعدادات النظام والتهيئة</span>}
                </button>
              </nav>
            </div>

            {/* Bottom active connection check (Section 5.3) */}
            <div className={`p-4 border-t border-white/5 bg-[#070a13]/10 flex ${isSidebarCollapsed ? "justify-center" : "items-center gap-3"}`}>
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-glow shadow-green-500 shrink-0"></div>
              {!isSidebarCollapsed && (
                <span className="text-xs text-slate-400 font-mono font-medium truncate select-none">v2.1.1 — Connected</span>
              )}
            </div>
          </aside>

          {/* B. MAIN INTERACTIVE CONTENT AREA */}
          <main className="flex-1 flex flex-col px-8 py-6 select-none max-w-full overflow-hidden">
            
            {/* Header Title dashboard */}
            <div className="flex items-center justify-between mb-8 select-none">
              <div>
                <span className="text-xs text-gray-500 block font-semibold mb-0.5 uppercase">لوحة البيانات الكلية</span>
                <h1 className="text-2xl font-black text-white font-sans flex items-center gap-2">
                  {activeTab === "sales" && "رصد وتعديل المبيعات اليومية"}
                  {activeTab === "purchases" && "السلع المستوردة وحسابات الموردين"}
                  {activeTab === "payments" && "سجل الدفعات المستحقة والمصروفة"}
                  {activeTab === "expenses" && "إدارة أعباء المشروع والمصاريف"}
                  {activeTab === "reports" && "التقارير التحليلية والمؤشرات"}
                  {activeTab === "settings" && "تكامل خلايا العمل والربط"}
                </h1>
              </div>

              {/* High level visual date indicator */}
              <div className="flex gap-4 items-center">
                <div className="bg-white/5 border border-white/5 p-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-gray-300">2026-05-31</span>
                </div>
              </div>
            </div>

            {/* C. 5 KPI STATS GRID VIEW */}
            {activeTab === "sales" && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8" id="sales-kpi-row">
                {/* HUD Card 1: Total volume transactions */}
                <div className="bg-[#111930]/60 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
                  <div className="text-gray-400 text-xs font-semibold mb-1">إجمالي المبيعات بالملف</div>
                  <div className="text-2xl font-black font-mono tracking-tight text-white">{statsOverview.totalSales} طلبات</div>
                  <div className="mt-2 text-[10px] text-gray-500">شامل المعلقة والملغاة والمرتقب شحنها</div>
                </div>

                {/* HUD Card 2: Absolute net Profit calculation strictly according to Section 4.2 */}
                <div className="bg-[#111930]/60 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
                  <div className="text-gray-400 text-xs font-semibold mb-1">صافي الأرباح العـام</div>
                  <div className={`text-2xl font-black font-mono tracking-tight ${statsOverview.trueNetProjectProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(statsOverview.trueNetProjectProfit)}
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500">مخصوم منها المصاريف المسجلة</div>
                </div>

                {/* HUD Card 3: Delivered orders volume */}
                <div className="bg-[#111930]/60 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                  <div className="text-gray-400 text-xs font-semibold mb-1">طلبات قيد التوصيل والمشحونة</div>
                  <div className="text-2xl font-black font-mono tracking-tight text-amber-400">{statsOverview.tourDeliveryInRoute} طلبات</div>
                  <div className="mt-2 text-[10px] text-amber-500 font-bold">بانتظار معاودة الاتصال والشحن</div>
                </div>

                {/* HUD Card 4: Success percentage with visual progress strip */}
                <div className="bg-[#111930]/60 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
                  <div className="text-gray-400 text-xs font-semibold mb-1">نسبة التوصيل والاستلام الناجحة</div>
                  <div className="text-2xl font-black font-mono tracking-tight text-white">{statsOverview.deliveryRateExact.toFixed(1)}%</div>
                  
                  {/* Progress bar strip */}
                  <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${statsOverview.deliveryRateExact}%` }}></div>
                  </div>
                </div>

                {/* HUD Card 5: Average Order Value (AOV) strictly based on Delivered orders */}
                <div className="bg-[#111930]/60 border border-white/5 p-5 rounded-2xl relative overflow-hidden glass-effect">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
                  <div className="text-gray-400 text-xs font-semibold mb-1">متوسط قيمة الطلب (AOV)</div>
                  <div className="text-2xl font-black font-mono tracking-tight text-rose-400">
                    {formatCurrency(statsOverview.averageOrderValue)}
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500">بناءً على الطلبات المكتملة (Delivered)</div>
                </div>
              </div>
            )}

            {/* D. DYNAMIC TABS ROUTER ELEMENT */}
            <div className="flex-1 overflow-hidden min-h-[500px]">
              
              {activeTab === "sales" && (
                <SalesTab 
                  sales={data.sales}
                  purchases={data.purchases}
                  onAddSale={() => setIsAddSaleOpen(true)}
                  onEditSale={(sale) => setEditingSale(sale)}
                  onUpdateOrder={handleInlineStatusUpdate}
                  salesPreset={salesPreset}
                  setSalesPreset={setSalesPreset}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedCondition={selectedCondition}
                  setSelectedCondition={setSelectedCondition}
                  selectedCity={selectedCity}
                  setSelectedCity={setSelectedCity}
                  selectedLivreur={selectedLivreur}
                  setSelectedLivreur={setSelectedLivreur}
                  selectedDateRange={selectedDateRange}
                  setSelectedDateRange={setSelectedDateRange}
                  filteredSales={filteredSales}
                />
              )}

              {activeTab === "purchases" && (
                <PurchasesTab 
                  purchases={data.purchases}
                  sales={data.sales}
                  payments={data.payments}
                  onAddPurchase={() => setIsAddPurchaseOpen(true)}
                  onEditPurchase={(pur) => setEditingPurchase(pur)}
                />
              )}

              {activeTab === "payments" && (
                <PaymentsTab 
                  payments={data.payments}
                  purchases={data.purchases}
                  onAddPayment={() => setIsAddPaymentOpen(true)}
                  onEditPayment={(pay) => setEditingPayment(pay)}
                />
              )}

              {activeTab === "suppliers" && (
                <SuppliersTab 
                  sales={data.sales}
                  purchases={data.purchases}
                  payments={data.payments}
                  onAddPayment={() => setIsAddPaymentOpen(true)}
                  onRefresh={syncDatabase}
                />
              )}

              {activeTab === "expenses" && (
                <ExpensesTab 
                  expenses={data.expenses}
                  sales={data.sales}
                  onAddExpense={() => setIsAddExpenseOpen(true)}
                  onEditExpense={(exp) => setEditingExpense(exp)}
                />
              )}

              {activeTab === "reports" && (
                <ReportsTab 
                  sales={data.sales}
                  purchases={data.purchases}
                  expenses={data.expenses}
                />
              )}

              {activeTab === "settings" && (
                <SettingsTab 
                  onSync={syncDatabase}
                  isLoading={isLoading}
                />
              )}

            </div>

          </main>
        </div>
      )}

      {/* --- FLOATING TOAST POPUPS NOTIFICATION DISPATCHER --- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md toast-slide-in text-xs font-semibold font-sans min-w-[280px]" style={{
          backgroundColor: toastMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : toastMessage.type === "error" ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)",
          borderColor: toastMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : toastMessage.type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)",
          color: toastMessage.type === "success" ? "#10b981" : toastMessage.type === "error" ? "#f87171" : "#60a5fa"
        }}>
          <div className="w-2 h-2 rounded-full block" style={{
            backgroundColor: toastMessage.type === "success" ? "#10b981" : toastMessage.type === "error" ? "#ef4444" : "#3b82f6"
          }}></div>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* --- ADD NEW SALE ROW DIALOG --- */}
      {isAddSaleOpen && (
        <SaleAddModal 
          onClose={() => setIsAddSaleOpen(false)}
          onSave={handleSaveSale}
          purchases={data.purchases}
          nextOrderId={`WSP-${String(data.sales.length + 1001).padStart(4, "0")}`}
          cityOptions={cityOptions}
          livreurOptions={livreurOptions}
          productOptions={productOptions}
        />
      )}

      {/* --- EDIT EXISTING SALE ROW DIALOG (Section 5.6) --- */}
      {editingSale && (
        <GenericModal 
          title="تحديث وتعديل تفاصيل الطلب"
          onClose={() => setEditingSale(null)}
          onSave={handleSaveSale}
          initialValues={editingSale}
          deleteBtn={{
            label: "حذف هذا الطلب نهائياً",
            onDelete: () => {
              triggerDeleteConfirm("Youcan-Orders", editingSale._rowNum!, editingSale["Order ID"] || "غير معروف");
            }
          }}
          fields={[
            { key: "Order ID", label: "رقم الطلب (معرف الطلب)", type: "text", disabled: true },
            { key: "Order date", label: "تاريخ الطلب", type: "date", required: true },
            { key: "Full name", label: "اسم العميل بالكامل", type: "text", required: true },
            { key: "Phone", label: "رقم الهاتف", type: "text", required: true },
            { key: "City", label: "المدينة", type: "select", options: cityOptions, required: true },
            { key: "Region", label: "العنوان", type: "text" },
            { key: "Product name", label: "كود المنتج (Code)", type: "select", options: productOptions, required: true },
            { key: "Product URL", label: "رابط صفحة السلعة بالمتجر (Product URL)", type: "url" },
            { key: "Variant price", label: "سعر البيع المعتمد بالدرهم", type: "number", required: true },
            { key: "Total quantity", label: "الكمية المطلوبة (Quantity)", type: "number", required: true },
            { key: "Condition", label: "إجراء التثبيت (Condition)", type: "select", options: CONDITIONS.map(c => c.value), required: true },
            { key: "Livreur", label: "موزع الشحن المكلف", type: "select", options: livreurOptions, required: true },
            { key: "delivery", label: "حالة الاستلام (Delivery Case-Sensitive)", type: "select", options: DELIVERY_STATUSES.map(d => d.value) }
          ]}
        />
      )}

      {/* --- ADD NEW PURCHASE WINDOW --- */}
      {isAddPurchaseOpen && (
        <PurchaseAddModal 
          onClose={() => setIsAddPurchaseOpen(false)}
          onSave={handleSavePurchase}
          purchases={data.purchases}
          supplierOptions={supplierOptions}
          productNamesOptions={productNamesOptions}
        />
      )}

      {/* --- EDIT EXISTING PURCHASE WINDOW --- */}
      {editingPurchase && (
        <GenericModal 
          title="تعديل شحنة الشراء في المستودع"
          onClose={() => setEditingPurchase(null)}
          onSave={handleSavePurchase}
          initialValues={editingPurchase}
          fields={[
            { key: "ID", label: "رمز الشحنة (تلقائي لا يعدل)", type: "text", disabled: true },
            { key: "date", label: "تاريخ الشراء والاستلام في المستودع", type: "date", required: true },
            { key: "Produit", label: "اسم المنتج", type: "select", options: productNamesOptions, required: true },
            { key: "Code", label: "كود رمز المنتج الموحد (Code)", type: "text", required: true },
            { key: "nombre", label: "كمية القطع الموردة (Nombre)", type: "number", required: true },
            { key: "Prix Unit", label: "سعر شراء القطعة من الموزع الأساسي", type: "number", required: true },
            { key: "Prix de vente", label: "سعر بيع القطعة المفترض للعميل", type: "number", required: true },
            { key: "Fournisseur", label: "اسم المورد المسؤول", type: "select", options: supplierOptions, required: true }
          ]}
        />
      )}

      {/* --- REGISTER NEW SUPPLIER PAYMENT DISBURSED --- */}
      {isAddPaymentOpen && (
        <GenericModal 
          title="تسجيل حوالة دفع جديدة لمورد"
          onClose={() => setIsAddPaymentOpen(false)}
          onSave={handleSavePayment}
          fields={[
            { key: "date", label: "تاريخ السداد", type: "date", required: true },
            { key: "Fournisseur", label: "اسم المورّد المستلم", type: "select", options: supplierOptions, required: true },
            { key: "Payment", label: "قيمة الحوالة المدفوعة بالدرهم (Payment)", type: "number", required: true }
          ]}
        />
      )}

      {/* --- EDIT REGISTERED SUPPLIER PAYMENT DISBURSED --- */}
      {editingPayment && (
        <GenericModal 
          title="تحديث مستند الحوالة المالية"
          onClose={() => setEditingPayment(null)}
          onSave={handleSavePayment}
          initialValues={editingPayment}
          fields={[
            { key: "ID", label: "رقم الحوالة الورقية (مؤشر ID)", type: "text", disabled: true },
            { key: "date", label: "تاريخ الدفع الفعلي", type: "date", required: true },
            { key: "Fournisseur", label: "المورد المستحق", type: "select", options: supplierOptions, required: true },
            { key: "Payment", label: "القيمة المدفوعة (Payment)", type: "number", required: true }
          ]}
        />
      )}

      {/* --- ADD NEW EXPENSE WINDOW --- */}
      {isAddExpenseOpen && (
        <GenericModal 
          title="تسجيل وإدخل بند مصاريف"
          onClose={() => setIsAddExpenseOpen(false)}
          onSave={handleSaveExpense}
          fields={[
            { key: "date", label: "تاريخ حدوث التكاليف", type: "date", required: true },
            { key: "Prix", label: "القيمة الإجمالية المنفقة بالدرهم (Prix)", type: "number", required: true },
            { key: "Taper", label: "اسم النوع / نوع المصروف ومكانه", type: "select", options: expenseTapersOptions, required: true }
          ]}
        />
      )}

      {/* --- EDIT REGISTERED EXPENSE --- */}
      {editingExpense && (
        <GenericModal 
          title="تحديث مستند المصروفات"
          onClose={() => setEditingExpense(null)}
          onSave={handleSaveExpense}
          initialValues={editingExpense}
          deleteBtn={{
            label: "حذف هذا المصروف نهائياً",
            onDelete: () => {
              triggerDeleteConfirm("Expenses", editingExpense._rowNum!, editingExpense.ID || "غير معروف");
            }
          }}
          fields={[
            { key: "ID", label: "رقم قيد المصروف (ID)", type: "text", disabled: true },
            { key: "date", label: "تاريخ المصروف", type: "date", required: true },
            { key: "Prix", label: "القيمة المنفقة (Prix)", type: "number", required: true },
            { key: "Taper", label: "شرح المصروف (Taper)", type: "select", options: expenseTapersOptions, required: true }
          ]}
        />
      )}

      {/* Global Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
        type={confirmDialog.type}
      />

    </div>
  );
}
