import React, { useState, useEffect } from "react";
import { Order, Purchase, Payment, Expense } from "../types";
import { MOROCCAN_CITIES, CONDITIONS, DELIVERY_STATUSES, LIVREURS, getCalculatedFields, validatePhone, generateWhatsAppUrl } from "../data";
import { X, Save, Plus, Trash2 } from "lucide-react";

const getLocalDatetimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface SaleAddModalProps {
  onClose: () => void;
  onSave: (values: any) => void;
  purchases: Purchase[];
  nextOrderId: string;
  cityOptions: string[];
  livreurOptions: string[];
  productOptions: string[];
}

export const SaleAddModal: React.FC<SaleAddModalProps> = ({ onClose, onSave, purchases, nextOrderId, cityOptions, livreurOptions, productOptions }) => {
  const [formData, setFormData] = useState({
    "Order ID": nextOrderId,
    "Order date": getLocalDatetimeString(),
    "Full name": "",
    "Phone": "",
    "City": "",
    "Region": "",
    "Product name": "", // Stores product CODE
    "Product URL": "",
    "Variant price": "" as any,
    "Total quantity": 1,
    "Condition": "",
    "delivery": "",
    "Livreur": "",
  });

  const [phoneError, setPhoneError] = useState("");
  const [showNewCity, setShowNewCity] = useState(false);
  const [showNewLivreur, setShowNewLivreur] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewCondition, setShowNewCondition] = useState(false);
  const [showNewDelivery, setShowNewDelivery] = useState(false);

  // Auto fill product price/URL on change
  const handleProductChange = (code: string) => {
    const parentPurchase = purchases.find(p => p.Code && p.Code.toUpperCase() === code.toUpperCase());
    const sellingPrice = parentPurchase ? parentPurchase["Prix de vente"] || 0 : "";
    
    // Simple product URL generation or fallback
    const url = parentPurchase ? `https://yourstore.com/products/${code.toLowerCase()}` : "";
    
    setFormData(prev => ({
      ...prev,
      "Product name": code,
      "Variant price": sellingPrice,
      "Product URL": url
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formData.Phone.trim().replace(/\s+/g, "");
    
    if (cleanPhone.startsWith("0")) {
      if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
        setPhoneError("رقم الهاتف الذي يبدأ بـ 0 يجب أن يتكون من 10 أرقام بالضبط (مثال: 0661234567)");
        return;
      }
    } else {
      if (cleanPhone.length !== 9 || !/^\d+$/.test(cleanPhone)) {
        setPhoneError("رقم الهاتف بدون 0 يجب أن يتكون من 9 أرقام بالضبط (مثال: 661234567)");
        return;
      }
    }
    setPhoneError("");

    const variantPriceParsed = parseFloat(formData["Variant price"] as any) || 0;
    const totalQuantityParsed = parseInt(formData["Total quantity"] as any) || 1;

    // Calculate fields on Delivered or others
    const calcs = getCalculatedFields(
      formData["Product name"],
      variantPriceParsed,
      totalQuantityParsed,
      formData.delivery,
      purchases
    );

    let whatsappValue = "";
    if (cleanPhone.startsWith("0")) {
      whatsappValue = "212" + cleanPhone.slice(1);
    } else {
      whatsappValue = "212" + cleanPhone;
    }

    onSave({
      ...formData,
      Phone: cleanPhone, // Save clean normalized phone
      ...calcs,
      "Variant price": variantPriceParsed,
      "Total quantity": totalQuantityParsed,
      "Total price": formData.delivery === "Delivered" ? variantPriceParsed * totalQuantityParsed : 0,
      "WHATSAPP": whatsappValue
    });

    // Reset formData immediately to prevent resubmit or duplicates
    setFormData({
      "Order ID": nextOrderId,
      "Order date": getLocalDatetimeString(),
      "Full name": "",
      "Phone": "",
      "City": "",
      "Region": "",
      "Product name": "",
      "Product URL": "",
      "Variant price": "" as any,
      "Total quantity": 1,
      "Condition": "",
      "delivery": "",
      "Livreur": "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111930] border border-white/10 rounded-2xl w-full lg:max-w-6xl md:max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right" dir="rtl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0d1426]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            إضافة طلب جديد
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Box 1: Customer Contact Information */}
            <div className="bg-[#0d1426]/40 border border-white/5 p-5 rounded-2xl space-y-4">
              <div className="border-b border-white/5 pb-2 mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-xs font-bold text-gray-400">بيانات العميل والاتصال</span>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">رقم الطلب (تلقائي)</label>
                <input
                  type="text"
                  value={formData["Order ID"]}
                  disabled
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">اسم العميل بالكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد العلمي"
                  value={formData["Full name"]}
                  onChange={e => setFormData({ ...formData, "Full name": e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">رقم الهاتف (10 أرقام)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 0661234567"
                  maxLength={10}
                  value={formData.Phone}
                  onChange={e => setFormData({ ...formData, "Phone": e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-blue-500/50 text-left"
                  dir="ltr"
                />
                {phoneError && <p className="text-red-400 text-[10px] mt-1">{phoneError}</p>}
              </div>
            </div>

            {/* Box 2: Product & Pricing Information */}
            <div className="bg-[#0d1426]/40 border border-white/5 p-5 rounded-2xl space-y-4">
              <div className="border-b border-white/5 pb-2 mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-bold text-gray-400">تفاصيل السلعة والتسعير</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">رمز المنتج (Code de produit)</label>
                {!showNewProduct ? (
                  <select
                    value={formData["Product name"]}
                    onChange={e => {
                      if (e.target.value === "__NEW__") {
                        setShowNewProduct(true);
                        setFormData({ ...formData, "Product name": "" });
                      } else {
                        handleProductChange(e.target.value);
                      }
                    }}
                    className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:border-blue-500/50"
                  >
                    <option value="" className="bg-[#0f172a] text-gray-500"> </option>
                    {productOptions.map(p => (
                      <option key={p} value={p} className="bg-[#0f172a]">{p}</option>
                    ))}
                    <option value="__NEW__" className="text-blue-400 font-bold">➕ Ajouter nouveau Code...</option>
                  </select>
                ) : (
                  <div className="space-y-1.5 text-right">
                    <input
                      type="text"
                      placeholder="Nouveau code..."
                      value={formData["Product name"]}
                      onChange={e => setFormData({ ...formData, "Product name": e.target.value.toUpperCase() })}
                      className="w-full bg-[#0d1426] border border-blue-500/50 text-white rounded-xl px-3 py-2 text-sm uppercase text-left"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewProduct(false);
                        setFormData({ ...formData, "Product name": "" });
                      }}
                      className="text-xs text-blue-400 hover:underline inline-block"
                    >
                      Retour à la sélection / الرجوع للقائمة
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">سعر البيع المقترح (Variant Price)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formData["Variant price"]}
                  onChange={e => setFormData({ ...formData, "Variant price": e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">الكمية المطلوبة</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData["Total quantity"]}
                  onChange={e => setFormData({ ...formData, "Total quantity": e.target.value === "" ? "" : (parseInt(e.target.value) || 1) })}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">رابط المنتج (URL)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData["Product URL"]}
                  onChange={e => setFormData({ ...formData, "Product URL": e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Box 3: Shipment, Locations, Datetimes */}
            <div className="bg-[#0d1426]/40 border border-white/5 p-5 rounded-2xl space-y-4">
              <div className="border-b border-white/5 pb-2 mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                <span className="text-xs font-bold text-gray-400">التاريخ والشحن واللوجستيك</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">تاريخ ووقت الطلب</label>
                <input
                  type="datetime-local"
                  required
                  value={formData["Order date"]}
                  onChange={e => setFormData({ ...formData, "Order date": e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1 font-sans">المدينة (Ville)</label>
                {!showNewCity ? (
                  <select
                    value={formData.City}
                    onChange={e => {
                      if (e.target.value === "__NEW__") {
                        setShowNewCity(true);
                        setFormData({ ...formData, City: "" });
                      } else {
                        setFormData({ ...formData, City: e.target.value });
                      }
                    }}
                    className="w-full bg-[#0d1426] border border-[#2d3a54] text-white rounded-xl px-3 py-2 text-sm focus:border-blue-500/50"
                  >
                    <option value="" className="bg-[#0f172a] text-gray-500">اختر المدينة...</option>
                    {cityOptions.map(c => (
                      <option key={c} value={c} className="bg-[#0f172a]">{c}</option>
                    ))}
                    <option value="__NEW__" className="text-blue-400 font-bold">➕ إضافة مدينة جديدة...</option>
                  </select>
                ) : (
                  <div className="space-y-1.5 text-right">
                    <input
                      type="text"
                      required
                      placeholder="اكتب اسم المدينة الجديدة..."
                      value={formData.City}
                      onChange={e => setFormData({ ...formData, City: e.target.value })}
                      className="w-full bg-[#0d1426] border border-blue-500/50 text-white rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCity(false);
                        setFormData({ ...formData, City: "" });
                      }}
                      className="text-xs text-blue-400 hover:underline inline-block"
                    >
                      الرجوع لاختيار مدينة من قائمة المدن
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">العنوان (Adresse)</label>
                <input
                  type="text"
                  value={formData.Region}
                  placeholder="مثال: حي الرياض، شارع النخيل"
                  onChange={e => setFormData({ ...formData, Region: e.target.value })}
                  className="w-full bg-[#0d1426] border border-[#2d3a54] text-white rounded-xl px-3 py-2 text-sm focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">الحالة (Condition)</label>
                {!showNewCondition ? (
                  <select
                    translate="no"
                    value={formData.Condition}
                    onChange={e => {
                      if (e.target.value === "__NEW__") {
                        setShowNewCondition(true);
                        setFormData({ ...formData, Condition: "" });
                      } else {
                        setFormData({ ...formData, Condition: e.target.value });
                      }
                    }}
                    className={`notranslate w-full border rounded-xl px-3 py-2 text-xs focus:border-blue-500/50 ${
                      ["Ne repond pas", "Anule", "Pas intéresse"].includes(formData.Condition)
                        ? "bg-red-600 text-white border-red-500 font-semibold"
                        : "bg-[#0d1426] border-white/10 text-white"
                    }`}
                  >
                    <option value="" translate="no" className="notranslate bg-[#0f172a] text-gray-500"> </option>
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
                    <option value="__NEW__" translate="no" className="notranslate text-blue-400 font-bold bg-[#0f172a]">➕ Ajouter nouveau...</option>
                  </select>
                ) : (
                  <div className="space-y-1.5 text-right">
                    <input
                      type="text"
                      placeholder="Condition..."
                      value={formData.Condition}
                      onChange={e => setFormData({ ...formData, Condition: e.target.value })}
                      className="w-full bg-[#0d1426] border border-blue-500/50 text-white rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCondition(false);
                        setFormData({ ...formData, Condition: "" });
                      }}
                      className="text-xs text-blue-400 hover:underline inline-block"
                    >
                      Retour / الرجوع
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1 font-sans">شركة الشحن (Livreur)</label>
                {!showNewLivreur ? (
                  <select
                    value={formData.Livreur}
                    onChange={e => {
                      if (e.target.value === "__NEW__") {
                        setShowNewLivreur(true);
                        setFormData({ ...formData, Livreur: "" });
                      } else {
                        setFormData({ ...formData, Livreur: e.target.value });
                      }
                    }}
                    className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:border-blue-500/50"
                  >
                    <option value="" className="bg-[#0f172a] text-gray-500"> </option>
                    {livreurOptions.map(l => (
                      <option key={l} value={l} className="bg-[#0f172a]">{l}</option>
                    ))}
                    <option value="__NEW__" className="text-blue-400 font-bold">➕ إضافة موزع جديد...</option>
                  </select>
                ) : (
                  <div className="space-y-1.5 text-right">
                    <input
                      type="text"
                      required
                      placeholder="اكتب اسم الموزع الجديد..."
                      value={formData.Livreur}
                      onChange={e => setFormData({ ...formData, Livreur: e.target.value })}
                      className="w-full bg-[#0d1426] border border-blue-500/50 text-white rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewLivreur(false);
                        setFormData({ ...formData, Livreur: "" });
                      }}
                      className="text-xs text-blue-400 hover:underline inline-block"
                    >
                      الرجوع لاختيار موزع من القائمة
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">حالة التوصيل (Livraison)</label>
                {!showNewDelivery ? (
                  <select
                    value={formData.delivery}
                    onChange={e => {
                      if (e.target.value === "__NEW__") {
                        setShowNewDelivery(true);
                        setFormData({ ...formData, delivery: "" });
                      } else {
                        setFormData({ ...formData, delivery: e.target.value });
                      }
                    }}
                    className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:border-blue-500/50"
                  >
                    <option value="" className="bg-[#0f172a] text-gray-500"> </option>
                    {DELIVERY_STATUSES.map(d => (
                      <option key={d.value} value={d.value} className="bg-[#0f172a]">{d.label}</option>
                    ))}
                    <option value="__NEW__" className="text-blue-400 font-bold">➕ Ajouter nouveau...</option>
                  </select>
                ) : (
                  <div className="space-y-1.5 text-right">
                    <input
                      type="text"
                      placeholder="Statut..."
                      value={formData.delivery}
                      onChange={e => setFormData({ ...formData, delivery: e.target.value })}
                      className="w-full bg-[#0d1426] border border-blue-500/50 text-white rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewDelivery(false);
                        setFormData({ ...formData, delivery: "" });
                      }}
                      className="text-xs text-blue-400 hover:underline inline-block"
                    >
                      Retour / الرجوع
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Quick Preview Area */}
          <div className="bg-[#3b82f6]/5 border border-[#3b82f6]/10 p-4 rounded-xl text-xs space-y-1">
            <span className="font-bold text-blue-400 block mb-1">معاينة الحسابات المتوقعة عند التوصيل</span>
            <div className="grid grid-cols-2 gap-4 text-gray-300 font-mono">
              <div>المبلغ الإجمالي المتوقع: <span className="text-white font-bold">{((parseFloat(formData["Variant price"] as any) || 0) * (parseInt(formData["Total quantity"] as any) || 1)).toFixed(2)} DH</span></div>
              <div>رسوم الشحن الثابتة: <span className="text-white">40.00 DH</span></div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-white/5 bg-[#0d1426]/20 p-2 rounded-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 text-sm font-medium transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ الطلب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface PurchaseAddModalProps {
  onClose: () => void;
  onSave: (values: any) => void;
  purchases: Purchase[];
  supplierOptions: string[];
  productNamesOptions: string[];
}

export const PurchaseAddModal: React.FC<PurchaseAddModalProps> = ({ onClose, onSave, purchases, supplierOptions, productNamesOptions }) => {
  const [addNewProduct, setAddNewProduct] = useState(false);
  const [addNewSupplier, setAddNewSupplier] = useState(false);

  const [formData, setFormData] = useState({
    "date": new Date().toISOString().split("T")[0],
    "nombre": "" as any,
    "Produit": "",
    "Code": "",
    "Prix Unit": "" as any,
    "Fournisseur": "",
    "Prix de vente": "" as any
  });

  const handleProductSelect = (prodName: string) => {
    if (prodName === "__NEW__") {
      setAddNewProduct(true);
      setFormData(prev => ({ ...prev, Produit: "", Code: "" }));
    } else {
      setAddNewProduct(false);
      const match = purchases.find(p => p.Produit === prodName);
      setFormData(prev => ({
        ...prev,
        Produit: prodName,
        Code: match ? match.Code : "",
        "Prix Unit": match ? match["Prix Unit"] : "",
        "Prix de vente": match ? match["Prix de vente"] : ""
      }));
    }
  };

  const handleSupplierSelect = (supName: string) => {
    if (supName === "__NEW__") {
      setAddNewSupplier(true);
      setFormData(prev => ({ ...prev, Fournisseur: "" }));
    } else {
      setAddNewSupplier(false);
      setFormData(prev => ({ ...prev, Fournisseur: supName }));
    }
  };

  useEffect(() => {
    if (productNamesOptions.length === 0) {
      setAddNewProduct(true);
    }
    if (supplierOptions.length === 0) {
      setAddNewSupplier(true);
    }
  }, [productNamesOptions.length, supplierOptions.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreParsed = parseInt(formData.nombre as any) || 0;
    const prixUnitParsed = parseFloat(formData["Prix Unit"] as any) || 0;
    const prixVenteParsed = parseFloat(formData["Prix de vente"] as any) || 0;
    const total = nombreParsed * prixUnitParsed;
    onSave({
      ...formData,
      nombre: nombreParsed,
      "Prix Unit": prixUnitParsed,
      "Prix de vente": prixVenteParsed,
      total: total
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111930] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col text-right" dir="rtl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-500" />
            إضافة شحنة شراء جديدة
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">تاريخ الشراء</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">الكمية المشتراة (Nombre)</label>
              <input
                type="number"
                min={1}
                required
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value === "" ? "" : (parseInt(e.target.value) || 1) })}
                className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-gray-400">المنتج والرمز المراد تسجيله</h4>
            
            {!addNewProduct && productNamesOptions.length > 0 ? (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">اختر من المنتجات الموجودة</label>
                <div className="flex gap-2">
                  <select
                    value={formData.Produit}
                    onChange={e => handleProductSelect(e.target.value)}
                    className="flex-1 bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-sm text-right"
                  >
                    <option value="" className="bg-[#0f172a] text-gray-500"> </option>
                    {productNamesOptions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="__NEW__" className="text-emerald-400 font-bold">➕ Ajouter nouveau produit...</option>
                  </select>
                </div>
              </div>
            ) : null}

            {(addNewProduct || productNamesOptions.length === 0) && (
              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">اسم المنتج الجديد</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom du produit..."
                    value={formData.Produit}
                    onChange={e => setFormData({ ...formData, Produit: e.target.value })}
                    className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">رمز المنتج (CODE - حالة كود)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: AIRFRY7"
                    value={formData.Code}
                    onChange={e => setFormData({ ...formData, Code: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono text-left uppercase"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {addNewProduct && productNamesOptions.length > 0 && (
              <button
                type="button"
                onClick={() => handleProductSelect(productNamesOptions[0] || "")}
                className="text-xs text-blue-400 hover:underline"
              >
                الرجوع لاختيار من القائمة
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">سعر الشراء الفردي (Prix Unit)</label>
              <input
                type="number"
                min={0}
                required
                value={formData["Prix Unit"]}
                onChange={e => setFormData({ ...formData, "Prix Unit": e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })}
                className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">سعر البيع المقترح (Prix de vente)</label>
              <input
                type="number"
                min={0}
                required
                value={formData["Prix de vente"]}
                onChange={e => setFormData({ ...formData, "Prix de vente": e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })}
                className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-gray-400">بيانات المورد</h4>

            {!addNewSupplier && supplierOptions.length > 0 ? (
              <div>
                <select
                  value={formData.Fournisseur}
                  onChange={e => handleSupplierSelect(e.target.value)}
                  className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-sm text-right"
                >
                  <option value="" className="bg-[#0f172a] text-gray-500"> </option>
                  {supplierOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__NEW__" className="text-emerald-400 font-bold">➕ Ajouter nouveau fournisseur...</option>
                </select>
              </div>
            ) : null}

            {(addNewSupplier || supplierOptions.length === 0) && (
              <div className="animate-fade-in">
                <label className="block text-xs font-medium text-gray-300 mb-1">اسم المورد الجديد</label>
                <input
                  type="text"
                  required
                  placeholder="Nom du fournisseur..."
                  value={formData.Fournisseur}
                  onChange={e => setFormData({ ...formData, Fournisseur: e.target.value })}
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            )}

            {addNewSupplier && supplierOptions.length > 0 && (
              <button
                type="button"
                onClick={() => handleSupplierSelect(supplierOptions[0] || "")}
                className="text-xs text-blue-400 hover:underline"
              >
                الرجوع لاختيار من القائمة
              </button>
            )}
          </div>

          <div className="bg-[#10b981]/5 border border-[#10b981]/10 p-3 rounded-xl flex justify-between items-center text-xs font-mono">
            <span className="text-gray-400">إجمالي قيمة الفاتورة:</span>
            <span className="text-emerald-400 font-bold text-sm">{( (parseInt(formData.nombre as any) || 0) * (parseFloat(formData["Prix Unit"] as any) || 0) ).toFixed(2)} DH</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 text-sm font-medium transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              تأكيد وحفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface GenericModalProps {
  onClose: () => void;
  onSave: (values: any) => void;
  title: string;
  fields: { key: string; label: string; type: string; options?: string[]; required?: boolean; disabled?: boolean }[];
  initialValues?: any;
  deleteBtn?: { label: string; onDelete: () => void };
}

export const GenericModal: React.FC<GenericModalProps> = ({ onClose, onSave, title, fields, initialValues = {}, deleteBtn }) => {
  const [values, setValues] = useState<any>({});
  const [customFields, setCustomFields] = useState<Record<string, boolean>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const defaultVals: any = {};
    fields.forEach(f => {
      defaultVals[f.key] = initialValues[f.key] !== undefined ? initialValues[f.key] : "";
    });
    setValues(defaultVals);
  }, [fields, initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111930] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col text-right" dir="rtl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {title}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto px-1">
            {fields.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">{f.label}</label>
                {f.type === "select" ? (
                  <div>
                    {!customFields[f.key] ? (
                      <select
                        value={values[f.key] || ""}
                        disabled={f.disabled}
                        onChange={e => {
                          if (e.target.value === "__NEW__") {
                            setCustomFields(prev => ({ ...prev, [f.key]: true }));
                            setValues(prev => ({ ...prev, [f.key]: "" }));
                          } else {
                            setValues(prev => ({ ...prev, [f.key]: e.target.value }));
                          }
                        }}
                        className="w-full bg-[#0d1426] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:border-blue-500/50 disabled:opacity-50 text-right"
                      >
                        <option value="" className="bg-[#0f172a] text-gray-500"> </option>
                        {f.options?.map(opt => (
                          <option key={opt} value={opt} className="bg-[#0f172a]">{opt}</option>
                        ))}
                        <option value="__NEW__" className="text-blue-400 font-bold">➕ Ajouter nouveau...</option>
                      </select>
                    ) : (
                      <div className="space-y-1 text-right">
                        <input
                          type="text"
                          placeholder="Entrez une nouvelle valeur..."
                          value={customValues[f.key] || ""}
                          onChange={e => {
                            setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }));
                            setValues(prev => ({ ...prev, [f.key]: e.target.value }));
                          }}
                          className="w-full bg-[#0d1426] border border-blue-500/50 text-white rounded-xl px-3 py-2 text-sm text-right"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomFields(prev => ({ ...prev, [f.key]: false }));
                            setCustomValues(prev => ({ ...prev, [f.key]: "" }));
                            setValues(prev => ({ ...prev, [f.key]: "" }));
                          }}
                          className="text-xs text-blue-400 hover:underline inline-block"
                        >
                          Retour / الرجوع للقائمة
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    disabled={f.disabled}
                    value={values[f.key] === undefined || values[f.key] === null ? "" : values[f.key]}
                    onChange={e => setValues({ ...values, [f.key]: f.type === "number" ? (e.target.value === "" ? "" : (parseFloat(e.target.value) || 0)) : e.target.value })}
                    className="w-full bg-[#0d1426] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-sans disabled:opacity-50 text-right"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 justify-between pt-4 border-t border-white/5">
            {deleteBtn ? (
              <button
                type="button"
                onClick={deleteBtn.onDelete}
                className="px-4 py-2 bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteBtn.label}
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 text-xs font-medium transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-xs font-medium transition-all flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                تطبيق وحفظ
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
