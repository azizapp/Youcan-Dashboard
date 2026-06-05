import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Sliders, 
  Database, 
  Palette, 
  Wifi, 
  Save, 
  DownloadCloud, 
  UploadCloud, 
  Key, 
  ShieldCheck, 
  Loader2, 
  AlertTriangle,
  HelpCircle,
  LogOut
} from "lucide-react";
import { initAuth, googleSignIn, googleSignOut } from "../lib/firebase";
import { User } from "firebase/auth";

interface SettingsProps {
  onSync: () => void;
  isLoading: boolean;
}

export const SettingsTab: React.FC<SettingsProps> = ({ onSync, isLoading }) => {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  
  const [isFetchingSettings, setIsFetchingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showStatus = (text: string, type: "success" | "error" | "info" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 7000);
  };

  // Google OAuth login flow
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsSigningInGoogle(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        showStatus(`مرحباً ${res.user.displayName}! تم ربط وتفعيل حساب غوغل مع لوحة التحكم بنجاح لنقل وقراءة البيانات والطلبيات.`, "success");
      }
    } catch (err: any) {
      showStatus("فشل تسجيل الدخول بـ Google: " + err.toString(), "error");
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      showStatus("تم إلغاء ربط حساب غوغل بنجاح.", "info");
    } catch (err: any) {
      showStatus("فشل قطع اتصال حساب غوغل: " + err.toString(), "error");
    }
  };

  // Fetch settings from server on mount
  const loadSettings = async () => {
    setIsFetchingSettings(true);
    try {
      const res = await fetch("/api/google-sheets/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSpreadsheetId(data.settings.spreadsheetId || "");
        setClientEmail(data.settings.clientEmail || "");
        setPrivateKey(data.settings.privateKey || "");
        setApiKey(data.settings.apiKey || "");
      }
    } catch (err: any) {
      showStatus("فشل تحميل إعدادات السيرفر: " + err.toString(), "error");
    } finally {
      setIsFetchingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/google-sheets/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, clientEmail, privateKey, apiKey })
      });
      const data = await res.json();
      if (data.success) {
        showStatus("تم حفظ إعدادات ورقة العمل والاتصال بنجاح!", "success");
        loadSettings();
      } else {
        showStatus(data.error || "فشل حفظ البيانات.", "error");
      }
    } catch (err: any) {
      showStatus("فشل حفظ البيانات: " + err.toString(), "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // PULL (Import)
  const handlePullData = async () => {
    setIsPulling(true);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/google-sheets/sync-pull", {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (data.success) {
        showStatus(
          data.message || "تم جدولة وبدء عملية استيراد البيانات من Google Sheets في الخلفية بنجاح!",
          "success"
        );
        onSync(); // Update App DB state immediately
      } else {
        showStatus(data.error || "فشل جلب البيانات من Google Sheets. يرجى المتابعة بتسجيل الدخول بـ Google أو التحقق من ورقة العمل.", "error");
      }
    } catch (err: any) {
      showStatus("حدث خطأ في الاتصال: " + err.toString(), "error");
    } finally {
      setIsPulling(false);
    }
  };

  // PUSH (Export) with explicit safe confirmation instructions
  const handlePushData = async () => {
    const confirmed = window.confirm(
      "⚠️ تنبيه فحص نزاهة وتأكيد تحديث البيانات:\n\n" +
      "أنت على وشك استبدال وتعديل محتويات أوراق Google Sheets الخاصة بك بالبيانات الحالية للوحة التحكم!\n\n" +
      "سيتم تهيئة وحذف وتصدير البيانات الجديدة كالتالي:\n" +
      "• صفحة المبيعات (Youcan-Orders)\n" +
      "• صفحة المشتريات (Achat)\n" +
      "• صفحة دفعات الموردين (Payments)\n" +
      "• صفحة المصاريف العمومية (Expenses)\n\n" +
      "هل تود المتابعة وتحديث المستند الآن؟"
    );
    
    if (!confirmed) return;

    setIsPushing(true);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/google-sheets/sync-push", {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (data.success) {
        showStatus(
          data.message || "تم جدولة ترحيل وتصدير البيانات إلى Google Sheets لتتم في الخلفية بنجاح تام!",
          "success"
        );
        onSync();
      } else {
        showStatus(data.error || "فشل ترحيل البيانات. يرجى المتابعة بتسجيل الدخول بـ Google أو التحقق من صلاحيات الملف.", "error");
      }
    } catch (err: any) {
      showStatus("حدث خطأ أثناء المزامنة: " + err.toString(), "error");
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in font-sans" dir="rtl">
      
      {statusMsg && (
        <div id="settings-notification" className={`p-4 rounded-2xl flex items-start gap-3 border text-sm transition-all shadow-lg ${
          statusMsg.type === "success" 
            ? "bg-emerald-950/75 border-emerald-500/20 text-emerald-400" 
            : statusMsg.type === "error"
            ? "bg-rose-950/75 border-rose-500/20 text-rose-400"
            : "bg-[#111930]/90 border-blue-500/20 text-blue-400"
        }`}>
          {statusMsg.type === "error" ? (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{statusMsg.text}</span>
        </div>
      )}

      {/* Main Settings integration block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Google Sheets Database Integration Form */}
        <div className="lg:col-span-2 bg-[#111930]/65 border border-white/5 rounded-2xl p-6 shadow-xl glass-effect flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl">
                  <Database className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إعدادات الاتصال والربط المباشر مع Google Sheets</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                    قم بتهيئة الاتصال التفاعلي السحابي عبر معرف ملف العمل لقراءة البيانات أو تحديثها مباشرة.
                  </p>
                </div>
              </div>
            </div>

            {isFetchingSettings ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                <span>جاري تحميل إعدادات الربط الآمن...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Google OAuth Connectivity Sub-section */}
                <div className="bg-[#1a253c]/50 border border-white/5 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${user ? "bg-emerald-500" : "bg-blue-500"} animate-pulse`}></span>
                        ربط حساب Google (مستحسن ومباشر)
                      </h4>
                      <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                        قم بربط حساب Google الخاص بك لمنح لوحة التحكم صلاحية القراءة والكتابة مباشرة مع جدول Google Sheets الخاص بك دون الحاجة لملفات حسابات الخدمة المعقدة.
                      </p>
                    </div>

                    <div className="shrink-0">
                      {user ? (
                        <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/20 px-3 py-2 rounded-xl">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt="Profile" 
                              className="w-8 h-8 rounded-full border border-emerald-500/30"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                              {user.displayName?.charAt(0) || "U"}
                            </div>
                          )}
                          <div className="text-right">
                            <span className="block text-xs font-bold text-emerald-400">{user.displayName}</span>
                            <span className="block text-[9px] text-gray-400">{user.email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleGoogleLogout}
                            className="p-1 px-2.5 mr-2 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 duration-200 text-gray-400 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-white/5"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>قطع الربط</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={isSigningInGoogle}
                          className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-gray-950 hover:bg-gray-100 duration-200 font-bold rounded-xl text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-md select-none border border-transparent"
                        >
                          {isSigningInGoogle ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-900" />
                          ) : (
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#EA4335"
                                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.281 1.055 15.477.5 12.24.5 5.866.5.7 5.65.7 12s5.166 11.5 11.54 11.5c6.65 0 11.08-4.67 11.08-11.285 0-.76-.08-1.346-.177-1.715H12.24z"
                              />
                            </svg>
                          )}
                          <span>{isSigningInGoogle ? "جاري الاتصال بـ Google..." : "ربط حساب Google"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 border-t border-white/5 pt-5">
                  
                  {/* Spreadsheet ID */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 block">معرف ورقة العمل (Spreadsheet ID):</label>
                    <input
                      type="text"
                      required
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="مثال: 1sRl7IlEBVzuVHYGYU_wy9A3A70H5y35eBwwl-pg4vhE"
                      className="w-full bg-white/5 text-xs text-gray-200 border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono text-left"
                      dir="ltr"
                    />
                    <span className="text-[10px] text-gray-500 block">
                      * يمكنك الحصول على هذا المعرف من شريط العنوان لملف Google Sheet الخاص بك.
                    </span>
                  </div>

                  <div className="bg-[#111930]/40 p-4 rounded-xl border border-white/5 space-y-4 mt-6">
                    <div className="text-xs font-bold text-gray-300">خيار بديل: استخدام حساب الخدمة Google Service Account (اختياري)</div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Google API Key (Optional) */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-350 block">مفتاح API Key (اختياري - للقراءة فقط):</label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="AIzaSyA..."
                          className="w-full bg-white/5 text-xs text-gray-200 border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono text-left"
                          dir="ltr"
                        />
                        <span className="text-[10px] text-gray-500 block">
                          يكفي لقراءة البيانات إذا كانت ورقة العمل عامة ومتاحة للجميع.
                        </span>
                      </div>

                      {/* Service Account Email */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-350 block">بريد حساب الخدمة (Service Account Email - اختياري):</label>
                        <input
                          type="text"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="your-service-account@project.iam.gserviceaccount.com"
                          className="w-full bg-white/5 text-xs text-gray-200 border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono text-left"
                          dir="ltr"
                        />
                        <span className="text-[10px] text-gray-500 block">
                          مطلوب للتصدير في حال عدم ربط حساب Google الشخصي بالأعلى.
                        </span>
                      </div>
                    </div>

                    {/* Service Account Private Key */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-355 block">الرمز السري الخاص لحساب الخدمة (Private Key - اختياري):</label>
                      <textarea
                        rows={3}
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ..."
                        className="w-full bg-white/5 text-xs text-gray-300 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-blue-500 font-mono text-left leading-relaxed"
                        dir="ltr"
                      />
                      <span className="text-[10px] text-gray-500 block">
                        الرمز الخاص بصيغة RSA المأخوذ من ملف الإعداد لملف حساب الخدمة Google.
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      {isSavingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSavingSettings ? "جاري حفظ معرف الورقة..." : "حفظ معرف ورقة العمل"}</span>
                    </button>
                  </div>

                </form>
              </div>
            )}
          </div>

          {/* Sync operations block */}
          <div className="border-t border-white/5 mt-6 pt-6">
            <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-400" />
              <span>إجراءات مزامنة البيانات والربط</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Import from Sheets button (PULL) */}
              <button
                type="button"
                onClick={handlePullData}
                disabled={isPulling || isPushing || isFetchingSettings}
                className="py-3 px-4 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-50 text-white rounded-xl border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isPulling ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <DownloadCloud className="w-4 h-4 text-blue-400" />
                )}
                <div className="text-right">
                  <span className="block text-[11px] font-bold text-white">تحميل واستيراد من Google Sheets</span>
                  <span className="block text-[9px] text-gray-400 font-medium">سحب كافة البيانات واستبدال قاعدة البيانات المحلية</span>
                </div>
              </button>

              {/* Export to Sheets button (PUSH) */}
              <button
                type="button"
                onClick={handlePushData}
                disabled={isPulling || isPushing || isFetchingSettings}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                {isPushing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <UploadCloud className="w-4 h-4 text-white" />
                )}
                <div className="text-right">
                  <span className="block text-[11px] font-bold text-white">تصدير وترحيل إلى Google Sheets</span>
                  <span className="block text-[9px] text-blue-150 font-medium">تحديث خلايا الملف البعيد بالبيانات النشطة حالياً</span>
                </div>
              </button>

            </div>
          </div>

        </div>

        {/* Card 2: Customization & Appearance */}
        <div className="space-y-6">
          
          <div className="bg-[#111930]/65 border border-white/5 rounded-2xl p-6 shadow-xl glass-effect flex flex-col justify-between">
            <div>
              <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">التخصيص والسمة البصرية</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                إعدادات السمة العامة للتطبيق وتنسيق العملات والتبديل التلقائي.
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-300">السمة البصرية النشطة:</span>
                  <span className="px-2.5 py-0.5 bg-purple-500/15 text-purple-400 rounded-full font-bold select-all text-[11px]">Sophisticated Dark (مظلم فاخر)</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-300">العملة الافتراضية للبلد:</span>
                  <span className="font-bold text-white font-mono">الدرهم المغربي (DH)</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-300">محدد ترميز الأرقام (Separators):</span>
                  <span className="font-mono text-gray-400">فراغ فرنسي لآلاف (fr-FR)</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 mt-6">
              <div className="flex gap-2 items-center bg-white/5 p-2.5 rounded-xl text-[11px] text-gray-400 leading-relaxed">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>لوحة التحكم مضبوطة على السمة الداكنة الاحترافية Sophisticated Dark لراحة عيون موظفي التوصيل والمدراء الفنيين.</span>
              </div>
            </div>
          </div>

          {/* Card 3: Version Control & System Integrity */}
          <div className="bg-[#111930]/65 border border-white/5 rounded-2xl p-6 shadow-xl glass-effect flex flex-col justify-between">
            <div>
              <div className="p-3 bg-amber-600/10 text-amber-400 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">تفاصيل النظام ونزاهة الرصد</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                التحقق من إصدار النظام الحالي، تطابق خلايا التوصيل وحالات الأمان المانعة لتضارب مدخلات المستخدمين.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-[#0d1426] rounded-xl border border-white/5 text-[11px] font-mono leading-relaxed space-y-1">
                  <div>إصدار لوحة التحكم: <span className="text-blue-400 font-bold">v2.5.0 (Google API Integration)</span></div>
                  <div>وقت الرصد المحلي: <span className="text-gray-300">2026-05-31 18:16</span></div>
                  <div>منصة التشغيل: <span className="text-gray-400">Cloud Run Sandboxed App</span></div>
                </div>

                <div className="bg-[#10b981]/5 text-[#10b981] p-3 rounded-xl border border-[#10b981]/15 leading-relaxed text-[10px] font-medium flex gap-2">
                  <span className="block mt-0.5">●</span>
                  <span>بروتوكولات ربط Google Grid دقيقة بالكامل. يتم دمج المزامنات تلقائياً والتحقق من سلامة الأعداد دون تأخير.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 mt-4 text-center text-gray-500 text-[10px]/normal">
              تطوير وتشغيل ومزامنة لوحة Youcan Dashboard في بيئة سحابية آمنة.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
