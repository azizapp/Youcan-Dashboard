import React, { useState, useEffect } from "react";
import { Order } from "../types";
import { X, Send, Copy, Check, ExternalLink, ChevronRight, ChevronLeft, Image, Sparkles, Plus, AlertCircle, RefreshCw } from "lucide-react";

interface WhatsAppSequentialSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: Order[];
  onUpdateOrder: (rowNum: number, updates: any) => void;
}

interface RecipientStatus {
  orderId: string;
  rowNum: number;
  name: string;
  phone: string;
  status: "pending" | "sent" | "skipped";
}

export const WhatsAppSequentialSendModal: React.FC<WhatsAppSequentialSendModalProps> = ({
  isOpen,
  onClose,
  selectedOrders,
  onUpdateOrder
}) => {
  if (!isOpen) return null;

  // Recipient queue state
  const [recipients, setRecipients] = useState<RecipientStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Template State
  const [template, setTemplate] = useState<string>(
    "السلام عليكم يا {الاسم}، بخصوص طلبك لمنتج {المنتج} بقيمة {السعر} درهم إلى مدينة {المدينة}. نود تأكيد الطلبية معكم للشحن قريباً."
  );

  // Image Helper States
  const [imagePath, setImagePath] = useState<string>("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageCopied, setImageCopied] = useState<boolean>(false);

  // General settings
  const [autoMarkWhatsApp, setAutoMarkWhatsApp] = useState<boolean>(true);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Initialize recipients from selected orders
  useEffect(() => {
    const list = selectedOrders.map((order, idx) => ({
      orderId: order["Order ID"],
      rowNum: order._rowNum || (idx + 2),
      name: order["Full name"] || "عميل بدون اسم",
      phone: order.Phone || "",
      status: "pending" as const
    }));
    setRecipients(list);
    setCurrentIndex(0);
  }, [selectedOrders, isOpen]);

  // Clean preview URL when unmounting or changing image
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Handle local image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(URL.createObjectURL(file));
      setImagePath(file.name); // automatically fill mock path for user visibility
      setImageCopied(false);
    }
  };

  // Copy product image to clipboard for quick pasting
  const copyImageToClipboard = async () => {
    if (!selectedImageFile) return;
    try {
      // In secure contexts, copy PNG/JPEG to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [selectedImageFile.type]: selectedImageFile
        })
      ]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 3000);
    } catch (err) {
      console.warn("Failed directly writing file object to clipboard", err);
      // Fallback instruction
      alert("عذراً، يرجى سحب الصورة بالماوس أو نسخها يدوياً بسبب قيود الأمان بمتصفحك.");
    }
  };

  // Current active recipient
  const currentRecipient = recipients[currentIndex];
  const currentOrder = selectedOrders.find(
    o => o["Order ID"] === currentRecipient?.orderId
  );

  // Substitute placeholders
  const getSubstitutedMessage = (order: Order | undefined) => {
    if (!order) return "";
    return template
      .replace(/{الاسم}/g, order["Full name"] || "")
      .replace(/{الهاتف}/g, order.Phone || "")
      .replace(/{المدينة}/g, order.City || "")
      .replace(/{العنوان}/g, order.Region || "")
      .replace(/{المنتج}/g, order["Product name"] || "")
      .replace(/{السعر}/g, String(order["Variant price"] || ""))
      .replace(/{الكمية}/g, String(order["Total quantity"] || 1))
      .replace(/{رقم_الطلب}/g, order["Order ID"] || "");
  };

  const activeMessage = currentOrder ? getSubstitutedMessage(currentOrder) : "";

  // Insert template tag helper
  const insertTag = (tag: string) => {
    setTemplate(prev => prev + tag);
  };

  // Generate WhatsApp link with prefilled text
  const generateWhatsAppLink = (phone: string, text: string) => {
    const clean = phone.trim().replace(/\s+/g, "");
    const encodedText = encodeURIComponent(text);
    let basePhone = clean;
    if (basePhone.startsWith("0")) {
      basePhone = `212${basePhone.slice(1)}`;
    }
    return `https://api.whatsapp.com/send?phone=${basePhone}&text=${encodedText}`;
  };

  // Mark status and advance
  const markAsSentAndAdvance = () => {
    if (!currentRecipient || !currentOrder) return;

    // Update status locally in recipient table
    const updated = [...recipients];
    updated[currentIndex].status = "sent";
    setRecipients(updated);

    // If auto mark option is checked, update row in sheets data
    if (autoMarkWhatsApp && currentRecipient.rowNum) {
      onUpdateOrder(currentRecipient.rowNum, { Condition: "WHATSAPP" });
    }

    // Launch WhatsApp tab
    const url = generateWhatsAppLink(currentRecipient.phone, activeMessage);
    window.open(url, "_blank");

    // Advance to next index if exists
    if (currentIndex < recipients.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const skipAndAdvance = () => {
    if (!currentRecipient) return;

    const updated = [...recipients];
    updated[currentIndex].status = "skipped";
    setRecipients(updated);

    if (currentIndex < recipients.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Copy full message preview text
  const copyMessageText = () => {
    if (!activeMessage) return;
    navigator.clipboard.writeText(activeMessage)
      .then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
  };

  // Global counts
  const sentCount = recipients.filter(r => r.status === "sent").length;
  const skippedCount = recipients.filter(r => r.status === "skipped").length;
  const pendingCount = recipients.filter(r => r.status === "pending").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090d1a]/85 backdrop-blur-sm" dir="rtl">
      <div className="bg-[#111930] border border-white/10 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in text-white font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0d1426]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-100">مساعد الإرسال التتابعي اليدوي عبر واتساب (مجاني)</h3>
              <p className="text-[11px] text-gray-400">إرسال لعدد 20 عميل بحد أقصى بدون تكلفة أو برامج إضافية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Right sidebar: Recipient List Status Queue */}
          <div className="lg:col-span-4 border-l border-white/5 bg-[#0d1426]/40 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between text-xs text-gray-300 font-semibold bg-[#0d1426]/60">
              <span>طابور الإرسال ({recipients.length} عميل)</span>
              <div className="flex gap-1.5 text-[10px]">
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  تم: {sentCount}
                </span>
                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                  تخطي: {skippedCount}
                </span>
                <span className="px-1.5 py-0.5 bg-gray-500/10 text-gray-300 border border-white/5 rounded">
                  متبقي: {pendingCount}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {recipients.map((rec, index) => {
                const isActive = index === currentIndex;
                const origOrder = selectedOrders.find(o => o["Order ID"] === rec.orderId);
                const cityCompact = origOrder?.City ? origOrder.City.split(/[-–—,/()\\]/)[0].trim() : "";
                
                return (
                  <button
                    key={rec.orderId + index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-full p-3 rounded-xl text-right transition-all flex items-center justify-between border ${
                      isActive
                        ? "bg-blue-600/10 border-blue-500/40 text-white shadow-md shadow-blue-900/10"
                        : "bg-[#111930]/30 border-transparent hover:bg-white/[0.02] text-gray-300"
                    }`}
                  >
                    <div className="space-y-1 truncate ml-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate max-w-[130px]">{rec.name}</span>
                        {cityCompact && (
                          <span className="text-[10px] bg-white/5 border border-white/5 text-gray-400 px-1.5 py-0.2 rounded font-sans shrink-0">
                            {cityCompact}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">{rec.phone}</div>
                    </div>

                    <div className="shrink-0">
                      {rec.status === "sent" && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3" /> تم
                        </span>
                      )}
                      {rec.status === "skipped" && (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20 rounded-md">
                          تم تخطيه
                        </span>
                      )}
                      {rec.status === "pending" && !isActive && (
                        <span className="px-1.5 py-0.5 bg-white/5 text-gray-400 text-[10px] border border-white/5 rounded-md">
                          متبقي
                        </span>
                      )}
                      {isActive && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 rounded-md animate-pulse">
                          نشط الآن
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Area: Template config + current sender console */}
          <div className="lg:col-span-8 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Template Editor Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    صياغة نموذج الرسالة (برسونا):
                  </label>
                  <span className="text-[10px] text-gray-400">انقر على الأزرار لإدراج المتغيرات</span>
                </div>
                
                {/* Variable chips */}
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => insertTag("{الاسم}")} className="px-2 py-1 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/20 rounded-lg text-[10.5px] text-blue-300 transition-all font-semibold">
                    + اسم العميل
                  </button>
                  <button onClick={() => insertTag("{المنتج}")} className="px-2 py-1 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/20 rounded-lg text-[10.5px] text-blue-300 transition-all font-semibold">
                    + كود المنتج
                  </button>
                  <button onClick={() => insertTag("{السعر}")} className="px-2 py-1 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/20 rounded-lg text-[10.5px] text-blue-300 transition-all font-semibold">
                    + السعر
                  </button>
                  <button onClick={() => insertTag("{الكمية}")} className="px-2 py-1 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/20 rounded-lg text-[10.5px] text-blue-300 transition-all font-semibold">
                    + الكمية
                  </button>
                  <button onClick={() => insertTag("{المدينة}")} className="px-2 py-1 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/20 rounded-lg text-[10.5px] text-blue-300 transition-all font-semibold">
                    + المدينة
                  </button>
                  <button onClick={() => insertTag("{العنوان}")} className="px-2 py-1 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/20 rounded-lg text-[10.5px] text-blue-300 transition-all font-semibold">
                    + العنوان (Adresse)
                  </button>
                  <button onClick={() => insertTag("{رقم_الطلب}")} className="px-2 py-1 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/20 rounded-lg text-[10.5px] text-blue-300 transition-all font-semibold">
                    + رقم الطلب
                  </button>
                </div>

                <textarea
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  rows={3}
                  placeholder="اكتب هنا الرسالة التلقائية..."
                  className="w-full bg-[#0d1426] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 leading-relaxed font-sans"
                />
              </div>

              {/* Integrated Image Upload & File Path Placeholder */}
              <div className="bg-[#0d1426]/50 border border-white/5 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-gray-200">مساعد إرسال الصورة والملحقات:</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload Slot */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] text-gray-400">سحب أو إدراج الصورة لتسهيل النسخ:</span>
                    <div className="relative border border-dashed border-white/10 hover:border-emerald-500/30 rounded-lg bg-[#0d1426] p-3 text-center transition-all flex flex-col justify-center items-center group h-24">
                      {imagePreviewUrl ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img src={imagePreviewUrl} alt="Thumbnail preview" className="h-full max-w-[120px] object-contain rounded-md" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImageFile(null);
                              setImagePreviewUrl(null);
                              setImagePath("");
                            }}
                            className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Image className="w-5 h-5 text-gray-500 mb-1.5 group-hover:text-emerald-400 transition" />
                          <span className="text-[10px] text-gray-400 font-semibold">اضغط هنا أو أسقط الملف للتحميل</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Manual Path Memoizer For Reminder */}
                  <div className="space-y-1.5 text-right flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] text-gray-400">مسار الصورة للتذكرة (اختياري):</span>
                      <input
                        type="text"
                        placeholder="مثال: C:\Desktop\offer.png"
                        value={imagePath}
                        onChange={e => setImagePath(e.target.value)}
                        className="w-full bg-[#0d1426] border border-white/10 text-white rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-emerald-500/50 mt-1 font-mono placeholder:font-sans"
                      />
                    </div>

                    {selectedImageFile && (
                      <button
                        type="button"
                        onClick={copyImageToClipboard}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          imageCopied
                            ? "bg-emerald-600/10 border-emerald-500/40 text-emerald-300"
                            : "bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/20 text-emerald-400 hover:text-emerald-300"
                        }`}
                      >
                        {imageCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم نسخ الصورة للحافظة!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>انسخ الصورة للصقها بواتساب</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-start gap-2 text-[10px] text-emerald-400/90 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div>
                    <strong>الميزة المجانية:</strong> لا تتيح الروابط في واتساب إرفاق ملفات آلية بسبب حماية المتصفح للملفات المحلية. فكرة العمل: حدد الصورة أو انسخها أولاً، ثم الصقها عبر (Ctrl+V) بمجرد فتح واتساب تالياً.
                  </div>
                </div>
              </div>

              {/* Recipient Details & Substituted Panel */}
              {currentRecipient ? (
                <div className="bg-[#0d1426] border border-blue-500/15 rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-blue-600/10 px-4 py-3 border-b border-blue-500/15 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
                      <strong className="text-blue-300">العميل الحالي قيد المعالجة ({currentIndex + 1} / {recipients.length})</strong>
                    </div>
                    {currentOrder?.["Order ID"] && (
                      <span className="px-2 py-0.5 bg-blue-500/25 border border-blue-400/20 font-mono font-bold rounded text-[10px] text-blue-200">
                        {currentOrder["Order ID"]}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Compact Card Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
                      <div className="p-2.5 bg-[#111930]/60 border border-white/5 rounded-lg space-y-0.5">
                        <span className="block text-[10px] text-gray-400 font-bold">اسم العميل</span>
                        <span className="text-xs font-bold text-white block truncate">{currentRecipient.name}</span>
                      </div>
                      <div className="p-2.5 bg-[#111930]/60 border border-white/5 rounded-lg space-y-0.5">
                        <span className="block text-[10px] text-gray-400">رقم الهاتف</span>
                        <span className="text-xs font-semibold text-white font-mono block select-all">{currentRecipient.phone}</span>
                      </div>
                      <div className="p-2.5 bg-[#111930]/60 border border-white/5 rounded-lg space-y-0.5">
                        <span className="block text-[10px] text-gray-400">المنتج</span>
                        <span className="text-xs font-bold text-gray-300 font-mono block uppercase truncate">{currentOrder?.["Product name"] || "-"}</span>
                      </div>
                      <div className="p-2.5 bg-[#111930]/60 border border-white/5 rounded-lg space-y-0.5">
                        <span className="block text-[10px] text-gray-400">السعر الإجمالي</span>
                        <span className="text-xs font-black text-rose-400 block font-sans">
                          {currentOrder ? `${currentOrder["Variant price"] * (currentOrder["Total quantity"] || 1)} DH` : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Pre-populated text preview card */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-bold block">معاينة الرسالة النهائية لهذا العميل:</span>
                        <button
                          type="button"
                          onClick={copyMessageText}
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          {copyFeedback ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">تم نسخ النص!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ محتوى الرسالة</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-[#111930] border border-white/5 p-4 rounded-xl text-xs text-gray-100 whitespace-pre-wrap leading-relaxed min-h-[50px] relative max-h-40 overflow-y-auto font-sans">
                        {activeMessage || "لا يوجد نص متاح. قم بكتابة نموذج في الأعلى أولاً."}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                  لا يتوفر عملاء نشطين حاليًا للإرسال تتابعياً. يرجى اختيار جهات الاتصال من جدول الطلبات أولاً.
                </div>
              )}

              {/* Quick Option Settings */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoMarkWhatsApp}
                    onChange={e => setAutoMarkWhatsApp(e.target.checked)}
                    className="rounded border-white/10 bg-[#0d1426] text-emerald-600 focus:ring-emerald-500/40 w-4 h-4"
                  />
                  <span>تحديث عمود الإجراء لـ <strong>"WhatsApp"</strong> تلقائياً بعد الضغط على إرسال</span>
                </label>
              </div>

            </div>

            {/* Footer console controller buttons */}
            <div className="px-6 py-4 bg-[#0d1426] border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-35 rounded-xl border border-white/5 text-gray-300 transition-colors text-xs font-bold flex items-center gap-1.5"
                >
                  <ChevronRight className="w-4 h-4" />
                  العميل السابق
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => Math.min(recipients.length - 1, prev + 1))}
                  disabled={currentIndex === recipients.length - 1}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-35 rounded-xl border border-white/5 text-gray-300 transition-colors text-xs font-bold flex items-center gap-1.5"
                >
                  العميل التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={skipAndAdvance}
                  disabled={!currentRecipient}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/35 rounded-xl transition-all text-xs font-bold"
                >
                  تخطي العميل
                </button>
                <button
                  type="button"
                  onClick={markAsSentAndAdvance}
                  disabled={!currentRecipient}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-950/40 hover:shadow-emerald-950/70 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>فتح واتساب وإرسال</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
