import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, SystemSettings, Office, FinancialYear } from "../../types";
import { apiFetch } from "../../api";
import {
  GlobalDocumentPadHeader,
  GlobalDocumentWatermark,
} from "../../utils/documentBranding";
import {
  LayoutDashboard,
  Package,
  Users,
  ArrowUpRight,
  FileText,
  History,
  ShoppingCart,
  Plus,
  Search,
  Menu,
  Building,
  Database,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

interface StockProToolProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  offices?: Office[];
  financialYears?: FinancialYear[];
  selectedFY?: string;
  onBack?: () => void;
}

export interface StockProduct {
  id: number;
  dbId?: string;
  name: string;
  sku: string;
  category: string;
  isSecurity?: boolean;
  unit?: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  isSerialized: boolean;
  padType: "regular" | "pad_only" | "pad_page";
  fromPad?: number | string;
  toPad?: number | string;
  startSerial?: number | string;
  endSerial?: number | string;
  pagesPerPad?: number;
}

export interface StockBranch {
  id: number;
  dbId?: string;
  name: string;
  phone: string;
  address: string;
  branch: string;
  district?: string;
}

export interface StockTransaction {
  id: number;
  productId: number;
  agentId?: number;
  type: "IN" | "OUT";
  quantity: number;
  date: string;
  note?: string;
  fromPad?: number | string;
  toPad?: number | string;
  startSerial?: number | string;
  endSerial?: number | string;
  padNumber?: string;
}

export interface VoucherPad {
  id: number;
  productId: number;
  agentId: number;
  padNumber: string;
  pageStart?: number;
  pageEnd?: number;
  currentPage?: number;
  issueDate: string;
  status: "Active" | "Exhausted";
}

export interface StockInvoiceItem {
  id: number;
  invoiceId: number;
  productId: number;
  productName?: string;
  sku?: string;
  category?: string;
  isSecurity?: boolean;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice?: number;
  padFrom?: number | string;
  padTo?: number | string;
  pageFrom?: number | string;
  pageTo?: number | string;
  remarks?: string;
}

export interface StockInvoice {
  id: number;
  date: string;
  agentId: number;
  branchName?: string;
  branchAddress?: string;
  branchDistrict?: string;
  totalAmount: number;
  linkedPadNo?: string;
  linkedPageNo?: number;
  despatchNo?: string;
  memoNo?: string;
  subject?: string;
  reference?: string;
  suppliedBy?: string;
  bearerName?: string;
  authorizedOfficer?: string;
  authorizedOfficerName?: string;
  authorizedOfficerDesignation?: string;
  specialNotes?: string;
  items?: StockInvoiceItem[];
}

const STORAGE_PREFIX = "flowboard_stockpro_";

