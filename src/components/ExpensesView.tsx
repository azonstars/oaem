import { apiFetch } from "../api";
import React, { useState, useMemo } from "react";
import {
  Expense,
  Allocation,
  Office,
  Category,
  FinancialYear,
  User,
  NoteSheet,
  ApplicantInfo,
  EntryOfficerInfo,
  QuotationItem,
  BranchDebitEntry,
  FuelExpenseItem,
} from "../types";
import {
  Receipt,
  Plus,
  Building2,
  Building,
  Users,
  FileText,
  Trash2,
  AlertTriangle,
  AlertCircle,
  UserCircle,
  Loader2,
  Printer,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Check,
  X,
  Paperclip,
  Eye,
  RefreshCw,
  Sparkles,
  Car,
} from "lucide-react";
import { NoteSheetPreviewModal } from "./NoteSheetPreviewModal";
import { useLanguage } from "../i18n";
import { useTheme } from "../context/ThemeContext";

interface ExpensesViewProps {
  expenses: Expense[];
  allocations: Allocation[];
  offices: Office[];
  categories: Category[];
  financialYears: FinancialYear[];
  selectedFY: string;
  currentUser: User;
  noteSheets: NoteSheet[];
  onAddExpense: (expense: Omit<Expense, "id">) => Promise<any>;
  onUpdateExpense?: (id: string, expense: Partial<Expense>) => Promise<any>;
  onApproveExpense?: (id: string) => Promise<any>;
  onRejectExpense?: (id: string, reason: string) => Promise<any>;
  onDeleteExpense: (id: string) => void;
  isHeadOffice: boolean;
  statusFilter?: "All" | "Pending" | "Approved" | "Rejected";
  setStatusFilter?: (
    filter: "All" | "Pending" | "Approved" | "Rejected",
  ) => void;
  refreshData?: () => void;
}

