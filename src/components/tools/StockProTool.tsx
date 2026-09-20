import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, SystemSettings, Office, FinancialYear } from "../../types";
import { apiFetch } from "../../api";
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
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  isSerialized: boolean;
  padType: "regular" | "pad_only" | "pad_page";
  fromPad?: number;
  toPad?: number;
  startSerial?: number;
  endSerial?: number;
  pagesPerPad?: number;
}

export interface StockBranch {
  id: number;
  dbId?: string;
  name: string;
  phone: string;
  address: string;
  branch: string;
}

export interface StockTransaction {
  id: number;
  productId: number;
  agentId?: number;
  type: "IN" | "OUT";
  quantity: number;
  date: string;
  note?: string;
  fromPad?: number;
  toPad?: number;
  startSerial?: number;
  endSerial?: number;
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
  quantity: number;
  unitPrice: number;
  padFrom?: number;
  padTo?: number;
  pageFrom?: number;
  pageTo?: number;
}

export interface StockInvoice {
  id: number;
  date: string;
  agentId: number;
  totalAmount: number;
  linkedPadNo?: string;
  linkedPageNo?: number;
  despatchNo?: string;
}

const STORAGE_PREFIX = "flowboard_stockpro_";

export function StockProTool({ currentUser, systemSettings, offices, onBack: _onBack }: StockProToolProps) {
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
        name: "Credit Receipt Pad (ক্রেডিট রসিদ বহি)",
        sku: "CRP-001",
        category: "Receipt",
        purchasePrice: 40,
        sellingPrice: 50,
        stockQuantity: 20,
        isSerialized: true,
        padType: "pad_page",
        fromPad: 101,
        toPad: 120,
        startSerial: 1,
        endSerial: 2000,
        pagesPerPad: 100,
      },
      {
        id: 2,
        name: "Debit Voucher Pad (ডেবিট ভাউচার প্যাড)",
        sku: "DVP-002",
        category: "Voucher",
        purchasePrice: 45,
        sellingPrice: 55,
        stockQuantity: 15,
        isSerialized: true,
        padType: "pad_only",
        fromPad: 201,
        toPad: 215,
      },
      {
        id: 3,
        name: "Official A4 Paper Box (রিম)",
        sku: "PAP-003",
        category: "Stationery",
        purchasePrice: 350,
        sellingPrice: 420,
        stockQuantity: 40,
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
        address: o.address || "রাঙ্গামাটি",
        branch: o.name.replace(" শাখা", ""),
      }));
    }
    return [
      { id: 1, name: "রাঙ্গামাটি প্রধান শাখা", phone: "01820302571", address: "তবলছড়ি, রাঙ্গামাটি", branch: "Rangamati" },
      { id: 2, name: "লংগদু শাখা", phone: "01711223344", address: "লংগদু বাজার", branch: "Longadu" },
      { id: 3, name: "কাপ্তাই শাখা", phone: "01911445566", address: "কাপ্তাই নতুন বাজার", branch: "Kaptai" },
      { id: 4, name: "বরকল শাখা", phone: "01611778899", address: "বরকল বাজার", branch: "Barkal" },
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

  // Organization settings
  const userOffice = offices?.find((o) => o.id === currentUser.officeId)?.name;
  const [orgSettings] = useState(() => {
    return {
      orgName: systemSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক",
      officeName: userOffice || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি",
      email: currentUser.email || "rmrangamati@krishibank.org.bd",
      authorizedOfficer: `${currentUser.designation || "উপ-মহাব্যবস্থাপক / আঞ্চলিক ব্যবস্থাপক"} (${currentUser.name})`,
      note1: "সরবরাহ গ্রহণে কর্মকর্তা/কর্মচারী প্রেরণ খরচ অনুমোদিত বিধি মোতাবেক প্রদানযোগ্য।",
      note2: "সিকিউরিটি ডকুমেন্ট ও ভাউচার সামগ্রীর সঠিক হেফাজত নিশ্চিত করতে হবে।",
    };
  });

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
  const [invDespatchNo, setInvDespatchNo] = useState("");
  const [cartItems, setCartItems] = useState<
    Array<{ productId: number; quantity: number; unitPrice: number; padFrom?: number; padTo?: number }>
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
          quantity: 1,
          unitPrice: prod.sellingPrice,
          padFrom: prod.fromPad,
          padTo: prod.fromPad,
        },
      ]);
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    const invId = (invoices.length > 0 ? Math.max(...invoices.map((i) => i.id)) : 1000) + 1;
    const totalAmt = cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const newInv: StockInvoice = {
      id: invId,
      date: new Date().toISOString(),
      agentId: invBranchId,
      totalAmount: totalAmt,
      linkedPadNo: cartItems[0]?.padFrom ? String(cartItems[0].padFrom) : "-",
      linkedPageNo: 1,
      despatchNo: invDespatchNo || "আঃকাঃ/প্রশা-" + invId,
    };

    const newItems: StockInvoiceItem[] = cartItems.map((ci, idx) => ({
      id: invoiceItems.length + idx + 1,
      invoiceId: invId,
      productId: ci.productId,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      padFrom: ci.padFrom,
      padTo: ci.padTo,
    }));

    // Deduct stocks
    let updatedProducts = [...products];
    cartItems.forEach((ci) => {
      updatedProducts = updatedProducts.map((p) =>
        p.id === ci.productId ? { ...p, stockQuantity: Math.max(0, p.stockQuantity - ci.quantity) } : p,
      );
    });

    setInvoices([newInv, ...invoices]);
    setInvoiceItems([...invoiceItems, ...newItems]);
    setProducts(updatedProducts);
    setCartItems([]);
    setShowCreateInvoiceModal(false);
    setInvDespatchNo("");

    // Save to SQLite
    try {
      await apiFetch("/api/stockproinvoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `inv-${invId}-${Date.now()}`,
          date: new Date().toISOString(),
          agentId: String(invBranchId),
          totalAmount: totalAmt,
          linkedPadNo: cartItems[0]?.padFrom ? String(cartItems[0].padFrom) : "-",
          createdBy: currentUser.userId,
          despatchNo: newInv.despatchNo,
          items: cartItems,
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-800">নতুন চালান / ইনভয়েস তৈরি</h3>
            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">গ্রাহক শাখা (Branch)</label>
                <select
                  value={invBranchId}
                  onChange={(e) => setInvBranchId(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Despatch No (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={invDespatchNo}
                  onChange={(e) => setInvDespatchNo(e.target.value)}
                  placeholder="আঃকাঃ/প্রশা-..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">পণ্য সিলেক্ট করুন</label>
                <select
                  onChange={(e) => {
                    const pid = Number(e.target.value);
                    if (pid) handleAddToCart(pid);
                  }}
                  className="w-full p-2 border rounded bg-white"
                >
                  <option value="">Choose item to add...</option>
                  {products
                    .filter((p) => p.stockQuantity > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.stockQuantity} | ৳ {p.sellingPrice})
                      </option>
                    ))}
                </select>
              </div>

              {/* Cart List */}
              {cartItems.length > 0 && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                  <span className="font-bold block text-slate-700">কার্ট আইটেম:</span>
                  {cartItems.map((ci) => {
                    const prod = products.find((p) => p.id === ci.productId);
                    return (
                      <div key={ci.productId} className="flex items-center justify-between bg-white p-2 rounded border">
                        <div>
                          <p className="font-bold text-slate-800">{prod?.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {ci.quantity} × ৳ {ci.unitPrice} = ৳ {(ci.quantity * ci.unitPrice).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCartItems(cartItems.filter((c) => c.productId !== ci.productId))}
                          className="text-red-500 font-bold p-1 hover:bg-red-50 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-black text-sm pt-2 border-t">
                    <span>মোট:</span>
                    <span className="text-blue-600">
                      ৳ {cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="flex-1 p-2 bg-slate-100 rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0}
                  className="flex-1 p-2 bg-blue-600 text-white rounded font-bold disabled:opacity-40"
                >
                  Confirm &amp; Save Invoice
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
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:p-0">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-black text-slate-900">{orgSettings.orgName}</h2>
              <p className="text-sm text-slate-600">{orgSettings.officeName}</p>
              <p className="text-xs text-slate-400">{orgSettings.email}</p>
            </div>

            <div className="flex justify-between text-xs font-semibold">
              <span>চালান নম্বর: #{viewingInvoice.id}</span>
              <span>তারিখ: {new Date(viewingInvoice.date).toLocaleDateString("bn-BD")}</span>
            </div>

            <div className="text-xs">
              <p className="font-bold">
                গ্রাহক: {branches.find((b) => b.id === viewingInvoice.agentId)?.name || "শাখা"}
              </p>
              <p className="text-slate-500">
                {branches.find((b) => b.id === viewingInvoice.agentId)?.address}
              </p>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border">
                  <th className="p-2 border">ক্র/নং</th>
                  <th className="p-2 border">বিবরণ</th>
                  <th className="p-2 text-center border">পরিমাণ</th>
                  <th className="p-2 text-right border">একক দর</th>
                  <th className="p-2 text-right border">মোট মূল্য</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems
                  .filter((item) => item.invoiceId === viewingInvoice.id)
                  .map((item, i) => {
                    const pr = products.find((p) => p.id === item.productId);
                    return (
                      <tr key={item.id} className="border">
                        <td className="p-2 border text-center">{i + 1}</td>
                        <td className="p-2 border font-bold">{pr?.name}</td>
                        <td className="p-2 border text-center">{item.quantity}</td>
                        <td className="p-2 border text-right">৳ {item.unitPrice}</td>
                        <td className="p-2 border text-right font-bold">
                          ৳ {(item.quantity * item.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="border font-bold bg-slate-50">
                  <td colSpan={4} className="p-2 text-right border">
                    সর্বমোট:
                  </td>
                  <td className="p-2 text-right border font-black text-blue-900">
                    ৳ {viewingInvoice.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between pt-8 text-xs font-semibold">
              <div>
                <p>গ্রহণকারীর স্বাক্ষর</p>
              </div>
              <div className="text-right">
                <p>{orgSettings.authorizedOfficer}</p>
                <p className="text-[10px] text-slate-400">অনুমোদিত স্বাক্ষরকারী</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-xs"
              >
                Print / PDF
              </button>
              <button
                onClick={() => setViewingInvoice(null)}
                className="px-4 py-2 bg-slate-500 text-white rounded font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