export function StockProTool({ currentUser, systemSettings, offices, onBack }: StockProToolProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "products" | "agents" | "stockout" | "invoices" | "reports" | "settings"
  >("dashboard");

  // Mobile menu
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Products
  const [products, setProducts] = useState<StockProduct[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}products`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 1,
        name: "সঞ্চয়ী চেক বই (MICR)",
        sku: "SB-MICR-01",
        category: "Security Items",
        isSecurity: true,
        unit: "টি",
        purchasePrice: 65,
        sellingPrice: 80,
        stockQuantity: 100,
        isSerialized: true,
        padType: "pad_page",
        fromPad: "(0780961",
        toPad: "0780980)",
        pagesPerPad: 20,
      },
      {
        id: 2,
        name: "সঞ্চয়ী চেক বই (Non-MICR)",
        sku: "SB-NONMICR-02",
        category: "Security Items",
        isSecurity: true,
        unit: "টি",
        purchasePrice: 65,
        sellingPrice: 80,
        stockQuantity: 200,
        isSerialized: true,
        padType: "pad_page",
        fromPad: "3695001",
        toPad: "3696000",
        pagesPerPad: 20,
      },
      {
        id: 3,
        name: "ডেবিট ক্যাশ ভাউচার",
        sku: "DCV-003",
        category: "Security Items",
        isSecurity: true,
        unit: "টি",
        purchasePrice: 40,
        sellingPrice: 55,
        stockQuantity: 150,
        isSerialized: true,
        padType: "pad_only",
        fromPad: "12772001",
        toPad: "12772500",
        pagesPerPad: 100,
      },
      {
        id: 4,
        name: "ট্রান্সফার ভাউচার",
        sku: "TRV-004",
        category: "Security Items",
        isSecurity: true,
        unit: "টি",
        purchasePrice: 20,
        sellingPrice: 30,
        stockQuantity: 120,
        isSerialized: true,
        padType: "pad_only",
        fromPad: "6940001",
        toPad: "6940300",
        pagesPerPad: 100,
      },
      {
        id: 5,
        name: "এল. এফ. ৪৬",
        sku: "REG-LF46-05",
        category: "Non-Security",
        isSecurity: false,
        unit: "প্যাড",
        purchasePrice: 0,
        sellingPrice: 0,
        stockQuantity: 50,
        isSerialized: false,
        padType: "regular",
      },
      {
        id: 6,
        name: "ক্রেডিট ক্যাশ ভাউচার",
        sku: "CCV-006",
        category: "Security Items",
        isSecurity: true,
        unit: "টি",
        purchasePrice: 40,
        sellingPrice: 55,
        stockQuantity: 100,
        isSerialized: true,
        padType: "pad_only",
        fromPad: "13551001",
        toPad: "13551500",
        pagesPerPad: 100,
      },
      {
        id: 7,
        name: "চলতি হিসাব চেক বই (MICR)",
        sku: "CD-MICR-07",
        category: "Security Items",
        isSecurity: true,
        unit: "টি",
        purchasePrice: 95,
        sellingPrice: 120,
        stockQuantity: 40,
        isSerialized: true,
        padType: "pad_page",
        fromPad: "0890101",
        toPad: "0890150",
        pagesPerPad: 50,
      },
      {
        id: 8,
        name: "এ৪ অফসেট পেপার (রিম)",
        sku: "A4-008",
        category: "Non-Security",
        isSecurity: false,
        unit: "রিম",
        purchasePrice: 400,
        sellingPrice: 480,
        stockQuantity: 60,
        isSerialized: false,
        padType: "regular",
      },
    ];
  });

  // Branches / Agents
  const [branches, setBranches] = useState<StockBranch[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}branches`);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed with offices from system if available
    if (offices && offices.length > 0) {
      return offices.map((o, idx) => ({
        id: idx + 1,
        name: o.name,
        phone: "0180000000" + (idx + 1),
        address: o.address || "Rangamati",
        branch: o.name.replace(" শাখা", ""),
        district: "Rangamati",
      }));
    }
    return [
      { id: 1, name: "Barkal Branch", phone: "01820302571", address: "Barkal", branch: "Barkal Branch", district: "Rangamati" },
      { id: 2, name: "Rangamati Main Branch", phone: "01711223344", address: "Rangamati", branch: "Rangamati Main Branch", district: "Rangamati" },
      { id: 3, name: "Kaptai Branch", phone: "01911445566", address: "Kaptai", branch: "Kaptai Branch", district: "Rangamati" },
      { id: 4, name: "Longadu Branch", phone: "01611778899", address: "Longadu", branch: "Longadu Branch", district: "Rangamati" },
      { id: 5, name: "Kawkhali Branch", phone: "01811556677", address: "Kawkhali", branch: "Kawkhali Branch", district: "Rangamati" },
      { id: 6, name: "Baghaichhari Branch", phone: "01511998877", address: "Baghaichhari", branch: "Baghaichhari Branch", district: "Rangamati" },
    ];
  });

  // Voucher Pads
  const [voucherPads, setVoucherPads] = useState<VoucherPad[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}pads`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 1,
        productId: 1,
        agentId: 1,
        padNumber: "101",
        pageStart: 1,
        pageEnd: 100,
        currentPage: 45,
        issueDate: new Date().toISOString(),
        status: "Active",
      },
      {
        id: 2,
        productId: 2,
        agentId: 2,
        padNumber: "201",
        issueDate: new Date().toISOString(),
        status: "Active",
      },
    ];
  });

  // Invoices & Invoice Items
  const [invoices, setInvoices] = useState<StockInvoice[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}invoices`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 1001,
        date: new Date().toISOString(),
        agentId: 1,
        totalAmount: 2500,
        linkedPadNo: "101",
        linkedPageNo: 1,
        despatchNo: "আঃকাঃ/প্রশা-০১/২০২৫",
      },
      {
        id: 1002,
        date: new Date().toISOString(),
        agentId: 2,
        totalAmount: 1650,
        linkedPadNo: "201",
        linkedPageNo: 1,
        despatchNo: "আঃকাঃ/প্রশা-০২/২০২৫",
      },
    ];
  });

  const [invoiceItems, setInvoiceItems] = useState<StockInvoiceItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}invoice_items`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, invoiceId: 1001, productId: 1, quantity: 5, unitPrice: 500, padFrom: 101, padTo: 105, pageFrom: 1, pageTo: 500 },
      { id: 2, invoiceId: 1002, productId: 2, quantity: 3, unitPrice: 550, padFrom: 201, padTo: 203 },
    ];
  });

  // Stock Transactions
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}transactions`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, productId: 1, type: "IN", quantity: 20, date: new Date().toISOString(), note: "Initial Stock" },
      { id: 2, productId: 2, type: "IN", quantity: 15, date: new Date().toISOString(), note: "Initial Stock" },
      { id: 3, productId: 3, type: "IN", quantity: 40, date: new Date().toISOString(), note: "Initial Stock" },
    ];
  });

  const userOffice = offices?.find((o) => o.id === currentUser.officeId)?.name;



  const [dbSyncStatus, setDbSyncStatus] = useState<"synced" | "syncing" | "offline">("synced");
  const [isDbLoading, setIsDbLoading] = useState<boolean>(false);

  // Load from Central SQLite Database
  const fetchDbData = useCallback(async () => {
    setIsDbLoading(true);
    setDbSyncStatus("syncing");
    try {
      const [pRes, bRes, iRes, padRes] = await Promise.all([
        apiFetch("/api/stockproproducts"),
        apiFetch("/api/stockprobranches"),
        apiFetch("/api/stockproinvoices"),
        apiFetch("/api/stockprovoucherpads"),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          setProducts(
            pData.map((item: any, idx: number) => ({
              dbId: item.id ? String(item.id) : undefined,
              id: typeof item.id === "string" ? parseInt(item.id.replace(/\D/g, "") || String(idx + 1), 10) : (item.id || idx + 1),
              name: item.name || "Product",
              sku: item.sku || `SKU-${idx + 1}`,
              category: item.category || "Stationery",
              purchasePrice: Number(item.costPrice || item.purchasePrice || 80),
              sellingPrice: Number(item.sellingPrice || 110),
              stockQuantity: Number(item.stockQuantity || 0),
              isSerialized: item.padType !== "regular",
              padType: item.padType || "regular",
              fromPad: item.fromPad ? Number(item.fromPad) : undefined,
              toPad: item.toPad ? Number(item.toPad) : undefined,
              pagesPerPad: Number(item.perPadPages || 100),
            })),
          );
        }
      }

      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData) && bData.length > 0) {
          setBranches(
            bData.map((b: any, idx: number) => ({
              dbId: b.id ? String(b.id) : undefined,
              id: typeof b.id === "string" ? parseInt(b.id.replace(/\D/g, "") || String(idx + 1), 10) : (b.id || idx + 1),
              name: b.name || "Branch",
              phone: b.phone || "",
              address: b.address || "",
              branch: b.code || b.name.replace(" শাখা", ""),
            })),
          );
        }
      }

      if (iRes.ok) {
        const iData = await iRes.json();
        if (Array.isArray(iData) && iData.length > 0) {
          setInvoices(
            iData.map((inv: any, idx: number) => ({
              id: typeof inv.id === "string" ? parseInt(inv.id.replace(/\D/g, "") || String(idx + 1001), 10) : (inv.id || idx + 1001),
              date: inv.date || new Date().toISOString(),
              agentId: typeof inv.agentId === "string" ? parseInt(inv.agentId.replace(/\D/g, "") || "1", 10) : (inv.agentId || 1),
              totalAmount: Number(inv.totalAmount || 0),
              linkedPadNo: inv.linkedPadNo || "-",
              linkedPageNo: inv.linkedPageNo || 1,
              despatchNo: inv.despatchNo || "আঃকাঃ/প্রশা-" + (inv.id || idx + 1001),
            })),
          );
        }
      }

      if (padRes.ok) {
        const padData = await padRes.json();
        if (Array.isArray(padData) && padData.length > 0) {
          setVoucherPads(
            padData.map((pad: any, idx: number) => ({
              id: idx + 1,
              productId: 1,
              agentId: 1,
              padNumber: pad.padNo || `P-${100 + idx}`,
              pageStart: 1,
              pageEnd: Number(pad.totalPages || 100),
              currentPage: Number(pad.currentPage || 1),
              issueDate: new Date().toISOString(),
              status: "Active",
            })),
          );
        }
      }
      setDbSyncStatus("synced");
    } catch (e) {
      console.warn("Could not sync directly with SQLite, fallback to local cache:", e);
      setDbSyncStatus("offline");
    } finally {
      setIsDbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDbData();
  }, [fetchDbData]);

  // Local storage auto-sync backup
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}products`, JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}branches`, JSON.stringify(branches));
  }, [branches]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}pads`, JSON.stringify(voucherPads));
  }, [voucherPads]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}invoices`, JSON.stringify(invoices));
  }, [invoices]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}invoice_items`, JSON.stringify(invoiceItems));
  }, [invoiceItems]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}transactions`, JSON.stringify(transactions));
  }, [transactions]);

  // Aggregate Calculations
  const totalStockQty = useMemo(() => products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0), [products]);
  const totalInventoryValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.sellingPrice || 0), 0),
    [products],
  );
  const totalSalesValue = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    [invoices],
  );

  // Modals for Adding Products / Invoices / Branches
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [selectedProductForStockIn, setSelectedProductForStockIn] = useState<StockProduct | null>(null);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<StockInvoice | null>(null);

  // Stock In Form
  const [stockInQty, setStockInQty] = useState(10);
  const [stockInFromPad, setStockInFromPad] = useState(101);
  const [stockInToPad, setStockInToPad] = useState(110);
  const [stockInNote, setStockInNote] = useState("New shipment from press");

  // New Product Form
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Stationery");
  const [newProdType, setNewProdType] = useState<"regular" | "pad_only" | "pad_page">("regular");
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState(50);
  const [newProdSellingPrice, setNewProdSellingPrice] = useState(65);
  const [newProdQty, setNewProdQty] = useState(10);

  // New Branch Form
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchArea, setNewBranchArea] = useState("");

  // Invoice creation state
  const [invBranchId, setInvBranchId] = useState<number>(branches[0]?.id || 1);
  const [invDate, setInvDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [invDespatchNo, setInvDespatchNo] = useState("আঃকাঃ/প্রশা-১(১০)/২০২৪-২০২৫/");
  const [invSubject, setInvSubject] = useState(
    "শাখা কর্তৃক চাহিদাকৃত স্টেশনারী ও সিকিউরিটি মালামাল সরবরাহ ও চালানপত্র।",
  );
  const [invReference, setInvReference] = useState("");
  const [invSuppliedBy, setInvSuppliedBy] = useState("স্টোরকিপার / ইনভেন্টরি ইনচার্জ");
  const [invBearerName, setInvBearerName] = useState("কর্মকর্তা / কর্মচারী মারফত");
  const [invAuthorizedOfficer, setInvAuthorizedOfficer] = useState(
    `${currentUser.name || ""}, ${currentUser.designation || "উপ-মহাব্যবস্থাপক / আঞ্চলিক ব্যবস্থাপক"}`
  );
  const [invSpecialNotes, setInvSpecialNotes] = useState(
    "মালামাল গ্রহণের পর প্যাড/বইয়ের পাতা ও সিকিউরিটি সিরিয়াল নম্বর পুঙ্খানুপুঙ্খ পরীক্ষা করে গুনে বুঝে নিয়ে চালানপত্রের ২য় কপিতে সিল ও স্বাক্ষরযুক্ত প্রাপ্তি স্বীকারপত্র অনতিবিলম্বে অত্র কার্যালয়ে ফেরত প্রেরণের জন্য অনুরোধ করা হলো।",
  );
  const [cartItems, setCartItems] = useState<
    Array<{
      productId: number;
      productName?: string;
      sku?: string;
      category?: string;
      isSecurity?: boolean;
      quantity: number;
      unit?: string;
      unitPrice: number;
      padFrom?: number | string;
      padTo?: number | string;
      pageFrom?: number | string;
      pageTo?: number | string;
      remarks?: string;
    }>
  >([]);

  // Search & Filter state
  const [productSearch, setProductSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [reportTab, setReportTab] = useState<"stock_status" | "stock_in" | "stock_out" | "branch_statement">("stock_status");

  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = (products.length > 0 ? Math.max(...products.map((p) => p.id)) : 0) + 1;
    const newP: StockProduct = {
      id: newId,
      name: newProdName,
      sku: newProdSku || `SKU-${newId.toString().padStart(3, "0")}`,
      category: newProdCategory,
      padType: newProdType,
      isSerialized: newProdType !== "regular",
      purchasePrice: newProdPurchasePrice,
      sellingPrice: newProdSellingPrice,
      stockQuantity: newProdQty,
      fromPad: newProdType !== "regular" ? 101 : undefined,
      toPad: newProdType !== "regular" ? 100 + newProdQty : undefined,
    };
    setProducts([...products, newP]);
    setTransactions([
      ...transactions,
      {
        id: transactions.length + 1,
        productId: newId,
        type: "IN",
        quantity: newProdQty,
        date: new Date().toISOString(),
        note: "Initial Product Entry",
      },
    ]);

    // Async save to SQLite
    try {
      await apiFetch("/api/stockproproducts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `prod-${newId}-${Date.now()}`,
          name: newProdName,
          sku: newProdSku || `SKU-${newId.toString().padStart(3, "0")}`,
          category: newProdCategory,
          padType: newProdType,
          costPrice: newProdPurchasePrice,
          sellingPrice: newProdSellingPrice,
          stockQuantity: newProdQty,
          fromPad: newProdType !== "regular" ? 101 : null,
          perPadPages: 100,
        }),
      });
      setDbSyncStatus("synced");
    } catch (err) {
      console.warn("SQLite product save failed:", err);
    }

    setShowAddProductModal(false);
    setNewProdName("");
    setNewProdSku("");
  };

  const handleConfirmStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStockIn) return;
    const pid = selectedProductForStockIn.id;
    const qty = selectedProductForStockIn.padType !== "regular" ? stockInToPad - stockInFromPad + 1 : stockInQty;

    const newStockQty = selectedProductForStockIn.stockQuantity + qty;
    setProducts(
      products.map((p) =>
        p.id === pid
          ? {
              ...p,
              stockQuantity: newStockQty,
              toPad: p.padType !== "regular" ? stockInToPad : p.toPad,
            }
          : p,
      ),
    );
    setTransactions([
      ...transactions,
      {
        id: transactions.length + 1,
        productId: pid,
        type: "IN",
        quantity: qty,
        date: new Date().toISOString(),
        fromPad: selectedProductForStockIn.padType !== "regular" ? stockInFromPad : undefined,
        toPad: selectedProductForStockIn.padType !== "regular" ? stockInToPad : undefined,
        note: stockInNote,
      },
    ]);

    // Update SQLite Product
    try {
      const targetId = selectedProductForStockIn.dbId || `prod-${pid}`;
      await apiFetch(`/api/stockproproducts/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedProductForStockIn.name,
          stockQuantity: newStockQty,
          toPad: selectedProductForStockIn.padType !== "regular" ? stockInToPad : undefined,
        }),
      });
      setDbSyncStatus("synced");
    } catch (err) {
      console.warn("Stock in update error:", err);
    }

    setShowStockInModal(false);
    setSelectedProductForStockIn(null);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = (branches.length > 0 ? Math.max(...branches.map((b) => b.id)) : 0) + 1;
    const newBr = {
      id: newId,
      name: newBranchName,
      phone: newBranchPhone,
      address: newBranchAddress,
      branch: newBranchArea,
    };
    setBranches([...branches, newBr]);

    // Save to SQLite
    try {
      await apiFetch("/api/stockprobranches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `br-${newId}-${Date.now()}`,
          name: newBranchName,
          phone: newBranchPhone,
          address: newBranchAddress,
          code: newBranchArea,
        }),
      });
      setDbSyncStatus("synced");
    } catch (err) {
      console.warn("SQLite branch save error:", err);
    }

    setShowAddBranchModal(false);
    setNewBranchName("");
    setNewBranchPhone("");
    setNewBranchAddress("");
    setNewBranchArea("");
  };

  const handleAddToCart = (pid: number) => {
    const prod = products.find((p) => p.id === pid);
    if (!prod || prod.stockQuantity <= 0) return;
    const existing = cartItems.find((ci) => ci.productId === pid);
    if (existing) {
      if (existing.quantity >= prod.stockQuantity) return;
      setCartItems(
        cartItems.map((ci) => (ci.productId === pid ? { ...ci, quantity: ci.quantity + 1 } : ci)),
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: pid,
          productName: prod.name,
          sku: prod.sku,
          category: prod.category,
          isSecurity: prod.isSecurity ?? (prod.padType !== "regular" || prod.category?.toLowerCase().includes("security")),
          quantity: 1,
          unit: prod.unit || (prod.padType === "regular" ? "টি" : "প্যাড"),
          unitPrice: prod.sellingPrice,
          padFrom: prod.fromPad,
          padTo: prod.toPad || prod.fromPad,
          pageFrom: prod.startSerial || 1,
          pageTo: prod.endSerial || (prod.pagesPerPad ? prod.pagesPerPad : undefined),
          remarks: "",
        },
      ]);
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    const invId = (invoices.length > 0 ? Math.max(...invoices.map((i) => i.id)) : 1000) + 1;
    const totalAmt = cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const selectedBranch = branches.find((b) => b.id === invBranchId);

    const newInv: StockInvoice = {
      id: invId,
      date: invDate || new Date().toISOString(),
      agentId: invBranchId,
      branchName: selectedBranch?.name || "শাখা",
      branchAddress: selectedBranch?.address || "",
      branchDistrict: selectedBranch?.district || "রাঙ্গামাটি",
      totalAmount: totalAmt,
      linkedPadNo: cartItems[0]?.padFrom ? String(cartItems[0].padFrom) : "-",
      linkedPageNo: 1,
      despatchNo: invDespatchNo || `আঃকাঃ/প্রশা-১(১০)/২০২৪-২০২৫/${invId}`,
      memoNo: invDespatchNo || `আঃকাঃ/প্রশা-১(১০)/২০২৪-২০২৫/${invId}`,
      subject: invSubject || "শাখা কর্তৃক চাহিদাকৃত স্টেশনারী ও সিকিউরিটি মালামাল সরবরাহ ও চালানপত্র।",
      reference: invReference || "",
      suppliedBy: invSuppliedBy || "স্টোরকিপার / ইনভেন্টরি ইনচার্জ",
      bearerName: invBearerName || "কর্মকর্তা / কর্মচারী মারফত",
      authorizedOfficer: invAuthorizedOfficer || `${currentUser.designation || "উপ-মহাব্যবস্থাপক / আঞ্চলিক ব্যবস্থাপক"} (${currentUser.name})`,
      specialNotes: invSpecialNotes,
    };

    const newItems: StockInvoiceItem[] = cartItems.map((ci, idx) => {
      const p = products.find((pr) => pr.id === ci.productId);
      return {
        id: invoiceItems.length + idx + 1,
        invoiceId: invId,
        productId: ci.productId,
        productName: ci.productName || p?.name || "পণ্য",
        sku: ci.sku || p?.sku,
        category: ci.category || p?.category,
        isSecurity: ci.isSecurity ?? p?.isSecurity ?? (p?.padType !== "regular"),
        quantity: ci.quantity,
        unit: ci.unit || p?.unit || "টি",
        unitPrice: ci.unitPrice,
        totalPrice: ci.quantity * ci.unitPrice,
        padFrom: ci.padFrom,
        padTo: ci.padTo,
        pageFrom: ci.pageFrom,
        pageTo: ci.pageTo,
        remarks: ci.remarks || "",
      };
    });

    // Deduct stocks
    let updatedProducts = [...products];
    cartItems.forEach((ci) => {
      updatedProducts = updatedProducts.map((p) =>
        p.id === ci.productId ? { ...p, stockQuantity: Math.max(0, p.stockQuantity - ci.quantity) } : p,
      );
    });

    const fullInv: StockInvoice = { ...newInv, items: newItems };

    setInvoices([fullInv, ...invoices]);
    setInvoiceItems([...invoiceItems, ...newItems]);
    setProducts(updatedProducts);
    setCartItems([]);
    setShowCreateInvoiceModal(false);
    setInvDespatchNo(`আঃকাঃ/প্রশা-১(১০)/২০২৪-২০২৫/`);

    // Save to SQLite
    try {
      await apiFetch("/api/stockproinvoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `inv-${invId}-${Date.now()}`,
          date: newInv.date,
          agentId: String(invBranchId),
          totalAmount: totalAmt,
          linkedPadNo: cartItems[0]?.padFrom ? String(cartItems[0].padFrom) : "-",
          createdBy: currentUser.userId,
          despatchNo: newInv.despatchNo,
          items: newItems,
        }),
      });

      // Update remaining stock quantities in SQLite
      for (const ci of cartItems) {
        const p = updatedProducts.find((item) => item.id === ci.productId);
        if (p) {
          const targetId = p.dbId || `prod-${p.id}`;
          await apiFetch(`/api/stockproproducts/${targetId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stockQuantity: p.stockQuantity,
            }),
          });
        }
      }
      setDbSyncStatus("synced");
    } catch (err) {
      console.warn("Error saving invoice to SQLite:", err);
    }
  };

  const handlePrintChallan = (inv: StockInvoice) => {
    setViewingInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col md:flex-row text-slate-800 font-sans animate-fadeIn">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-60 bg-white border-r border-slate-200 p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-3 mb-6 px-2">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 -ml-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="পূর্বের মেনুতে ফিরে যান"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
              📦
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-800">
                STOCK<span className="text-blue-600">PRO</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Voucher &amp; Inventory Hub
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className={`space-y-1.5 flex-1 ${isMobileNavOpen ? "block" : "hidden md:block"}`}>
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setIsMobileNavOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("products");
              setIsMobileNavOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "products"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Package size={17} />
            <span>Stock In (পণ্য)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("agents");
              setIsMobileNavOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "agents"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users size={17} />
            <span>Branch (শাখা)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("stockout");
              setIsMobileNavOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "stockout"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ArrowUpRight size={17} />
            <span>Stock Out (বিতরণ)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("invoices");
              setIsMobileNavOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "invoices"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText size={17} />
            <span>Invoices (চালান)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("reports");
              setIsMobileNavOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "reports"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <History size={17} />
            <span>Reports &amp; Analytics</span>
          </button>
        </nav>

        {/* Global User Session Card */}
        <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-blue-900 uppercase">FlowBoard Session Active</span>
            </div>
            <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{userOffice || "Regional Office"}</p>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar with quick buttons */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 -ml-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="পূর্বের মেনুতে ফিরে যান"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">ফিরে যান</span>
              </button>
            )}
            <span className="text-sm font-bold text-slate-700 capitalize">
              {activeTab === "dashboard"
                ? "ড্যাশবোর্ড ও ওভারভিউ"
                : activeTab === "products"
                  ? "পণ্য ও স্টক ইন"
                  : activeTab === "agents"
                    ? "শাখা ব্যবস্থাপনা"
                    : activeTab === "stockout"
                      ? "প্যাড ও বিতরণ ট্র্যাকিং"
                      : activeTab === "invoices"
                        ? "চালান ও ইনভয়েস"
                        : "রিপোর্ট ও এনালিটিক্স"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* SQLite Connection Status - Only for Super Admin */}
            {currentUser?.role === "Super Admin" && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                  <Database size={14} className="text-emerald-600" />
                  <span>সেন্ট্রাল SQLite ডাটাবেজ</span>
                  <span className={`w-2 h-2 rounded-full ${dbSyncStatus === "syncing" ? "bg-amber-500 animate-spin" : "bg-emerald-500 animate-pulse"}`}></span>
                </div>

                <button
                  onClick={fetchDbData}
                  disabled={isDbLoading}
                  title="SQLite ডাটাবেজ রিফ্রেশ করুন"
                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 bg-white"
                >
                  <RefreshCw size={15} className={isDbLoading ? "animate-spin text-blue-600" : ""} />
                </button>
              </>
            )}

            {activeTab === "products" && (
              <button
                onClick={() => setShowAddProductModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add Product</span>
              </button>
            )}
            {activeTab === "agents" && (
              <button
                onClick={() => setShowAddBranchModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add Branch</span>
              </button>
            )}
            {activeTab === "invoices" && (
              <button
                onClick={() => setShowCreateInvoiceModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Create Invoice</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab 1: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="p-6 space-y-6 max-w-7xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-500 text-white rounded-xl">
                  <Package size={22} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Total Products</p>
                  <h3 className="text-2xl font-black text-slate-800">{products.length}</h3>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-500 text-white rounded-xl">
                  <History size={22} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Total Stock Items</p>
                  <h3 className="text-2xl font-black text-slate-800">{totalStockQty}</h3>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Inventory Value</p>
                  <h3 className="text-2xl font-black text-slate-800">৳ {totalInventoryValue.toLocaleString()}</h3>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-xl">
                  <ArrowUpRight size={22} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Total Invoiced Sales</p>
                  <h3 className="text-2xl font-black text-slate-800">৳ {totalSalesValue.toLocaleString()}</h3>
                </div>
              </div>
            </div>

            {/* Quick overview tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800">Recent Invoices</h3>
                  <button
                    onClick={() => setActiveTab("invoices")}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View All →
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {invoices.slice(0, 5).map((inv) => {
                    const br = branches.find((b) => b.id === inv.agentId);
                    return (
                      <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">Invoice #{inv.id}</p>
                          <p className="text-slate-400">{br?.name || "Branch"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-blue-600">৳ {inv.totalAmount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">{new Date(inv.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800">Low Stock Alert (&lt; 10)</h3>
                  <button
                    onClick={() => setActiveTab("products")}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Manage Products →
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {products
                    .filter((p) => p.stockQuantity < 10)
                    .map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between text-xs bg-red-50/50 px-2 rounded-lg my-1">
                        <div>
                          <p className="font-bold text-red-900">{p.name}</p>
                          <p className="text-[10px] text-slate-500">SKU: {p.sku}</p>
                        </div>
                        <span className="font-bold text-red-600">{p.stockQuantity} Left</span>
                      </div>
                    ))}
                  {products.filter((p) => p.stockQuantity < 10).length === 0 && (
                    <p className="text-xs text-slate-400 py-6 text-center">সকল পণ্যের পর্যাপ্ত স্টক মজুদ আছে।</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Products */}
        {activeTab === "products" && (
          <div className="p-6 space-y-4 max-w-7xl">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="পণ্য বা SKU খুঁজুন..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Stock</th>
                    <th className="p-3.5">Selling Price</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        p.sku.toLowerCase().includes(productSearch.toLowerCase()),
                    )
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-800">{p.name}</td>
                        <td className="p-3.5 font-mono text-slate-500">{p.sku}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.padType === "pad_only"
                                ? "bg-purple-100 text-purple-700"
                                : p.padType === "pad_page"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {p.padType}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold">
                          <span className={p.stockQuantity < 10 ? "text-red-500" : "text-emerald-700"}>
                            {p.stockQuantity} {p.padType === "regular" ? "Units" : "Pads"}
                          </span>
                          {p.fromPad && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Pads: {p.fromPad}–{p.toPad}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-black text-blue-600">৳ {p.sellingPrice}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedProductForStockIn(p);
                              setShowStockInModal(true);
                            }}
                            className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold"
                          >
                            Stock In +
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Branches */}
        {activeTab === "agents" && (
          <div className="p-6 space-y-4 max-w-7xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Building size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{b.name}</h4>
                      <p className="text-xs text-slate-400">{b.phone}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">📍 {b.address}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Invoices */}
        {activeTab === "invoices" && (
          <div className="p-6 space-y-4 max-w-7xl">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ইনভয়েস #, শাখা বা ডেসপ্যাচ নং খুঁজুন..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <button
                onClick={() => setShowCreateInvoiceModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus size={14} />
                <span>নতুন চালান তৈরি</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5">Pad / Page</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5 text-center">Challan Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices
                    .filter((inv) => {
                      if (!invoiceSearch.trim()) return true;
                      const q = invoiceSearch.toLowerCase().trim();
                      const br = branches.find((b) => b.id === inv.agentId);
                      return (
                        String(inv.id).includes(q) ||
                        (br?.name && br.name.toLowerCase().includes(q)) ||
                        (inv.despatchNo && inv.despatchNo.toLowerCase().includes(q)) ||
                        (inv.linkedPadNo && inv.linkedPadNo.toLowerCase().includes(q))
                      );
                    })
                    .map((inv) => {
                      const br = branches.find((b) => b.id === inv.agentId);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="p-3.5 text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                          <td className="p-3.5 font-bold font-mono">#{inv.id}</td>
                          <td className="p-3.5 font-bold text-slate-700">{br?.name || "Walk-in"}</td>
                          <td className="p-3.5 font-mono">{inv.linkedPadNo || "-"}</td>
                          <td className="p-3.5 font-black text-blue-600">৳ {inv.totalAmount.toLocaleString()}</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handlePrintChallan(inv)}
                              className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold"
                            >
                              🖨️ Print Challan
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Stock Out */}
        {activeTab === "stockout" && (
          <div className="p-6 space-y-4 max-w-7xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {voucherPads.map((vp) => {
                const br = branches.find((b) => b.id === vp.agentId);
                const prod = products.find((p) => p.id === vp.productId);
                return (
                  <div key={vp.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        Pad #{vp.padNumber}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {vp.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{br?.name}</h4>
                      <p className="text-xs text-slate-400">{prod?.name}</p>
                    </div>
                    {vp.pageStart && vp.pageEnd && (
                      <div className="text-xs text-slate-600">
                        Pages: {vp.pageStart} – {vp.pageEnd} (Current: {vp.currentPage})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 6: Reports */}
        {activeTab === "reports" && (
          <div className="p-6 space-y-4 max-w-7xl">
            <div className="flex gap-2">
              <button
                onClick={() => setReportTab("stock_status")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  reportTab === "stock_status" ? "bg-blue-600 text-white" : "bg-white border text-slate-700"
                }`}
              >
                Current Stock Summary
              </button>
              <button
                onClick={() => setReportTab("stock_in")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  reportTab === "stock_in" ? "bg-blue-600 text-white" : "bg-white border text-slate-700"
                }`}
              >
                Stock In Log
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800">
                {reportTab === "stock_status" ? "বর্তমান স্টক মজুদ বিবরণী" : "স্টক ইন হিস্ট্রি"}
              </h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 font-bold uppercase">
                    <th className="p-2">Item</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2">Unit Price</th>
                    <th className="p-2 text-right">Value (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2 font-bold">{p.name}</td>
                      <td className="p-2 uppercase text-[10px]">{p.padType}</td>
                      <td className="p-2 font-bold text-emerald-700">{p.stockQuantity}</td>
                      <td className="p-2">৳ {p.sellingPrice}</td>
                      <td className="p-2 text-right font-black text-blue-600">
                        ৳ {(p.stockQuantity * p.sellingPrice).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-800">নতুন পণ্য যোগ করুন</h3>
            <form onSubmit={handleSaveNewProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">SKU</label>
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full p-2 border rounded bg-white"
                  >
                    <option value="Stationery">স্টেশনারী (Stationery)</option>
                    <option value="Voucher">ভাউচার প্যাড (Vouchers)</option>
                    <option value="Register">রেজিস্টার খাতা (Register)</option>
                    <option value="Security">সিকিউরিটি ডকুমেন্ট (Security)</option>
                    <option value="General">সাধারণ (General)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Type</label>
                  <select
                    value={newProdType}
                    onChange={(e) => setNewProdType(e.target.value as any)}
                    className="w-full p-2 border rounded bg-white"
                  >
                    <option value="regular">Regular Item</option>
                    <option value="pad_only">Pad Only</option>
                    <option value="pad_page">Pad + Page</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Purchase Price</label>
                  <input
                    type="number"
                    value={newProdPurchasePrice}
                    onChange={(e) => setNewProdPurchasePrice(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Selling Price</label>
                  <input
                    type="number"
                    value={newProdSellingPrice}
                    onChange={(e) => setNewProdSellingPrice(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Initial Stock</label>
                <input
                  type="number"
                  value={newProdQty}
                  onChange={(e) => setNewProdQty(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 p-2 bg-slate-100 rounded font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 p-2 bg-blue-600 text-white rounded font-bold">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Stock In */}
      {showStockInModal && selectedProductForStockIn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-800">Stock In: {selectedProductForStockIn.name}</h3>
            <form onSubmit={handleConfirmStockIn} className="space-y-3 text-xs">
              {selectedProductForStockIn.padType === "regular" ? (
                <div>
                  <label className="font-semibold block mb-1">পরিমাণ (Quantity)</label>
                  <input
                    type="number"
                    min={1}
                    value={stockInQty}
                    onChange={(e) => setStockInQty(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">From Pad</label>
                    <input
                      type="number"
                      value={stockInFromPad}
                      onChange={(e) => setStockInFromPad(Number(e.target.value))}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">To Pad</label>
                    <input
                      type="number"
                      value={stockInToPad}
                      onChange={(e) => setStockInToPad(Number(e.target.value))}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="font-semibold block mb-1">নোট / চালান সূত্র</label>
                <input
                  type="text"
                  value={stockInNote}
                  onChange={(e) => setStockInNote(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockInModal(false)}
                  className="flex-1 p-2 bg-slate-100 rounded font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 p-2 bg-emerald-600 text-white rounded font-bold">
                  Confirm Stock In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Invoice */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  নতুন মালামাল বিতরণ চালান ও ইনভয়েস প্রস্তুত
                </h3>
                <p className="text-[11px] text-slate-500">
                  সিকিউরিটি ও নন-সিকিউরিটি পণ্য নির্বাচন ও স্বয়ংক্রিয় চালান প্রস্তুতকরণ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              {/* Top Meta info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">
                    গ্রাহক শাখা (Recipient Branch) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={invBranchId}
                    onChange={(e) => setInvBranchId(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.address ? `(${b.address})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700">চালানের তারিখ (Date)</label>
                  <input
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700">চালান স্মারক নং (Despatch / Memo No)</label>
                  <input
                    type="text"
                    value={invDespatchNo}
                    onChange={(e) => setInvDespatchNo(e.target.value)}
                    placeholder="আঃকাঃ/প্রশা-১(১০)/২০২৪-২০২৫/..."
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700">চাহিদাপত্র সূত্র / কার্যাদেশ (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={invReference}
                    onChange={(e) => setInvReference(e.target.value)}
                    placeholder="শাখার চাহিদাপত্র সূত্র নং-..."
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1 text-slate-700">চালানের বিষয় (Subject)</label>
                  <input
                    type="text"
                    value={invSubject}
                    onChange={(e) => setInvSubject(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Product Selection */}
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2">
                <label className="font-bold block text-blue-950">
                  চালানে পণ্য যোগ করুন (Select Product to Add)
                </label>
                <select
                  onChange={(e) => {
                    const pid = Number(e.target.value);
                    if (pid) {
                      handleAddToCart(pid);
                      e.target.value = "";
                    }
                  }}
                  className="w-full p-2.5 border rounded-lg bg-white font-medium shadow-sm"
                >
                  <option value="">-- তালিকায় ক্লিক করে পণ্য নির্বাচন করুন --</option>
                  <optgroup label="১. সিকিউরিটি সামগ্রী (Security Items)">
                    {products
                      .filter((p) => p.isSecurity || p.padType !== "regular" || p.category?.toLowerCase().includes("security"))
                      .map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                          {p.name} {p.sku ? `(${p.sku})` : ""} | মজুদ: {p.stockQuantity} {p.unit || "প্যাড"} | ৳ {p.sellingPrice}
                          {p.stockQuantity <= 0 ? " [স্টক শেষ]" : ""}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="২. নন-সিকিউরিটি সামগ্রী (Non-Security Items)">
                    {products
                      .filter((p) => !p.isSecurity && p.padType === "regular" && !p.category?.toLowerCase().includes("security"))
                      .map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                          {p.name} {p.sku ? `(${p.sku})` : ""} | মজুদ: {p.stockQuantity} {p.unit || "টি"} | ৳ {p.sellingPrice}
                          {p.stockQuantity <= 0 ? " [স্টক শেষ]" : ""}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Cart List */}
              {cartItems.length > 0 && (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800 text-sm">
                      নির্বাচিত পণ্য তালিকা ({cartItems.length} টি আইটেম):
                    </span>
                    <button
                      type="button"
                      onClick={() => setCartItems([])}
                      className="text-red-600 hover:text-red-700 text-[11px] font-semibold"
                    >
                      সব মুছুন
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {cartItems.map((ci, idx) => {
                      const prod = products.find((p) => p.id === ci.productId);
                      const isSec = ci.isSecurity ?? prod?.isSecurity ?? (prod?.padType !== "regular");

                      return (
                        <div
                          key={ci.productId}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900">{ci.productName || prod?.name}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isSec
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}
                                >
                                  {isSec ? "১. সিকিউরিটি" : "২. নন-সিকিউরিটি"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                একক মূল্য: ৳ {ci.unitPrice} | সর্বোচ্চ মজুদ: {prod?.stockQuantity || 0}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:bg-red-50 p-1 rounded font-bold"
                              title="বাদ দিন"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Editable fields */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                            <div>
                              <label className="text-[10px] text-slate-500 font-semibold block">পরিমাণ ({ci.unit || "টি"})</label>
                              <input
                                type="number"
                                min={1}
                                max={prod?.stockQuantity || 9999}
                                value={ci.quantity}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1);
                                  setCartItems(
                                    cartItems.map((item, i) =>
                                      i === idx ? { ...item, quantity: val } : item,
                                    ),
                                  );
                                }}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 font-bold text-blue-900"
                              />
                            </div>

                            {isSec ? (
                              <>
                                <div>
                                  <label className="text-[10px] text-slate-500 font-semibold block">প্যাড/বই নং (হতে-পর্যন্ত)</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={ci.padFrom ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setCartItems(cartItems.map((item, i) => (i === idx ? { ...item, padFrom: v } : item)));
                                      }}
                                      placeholder="শুরু"
                                      className="w-1/2 p-1.5 border rounded text-[11px]"
                                    />
                                    <span>-</span>
                                    <input
                                      type="text"
                                      value={ci.padTo ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setCartItems(cartItems.map((item, i) => (i === idx ? { ...item, padTo: v } : item)));
                                      }}
                                      placeholder="শেষ"
                                      className="w-1/2 p-1.5 border rounded text-[11px]"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] text-slate-500 font-semibold block">পাতা/সিরিয়াল নং (হতে-পর্যন্ত)</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={ci.pageFrom ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setCartItems(cartItems.map((item, i) => (i === idx ? { ...item, pageFrom: v } : item)));
                                      }}
                                      placeholder="১"
                                      className="w-1/2 p-1.5 border rounded text-[11px]"
                                    />
                                    <span>-</span>
                                    <input
                                      type="text"
                                      value={ci.pageTo ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setCartItems(cartItems.map((item, i) => (i === idx ? { ...item, pageTo: v } : item)));
                                      }}
                                      placeholder="১০০"
                                      className="w-1/2 p-1.5 border rounded text-[11px]"
                                    />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div>
                                <label className="text-[10px] text-slate-500 font-semibold block">একক (Unit)</label>
                                <input
                                  type="text"
                                  value={ci.unit || "টি"}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setCartItems(cartItems.map((item, i) => (i === idx ? { ...item, unit: v } : item)));
                                  }}
                                  placeholder="রিম / প্যাড / টি"
                                  className="w-full p-1.5 border rounded text-[11px]"
                                />
                              </div>
                            )}

                            <div>
                              <label className="text-[10px] text-slate-500 font-semibold block">মন্তব্য (ঐচ্ছিক)</label>
                              <input
                                type="text"
                                value={ci.remarks || ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setCartItems(cartItems.map((item, i) => (i === idx ? { ...item, remarks: v } : item)));
                                }}
                                placeholder="সঠিক বা অক্ষত"
                                className="w-full p-1.5 border rounded text-[11px]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center font-black text-sm pt-2 border-t text-slate-800">
                    <span>সর্বমোট চালান মূল্য:</span>
                    <span className="text-blue-700">
                      ৳ {cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Information (Auto from form to print) */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 space-y-2.5">
                <p className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <span>📝</span> চালানের নিচের লাইন ও স্বাক্ষর তথ্য (প্রিন্ট কপিতে স্বয়ংক্রিয়ভাবে দৃশ্যমান হবে):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-slate-700">
                      মালামাল প্রস্তুতকারী / স্টোরকিপার
                    </label>
                    <input
                      type="text"
                      value={invSuppliedBy}
                      onChange={(e) => setInvSuppliedBy(e.target.value)}
                      placeholder="স্টোরকিপার / ইনচার্জ"
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-slate-700">
                      মালামাল বহনকারী / মারফত (Bearer)
                    </label>
                    <input
                      type="text"
                      value={invBearerName}
                      onChange={(e) => setInvBearerName(e.target.value)}
                      placeholder="কর্মকর্তা / কর্মচারী মারফত"
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-slate-700">
                      অনুমোদনকারী কর্মকর্তা (প্রেরক)
                    </label>
                    <input
                      type="text"
                      value={invAuthorizedOfficer}
                      onChange={(e) => setInvAuthorizedOfficer(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-[11px] text-slate-700">
                    বিশেষ দ্রষ্টব্য / নির্দেশিকা নোট
                  </label>
                  <textarea
                    rows={2}
                    value={invSpecialNotes}
                    onChange={(e) => setInvSpecialNotes(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-[11px]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="flex-1 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow transition-all disabled:opacity-40"
                >
                  চালান সম্পন্ন ও সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Branch */}
      {showAddBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-800">নতুন শাখা যোগ করুন</h3>
            <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">শাখার নাম (Branch Name)</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="যেমন: লংগদু শাখা"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">ফোন নম্বর</label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="01800000000"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">ঠিকানা / এলাকা</label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="বাজার, উপজেলা, জেলা"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">শাখা কোড (Branch Code)</label>
                <input
                  type="text"
                  value={newBranchArea}
                  onChange={(e) => setNewBranchArea(e.target.value)}
                  placeholder="যেমন: 3501"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="flex-1 p-2 bg-slate-100 rounded font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 p-2 bg-blue-600 text-white rounded font-bold">
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Print Invoice Preview */}
      {viewingInvoice && (() => {
        const invItems = invoiceItems.filter((item) => item.invoiceId === viewingInvoice.id);
        const secItems = invItems.filter(
          (item) => item.isSecurity ?? products.find((p) => p.id === item.productId)?.isSecurity ?? (products.find((p) => p.id === item.productId)?.padType !== "regular"),
        );
        const nonSecItems = invItems.filter(
          (item) => !(item.isSecurity ?? products.find((p) => p.id === item.productId)?.isSecurity ?? (products.find((p) => p.id === item.productId)?.padType !== "regular")),
        );

        // Security items first, then non-security items
        const sortedItems = [...secItems, ...nonSecItems];
        const totalQty = sortedItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
        const totalPrice = sortedItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice || 0), 0);

        const targetBranch = branches.find((b) => b.id === viewingInvoice.agentId);
        const branchDisplayName = viewingInvoice.branchName || targetBranch?.name || "Barkal Branch";
        const branchDisplayAddr = viewingInvoice.branchAddress || targetBranch?.address || "Rangamati";

        const formattedDate = new Date(viewingInvoice.date).toLocaleDateString("en-GB").replace(/\//g, "-");

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:bg-white print:fixed print:inset-0 print:p-0 print:m-0 print:overflow-visible print:z-50">
            <div className="bg-white rounded-xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto print:shadow-none print:max-h-none print:p-4 print:m-0 print:border-none print:w-full print:max-w-none print:relative print:overflow-visible relative text-slate-900 font-sans">
              {/* Global Dynamic Watermark */}
              <GlobalDocumentWatermark systemSettings={systemSettings} />

              <div className="relative z-10 space-y-4">
                {/* Global Dynamic Pad Header */}
                <GlobalDocumentPadHeader
                  systemSettings={systemSettings}
                  officeName={userOffice || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি"}
                />

                {/* Despatch and Date Row */}
                <div className="flex justify-between items-center text-xs font-semibold pt-1 pb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-700">Despatch no:</span>
                    <span className="font-mono text-slate-900 border-b border-slate-900 pb-0.5 px-1">
                      {viewingInvoice.despatchNo || "আঃকাঃ(রাঙ্গা) প্রশা-১(৪০)/২০২৫-২০২৬/"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-700">Date:</span>
                    <span className="font-mono text-slate-900 border-b border-slate-900 pb-0.5 px-1">
                      {formattedDate}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center pt-1 pb-2">
                  <h3 className="text-sm font-bold tracking-wide text-slate-900">
                    Stationery Item Supply Challan Copy
                  </h3>
                  <p className="text-xs font-semibold text-slate-700">
                    (মুদ্রিত মনোহারী সরবরাহের চালান)
                  </p>
                </div>

                {/* Main Table matching image format exactly with sorted items only */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-slate-50 text-slate-900 font-bold text-center border-b border-slate-800">
                        <th className="p-2 border border-slate-800 w-12 align-middle" rowSpan={2}>
                          No.
                        </th>
                        <th className="p-2 border border-slate-800" colSpan={3}>
                          Description of Supplied Items
                        </th>
                        <th className="p-2 border border-slate-800 w-28 align-middle" rowSpan={2}>
                          Quantity
                        </th>
                        <th className="p-2 border border-slate-800 w-20 align-middle" rowSpan={2}>
                          Rate
                        </th>
                        <th className="p-2 border border-slate-800 w-24 align-middle" rowSpan={2}>
                          Price
                        </th>
                      </tr>
                      <tr className="bg-slate-50 text-slate-800 font-semibold text-center border-b border-slate-800 text-[11px]">
                        <th className="p-1.5 border border-slate-800 text-left pl-3">(Security Items)</th>
                        <th className="p-1.5 border border-slate-800 w-28">From</th>
                        <th className="p-1.5 border border-slate-800 w-28">To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item, idx) => {
                        const pr = products.find((p) => p.id === item.productId);
                        const isSec = item.isSecurity ?? pr?.isSecurity ?? (pr?.padType !== "regular");
                        const itemPadFrom = item.padFrom || (isSec ? pr?.fromPad || "" : "");
                        const itemPadTo = item.padTo || (isSec ? pr?.toPad || "" : "");
                        const qtyText = `${item.quantity} ${item.unit || pr?.unit || (isSec ? "টি" : "প্যাড")}`;
                        const rateText = item.unitPrice.toFixed(2);
                        const priceText = (item.quantity * item.unitPrice).toFixed(2);

                        return (
                          <tr key={item.id || idx} className="h-7 hover:bg-slate-50">
                            <td className="p-1.5 border border-slate-800 text-center font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 border border-slate-800 font-medium text-slate-900 pl-3">
                              {item.productName || pr?.name || "পণ্য"}
                            </td>
                            <td className="p-1.5 border border-slate-800 text-center font-mono text-slate-800">
                              {itemPadFrom}
                            </td>
                            <td className="p-1.5 border border-slate-800 text-center font-mono text-slate-800">
                              {itemPadTo}
                            </td>
                            <td className="p-1.5 border border-slate-800 text-center font-medium">
                              {qtyText}
                            </td>
                            <td className="p-1.5 border border-slate-800 text-right font-mono">
                              {rateText}
                            </td>
                            <td className="p-1.5 border border-slate-800 text-right font-mono font-bold">
                              {priceText}
                            </td>
                          </tr>
                        );
                      })}
                      {sortedItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                            কোনো আইটেম পাওয়া যায়নি।
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-800">
                        <td colSpan={4} className="p-2 border border-slate-800 text-right">
                          সর্বমোট (Total):
                        </td>
                        <td className="p-2 border border-slate-800 text-center font-black">
                          {totalQty}
                        </td>
                        <td className="p-2 border border-slate-800"></td>
                        <td className="p-2 border border-slate-800 text-right font-mono font-black">
                          {totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Bottom Signatures Matching Reference Image */}
                <div className="grid grid-cols-3 gap-4 pt-8 text-xs font-semibold">
                  <div>
                    <p className="text-slate-800">Manager</p>
                    <p className="text-slate-800">Bangladesh Krishi Bank</p>
                    <p className="font-bold text-slate-900 underline decoration-slate-900 underline-offset-2">
                      {branchDisplayName}
                    </p>
                    <p className="text-slate-700">{branchDisplayAddr}</p>
                  </div>

                  <div className="text-center pt-6">
                    <p className="text-slate-600">Accepted By</p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-slate-800 font-bold pb-8">Authorized Officer</p>
                    <div className="w-48 ml-auto border-b border-slate-900 pt-2"></div>
                    <p className="font-bold text-slate-900 text-xs pt-1">
                      {viewingInvoice.authorizedOfficer || `${currentUser.name || ""}, ${currentUser.designation || "উপ-মহাব্যবস্থাপক / আঞ্চলিক ব্যবস্থাপক"}`}
                    </p>
                  </div>
                </div>

                {/* Notes (দ্রষ্টব্য) */}
                <div className="text-[11px] leading-relaxed text-slate-800 pt-3 space-y-0.5">
                  <p className="font-bold text-slate-900">দ্রষ্টব্যঃ</p>
                  <p>০১. সরবরাহ গ্রহণে কর্মকর্তা/কর্মচারী প্রেরণ খরচ মাসে সর্বোচ্চ দু'বার গ্রহণযোগ্য।</p>
                  <p>০২. সিকিউরিটি ডকুমেন্ট এর সরবরাহ গ্রহণে কর্মকর্তা প্রেরণ আবশ্যিকী।</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 transition-all"
                >
                  <span>🖨️</span>
                  <span>প্রিন্ট / PDF সংরক্ষণ</span>
                </button>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