export function ExpensesView({
  expenses,
  allocations,
  offices,
  categories,
  financialYears,
  selectedFY,
  currentUser,
  noteSheets,
  onAddExpense,
  onUpdateExpense,
  onApproveExpense,
  onRejectExpense,
  onDeleteExpense,
  isHeadOffice,
  statusFilter: propStatusFilter,
  setStatusFilter: propSetStatusFilter,
  refreshData,
}: ExpensesViewProps) {
  const { t, formatCurrency, language } = useLanguage();
  const { isCustom, isDark } = useTheme();
  const isSuperAdminOrAdminOrModerator =
    currentUser?.role === "Super Admin" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "Head Office Admin" ||
    currentUser?.role === "Moderator";

  const [internalStatusFilter, setInternalStatusFilter] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("All");

  const currentStatusFilter =
    propStatusFilter !== undefined ? propStatusFilter : internalStatusFilter;
  const setStatusFilter = propSetStatusFilter || setInternalStatusFilter;

  const [showModal, setShowModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewNoteSheet, setPreviewNoteSheet] = useState<NoteSheet | null>(
    null,
  );
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(
    null,
  );
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejectError, setRejectError] = useState("");

  const [supportingDocument, setSupportingDocument] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [officeId, setOfficeId] = useState(
    isHeadOffice ? offices[0]?.id || "" : currentUser.officeId,
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [expenseType, setExpenseType] = useState<"General" | "Quotation">(
    "General",
  );
  const [quotationFormType, setQuotationFormType] = useState<"Form1" | "Form2">(
    "Form1",
  );
  const [memoForwardingNo, setMemoForwardingNo] = useState(
    "সূত্র নং-কশি-০৬ (অংশ-০৩)/২০২৬-২০২৭/",
  );
  const [memoSupplyOrderNo, setMemoSupplyOrderNo] = useState(
    "সূত্র নং-প্রশ-১(৪০)/২০২৬-২০২৭/",
  );
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [hasStockChalan, setHasStockChalan] = useState("না");
  const [vatChalanNo, setVatChalanNo] = useState("২৫২৮০০০০০৮২৮৬৮");
  const [vatChalanDate, setVatChalanDate] = useState("");
  const [debitAccount, setDebitAccount] = useState(
    categories[0]?.code || "১৩৪/০৫",
  );
  const [noteSheetId, setNoteSheetId] = useState("");
  const [vehicleModel, setVehicleModel] = useState("Toyota Land Cruiser Prado");
  const [vehicleRegNo, setVehicleRegNo] = useState("ঢাকা-মেট্রো-ঘ-১৪-১১৩২");
  const [motorDocType, setMotorDocType] = useState<
    "application" | "forwarding" | "supplyorder" | "all"
  >("application");
  const [fuelMonthYear, setFuelMonthYear] = useState("জুন/২০২৬");
  const [fuelType, setFuelType] = useState("অকটেন");
  const [fuelSupplierName, setFuelSupplierName] = useState("মেসার্স হিল ভিউ");
  const [fuelItems, setFuelItems] = useState<FuelExpenseItem[]>([
    {
      id: "f-1",
      fuelType: "অকটেন",
      supplyDate: "2026-06-02",
      qtyLiters: 20,
      unit: "লিঃ",
      ratePerLiter: 145,
      supplierName: "মেসার্স হিল ভিউ",
      totalAmount: 2900,
    },
    {
      id: "f-2",
      fuelType: "অকটেন",
      supplyDate: "2026-06-09",
      qtyLiters: 40,
      unit: "লিঃ",
      ratePerLiter: 145,
      supplierName: "মেসার্স হিল ভিউ",
      totalAmount: 5800,
    },
    {
      id: "f-3",
      fuelType: "অকটেন",
      supplyDate: "2026-06-24",
      qtyLiters: 7,
      unit: "লিঃ",
      ratePerLiter: 145,
      supplierName: "মেসার্স হিল ভিউ",
      totalAmount: 1015,
    },
    {
      id: "f-4",
      fuelType: "মবিল",
      supplyDate: "2026-06-24",
      qtyLiters: 5,
      unit: "লিঃ",
      ratePerLiter: 1000,
      supplierName: "মেসার্স হিল ভিউ",
      totalAmount: 5000,
    },
  ]);

  const defaultSupplierOrg1 = "কম্পিউটার ভিলেজ, বনরূপা, রাঙ্গামাটি।";
  const defaultSupplierOrg2 = "কম্পিউটার পার্ক, বনরূপা, রাঙ্গামাটি।";
  const defaultSupplierOrg3 = "ডাইনামিক কম্পিউটার, বনরূপা, রাঙ্গামাটি।";
  const [supplyRecipientName, setSupplyRecipientName] = useState(
    "জনাব সুমন বিকাশ চাকমা",
  );
  const [supplyRecipientDesignation, setSupplyRecipientDesignation] =
    useState("সিইও");
  const [supplyRecipientOrgName, setSupplyRecipientOrgName] =
    useState("কম্পিউটার ভিলেজ");
  const [supplyRecipientAddress1, setSupplyRecipientAddress1] =
    useState("বনরূপা");
  const [supplyRecipientAddress2, setSupplyRecipientAddress2] =
    useState("রাঙ্গামাটি।");
  const [supplierOrg1, setSupplierOrg1] = useState(defaultSupplierOrg1);
  const [supplierOrg2, setSupplierOrg2] = useState(defaultSupplierOrg2);
  const [supplierOrg3, setSupplierOrg3] = useState(defaultSupplierOrg3);

  const [form2Items, setForm2Items] = useState<
    Array<{
      itemDescription: string;
      qty: number;
      unit: string;
      suppliers: Array<{
        orgIndex: number;
        orgName: string;
        unitPrice: number;
        qty: number;
        totalPrice: number;
        remarks: string;
      }>;
    }>
  >([
    {
      itemDescription: "সঞ্চয়ী হিসাব জমা বই",
      qty: 1000,
      unit: "টি",
      suppliers: [
        {
          orgIndex: 1,
          orgName: defaultSupplierOrg1,
          unitPrice: 9.35,
          qty: 1000,
          totalPrice: 9350,
          remarks: "সর্বনিম্ন দরদাতা",
        },
        {
          orgIndex: 2,
          orgName: defaultSupplierOrg2,
          unitPrice: 8.08,
          qty: 1000,
          totalPrice: 8080,
          remarks: "সর্বোচ্চ দরদাতা",
        },
        {
          orgIndex: 3,
          orgName: defaultSupplierOrg3,
          unitPrice: 8.2,
          qty: 1000,
          totalPrice: 8200,
          remarks: "২য় সর্বোচ্চ দরদাতা",
        },
      ],
    },
  ]);

  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([
    {
      itemDescription: "",
      specification: "",
      qty: 1,
      unit: "টি",
      unitPrice: 0,
      totalPrice: 0,
      vatRate: 0,
      taxRate: 0,
      remarks: "",
      suppliers: [
        {
          nameAndAddress: "",
          unitPrice: 0,
          qty: 1,
          totalPrice: 0,
          vatRate: 0,
          taxRate: 0,
          remarks: "",
        },
      ],
    },
  ]);

  const [branchEntries, setBranchEntries] = useState<BranchDebitEntry[]>([]);

  const [applicantType, setApplicantType] = useState<
    "OwnOffice" | "PersonInstitution"
  >("OwnOffice");
  const [applicantName, setApplicantName] = useState("");
  const [applicantDesignation, setApplicantDesignation] = useState("");
  const [applicantInstitution, setApplicantInstitution] = useState("");

  const currentFYObj = financialYears.find((fy) => fy.id === selectedFY);
  const isFYClosed = !!currentFYObj?.isClosed;

  const availableCategories =
    expenseType === "Quotation"
      ? categories.filter(
          (c) =>
            (c.status === "Active" && c.allowInQuotation !== false) ||
            (editingExpenseId && c.id === categoryId),
        )
      : categories.filter(
          (c) =>
            c.status === "Active" || (editingExpenseId && c.id === categoryId),
        );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError(
        language === "bn"
          ? "ফাইলের আকার ৫ MB এর বেশি হতে পারবে না।"
          : "File size cannot exceed 5 MB.",
      );
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["pdf", "jpg", "jpeg", "png", "docx"];
    if (!ext || !allowed.includes(ext)) {
      setUploadError(
        language === "bn"
          ? "অনুমোদিত ফাইল ফরম্যাট: pdf, jpg, jpeg, png, docx।"
          : "Allowed file formats: pdf, jpg, jpeg, png, docx.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadingDoc(true);
        const base64Data = reader.result as string;
        const res = await apiFetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            originalName: file.name,
            expenseId: editingExpenseId || "exp",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.url) {
          setUploadError(
            data.error ||
              (language === "bn"
                ? "ফাইল আপলোড ব্যর্থ হয়েছে।"
                : "File upload failed."),
          );
        } else {
          setSupportingDocument(data.url);
        }
      } catch (err: any) {
        setUploadError(err.message || "Upload failed");
      } finally {
        setUploadingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setOfficeId(isHeadOffice ? offices[0]?.id || "" : currentUser.officeId);
    setCategoryId(categories[0]?.id || "");
    setAmount("");
    setVoucherNo("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setVatRate("");
    setTaxRate("0");
    setHasStockChalan("হ্যাঁ");
    setExpenseType("General");
    setQuotationFormType("Form1");
    setMemoForwardingNo("সূত্র নং-কশি-০৬ (অংশ-০৩)/২০২৬-২০২৭/");
    setMemoSupplyOrderNo("সূত্র নং-প্রশ-১(৪০)/২০২৬-২০২৭/");
    setQuotationDate(new Date().toISOString().split("T")[0]);
    setSupplyRecipientName("জনাব সুমন বিকাশ চাকমা");
    setSupplyRecipientDesignation("সিইও");
    setSupplyRecipientOrgName("কম্পিউটার ভিলেজ");
    setSupplyRecipientAddress1("বনরূপা");
    setSupplyRecipientAddress2("রাঙ্গামাটি।");
    setSupplierOrg1(defaultSupplierOrg1);
    setSupplierOrg2(defaultSupplierOrg2);
    setSupplierOrg3(defaultSupplierOrg3);
    setForm2Items([
      {
        itemDescription: "সঞ্চয়ী হিসাব জমা বই",
        qty: 1000,
        unit: "টি",
        suppliers: [
          {
            orgIndex: 1,
            orgName: defaultSupplierOrg1,
            unitPrice: 9.35,
            qty: 1000,
            totalPrice: 9350,
            remarks: "সর্বনিম্ন দরদাতা",
          },
          {
            orgIndex: 2,
            orgName: defaultSupplierOrg2,
            unitPrice: 8.08,
            qty: 1000,
            totalPrice: 8080,
            remarks: "সর্বোচ্চ দরদাতা",
          },
          {
            orgIndex: 3,
            orgName: defaultSupplierOrg3,
            unitPrice: 8.2,
            qty: 1000,
            totalPrice: 8200,
            remarks: "২য় সর্বোচ্চ দরদাতা",
          },
        ],
      },
    ]);
    setHasStockChalan("হ্যাঁ");
    setDebitAccount(categories[0]?.code || "১১৬/০১");
    setQuotationItems([
      {
        itemDescription: "",
        specification: "",
        qty: 1,
        unit: "টি",
        unitPrice: 0,
        totalPrice: 0,
        vatRate: 0,
        taxRate: 0,
        remarks: "",
        suppliers: [
          {
            nameAndAddress: "",
            unitPrice: 0,
            qty: 1,
            totalPrice: 0,
            vatRate: 0,
            taxRate: 0,
            remarks: "",
          },
        ],
      },
    ]);
    setBranchEntries([]);
    setNoteSheetId("");
    setVehicleModel("জীপ");
    setVehicleRegNo("ঢাকা-মেট্রো-ঘ-১৪-১১৩২");
    setMotorDocType("application");
    setFuelMonthYear("জুন/২০২৬");
    setFuelType("অকটেন");
    setFuelSupplierName("মেসার্স হিল ভিউ");
    setFuelItems([
      {
        id: "f-1",
        fuelType: "অকটেন",
        supplyDate: "2026-06-02",
        qtyLiters: 20,
        unit: "লিঃ",
        ratePerLiter: 145,
        supplierName: "মেসার্স হিল ভিউ",
        totalAmount: 2900,
      },
      {
        id: "f-2",
        fuelType: "অকটেন",
        supplyDate: "2026-06-09",
        qtyLiters: 40,
        unit: "লিঃ",
        ratePerLiter: 145,
        supplierName: "মেসার্স হিল ভিউ",
        totalAmount: 5800,
      },
      {
        id: "f-3",
        fuelType: "অকটেন",
        supplyDate: "2026-06-24",
        qtyLiters: 7,
        unit: "লিঃ",
        ratePerLiter: 145,
        supplierName: "মেসার্স হিল ভিউ",
        totalAmount: 1015,
      },
      {
        id: "f-4",
        fuelType: "মবিল",
        supplyDate: "2026-06-24",
        qtyLiters: 5,
        unit: "লিঃ",
        ratePerLiter: 1000,
        supplierName: "মেসার্স হিল ভিউ",
        totalAmount: 5000,
      },
    ]);
    setApplicantType("OwnOffice");
    setApplicantName("");
    setApplicantDesignation("");
    setApplicantInstitution("");
    setSupportingDocument("");
    setUploadingDoc(false);
    setUploadError("");
    setErrorMessage("");
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditClick = (exp: Expense) => {
    if (exp.noteSheetId) {
      const ns = noteSheets.find((n) => n.id === exp.noteSheetId);
      if (ns && ns.status === "Approved") {
        alert(
          language === "bn"
            ? "এই ব্যয়ের নোটশিট অনুমোদিত (Approved) হয়েছে। সরাসরি সম্পাদনা না করে নতুন Adjustment বা সংশোধনী এন্ট্রি দিন।"
            : "Approved note sheet exists. Please use Adjustment entry.",
        );
        return;
      }
    }

    setEditingExpenseId(exp.id);
    setOfficeId(exp.officeId);
    setCategoryId(exp.categoryId);
    setAmount(String(exp.amount));
    setVoucherNo(exp.voucherNo || "");
    setVoucherDate(exp.voucherDate || new Date().toISOString().split("T")[0]);
    setExpenseDate(exp.expenseDate || new Date().toISOString().split("T")[0]);
    setDescription(exp.description || "");
    setVatRate(exp.vatRate !== undefined ? String(exp.vatRate) : "");
    setTaxRate(exp.taxRate !== undefined ? String(exp.taxRate) : "0");
    if (exp.hasStockChalan) {
      setHasStockChalan(exp.hasStockChalan);
    } else if (exp.expenseType === "Quotation") {
      setHasStockChalan(
        exp.taxRate === 0 || exp.taxRate === undefined ? "হ্যাঁ" : "না",
      );
    } else {
      setHasStockChalan("হ্যাঁ");
    }
    setVatChalanNo(exp.vatChalanNo || "২৫২৮০০০০০৮২৮৬৮");
    setVatChalanDate(exp.vatChalanDate || "");
    setExpenseType(exp.expenseType || "General");
    setQuotationFormType(exp.quotationFormType || "Form1");
    setDebitAccount(exp.debitAccount || categories[0]?.code || "১১৬/০১");
    if (exp.memoForwardingNo) setMemoForwardingNo(exp.memoForwardingNo);
    if (exp.memoSupplyOrderNo) setMemoSupplyOrderNo(exp.memoSupplyOrderNo);
    if (exp.quotationDate) setQuotationDate(exp.quotationDate);
    if (exp.supplyRecipientName)
      setSupplyRecipientName(exp.supplyRecipientName);
    if (exp.supplyRecipientDesignation)
      setSupplyRecipientDesignation(exp.supplyRecipientDesignation);
    if (exp.supplyRecipientOrgName)
      setSupplyRecipientOrgName(exp.supplyRecipientOrgName);
    if (exp.supplyRecipientAddress1)
      setSupplyRecipientAddress1(exp.supplyRecipientAddress1);
    if (exp.supplyRecipientAddress2)
      setSupplyRecipientAddress2(exp.supplyRecipientAddress2);
    if (exp.supplierOrg1) setSupplierOrg1(exp.supplierOrg1);
    if (exp.supplierOrg2) setSupplierOrg2(exp.supplierOrg2);
    if (exp.supplierOrg3) setSupplierOrg3(exp.supplierOrg3);
    if (exp.vehicleModel) setVehicleModel(exp.vehicleModel);
    else setVehicleModel("Toyota Land Cruiser Prado");
    if (exp.vehicleRegNo) setVehicleRegNo(exp.vehicleRegNo);
    else setVehicleRegNo("ঢাকা-মেট্রো-ঘ-১৪-১১৩২");
    if (exp.fuelMonthYear) setFuelMonthYear(exp.fuelMonthYear);
    else setFuelMonthYear("জুন/২০২৬");
    if (exp.fuelType) setFuelType(exp.fuelType);
    else setFuelType("অকটেন");
    if (exp.fuelSupplierName) setFuelSupplierName(exp.fuelSupplierName);
    else setFuelSupplierName("মেসার্স হিল ভিউ");

    let loadedFuelItems: FuelExpenseItem[] = [];
    const rawFuelItems = exp.fuelItems as any;
    if (rawFuelItems) {
      if (Array.isArray(rawFuelItems) && rawFuelItems.length > 0) {
        loadedFuelItems = rawFuelItems;
      } else if (typeof rawFuelItems === "string" && rawFuelItems.trim()) {
        try {
          const parsed = JSON.parse(rawFuelItems);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedFuelItems = parsed;
          }
        } catch {}
      }
    }

    const expCategory = categories.find((c) => c.id === exp.categoryId);
    const isThisFuelCategory = isVehicleFuelCategory(expCategory);

    if (exp.motorDocType) {
      setMotorDocType(exp.motorDocType);
    } else {
      setMotorDocType("application");
    }

    if (
      loadedFuelItems.length > 0 &&
      loadedFuelItems.some(
        (it) => Number(it.qtyLiters) > 0 || Number(it.totalAmount) > 0,
      )
    ) {
      setFuelItems(loadedFuelItems);
    } else if (isThisFuelCategory) {
      setFuelItems([
        {
          id: "f-1",
          fuelType: "অকটেন",
          supplyDate: "2026-06-02",
          qtyLiters: 20,
          unit: "লিঃ",
          ratePerLiter: 145,
          supplierName: exp.fuelSupplierName || "মেসার্স হিল ভিউ",
          totalAmount: 2900,
        },
        {
          id: "f-2",
          fuelType: "অকটেন",
          supplyDate: "2026-06-09",
          qtyLiters: 40,
          unit: "লিঃ",
          ratePerLiter: 145,
          supplierName: exp.fuelSupplierName || "মেসার্স হিল ভিউ",
          totalAmount: 5800,
        },
        {
          id: "f-3",
          fuelType: "অকটেন",
          supplyDate: "2026-06-24",
          qtyLiters: 7,
          unit: "লিঃ",
          ratePerLiter: 145,
          supplierName: exp.fuelSupplierName || "মেসার্স হিল ভিউ",
          totalAmount: 1015,
        },
        {
          id: "f-4",
          fuelType: "মবিল",
          supplyDate: "2026-06-24",
          qtyLiters: 5,
          unit: "লিঃ",
          ratePerLiter: 1000,
          supplierName: exp.fuelSupplierName || "মেসার্স হিল ভিউ",
          totalAmount: 5000,
        },
      ]);
    } else {
      setFuelItems(
        loadedFuelItems.length > 0
          ? loadedFuelItems
          : [
              {
                id: "f-1",
                fuelType: exp.fuelType || "অকটেন",
                receiptNoDate: exp.voucherNo
                  ? `ক্যাশ মেমো নং-${exp.voucherNo}`
                  : "ক্যাশ মেমো অনুযায়ী",
                qtyLiters: 0,
                ratePerLiter: 0,
                totalAmount: Number(exp.amount || 0),
                prevPayOrderNoDate: "",
              },
            ],
      );
    }

    if (exp.quotationItems && exp.quotationItems.length > 0) {
      if (exp.quotationFormType === "Form2") {
        const loadedForm2Items = exp.quotationItems.map((qi) => ({
          itemDescription: qi.itemDescription || "",
          qty: qi.qty || 1,
          unit: qi.unit || "টি",
          suppliers:
            qi.suppliers && qi.suppliers.length >= 3
              ? qi.suppliers.slice(0, 3).map((s, idx) => ({
                  orgIndex: idx + 1,
                  orgName:
                    s.nameAndAddress ||
                    (idx === 0
                      ? exp.supplierOrg1 || defaultSupplierOrg1
                      : idx === 1
                        ? exp.supplierOrg2 || defaultSupplierOrg2
                        : exp.supplierOrg3 || defaultSupplierOrg3),
                  unitPrice: s.unitPrice || 0,
                  qty: s.qty || qi.qty || 1,
                  totalPrice:
                    s.totalPrice || (s.unitPrice || 0) * (s.qty || qi.qty || 1),
                  remarks:
                    s.remarks ||
                    (idx === 0
                      ? "সর্বনিম্ন দরদাতা"
                      : idx === 1
                        ? "সর্বোচ্চ দরদাতা"
                        : "২য় সর্বোচ্চ দরদাতা"),
                }))
              : [
                  {
                    orgIndex: 1,
                    orgName: exp.supplierOrg1 || defaultSupplierOrg1,
                    unitPrice: qi.unitPrice || 0,
                    qty: qi.qty || 1,
                    totalPrice: qi.totalPrice || 0,
                    remarks: "সর্বনিম্ন দরদাতা",
                  },
                  {
                    orgIndex: 2,
                    orgName: exp.supplierOrg2 || defaultSupplierOrg2,
                    unitPrice: 0,
                    qty: qi.qty || 1,
                    totalPrice: 0,
                    remarks: "সর্বোচ্চ দরদাতা",
                  },
                  {
                    orgIndex: 3,
                    orgName: exp.supplierOrg3 || defaultSupplierOrg3,
                    unitPrice: 0,
                    qty: qi.qty || 1,
                    totalPrice: 0,
                    remarks: "২য় সর্বোচ্চ দরদাতা",
                  },
                ],
        }));
        setForm2Items(loadedForm2Items);
      } else {
        setQuotationItems(exp.quotationItems);
      }
    } else if (exp.expenseType === "Quotation") {
      const defaultItems: QuotationItem[] = [
        {
          itemDescription: exp.description || "পণ্য/সামগ্রী ক্রয়",
          specification: "",
          qty: 1,
          unit: "টি",
          unitPrice: Number(exp.amount || exp.baseAmount || 0),
          totalPrice: Number(exp.amount || exp.baseAmount || 0),
          vatRate: exp.vatRate || 0,
          taxRate: exp.taxRate || 0,
          remarks: "সর্বনিম্ন দরদাতা",
          suppliers: [
            {
              nameAndAddress: exp.supplierOrg1 || defaultSupplierOrg1,
              unitPrice: Number(exp.amount || exp.baseAmount || 0),
              qty: 1,
              totalPrice: Number(exp.amount || exp.baseAmount || 0),
              vatRate: exp.vatRate || 0,
              taxRate: exp.taxRate || 0,
              remarks: "সর্বনিম্ন দরদাতা",
            },
            {
              nameAndAddress: exp.supplierOrg2 || defaultSupplierOrg2,
              unitPrice: Math.round(
                Number(exp.amount || exp.baseAmount || 0) * 1.08,
              ),
              qty: 1,
              totalPrice: Math.round(
                Number(exp.amount || exp.baseAmount || 0) * 1.08,
              ),
              vatRate: exp.vatRate || 0,
              taxRate: exp.taxRate || 0,
              remarks: "২য় সর্বোচ্চ দরদাতা",
            },
            {
              nameAndAddress: exp.supplierOrg3 || defaultSupplierOrg3,
              unitPrice: Math.round(
                Number(exp.amount || exp.baseAmount || 0) * 1.12,
              ),
              qty: 1,
              totalPrice: Math.round(
                Number(exp.amount || exp.baseAmount || 0) * 1.12,
              ),
              vatRate: exp.vatRate || 0,
              taxRate: exp.taxRate || 0,
              remarks: "সর্বোচ্চ দরদাতা",
            },
          ],
        },
      ];
      if (exp.quotationFormType === "Form2") {
        setForm2Items(
          defaultItems.map((qi) => ({
            itemDescription: qi.itemDescription,
            qty: qi.qty || 1,
            unit: qi.unit || "টি",
            suppliers: qi.suppliers!.map((s, idx) => ({
              orgIndex: idx + 1,
              orgName: s.nameAndAddress,
              unitPrice: s.unitPrice || 0,
              qty: s.qty || 1,
              totalPrice: s.totalPrice || 0,
              remarks: s.remarks || "",
            })),
          })),
        );
      } else {
        setQuotationItems(defaultItems);
      }
    }
    setBranchEntries(
      exp.branchEntries && Array.isArray(exp.branchEntries)
        ? exp.branchEntries
        : [],
    );
    setNoteSheetId(exp.noteSheetId || "");
    setApplicantType(exp.applicant?.type || "OwnOffice");
    setApplicantName(exp.applicant?.name || "");
    setApplicantDesignation(exp.applicant?.designation || "");
    setApplicantInstitution(exp.applicant?.institutionName || "");
    setSupportingDocument(exp.supportingDocument || "");
    setUploadingDoc(false);
    setUploadError("");
    setErrorMessage("");
    setShowModal(true);
  };

  const parseOrgAddress = (raw: string) => {
    if (!raw) return { orgName: "", address1: "", address2: "" };
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      return { orgName: parts[0] || "", address1: "", address2: "" };
    } else if (parts.length === 2) {
      return { orgName: parts[0], address1: parts[1], address2: "" };
    } else if (parts.length === 3) {
      return { orgName: parts[0], address1: parts[1], address2: parts[2] };
    } else {
      const orgName = parts.slice(0, Math.min(2, parts.length - 2)).join(", ");
      const address1 = parts
        .slice(Math.min(2, parts.length - 2), parts.length - 1)
        .join(", ");
      const address2 = parts[parts.length - 1];
      return { orgName, address1, address2 };
    }
  };

  const form1LowestBidder = useMemo(() => {

    const supplierTotals: { [name: string]: number } = {};
    const firstSupplierNames: string[] = [];

    quotationItems.forEach((item) => {
      (item.suppliers || []).forEach((s) => {
        const name = (s.nameAndAddress || "").trim();
        if (name) {
          if (!supplierTotals[name]) {
            supplierTotals[name] = 0;
            firstSupplierNames.push(name);
          }
          supplierTotals[name] += s.totalPrice || item.qty * (s.unitPrice || 0);
        }
      });
    });

    const entries = Object.entries(supplierTotals);
    if (entries.length === 0) {
      return {
        name: "",
        total: 0,
        parsed: parseOrgAddress(""),
      };
    }

    const minEntry = entries.reduce(
      (min, cur) => (cur[1] < min[1] ? cur : min),
      entries[0],
    );
    return {
      name: minEntry[0],
      total: minEntry[1],
      parsed: parseOrgAddress(minEntry[0]),
    };
  }, [quotationItems]);

  const suggestedSuppliers = useMemo(() => {
    const set = new Set<string>();

    quotationItems.forEach((item) => {
      item.suppliers?.forEach((s) => {
        if (s.nameAndAddress?.trim()) set.add(s.nameAndAddress.trim());
      });
    });

    if (supplierOrg1?.trim()) set.add(supplierOrg1.trim());
    if (supplierOrg2?.trim()) set.add(supplierOrg2.trim());
    if (supplierOrg3?.trim()) set.add(supplierOrg3.trim());
    form2Items.forEach((item) => {
      item.suppliers?.forEach((s) => {
        if (s.orgName?.trim()) set.add(s.orgName.trim());
      });
    });

    expenses.forEach((exp) => {
      if (exp.supplierOrg1?.trim()) set.add(exp.supplierOrg1.trim());
      if (exp.supplierOrg2?.trim()) set.add(exp.supplierOrg2.trim());
      if (exp.supplierOrg3?.trim()) set.add(exp.supplierOrg3.trim());
      if (exp.supplyRecipientOrgName?.trim())
        set.add(exp.supplyRecipientOrgName.trim());
      exp.quotationItems?.forEach((qi: any) => {
        qi.suppliers?.forEach((s: any) => {
          const n = (s.nameAndAddress || s.orgName || "").trim();
          if (n) set.add(n);
        });
      });
    });

    const defaults = [
      "কম্পিউটার পার্ক, বনরুপা, রাঙ্গামাটি",
      "কম্পিউটার ভিলেজ, বনরুপা, রাঙ্গামাটি",
      "ডাইনামিক কম্পিউটার, বনরুপা, রাঙ্গামাটি",
      "ইউনিক প্রিন্টার্স, ১৬ আলিফ বিপণি সেন্টার, নজির আহমেদ চৌধুরী রোড, আন্দরকিল্লা, চট্টগ্রাম।",
      "মেসার্স খাজা প্রিন্টিং প্রেস, আন্দরকিল্লা, চট্টগ্রাম।",
      "মেসার্স শাহ আমানত প্রেস, আন্দরকিল্লা, চট্টগ্রাম।",
      "পূবালী আর্ট প্রেস এন্ড স্টেশনারীজ, খাসেম মার্কেট, মোমিন রোড, চট্টগ্রাম।",
      "জননী গ্লাস এজেন্সী, বনরুপা, রাঙ্গামাটি।",
      "মায়ের দোয়া গ্লাস এন্ড থাই এ্যালুমিনিয়াম, ফিসারীঘাট, শান্তিনগর, রাঙ্গামাটি।",
      "আজমীর গ্লাস এন্ড থাই এ্যালুমিনিয়াম, রিজার্ভ বাজার, রাঙ্গামাটি।",
    ];
    defaults.forEach((d) => set.add(d));

    return Array.from(set).filter(Boolean);
  }, [
    expenses,
    quotationItems,
    supplierOrg1,
    supplierOrg2,
    supplierOrg3,
    form2Items,
  ]);

  const form2LowestBidder = useMemo(() => {
    const org1Total = form2Items.reduce(
      (acc, item) => acc + (Number(item.suppliers[0]?.totalPrice) || 0),
      0,
    );
    const org2Total = form2Items.reduce(
      (acc, item) => acc + (Number(item.suppliers[1]?.totalPrice) || 0),
      0,
    );
    const org3Total = form2Items.reduce(
      (acc, item) => acc + (Number(item.suppliers[2]?.totalPrice) || 0),
      0,
    );

    const orgs = [
      { index: 1, name: supplierOrg1 || defaultSupplierOrg1, total: org1Total },
      { index: 2, name: supplierOrg2 || defaultSupplierOrg2, total: org2Total },
      { index: 3, name: supplierOrg3 || defaultSupplierOrg3, total: org3Total },
    ];

    const withPrice = orgs.filter((o) => o.total > 0);
    if (withPrice.length === 0) {
      return { ...orgs[0], parsed: parseOrgAddress(orgs[0].name) };
    }
    const minOrg = withPrice.reduce(
      (min, cur) => (cur.total < min.total ? cur : min),
      withPrice[0],
    );
    return { ...minOrg, parsed: parseOrgAddress(minOrg.name) };
  }, [form2Items, supplierOrg1, supplierOrg2, supplierOrg3]);

  const effectiveTaxRate =
    expenseType === "Quotation" && hasStockChalan === "হ্যাঁ"
      ? 0
      : Number(taxRate) || 0;
  const effectiveVatRate = Number(vatRate) || 0;

  const form1LowestBaseTotal = useMemo(() => {
    return quotationItems.reduce(
      (acc, item) => acc + (item.totalPrice || 0),
      0,
    );
  }, [quotationItems]);

  const form1VatAmount = useMemo(() => {
    return (form1LowestBaseTotal * effectiveVatRate) / 100;
  }, [form1LowestBaseTotal, effectiveVatRate]);

  const form1TaxAmount = useMemo(() => {
    return (form1LowestBaseTotal * effectiveTaxRate) / 100;
  }, [form1LowestBaseTotal, effectiveTaxRate]);

  const form1GrandTotal = useMemo(() => {
    return form1LowestBaseTotal + form1VatAmount + form1TaxAmount;
  }, [form1LowestBaseTotal, form1VatAmount, form1TaxAmount]);

  const form2LowestBaseTotal = useMemo(() => {
    return (
      form2LowestBidder.total ||
      form2Items.reduce(
        (acc, item) => acc + (Number(item.suppliers[0]?.totalPrice) || 0),
        0,
      )
    );
  }, [form2LowestBidder, form2Items]);

  const form2VatAmount = useMemo(() => {
    return (form2LowestBaseTotal * effectiveVatRate) / 100;
  }, [form2LowestBaseTotal, effectiveVatRate]);

  const form2TaxAmount = useMemo(() => {
    return (form2LowestBaseTotal * effectiveTaxRate) / 100;
  }, [form2LowestBaseTotal, effectiveTaxRate]);

  const form2GrandTotal = useMemo(() => {
    return form2LowestBaseTotal + form2VatAmount + form2TaxAmount;
  }, [form2LowestBaseTotal, form2VatAmount, form2TaxAmount]);

  const effectiveCurrentAmount = useMemo(() => {
    if (expenseType === "Quotation") {
      return quotationFormType === "Form1" ? form1GrandTotal : form2GrandTotal;
    }
    return Number(amount) || 0;
  }, [
    expenseType,
    quotationFormType,
    form1GrandTotal,
    form2GrandTotal,
    amount,
  ]);

  const handleForm2SupplierNameChange = (
    orgIdx: 1 | 2 | 3,
    newName: string,
  ) => {
    if (orgIdx === 1) setSupplierOrg1(newName);
    if (orgIdx === 2) setSupplierOrg2(newName);
    if (orgIdx === 3) setSupplierOrg3(newName);

    setForm2Items((prev) =>
      prev.map((item) => {
        const sups = [...item.suppliers];
        if (sups[orgIdx - 1]) {
          sups[orgIdx - 1] = { ...sups[orgIdx - 1], orgName: newName };
        }
        return { ...item, suppliers: sups };
      }),
    );
  };

  const handleForm2PriceChange = (
    itemIdx: number,
    supIdx: number,
    price: number,
  ) => {
    setForm2Items((prev) => {
      const updated = [...prev];
      const targetItem = { ...updated[itemIdx] };
      const suppliers = targetItem.suppliers.map((s) => ({ ...s }));

      suppliers[supIdx].unitPrice = price;
      suppliers[supIdx].totalPrice = Number(
        (price * targetItem.qty).toFixed(2),
      );

      const prices = suppliers.map((s) => s.unitPrice || 0);
      const positivePrices = prices.filter((p) => p > 0);
      const minPrice =
        positivePrices.length > 0 ? Math.min(...positivePrices) : 0;
      const maxPrice =
        positivePrices.length > 0 ? Math.max(...positivePrices) : 0;

      suppliers.forEach((s, _idx) => {
        if (s.unitPrice === minPrice && minPrice > 0) {
          s.remarks = "সর্বনিম্ন দরদাতা";
        } else if (
          s.unitPrice === maxPrice &&
          maxPrice > 0 &&
          positivePrices.length > 1
        ) {
          s.remarks = "সর্বোচ্চ দরদাতা";
        } else if (s.unitPrice > 0) {
          s.remarks = "২য় সর্বোচ্চ দরদাতা";
        } else {
          s.remarks = "";
        }
      });

      targetItem.suppliers = suppliers;
      updated[itemIdx] = targetItem;
      return updated;
    });
  };

  const handleForm2QtyChange = (itemIdx: number, qty: number) => {
    setForm2Items((prev) => {
      const updated = [...prev];
      const targetItem = { ...updated[itemIdx] };
      targetItem.qty = qty;
      const suppliers = targetItem.suppliers.map((s) => ({
        ...s,
        qty: qty,
        totalPrice: Number((s.unitPrice * qty).toFixed(2)),
      }));

      targetItem.suppliers = suppliers;
      updated[itemIdx] = targetItem;
      return updated;
    });
  };

  const handleForm2ItemDescChange = (itemIdx: number, desc: string) => {
    setForm2Items((prev) => {
      const updated = [...prev];
      updated[itemIdx] = { ...updated[itemIdx], itemDescription: desc };
      return updated;
    });
  };

  const handleForm2UnitChange = (itemIdx: number, unit: string) => {
    setForm2Items((prev) => {
      const updated = [...prev];
      updated[itemIdx] = { ...updated[itemIdx], unit };
      return updated;
    });
  };

  const handleAddForm2Item = () => {
    setForm2Items((prev) => [
      ...prev,
      {
        itemDescription: "",
        qty: 1,
        unit: "টি",
        suppliers: [
          {
            orgIndex: 1,
            orgName: supplierOrg1,
            unitPrice: 0,
            qty: 1,
            totalPrice: 0,
            remarks: "",
          },
          {
            orgIndex: 2,
            orgName: supplierOrg2,
            unitPrice: 0,
            qty: 1,
            totalPrice: 0,
            remarks: "",
          },
          {
            orgIndex: 3,
            orgName: supplierOrg3,
            unitPrice: 0,
            qty: 1,
            totalPrice: 0,
            remarks: "",
          },
        ],
      },
    ]);
  };

  const handleRemoveForm2Item = (itemIdx: number) => {
    if (form2Items.length <= 1) return;
    setForm2Items((prev) => prev.filter((_, i) => i !== itemIdx));
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchFY = e.financialYearId === selectedFY;
    const matchOffice = isHeadOffice
      ? true
      : e.officeId === currentUser.officeId;

    let matchStatus = true;
    if (currentStatusFilter === "Pending") {
      matchStatus = e.status === "Pending";
    } else if (currentStatusFilter === "Approved") {
      matchStatus = e.status === "Approved" || !e.status;
    } else if (currentStatusFilter === "Rejected") {
      matchStatus = e.status === "Rejected";
    }

    return matchFY && matchOffice && matchStatus;
  });

  const editingExpenseObj = editingExpenseId
    ? expenses.find((e) => e.id === editingExpenseId)
    : null;
  const activeModalFY = editingExpenseObj?.financialYearId || selectedFY;
  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentFY = financialYears.find((f) => f.id === activeModalFY);

  const is133SeriesCategory = (cat?: { id?: string; code?: string; name?: string } | null) => {
    if (!cat) return false;
    return Boolean(
      (cat.code && (cat.code.startsWith("১৩৩/") || cat.code.startsWith("133/"))) ||
      cat.id === "cat-32" ||
      cat.id === "cat-33"
    );
  };

  const isVehicleFuelOrMaintenanceCategory = (cat?: { id?: string; code?: string; name?: string } | null) => {
    if (!cat) return false;
    const code = (cat.code || "").trim();
    if (
      code === "১৩৩/২৬" ||
      code === "133/26" ||
      code === "১৩৩/২৬ (এ)" ||
      code === "133/26 (A)" ||
      code === "133/26(A)" ||
      code === "১৩৩/২৬(এ)" ||
      code.startsWith("১৩৩/২৬") ||
      code.startsWith("133/26")
    ) {
      return true;
    }
    if (cat.id === "cat-32" || cat.id === "cat-33") {
      return true;
    }
    const name = cat.name || "";
    const isVehicle = name.includes("গাড়ী") || name.includes("গাড়ি") || name.includes("মোটর");
    const isFuel = name.includes("জ্বালানী") || name.includes("জ্বালানি") || name.includes("ফুয়েল") || name.toLowerCase().includes("fuel");
    const isMaintenance = name.includes("রক্ষণাবেক্ষণ") || name.includes("রক্ষণাবেক্ষন") || (name.includes("মেরামত") && isVehicle);
    return isVehicle && (isFuel || isMaintenance);
  };

  const isVehicleFuelCategory = (cat?: { id?: string; code?: string; name?: string } | null) => {
    if (!cat) return false;
    const code = (cat.code || "").trim();
    if (code === "১৩৩/২৬" || code === "133/26" || cat.id === "cat-32") {
      return true;
    }
    const name = cat.name || "";
    const isVehicle = name.includes("গাড়ী") || name.includes("গাড়ি") || name.includes("মোটর");
    const isFuel = name.includes("জ্বালানী") || name.includes("জ্বালানি") || name.includes("ফুয়েল") || name.toLowerCase().includes("fuel");
    return isVehicle && isFuel;
  };

  const _isVehicleMaintenanceCategory = (cat?: { id?: string; code?: string; name?: string } | null) => {
    if (!cat) return false;
    const code = (cat.code || "").trim();
    if (
      code === "১৩৩/২৬ (এ)" ||
      code === "133/26 (A)" ||
      code === "133/26(A)" ||
      code === "১৩৩/২৬(এ)" ||
      cat.id === "cat-33"
    ) {
      return true;
    }
    const name = cat.name || "";
    const isVehicle = name.includes("গাড়ী") || name.includes("গাড়ি") || name.includes("মোটর");
    const isMaintenance = name.includes("রক্ষণাবেক্ষণ") || name.includes("রক্ষণাবেক্ষন") || (name.includes("মেরামত") && isVehicle);
    return isVehicle && isMaintenance;
  };

  const categoryAllocations = allocations.filter(
    (a) =>
      a.financialYearId === activeModalFY &&
      a.officeId === officeId &&
      a.categoryId === categoryId,
  );

  const initialBudget = categoryAllocations
    .filter((a) => a.type === "Initial" || !a.type)
    .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);

  const provisionAmount = categoryAllocations
    .filter((a) => a.type === "Adjustment")
    .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);

  const additionalBudget = categoryAllocations
    .filter((a) => a.type === "Additional")
    .reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);

  const totalAllocated = initialBudget + provisionAmount + additionalBudget;

  const catExpenses = expenses.filter(
    (e) =>
      e.id !== editingExpenseId &&
      e.financialYearId === activeModalFY &&
      e.officeId === officeId &&
      e.categoryId === categoryId,
  );

  const totalSpentApproved = catExpenses
    .filter((e) => e.status === "Approved" || !e.status)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalPending = catExpenses
    .filter((e) => e.status === "Pending")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const availableBalance = totalAllocated - totalSpentApproved - totalPending;
  const isNegativeBalance =
    !currentCategory?.allowExcess && effectiveCurrentAmount > availableBalance;

  const isDuplicateVoucher = expenses.some(
    (e) =>
      e.id !== editingExpenseId &&
      e.financialYearId === activeModalFY &&
      e.officeId === officeId &&
      e.voucherNo.trim().toLowerCase() === voucherNo.trim().toLowerCase() &&
      voucherNo.trim() !== "",
  );

  const handleGenerateNoteSheet = async (expenseId: string) => {
    setGeneratingIds((prev) => new Set(prev).add(expenseId));
    try {
      const res = await apiFetch(
        `/api/expenses/${expenseId}/generate-notesheet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, force: true }),
        },
      );
      const data = await res.json();
      if (data.success) {
        if (refreshData) refreshData();
        showToast(
          language === "bn" ? "নোট শিট তৈরি হয়েছে" : "Note Sheet generated.",
        );
      } else {
        showToast(data.error || "Failed to generate Note Sheet.");
      }
    } catch (_err) {
      showToast("An error occurred while generating.");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(expenseId);
        return next;
      });
    }
  };

  const handleBulkGenerate = async () => {
    const pendingExpenses = filteredExpenses.filter((e) => !e.noteSheetId);
    if (pendingExpenses.length === 0) {
      alert(
        language === "bn"
          ? "কোনো পেন্ডিং নোট শিট নেই।"
          : "No pending note sheets to generate.",
      );
      return;
    }

    let successCount = 0;
    for (const exp of pendingExpenses) {
      try {
        const res = await apiFetch(
          `/api/expenses/${exp.id}/generate-notesheet`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id }),
          },
        );
        const data = await res.json();
        if (data.success) successCount++;
      } catch (_e) {

      }
    }

    if (successCount > 0) {
      if (refreshData) refreshData();
      showToast(
        language === "bn"
          ? `${successCount} টি নোট শিট তৈরি হয়েছে!`
          : `${successCount} Note Sheets generated!`,
      );
    } else {
      showToast(
        language === "bn"
          ? "নোট শিট তৈরি করা যায়নি। অনুগ্রহ করে সংশ্লিষ্ট খাতের টেমপ্লেট কনফিগার করুন।"
          : "Failed to generate note sheets. Ensure templates are configured.",
      );
    }
  };

  const handleApproveAction = async (id: string) => {
    if (!onApproveExpense) return;
    try {
      await onApproveExpense(id);
      showToast(
        language === "bn" ? "ব্যয় অনুমোদিত হয়েছে।" : "Expense approved.",
      );
    } catch (err: any) {
      showToast(err.message || "Failed to approve expense");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingExpenseId || !onRejectExpense) return;
    if (!rejectionReasonInput.trim()) {
      setRejectError(
        language === "bn"
          ? "প্রত্যাখ্যানের কারণ উল্লেখ করা আবশ্যক।"
          : "Rejection reason is required.",
      );
      return;
    }
    try {
      setRejectError("");
      await onRejectExpense(rejectingExpenseId, rejectionReasonInput.trim());
      setRejectingExpenseId(null);
      setRejectionReasonInput("");
    } catch (err: any) {
      setRejectError(err.message || "Failed to reject expense");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (currentFYObj?.startDate && currentFYObj?.endDate && expenseDate) {
      if (
        expenseDate < currentFYObj.startDate ||
        expenseDate > currentFYObj.endDate
      ) {
        setErrorMessage(
          language === "bn"
            ? `ব্যয়ের তারিখ অবশ্যই অর্থবছরের সীমার (${currentFYObj.startDate} হতে ${currentFYObj.endDate}) মধ্যে হতে হবে।`
            : `Expense date must be within financial year limits (${currentFYObj.startDate} to ${currentFYObj.endDate}).`,
        );
        return;
      }
    }

    const effectiveTaxRate =
      expenseType === "Quotation" && hasStockChalan === "হ্যাঁ"
        ? 0
        : Number(taxRate) || 0;
    const effectiveVatRate = Number(vatRate) || 0;

    const form1BaseTotal = quotationItems.reduce(
      (acc, item) => acc + (item.totalPrice || 0),
      0,
    );
    const form1VatAmt = (form1BaseTotal * effectiveVatRate) / 100;
    const form1TaxAmt = (form1BaseTotal * effectiveTaxRate) / 100;
    const form1GrandTotal = form1BaseTotal + form1VatAmt + form1TaxAmt;

    const effectiveAmount =
      expenseType === "Quotation" && quotationFormType === "Form1"
        ? form1GrandTotal
        : expenseType === "Quotation" && quotationFormType === "Form2"
          ? form2GrandTotal
          : Number(amount);

    const finalDescription =
      expenseType === "Quotation" && quotationFormType === "Form1"
        ? quotationItems[0]?.itemDescription || "Quotation Expense"
        : expenseType === "Quotation" && quotationFormType === "Form2"
          ? form2Items
              .map((i) => `${i.itemDescription} (${i.qty} ${i.unit})`)
              .filter(Boolean)
              .join(", ") || "কোটেশন ব্যয় (ফর্ম-২)"
          : description;

    if (
      !effectiveAmount ||
      !voucherNo ||
      (!finalDescription && expenseType !== "Quotation") ||
      isDuplicateVoucher ||
      isNegativeBalance
    )
      return;

    const applicant: ApplicantInfo =
      expenseType === "Quotation"
        ? {
            type: "OwnOffice",
            name: currentUser.name,
            designation: currentUser.designation || "Officer",
            officeId: officeId,
          }
        : {
            type: applicantType,
            name: applicantName || currentUser.name,
            designation:
              applicantDesignation || currentUser.designation || "Officer",
            officeId: applicantType === "OwnOffice" ? officeId : undefined,
            institutionName:
              applicantType === "PersonInstitution"
                ? applicantInstitution
                : undefined,
          };

    const entryOfficer: EntryOfficerInfo = {
      name: currentUser.name,
      designation: currentUser.designation || "Officer",
      officeId: currentUser.officeId,
      userId: currentUser.id,
      dateTime: new Date().toISOString().replace("T", " ").substring(0, 19),
    };

    const categoryObj = categories.find((c) => c.id === categoryId);
    const defaultStatus =
      categoryObj?.requireApproval === false ? "Approved" : "Pending";

    const serializedQuotationItems =
      expenseType === "Quotation" && quotationFormType === "Form1"
        ? quotationItems.map((item) => ({
            ...item,
            vatRate: effectiveVatRate,
            taxRate: effectiveTaxRate,
          }))
        : expenseType === "Quotation" && quotationFormType === "Form2"
          ? form2Items.map((item) => ({
              itemDescription: item.itemDescription,
              specification: "",
              qty: item.qty,
              unit: item.unit,
              unitPrice: item.suppliers[0]?.unitPrice || 0,
              totalPrice: item.suppliers[0]?.totalPrice || 0,
              vatRate: effectiveVatRate,
              taxRate: effectiveTaxRate,
              remarks: item.suppliers[0]?.remarks || "সর্বনিম্ন দরদাতা",
              suppliers: item.suppliers.map((s) => ({
                nameAndAddress: s.orgName,
                unitPrice: s.unitPrice,
                qty: s.qty,
                totalPrice: s.totalPrice,
                vatRate: effectiveVatRate,
                taxRate: effectiveTaxRate,
                remarks: s.remarks,
              })),
            }))
          : undefined;

    const quotationPayload =
      expenseType === "Quotation"
        ? {
            baseAmount:
              quotationFormType === "Form1"
                ? form1BaseTotal
                : form2LowestBaseTotal,
            vatRate: vatRate ? Number(vatRate) : undefined,
            vatAmount:
              quotationFormType === "Form1" ? form1VatAmt : form2VatAmount,
            taxRate: effectiveTaxRate,
            taxAmount:
              quotationFormType === "Form1" ? form1TaxAmt : form2TaxAmount,
            hasStockChalan: hasStockChalan,
            vatChalanNo: hasStockChalan === "হ্যাঁ" ? vatChalanNo : undefined,
            vatChalanDate:
              hasStockChalan === "হ্যাঁ" ? vatChalanDate : undefined,
          }
        : {
            baseAmount: undefined,
            vatRate: vatRate ? Number(vatRate) : undefined,
            vatAmount: undefined,
            taxRate: effectiveTaxRate,
            taxAmount: undefined,
            hasStockChalan: undefined,
            vatChalanNo: undefined,
            vatChalanDate: undefined,
          };

    const selectedCatObj = categories.find((c) => c.id === categoryId);
    const is133Series = is133SeriesCategory(selectedCatObj);
    const is133_26 =
      selectedCatObj?.id === "cat-32" ||
      (selectedCatObj?.code &&
        (selectedCatObj.code === "১৩৩/২৬" || selectedCatObj.code === "133/26"));
    const isFuelOrMaint = isVehicleFuelOrMaintenanceCategory(selectedCatObj);
    const isFuel = isVehicleFuelCategory(selectedCatObj);
    const motorPayload = is133Series
      ? {
          vehicleModel: isFuelOrMaint ? vehicleModel : undefined,
          vehicleRegNo: isFuelOrMaint ? vehicleRegNo : undefined,
          motorDocType: is133_26 ? undefined : motorDocType,
          fuelMonthYear: isFuel ? fuelMonthYear : undefined,
          fuelType: isFuel ? fuelType : undefined,
          fuelSupplierName: isFuel ? fuelSupplierName : undefined,
          fuelItems: isFuel ? fuelItems : undefined,
        }
      : {};

    if (isSaving) return;
    setIsSaving(true);

    try {
      if (editingExpenseId && onUpdateExpense) {
        await onUpdateExpense(editingExpenseId, {
          financialYearId: selectedFY,
          officeId,
          categoryId,
          expenseType,
          quotationFormType:
            expenseType === "Quotation" ? quotationFormType : undefined,
          expenseDate,
          amount: Number(effectiveAmount),
          ...quotationPayload,
          ...motorPayload,
          voucherNo: voucherNo.trim(),
          voucherDate,
          description: finalDescription,
          supportingDocument: supportingDocument || "",
          applicant,
          entryOfficer,
          quotationItems: serializedQuotationItems,
          branchEntries:
            expenseType === "Quotation" && quotationFormType === "Form1"
              ? branchEntries
              : [],
          debitAccount,
          paymentType: "একক সরবরাহকারী",
          memoForwardingNo:
            expenseType === "Quotation" ? memoForwardingNo : undefined,
          memoSupplyOrderNo:
            expenseType === "Quotation" ? memoSupplyOrderNo : undefined,
          quotationDate:
            expenseType === "Quotation" ? quotationDate : undefined,
          supplyRecipientName:
            expenseType === "Quotation" ? supplyRecipientName : undefined,
          supplyRecipientDesignation:
            expenseType === "Quotation"
              ? supplyRecipientDesignation
              : undefined,
          supplyRecipientOrgName:
            expenseType === "Quotation"
              ? supplyRecipientOrgName ||
                (quotationFormType === "Form1"
                  ? form1LowestBidder.name
                  : form2LowestBidder.name) ||
                supplierOrg1
              : undefined,
          supplyRecipientAddress1:
            expenseType === "Quotation"
              ? supplyRecipientAddress1 ||
                (quotationFormType === "Form1"
                  ? form1LowestBidder.parsed.address1
                  : form2LowestBidder.parsed.address1) ||
                "নজির আহমেদ চৌধুরী রোড"
              : undefined,
          supplyRecipientAddress2:
            expenseType === "Quotation"
              ? supplyRecipientAddress2 ||
                (quotationFormType === "Form1"
                  ? form1LowestBidder.parsed.address2
                  : form2LowestBidder.parsed.address2) ||
                "আন্দরকিল্লা, চট্টগ্রাম।"
              : undefined,
          supplierOrg1: expenseType === "Quotation" ? supplierOrg1 : undefined,
          supplierOrg2: expenseType === "Quotation" ? supplierOrg2 : undefined,
          supplierOrg3: expenseType === "Quotation" ? supplierOrg3 : undefined,
        });
      } else {
        const newExp = await onAddExpense({
          financialYearId: selectedFY,
          officeId,
          categoryId,
          expenseType,
          quotationFormType:
            expenseType === "Quotation" ? quotationFormType : undefined,
          expenseDate,
          amount: Number(effectiveAmount),
          ...quotationPayload,
          ...motorPayload,
          voucherNo: voucherNo.trim(),
          voucherDate,
          description: finalDescription,
          remarks: "",
          supportingDocument: supportingDocument || "",
          applicant,
          entryOfficer,
          quotationItems: serializedQuotationItems,
          branchEntries:
            expenseType === "Quotation" && quotationFormType === "Form1"
              ? branchEntries
              : [],
          debitAccount,
          paymentType: "একক সরবরাহকারী",
          memoForwardingNo:
            expenseType === "Quotation" ? memoForwardingNo : undefined,
          memoSupplyOrderNo:
            expenseType === "Quotation" ? memoSupplyOrderNo : undefined,
          quotationDate:
            expenseType === "Quotation" ? quotationDate : undefined,
          supplyRecipientName:
            expenseType === "Quotation" ? supplyRecipientName : undefined,
          supplyRecipientDesignation:
            expenseType === "Quotation"
              ? supplyRecipientDesignation
              : undefined,
          supplyRecipientOrgName:
            expenseType === "Quotation"
              ? supplyRecipientOrgName ||
                (quotationFormType === "Form1"
                  ? form1LowestBidder.name
                  : form2LowestBidder.name) ||
                supplierOrg1
              : undefined,
          supplyRecipientAddress1:
            expenseType === "Quotation"
              ? supplyRecipientAddress1 ||
                (quotationFormType === "Form1"
                  ? form1LowestBidder.parsed.address1
                  : form2LowestBidder.parsed.address1) ||
                "নজির আহমেদ চৌধুরী রোড"
              : undefined,
          supplyRecipientAddress2:
            expenseType === "Quotation"
              ? supplyRecipientAddress2 ||
                (quotationFormType === "Form1"
                  ? form1LowestBidder.parsed.address2
                  : form2LowestBidder.parsed.address2) ||
                "আন্দরকিল্লা, চট্টগ্রাম।"
              : undefined,
          supplierOrg1: expenseType === "Quotation" ? supplierOrg1 : undefined,
          supplierOrg2: expenseType === "Quotation" ? supplierOrg2 : undefined,
          supplierOrg3: expenseType === "Quotation" ? supplierOrg3 : undefined,
          status: defaultStatus,
          noteSheetId: noteSheetId || undefined,
        });

        if (newExp && newExp.id && !newExp.noteSheetId && !noteSheetId) {
          apiFetch(`/api/expenses/${newExp.id}/generate-notesheet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id }),
          }).catch(console.error);
        }
      }

      resetForm();
      setShowModal(false);
      showToast(
        editingExpenseId
          ? language === "bn"
            ? "ব্যয় সফলভাবে হালনাগাদ হয়েছে!"
            : "Expense updated successfully!"
          : language === "bn"
            ? "ব্যয় সফলভাবে সংরক্ষিত হয়েছে!"
            : "Expense saved successfully!",
      );
      if (refreshData) refreshData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error saving expense");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2
            className={`text-xl font-bold ${isCustom ? "text-amber-400" : isDark ? "text-slate-100" : "text-slate-900"}`}
          >
            {t.expensesTitle}
          </h2>
          <p
            className={`text-xs mt-0.5 ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {t.expensesSubtitle} ({t.financialYear}: {currentFYObj?.name})
          </p>
        </div>
        <div className="flex gap-2">
          {filteredExpenses.some((e) => !e.noteSheetId) && (
            <button
              disabled={isFYClosed}
              onClick={handleBulkGenerate}
              title={isFYClosed ? "🔒 এই অর্থবছরটি ক্লোজড।" : ""}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" /> {t.bulkGenerateNoteSheets}
            </button>
          )}
          <button
            disabled={isFYClosed}
            onClick={handleOpenAddModal}
            title={isFYClosed ? "🔒 এই অর্থবছরটি ক্লোজড।" : ""}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> {t.addExpense}
          </button>
        </div>
      </div>

      {isFYClosed && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            🔒 নির্বাচিত অর্থবছর ({currentFYObj?.name}) বন্ধ (Closed) করা হয়েছে।
            নতুন ব্যয় ভাউচার যোগ বা পরিবর্তন করা সম্পূর্ণ বন্ধ রয়েছে।
          </span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div
        className={`flex items-center gap-2 border-b pb-3 overflow-x-auto ${
          isCustom
            ? "border-[#382b61]"
            : isDark
              ? "border-slate-800"
              : "border-slate-200"
        }`}
      >
        {(["All", "Pending", "Approved", "Rejected"] as const).map((st) => {
          const count = expenses.filter((e) => {
            const matchFY = e.financialYearId === selectedFY;
            const matchOffice = isHeadOffice
              ? true
              : e.officeId === currentUser.officeId;
            if (!matchFY || !matchOffice) return false;
            if (st === "All") return true;
            if (st === "Pending") return e.status === "Pending";
            if (st === "Approved") return e.status === "Approved" || !e.status;
            if (st === "Rejected") return e.status === "Rejected";
            return false;
          }).length;

          const isActive = currentStatusFilter === st;

          let badgeColor = isCustom
            ? "bg-[#251d45] text-purple-300"
            : isDark
              ? "bg-slate-800 text-slate-400"
              : "bg-slate-100 text-slate-600";
          if (st === "Pending") badgeColor = "bg-amber-500/15 text-amber-400";
          if (st === "Approved")
            badgeColor = "bg-emerald-500/15 text-emerald-400";
          if (st === "Rejected") badgeColor = "bg-rose-500/15 text-rose-400";

          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
                isActive
                  ? isCustom
                    ? "bg-[#2c1f54] text-amber-300 border border-[#523d8c] shadow-sm"
                    : isDark
                      ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
                      : "bg-slate-900 text-white shadow-sm"
                  : isCustom
                    ? "bg-[#18122d] text-purple-200 border border-[#382b61] hover:bg-[#20183d]"
                    : isDark
                      ? "bg-slate-850 text-slate-300 border border-slate-700 hover:bg-slate-800"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>
                {st === "All" &&
                  (language === "bn" ? "সকল ব্যয়" : "All Expenses")}
                {st === "Pending" &&
                  (language === "bn" ? "অপেক্ষমান (Pending)" : "Pending")}
                {st === "Approved" &&
                  (language === "bn" ? "অনুমোদিত (Approved)" : "Approved")}
                {st === "Rejected" &&
                  (language === "bn" ? "বাতিল (Rejected)" : "Rejected")}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${isActive ? (isCustom ? "bg-[#3d2b75] text-amber-200" : isDark ? "bg-slate-700 text-white" : "bg-slate-800 text-white") : badgeColor}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expenses Table */}
      <div
        className={`rounded-2xl shadow-sm border overflow-hidden ${
          isCustom
            ? "bg-[#18122d] border-[#382b61]"
            : isDark
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-xs uppercase tracking-wider ${
                  isCustom
                    ? "bg-[#120d24] border-[#382b61] text-purple-300"
                    : isDark
                      ? "bg-slate-850 border-slate-800 text-slate-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <th className="p-3.5 font-semibold">
                  {language === "bn"
                    ? "ব্যয়ের তারিখ ও পত্রে বিবরণ"
                    : "Expense Date & Voucher"}
                </th>
                <th className="p-3.5 font-semibold">
                  {t.office} & {t.category}
                </th>
                <th className="p-3.5 font-semibold">{t.applicantName}</th>
                <th className="p-3.5 font-semibold">{t.description}</th>
                <th className="p-3.5 font-semibold text-center">
                  {language === "bn" ? "অনুমোদন স্ট্যাটাস" : "Approval Status"}
                </th>
                <th className="p-3.5 font-semibold text-right">{t.amount}</th>
                <th className="p-3.5 font-semibold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y text-xs ${
                isCustom
                  ? "divide-[#281d47]"
                  : isDark
                    ? "divide-slate-800"
                    : "divide-slate-100"
              }`}
            >
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center opacity-40">
                    {t.noRecentExpenses}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const off = offices.find((o) => o.id === exp.officeId);
                  const cat = categories.find((c) => c.id === exp.categoryId);

                  return (
                    <tr
                      key={exp.id}
                      className={`transition group ${
                        isCustom
                          ? "hover:bg-[#20183d]"
                          : isDark
                            ? "hover:bg-slate-800/60"
                            : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="p-3.5">
                        <div
                          className={`font-mono font-bold flex items-center gap-1.5 ${
                            isCustom
                              ? "text-amber-300"
                              : isDark
                                ? "text-slate-100"
                                : "text-slate-900"
                          }`}
                        >
                          <Receipt className="w-3.5 h-3.5 opacity-50 shrink-0" />
                          {exp.voucherNo}
                        </div>
                        <div
                          className={`text-xs mt-1 flex items-center gap-1 font-mono opacity-70`}
                        >
                          <Calendar className="w-3 h-3 opacity-60" />
                          <span>{exp.expenseDate || exp.voucherDate}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div
                          className={`font-medium flex items-center gap-1 ${
                            isCustom
                              ? "text-purple-100"
                              : isDark
                                ? "text-slate-200"
                                : "text-slate-800"
                          }`}
                        >
                          <Building2 className="w-3 h-3 opacity-60" />{" "}
                          {off?.name}
                        </div>
                        <div
                          className={`text-xs mt-0.5 ${
                            isCustom
                              ? "text-purple-300"
                              : isDark
                                ? "text-slate-400"
                                : "text-slate-500"
                          }`}
                        >
                          {cat?.name}
                        </div>
                      </td>
                      <td className="p-3.5 text-xs">
                        <div
                          className={`font-medium ${isCustom ? "text-purple-100" : isDark ? "text-slate-200" : "text-slate-800"}`}
                        >
                          {exp.applicant?.name || "-"}
                        </div>
                        <div
                          className={`text-xs ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {exp.applicant?.designation || ""}
                        </div>
                        {exp.applicant?.type === "PersonInstitution" && (
                          <div className="text-xs opacity-60 mt-0.5 italic">
                            {exp.applicant?.institutionName}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs max-w-xs">
                        <div
                          className={`font-medium mb-0.5 flex items-center gap-1 ${
                            isCustom
                              ? "text-purple-100"
                              : isDark
                                ? "text-slate-200"
                                : "text-slate-800"
                          }`}
                        >
                          {exp.expenseType === "Quotation" && (
                            <span className="inline-block px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs font-bold">
                              QTN
                            </span>
                          )}
                          {exp.description}
                        </div>
                        {exp.entryOfficer?.name && (
                          <div
                            className={`mt-1.5 text-xs font-mono opacity-60`}
                          >
                            <span>
                              {t.entryOfficer}: {exp.entryOfficer.name}
                            </span>
                          </div>
                        )}
                        {exp.supportingDocument && (
                          <div className="mt-1.5">
                            <a
                              href={`${exp.supportingDocument}${exp.supportingDocument.includes("?") ? "&" : "?"}token=${encodeURIComponent(localStorage.getItem("govt_app_token") || "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition ${
                                isCustom
                                  ? "bg-[#251d45] text-amber-300 border-[#4a3a78] hover:bg-[#31265c]"
                                  : isDark
                                    ? "bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-750"
                                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              }`}
                              title={
                                language === "bn"
                                  ? "সংযুক্তি দেখুন"
                                  : "View Supporting Document"
                              }
                            >
                              <Paperclip className="w-3 h-3 text-blue-400" />
                              <span>
                                {language === "bn" ? "সংযুক্তি" : "Attachment"}
                              </span>
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {exp.status === "Pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {language === "bn" ? "অপেক্ষমান" : "Pending"}
                          </span>
                        )}
                        {(exp.status === "Approved" || !exp.status) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            {language === "bn" ? "অনুমোদিত" : "Approved"}
                          </span>
                        )}
                        {exp.status === "Rejected" && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              {language === "bn" ? "বাতিল" : "Rejected"}
                            </span>
                            {exp.rejectionReason && (
                              <span
                                className="text-xs text-rose-400 mt-1 max-w-[140px] truncate"
                                title={exp.rejectionReason}
                              >
                                {exp.rejectionReason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        className={`p-3.5 font-bold text-right font-mono text-sm ${
                          isCustom
                            ? "text-amber-300 bg-[#140e29]/40"
                            : isDark
                              ? "text-slate-100 bg-slate-800/30"
                              : "text-slate-900 bg-slate-50/30"
                        }`}
                      >
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        {/* Head Office Approval / Rejection Actions for Pending Expenses */}
                        {isHeadOffice && exp.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApproveAction(exp.id)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition inline-block border border-emerald-500/30"
                              title={
                                language === "bn"
                                  ? "ব্যয় অনুমোদন করুন"
                                  : "Approve Expense"
                              }
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setRejectingExpenseId(exp.id);
                                setRejectionReasonInput("");
                                setRejectError("");
                              }}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition inline-block border border-rose-500/30"
                              title={
                                language === "bn"
                                  ? "ব্যয় বাতিল করুন"
                                  : "Reject Expense"
                              }
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Edit Action Button */}
                        <button
                          onClick={() => handleEditClick(exp)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition inline-block"
                          title={
                            language === "bn" ? "সম্পাদনা করুন" : "Edit Expense"
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {exp.noteSheetId ? (
                          <>
                            <button
                              onClick={() => {
                                const ns = noteSheets.find(
                                  (n) =>
                                    n.id === exp.noteSheetId ||
                                    n.expenseId === exp.id,
                                );
                                if (ns) setPreviewNoteSheet(ns);
                              }}
                              className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition inline-block"
                              title={t.viewNoteSheet}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGenerateNoteSheet(exp.id)}
                              disabled={generatingIds.has(exp.id)}
                              className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition inline-block disabled:opacity-50"
                              title={
                                language === "bn"
                                  ? "ব্যয় অনুযায়ী নোটশিট রিফ্রেশ / পুনর্নির্মাণ করুন"
                                  : "Re-sync Note Sheet from current expense"
                              }
                            >
                              {generatingIds.has(exp.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerateNoteSheet(exp.id)}
                            disabled={generatingIds.has(exp.id)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition inline-block disabled:opacity-50"
                            title={t.bulkGenerateNoteSheets}
                          >
                            {generatingIds.has(exp.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingId(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition inline-block opacity-0 group-hover:opacity-100"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal (Add / Edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div
            className={`rounded-2xl max-w-4xl w-full p-6 shadow-xl border m-auto ${
              isCustom
                ? "bg-[#18122d] border-[#382b61] text-purple-100"
                : isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex justify-between items-center pb-3 border-b mb-4 ${
                isCustom
                  ? "border-[#2e234e]"
                  : isDark
                    ? "border-slate-800"
                    : "border-slate-200"
              }`}
            >
              <h3 className="text-base font-bold">
                {editingExpenseId
                  ? language === "bn"
                    ? "ব্যয় সংশোধনের বিবরণ"
                    : "Edit Expense Entry"
                  : t.addExpense}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="opacity-60 hover:opacity-100 font-bold px-2 py-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Global Datalist for auto-suggesting bidder / supplier organization names */}
              <datalist id="supplier-suggestions">
                {suggestedSuppliers.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>

              {isSuperAdminOrAdminOrModerator && (
                <div
                  className={`flex gap-2 mb-2 p-1 rounded-xl ${
                    isCustom
                      ? "bg-[#120d24]"
                      : isDark
                        ? "bg-slate-800"
                        : "bg-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseType("General");
                      const valid = categories.filter(
                        (c) => c.status === "Active",
                      );
                      if (
                        valid.length > 0 &&
                        !valid.some((c) => c.id === categoryId)
                      ) {
                        setCategoryId(valid[0].id);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold flex-1 transition ${
                      expenseType === "General"
                        ? isCustom
                          ? "bg-[#281e4b] text-amber-300 shadow-sm border border-[#48377e]"
                          : isDark
                            ? "bg-slate-700 text-emerald-400 shadow-sm"
                            : "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                        : isCustom
                          ? "text-purple-300 hover:bg-[#20183d]"
                          : isDark
                            ? "text-slate-400 hover:bg-slate-750"
                            : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {language === "bn" ? "নিয়মিত ব্যয়" : "General Expense"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseType("Quotation");
                      const valid = categories.filter(
                        (c) =>
                          c.status === "Active" && c.allowInQuotation !== false,
                      );
                      if (
                        valid.length > 0 &&
                        !valid.some((c) => c.id === categoryId)
                      ) {
                        setCategoryId(valid[0].id);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold flex-1 transition ${
                      expenseType === "Quotation"
                        ? isCustom
                          ? "bg-[#281e4b] text-amber-300 shadow-sm border border-[#48377e]"
                          : isDark
                            ? "bg-slate-700 text-emerald-400 shadow-sm"
                            : "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                        : isCustom
                          ? "text-purple-300 hover:bg-[#20183d]"
                          : isDark
                            ? "text-slate-400 hover:bg-slate-750"
                            : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {language === "bn"
                      ? "কোটেশন প্রক্রিয়ায় ব্যয়"
                      : "Quotation Expense"}
                  </button>
                </div>
              )}

              {/* Expense & Voucher Dates */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isCustom
                    ? "bg-[#140e29] border-[#382b61]"
                    : isDark
                      ? "bg-slate-800/70 border-slate-700"
                      : "bg-slate-50 border-slate-200"
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 font-bold ${
                    isCustom
                      ? "text-amber-300"
                      : isDark
                        ? "text-slate-200"
                        : "text-slate-800"
                  }`}
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />{" "}
                  {language === "bn"
                    ? "ব্যয় ও পত্রের বিবরণ"
                    : "Expense & Voucher Info"}
                </div>

                {isHeadOffice && (
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {t.office}
                    </label>
                    <select
                      value={officeId}
                      onChange={(e) => setOfficeId(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#18122d] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {language === "bn"
                        ? "ব্যয়ের তারিখ (Expense Date)"
                        : "Expense Date"}{" "}
                      *
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#18122d] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {language === "bn"
                        ? "পত্রের নম্বর (Voucher No)"
                        : "Patra No"}{" "}
                      *
                    </label>
                    <input
                      type="text"
                      required
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      placeholder="e.g. P-CTG-2025-001"
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isDuplicateVoucher
                          ? "border-rose-500 bg-rose-500/15 text-rose-300"
                          : isCustom
                            ? "bg-[#18122d] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "border-slate-300 focus:border-emerald-600 text-slate-900"
                      }`}
                    />
                    {isDuplicateVoucher && (
                      <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{" "}
                        {t.duplicateVoucherAlert}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {language === "bn"
                        ? "পত্রের তারিখ (Voucher Date)"
                        : "Patra Date"}{" "}
                      *
                    </label>
                    <input
                      type="date"
                      required
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#18122d] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {t.category} *
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        setCategoryId(newCatId);
                        const selCat = categories.find(
                          (c) => c.id === newCatId,
                        );
                        if (selCat) {
                          setDebitAccount(
                            selCat.code || selCat.budgetHead || selCat.name,
                          );
                          if (isVehicleFuelCategory(selCat)) {
                            setFuelItems((prev) => {
                              const hasValidItems = prev.some(
                                (it) =>
                                  Number(it.qtyLiters) > 0 ||
                                  Number(it.totalAmount) > 0,
                              );
                              if (hasValidItems && prev.length > 1) return prev;
                              return [
                                {
                                  id: "f-1",
                                  fuelType: "অকটেন",
                                  supplyDate: "2026-06-02",
                                  qtyLiters: 20,
                                  unit: "লিঃ",
                                  ratePerLiter: 145,
                                  supplierName:
                                    fuelSupplierName || "মেসার্স হিল ভিউ",
                                  totalAmount: 2900,
                                },
                                {
                                  id: "f-2",
                                  fuelType: "অকটেন",
                                  supplyDate: "2026-06-09",
                                  qtyLiters: 40,
                                  unit: "লিঃ",
                                  ratePerLiter: 145,
                                  supplierName:
                                    fuelSupplierName || "মেসার্স হিল ভিউ",
                                  totalAmount: 5800,
                                },
                                {
                                  id: "f-3",
                                  fuelType: "অকটেন",
                                  supplyDate: "2026-06-24",
                                  qtyLiters: 7,
                                  unit: "লিঃ",
                                  ratePerLiter: 145,
                                  supplierName:
                                    fuelSupplierName || "মেসার্স হিল ভিউ",
                                  totalAmount: 1015,
                                },
                                {
                                  id: "f-4",
                                  fuelType: "মবিল",
                                  supplyDate: "2026-06-24",
                                  qtyLiters: 5,
                                  unit: "লিঃ",
                                  ratePerLiter: 1000,
                                  supplierName:
                                    fuelSupplierName || "মেসার্স হিল ভিউ",
                                  totalAmount: 5000,
                                },
                              ];
                            });
                          }
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#18122d] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.budgetHead})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {is133SeriesCategory(currentCategory) && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${isCustom ? "bg-[#140e29] border-[#382b61]" : isDark ? "bg-slate-800/70 border-slate-700" : "bg-blue-50/70 border-blue-200"}`}
                  >
                    <div className="font-bold text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isVehicleFuelOrMaintenanceCategory(currentCategory) ? (
                          <>
                            <Car className="w-4 h-4" /> ১৩৩ সিরিজ খাতের নথিপত্র ও গাড়ির তথ্য
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" /> ১৩৩ সিরিজ খাতের নথিপত্র
                          </>
                        )}
                      </div>
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        {currentCategory?.code}
                      </span>
                    </div>

                    {/* Document Type Radio Selector (Only for other 133 series categories; hidden for 133/26) */}
                    {!(currentCategory?.id === "cat-32" || (currentCategory?.code && (currentCategory.code === "১৩৩/২৬" || currentCategory.code === "133/26"))) && (
                      <div className="pt-1 pb-1">
                        <label
                          className={`block font-semibold text-xs mb-2 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          {language === "bn"
                            ? "প্রস্তুতযোগ্য নথির ধরণ নির্বাচন করুন (Document Type) :"
                            : "Select Document Type to Generate:"}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                              motorDocType === "application"
                                ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                                : isDark
                                  ? "bg-slate-850 border-slate-700 text-slate-300 hover:bg-slate-800"
                                  : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="motorDocType"
                              value="application"
                              checked={motorDocType === "application"}
                              onChange={() => setMotorDocType("application")}
                              className="sr-only"
                            />
                            <span>✉️</span>
                            <span>
                              {language === "bn" ? "আবেদন (ডিফল্ট)" : "Application"}
                            </span>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                              motorDocType === "forwarding"
                                ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                                : isDark
                                  ? "bg-slate-850 border-slate-700 text-slate-300 hover:bg-slate-800"
                                  : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="motorDocType"
                              value="forwarding"
                              checked={motorDocType === "forwarding"}
                              onChange={() => setMotorDocType("forwarding")}
                              className="sr-only"
                            />
                            <span>📨</span>
                            <span>
                              {language === "bn" ? "ফরোয়ার্ডিং" : "Forwarding"}
                            </span>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                              motorDocType === "supplyorder"
                                ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                                : isDark
                                  ? "bg-slate-850 border-slate-700 text-slate-300 hover:bg-slate-800"
                                  : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="motorDocType"
                              value="supplyorder"
                              checked={motorDocType === "supplyorder"}
                              onChange={() => setMotorDocType("supplyorder")}
                              className="sr-only"
                            />
                            <span>📦</span>
                            <span>
                              {language === "bn" ? "সাপ্লাই অর্ডার" : "Supply Order"}
                            </span>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                              motorDocType === "all"
                                ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                                : isDark
                                  ? "bg-slate-850 border-slate-700 text-slate-300 hover:bg-slate-800"
                                  : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="motorDocType"
                              value="all"
                              checked={motorDocType === "all"}
                              onChange={() => setMotorDocType("all")}
                              className="sr-only"
                            />
                            <span>📑</span>
                            <span>
                              {language === "bn" ? "সকল নথি (All)" : "All Docs"}
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {isVehicleFuelOrMaintenanceCategory(currentCategory) && (
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-blue-200/50 dark:border-slate-700">
                        <div>
                          <label
                            className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                          >
                            গাড়ির মডেল (Vehicle Model)
                          </label>
                          <input
                            type="text"
                            value={vehicleModel}
                            onChange={(e) => setVehicleModel(e.target.value)}
                            placeholder="Toyota Land Cruiser Prado"
                            className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${isCustom ? "bg-[#18122d] border-[#382b61] text-purple-100" : isDark ? "bg-slate-850 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                          />
                        </div>
                        <div>
                          <label
                            className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                          >
                            গাড়ির নম্বর (Reg No)
                          </label>
                          <input
                            type="text"
                            value={vehicleRegNo}
                            onChange={(e) => setVehicleRegNo(e.target.value)}
                            placeholder="ঢাকা-মেট্রো-ঘ-১৪-১১৩২"
                            className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${isCustom ? "bg-[#18122d] border-[#382b61] text-purple-100" : isDark ? "bg-slate-850 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                          />
                        </div>
                      </div>
                    )}

                    {isVehicleFuelCategory(currentCategory) && (
                      <div className="pt-2 border-t border-blue-200/50 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-500 dark:text-amber-400">
                          <div className="flex items-center gap-1.5">
                            <span>⛽</span>
                            <span>জ্বালানী খরচের বিস্তারিত বিবরণী (১৩৩/২৬ মোটর গাড়ি জ্বালানী)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const totalFuelCalc = fuelItems.reduce(
                                (sum, it) => sum + (Number(it.totalAmount) || 0),
                                0,
                              );
                              if (totalFuelCalc > 0) {
                                setAmount(String(totalFuelCalc));
                              }
                            }}
                            className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded text-[11px] font-semibold transition"
                            title="তালিকার মোট টাকা মূল খরচের পরিমাণে বসান"
                          >
                            🔄 মোট টাকা মূল বিলে সেট করুন
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label
                              className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                            >
                              মাস ও বছর (একাধিক মাস যুক্ত করা যাবে)
                            </label>
                            <input
                              type="text"
                              value={fuelMonthYear}
                              onChange={(e) => setFuelMonthYear(e.target.value)}
                              placeholder="e.g. জুন/২০২৬ বা মে/২০২৬ ও জুন/২০২৬"
                              className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${isCustom ? "bg-[#18122d] border-[#382b61] text-purple-100" : isDark ? "bg-slate-850 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                            />
                          </div>

                          <div>
                            <label
                              className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                            >
                              ডিফল্ট তেলের ধরণ (Fuel Type)
                            </label>
                            <select
                              value={fuelType}
                              onChange={(e) => setFuelType(e.target.value)}
                              className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${isCustom ? "bg-[#18122d] border-[#382b61] text-purple-100" : isDark ? "bg-slate-850 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                            >
                              <option value="অকটেন">অকটেন (Octane)</option>
                              <option value="মবিল">মবিল (Mobil)</option>
                              <option value="পেট্রোল">পেট্রোল (Petrol)</option>
                              <option value="ডিজেল">ডিজেল (Diesel)</option>
                              <option value="সিএনজি">সিএনজি (CNG)</option>
                              <option value="এলপিজি">এলপিজি (LPG)</option>
                            </select>
                          </div>

                          <div>
                            <label
                              className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                            >
                              ডিফল্ট সরবরাহকারী প্রতিষ্ঠান
                            </label>
                            <input
                              type="text"
                              value={fuelSupplierName}
                              onChange={(e) => setFuelSupplierName(e.target.value)}
                              placeholder="মেসার্স হিল ভিউ"
                              className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${isCustom ? "bg-[#18122d] border-[#382b61] text-purple-100" : isDark ? "bg-slate-850 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                            />
                          </div>
                        </div>

                        {/* Fuel Items Dynamic Table */}
                        <div className="border border-slate-700 rounded-xl overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-800/80 text-slate-200 border-b border-slate-700 font-semibold">
                              <tr>
                                <th className="p-2 text-center w-8">#</th>
                                <th className="p-2 w-24">জ্বালানীর ধরণ</th>
                                <th className="p-2 min-w-[120px]">সরবরাহের তারিখ</th>
                                <th className="p-2 text-right w-20">পরিমাণ (লিঃ)</th>
                                <th className="p-2 text-right w-20">দর (প্রতি লিঃ)</th>
                                <th className="p-2 min-w-[140px]">সরবরাহকারী প্রতিষ্ঠান</th>
                                <th className="p-2 text-right w-28">মূল্য (টাকা)</th>
                                <th className="p-2 text-center w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {fuelItems.map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-slate-800/30">
                                  <td className="p-1.5 text-center text-slate-400 font-mono">
                                    {idx + 1}
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={item.fuelType || fuelType}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFuelItems((prev) => {
                                          const updated = [...prev];
                                          updated[idx] = { ...updated[idx], fuelType: val };
                                          return updated;
                                        });
                                      }}
                                      placeholder="অকটেন / মবিল"
                                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={item.supplyDate || item.receiptNoDate || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFuelItems((prev) => {
                                          const updated = [...prev];
                                          updated[idx] = {
                                            ...updated[idx],
                                            supplyDate: val,
                                            receiptNoDate: val,
                                          };
                                          return updated;
                                        });
                                      }}
                                      placeholder="০২/০৬/২০২৬ বা 2026-06-02"
                                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      step="any"
                                      value={item.qtyLiters || ""}
                                      onChange={(e) => {
                                        const qty = parseFloat(e.target.value) || 0;
                                        setFuelItems((prev) => {
                                          const updated = [...prev];
                                          const rate = Number(updated[idx].ratePerLiter) || 0;
                                          const tot = Number((qty * rate).toFixed(2));
                                          updated[idx] = {
                                            ...updated[idx],
                                            qtyLiters: qty,
                                            totalAmount: tot > 0 ? tot : updated[idx].totalAmount,
                                          };
                                          return updated;
                                        });
                                      }}
                                      placeholder="20"
                                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-right text-slate-100 font-mono"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      step="any"
                                      value={item.ratePerLiter || ""}
                                      onChange={(e) => {
                                        const rate = parseFloat(e.target.value) || 0;
                                        setFuelItems((prev) => {
                                          const updated = [...prev];
                                          const qty = Number(updated[idx].qtyLiters) || 0;
                                          const tot = Number((qty * rate).toFixed(2));
                                          updated[idx] = {
                                            ...updated[idx],
                                            ratePerLiter: rate,
                                            totalAmount: tot > 0 ? tot : updated[idx].totalAmount,
                                          };
                                          return updated;
                                        });
                                      }}
                                      placeholder="145"
                                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-right text-slate-100 font-mono"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={item.supplierName !== undefined ? item.supplierName : fuelSupplierName}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFuelItems((prev) => {
                                          const updated = [...prev];
                                          updated[idx] = {
                                            ...updated[idx],
                                            supplierName: val,
                                          };
                                          return updated;
                                        });
                                      }}
                                      placeholder="মেসার্স হিল ভিউ"
                                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      step="any"
                                      value={item.totalAmount || ""}
                                      onChange={(e) => {
                                        const amt = parseFloat(e.target.value) || 0;
                                        setFuelItems((prev) => {
                                          const updated = [...prev];
                                          updated[idx] = { ...updated[idx], totalAmount: amt };
                                          return updated;
                                        });
                                      }}
                                      placeholder="2900"
                                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-right text-emerald-400 font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-1 text-center">
                                    {fuelItems.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFuelItems((prev) => prev.filter((_, i) => i !== idx));
                                        }}
                                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition"
                                        title="মুছুন"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-800/60 font-semibold border-t border-slate-700 text-xs">
                              <tr>
                                <td colSpan={3} className="p-2 text-right text-slate-300">
                                  সর্বমোট:
                                </td>
                                <td className="p-2 text-right font-mono text-slate-200">
                                  {fuelItems
                                    .reduce((s, it) => s + (Number(it.qtyLiters) || 0), 0)
                                    .toFixed(2)}{" "}
                                  লিঃ
                                </td>
                                <td className="p-2 text-center">-</td>
                                <td className="p-2 text-center text-slate-300">মোট=</td>
                                <td className="p-2 text-right font-mono text-emerald-400 font-bold">
                                  ৳{" "}
                                  {fuelItems
                                    .reduce((s, it) => s + (Number(it.totalAmount) || 0), 0)
                                    .toLocaleString("en-IN")}
                                </td>
                                <td className="p-2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFuelItems((prev) => [
                                ...prev,
                                {
                                  id: `f-${Date.now()}`,
                                  fuelType: fuelType,
                                  receiptNoDate: "",
                                  qtyLiters: 0,
                                  ratePerLiter: 0,
                                  totalAmount: 0,
                                  prevPayOrderNoDate: "",
                                },
                              ]);
                            }}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Plus className="w-3.5 h-3.5" /> জ্বালানী ভাউচার লাইন যোগ করুন
                          </button>

                          <div className="text-[11px] text-slate-400">
                            * এই বিবরণী স্বয়ংক্রিয়ভাবে ১৩৩/২৬ খাতের নোট শিট টেবিলে অন্তর্ভুক্ত হবে।
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {expenseType === "Quotation" && (
                  <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          {language === "bn"
                            ? "কোটেশন ফর্ম স্টাইল"
                            : "Quotation Form Style"}
                        </label>
                        <select
                          value={quotationFormType}
                          onChange={(e) =>
                            setQuotationFormType(
                              e.target.value as "Form1" | "Form2",
                            )
                          }
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none font-semibold ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-amber-300"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-emerald-400"
                                : "bg-emerald-50 border-emerald-300 text-emerald-800"
                          }`}
                        >
                          <option value="Form1">
                            FORM–1 (Combination Form)
                          </option>
                          <option value="Form2">
                            FORM–2 (দরপত্র তুলনামূলক বিবরণী)
                          </option>
                        </select>
                      </div>
                      <div>
                        <label
                          className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          {language === "bn"
                            ? "মেমো/সূত্র নম্বর (ফরোয়ার্ডিং)"
                            : "Memo / Forwarding No"}
                        </label>
                        <input
                          type="text"
                          value={memoForwardingNo}
                          onChange={(e) => setMemoForwardingNo(e.target.value)}
                          placeholder="সূত্র নং-কশি-০৬ (অংশ-০৩)/২০২৬-২০২৭/"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          {language === "bn"
                            ? "মেমো/সূত্র নম্বর (সাপ্লাই অর্ডার)"
                            : "Supply Order Memo No"}
                        </label>
                        <input
                          type="text"
                          value={memoSupplyOrderNo}
                          onChange={(e) => setMemoSupplyOrderNo(e.target.value)}
                          placeholder="সূত্র নং-প্রশ-১(৪০)/২০২৬-২০২৭/"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900"
                          }`}
                        />
                      </div>
                      <div>
                        <label
                          className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          {language === "bn"
                            ? "কোটেশন তারিখ (কার্যাদেশে ব্যবহার)"
                            : "Quotation Date"}
                        </label>
                        <input
                          type="date"
                          value={quotationDate}
                          onChange={(e) => setQuotationDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Musok Chalan Selection for Quotation Expenses (Form 1 & Form 2) */}
                {expenseType === "Quotation" && (
                  <div
                    className={`p-3.5 rounded-xl border ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61]"
                        : isDark
                          ? "bg-slate-800/70 border-slate-700"
                          : "bg-emerald-50/60 border-emerald-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label
                        className={`block font-semibold text-xs ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                      >
                        {language === "bn"
                          ? "মুসক চালান আছে কি না?"
                          : "Has Musok Chalan?"}
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="hasStockChalan"
                            value="হ্যাঁ"
                            checked={hasStockChalan === "হ্যাঁ"}
                            onChange={() => {
                              setHasStockChalan("হ্যাঁ");
                              setTaxRate("0");
                            }}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {language === "bn"
                              ? "হ্যাঁ (ট্যাক্স ০%)"
                              : "Yes (Tax 0%)"}
                          </span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="hasStockChalan"
                            value="না"
                            checked={hasStockChalan === "না"}
                            onChange={() => {
                              setHasStockChalan("না");
                              if (taxRate === "0" || !taxRate)
                                setTaxRate("3.0");
                            }}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {language === "bn"
                              ? "না (ট্যাক্স প্রযোজ্য)"
                              : "No (Tax Applicable)"}
                          </span>
                        </label>
                      </div>
                    </div>
                    {hasStockChalan === "হ্যাঁ" ? (
                      <div className="mt-3 pt-3 border-t border-emerald-500/30 space-y-3">
                        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          {language === "bn"
                            ? "ℹ️ মুসক চালান থাকায় ট্যাক্স কাউন্ট হবে না (ট্যাক্স হার স্বয়ংক্রিয়ভাবে ০% নির্ধারিত)।"
                            : "ℹ️ Tax will not be counted because Musok Chalan is Yes (Tax set to 0%)."}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                            >
                              {language === "bn"
                                ? "মুসক চালান নম্বর"
                                : "VAT Chalan No"}
                            </label>
                            <input
                              type="text"
                              value={vatChalanNo}
                              onChange={(e) => setVatChalanNo(e.target.value)}
                              placeholder="e.g. ২৫২৮০০০০০৮২৮৬৮"
                              className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${
                                isCustom
                                  ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                  : isDark
                                    ? "bg-slate-850 border-slate-700 text-slate-100"
                                    : "bg-white border-slate-300 text-slate-900"
                              }`}
                            />
                          </div>
                          <div>
                            <label
                              className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                            >
                              {language === "bn"
                                ? "মুসক চালান তারিখ"
                                : "VAT Chalan Date"}
                            </label>
                            <input
                              type="date"
                              value={vatChalanDate}
                              onChange={(e) => setVatChalanDate(e.target.value)}
                              className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${
                                isCustom
                                  ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                  : isDark
                                    ? "bg-slate-850 border-slate-700 text-slate-100"
                                    : "bg-white border-slate-300 text-slate-900"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-1.5">
                        {language === "bn"
                          ? "ℹ️ মুসক চালান না থাকায় প্রযোজ্য ট্যাক্স হার (%) ইনপুট দিন।"
                          : "ℹ️ Musok Chalan is No. Please enter applicable Tax rate (%)."}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {language === "bn" ? "ভ্যাট হার (%)" : "VAT Rate (%)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                      placeholder="e.g. 7.5"
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#18122d] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {language === "bn" ? "ট্যাক্স হার (%)" : "Tax Rate (%)"}
                      {expenseType === "Quotation" &&
                        hasStockChalan === "হ্যাঁ" && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1.5">
                            (মুসক চালানে ০%)
                          </span>
                        )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        expenseType === "Quotation" &&
                        hasStockChalan === "হ্যাঁ"
                          ? "0"
                          : taxRate
                      }
                      disabled={
                        expenseType === "Quotation" &&
                        hasStockChalan === "হ্যাঁ"
                      }
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder={
                        expenseType === "Quotation" &&
                        hasStockChalan === "হ্যাঁ"
                          ? "0"
                          : "e.g. 3.0"
                      }
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        expenseType === "Quotation" &&
                        hasStockChalan === "হ্যাঁ"
                          ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500"
                          : isCustom
                            ? "bg-[#18122d] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    {language === "bn"
                      ? "মূল পরিমাণ (Base Amount)"
                      : "Base Amount"}{" "}
                    ({language === "bn" ? "টাকা" : "BDT"}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={
                      expenseType === "Quotation" &&
                      quotationFormType === "Form1"
                        ? quotationItems.reduce(
                            (acc, item) => acc + (item.totalPrice || 0),
                            0,
                          )
                        : expenseType === "Quotation" &&
                            quotationFormType === "Form2"
                          ? form2LowestBaseTotal
                          : amount
                    }
                    onChange={(e) => setAmount(e.target.value)}
                    readOnly={expenseType === "Quotation"}
                    placeholder="e.g. 1000"
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                      expenseType === "Quotation"
                        ? "bg-emerald-500/10 font-bold font-mono text-emerald-600 dark:text-emerald-400"
                        : ""
                    } ${
                      isNegativeBalance && effectiveCurrentAmount
                        ? "border-amber-500 bg-amber-500/15 text-amber-300"
                        : isCustom
                          ? "bg-[#18122d] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            : "border-slate-300 focus:border-emerald-600 text-slate-900"
                    }`}
                  />
                  {expenseType === "Quotation" && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      {language === "bn"
                        ? "ℹ️ মূল পরিমাণ নিচে প্রদত্ত পণ্য/আইটেম বিবরণ থেকে স্বয়ংক্রিয়ভাবে হিসাব করা হয়েছে।"
                        : "ℹ️ Auto-calculated from item details below."}
                    </p>
                  )}
                </div>

                {/* Available Balance Preview */}
                <div
                  className={`p-3 rounded-lg border space-y-1.5 text-xs ${
                    isCustom
                      ? "bg-[#18122d] border-[#382b61]"
                      : isDark
                        ? "bg-slate-850 border-slate-700"
                        : "bg-white border-slate-200"
                  }`}
                >
                  {currentCategory && currentFY && (
                    <>
                      <div className="flex justify-between items-center opacity-85">
                        <span>
                          {language === "bn"
                            ? `মূল বাজেট বরাদ্দ:`
                            : `Initial Budget:`}
                        </span>
                        <span className="font-mono font-medium">
                          {formatCurrency(initialBudget)}
                        </span>
                      </div>
                      {provisionAmount > 0 && (
                        <div className="flex justify-between items-center text-amber-500 dark:text-amber-400">
                          <span>
                            {language === "bn"
                              ? "প্রভিশন / সমন্বয়:"
                              : "Provision / Adjustment:"}
                          </span>
                          <span className="font-mono font-medium">
                            + {formatCurrency(provisionAmount)}
                          </span>
                        </div>
                      )}
                      {additionalBudget > 0 && (
                        <div className="flex justify-between items-center text-blue-500 dark:text-blue-400">
                          <span>
                            {language === "bn"
                              ? "অতিরিক্ত বরাদ্দ (মোট):"
                              : "Additional Allocation:"}
                          </span>
                          <span className="font-mono font-medium">
                            + {formatCurrency(additionalBudget)}
                          </span>
                        </div>
                      )}
                      {(provisionAmount > 0 || additionalBudget > 0) && (
                        <div className="flex justify-between items-center font-semibold pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span>
                            {language === "bn"
                              ? "সর্বমোট বাজেট:"
                              : "Total Budget:"}
                          </span>
                          <span className="font-mono font-bold">
                            {formatCurrency(totalAllocated)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center opacity-80 pt-1">
                        <span>
                          {language === "bn"
                            ? "অনুমোদিত খরচ:"
                            : "Approved Spent:"}
                        </span>
                        <span className="font-mono font-medium text-emerald-500 dark:text-emerald-400">
                          {formatCurrency(totalSpentApproved)}
                        </span>
                      </div>
                      {totalPending > 0 && (
                        <div className="flex justify-between items-center opacity-80">
                          <span>
                            {language === "bn"
                              ? "পেন্ডিং অনিক্রেতা ব্যয়:"
                              : "Pending Expenses:"}
                          </span>
                          <span className="font-mono font-medium text-amber-500 dark:text-amber-400">
                            {formatCurrency(totalPending)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`border-t my-1.5 ${isCustom ? "border-[#2e234e]" : isDark ? "border-slate-750" : "border-slate-100"}`}
                      />
                    </>
                  )}
                  <div className="flex justify-between items-center font-medium">
                    <span
                      className={
                        isCustom
                          ? "text-purple-200"
                          : isDark
                            ? "text-slate-300"
                            : "text-slate-700"
                      }
                    >
                      {t.availableForUse}:
                    </span>
                    <span
                      className={`font-bold font-mono text-sm ${availableBalance < 0 ? "text-rose-400" : "text-emerald-400"}`}
                    >
                      {formatCurrency(availableBalance)}
                    </span>
                  </div>
                </div>
                {isNegativeBalance && effectiveCurrentAmount > 0 && (
                  <div className="text-xs text-amber-300 bg-amber-500/15 p-2.5 rounded-lg border border-amber-500/30 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{t.overspentAlert}</span>
                  </div>
                )}
              </div>

              {/* FORM-1: Quotation Combination Form */}
              {expenseType === "Quotation" && quotationFormType === "Form1" && (
                <div className="space-y-4">
                  {/* Section: Supply Order Recipient Info for Form 1 */}
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61]"
                        : isDark
                          ? "bg-slate-800/70 border-slate-700"
                          : "bg-white border-slate-300 shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg text-sm text-white ${
                        isCustom ? "bg-[#32235c]" : "bg-emerald-700"
                      }`}
                    >
                      <span>
                        {language === "bn"
                          ? "সাপ্লাই অর্ডার প্রাপকের তথ্য"
                          : "Supply Order Recipient Info"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn" ? "জনাবের নাম" : "Recipient Name"}
                        </label>
                        <input
                          type="text"
                          value={supplyRecipientName}
                          onChange={(e) =>
                            setSupplyRecipientName(e.target.value)
                          }
                          placeholder="যেমন: মোহাম্মদ আলী"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn" ? "পদবী" : "Designation"}
                        </label>
                        <input
                          type="text"
                          value={supplyRecipientDesignation}
                          onChange={(e) =>
                            setSupplyRecipientDesignation(e.target.value)
                          }
                          placeholder="যেমন: প্রোপ্রাইটার"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label
                          className={`block font-semibold text-xs ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "প্রতিষ্ঠানের নাম"
                            : "Organization Name"}
                        </label>
                        {form1LowestBidder.name && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            {language === "bn"
                              ? "← সর্বনিম্ন দর প্রদানকারী থেকে অটো"
                              : "← Auto from Lowest Bidder"}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        list="supplier-suggestions"
                        value={
                          supplyRecipientOrgName || form1LowestBidder.name || ""
                        }
                        onChange={(e) =>
                          setSupplyRecipientOrgName(e.target.value)
                        }
                        placeholder="যেমন: ইউনিক প্রিন্টার্স, ১৬ আলিফ বিপণি সেন্টার..."
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                          isCustom
                            ? "bg-[#18122d] border-[#382b61] text-purple-100"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100"
                              : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "ঠিকানা লাইন ১ (রাস্তা/এলাকা)"
                            : "Address Line 1"}
                        </label>
                        <input
                          type="text"
                          value={
                            supplyRecipientAddress1 ||
                            form1LowestBidder.parsed.address1 ||
                            ""
                          }
                          onChange={(e) =>
                            setSupplyRecipientAddress1(e.target.value)
                          }
                          placeholder="যেমন: নজির আহমেদ চৌধুরী রোড"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "ঠিকানা লাইন ২ (থানা/শহর)"
                            : "Address Line 2"}
                        </label>
                        <input
                          type="text"
                          value={
                            supplyRecipientAddress2 ||
                            form1LowestBidder.parsed.address2 ||
                            ""
                          }
                          onChange={(e) =>
                            setSupplyRecipientAddress2(e.target.value)
                          }
                          placeholder="যেমন: আন্দরকিল্লা, চট্টগ্রাম।"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Quotation Items Section for FORM-1 */}
                  <div
                    className={`p-4 rounded-xl border space-y-4 ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61]"
                        : isDark
                          ? "bg-slate-800/70 border-slate-700"
                          : "bg-slate-50 border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div
                        className={`flex items-center gap-1.5 font-bold ${
                          isCustom
                            ? "text-amber-300"
                            : isDark
                              ? "text-slate-200"
                              : "text-slate-900"
                        }`}
                      >
                        <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />{" "}
                        {language === "bn"
                          ? "পণ্য/সেবা বিবরণ (Quotation Items)"
                          : "Quotation Items"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const previousItem =
                            quotationItems[quotationItems.length - 1] ||
                            quotationItems[0];
                          const inheritedSuppliers =
                            previousItem &&
                            previousItem.suppliers &&
                            previousItem.suppliers.length > 0
                              ? previousItem.suppliers.map((s, sIdx) => ({
                                  nameAndAddress: s.nameAndAddress || "",
                                  unitPrice: 0,
                                  qty: 1,
                                  totalPrice: 0,
                                  vatRate: 0,
                                  taxRate: 0,
                                  remarks:
                                    s.remarks ||
                                    (sIdx === 0
                                      ? "সর্বনিম্ন"
                                      : sIdx === 1
                                        ? "২য় সর্বোচ্চ"
                                        : "সর্বোচ্চ"),
                                }))
                              : [
                                  {
                                    nameAndAddress: "",
                                    unitPrice: 0,
                                    qty: 1,
                                    totalPrice: 0,
                                    vatRate: 0,
                                    taxRate: 0,
                                    remarks: "",
                                  },
                                ];

                          setQuotationItems([
                            ...quotationItems,
                            {
                              itemDescription: "",
                              specification: "",
                              qty: 1,
                              unit: "টি",
                              unitPrice: 0,
                              totalPrice: 0,
                              vatRate: 0,
                              taxRate: 0,
                              remarks: "",
                              suppliers: inheritedSuppliers,
                            },
                          ]);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shadow transition"
                      >
                        <Plus className="w-3.5 h-3.5" />{" "}
                        {language === "bn"
                          ? "＋ নতুন আইটেম যোগ করুন"
                          : "+ Add New Item"}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {quotationItems.map((item, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border space-y-3 relative ${
                            isCustom
                              ? "bg-[#1c1535] border-[#40316b]"
                              : isDark
                                ? "bg-slate-850 border-slate-700"
                                : "bg-white border-slate-300 shadow-sm"
                          }`}
                        >
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                  isDark
                                    ? "bg-emerald-500/25 text-emerald-300"
                                    : "bg-emerald-100 text-emerald-800 font-bold"
                                }`}
                              >
                                {index + 1}
                              </span>
                              {language === "bn"
                                ? `আইটেম ${index + 1}`
                                : `Item ${index + 1}`}
                            </span>
                            {quotationItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = quotationItems.filter(
                                    (_, i) => i !== index,
                                  );
                                  setQuotationItems(updated);
                                }}
                                className="text-rose-600 dark:text-rose-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/20 transition"
                                title={
                                  language === "bn"
                                    ? "আইটেম মুছে ফেলুন"
                                    : "Remove Item"
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div>
                            <label
                              className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                            >
                              {language === "bn"
                                ? "আইটেম/পণ্যের বিবরণ *"
                                : "Item Description *"}
                            </label>
                            <input
                              type="text"
                              required
                              value={item.itemDescription}
                              onChange={(e) => {
                                const updated = [...quotationItems];
                                updated[index].itemDescription = e.target.value;
                                setQuotationItems(updated);
                              }}
                              placeholder="যেমন: নতুন DVR (Hikvision Turbo HD DVR-7100)"
                              className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                                isCustom
                                  ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                  : isDark
                                    ? "bg-slate-800 border-slate-700 text-slate-100"
                                    : "bg-white border-slate-300 text-slate-900"
                              }`}
                            />
                          </div>

                          <div>
                            <label
                              className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                            >
                              {language === "bn"
                                ? "বিস্তারিত বিবরণ / Specification"
                                : "Specification"}
                            </label>
                            <textarea
                              rows={2}
                              value={item.specification}
                              onChange={(e) => {
                                const updated = [...quotationItems];
                                updated[index].specification = e.target.value;
                                setQuotationItems(updated);
                              }}
                              placeholder="প্রয়োজনীয় টেকনিক্যাল স্পেসিফিকেশন..."
                              className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                                isCustom
                                  ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                  : isDark
                                    ? "bg-slate-800 border-slate-700 text-slate-100"
                                    : "bg-white border-slate-300 text-slate-900"
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label
                                className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                              >
                                {language === "bn" ? "পরিমাণ (Qty) *" : "Qty *"}
                              </label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.qty}
                                onChange={(e) => {
                                  const updated = [...quotationItems];
                                  const qty = Number(e.target.value) || 0;
                                  updated[index].qty = qty;
                                  updated[index].totalPrice =
                                    qty * (updated[index].unitPrice || 0);
                                  if (updated[index].suppliers) {
                                    updated[index].suppliers = updated[
                                      index
                                    ].suppliers!.map((s) => ({
                                      ...s,
                                      qty: qty,
                                      totalPrice: qty * (s.unitPrice || 0),
                                    }));
                                  }
                                  setQuotationItems(updated);
                                }}
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                                  isCustom
                                    ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                    : isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-100"
                                      : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label
                                className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                              >
                                {language === "bn" ? "একক (Unit)" : "Unit"}
                              </label>
                              <select
                                value={item.unit}
                                onChange={(e) => {
                                  const updated = [...quotationItems];
                                  updated[index].unit = e.target.value;
                                  setQuotationItems(updated);
                                }}
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                                  isCustom
                                    ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                    : isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-100"
                                      : "bg-white border-slate-300 text-slate-900"
                                }`}
                              >
                                <option value="টি">টি (Pcs)</option>
                                <option value="সেট">সেট (Set)</option>
                                <option value="পিস">পিস</option>
                                <option value="বক্স">বক্স (Box)</option>
                                <option value="মিটার">মিটার (Meter)</option>
                                <option value="কেজি">কেজি (Kg)</option>
                              </select>
                            </div>
                            <div>
                              <label
                                className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                              >
                                {language === "bn"
                                  ? "একক মূল্য (সর্বনিম্ন অটো)"
                                  : "Unit Price (Auto Min)"}
                              </label>
                              <input
                                type="number"
                                readOnly
                                value={item.unitPrice}
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none font-mono font-bold ${
                                  isDark
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                }`}
                                title={
                                  language === "bn"
                                    ? "সর্বনিম্ন দরদাতা থেকে স্বয়ংক্রিয়ভাবে বসবে"
                                    : "Auto-populated from lowest bidder"
                                }
                              />
                            </div>
                            <div>
                              <label
                                className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                              >
                                {language === "bn"
                                  ? "মোট মূল্য (অটো)"
                                  : "Total Price"}
                              </label>
                              <input
                                type="number"
                                readOnly
                                value={item.totalPrice}
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none font-mono font-bold ${
                                  isDark
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Multiple Suppliers Sub-section for this Item */}
                          <div
                            className={`p-3 rounded-lg border space-y-2 mt-2 ${
                              isCustom
                                ? "bg-[#120d24] border-[#382b61]"
                                : isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-slate-100 border-slate-300"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {language === "bn"
                                  ? "সরবরাহকারী প্রতিষ্ঠানের দরপত্রসমূহ (Suppliers)"
                                  : "Suppliers Quotations"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...quotationItems];
                                  if (!updated[index].suppliers)
                                    updated[index].suppliers = [];
                                  const sLen = updated[index].suppliers.length;

                                  const suggestedName =
                                    quotationItems.find(
                                      (_, itmIdx) => itmIdx !== index,
                                    )?.suppliers?.[sLen]?.nameAndAddress || "";
                                  updated[index].suppliers.push({
                                    nameAndAddress: suggestedName,
                                    unitPrice: 0,
                                    qty: item.qty,
                                    totalPrice: 0,
                                    vatRate: 0,
                                    taxRate: 0,
                                    remarks:
                                      sLen === 0 ? "সর্বনিম্ন" : "সর্বোচ্চ",
                                  });
                                  setQuotationItems(updated);
                                }}
                                className={`text-xs px-2 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                                  isDark
                                    ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                                    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                                }`}
                              >
                                <Plus className="w-3 h-3" />{" "}
                                {language === "bn"
                                  ? "সরবরাহকারী যোগ করুন"
                                  : "Add Supplier"}
                              </button>
                            </div>

                            <div
                              className={`grid grid-cols-12 gap-2 text-[11px] font-semibold px-1 ${
                                isDark
                                  ? "opacity-70 text-slate-300"
                                  : "text-slate-800"
                              }`}
                            >
                              <div className="col-span-4">
                                {language === "bn"
                                  ? "প্রতিষ্ঠানের নাম ও ঠিকানা"
                                  : "Name & Address"}
                              </div>
                              <div className="col-span-2">
                                {language === "bn" ? "একক মূল্য" : "Unit Price"}
                              </div>
                              <div className="col-span-2">
                                {language === "bn"
                                  ? "মোট মূল্য (অটো)"
                                  : "Total Price"}
                              </div>
                              <div className="col-span-3">
                                {language === "bn"
                                  ? "মন্তব্য (অটো)"
                                  : "Remarks"}
                              </div>
                              <div className="col-span-1 text-center">#</div>
                            </div>

                            {item.suppliers &&
                              item.suppliers.map((sup, sIndex) => (
                                <div
                                  key={sIndex}
                                  className={`grid grid-cols-12 gap-2 items-center pt-2 border-t ${
                                    isDark
                                      ? "border-slate-500/20"
                                      : "border-slate-300"
                                  }`}
                                >
                                  <div className="col-span-4">
                                    <input
                                      type="text"
                                      list="supplier-suggestions"
                                      placeholder={
                                        language === "bn"
                                          ? `সরবরাহকারী ${sIndex + 1} নাম ও ঠিকানা`
                                          : `Supplier ${sIndex + 1} Name & Address`
                                      }
                                      value={sup.nameAndAddress}
                                      onChange={(e) => {
                                        const updated = [...quotationItems];
                                        updated[index].suppliers![
                                          sIndex
                                        ].nameAndAddress = e.target.value;
                                        setQuotationItems(updated);
                                      }}
                                      className={`w-full px-2.5 py-1.5 border rounded-lg text-xs ${
                                        isCustom
                                          ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                          : isDark
                                            ? "bg-slate-850 border-slate-700 text-slate-100"
                                            : "bg-white border-slate-300 text-slate-900"
                                      }`}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      placeholder={
                                        language === "bn" ? "দর" : "Unit Price"
                                      }
                                      value={sup.unitPrice}
                                      onChange={(e) => {
                                        const updated = [...quotationItems];
                                        const price =
                                          Number(e.target.value) || 0;
                                        const suppliers =
                                          updated[index].suppliers!;
                                        suppliers[sIndex].unitPrice = price;
                                        suppliers[sIndex].totalPrice =
                                          item.qty * price;

                                        const prices = suppliers.map(
                                          (s) => s.unitPrice || 0,
                                        );
                                        const minPrice = Math.min(...prices);
                                        const maxPrice = Math.max(...prices);

                                        suppliers.forEach((s) => {
                                          const p = s.unitPrice || 0;
                                          if (suppliers.length === 1) {
                                            s.remarks = "সর্বনিম্ন";
                                          } else if (p === minPrice) {
                                            s.remarks = "সর্বনিম্ন";
                                          } else if (p === maxPrice) {
                                            s.remarks = "সর্বোচ্চ";
                                          } else {
                                            s.remarks = "২য় সর্বোচ্চ";
                                          }
                                        });

                                        updated[index].unitPrice = minPrice;
                                        updated[index].totalPrice =
                                          item.qty * minPrice;
                                        setQuotationItems(updated);
                                      }}
                                      className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono ${
                                        isCustom
                                          ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                          : isDark
                                            ? "bg-slate-850 border-slate-700 text-slate-100"
                                            : "bg-white border-slate-300 text-slate-900"
                                      }`}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      readOnly
                                      value={sup.totalPrice}
                                      className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono ${
                                        isDark
                                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                          : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                      }`}
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <input
                                      type="text"
                                      readOnly
                                      value={sup.remarks}
                                      className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold ${
                                        sup.remarks === "সর্বনিম্ন"
                                          ? isDark
                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                          : sup.remarks === "সর্বোচ্চ"
                                            ? isDark
                                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                                              : "bg-rose-100 text-rose-800 border-rose-300"
                                            : isDark
                                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                              : "bg-amber-100 text-amber-900 border-amber-300"
                                      }`}
                                    />
                                  </div>
                                  <div className="col-span-1 text-center">
                                    {item.suppliers!.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...quotationItems];
                                          const suppliers = updated[
                                            index
                                          ].suppliers!.filter(
                                            (_, i) => i !== sIndex,
                                          );
                                          updated[index].suppliers = suppliers;

                                          if (suppliers.length > 0) {
                                            const prices = suppliers.map(
                                              (s) => s.unitPrice || 0,
                                            );
                                            const minPrice = Math.min(
                                              ...prices,
                                            );
                                            const maxPrice = Math.max(
                                              ...prices,
                                            );

                                            suppliers.forEach((s) => {
                                              const p = s.unitPrice || 0;
                                              if (suppliers.length === 1) {
                                                s.remarks = "সর্বনিম্ন";
                                              } else if (p === minPrice) {
                                                s.remarks = "সর্বনিম্ন";
                                              } else if (p === maxPrice) {
                                                s.remarks = "সর্বোচ্চ";
                                              } else {
                                                s.remarks = "২য় সর্বোচ্চ";
                                              }
                                            });

                                            updated[index].unitPrice = minPrice;
                                            updated[index].totalPrice =
                                              item.qty * minPrice;
                                          }
                                          setQuotationItems(updated);
                                        }}
                                        className="text-rose-600 dark:text-rose-400 hover:text-rose-500 p-1 rounded"
                                        title="Delete supplier"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 1114 Branch Debit Entries Section for FORM-1 */}
                    <div
                      className={`rounded-xl border overflow-hidden shadow-sm ${
                        isCustom
                          ? "bg-[#18122d] border-[#382b61]"
                          : isDark
                            ? "bg-slate-900 border-slate-700"
                            : "bg-white border-emerald-300"
                      }`}
                    >
                      {/* Header Bar */}
                      <div className="bg-[#15803d] text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-emerald-200" />
                          <span className="font-bold text-sm">
                            ১১১৪ শাখা এন্ট্রি (ডেবিট সারি)
                          </span>
                          <span className="text-[11px] text-emerald-100 hidden md:inline font-normal">
                            (পূরণ করা হলে ফরওয়ার্ডিং এ 1114 শাখাভিত্তিক ডেবিট ও
                            ১৪৮/০১ ক্রেডিট সমন্বয় প্রদর্শিত হবে)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {quotationItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const branchOfficeList = offices.filter(
                                  (o) =>
                                    o.id !== officeId &&
                                    o.type !== "HeadOffice",
                                );
                                const effectiveBranches =
                                  branchOfficeList.length > 0
                                    ? branchOfficeList
                                    : offices;
                                const autoEntries: BranchDebitEntry[] =
                                  quotationItems.map((qItem, idx) => {
                                    const targetBranch =
                                      effectiveBranches[
                                        idx % effectiveBranches.length
                                      ] || offices[0];
                                    const branchCleanName =
                                      targetBranch.name.includes("শাখা") ||
                                      targetBranch.name.includes("অফিস")
                                        ? targetBranch.name
                                        : `${targetBranch.name} শাখা`;
                                    const branchLabel =
                                      `${branchCleanName} (${targetBranch.code || ""})`.trim();
                                    const uPrice = Number(qItem.unitPrice || 0);
                                    const q = Number(qItem.qty || 1);
                                    const totalP =
                                      Number(qItem.totalPrice) || uPrice * q;
                                    return {
                                      branchOfficeId: targetBranch.id,
                                      branchName: branchLabel,
                                      itemIndex: idx,
                                      itemDescription:
                                        qItem.itemDescription || "",
                                      model:
                                        qItem.model ||
                                        qItem.specification ||
                                        "",
                                      unit: qItem.unit || "টি",
                                      qty: q,
                                      amount: Math.round(totalP),
                                    };
                                  });
                                setBranchEntries(autoEntries);
                              }}
                              className="bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-50 border border-emerald-300/40 font-semibold px-2.5 py-1 rounded text-xs shadow-sm flex items-center gap-1 transition"
                              title="সকল আইটেমের জন্য পর্যায়ক্রমে শাখা বরাদ্দ তৈরি করুন"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>অটো সব আইটেম শাখা বরাদ্দ</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const firstItem = quotationItems[0];
                              const unitPrice = firstItem
                                ? Number(firstItem.unitPrice || 0)
                                : 0;
                              const branchOfficeList = offices.filter(
                                (o) => o.id !== officeId,
                              );
                              const defaultBranch =
                                branchOfficeList[0] || offices[0];
                              const branchCleanName =
                                defaultBranch?.name.includes("শাখা") ||
                                defaultBranch?.name.includes("অফিস")
                                  ? defaultBranch.name
                                  : `${defaultBranch?.name || "শাখা"} শাখা`;
                              const newEntry: BranchDebitEntry = {
                                branchOfficeId: defaultBranch?.id || "",
                                branchName: defaultBranch
                                  ? `${branchCleanName} (${defaultBranch.code || ""})`.trim()
                                  : "শাখা",
                                itemIndex: 0,
                                itemDescription:
                                  firstItem?.itemDescription || "",
                                model:
                                  firstItem?.model ||
                                  firstItem?.specification ||
                                  "",
                                unit: firstItem?.unit || "টি",
                                qty: 1,
                                amount: Math.round(
                                  unitPrice *
                                    1 *
                                    (1 +
                                      (effectiveVatRate + effectiveTaxRate) /
                                        100),
                                ),
                              };
                              setBranchEntries((prev) => [...prev, newEntry]);
                            }}
                            className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded text-xs shadow-sm flex items-center gap-1 transition"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-800" />
                            <span>+ শাখা যোগ করুন</span>
                          </button>
                        </div>
                      </div>

                      {/* Table / Rows */}
                      <div className="p-3.5 space-y-3">
                        {branchEntries.length === 0 ? (
                          <div className="text-center py-4 px-3 border border-dashed rounded-lg border-emerald-300/60 dark:border-slate-700 bg-emerald-50/40 dark:bg-slate-800/40">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {language === "bn"
                                ? "কোনো শাখা এন্ট্রি যোগ করা হয়নি। শাখাসমূহের জন্য মালামাল ক্রয়ের ক্ষেত্রে উপরে '+ শাখা যোগ করুন' অথবা 'অটো সব আইটেম শাখা বরাদ্দ' বাটনে ক্লিক করুন। এতে ফরওয়ার্ডিং টেবিলে হুবহু 1114- শাখা (কোড) ভিত্তিক ডেবিট ও ক্রেডিট সমন্বয় প্রদর্শিত হবে।"
                                : "No branch entry added. Click '+ Add Branch' or 'Auto Assign All Items' to distribute items to branches for Form 1 Forwarding table."}
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 pb-1 border-b dark:border-slate-700">
                              <div className="col-span-12 sm:col-span-3">
                                শাখার নাম
                              </div>
                              <div className="col-span-12 sm:col-span-4">
                                পণ্য আইটেম
                              </div>
                              <div className="col-span-5 sm:col-span-2 text-center">
                                পরিমাণ (Qty)
                              </div>
                              <div className="col-span-5 sm:col-span-3 text-right">
                                টাকার পরিমাণ (৳)
                              </div>
                              <div className="col-span-2 sm:col-span-0 text-center sm:hidden">
                                অ্যাকশন
                              </div>
                            </div>

                            {/* Rows */}
                            <div className="space-y-2">
                              {branchEntries.map((branch, bIdx) => {
                                return (
                                  <div
                                    key={bIdx}
                                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                                  >
                                    {/* Branch Name Selector */}
                                    <div className="col-span-12 sm:col-span-3">
                                      <select
                                        value={branch.branchName}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const matched = offices.find(
                                            (o) =>
                                              `${o.name} (${o.code})` === val ||
                                              o.name === val ||
                                              `${o.name} শাখা (${o.code})` ===
                                                val,
                                          );
                                          setBranchEntries((prev) => {
                                            const copy = [...prev];
                                            copy[bIdx] = {
                                              ...copy[bIdx],
                                              branchName: val,
                                              branchOfficeId:
                                                matched?.id ||
                                                copy[bIdx].branchOfficeId,
                                            };
                                            return copy;
                                          });
                                        }}
                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none ${
                                          isCustom
                                            ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                            : isDark
                                              ? "bg-slate-850 border-slate-700 text-slate-100"
                                              : "bg-white border-slate-300 text-slate-900"
                                        }`}
                                      >
                                        {offices.map((o) => {
                                          const cleanName =
                                            o.name.includes("শাখা") ||
                                            o.name.includes("অফিস") ||
                                            o.name.includes("কার্যালয়")
                                              ? o.name
                                              : `${o.name} শাখা`;
                                          const label =
                                            `${cleanName} (${o.code || ""})`.trim();
                                          return (
                                            <option key={o.id} value={label}>
                                              {cleanName}{" "}
                                              {o.code ? `(${o.code})` : ""}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </div>

                                    {/* Product Item Selector */}
                                    <div className="col-span-12 sm:col-span-4">
                                      <select
                                        value={branch.itemIndex ?? 0}
                                        onChange={(e) => {
                                          const itemIdx = Number(
                                            e.target.value,
                                          );
                                          const selItem =
                                            quotationItems[itemIdx];
                                          const uPrice = selItem
                                            ? Number(selItem.unitPrice || 0)
                                            : 0;
                                          setBranchEntries((prev) => {
                                            const copy = [...prev];
                                            copy[bIdx] = {
                                              ...copy[bIdx],
                                              itemIndex: itemIdx,
                                              itemDescription:
                                                selItem?.itemDescription || "",
                                              model:
                                                selItem?.model ||
                                                selItem?.specification ||
                                                "",
                                              unit: selItem?.unit || "টি",
                                              amount: Math.round(
                                                uPrice *
                                                  (copy[bIdx].qty || 1) *
                                                  (1 +
                                                    (effectiveVatRate +
                                                      effectiveTaxRate) /
                                                      100),
                                              ),
                                            };
                                            return copy;
                                          });
                                        }}
                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none ${
                                          isCustom
                                            ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                            : isDark
                                              ? "bg-slate-850 border-slate-700 text-slate-100"
                                              : "bg-white border-slate-300 text-slate-900"
                                        }`}
                                      >
                                        {quotationItems.map((qi, qIdx) => (
                                          <option key={qIdx} value={qIdx}>
                                            {qIdx + 1}.{" "}
                                            {qi.itemDescription ||
                                              `আইটেম ${qIdx + 1}`}{" "}
                                            {qi.specification
                                              ? `(${qi.specification})`
                                              : ""}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-5 sm:col-span-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={branch.qty}
                                        onChange={(e) => {
                                          const newQty =
                                            Number(e.target.value) || 0;
                                          const selItem =
                                            quotationItems[
                                              branch.itemIndex ?? 0
                                            ];
                                          const uPrice = selItem
                                            ? Number(selItem.unitPrice || 0)
                                            : 0;
                                          setBranchEntries((prev) => {
                                            const copy = [...prev];
                                            copy[bIdx] = {
                                              ...copy[bIdx],
                                              qty: newQty,
                                              amount: Math.round(
                                                uPrice *
                                                  newQty *
                                                  (1 +
                                                    (effectiveVatRate +
                                                      effectiveTaxRate) /
                                                      100),
                                              ),
                                            };
                                            return copy;
                                          });
                                        }}
                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs text-center font-mono focus:outline-none ${
                                          isCustom
                                            ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                            : isDark
                                              ? "bg-slate-850 border-slate-700 text-slate-100"
                                              : "bg-white border-slate-300 text-slate-900"
                                        }`}
                                        placeholder="১"
                                      />
                                    </div>

                                    {/* Amount (Auto Calculated / Editable) */}
                                    <div className="col-span-5 sm:col-span-3 flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        value={branch.amount}
                                        onChange={(e) => {
                                          const customAmt =
                                            Number(e.target.value) || 0;
                                          setBranchEntries((prev) => {
                                            const copy = [...prev];
                                            copy[bIdx] = {
                                              ...copy[bIdx],
                                              amount: customAmt,
                                            };
                                            return copy;
                                          });
                                        }}
                                        className="w-full px-2.5 py-1.5 border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 rounded-lg text-xs text-right font-mono font-bold focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBranchEntries((prev) =>
                                            prev.filter(
                                              (_, idx) => idx !== bIdx,
                                            ),
                                          );
                                        }}
                                        className="p-1.5 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 rounded-lg transition"
                                        title="শাখা এন্ট্রি মুছে ফেলুন"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Branch Entries Total Summary */}
                            <div className="flex justify-end items-center pt-2 border-t dark:border-slate-700">
                              <div className="text-xs font-bold text-slate-800 dark:text-emerald-300 flex items-center gap-2">
                                <span>শাখাসমূহের মোট এন্ট্রি :</span>
                                <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
                                  ৳{" "}
                                  {branchEntries
                                    .reduce(
                                      (acc, b) => acc + (Number(b.amount) || 0),
                                      0,
                                    )
                                    .toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Summary / Grand Total Calculation for Quotation Form 1 */}
                    <div
                      className={`p-3.5 rounded-xl border space-y-2 text-xs font-mono ${
                        isCustom
                          ? "bg-[#110c22] border-[#382b61] text-purple-100"
                          : isDark
                            ? "bg-slate-900 border-slate-700"
                            : "bg-slate-100 border-slate-300 text-slate-900"
                      }`}
                    >
                      <div
                        className={`flex justify-between items-center font-sans font-bold pb-1 border-b ${
                          isCustom
                            ? "text-amber-300 border-[#382b61]"
                            : isDark
                              ? "text-emerald-400 border-emerald-500/20"
                              : "text-emerald-800 border-emerald-300"
                        }`}
                      >
                        <span>
                          {language === "bn"
                            ? "হিসাবের সারাংশ (Summary)"
                            : "Calculation Summary"}
                        </span>
                        <span>
                          {language === "bn"
                            ? "স্বয়ংক্রিয় হিসাব"
                            : "Auto Calculated"}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center ${isCustom ? "text-purple-200" : isDark ? "opacity-80" : "text-slate-800 font-medium"}`}
                      >
                        <span>
                          {language === "bn"
                            ? "মোট আইটেম মূল্য (Base Total):"
                            : "Total Item Value:"}
                        </span>
                        <span>
                          {formatCurrency(
                            quotationItems.reduce(
                              (acc, item) => acc + (item.totalPrice || 0),
                              0,
                            ),
                          )}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center ${isCustom ? "text-purple-200" : isDark ? "opacity-80" : "text-slate-800 font-medium"}`}
                      >
                        <span>
                          {language === "bn"
                            ? `ভ্যাট (${effectiveVatRate}%):`
                            : `VAT Amount (${effectiveVatRate}%):`}
                        </span>
                        <span>
                          {formatCurrency(
                            (quotationItems.reduce(
                              (acc, item) => acc + (item.totalPrice || 0),
                              0,
                            ) *
                              effectiveVatRate) /
                              100,
                          )}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center ${isCustom ? "text-purple-200" : isDark ? "opacity-80" : "text-slate-800 font-medium"}`}
                      >
                        <span>
                          {language === "bn"
                            ? `ট্যাক্স (${effectiveTaxRate}%):`
                            : `Tax Amount (${effectiveTaxRate}%):`}
                          {hasStockChalan === "হ্যাঁ" && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1 font-sans font-bold">
                              (মুসক চালানে ০%)
                            </span>
                          )}
                        </span>
                        <span>
                          {formatCurrency(
                            (quotationItems.reduce(
                              (acc, item) => acc + (item.totalPrice || 0),
                              0,
                            ) *
                              effectiveTaxRate) /
                              100,
                          )}
                        </span>
                      </div>
                      <div
                        className={`border-t pt-1.5 flex justify-between items-center font-bold text-sm ${
                          isCustom
                            ? "text-amber-300 border-[#382b61]"
                            : isDark
                              ? "text-emerald-500 border-slate-700"
                              : "text-emerald-800 border-emerald-300"
                        }`}
                      >
                        <span>
                          {language === "bn"
                            ? "সর্বমোট প্রদেয় (Grand Total):"
                            : "Grand Total:"}
                        </span>
                        <span className="font-mono">
                          {formatCurrency(
                            quotationItems.reduce(
                              (acc, item) => acc + (item.totalPrice || 0),
                              0,
                            ) +
                              (quotationItems.reduce(
                                (acc, item) => acc + (item.totalPrice || 0),
                                0,
                              ) *
                                (effectiveVatRate + effectiveTaxRate)) /
                                100,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FORM-2: Supply Order Recipient, Bidders Organizations, and Items Comparative Table */}
              {expenseType === "Quotation" && quotationFormType === "Form2" && (
                <div className="space-y-4">
                  {/* Section 1: Supply Order Recipient Info */}
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61]"
                        : isDark
                          ? "bg-slate-800/70 border-slate-700"
                          : "bg-white border-slate-300 shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg text-sm text-white ${
                        isCustom ? "bg-[#32235c]" : "bg-emerald-700"
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>
                        {language === "bn"
                          ? "সাপ্লাই অর্ডার প্রাপকের তথ্য"
                          : "Supply Order Recipient Info"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn" ? "জনাবের নাম" : "Recipient Name"}
                        </label>
                        <input
                          type="text"
                          value={supplyRecipientName}
                          onChange={(e) =>
                            setSupplyRecipientName(e.target.value)
                          }
                          placeholder="যেমন: মোহাম্মদ আলী"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn" ? "পদবী" : "Designation"}
                        </label>
                        <input
                          type="text"
                          value={supplyRecipientDesignation}
                          onChange={(e) =>
                            setSupplyRecipientDesignation(e.target.value)
                          }
                          placeholder="যেমন: প্রোপ্রাইটার"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label
                          className={`block font-semibold text-xs ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "প্রতিষ্ঠানের নাম"
                            : "Organization Name"}
                        </label>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          {language === "bn"
                            ? `← সর্বনিম্ন দর প্রদানকারী (প্রতিষ্ঠান ${form2LowestBidder.index}) থেকে অটো`
                            : `← Auto from Lowest Bidder (Org ${form2LowestBidder.index})`}
                        </span>
                      </div>
                      <input
                        type="text"
                        list="supplier-suggestions"
                        value={
                          supplyRecipientOrgName ||
                          form2LowestBidder.name ||
                          supplierOrg1
                        }
                        onChange={(e) =>
                          setSupplyRecipientOrgName(e.target.value)
                        }
                        placeholder="যেমন: ইউনিক প্রিন্টার্স, ১৬ আলিফ বিপণি সেন্টার..."
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                          isCustom
                            ? "bg-[#18122d] border-[#382b61] text-purple-100"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100"
                              : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "ঠিকানা লাইন ১ (রাস্তা/এলাকা)"
                            : "Address Line 1"}
                        </label>
                        <input
                          type="text"
                          value={
                            supplyRecipientAddress1 ||
                            form2LowestBidder.parsed.address1 ||
                            "নজির আহমেদ চৌধুরী রোড"
                          }
                          onChange={(e) =>
                            setSupplyRecipientAddress1(e.target.value)
                          }
                          placeholder="যেমন: নজির আহমেদ চৌধুরী রোড"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "ঠিকানা লাইন ২ (থানা/শহর)"
                            : "Address Line 2"}
                        </label>
                        <input
                          type="text"
                          value={
                            supplyRecipientAddress2 ||
                            form2LowestBidder.parsed.address2 ||
                            "আন্দরকিল্লা, চট্টগ্রাম।"
                          }
                          onChange={(e) =>
                            setSupplyRecipientAddress2(e.target.value)
                          }
                          placeholder="যেমন: আন্দরকিল্লা, চট্টগ্রাম।"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Quotation Bidder Organizations */}
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61]"
                        : isDark
                          ? "bg-slate-800/70 border-slate-700"
                          : "bg-white border-slate-300 shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg text-sm text-white ${
                        isCustom ? "bg-[#32235c]" : "bg-emerald-700"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>
                        {language === "bn"
                          ? "দরপত্রদাতা প্রতিষ্ঠানসমূহের নাম ও ঠিকানা"
                          : "Quotation Bidder Organizations"}
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "প্রতিষ্ঠান ১ *"
                            : "Organization 1 *"}
                        </label>
                        <input
                          type="text"
                          required
                          list="supplier-suggestions"
                          value={supplierOrg1}
                          onChange={(e) =>
                            handleForm2SupplierNameChange(1, e.target.value)
                          }
                          placeholder="প্রতিষ্ঠান ১ এর নাম ও পূর্ণ ঠিকানা (যেমন: ইউনিক প্রিন্টার্স, ১৬ আলিফ বিপণি সেন্টার, নজির আহমেদ চৌধুরী রোড, আন্দরকিল্লা, চট্টগ্রাম।)"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs font-medium ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "প্রতিষ্ঠান ২ *"
                            : "Organization 2 *"}
                        </label>
                        <input
                          type="text"
                          required
                          list="supplier-suggestions"
                          value={supplierOrg2}
                          onChange={(e) =>
                            handleForm2SupplierNameChange(2, e.target.value)
                          }
                          placeholder="প্রতিষ্ঠান ২ এর নাম ও পূর্ণ ঠিকানা (যেমন: আইডিয়াল পেপার এন্ড প্রিন্টার্স, ১৭, রাজা পুকুর লেইন, আন্দরকিল্লা, চট্টগ্রাম।)"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                        >
                          {language === "bn"
                            ? "প্রতিষ্ঠান ৩ *"
                            : "Organization 3 *"}
                        </label>
                        <input
                          type="text"
                          required
                          list="supplier-suggestions"
                          value={supplierOrg3}
                          onChange={(e) =>
                            handleForm2SupplierNameChange(3, e.target.value)
                          }
                          placeholder="প্রতিষ্ঠান ৩ এর নাম ও পূর্ণ ঠিকানা (যেমন: পূবালী আর্ট প্রেস এন্ড স্টেশনারীজ, খাসেম মার্কেট, মোমিন রোড, চট্টগ্রাম।)"
                          className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                            isCustom
                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                              : isDark
                                ? "bg-slate-850 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Form-2 Quotation Items */}
                  <div
                    className={`p-4 rounded-xl border space-y-4 ${
                      isCustom
                        ? "bg-[#140e29] border-[#382b61]"
                        : isDark
                          ? "bg-slate-800/70 border-slate-700"
                          : "bg-white border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div
                        className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg text-sm text-white ${
                          isCustom ? "bg-[#32235c]" : "bg-emerald-700"
                        }`}
                      >
                        <Receipt className="w-4 h-4" />
                        <span>
                          {language === "bn"
                            ? "পণ্য আইটেম সমূহ"
                            : "Quotation Items"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddForm2Item}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shadow transition"
                      >
                        <Plus className="w-3.5 h-3.5" />{" "}
                        {language === "bn"
                          ? "＋ নতুন আইটেম যোগ করুন"
                          : "+ Add New Item"}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {form2Items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className={`p-4 rounded-xl border space-y-3 ${
                            isCustom
                              ? "bg-[#1c1535] border-[#40316b]"
                              : isDark
                                ? "bg-slate-850 border-slate-700"
                                : "bg-slate-50 border-slate-300"
                          }`}
                        >
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 text-sm">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                  isDark
                                    ? "bg-emerald-500/25 text-emerald-300"
                                    : "bg-emerald-200 text-emerald-900 font-bold"
                                }`}
                              >
                                {itemIdx + 1}
                              </span>
                              {language === "bn"
                                ? `আইটেম ${itemIdx + 1}`
                                : `Item ${itemIdx + 1}`}
                            </span>
                            {form2Items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveForm2Item(itemIdx)}
                                className="text-rose-600 dark:text-rose-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/20 transition"
                                title={
                                  language === "bn"
                                    ? "আইটেম মুছে ফেলুন"
                                    : "Remove Item"
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-6">
                              <label
                                className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                              >
                                {language === "bn"
                                  ? "দ্রব্যাদির নাম ও বিবরণ *"
                                  : "Item Description *"}
                              </label>
                              <input
                                type="text"
                                required
                                value={item.itemDescription}
                                onChange={(e) =>
                                  handleForm2ItemDescChange(
                                    itemIdx,
                                    e.target.value,
                                  )
                                }
                                placeholder="যেমন: সঞ্চয়ী হিসাব জমা বই"
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                                  isCustom
                                    ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                    : isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-100"
                                      : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                                }`}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label
                                className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                              >
                                {language === "bn"
                                  ? "পরিমাণ (সংখ্যায়) *"
                                  : "Quantity (Number) *"}
                              </label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.qty}
                                onChange={(e) =>
                                  handleForm2QtyChange(
                                    itemIdx,
                                    Number(e.target.value) || 1,
                                  )
                                }
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs font-mono font-bold ${
                                  isCustom
                                    ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                    : isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-100"
                                      : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                                }`}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label
                                className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-800"}`}
                              >
                                {language === "bn" ? "একক" : "Unit"}
                              </label>
                              <select
                                value={item.unit}
                                onChange={(e) =>
                                  handleForm2UnitChange(itemIdx, e.target.value)
                                }
                                className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs font-medium ${
                                  isCustom
                                    ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                    : isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-100"
                                      : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                                }`}
                              >
                                <option value="টি">টি (Pcs)</option>
                                <option value="বই">বই (Books)</option>
                                <option value="রিম">রিম (Ream)</option>
                                <option value="সেট">সেট (Set)</option>
                                <option value="প্যাকেট">
                                  প্যাকেট (Packet)
                                </option>
                                <option value="ডজন">ডজন (Dozen)</option>
                                <option value="পিস">পিস</option>
                                <option value="বক্স">বক্স (Box)</option>
                                <option value="মিটার">মিটার (Meter)</option>
                                <option value="কেজি">কেজি (Kg)</option>
                              </select>
                            </div>
                          </div>

                          {/* 3-Bidders Comparison Table */}
                          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 mt-2">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-emerald-700 text-white font-semibold">
                                <tr>
                                  <th className="p-2.5">
                                    {language === "bn"
                                      ? "প্রতিষ্ঠান (অটো: উপরের নাম)"
                                      : "Organization"}
                                  </th>
                                  <th className="p-2.5 w-28 text-center">
                                    {language === "bn"
                                      ? "একক দর (৳)"
                                      : "Unit Price (৳)"}
                                  </th>
                                  <th className="p-2.5 w-20 text-center">
                                    {language === "bn" ? "পরিমাণ" : "Qty"}
                                  </th>
                                  <th className="p-2.5 w-28 text-right">
                                    {language === "bn"
                                      ? "মোট মূল্য (৳) ←অটো"
                                      : "Total (৳)"}
                                  </th>
                                  <th className="p-2.5 w-32 text-center">
                                    {language === "bn" ? "মন্তব্য" : "Remarks"}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 bg-white dark:bg-slate-900">
                                {item.suppliers.map((sup, sIdx) => {
                                  const currentOrgName =
                                    sIdx === 0
                                      ? supplierOrg1
                                      : sIdx === 1
                                        ? supplierOrg2
                                        : supplierOrg3;
                                  return (
                                    <tr
                                      key={sIdx}
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                                    >
                                      <td className="p-2.5">
                                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                            {sIdx === 0
                                              ? "🏢 প্রতিষ্ঠান ১:"
                                              : sIdx === 1
                                                ? "🏢 প্রতিষ্ঠান ২:"
                                                : "🏢 প্রতিষ্ঠান ৩:"}
                                          </span>
                                          <span
                                            className="truncate max-w-[280px] font-normal text-slate-700 dark:text-slate-300"
                                            title={currentOrgName}
                                          >
                                            {currentOrgName
                                              ? currentOrgName.split(",")[0]
                                              : `প্রতিষ্ঠান ${sIdx + 1}`}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={sup.unitPrice}
                                          onChange={(e) =>
                                            handleForm2PriceChange(
                                              itemIdx,
                                              sIdx,
                                              Number(e.target.value) || 0,
                                            )
                                          }
                                          className={`w-24 px-2 py-1 border rounded-lg text-center font-mono font-bold text-xs ${
                                            isCustom
                                              ? "bg-[#18122d] border-[#382b61] text-purple-100"
                                              : isDark
                                                ? "bg-slate-800 border-slate-700 text-slate-100"
                                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                                          }`}
                                        />
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                                        {item.qty}
                                      </td>
                                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                        ৳
                                        {(
                                          (sup.unitPrice || 0) * item.qty
                                        ).toFixed(2)}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                            sup.remarks === "সর্বনিম্ন দরদাতা"
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                                              : sup.remarks ===
                                                  "সর্বোচ্চ দরদাতা"
                                                ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700"
                                                : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700"
                                          }`}
                                        >
                                          {sup.remarks}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Form-2 Bottom Calculation Summary Highlight Bar */}
                    <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 text-xs md:text-sm font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          {language === "bn"
                            ? "সর্বনিম্ন দরদাতার মোট মূল্য"
                            : "Lowest Bidder Base Total"}
                          :{" "}
                          <span className="font-mono text-emerald-700 dark:text-emerald-300">
                            ৳ {form2LowestBaseTotal.toFixed(2)}
                          </span>
                        </span>
                        <span className="text-slate-400">|</span>
                        <span>
                          {effectiveVatRate}%{" "}
                          {language === "bn" ? "ভ্যাট" : "VAT"}:{" "}
                          <span className="font-mono text-emerald-700 dark:text-emerald-300">
                            ৳ {form2VatAmount.toFixed(2)}
                          </span>
                        </span>
                        <span className="text-slate-400">|</span>
                        <span>
                          {effectiveTaxRate}%{" "}
                          {language === "bn" ? "ট্যাক্স" : "TAX"}
                          {hasStockChalan === "হ্যাঁ"
                            ? " (মুসক চালানে ০%)"
                            : ""}
                          :{" "}
                          <span className="font-mono text-emerald-700 dark:text-emerald-300">
                            ৳ {form2TaxAmount.toFixed(2)}
                          </span>
                        </span>
                      </div>
                      <div className="border-t md:border-t-0 md:border-l border-emerald-300 dark:border-emerald-700 pt-1 md:pt-0 md:pl-4">
                        <span className="text-emerald-900 dark:text-emerald-200">
                          {language === "bn"
                            ? "কর্তনযোগ্য সর্বমোট"
                            : "Grand Total"}
                          :{" "}
                          <span className="font-mono text-base text-emerald-800 dark:text-emerald-300 font-extrabold">
                            ৳ {form2GrandTotal.toFixed(2)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Applicant Info Section (Only for Regular / General Expenses) */}
              {expenseType !== "Quotation" && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isCustom
                      ? "bg-[#140e29] border-[#382b61]"
                      : isDark
                        ? "bg-slate-800/70 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 font-bold ${
                      isCustom
                        ? "text-amber-300"
                        : isDark
                          ? "text-slate-200"
                          : "text-slate-800"
                    }`}
                  >
                    <UserCircle className="w-4 h-4 text-emerald-500" />{" "}
                    {t.applicantType}
                  </div>

                  <div className="flex gap-4">
                    <label
                      className={`flex items-center gap-2 cursor-pointer font-medium text-xs md:text-sm ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="applicantType"
                        value="OwnOffice"
                        checked={applicantType === "OwnOffice"}
                        onChange={() => setApplicantType("OwnOffice")}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      {t.applicantOwnOffice}
                    </label>
                    <label
                      className={`flex items-center gap-2 cursor-pointer font-medium text-xs md:text-sm ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="applicantType"
                        value="PersonInstitution"
                        checked={applicantType === "PersonInstitution"}
                        onChange={() => setApplicantType("PersonInstitution")}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      {t.applicantPersonInstitution}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t.applicantName}
                      </label>
                      <input
                        type="text"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        placeholder={currentUser?.name || ""}
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                          isCustom
                            ? "bg-[#18122d] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t.applicantDesignation}
                      </label>
                      <input
                        type="text"
                        value={applicantDesignation}
                        onChange={(e) =>
                          setApplicantDesignation(e.target.value)
                        }
                        placeholder={currentUser.designation || "Officer"}
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                          isCustom
                            ? "bg-[#18122d] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                        }`}
                      />
                    </div>
                  </div>

                  {applicantType === "PersonInstitution" && (
                    <div>
                      <label
                        className={`block font-semibold text-xs mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t.applicantInstitution}
                      </label>
                      <input
                        type="text"
                        value={applicantInstitution}
                        onChange={(e) =>
                          setApplicantInstitution(e.target.value)
                        }
                        placeholder="যেমন: ইউনিক এন্টারপ্রাইজ"
                        className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                          isCustom
                            ? "bg-[#18122d] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                            : isDark
                              ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                              : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Description (for non-quotation expenses) */}
              {expenseType !== "Quotation" && (
                <div className="space-y-3">
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {t.description} *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Office stationery purchase and printer toner refilling"
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none ${
                        isCustom
                          ? "bg-[#140e29] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                          : isDark
                            ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Supporting Document Upload */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isCustom
                    ? "bg-[#140e29] border-[#382b61]"
                    : isDark
                      ? "bg-slate-800/70 border-slate-700"
                      : "bg-slate-50 border-slate-200"
                }`}
              >
                <label
                  className={`block font-semibold flex items-center gap-1.5 ${isCustom ? "text-purple-200" : isDark ? "text-slate-300" : "text-slate-700"}`}
                >
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                  {language === "bn"
                    ? "সংযুক্তি / ভাউচারের কপি (সাপোর্টিং ডকুমেন্ট)"
                    : "Supporting Document / Voucher Copy"}
                </label>
                <p
                  className={`text-xs ${isCustom ? "text-purple-300/70" : isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  {language === "bn"
                    ? "অনুমোদিত ফরম্যাট: PDF, JPG, JPEG, PNG, DOCX (সর্বোচ্চ ৫ MB)"
                    : "Allowed formats: PDF, JPG, JPEG, PNG, DOCX (Max 5 MB)"}
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleFileChange}
                    disabled={uploadingDoc}
                    className="text-xs opacity-80 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600/20 file:text-emerald-400 hover:file:bg-emerald-600/30 cursor-pointer disabled:opacity-50"
                  />
                  {uploadingDoc && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {language === "bn" ? "আপলোড হচ্ছে..." : "Uploading..."}
                    </span>
                  )}
                </div>

                {uploadError && (
                  <div className="text-xs text-rose-400 bg-rose-500/15 p-2 rounded-lg border border-rose-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {supportingDocument && (
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      isCustom
                        ? "bg-[#18122d] border-[#382b61]"
                        : isDark
                          ? "bg-slate-850 border-slate-700"
                          : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate font-mono">
                        {supportingDocument.split("/").pop()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`${supportingDocument}${supportingDocument.includes("?") ? "&" : "?"}token=${encodeURIComponent(localStorage.getItem("govt_app_token") || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {language === "bn" ? "প্রিভিউ" : "Preview"}
                      </a>
                      <button
                        type="button"
                        onClick={() => setSupportingDocument("")}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/20"
                        title={
                          language === "bn"
                            ? "সংযুক্তি মুছুন"
                            : "Remove Attachment"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  isCustom
                    ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
                    : isDark
                      ? "bg-emerald-900/20 border-emerald-800/30 text-emerald-300"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.autoNoteSheetNotice}</span>
              </div>

              {errorMessage && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div
                className={`flex justify-end gap-2 pt-2 border-t ${
                  isCustom
                    ? "border-[#2e234e]"
                    : isDark
                      ? "border-slate-800"
                      : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 rounded-xl font-medium ${
                    isCustom
                      ? "bg-[#251d45] text-purple-200 hover:bg-[#32285e]"
                      : isDark
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isDuplicateVoucher || isNegativeBalance}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-semibold shadow disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  )}
                  <span>
                    {isSaving
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Saving..."
                      : t.save}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingExpenseId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-md w-full p-6 shadow-2xl border ${
              isCustom
                ? "bg-[#18122d] border-[#382b61] text-purple-100"
                : isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-rose-400">
              <XCircle className="w-5 h-5" />
              {language === "bn"
                ? "ব্যয় প্রত্যাখ্যানের কারণ"
                : "Reject Expense Reason"}
            </h3>
            <p
              className={`text-xs mb-4 ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              {language === "bn"
                ? "অনুগ্রহ করে ব্যয়টি বাতিলের সুনির্দিষ্ট কারণ প্রদান করুন।"
                : "Please specify the reason for rejecting this expense."}
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder={
                language === "bn"
                  ? "যেমন: ভাউচারের কপি অস্পষ্ট বা অপ্রতুল বরাদ্দ..."
                  : "Reason..."
              }
              className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-rose-500 mb-3 ${
                isCustom
                  ? "bg-[#140e29] border-[#382b61] text-purple-100 placeholder:text-purple-400/50"
                  : isDark
                    ? "bg-slate-850 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    : "bg-white border-slate-300 text-slate-900"
              }`}
            />
            {rejectError && (
              <p className="text-xs text-rose-400 mb-3">{rejectError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingExpenseId(null);
                  setRejectionReasonInput("");
                }}
                className={`px-4 py-2 rounded-xl font-medium text-xs ${
                  isCustom
                    ? "bg-[#251d45] text-purple-200 hover:bg-[#32285e]"
                    : isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow text-xs"
              >
                {language === "bn" ? "বাতিল করুন" : "Reject Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Sheet Preview Modal */}
      {previewNoteSheet && (
        <NoteSheetPreviewModal
          noteSheet={previewNoteSheet}
          categories={categories}
          officeName={
            offices.find((o) => o.id === previewNoteSheet.officeId)?.name
          }
          categoryId={
            expenses.find((e) => e.noteSheetId === previewNoteSheet.id)
              ?.categoryId
          }
          categoryName={
            categories.find(
              (c) =>
                c.id ===
                expenses.find((e) => e.noteSheetId === previewNoteSheet.id)
                  ?.categoryId,
            )?.name
          }
          onClose={() => setPreviewNoteSheet(null)}
          currentUser={currentUser}
          onUpdateNoteSheet={() => {
            if (refreshData) refreshData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div
            className={`m-auto rounded-2xl max-w-sm w-full p-6 shadow-2xl border ${
              isCustom
                ? "bg-[#18122d] border-[#382b61] text-purple-100"
                : isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="text-base font-bold mb-2">
              {language === "bn" ? "নিশ্চিত করুন" : "Confirm Delete"}
            </h3>
            <p
              className={`text-sm mb-6 ${isCustom ? "text-purple-300" : isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              {language === "bn"
                ? "আপনি কি নিশ্চিত যে এই ব্যয়ের রেকর্ডটি মুছে ফেলতে চান?"
                : "Are you sure you want to void this expense?"}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  isCustom
                    ? "bg-[#251d45] text-purple-200 hover:bg-[#32285e]"
                    : isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(deletingId);
                  setDeletingId(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold shadow text-sm"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 border ${
            isCustom
              ? "bg-[#18122d] border-[#4b3b7a] text-purple-100"
              : isDark
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-slate-900 border-slate-700 text-white"
          }`}
        >
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <p className="text-sm font-medium">{toastMsg}</p>
        </div>
      )}
    </div>
  );
}
