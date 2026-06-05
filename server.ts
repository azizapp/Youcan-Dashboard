import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const app = express();
const PORT = 3000;

// Determine if we are running in a serverless environment (either Vercel or any other cloud serverless engine)
const isServerless = !!(global as any).__is_serverless_handler || !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.NETLIFY;
const isVercel = !!process.env.VERCEL;
const rootDir = process.cwd();
let DB_FILE = path.join(rootDir, "data", "db.json");

// Ensure the local data directory exists when running locally
const localDataDir = path.join(rootDir, "data");
if (!isServerless && !fs.existsSync(localDataDir)) {
  try {
    fs.mkdirSync(localDataDir, { recursive: true });
    console.log(`Created database directory at: ${localDataDir}`);
  } catch (err) {
    console.error("Failed to create local data directory:", err);
  }
}

// In serverless environments, copy to/use writable /tmp/db.json
const useTmpDb = isServerless;

if (useTmpDb) {
  const tmpDbFile = "/tmp/db.json";
  if (!fs.existsSync(tmpDbFile)) {
    const possiblePaths = [
      path.join(rootDir, "data", "db.json"),
      path.join(rootDir, "db.json"),
      path.join(rootDir, "..", "data", "db.json"),
    ];
    let copied = false;
    for (const srcDb of possiblePaths) {
      if (fs.existsSync(srcDb)) {
        try {
          fs.copyFileSync(srcDb, tmpDbFile);
          console.log(`Copied database successfully from ${srcDb} to ${tmpDbFile}`);
          copied = true;
          break;
        } catch (err) {
          console.error(`Failed to copy db.json from ${srcDb} to /tmp/db.json:`, err);
        }
      }
    }
  }
  DB_FILE = tmpDbFile;
  console.log(`Database file path initialized to writable location: ${DB_FILE}`);
}

app.use(express.json());

