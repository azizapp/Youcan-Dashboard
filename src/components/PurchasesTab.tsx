import React, { useState } from "react";
import { Purchase, Order, Payment } from "../types";
import { formatCurrency } from "../data";
import { Plus, Edit, Package, Users, Hash, TrendingUp, AlertCircle, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface PurchasesTabProps {
  purchases: Purchase[];
  sales: Order[];
  payments: Payment[];
  onAddPurchase: () => void;
  onEditPurchase: (purchase: Purchase) => void;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({ purchases, sales, payments, onAddPurchase, onEditPurchase }) => {
  const [activeSubTab, setActiveSubTab] = useState<"purchases" | "suppliers">("purchases");

  // Filter & Searches
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>("Delivered");

  // Sorting States
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [supplierSortField, setSupplierSortField] = useState<string>("name");
  const [supplierSortDirection, setSupplierSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
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

  const handleSupplierSort = (field: string) => {
    if (supplierSortField === field) {
      setSupplierSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSupplierSortField(field);
      setSupplierSortDirection("asc");
    }
  };

  const renderSupplierSortIcon = (field: string) => {
    if (supplierSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-500 shrink-0" />;
    }
    return supplierSortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-blue-400 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400 shrink-0" />
    );
  };

  // 1. Calculate Supplier aggregation summary (debt, payments, balance)
  const supplierAggregates = React.useMemo(() => {
    const map: { [name: string]: { name: string; distinctProducts: Set<string>; totalPurchases: number; totalPayments: number; totalQty: number } } = {};

    // Purchase invoices aggregate
    purchases.forEach(p => {
      const s = p.Fournisseur || "غير محدد";
      if (!map[s]) {
        map[s] = { name: s, distinctProducts: new Set(), totalPurchases: 0, totalPayments: 0, totalQty: 0 };
      }
      map[s].distinctProducts.add(p.Code || p.Produit || "");
      map[s].totalPurchases += (p.total || 0);
      map[s].totalQty += (p.nombre || 0);
    });

    // Payments registered
    payments.forEach(pay => {
      const s = pay.Fournisseur || "غير محدد";
      if (!map[s]) {
        map[s] = { name: s, distinctProducts: new Set(), totalPurchases: 0, totalPayments: 0, totalQty: 0 };
      }
      map[s].totalPayments += (pay.Payment || 0);
    });

    return Object.values(map);
  }, [purchases, payments]);

  // 2. Group / Aggregate Purchases by `Produit||Fournisseur` (Section 4.6 requirement)
  const aggregatedPurchases = React.useMemo(() => {
    const map: { [key: string]: Purchase & { totalQtySold: number } } = {};

    purchases.forEach(p => {
      const groupKey = `${p.Produit}||${p.Fournisseur}`;
      if (!map[groupKey]) {
        // Calculate units sold match where Order Product name (= code) matches Achat Code or Produit (case-insensitive)
        let totalSoldCodeCount = 0;
        sales.forEach(sale => {
          const matchesDelivery = selectedDeliveryStatus === "all" 
            ? true 
            : (selectedDeliveryStatus === "" ? (!sale.delivery || sale.delivery.trim() === "") : sale.delivery === selectedDeliveryStatus);

          if (matchesDelivery) {
            const productRef = (sale["Product name"] || "").toLowerCase();
            const achatCode = (p.Code || "").toLowerCase();
            const achatProd = (p.Produit || "").toLowerCase();
            
            if (productRef === achatCode || productRef === achatProd) {
              totalSoldCodeCount += (sale["Total quantity"] || 1);
            }
          }
        });

        map[groupKey] = {
          ...p,
          totalQtySold: totalSoldCodeCount
        };
      } else {
        // Accumulate quantities and total bought amounts
        map[groupKey].nombre += (p.nombre || 0);
        map[groupKey].total += (p.total || 0);
      }
    });

    return Object.values(map);
  }, [purchases, sales, selectedDeliveryStatus]);

  // Filter lists based on search query
  const filteredAggregatedPurchases = aggregatedPurchases.filter(p => 
    (p.Produit || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.Code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.Fournisseur || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = supplierAggregates.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAggregatedPurchases = React.useMemo(() => {
    const items = [...filteredAggregatedPurchases];
    if (!sortField) return items;

    items.sort((a, b) => {
      let valA = a[sortField as keyof (Purchase & { totalQtySold: number })];
      let valB = b[sortField as keyof (Purchase & { totalQtySold: number })];

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (sortField === "date") {
        const dateA = new Date(String(valA).split(" ")[0]).getTime() || 0;
        const dateB = new Date(String(valB).split(" ")[0]).getTime() || 0;
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === "asc" ? strA.localeCompare(strB, "ar") : strB.localeCompare(strA, "ar");
    });

    return items;
  }, [filteredAggregatedPurchases, sortField, sortDirection]);

  const sortedSuppliers = React.useMemo(() => {
    const items = [...filteredSuppliers];
    if (!supplierSortField) return items;

    items.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (supplierSortField === "distinctProducts") {
        valA = a.distinctProducts.size;
        valB = b.distinctProducts.size;
      } else if (supplierSortField === "balance") {
        valA = a.totalPurchases - a.totalPayments;
        valB = b.totalPurchases - b.totalPayments;
      } else {
        valA = a[supplierSortField as keyof typeof a];
        valB = b[supplierSortField as keyof typeof b];
      }

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "number" && typeof valB === "number") {
        return supplierSortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return supplierSortDirection === "asc" ? strA.localeCompare(strB, "ar") : strB.localeCompare(strA, "ar");
    });

    return items;
  }, [filteredSuppliers, supplierSortField, supplierSortDirection]);

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Switch Sub Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-white/5 pb-2">
        <div className="flex gap-2 p-1 bg-[#0d1426] rounded-xl self-start select-none border border-white/5">
          <button
            onClick={() => setActiveSubTab("purchases")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all flex items-center gap-2 ${
              activeSubTab === "purchases"
                ? "bg-blue-600/10 text-blue-400 border border-blue-600/15"
                : "text-gray-400 border border-transparent hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>قائمة مشتريات الشحنات</span>
          </button>
          <button
            onClick={() => setActiveSubTab("suppliers")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all flex items-center gap-2 ${
              activeSubTab === "suppliers"
                ? "bg-blue-600/10 text-blue-400 border border-blue-600/15"
                : "text-gray-400 border border-transparent hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>حسابات الموردين والدائنية</span>
          </button>
        </div>

        {/* Inputs */}
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto font-sans">
          {activeSubTab === "purchases" && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs shrink-0 font-medium">حالة التسليم (العمود N):</span>
              <select
                value={selectedDeliveryStatus}
                onChange={e => setSelectedDeliveryStatus(e.target.value)}
                className="bg-[#0d1426] border border-white/10 text-xs rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-blue-500/50 cursor-pointer"
              >
                <option value="all">الكل (جميع الحالات)</option>
                <option value="Delivered">Delivered</option>
                <option value="Retour">Retour</option>
                <option value="annuler">Annulée</option>
                <option value="Client Injoignable">Client Injoignable</option>
                <option value="Annulé Au Téléphone">Annulé Au Téléphone</option>
                <option value="Annulé Sur Place">Annulé Sur Place</option>
                <option value="">بدون حالة (معلق)</option>
              </select>
            </div>
          )}
          <input
            type="text"
            placeholder={activeSubTab === "purchases" ? "بحث عن منتج، رمز، مورد..." : "بحث باسم المورد..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-[#0d1426] border border-white/10 text-xs rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={onAddPurchase}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شحنة</span>
          </button>
        </div>
      </div>

      {activeSubTab === "purchases" ? (
        /* Double Column Purchases Aggregation View */
        <div className="bg-[#111930]/40 border border-white/5 rounded-2xl shadow-xl overflow-hidden glass-effect">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-[#0d1426] text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5 font-mono select-none">
                <tr>
                  <th onClick={() => handleSort("Produit")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-start">
                      <span>المنتج</span>
                      {renderSortIcon("Produit")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("Code")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-start">
                      <span>الرمز</span>
                      {renderSortIcon("Code")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("Fournisseur")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors font-sans font-semibold">
                    <div className="flex items-center gap-1 justify-start">
                      <span>المورد</span>
                      {renderSortIcon("Fournisseur")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("nombre")} className="px-6 py-4 text-center cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-center">
                      <span>الكمية</span>
                      {renderSortIcon("nombre")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("Prix Unit")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors font-sans">
                    <div className="flex items-center gap-1 justify-start">
                      <span>التكلفة</span>
                      {renderSortIcon("Prix Unit")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("total")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-start">
                      <span>الإجمالي</span>
                      {renderSortIcon("total")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("Prix de vente")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors font-sans text-emerald-400">
                    <div className="flex items-center gap-1 justify-start">
                      <span>السعر</span>
                      {renderSortIcon("Prix de vente")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("totalQtySold")} className="px-6 py-4 text-center cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-center">
                      <span>المباع ({selectedDeliveryStatus === "all" ? "الكل" : selectedDeliveryStatus === "" ? "بدون حالة" : selectedDeliveryStatus})</span>
                      {renderSortIcon("totalQtySold")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <span>خيارات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-200">
                {sortedAggregatedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-gray-500 font-medium font-sans">
                      لا تتوفر شحنات شراء مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  sortedAggregatedPurchases.map((pur, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      {/* Product Name */}
                      <td className="px-6 py-4 font-bold text-white cell-product-name shrink-0 max-w-[180px] truncate">
                        {pur.Produit}
                      </td>

                      {/* Code */}
                      <td className="px-6 py-4 font-mono text-gray-300 select-all font-semibold uppercase">
                        {pur.Code || "-"}
                      </td>

                      {/* Supplier */}
                      <td className="px-6 py-4 text-gray-400 font-sans font-semibold">
                        {pur.Fournisseur || "مورد مجهول"}
                      </td>

                      {/* Qty centered */}
                      <td className="px-6 py-4 text-center font-mono font-bold text-gray-100 cell-qty">
                        {pur.nombre}
                      </td>

                      {/* Prix Unit */}
                      <td className="px-6 py-4 font-mono text-gray-300">
                        {formatCurrency(pur["Prix Unit"] || 0)}
                      </td>

                      {/* Total cost (Section 11 Table Row Rules: Cost Total is bold red) */}
                      <td className="px-6 py-4 font-mono font-bold text-red-400">
                        {formatCurrency(pur.total || 0)}
                      </td>

                      {/* Prix de Vente (Section 11 Table Row Rules: Sale price is green bold) */}
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                        {formatCurrency(pur["Prix de vente"] || 0)}
                      </td>

                      {/* Units Sold (Section 11 Table Row Rules: Info blue if > 0, muted if 0) */}
                      <td className="px-6 py-4 text-center">
                        {pur.totalQtySold > 0 ? (
                          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 rounded-full font-mono text-[11px] inline-flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {pur.totalQtySold}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-white/5 text-gray-500 rounded font-mono text-[10px]">
                            0
                          </span>
                        )}
                      </td>

                      {/* Edit Button */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onEditPurchase(pur)}
                          className="p-1 px-2.5 bg-[#3b82f6]/10 text-blue-400 hover:bg-[#3b82f6]/20 font-semibold rounded-lg text-[11px] font-sans border border-blue-500/10 transition-colors inline-flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Supplier aggregates and remaining metrics table */
        <div className="bg-[#111930]/40 border border-white/5 rounded-2xl shadow-xl overflow-hidden glass-effect animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-[#0d1426] text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5 font-mono select-none">
                <tr>
                  <th onClick={() => handleSupplierSort("name")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-start">
                      <span>المورد</span>
                      {renderSupplierSortIcon("name")}
                    </div>
                  </th>
                  <th onClick={() => handleSupplierSort("distinctProducts")} className="px-6 py-4 text-center cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-center">
                      <span>المنتجات</span>
                      {renderSupplierSortIcon("distinctProducts")}
                    </div>
                  </th>
                  <th onClick={() => handleSupplierSort("totalQty")} className="px-6 py-4 text-center cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-center">
                      <span>المستلم</span>
                      {renderSupplierSortIcon("totalQty")}
                    </div>
                  </th>
                  <th onClick={() => handleSupplierSort("totalPurchases")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors text-red-100">
                    <div className="flex items-center gap-1 justify-start">
                      <span>الديون</span>
                      {renderSupplierSortIcon("totalPurchases")}
                    </div>
                  </th>
                  <th onClick={() => handleSupplierSort("totalPayments")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors text-emerald-100">
                    <div className="flex items-center gap-1 justify-start">
                      <span>المدفوع</span>
                      {renderSupplierSortIcon("totalPayments")}
                    </div>
                  </th>
                  <th onClick={() => handleSupplierSort("balance")} className="px-6 py-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-1 justify-start">
                      <span>المتبقي</span>
                      {renderSupplierSortIcon("balance")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-200">
                {sortedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500 font-medium font-sans">
                      لا يوجد موردين مسجلين بالملف حالياً
                    </td>
                  </tr>
                ) : (
                  sortedSuppliers.map((sup, idx) => {
                    const balance = sup.totalPurchases - sup.totalPayments;
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        {/* Supplier Name */}
                        <td className="px-6 py-4 font-bold text-white font-sans text-sm">
                          {sup.name}
                        </td>

                        {/* Products count */}
                        <td className="px-6 py-4 text-center font-mono text-gray-300 font-semibold">
                          {sup.distinctProducts.size} منتجات مختلفة
                        </td>

                        {/* Qty centered */}
                        <td className="px-6 py-4 text-center font-mono text-gray-300 font-semibold">
                          {sup.totalQty} شحنات
                        </td>

                        {/* Debt (Total Purchases) in Red Bold according to Section 11 Table Row Rules */}
                        <td className="px-6 py-4 font-mono font-bold text-red-400">
                          {formatCurrency(sup.totalPurchases)}
                        </td>

                        {/* Payments total */}
                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                          {formatCurrency(sup.totalPayments)}
                        </td>

                        {/* Remaining balance colored uniquely on standing */}
                        <td className="px-6 py-4 font-mono font-bold">
                          {balance > 0 ? (
                            <span className="text-red-400 bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded font-bold">
                              {formatCurrency(balance)} (مستحق سداده)
                            </span>
                          ) : balance < 0 ? (
                            <span className="text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded font-bold">
                              {formatCurrency(Math.abs(balance))} (رصيد دائن لكم)
                            </span>
                          ) : (
                            <span className="text-gray-500 bg-gray-500/5 border border-gray-500/10 px-2 py-0.5 rounded">
                              مسدد بالكامل (Settled)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