// Initialize database if not exists
function ensureDbExists() {
  const dir = path.dirname(DB_FILE);
  if (dir && dir !== "/" && dir !== "/tmp" && !fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn("Warning: Could not create DB directory, proceeding anyway:", err);
    }
  }
  
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      sales: [
        {
          _rowNum: 2,
          "Order ID": "WSP-0001",
          "Order date": "2026-05-25",
          "Full name": "محمد العلمي",
          "Phone": "0661234567",
          "City": "الدار البيضاء",
          "Region": "الدار البيضاء",
          "Product name": "AIRFRY",
          "Product URL": "https://yourstore.com/products/airfryer",
          "Variant price": 499,
          "Total quantity": 1,
          "Total price": 499,
          "Condition": "Confirmed",
          "Livreur": "CATHEDIS Express",
          "delivery": "Delivered",
          "prix d'achat": 250,
          "Frais livraison": 40,
          "Bénéfice": 209,
          "Fournisseur": "مورد الشمال",
          "Fourni price": 250,
          "WHATSAPP": "https://wa.me/212661234567"
        },
        {
          _rowNum: 3,
          "Order ID": "WSP-0002",
          "Order date": "2026-05-26",
          "Full name": "فاطمة الزهراء الإدريسي",
          "Phone": "0650123456",
          "City": "الرباط",
          "Region": "الرباط",
          "Product name": "CHOPPER",
          "Product URL": "https://yourstore.com/products/chopper",
          "Variant price": 220,
          "Total quantity": 2,
          "Total price": 440,
          "Condition": "Confirmed",
          "Livreur": "CATHEDIS Fast",
          "delivery": "Delivered",
          "prix d'achat": 90,
          "Frais livraison": 40,
          "Bénéfice": 220,
          "Fournisseur": "مورد الشمال",
          "Fourni price": 180,
          "WHATSAPP": "https://wa.me/212650123456"
        },
        {
          _rowNum: 4,
          "Order ID": "WSP-0003",
          "Order date": "2026-05-27",
          "Full name": "يوسف بناني",
          "Phone": "0663456789",
          "City": "مراكش",
          "Region": "مراكش",
          "Product name": "DESKLAMP",
          "Product URL": "https://yourstore.com/products/desklamp",
          "Variant price": 120,
          "Total quantity": 1,
          "Total price": 120,
          "Condition": "Confirmed",
          "Livreur": "CATHEDIS Premium",
          "delivery": "Delivered",
          "prix d'achat": 40,
          "Frais livraison": 40,
          "Bénéfice": 40,
          "Fournisseur": "العلا للتجارة",
          "Fourni price": 40,
          "WHATSAPP": "https://wa.me/212663456789"
        },
        {
          _rowNum: 5,
          "Order ID": "WSP-0004",
          "Order date": "2026-05-28",
          "Full name": "سارة التازي",
          "Phone": "0771239876",
          "City": "طنجة",
          "Region": "طنجة",
          "Product name": "EARBUDS",
          "Product URL": "https://yourstore.com/products/earbuds",
          "Variant price": 150,
          "Total quantity": 1,
          "Total price": 0,
          "Condition": "Anule",
          "Livreur": "CATHEDIS Express",
          "delivery": "Retour",
          "prix d'achat": 0,
          "Frais livraison": 0,
          "Bénéfice": 0,
          "Fournisseur": "",
          "Fourni price": 0,
          "WHATSAPP": "https://wa.me/212771239876"
        },
        {
          _rowNum: 6,
          "Order ID": "WSP-0005",
          "Order date": "2026-05-29",
          "Full name": "أمين بن جيلون",
          "Phone": "0661122334",
          "City": "فاس",
          "Region": "فاس",
          "Product name": "AIRFRY",
          "Product URL": "https://yourstore.com/products/airfryer",
          "Variant price": 499,
          "Total quantity": 1,
          "Total price": 0,
          "Condition": "Confirmed",
          "Livreur": "CATHEDIS Express",
          "delivery": "Client Injoignable",
          "prix d'achat": 0,
          "Frais livraison": 0,
          "Bénéfice": 0,
          "Fournisseur": "",
          "Fourni price": 0,
          "WHATSAPP": "https://wa.me/212661122334"
        }
      ],
      purchases: [
        {
          _rowNum: 2,
          "ID": "ACH-0001",
          "date": "2026-05-15",
          "nombre": 10,
          "Produit": "قلاية هوائية ذكية",
          "Code": "AIRFRY",
          "Prix Unit": 250,
          "total": 2500,
          "Fournisseur": "مورد الشمال",
          "Prix de vente": 499
        },
        {
          _rowNum: 3,
          "ID": "ACH-0002",
          "date": "2026-05-16",
          "nombre": 20,
          "Produit": "مفرمة خضار كهربائية",
          "Code": "CHOPPER",
          "Prix Unit": 90,
          "total": 1800,
          "Fournisseur": "مورد الشمال",
          "Prix de vente": 220
        },
        {
          _rowNum: 4,
          "ID": "ACH-0003",
          "date": "2026-05-17",
          "nombre": 15,
          "Produit": "مصباح مكتبي إل إي دي",
          "Code": "DESKLAMP",
          "Prix Unit": 40,
          "total": 600,
          "Fournisseur": "العلا للتجارة",
          "Prix de vente": 120
        },
        {
          _rowNum: 5,
          "ID": "ACH-0004",
          "date": "2026-05-18",
          "nombre": 30,
          "Produit": "سماعات بلوتوث رياضية",
          "Code": "EARBUDS",
          "Prix Unit": 60,
          "total": 1800,
          "Fournisseur": "مورد الدار البيضاء",
          "Prix de vente": 150
        }
      ],
      payments: [
        {
          _rowNum: 2,
          "ID": "PAY-0001",
          "date": "2026-05-20",
          "Payment": 1500,
          "Fournisseur": "مورد الشمال"
        },
        {
          _rowNum: 3,
          "ID": "PAY-0002",
          "date": "2026-05-22",
          "Payment": 500,
          "Fournisseur": "العلا للتجارة"
        }
      ],
      expenses: [
        {
          _rowNum: 2,
          "ID": "EXP-0001",
          "date": "2026-05-24",
          "Prix": 150,
          "Taper": "إعلانات فيسبوك"
        },
        {
          _rowNum: 3,
          "ID": "EXP-0002",
          "date": "2026-05-27",
          "Prix": 300,
          "Taper": "إعلانات تيك توك"
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

function readDb() {
  ensureDbExists();
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  if (!db.googleSheetsSettings) {
    db.googleSheetsSettings = {
      spreadsheetId: "1sRl7IlEBVzuVHYGYU_wy9A3A70H5y35eBwwl-pg4vhE",
      clientEmail: "",
      privateKey: "",
      apiKey: ""
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  }
  return db;
}

function writeDb(data: any) {
  ensureDbExists();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function autoPushToGoogleSheets(sheetName: string, userAccessToken?: string): Promise<boolean> {
  try {
    const db = readDb();
    const settings = db.googleSheetsSettings;
    if (!settings || !settings.spreadsheetId) {
      console.log("No spreadsheetId configured. Skipping auto-push.");
      return false;
    }
    
    // Check if we have credentials to push
    const hasCreds = userAccessToken || (settings.clientEmail && settings.privateKey);
    if (!hasCreds) {
      console.log("No credentials (user token or service account email/key) for auto-push to Google Sheets.");
      return false;
    }
    
    let targetArray: any[] = [];
    let headers: string[] = [];
    if (sheetName === "Youcan-Orders") {
      targetArray = db.sales;
      headers = [
        "Order ID", "Order date", "Full name", "Phone", "City", "Region", 
        "Product name", "Product URL", "Variant price", "Total quantity", 
        "Total price", "Condition", "Livreur", "delivery", "prix d'achat", 
        "Frais livraison", "Bénéfice", "Fournisseur", "Fourni price", "WHATSAPP"
      ];
    } else if (sheetName === "Achat") {
      targetArray = db.purchases;
      headers = ["ID", "date", "nombre", "Produit", "Code", "Prix Unit", "total", "Fournisseur", "Prix de vente"];
    } else if (sheetName === "Payments") {
      targetArray = db.payments;
      headers = ["ID", "date", "Payment", "Fournisseur"];
    } else if (sheetName === "Expenses") {
      targetArray = db.expenses;
      headers = ["ID", "date", "Prix", "Taper"];
    } else {
      console.warn(`Unknown sheetName for auto-push: ${sheetName}`);
      return false;
    }
    
    const rows = formatObjectsToSheetRows(targetArray, headers);
    await writeValuesToSheet(settings.spreadsheetId, sheetName, rows, settings, userAccessToken);
    return true;
  } catch (err) {
    console.error(`Auto-push to Google Sheets failed for ${sheetName}:`, err);
    return false;
  }
}

let SYNC_FILE = path.join(rootDir, "data", "background_sync.json");
if (isServerless) {
  SYNC_FILE = "/tmp/background_sync.json";
}

// Ensure the sync configuration file exists and initialize defaults
function ensureSyncFileExists() {
  const dir = path.dirname(SYNC_FILE);
  if (dir && dir !== "/" && dir !== "/tmp" && !fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn("Could not create sync directory:", err);
    }
  }

  if (!fs.existsSync(SYNC_FILE)) {
    const initialSyncState = {
      status: "idle", // "idle", "syncing", "error"
      lastSyncTime: new Date().toISOString(),
      lastError: null,
      queue: [] // Array of { type: "push" | "pull", sheetName?: string, userAccessToken?: string }
    };
    fs.writeFileSync(SYNC_FILE, JSON.stringify(initialSyncState, null, 2), "utf8");
  }
}

function readSyncState() {
  ensureSyncFileExists();
  try {
    return JSON.parse(fs.readFileSync(SYNC_FILE, "utf8"));
  } catch (err) {
    console.error("Error reading sync state, resetting:", err);
    const initialSyncState = {
      status: "idle",
      lastSyncTime: new Date().toISOString(),
      lastError: null,
      queue: []
    };
    fs.writeFileSync(SYNC_FILE, JSON.stringify(initialSyncState, null, 2), "utf8");
    return initialSyncState;
  }
}

function writeSyncState(state: any) {
  ensureSyncFileExists();
  fs.writeFileSync(SYNC_FILE, JSON.stringify(state, null, 2), "utf8");
}

let isProcessingSync = false;

// Pull from Google Sheets in the background dynamically updating local db.json
async function performBackgroundPull(userAccessToken?: string): Promise<void> {
  const db = readDb();
  const settings = db.googleSheetsSettings;
  
  if (!settings || !settings.spreadsheetId) {
    throw new Error("لم يتم تكوين معرف ورقة العمل داصبورد (Spreadsheet ID)!");
  }
  
  const spreadsheetId = settings.spreadsheetId;
  const hasCreds = !!userAccessToken || (!!settings.clientEmail && !!settings.privateKey) || !!settings.apiKey;
  if (!hasCreds) {
    throw new Error("يتطلب جلب البيانات تفعيل تسجيل الدخول بـ Google أو إدخال حساب خدمة Google Service Account.");
  }
  
  const salesHeaders = [
    "Order ID", "Order date", "Full name", "Phone", "City", "Region", 
    "Product name", "Product URL", "Variant price", "Total quantity", 
    "Total price", "Condition", "Livreur", "delivery", "prix d'achat", 
    "Frais livraison", "Bénéfice", "Fournisseur", "Fourni price", "WHATSAPP"
  ];
  const purchasesHeaders = ["ID", "date", "nombre", "Produit", "Code", "Prix Unit", "total", "Fournisseur", "Prix de vente"];
  const paymentsHeaders = ["ID", "date", "Payment", "Fournisseur"];
  const expensesHeaders = ["ID", "date", "Prix", "Taper"];
  
  console.log(`[Background Sync] Starting data pull from Sheets spreadsheet: ${spreadsheetId}`);
  
  let salesRaw: any[][] | null = null;
  let purchasesRaw: any[][] | null = null;
  let paymentsRaw: any[][] | null = null;
  let expensesRaw: any[][] | null = null;
  
  let fetchedAtLeastOne = false;
  let lastError: any = null;

  try {
    salesRaw = await fetchValuesFromSheet(spreadsheetId, "Youcan-Orders", settings, userAccessToken);
    fetchedAtLeastOne = true;
  } catch (e: any) {
    console.warn("[Background Sync] Skipped/Failed Youcan-Orders:", e);
    lastError = e;
  }

  try {
    purchasesRaw = await fetchValuesFromSheet(spreadsheetId, "Achat", settings, userAccessToken);
    fetchedAtLeastOne = true;
  } catch (e: any) {
    console.warn("[Background Sync] Skipped/Failed Achat:", e);
    if (!lastError) lastError = e;
  }

  try {
    paymentsRaw = await fetchValuesFromSheet(spreadsheetId, "Payments", settings, userAccessToken);
    fetchedAtLeastOne = true;
  } catch (e: any) {
    console.warn("[Background Sync] Skipped/Failed Payments:", e);
    if (!lastError) lastError = e;
  }

  try {
    expensesRaw = await fetchValuesFromSheet(spreadsheetId, "Expenses", settings, userAccessToken);
    fetchedAtLeastOne = true;
  } catch (e: any) {
    console.warn("[Background Sync] Skipped/Failed Expenses:", e);
    if (!lastError) lastError = e;
  }

  if (!fetchedAtLeastOne && lastError) {
    throw lastError;
  }
  
  if (salesRaw) db.sales = parseSheetRowsToObjects(salesRaw, salesHeaders);
  if (purchasesRaw) db.purchases = parseSheetRowsToObjects(purchasesRaw, purchasesHeaders);
  if (paymentsRaw) db.payments = parseSheetRowsToObjects(paymentsRaw, paymentsHeaders);
  if (expensesRaw) db.expenses = parseSheetRowsToObjects(expensesRaw, expensesHeaders);
  
  writeDb(db);
  console.log("[Background Sync] Successfully updated local db.json with pulled records.");
}

async function processSyncQueue() {
  if (isProcessingSync) return;
  isProcessingSync = true;
  
  try {
    const syncState = readSyncState();
    if (syncState.queue.length === 0) {
      isProcessingSync = false;
      return;
    }
    
    syncState.status = "syncing";
    syncState.lastError = null;
    writeSyncState(syncState);
    
    while (syncState.queue.length > 0) {
      const task = syncState.queue[0];
      console.log(`[Background Sync Queue] Executing task of type "${task.type}" for ${task.sheetName || "all sheets"}`);
      
      try {
        if (task.type === "push") {
          await autoPushToGoogleSheets(task.sheetName, task.userAccessToken);
        } else if (task.type === "pull") {
          await performBackgroundPull(task.userAccessToken);
        }
        
        // Success: reload sync state, shift first item, log time
        const stateToUpdate = readSyncState();
        stateToUpdate.queue.shift();
        stateToUpdate.lastSyncTime = new Date().toISOString();
        stateToUpdate.lastError = null;
        writeSyncState(stateToUpdate);
      } catch (err: any) {
        console.error("[Background Sync Queue] Critical error executing task:", err);
        const stateToUpdate = readSyncState();
        stateToUpdate.status = "error";
        stateToUpdate.lastError = err.message || err.toString();
        // Remove failing/stuck tasks to prevent infinite crash loop
        stateToUpdate.queue.shift();
        writeSyncState(stateToUpdate);
        break; // Stop and let next execution cycle retry or diagnostic
      }
    }
    
    const finalSyncState = readSyncState();
    if (finalSyncState.queue.length === 0 && finalSyncState.status !== "error") {
      finalSyncState.status = "idle";
      writeSyncState(finalSyncState);
    }
  } catch (e) {
    console.error("[Background Sync Queue] Runner exception:", e);
  } finally {
    isProcessingSync = false;
  }
}

function addSyncTask(type: "push" | "pull", sheetName?: string, userAccessToken?: string) {
  const syncState = readSyncState();
  
  // Guard against duplicate redundant tasks already in queue
  const isDuplicate = syncState.queue.some((task: any) => {
    return task.type === type && task.sheetName === sheetName;
  });
  
  if (!isDuplicate) {
    syncState.queue.push({
      type,
      sheetName,
      userAccessToken,
      timestamp: new Date().toISOString()
    });
    if (syncState.status === "idle") {
      syncState.status = "pending";
    }
    writeSyncState(syncState);
  }
  
  processSyncQueue().catch(err => {
    console.error("[Background Sync] Failed to process queue immediately:", err);
  });
}

// Normalize Header Helper (same as in Code.gs)
function normalizeHeader(h: any): string {
  if (h === null || h === undefined) return "";
  let str = h.toString();
  str = str.replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

// Get Sheet Data Endpoint
app.get("/api/get-sheet", (req, res) => {
  try {
    const sheetName = req.query.sheetName as string || "Youcan-Orders";
    const db = readDb();
    
    let targetArray: any[] = [];
    let headers: string[] = [];
    
    if (sheetName === "Youcan-Orders") {
      targetArray = db.sales || [];
      headers = [
        "Order ID", "Order date", "Full name", "Phone", "City", "Region", 
        "Product name", "Product URL", "Variant price", "Total quantity", 
        "Total price", "Condition", "Livreur", "delivery", "prix d'achat", 
        "Frais livraison", "Bénéfice", "Fournisseur", "Fourni price", "WHATSAPP"
      ];
    } else if (sheetName === "Achat") {
      targetArray = db.purchases || [];
      headers = ["ID", "date", "nombre", "Produit", "Code", "Prix Unit", "total", "Fournisseur", "Prix de vente"];
    } else if (sheetName === "Payments") {
      targetArray = db.payments || [];
      headers = ["ID", "date", "Payment", "Fournisseur"];
    } else if (sheetName === "Expenses") {
      targetArray = db.expenses || [];
      headers = ["ID", "date", "Prix", "Taper"];
    } else {
      return res.status(400).json({ success: false, error: `Sheet "${sheetName}" not found.` });
    }
    
    res.json({
      success: true,
      sheetName: sheetName,
      headers: headers.map(normalizeHeader),
      rows: targetArray
    });
  } catch (err: any) {
    console.error("Error in get-sheet:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Internal Server Error", 
      stack: err.stack,
      dbFile: DB_FILE,
      isVercel: isVercel
    });
  }
});

// Save Generic Row Endpoint
app.post("/api/save-generic", async (req, res) => {
  const { sheetName, rowNum, values } = req.body;
  if (!sheetName) {
    return res.status(400).json({ success: false, error: "Missing sheetName" });
  }
  
  try {
    const db = readDb();
    let currentArray: any[] = [];
    let key = "";
    
    if (sheetName === "Youcan-Orders") {
      currentArray = db.sales;
      key = "sales";
    } else if (sheetName === "Achat") {
      currentArray = db.purchases;
      key = "purchases";
    } else if (sheetName === "Payments") {
      currentArray = db.payments;
      key = "payments";
    } else if (sheetName === "Expenses") {
      currentArray = db.expenses;
      key = "expenses";
    } else {
      return res.status(400).json({ success: false, error: `Invalid sheetName: ${sheetName}` });
    }
    
    // Numeric Column Conversions
    const numCols = [
      'Variant price', 'Total quantity', 'Total price', "prix d'achat", 
      'Frais livraison', 'Bénéfice', 'Fourni price', 'nombre', 
      'Prix Unit', 'total', 'Payment', 'Prix de vente', 'Prix'
    ];
    
    const formattedValues = { ...values };
    for (const k in formattedValues) {
      if (numCols.includes(k)) {
        const p = parseFloat(formattedValues[k]);
        if (!isNaN(p)) {
          formattedValues[k] = p;
        } else {
          formattedValues[k] = 0;
        }
      }
    }
    
    if (rowNum && rowNum >= 2) {
      // Edit mode (rowNum corresponds to _rowNum)
      const idx = currentArray.findIndex(r => r._rowNum === rowNum);
      if (idx !== -1) {
        currentArray[idx] = { ...currentArray[idx], ...formattedValues };
      } else {
        return res.status(404).json({ success: false, error: "Row not found for updating" });
      }
    } else {
      // Add mode
      // Calculate a new rowNum
      const nextRowNum = currentArray.reduce((max, r) => Math.max(max, r._rowNum || 1), 1) + 1;
      const nValues = { _rowNum: nextRowNum, ...formattedValues };
      currentArray.push(nValues);
    }
    
    // Save back to db
    db[key] = currentArray;
    writeDb(db);
    
    // Extract userAccessToken from Authorization header if present
    const authHeader = req.headers.authorization;
    let userAccessToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userAccessToken = authHeader.substring(7);
    }
    
    // Add background task to push update asynchronously
    addSyncTask("push", sheetName, userAccessToken);
    
    res.json({ success: true, message: "تم التغيير بنجاح وجاري المزامنة في الخلفية" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Delete Generic Row Endpoint
app.post("/api/delete-generic", async (req, res) => {
  const { sheetName, rowNum } = req.body;
  if (!sheetName || !rowNum) {
    return res.status(400).json({ success: false, error: "Missing sheetName or rowNum" });
  }
  
  try {
    const db = readDb();
    let currentArray: any[] = [];
    let key = "";
    
    if (sheetName === "Youcan-Orders") {
      currentArray = db.sales;
      key = "sales";
    } else if (sheetName === "Achat") {
      currentArray = db.purchases;
      key = "purchases";
    } else if (sheetName === "Payments") {
      currentArray = db.payments;
      key = "payments";
    } else if (sheetName === "Expenses") {
      currentArray = db.expenses;
      key = "expenses";
    } else {
      return res.status(400).json({ success: false, error: `Invalid sheetName: ${sheetName}` });
    }

    const idx = currentArray.findIndex(r => r._rowNum === rowNum);
    if (idx !== -1) {
      currentArray.splice(idx, 1);
      db[key] = currentArray;
      writeDb(db);
      
      const authHeader = req.headers.authorization;
      let userAccessToken: string | undefined;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        userAccessToken = authHeader.substring(7);
      }
      
      // Add background task to push delete asynchronously
      addSyncTask("push", sheetName, userAccessToken);
      
      res.json({ success: true, message: "تم الحذف بنجاح وجاري المزامنة في الخلفية" });
    } else {
      res.status(404).json({ success: false, error: "Row not found for deleting" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Update Order Row Endpoint (direct column updates, e.g. for inline updates/detail modals)
app.post("/api/update-order-row", async (req, res) => {
  const { sheetName, rowNum, updates } = req.body;
  const targetSheet = sheetName || "Youcan-Orders";
  
  if (!rowNum || rowNum < 2) {
    return res.status(400).json({ success: false, error: "Invalid rowNum" });
  }
  
  try {
    const db = readDb();
    let currentArray: any[] = [];
    let key = "";
    
    if (targetSheet === "Youcan-Orders") {
      currentArray = db.sales;
      key = "sales";
    } else if (targetSheet === "Achat") {
      currentArray = db.purchases;
      key = "purchases";
    } else if (targetSheet === "Payments") {
      currentArray = db.payments;
      key = "payments";
    } else if (targetSheet === "Expenses") {
      currentArray = db.expenses;
      key = "expenses";
    } else {
      return res.status(400).json({ success: false, error: `Invalid sheetName: ${targetSheet}` });
    }
    
    const idx = currentArray.findIndex(r => r._rowNum === rowNum);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Row not found in database" });
    }
    
    const numCols = [
      'Variant price', 'Total quantity', 'Total price', "prix d'achat", 
      'Frais livraison', 'Bénéfice', 'Fourni price', 'nombre', 
      'Prix Unit', 'total', 'Prix de vente', 'Prix', 'Payment'
    ];
    
    const rowObj = { ...currentArray[idx] };
    let cnt = 0;
    
    for (const k in updates) {
      let v = updates[k];
      if (numCols.includes(k)) {
        const p = parseFloat(v);
        v = !isNaN(p) ? p : 0;
      }
      rowObj[k] = v;
      cnt++;
    }
    
    currentArray[idx] = rowObj;
    db[key] = currentArray;
    writeDb(db);
    
    const authHeader = req.headers.authorization;
    let userAccessToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userAccessToken = authHeader.substring(7);
    }
    
    // Add background task to push update asynchronously
    addSyncTask("push", targetSheet, userAccessToken);
    
    res.json({ success: true, updatedColumns: cnt, message: "تم التعديل وجاري المزامنة في الخلفية" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// ==========================================
// GOOGLE SHEETS CORE API INTEGRATION METHODS
// ==========================================

// JWT generation for Google Service Account authentication
async function getGoogleToken(clientEmail: string, privateKey: string): Promise<string> {
  // Robust PEM private key formatter to handle any double-escapes, whitespace, or carriage return issues
  let cleaned = privateKey;
  
  // Auto-heal missing 'W' escape character issue if present
  if (cleaned.includes("YV22usP2") && !cleaned.includes("WYV22usP2")) {
    cleaned = cleaned.replace("YV22usP2", "WYV22usP2");
  }
  
  // Replace literal '\n' and '\r' strings with actual newlines
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\r/g, '\n');
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');
  
  // Clean all lines and filter out BEGIN/END header lines
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const base64BodyLines = lines.filter(line => {
    return !line.includes("-----BEGIN") && !line.includes("-----END");
  });
  
  // Re-join base64 content and strip any spaces/tabs/whitespace
  const base64Body = base64BodyLines.join("").replace(/\s/g, "");
  
  // Split into clean 64-character blocks
  const formattedBodyLines: string[] = [];
  for (let i = 0; i < base64Body.length; i += 64) {
    formattedBodyLines.push(base64Body.substring(i, i + 64));
  }
  
  // Re-assemble into absolute perfect PEM format
  const formattedPrivateKey = [
    "-----BEGIN PRIVATE KEY-----",
    ...formattedBodyLines,
    "-----END PRIVATE KEY-----"
  ].join("\n");
  
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  
  const base64UrlEncode = (obj: any) => {
    return Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  };
  
  const jwtHeader = base64UrlEncode(header);
  const jwtPayload = base64UrlEncode(payload);
  const signInput = `${jwtHeader}.${jwtPayload}`;
  
  let signature = "";
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signInput);
    signature = signer.sign(formattedPrivateKey, "base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  } catch (signErr: any) {
    console.error("Error signing JWT assertion with private key:", signErr);
    throw new Error(`فشل تشفير التوقيع للمفتاح الخاص (Private Key) لحساب خدمة Google Service Account: ${signErr.message}. يرجى التأكد من صحة نسخ المفتاح بالكامل.`);
  }
    
  const jwt = `${signInput}.${signature}`;
  
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth Auth Error: ${text}`);
  }
  
  const tokenData = await res.json() as { access_token: string };
  return tokenData.access_token;
}

// Fetch values from Google Sheet range
async function fetchValuesFromSheet(spreadsheetId: string, sheetRange: string, settings: any, userAccessToken?: string): Promise<any[][] | null> {
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetRange)}?valueRenderOption=FORMATTED_VALUE`;
  let headers: HeadersInit = {};
  
  if (userAccessToken) {
    headers["Authorization"] = `Bearer ${userAccessToken}`;
  } else if (settings.clientEmail && settings.privateKey) {
    const token = await getGoogleToken(settings.clientEmail, settings.privateKey);
    headers["Authorization"] = `Bearer ${token}`;
  } else if (settings.apiKey) {
    url += `&key=${settings.apiKey}`;
  } else {
    throw new Error("يتطلب جلب البيانات تفعيل تسجيل الدخول بـ Google أو إدخال حساب خدمة Google Service Account.");
  }
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`تعذر جلب البيانات من Spreadsheet: ${text}`);
  }
  
  const data = await res.json() as { values?: any[][] };
  return data.values || null;
}

// Write (Update) values to Google Sheet range
async function writeValuesToSheet(spreadsheetId: string, sheetName: string, values: any[][], settings: any, userAccessToken?: string): Promise<boolean> {
  let token = userAccessToken;
  
  if (!token) {
    if (settings.clientEmail && settings.privateKey) {
      token = await getGoogleToken(settings.clientEmail, settings.privateKey);
    } else {
      throw new Error("يتطلب تحديث البيانات (Push) تفعيل تسجيل الدخول بـ Google أو إدخال حساب الخدمة Google Service Account.");
    }
  }
  
  // Clear the existing items up to 2500 entries to avoid ghost remnants
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z2500:clear`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  } catch (clearErr) {
    console.error("Ignored buffer clear error:", clearErr);
  }
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      range: sheetName,
      majorDimension: "ROWS",
      values: values
    })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`فشل تحديث خلايا Google Sheets: ${text}`);
  }
  
  return true;
}

// REST ENDPOINTS FOR GOOGLE SHEETS SETUP

// 1. GET Settings
app.get("/api/google-sheets/settings", (req, res) => {
  try {
    const db = readDb();
    const settings = { ...db.googleSheetsSettings };
    // Mask private key for display security
    if (settings.privateKey) {
      settings.privateKey = "CONFIDENTIAL_KEY_STORED";
    }
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// 2. POST Settings
app.post("/api/google-sheets/settings", (req, res) => {
  try {
    const { spreadsheetId, clientEmail, privateKey, apiKey } = req.body;
    const db = readDb();
    
    const oldSettings = db.googleSheetsSettings || {};
    
    // If privateKey is "CONFIDENTIAL_KEY_STORED", preserve the original stored key!
    let finalPrivateKey = privateKey;
    if (privateKey === "CONFIDENTIAL_KEY_STORED") {
      finalPrivateKey = oldSettings.privateKey || "";
    }
    
    db.googleSheetsSettings = {
      spreadsheetId: spreadsheetId || "1sRl7IlEBVzuVHYGYU_wy9A3A70H5y35eBwwl-pg4vhE",
      clientEmail: clientEmail || "",
      privateKey: finalPrivateKey || "",
      apiKey: apiKey || ""
    };
    
    writeDb(db);
    res.json({ success: true, message: "تم حفظ إعدادات الربط بنجاح" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Helper for row parsing with number formatting casting
function parseSheetRowsToObjects(values: any[][], expectedHeaders: string[]): any[] {
  if (!values || values.length <= 1) return [];
  const rawHeaders = values[0].map(h => normalizeHeader(h));
  const objects: any[] = [];
  
  const numCols = [
    'Variant price', 'Total quantity', 'Total price', "prix d'achat", 
    'Frais livraison', 'Bénéfice', 'Fourni price', 'nombre', 
    'Prix Unit', 'total', 'Payment', 'Prix de vente', 'Prix'
  ];
  
  for (let r = 1; r < values.length; r++) {
    const rowValues = values[r];
    if (rowValues.length === 0 || rowValues.every(val => val === "" || val === null)) continue;
    
    const obj: any = { _rowNum: r + 1 };
    
    expectedHeaders.forEach(eh => {
      const idx = rawHeaders.indexOf(normalizeHeader(eh));
      if (idx !== -1 && idx < rowValues.length) {
        let val = rowValues[idx];
        if (val !== undefined && val !== null) {
          obj[eh] = val;
        } else {
          obj[eh] = "";
        }
      } else {
        obj[eh] = "";
      }
    });
    
    // cast numbers
    for (const k in obj) {
      if (numCols.includes(k)) {
        const strVal = String(obj[k] || "0").replace(/\s/g, '').replace(/DH/gi, '').trim();
        const p = parseFloat(strVal);
        obj[k] = !isNaN(p) ? p : 0;
      }
    }
    
    objects.push(obj);
  }
  return objects;
}

// 3. POST Sync Pull
app.post("/api/google-sheets/sync-pull", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userAccessToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userAccessToken = authHeader.substring(7);
    }
    
    // Add "pull" background task
    addSyncTask("pull", undefined, userAccessToken);
    
    res.json({ 
      success: true, 
      message: "تم بدء عملية جلب البيانات من Google Sheets في الخلفية." 
    });
  } catch (err: any) {
    console.error("Sync pull enqueue error:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Helper for formatting objects back into 2D sheet arrays
function formatObjectsToSheetRows(objects: any[], headers: string[]): any[][] {
  const rows: any[][] = [headers];
  objects.forEach(obj => {
    const row = headers.map(h => {
      const val = obj[h];
      return val !== undefined && val !== null ? val : "";
    });
    rows.push(row);
  });
  return rows;
}

// 4. POST Sync Push
app.post("/api/google-sheets/sync-push", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userAccessToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userAccessToken = authHeader.substring(7);
    }
    
    // Queue all four tables for sync-push in the background
    addSyncTask("push", "Youcan-Orders", userAccessToken);
    addSyncTask("push", "Achat", userAccessToken);
    addSyncTask("push", "Payments", userAccessToken);
    addSyncTask("push", "Expenses", userAccessToken);
    
    res.json({ 
      success: true, 
      message: "تم بدء عملية ترحيل وتحديث البيانات على Google Sheets في الخلفية بنجاح." 
    });
  } catch (err: any) {
    console.error("Sync push enqueue error:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// 5. GET Background Sync Status
app.get("/api/background-sync/status", (req, res) => {
  try {
    const state = readSyncState();
    res.json({
      success: true,
      status: state.status, // "idle", "syncing", "error", "pending"
      lastSyncTime: state.lastSyncTime,
      lastError: state.lastError,
      queueSize: state.queue?.length || 0
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Setup Vite & static serving
async function startServer() {
  // Start periodic background sync processor
  console.log("[Background Sync] Initializing active background task scheduler (5s interval)...");
  setInterval(() => {
    processSyncQueue().catch(err => {
      console.error("[Background Sync Scheduler Error]:", err);
    });
  }, 5000);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!isServerless) {
  startServer();
}

export default app;
