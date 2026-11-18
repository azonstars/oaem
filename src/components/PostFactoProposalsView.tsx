import React, { useState, useEffect } from "react";
import {
  User,
  PostFactoProposal,
  Office,
  Category,
  FinancialYear,
  SystemSettings,
} from "../types";
import { useLanguage } from "../i18n";
import { apiFetch } from "../api";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  FileText,
  FileDown,
  Upload,
  X,
  Loader2,
  Search,
  Filter,
  RotateCcw,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { NoteSheetPreviewModal } from "./NoteSheetPreviewModal";

interface PostFactoProposalsViewProps {
  currentUser: User;
  mode: "propose" | "sanction" | "letters";
  offices: Office[];
  categories: Category[];
  financialYears: FinancialYear[];
  selectedFY: string;
  systemSettings?: SystemSettings | null;
}

export function PostFactoProposalsView({
  currentUser,
  mode,
  offices,
  categories,
  financialYears: _financialYears,
  selectedFY,
  systemSettings,
}: PostFactoProposalsViewProps) {
  const { language, formatCurrency } = useLanguage();

  const isAdmin =
    currentUser.role === "Super Admin" ||
    currentUser.role === "Head Office Admin" ||
    currentUser.role === "Admin";

  const [proposals, setProposals] = useState<PostFactoProposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [noteSheets, setNoteSheets] = useState<any[]>([]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const [previewNoteSheet, setPreviewNoteSheet] = useState<any | null>(null);
  const [previewInitialTab, setPreviewInitialTab] = useState<
    "notesheet" | "forwarding" | "supplyorder" | "sanctionletter" | "sanctionnotesheet"
  >("notesheet");

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<PostFactoProposal>>({
    bidders: [
      { name: "", address: "", price: 0 },
      { name: "", address: "", price: 0 },
      { name: "", address: "", price: 0 },
    ],
    sanctionType: "budget_allocation",
  });

  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [sanctionData, setSanctionData] = useState<Partial<PostFactoProposal>>(
    {},
  );
  const [selectedProposal, setSelectedProposal] =
    useState<PostFactoProposal | null>(null);
  const [isSanctioning, setIsSanctioning] = useState(false);
  const [syncVatTaxOnSanction, setSyncVatTaxOnSanction] = useState(true);

  const getPostFactoBreakdown = (p: Partial<PostFactoProposal>) => {
    const vatRate = Number(p.vatRate || 0);
    const taxRate = Number(p.taxRate || 0);
    const totalPct = vatRate + taxRate;
    const unitPrice = Number(p.unitPrice || 0);
    const totalAmount = Number(p.totalAmount || 0);

    const expectedFromUnit =
      unitPrice > 0
        ? Math.round(
            unitPrice + (unitPrice * vatRate) / 100 + (unitPrice * taxRate) / 100,
          )
        : 0;
    const unitMatchesTotalWithVat =
      unitPrice > 0 &&
      totalPct > 0 &&
      Math.abs(totalAmount - expectedFromUnit) <= 2;
    const totalEqualsUnitWithoutVat =
      unitPrice > 0 && totalPct > 0 && Math.abs(totalAmount - unitPrice) <= 2;

    let baseAmount = 0;
    if (
      unitPrice > 0 &&
      (unitMatchesTotalWithVat || totalEqualsUnitWithoutVat || totalAmount === 0)
    ) {
      baseAmount = unitPrice;
    } else if (
      totalPct > 0 &&
      totalAmount > 0 &&
      unitPrice > 0 &&
      totalAmount < expectedFromUnit - 2
    ) {
      baseAmount = unitPrice;
    } else if (totalAmount > 0) {
      baseAmount = totalAmount;
    } else {
      baseAmount = unitPrice;
    }

    const vatAmount = Math.round((baseAmount * vatRate) / 100);
    const taxAmount = Math.round((baseAmount * taxRate) / 100);
    const expectedWithVatTax = Math.round(baseAmount + vatAmount + taxAmount);

    const validBidderPrices = Array.isArray(p.bidders)
      ? p.bidders.map((b) => Number(b?.price || 0)).filter((pr) => pr > 0)
      : [];
    const minBidderPrice =
      validBidderPrices.length > 0 ? Math.min(...validBidderPrices) : 0;
    const biddersAlreadyHaveVat =
      totalPct > 0 &&
      expectedWithVatTax > 0 &&
      minBidderPrice >= expectedWithVatTax - 2;

    const isMissingVatTax =
      totalPct > 0 &&
      unitPrice > 0 &&
      totalAmount > 0 &&
      (totalEqualsUnitWithoutVat || totalAmount < expectedFromUnit - 2);

    return {
      vatRate,
      taxRate,
      totalPct,
      unitPrice,
      baseAmount,
      vatAmount,
      taxAmount,
      expectedWithVatTax,
      totalAmount,
      isMissingVatTax,
      unitMatchesTotalWithVat,
      totalEqualsUnitWithoutVat,
      biddersAlreadyHaveVat,
    };
  };

  const openEditProposalModal = (p: PostFactoProposal) => {
    const existingBidders = Array.isArray(p.bidders)
      ? p.bidders.map((b) => ({ ...b }))
      : [];
    while (existingBidders.length < 3) {
      existingBidders.push({ name: "", address: "", price: 0 });
    }
    setFormData({
      ...p,
      bidders: existingBidders,
    });
    setShowModal(true);
  };

  const openSanctionModal = (p: PostFactoProposal) => {
    const bd = getPostFactoBreakdown(p);
    setSelectedProposal(p);
    setSyncVatTaxOnSanction(bd.isMissingVatTax);
    setSanctionData({
      sanctionDate: new Date().toISOString().split("T")[0],
      sanctionedAmount: bd.isMissingVatTax ? bd.expectedWithVatTax : p.totalAmount,
      sanctionType: p.sanctionType || "budget_allocation",
      letterNo: p.letterNo || "",
      letterDate: p.letterDate || "",
      sanctionMemoNo: p.sanctionMemoNo || "",
      sanctionRemarks: p.sanctionRemarks || "",
    });
    setShowSanctionModal(true);
  };

  const [uploadingDocProposalId, setUploadingDocProposalId] = useState<
    string | null
  >(null);
  const [sanctionStatusFilter, setSanctionStatusFilter] = useState<
    "Pending" | "Sanctioned" | "All"
  >("Pending");

  // Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOfficeId, setFilterOfficeId] = useState("all");
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filterSanctionType, setFilterSanctionType] = useState<string>("all");
  const [filterProposalStatus, setFilterProposalStatus] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const [proposalsRes, noteSheetsRes] = await Promise.all([
        apiFetch("/api/postfactoproposals"),
        apiFetch("/api/notesheets"),
      ]);

      const proposalsData = await proposalsRes.json();
      const noteSheetsData = await noteSheetsRes.json();

      if (proposalsData.error) throw new Error(proposalsData.error);
      if (noteSheetsData.error) throw new Error(noteSheetsData.error);

      setProposals(proposalsData);
      setNoteSheets(noteSheetsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleDelete = (id: string) => {
    setDeletingProposalId(id);
  };

  const confirmDeleteProposal = async () => {
    if (!deletingProposalId || isDeleting) return;
    const targetId = deletingProposalId;
    try {
      setIsDeleting(true);
      const res = await apiFetch(`/api/postfactoproposals/${targetId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(
          data?.error ||
            (language === "bn"
              ? "প্রস্তাবটি মুছে ফেলা সম্ভব হয়নি।"
              : "Failed to delete proposal."),
        );
      }
      setProposals((prev) => prev.filter((p) => p.id !== targetId));
      setDeletingProposalId(null);
      showToast(
        "success",
        language === "bn"
          ? "খরচোত্তর প্রস্তাবটি সফলভাবে মুছে ফেলা হয়েছে!"
          : "Post-facto proposal deleted successfully!",
      );
      await fetchProposals();
    } catch (err: any) {
      setDeletingProposalId(null);
      showToast(
        "error",
        err?.message ||
          (language === "bn"
            ? "মুছে ফেলতে ত্রুটি হয়েছে।"
            : "Error deleting proposal."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const isEdit = Boolean(formData.id);
      const url = isEdit
        ? `/api/postfactoproposals/${formData.id}`
        : "/api/postfactoproposals";
      const method = isEdit ? "PUT" : "POST";
      const payloadToSave = {
        ...formData,
        officeId: formData.officeId || currentUser.officeId,
        financialYearId: formData.financialYearId || selectedFY,
        createdBy: (formData as any).createdBy || currentUser.userId,
      };
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSave),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Save failed");
      setShowModal(false);
      showToast(
        "success",
        language === "bn"
          ? isEdit
            ? "খরচোত্তর প্রস্তাব ও নথিপত্র সফলভাবে সংশোধন করা হয়েছে!"
            : "খরচোত্তর প্রস্তাব সফলভাবে সংরক্ষিত হয়েছে!"
          : isEdit
            ? "Proposal & documents updated successfully!"
            : "Proposal saved successfully!",
      );
      fetchProposals();
    } catch (err: any) {
      showToast("error", err.message || "Error saving proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSanctionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;
    try {
      setIsSanctioning(true);
      const bd = getPostFactoBreakdown(selectedProposal);
      const bodyPayload: any = { ...sanctionData };

      if (syncVatTaxOnSanction && bd.totalPct > 0) {
        const syncedTotal = Number(
          sanctionData.sanctionedAmount || bd.expectedWithVatTax,
        );
        bodyPayload.totalAmount = syncedTotal;
        const currentBidders = selectedProposal.bidders || [];
        const validPrices = currentBidders
          .map((b) => Number(b.price || 0))
          .filter((pr) => pr > 0);
        const minBidder = validPrices.length > 0 ? Math.min(...validPrices) : 0;
        if (
          minBidder > 0 &&
          Math.abs(minBidder - bd.baseAmount) <= 2 &&
          bd.isMissingVatTax
        ) {
          bodyPayload.bidders = currentBidders.map((b) => ({
            ...b,
            price:
              Number(b.price || 0) > 0
                ? Math.round(Number(b.price) * (1 + bd.totalPct / 100))
                : 0,
          }));
        }
      }

      const res = await apiFetch(
        `/api/postfactoproposals/${selectedProposal.id}/sanction`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        },
      );

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Sanction failed");

      setShowSanctionModal(false);
      showToast(
        "success",
        language === "bn"
          ? "খরচোত্তর প্রস্তাবটি সফলভাবে মঞ্জুর করা হয়েছে!"
          : "Proposal sanctioned successfully!",
      );
      fetchProposals();
    } catch (err: any) {
      showToast("error", err.message || "Sanction failed");
    } finally {
      setIsSanctioning(false);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isSanction: boolean,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await apiFetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            originalName: file.name,
            expenseId: "sanction-doc",
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.url) {
          if (isSanction) {
            setSanctionData({ ...sanctionData, sanctionDocument: data.url });
          }
        }
      } catch (err: any) {
        showToast("error", err.message || "Upload failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSanctionDoc = async (
    proposalId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const inputEl = e.target;

    setUploadingDocProposalId(proposalId);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await apiFetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            originalName: file.name,
            expenseId: proposalId,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.url) {
          const updateRes = await apiFetch(
            `/api/postfactoproposals/${proposalId}/upload-sanction-document`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sanctionDocument: data.url }),
            },
          );
          const updateJson = await updateRes.json();
          if (updateJson.error) throw new Error(updateJson.error);

          setProposals((prev) =>
            prev.map((p) =>
              p.id === proposalId ? { ...p, sanctionDocument: data.url } : p,
            ),
          );

          showToast(
            "success",
            language === "bn"
              ? "স্বাক্ষরিত মঞ্জুরপত্র (PDF) সফলভাবে আপলোড করা হয়েছে। এখন শাখা এটি দেখতে ও ডাউনলোড করতে পারবে।"
              : "Signed sanction document (PDF) uploaded successfully. Branch can now view and download it.",
          );
        }
      } catch (err: any) {
        showToast("error", err.message || "Upload failed");
      } finally {
        setUploadingDocProposalId(null);
        if (inputEl) inputEl.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const list = Array.isArray(proposals) ? proposals : [];
  let filtered = list.filter((p) => p.financialYearId === selectedFY);
  if (
    currentUser.role !== "Super Admin" &&
    currentUser.role !== "Head Office Admin" &&
    currentUser.role !== "Admin" &&
    currentUser.role !== "Moderator"
  ) {
    filtered = filtered.filter((p) => p.officeId === currentUser.officeId);
  } else if (filterOfficeId !== "all") {
    filtered = filtered.filter((p) => p.officeId === filterOfficeId);
  }

  if (mode === "sanction") {
    if (sanctionStatusFilter === "Pending") {
      filtered = filtered.filter((p) => p.status === "Pending");
    } else if (sanctionStatusFilter === "Sanctioned") {
      filtered = filtered.filter((p) => p.status === "Sanctioned");
    }
  } else if (mode === "letters") {
    filtered = filtered.filter((p) => p.status === "Sanctioned");
  } else if (mode === "propose") {
    if (filterProposalStatus !== "all") {
      filtered = filtered.filter((p) => p.status === filterProposalStatus);
    }
  }

  if (filterCategoryId !== "all") {
    filtered = filtered.filter((p) => p.categoryId === filterCategoryId);
  }

  if (filterSanctionType !== "all") {
    filtered = filtered.filter((p) => p.sanctionType === filterSanctionType);
  }

  if (filterStartDate) {
    filtered = filtered.filter((p) => {
      const dates = [
        p.sanctionDate,
        p.tenderDate,
        p.workOrderDate,
        p.letterDate,
        (p as any).createdAt,
      ].filter(Boolean);
      if (dates.length === 0) return true;
      return dates.some((d) => String(d).slice(0, 10) >= filterStartDate);
    });
  }

  if (filterEndDate) {
    filtered = filtered.filter((p) => {
      const dates = [
        p.sanctionDate,
        p.tenderDate,
        p.workOrderDate,
        p.letterDate,
        (p as any).createdAt,
      ].filter(Boolean);
      if (dates.length === 0) return true;
      return dates.some((d) => String(d).slice(0, 10) <= filterEndDate);
    });
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const off = offices.find((o) => o.id === p.officeId);
      const cat = categories.find((c) => c.id === p.categoryId);
      const offName = (off?.name || "").toLowerCase();
      const offCode = (off?.code || "").toLowerCase();
      const catName = (cat?.name || "").toLowerCase();
      const catCode = (cat?.code || "").toLowerCase();
      const catBudgetHead = (cat?.budgetHead || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const memo = (p.sanctionMemoNo || "").toLowerCase();
      const letterNo = (p.letterNo || "").toLowerCase();
      const workOrderNo = (p.workOrderNo || "").toLowerCase();
      const amountStr = String(p.totalAmount || "");
      const biddersStr = (p.bidders || [])
        .map((b) => `${b.name} ${b.address}`)
        .join(" ")
        .toLowerCase();

      return (
        desc.includes(q) ||
        offName.includes(q) ||
        offCode.includes(q) ||
        catName.includes(q) ||
        catCode.includes(q) ||
        catBudgetHead.includes(q) ||
        memo.includes(q) ||
        letterNo.includes(q) ||
        workOrderNo.includes(q) ||
        amountStr.includes(q) ||
        biddersStr.includes(q)
      );
    });
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterOfficeId !== "all" ||
    filterCategoryId !== "all" ||
    filterSanctionType !== "all" ||
    (mode === "propose" && filterProposalStatus !== "all") ||
    filterStartDate !== "" ||
    filterEndDate !== "";

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterOfficeId("all");
    setFilterCategoryId("all");
    setFilterSanctionType("all");
    setFilterProposalStatus("all");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const totalFilteredAmount = filtered.reduce(
    (sum, p) =>
      sum +
      Number(
        (p.status === "Sanctioned" && p.sanctionedAmount
          ? p.sanctionedAmount
          : p.totalAmount) || 0,
      ),
    0,
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenDocument = async (
    proposal: PostFactoProposal,
    tab:
      | "notesheet"
      | "forwarding"
      | "supplyorder"
      | "sanctionnotesheet"
      | "sanctionletter",
  ) => {
    let ns = noteSheets.find(
      (n) => n.expenseId === proposal.id || n.id === proposal.noteSheetId,
    );
    if (
      !ns ||
      !ns.forwardingContent ||
      !ns.forwardingContent.includes("watermark-container") ||
      !ns.forwardingContent.includes("pad-header") ||
      !ns.supplyOrderContent ||
      !ns.supplyOrderContent.includes("watermark-container") ||
      (tab === "supplyorder" &&
        Boolean(proposal.letterNo || proposal.workOrderNo || proposal.letterDate || proposal.workOrderDate || proposal.tenderDate) &&
        (ns.supplyOrderContent.includes(".../.../......") || ns.supplyOrderContent.includes("/...<") || ns.supplyOrderContent.includes("/...<strong") || ns.supplyOrderContent.includes("/...<div"))) ||
      (proposal.status === "Sanctioned" &&
        (!ns.sanctionLetterContent ||
          !ns.sanctionNoteSheetContent ||
          (proposal.taxRate && !ns.sanctionLetterContent.includes("ট্যাক্স"))))
    ) {
      try {
        const res = await apiFetch(
          `/api/expenses/${proposal.id}/generate-notesheet`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.userId, force: true }),
          },
        );
        const data = await res.json();
        if (data && data.noteSheet) {
          ns = data.noteSheet;
          fetchProposals();
        }
      } catch (err) {
        console.warn("Auto-sync post-facto note sheet failed:", err);
      }
    }
    if (ns) {
      setPreviewInitialTab(tab);
      setPreviewNoteSheet({ ...ns, isPostFacto: true });
    } else {
      showToast(
        "error",
        language === "bn"
          ? "এই প্রস্তাবের জন্য কোনো নথিপত্র পাওয়া যায়নি। অনুগ্রহ করে রিলোড করে পুনরায় চেষ্টা করুন।"
          : "No generated documents found for this proposal.",
      );
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "propose"
                ? language === "bn"
                  ? "খরচোত্তর প্রস্তাব"
                  : "Post-facto Proposals"
                : mode === "letters"
                  ? language === "bn"
                    ? "মঞ্জুরীপত্র (খরচোত্তর)"
                    : "Sanction Letters (Post-facto)"
                  : language === "bn"
                    ? "খরচোত্তর মঞ্জুর"
                    : "Post-facto Sanctions"}
            </h2>
            {mode === "letters" && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === "bn"
                  ? "অনুমোদিত খরচোত্তর প্রস্তাবসমূহের স্বাক্ষরিত মঞ্জুরীপত্র ও সংশ্লিষ্ট নথিপত্র"
                  : "Signed sanction letters and documents for approved post-facto proposals"}
              </p>
            )}
          </div>
          {mode === "sanction" && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSanctionStatusFilter("Pending")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sanctionStatusFilter === "Pending"
                    ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {language === "bn" ? "অপেক্ষমান" : "Pending"}
              </button>
              <button
                type="button"
                onClick={() => setSanctionStatusFilter("Sanctioned")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sanctionStatusFilter === "Sanctioned"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {language === "bn" ? "মঞ্জুরকৃত" : "Sanctioned"}
              </button>
              <button
                type="button"
                onClick={() => setSanctionStatusFilter("All")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sanctionStatusFilter === "All"
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {language === "bn" ? "সকল" : "All"}
              </button>
            </div>
          )}
        </div>
        {mode === "propose" && (
          <button
            onClick={() => {
              setFormData({
                bidders: [
                  { name: "", address: "", price: 0 },
                  { name: "", address: "", price: 0 },
                  { name: "", address: "", price: 0 },
                ],
                financialYearId: selectedFY,
                officeId: currentUser.officeId,
                sanctionType: "budget_allocation",
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            {language === "bn" ? "নতুন প্রস্তাব" : "New Proposal"}
          </button>
        )}
      </div>

      {/* Post-Facto Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {mode === "propose"
                ? language === "bn"
                  ? "খরচোত্তর প্রস্তাব ফিল্টারিং ও অনুসন্ধান"
                  : "Post-Facto Proposals Filter & Search"
                : mode === "letters"
                  ? language === "bn"
                    ? "মঞ্জুরীপত্র ফিল্টারিং ও অনুসন্ধান"
                    : "Sanction Letters Filter & Search"
                  : language === "bn"
                    ? "খরচোত্তর মঞ্জুর ফিল্টারিং ও অনুসন্ধান"
                    : "Post-Facto Sanctions Filter & Search"}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {language === "bn"
                ? `প্রদর্শিত হচ্ছে: ${filtered.length} টি`
                : `Showing: ${filtered.length}`}
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              {language === "bn" ? "মোট টাকা: " : "Total: "}
              {formatCurrency(totalFilteredAmount)}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs px-2.5 py-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                {language === "bn" ? "ফিল্টার রিসেট" : "Reset Filters"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === "bn"
                  ? "বিবরণ, স্মারক, পত্র নং, কার্যাদেশ বা দরদাতা দিয়ে খুঁজুন..."
                  : "Search desc, memo, letter, work order, bidder..."
              }
              className="w-full pl-8 pr-8 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Office Filter (for Admin / HO) */}
          {(currentUser.role === "Super Admin" ||
            currentUser.role === "Head Office Admin" ||
            currentUser.role === "Admin" ||
            currentUser.role === "Moderator") && (
            <div>
              <select
                value={filterOfficeId}
                onChange={(e) => setFilterOfficeId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">
                  {language === "bn" ? "সকল কার্যালয় / শাখা" : "All Offices"}
                </option>
                {offices.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.name} ({off.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <div
            className={
              !(
                currentUser.role === "Super Admin" ||
                currentUser.role === "Head Office Admin" ||
                currentUser.role === "Admin" ||
                currentUser.role === "Moderator"
              )
                ? "lg:col-span-2"
                : ""
            }
          >
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">
                {language === "bn" ? "সকল হিসাবের খাত" : "All Categories"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.budgetHead ? `[${c.budgetHead}] ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sanction Type Filter */}
          <div>
            <select
              value={filterSanctionType}
              onChange={(e) => setFilterSanctionType(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">
                {language === "bn" ? "সকল অনুমোদনের ধরন" : "All Types"}
              </option>
              <option value="budget_allocation">
                {language === "bn"
                  ? "বাজেট বরাদ্দসহ অনুমোদন"
                  : "With Budget Allocation"}
              </option>
              <option value="only_sanction">
                {language === "bn"
                  ? "শুধুমাত্র খরচোত্তর অনুমোদন"
                  : "Only Post-facto Sanction"}
              </option>
            </select>
          </div>

          {/* Status Filter (when in propose mode) */}
          {mode === "propose" && (
            <div>
              <select
                value={filterProposalStatus}
                onChange={(e) => setFilterProposalStatus(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">
                  {language === "bn" ? "সকল স্ট্যাটাস" : "All Status"}
                </option>
                <option value="Pending">
                  {language === "bn" ? "অপেক্ষমান (Pending)" : "Pending"}
                </option>
                <option value="Sanctioned">
                  {language === "bn" ? "মঞ্জুরকৃত (Sanctioned)" : "Sanctioned"}
                </option>
              </select>
            </div>
          )}

          {/* Date Range */}
          <div>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              title={language === "bn" ? "শুরুর তারিখ (হতে)" : "Start Date"}
              className="w-full px-2 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              title={language === "bn" ? "শেষ তারিখ (পর্যন্ত)" : "End Date"}
              className="w-full px-2 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">
                {language === "bn" ? "অফিস" : "Office"}
              </th>
              <th className="px-4 py-3 font-semibold">
                {language === "bn" ? "খাত" : "Category"}
              </th>
              <th className="px-4 py-3 font-semibold">
                {language === "bn" ? "বিবরণ" : "Description"}
              </th>
              <th className="px-4 py-3 font-semibold">
                {language === "bn" ? "মোট মূল্য" : "Total Amount"}
              </th>
              <th className="px-4 py-3 font-semibold">
                {language === "bn" ? "স্ট্যাটাস" : "Status"}
              </th>
              <th className="px-4 py-3 font-semibold text-right">
                {language === "bn" ? "পদক্ষেপ" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>{language === "bn" ? "তথ্য লোড হচ্ছে..." : "Loading data..."}</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {error ? error : language === "bn" ? "কোন তথ্য পাওয়া যায়নি" : "No data found"}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const off =
                  offices.find((o) => o.id === p.officeId)?.name || p.officeId;
                const cat =
                  categories.find((c) => c.id === p.categoryId)?.name ||
                  p.categoryId;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3">{off}</td>
                    <td className="px-4 py-3">{cat}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 max-w-[300px] whitespace-normal break-words">
                        {p.description}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        <span
                          className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            p.sanctionType === "only_sanction"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800"
                          }`}
                        >
                          {p.sanctionType === "only_sanction"
                            ? language === "bn"
                              ? "শুধুমাত্র খরচোত্তর অনুমোদন"
                              : "Only Post-facto approval"
                            : language === "bn"
                              ? "বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন"
                              : "Post-facto approval with budget allocation"}
                        </span>
                      </div>
                      {p.status === "Sanctioned" &&
                        (p.sanctionMemoNo || p.sanctionDate) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium">
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-semibold">
                                {language === "bn" ? "অনুমোদিত" : "Sanctioned"}
                              </span>
                              {p.sanctionMemoNo && (
                                <span className="ml-1 text-slate-600 dark:text-slate-300">
                                  {language === "bn" ? "স্মারক:" : "Memo:"}{" "}
                                  <strong>{p.sanctionMemoNo}</strong>
                                </span>
                              )}
                              {p.sanctionDate && (
                                <span className="ml-1 text-slate-600 dark:text-slate-300">
                                  ({formatDate(p.sanctionDate)})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      {(p.tenderDate ||
                        p.workOrderNo ||
                        p.workOrderDate ||
                        p.letterNo ||
                        p.letterDate) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {p.tenderDate && (
                            <span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {language === "bn"
                                  ? "দরপত্র তারিখ:"
                                  : "Tender Date:"}
                              </span>{" "}
                              {formatDate(p.tenderDate)}
                            </span>
                          )}
                          {p.workOrderNo && (
                            <span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {language === "bn"
                                  ? "কার্যাদেশ নং:"
                                  : "W.O. No:"}
                              </span>{" "}
                              {p.workOrderNo}{" "}
                              {p.workOrderDate &&
                                `(${formatDate(p.workOrderDate)})`}
                            </span>
                          )}
                          {p.letterNo && (
                            <span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {language === "bn" ? "পত্র নং:" : "Letter No:"}
                              </span>{" "}
                              {p.letterNo}{" "}
                              {p.letterDate && `(${formatDate(p.letterDate)})`}
                            </span>
                          )}
                        </div>
                      )}
                      {p.noteSheetId && (
                        <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2">
                          <span className="text-xs font-semibold text-slate-500 block mb-1">
                            {language === "bn"
                              ? "সংযুক্ত নথিপত্র:"
                              : "Generated Documents:"}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleOpenDocument(p, "notesheet")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/30"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {language === "bn" ? "নোট শিট" : "Note Sheet"}
                            </button>
                            <button
                              onClick={() =>
                                handleOpenDocument(p, "forwarding")
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-950/50 text-sky-700 dark:text-sky-400 rounded-lg transition-colors border border-sky-100 dark:border-sky-900/30"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {language === "bn" ? "ফরোয়ার্ডিং" : "Forwarding"}
                            </button>
                            <button
                              onClick={() =>
                                handleOpenDocument(p, "supplyorder")
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-400 rounded-lg transition-colors border border-amber-100 dark:border-amber-900/30"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {language === "bn" ? "কার্যাদেশ" : "Supply Order"}
                            </button>
                            {p.status === "Sanctioned" && (
                              <>
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleOpenDocument(
                                          p,
                                          "sanctionnotesheet",
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-900/30"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      {language === "bn"
                                        ? "মঞ্জুরীর নোটশিট"
                                        : "Sanction Note"}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleOpenDocument(p, "sanctionletter")
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-400 rounded-lg transition-colors border border-teal-100 dark:border-teal-900/30"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      {language === "bn"
                                        ? "মঞ্জুরপত্র (ফরোয়ার্ডিং)"
                                        : "Sanction Letter"}
                                    </button>
                                  </>
                                )}
                                {p.sanctionDocument ? (
                                  <a
                                    href={`${p.sanctionDocument}${p.sanctionDocument.includes("?") ? "&" : "?"}token=${encodeURIComponent(localStorage.getItem("govt_app_token") || "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors"
                                  >
                                    <FileDown className="w-3.5 h-3.5" />
                                    {language === "bn"
                                      ? "মঞ্জুরপত্র (PDF)"
                                      : "Sanction Letter (PDF)"}
                                  </a>
                                ) : (
                                  !isAdmin && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/30"
                                      title={
                                        language === "bn"
                                          ? "মঞ্জুরকারী কর্তৃপক্ষ কর্তৃক মূল স্বাক্ষরিত পিডিএফ আপলোড প্রক্রিয়াধীন"
                                          : "Signed PDF pending upload by authority"
                                      }
                                    >
                                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                                      {language === "bn"
                                        ? "মঞ্জুরীপত্র (আপলোড প্রক্রিয়াধীন)"
                                        : "Sanction Letter (Pending)"}
                                    </span>
                                  )
                                )}
                                {isAdmin && (
                                  <label
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                                      p.sanctionDocument
                                        ? "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                        : "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm"
                                    } ${uploadingDocProposalId === p.id ? "opacity-60 pointer-events-none" : ""}`}
                                    title={
                                      language === "bn"
                                        ? p.sanctionDocument
                                          ? "স্বাক্ষরিত পিডিএফ মঞ্জুরপত্র পরিবর্তন করুন"
                                          : "স্বাক্ষরিত পিডিএফ মঞ্জুরপত্র আপলোড করুন (শাখা এটি দেখতে পাবে)"
                                        : p.sanctionDocument
                                          ? "Change signed sanction PDF"
                                          : "Upload signed sanction PDF (Branch will receive it)"
                                    }
                                  >
                                    {uploadingDocProposalId === p.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {uploadingDocProposalId === p.id
                                        ? language === "bn"
                                          ? "আপলোড হচ্ছে..."
                                          : "Uploading..."
                                        : language === "bn"
                                          ? p.sanctionDocument
                                            ? "পিডিএফ পরিবর্তন"
                                            : "মঞ্জুরপত্র আপলোড (PDF)"
                                          : p.sanctionDocument
                                            ? "Change PDF"
                                            : "Upload Sanction (PDF)"}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,application/pdf,image/*"
                                      className="hidden"
                                      disabled={uploadingDocProposalId === p.id}
                                      onChange={(e) =>
                                        handleUploadSanctionDoc(p.id, e)
                                      }
                                    />
                                  </label>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {(() => {
                        const bd = getPostFactoBreakdown(p);
                        return (
                          <div className="space-y-0.5 whitespace-normal min-w-[165px]">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(p.totalAmount || 0)}
                            </div>
                            {p.status === "Sanctioned" &&
                              p.sanctionedAmount &&
                              Number(p.sanctionedAmount) !==
                                Number(p.totalAmount) && (
                                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                  {language === "bn"
                                    ? `মঞ্জুরকৃত: ${formatCurrency(p.sanctionedAmount)}`
                                    : `Sanctioned: ${formatCurrency(p.sanctionedAmount)}`}
                                </div>
                              )}
                            {bd.totalPct > 0 && (
                              <div className="text-[11px] leading-snug space-y-0.5">
                                <div className="text-slate-500 dark:text-slate-400">
                                  {language === "bn"
                                    ? `মূল: ${formatCurrency(bd.baseAmount)} | ভ্যাট ${bd.vatRate}% (${formatCurrency(bd.vatAmount)}) | ট্যাক্স ${bd.taxRate}% (${formatCurrency(bd.taxAmount)})`
                                    : `Base: ${formatCurrency(bd.baseAmount)} | VAT ${bd.vatRate}% | Tax ${bd.taxRate}%`}
                                </div>
                                <div className="font-semibold text-indigo-700 dark:text-indigo-300">
                                  {language === "bn"
                                    ? `ভ্যাট-ট্যাক্সসহ প্রকৃত বিল: ${formatCurrency(bd.expectedWithVatTax)}`
                                    : `Actual w/ VAT+Tax: ${formatCurrency(bd.expectedWithVatTax)}`}
                                </div>
                                {bd.isMissingVatTax && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    {language === "bn"
                                      ? "ভ্যাট ও ট্যাক্স যোগ হয়নি"
                                      : "VAT/Tax missing"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          p.status === "Sanctioned"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {(isAdmin ||
                          (mode === "propose" && p.status === "Pending")) && (
                          <button
                            type="button"
                            onClick={() => openEditProposalModal(p)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            title={
                              language === "bn"
                                ? "প্রস্তাব ও হিসাব সম্পাদনা করুন"
                                : "Edit Proposal & Amounts"
                            }
                          >
                            <Edit2 className="w-4 h-4" />
                            {isAdmin && (
                              <span className="text-xs font-semibold hidden xl:inline">
                                {language === "bn" ? "এডিট" : "Edit"}
                              </span>
                            )}
                          </button>
                        )}
                        {mode === "sanction" &&
                          p.status === "Pending" &&
                          isAdmin && (
                            <button
                              type="button"
                              onClick={() => openSanctionModal(p)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs font-semibold">
                                {language === "bn" ? "মঞ্জুর" : "Sanction"}
                              </span>
                            </button>
                          )}
                        {((mode === "propose" &&
                          (p.status === "Pending" || p.status === "Rejected")) ||
                          (mode === "sanction" &&
                            p.status === "Pending" &&
                            isAdmin)) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title={language === "bn" ? "মুছে ফেলুন" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && p.status === "Sanctioned" && (
                          <label
                            className={`p-2 rounded-lg inline-flex items-center cursor-pointer transition-colors ${
                              p.sanctionDocument
                                ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            } ${uploadingDocProposalId === p.id ? "opacity-50 pointer-events-none" : ""}`}
                            title={
                              language === "bn"
                                ? p.sanctionDocument
                                  ? "স্বাক্ষরিত মঞ্জুরপত্র (PDF) পরিবর্তন করুন"
                                  : "স্বাক্ষরিত মঞ্জুরপত্র (PDF) আপলোড করুন"
                                : p.sanctionDocument
                                  ? "Change signed sanction PDF"
                                  : "Upload signed sanction PDF"
                            }
                          >
                            {uploadingDocProposalId === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            <input
                              type="file"
                              accept=".pdf,application/pdf,image/*"
                              className="hidden"
                              disabled={uploadingDocProposalId === p.id}
                              onChange={(e) => handleUploadSanctionDoc(p.id, e)}
                            />
                          </label>
                        )}
                        {p.sanctionDocument && (
                          <a
                            href={`${p.sanctionDocument}${p.sanctionDocument.includes("?") ? "&" : "?"}token=${encodeURIComponent(localStorage.getItem("govt_app_token") || "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg inline-block"
                            title={
                              language === "bn"
                                ? "মঞ্জুরপত্র (PDF) ডাউনলোড / দেখুন"
                                : "View / Download Sanction PDF"
                            }
                          >
                            <FileDown className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View - 100% Responsive on Smaller Screens */}
      <div className="block md:hidden space-y-4">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {language === "bn" ? "কোন তথ্য পাওয়া যায়নি" : "No data found"}
          </div>
        ) : (
          filtered.map((p) => {
            const off =
              offices.find((o) => o.id === p.officeId)?.name || p.officeId;
            const cat =
              categories.find((c) => c.id === p.categoryId)?.name ||
              p.categoryId;
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3"
              >
                {/* Office & Status Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {off}
                    </span>
                    <span className="inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md">
                      {cat}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      p.status === "Sanctioned"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : p.status === "Rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Description */}
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">
                  {p.description}
                </div>

                {/* Sanction Category Tag */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      p.sanctionType === "only_sanction"
                        ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    {p.sanctionType === "only_sanction"
                      ? language === "bn"
                        ? "শুধুমাত্র খরচোত্তর অনুমোদন"
                        : "Only Post-facto approval"
                      : language === "bn"
                        ? "বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন"
                        : "Post-facto approval with budget allocation"}
                  </span>
                </div>

                {/* Sanction details info card */}
                {p.status === "Sanctioned" &&
                  (p.sanctionMemoNo || p.sanctionDate) && (
                    <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 space-y-1 text-xs">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {language === "bn" ? "অনুমোদিত" : "Sanctioned"}
                      </div>
                      {p.sanctionMemoNo && (
                        <div className="text-slate-700 dark:text-slate-300">
                          {language === "bn" ? "স্মারক:" : "Memo:"}{" "}
                          <strong className="font-semibold">
                            {p.sanctionMemoNo}
                          </strong>
                        </div>
                      )}
                      {p.sanctionDate && (
                        <div className="text-slate-600 dark:text-slate-400">
                          {language === "bn"
                            ? "মঞ্জুরী তারিখ:"
                            : "Sanction Date:"}{" "}
                          {formatDate(p.sanctionDate)}
                        </div>
                      )}
                    </div>
                  )}

                {/* Additional Info (Tender, work order, letter, etc.) */}
                {(p.tenderDate ||
                  p.workOrderNo ||
                  p.workOrderDate ||
                  p.letterNo ||
                  p.letterDate) && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {p.tenderDate && (
                      <div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {language === "bn" ? "দরপত্র তারিখ:" : "Tender Date:"}
                        </span>{" "}
                        {formatDate(p.tenderDate)}
                      </div>
                    )}
                    {p.workOrderNo && (
                      <div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {language === "bn" ? "কার্যাদেশ নং:" : "W.O. No:"}
                        </span>{" "}
                        {p.workOrderNo}{" "}
                        {p.workOrderDate && `(${formatDate(p.workOrderDate)})`}
                      </div>
                    )}
                    {p.letterNo && (
                      <div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {language === "bn" ? "পত্র নং:" : "Letter No:"}
                        </span>{" "}
                        {p.letterNo}{" "}
                        {p.letterDate && `(${formatDate(p.letterDate)})`}
                      </div>
                    )}
                  </div>
                )}

                {/* Amount Row */}
                {(() => {
                  const bd = getPostFactoBreakdown(p);
                  return (
                    <div className="py-2.5 border-t border-b border-slate-100 dark:border-slate-800/50 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          {language === "bn" ? "মোট মূল্য:" : "Total Amount:"}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.totalAmount || 0)}
                        </span>
                      </div>
                      {p.status === "Sanctioned" &&
                        p.sanctionedAmount &&
                        Number(p.sanctionedAmount) !== Number(p.totalAmount) && (
                          <div className="flex justify-between items-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <span>{language === "bn" ? "মঞ্জুরকৃত:" : "Sanctioned:"}</span>
                            <span>{formatCurrency(p.sanctionedAmount)}</span>
                          </div>
                        )}
                      {bd.totalPct > 0 && (
                        <div className="text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg space-y-0.5">
                          <div className="text-slate-500 dark:text-slate-400">
                            {language === "bn"
                              ? `মূল: ${formatCurrency(bd.baseAmount)} + ভ্যাট ${bd.vatRate}% (${formatCurrency(bd.vatAmount)}) + ট্যাক্স ${bd.taxRate}% (${formatCurrency(bd.taxAmount)})`
                              : `Base: ${formatCurrency(bd.baseAmount)} + VAT ${bd.vatRate}% + Tax ${bd.taxRate}%`}
                          </div>
                          <div className="font-bold text-indigo-700 dark:text-indigo-300 flex justify-between">
                            <span>
                              {language === "bn"
                                ? "ভ্যাট-ট্যাক্সসহ প্রকৃত বিল:"
                                : "Actual w/ VAT+Tax:"}
                            </span>
                            <span>{formatCurrency(bd.expectedWithVatTax)}</span>
                          </div>
                          {bd.isMissingVatTax && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              {language === "bn"
                                ? "ভ্যাট ও ট্যাক্স যোগ হয়নি!"
                                : "VAT/Tax missing!"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Note sheet and attachments */}
                {p.noteSheetId && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      {language === "bn"
                        ? "সংযুক্ত নথিপত্র:"
                        : "Generated Documents:"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleOpenDocument(p, "notesheet")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {language === "bn" ? "নোট শিট" : "Note"}
                      </button>
                      <button
                        onClick={() => handleOpenDocument(p, "forwarding")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-400 rounded-lg transition-colors border border-sky-100 dark:border-sky-900/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {language === "bn" ? "ফরোয়ার্ডিং" : "Forwarding"}
                      </button>
                      <button
                        onClick={() => handleOpenDocument(p, "supplyorder")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-lg transition-colors border border-amber-100 dark:border-amber-900/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {language === "bn" ? "কার্যাদেশ" : "Supply Order"}
                      </button>
                      {p.status === "Sanctioned" && (
                        <>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() =>
                                  handleOpenDocument(p, "sanctionnotesheet")
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-900/20"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {language === "bn"
                                  ? "মঞ্জুরীর নোট"
                                  : "Sanction Note"}
                              </button>
                              <button
                                onClick={() =>
                                  handleOpenDocument(p, "sanctionletter")
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-lg transition-colors border border-teal-100 dark:border-teal-900/20"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {language === "bn"
                                  ? "মঞ্জুরপত্র"
                                  : "Sanction Letter"}
                              </button>
                            </>
                          )}
                          {p.sanctionDocument ? (
                            <a
                              href={`${p.sanctionDocument}${p.sanctionDocument.includes("?") ? "&" : "?"}token=${encodeURIComponent(localStorage.getItem("govt_app_token") || "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              {language === "bn" ? "পিডিএফ" : "PDF"}
                            </a>
                          ) : (
                            !isAdmin && (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/20"
                                title={
                                  language === "bn"
                                    ? "মঞ্জুরকারী কর্তৃপক্ষ কর্তৃক মূল স্বাক্ষরিত পিডিএফ আপলোড প্রক্রিয়াধীন"
                                    : "Signed PDF pending upload by authority"
                                }
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-600" />
                                {language === "bn"
                                  ? "আপলোড প্রক্রিয়াধীন"
                                  : "Pending PDF"}
                              </span>
                            )
                          )}
                          {isAdmin && (
                            <label
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                                p.sanctionDocument
                                  ? "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  : "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm"
                              } ${uploadingDocProposalId === p.id ? "opacity-60 pointer-events-none" : ""}`}
                            >
                              {uploadingDocProposalId === p.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Upload className="w-3 h-3" />
                              )}
                              <span>
                                {uploadingDocProposalId === p.id
                                  ? language === "bn"
                                    ? "আপলোড হচ্ছে..."
                                    : "Uploading..."
                                  : p.sanctionDocument
                                    ? language === "bn"
                                      ? "পিডিএফ পরিবর্তন"
                                      : "Change PDF"
                                    : language === "bn"
                                      ? "মঞ্জুরপত্র আপলোড"
                                      : "Upload PDF"}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,application/pdf,image/*"
                                className="hidden"
                                disabled={uploadingDocProposalId === p.id}
                                onChange={(e) =>
                                  handleUploadSanctionDoc(p.id, e)
                                }
                              />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                  {(isAdmin || (mode === "propose" && p.status === "Pending")) && (
                    <button
                      type="button"
                      onClick={() => openEditProposalModal(p)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {language === "bn" ? "সম্পাদনা" : "Edit"}
                    </button>
                  )}
                  {mode === "propose" &&
                    (p.status === "Pending" || p.status === "Rejected") && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/10 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {language === "bn" ? "মুছুন" : "Delete"}
                      </button>
                    )}
                  {mode === "sanction" && p.status === "Pending" && isAdmin && (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => openSanctionModal(p)}
                        className="flex-1 justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {language === "bn" ? "মঞ্জুর করুন" : "Sanction"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/10 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title={language === "bn" ? "মুছে ফেলুন" : "Delete"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {isAdmin &&
                    p.status === "Sanctioned" &&
                    !p.sanctionDocument && (
                      <label
                        className={`px-3 py-1.5 rounded-xl border cursor-pointer text-xs font-semibold flex items-center gap-1 transition ${
                          uploadingDocProposalId === p.id
                            ? "opacity-50 pointer-events-none"
                            : ""
                        } bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm`}
                      >
                        {uploadingDocProposalId === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 mr-1" />
                        )}
                        <span>
                          {language === "bn"
                            ? "মঞ্জুরপত্র আপলোড"
                            : "Upload Sanction PDF"}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf,image/*"
                          className="hidden"
                          disabled={uploadingDocProposalId === p.id}
                          onChange={(e) => handleUploadSanctionDoc(p.id, e)}
                        />
                      </label>
                    )}
                  {p.sanctionDocument && (
                    <a
                      href={`${p.sanctionDocument}${p.sanctionDocument.includes("?") ? "&" : "?"}token=${encodeURIComponent(localStorage.getItem("govt_app_token") || "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/10 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      {language === "bn" ? "ডাউনলোড" : "Download"}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-3xl p-6 m-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {language === "bn" ? "প্রস্তাব ফর্ম" : "Proposal Form"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === "bn" ? "অফিস" : "Office"}
                    </label>
                    <select
                      required
                      value={formData.officeId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, officeId: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                    >
                      <option value="">
                        {language === "bn" ? "নির্বাচন করুন" : "Select"}
                      </option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "খাত" : "Category"}
                  </label>
                  <select
                    required
                    value={formData.categoryId || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  >
                    <option value="">
                      {language === "bn" ? "নির্বাচন করুন" : "Select"}
                    </option>
                    {categories.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "অনুমোদনের ধরন" : "Approval Type"}
                  </label>
                  <select
                    required
                    value={formData.sanctionType || "budget_allocation"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sanctionType: e.target.value as any,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  >
                    <option value="budget_allocation">
                      {language === "bn"
                        ? "বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন"
                        : "Post-facto approval with budget allocation"}
                    </option>
                    <option value="only_sanction">
                      {language === "bn"
                        ? "শুধুমাত্র খরচোত্তর অনুমোদন"
                        : "Only post-facto approval"}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "ভ্যাট রেট (%)" : "VAT Rate (%)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.vatRate ?? ""}
                    onChange={(e) => {
                      const newVat = Number(e.target.value) || 0;
                      const uPrice = Number(formData.unitPrice || 0);
                      const tRate = Number(formData.taxRate || 0);
                      const nextTotal =
                        uPrice > 0
                          ? Math.round(
                              uPrice +
                                (uPrice * newVat) / 100 +
                                (uPrice * tRate) / 100,
                            )
                          : Number(formData.totalAmount || 0);
                      setFormData({
                        ...formData,
                        vatRate: newVat,
                        ...(uPrice > 0 ? { totalAmount: nextTotal } : {}),
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "ট্যাক্স রেট (%)" : "Tax Rate (%)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxRate ?? ""}
                    onChange={(e) => {
                      const newTax = Number(e.target.value) || 0;
                      const uPrice = Number(formData.unitPrice || 0);
                      const vRate = Number(formData.vatRate || 0);
                      const nextTotal =
                        uPrice > 0
                          ? Math.round(
                              uPrice +
                                (uPrice * vRate) / 100 +
                                (uPrice * newTax) / 100,
                            )
                          : Number(formData.totalAmount || 0);
                      setFormData({
                        ...formData,
                        taxRate: newTax,
                        ...(uPrice > 0 ? { totalAmount: nextTotal } : {}),
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn"
                      ? "মূল / একক মূল্য (ভ্যাট ও ট্যাক্স ব্যতীত)"
                      : "Base / Unit Price (Excl. VAT & Tax)"}
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.unitPrice || ""}
                    onChange={(e) => {
                      const uPrice = Number(e.target.value) || 0;
                      const vRate = Number(formData.vatRate || 0);
                      const tRate = Number(formData.taxRate || 0);
                      const nextTotal = Math.round(
                        uPrice + (uPrice * vRate) / 100 + (uPrice * tRate) / 100,
                      );
                      setFormData({
                        ...formData,
                        unitPrice: uPrice,
                        totalAmount: nextTotal,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn"
                      ? "সর্বমোট মূল্য (ভ্যাট ও ট্যাক্সসহ)"
                      : "Total Amount (Incl. VAT & Tax)"}
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.totalAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalAmount: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800 font-bold"
                  />
                  {(() => {
                    const bd = getPostFactoBreakdown(formData);
                    if (!bd.isMissingVatTax) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedTotal = bd.expectedWithVatTax;
                          const nextBidders = bd.biddersAlreadyHaveVat
                            ? formData.bidders || []
                            : (formData.bidders || []).map((b) => ({
                                ...b,
                                price:
                                  Number(b.price || 0) > 0
                                    ? Math.round(
                                        Number(b.price) *
                                          (1 + bd.totalPct / 100),
                                      )
                                    : 0,
                              }));
                          setFormData({
                            ...formData,
                            totalAmount: updatedTotal,
                            ...(formData.status === "Sanctioned"
                              ? { sanctionedAmount: updatedTotal }
                              : {}),
                            bidders: nextBidders,
                          });
                        }}
                        className="mt-1.5 text-[11px] font-bold text-amber-700 hover:text-amber-900 dark:text-amber-300 underline cursor-pointer block"
                      >
                        {language === "bn"
                          ? `ভ্যাট-ট্যাক্সসহ প্রকৃত বিল ${formatCurrency(bd.expectedWithVatTax)} বসান`
                          : `Set actual bill ${formatCurrency(bd.expectedWithVatTax)} (with VAT+Tax)`}
                      </button>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "ব্যবস্থাপকের নাম" : "Manager Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.managerName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, managerName: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Live VAT & Tax Calculation Box */}
              {(() => {
                const bd = getPostFactoBreakdown(formData);
                if (bd.baseAmount <= 0 && bd.totalAmount <= 0) return null;
                return (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      bd.isMissingVatTax
                        ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
                        : "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-emerald-600" />
                        <span>
                          {language === "bn"
                            ? "ভ্যাট ও ট্যাক্সসহ প্রকৃত বিল হিসাব (Auto Calculation)"
                            : "Actual Bill Calculation (with VAT & Tax)"}
                        </span>
                      </div>
                      {bd.isMissingVatTax && (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTotal = bd.expectedWithVatTax;
                            const nextBidders = bd.biddersAlreadyHaveVat
                              ? formData.bidders || []
                              : (formData.bidders || []).map((b) => ({
                                  ...b,
                                  price:
                                    Number(b.price || 0) > 0
                                      ? Math.round(
                                          Number(b.price) *
                                            (1 + bd.totalPct / 100),
                                        )
                                      : 0,
                                }));
                            setFormData({
                              ...formData,
                              totalAmount: updatedTotal,
                              ...(formData.status === "Sanctioned"
                                ? { sanctionedAmount: updatedTotal }
                                : {}),
                              bidders: nextBidders,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs cursor-pointer"
                        >
                          {bd.biddersAlreadyHaveVat
                            ? language === "bn"
                              ? `সর্বমোট মূল্যে ভ্যাট-ট্যাক্স (${bd.totalPct}%) যোগ করুন`
                              : `Apply VAT+Tax (${bd.totalPct}%) to Total`
                            : language === "bn"
                              ? `মোট মূল্য ও দরদাতাতে ভ্যাট-ট্যাক্স (${bd.totalPct}%) যোগ করুন`
                              : `Apply VAT+Tax (${bd.totalPct}%) to Total & Bidders`}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block">
                          {language === "bn" ? "মূল মূল্য" : "Base Price"}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(bd.baseAmount)}
                        </span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block">
                          {language === "bn"
                            ? `ভ্যাট (${bd.vatRate}%)`
                            : `VAT (${bd.vatRate}%)`}
                        </span>
                        <span className="font-bold text-blue-700 dark:text-blue-400">
                          + {formatCurrency(bd.vatAmount)}
                        </span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 block">
                          {language === "bn"
                            ? `ট্যাক্স (${bd.taxRate}%)`
                            : `Tax (${bd.taxRate}%)`}
                        </span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">
                          + {formatCurrency(bd.taxAmount)}
                        </span>
                      </div>
                      <div className="bg-emerald-100/80 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-300 dark:border-emerald-700">
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block font-semibold">
                          {language === "bn"
                            ? "প্রকৃত বিল (ভ্যাট-ট্যাক্সসহ)"
                            : "Actual Total"}
                        </span>
                        <span className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                          {formatCurrency(bd.expectedWithVatTax)}
                        </span>
                      </div>
                    </div>
                    {bd.isMissingVatTax && (
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        {language === "bn"
                          ? `⚠️ সতর্কতা: বর্তমানে মোট মূল্য ${formatCurrency(bd.totalAmount)} রয়েছে, যাতে ভ্যাট ও ট্যাক্স যোগ হয়নি। প্রকৃত বিল হবে ${formatCurrency(bd.expectedWithVatTax)}।`
                          : `⚠️ Current total (${formatCurrency(bd.totalAmount)}) excludes VAT & Tax. Expected total is ${formatCurrency(bd.expectedWithVatTax)}.`}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Admin-only Editable Sanction Details when editing a Sanctioned proposal */}
              {isAdmin && formData.id && formData.status === "Sanctioned" && (
                <div className="border-2 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {language === "bn"
                          ? "মঞ্জুরী সংক্রান্ত তথ্য (মঞ্জুর পরবর্তী সংশোধন)"
                          : "Sanction Details (Post-Sanction Edit)"}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          sanctionedAmount: Number(formData.totalAmount || 0),
                        })
                      }
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      {language === "bn"
                        ? "মঞ্জুরকৃত টাকা = মোট মূল্য"
                        : "Sync Sanctioned = Total"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        {language === "bn" ? "মঞ্জুরীর স্মারক নং" : "Sanction Memo No"}
                      </label>
                      <input
                        type="text"
                        value={formData.sanctionMemoNo || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sanctionMemoNo: e.target.value,
                          })
                        }
                        className="w-full p-2 rounded-xl border dark:bg-slate-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        {language === "bn" ? "মঞ্জুরীর তারিখ" : "Sanction Date"}
                      </label>
                      <input
                        type="date"
                        value={formData.sanctionDate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sanctionDate: e.target.value,
                          })
                        }
                        className="w-full p-2 rounded-xl border dark:bg-slate-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        {language === "bn" ? "মঞ্জুরকৃত পরিমাণ (টাকা)" : "Sanctioned Amount"}
                      </label>
                      <input
                        type="number"
                        value={formData.sanctionedAmount ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sanctionedAmount: Number(e.target.value),
                          })
                        }
                        className="w-full p-2 rounded-xl border dark:bg-slate-800 text-sm font-bold"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium mb-1">
                        {language === "bn" ? "মঞ্জুরীর মন্তব্য" : "Sanction Remarks"}
                      </label>
                      <input
                        type="text"
                        value={formData.sanctionRemarks || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sanctionRemarks: e.target.value,
                          })
                        }
                        className="w-full p-2 rounded-xl border dark:bg-slate-800 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border p-4 rounded-xl dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "দরপত্র তারিখ" : "Tender Date"}
                  </label>
                  <input
                    type="date"
                    value={formData.tenderDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, tenderDate: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "কার্যাদেশ নং" : "Work Order No."}
                  </label>
                  <input
                    type="text"
                    value={formData.workOrderNo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, workOrderNo: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                    placeholder={
                      language === "bn" ? "যেমন: WO-102" : "e.g. WO-102"
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "কার্যাদেশ তারিখ" : "Work Order Date"}
                  </label>
                  <input
                    type="date"
                    value={formData.workOrderDate || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workOrderDate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "পত্র নং" : "Letter No."}
                  </label>
                  <input
                    type="text"
                    value={formData.letterNo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, letterNo: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                    placeholder={
                      language === "bn" ? "যেমন: P-205" : "e.g. P-205"
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === "bn" ? "পত্রের তারিখ" : "Letter Date"}
                  </label>
                  <input
                    type="date"
                    value={formData.letterDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, letterDate: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn"
                    ? "বিবরণ (কী কেনা/মেরামত হয়েছে)"
                    : "Description (what was bought/repaired)"}
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-medium">
                    {language === "bn"
                      ? "৩টি দরদাতা প্রতিষ্ঠানের তথ্য (দর ভ্যাট ও ট্যাক্সসহ)"
                      : "3 Bidder Organizations Info (Incl. VAT & Tax)"}
                  </label>
                  {(() => {
                    const bd = getPostFactoBreakdown(formData);
                    if (bd.totalPct <= 0) return null;
                    if (bd.biddersAlreadyHaveVat) {
                      return (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          {language === "bn"
                            ? "✓ দরদাতাদের মূল্যে ভ্যাট-ট্যাক্স যুক্ত আছে"
                            : "✓ Bidders include VAT & Tax"}
                        </span>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedBidders = (formData.bidders || []).map(
                            (b) => ({
                              ...b,
                              price:
                                Number(b.price || 0) > 0
                                  ? Math.round(
                                      Number(b.price) * (1 + bd.totalPct / 100),
                                    )
                                  : 0,
                            }),
                          );
                          setFormData({
                            ...formData,
                            bidders: updatedBidders,
                            ...(bd.isMissingVatTax
                              ? {
                                  totalAmount: bd.expectedWithVatTax,
                                  ...(formData.status === "Sanctioned"
                                    ? { sanctionedAmount: bd.expectedWithVatTax }
                                    : {}),
                                }
                              : {}),
                          });
                        }}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 cursor-pointer"
                      >
                        {language === "bn"
                          ? `+ দরদাতা ও মোট মূল্যে ${bd.totalPct}% ভ্যাট-ট্যাক্স যোগ করুন`
                          : `+ Add ${bd.totalPct}% VAT+Tax to Bidders & Total`}
                      </button>
                    );
                  })()}
                </div>
                <div className="space-y-4">
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-3 gap-2 border p-3 rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    >
                      <input
                        placeholder={language === "bn" ? "নাম" : "Name"}
                        required
                        value={formData.bidders?.[idx]?.name || ""}
                        onChange={(e) => {
                          const newBidders = [...(formData.bidders || [])];
                          if (!newBidders[idx])
                            newBidders[idx] = {
                              name: "",
                              address: "",
                              price: 0,
                            };
                          newBidders[idx].name = e.target.value;
                          setFormData({ ...formData, bidders: newBidders });
                        }}
                        className="w-full p-2 rounded-lg border dark:bg-slate-900 text-sm"
                      />
                      <input
                        placeholder={language === "bn" ? "ঠিকানা" : "Address"}
                        required
                        value={formData.bidders?.[idx]?.address || ""}
                        onChange={(e) => {
                          const newBidders = [...(formData.bidders || [])];
                          if (!newBidders[idx])
                            newBidders[idx] = {
                              name: "",
                              address: "",
                              price: 0,
                            };
                          newBidders[idx].address = e.target.value;
                          setFormData({ ...formData, bidders: newBidders });
                        }}
                        className="w-full p-2 rounded-lg border dark:bg-slate-900 text-sm"
                      />
                      <input
                        placeholder={language === "bn" ? "মূল্য" : "Price"}
                        type="number"
                        required
                        value={formData.bidders?.[idx]?.price || ""}
                        onChange={(e) => {
                          const newBidders = [...(formData.bidders || [])];
                          if (!newBidders[idx])
                            newBidders[idx] = {
                              name: "",
                              address: "",
                              price: 0,
                            };
                          newBidders[idx].price = Number(e.target.value);
                          setFormData({ ...formData, bidders: newBidders });
                        }}
                        className="w-full p-2 rounded-lg border dark:bg-slate-900 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-medium hover:bg-slate-100 rounded-xl"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  ) : null}
                  {language === "bn"
                    ? isSubmitting
                      ? "সংরক্ষণ হচ্ছে..."
                      : "সংরক্ষণ করুন"
                    : isSubmitting
                      ? "Saving..."
                      : "Save Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSanctionModal && selectedProposal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-xl p-6 m-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {language === "bn" ? "মঞ্জুরি প্রদান ও বিল যাচাই" : "Verify Bill & Provide Sanction"}
              </h3>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedProposal;
                      setShowSanctionModal(false);
                      openEditProposalModal(target);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "প্রস্তাব এডিট করুন" : "Edit Proposal"}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSanctionModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pre-sanction VAT & Tax Breakdown Verification Card */}
            {(() => {
              const bd = getPostFactoBreakdown(selectedProposal);
              const offName =
                offices.find((o) => o.id === selectedProposal.officeId)?.name ||
                selectedProposal.officeId;
              const catName =
                categories.find((c) => c.id === selectedProposal.categoryId)
                  ?.name || selectedProposal.categoryId;
              return (
                <div
                  className={`mb-5 p-4 rounded-2xl border text-xs space-y-2.5 ${
                    bd.isMissingVatTax
                      ? "bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700 pb-2">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 block">
                        {offName} • {catName}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {selectedProposal.description}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">
                        {language === "bn" ? "মূল মূল্য" : "Base Amount"}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {formatCurrency(bd.baseAmount)}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">
                        {language === "bn"
                          ? `ভ্যাট (${bd.vatRate}%)`
                          : `VAT (${bd.vatRate}%)`}
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        + {formatCurrency(bd.vatAmount)}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">
                        {language === "bn"
                          ? `ট্যাক্স (${bd.taxRate}%)`
                          : `Tax (${bd.taxRate}%)`}
                      </span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400">
                        + {formatCurrency(bd.taxAmount)}
                      </span>
                    </div>
                    <div className="bg-emerald-100 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-300 dark:border-emerald-700">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">
                        {language === "bn"
                          ? "প্রকৃত বিল (ভ্যাট-ট্যাক্সসহ)"
                          : "Actual w/ VAT+Tax"}
                      </span>
                      <span className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                        {formatCurrency(bd.expectedWithVatTax)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300">
                      {language === "bn"
                        ? `শাখা কর্তৃক ইনপুটকৃত মোট মূল্য: ${formatCurrency(bd.totalAmount)}`
                        : `Branch entered total: ${formatCurrency(bd.totalAmount)}`}
                    </span>
                    {bd.isMissingVatTax && (
                      <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {language === "bn"
                          ? "ভ্যাট ও ট্যাক্স মূল্যের সাথে যোগ হয়নি!"
                          : "VAT & Tax were not added to total!"}
                      </span>
                    )}
                  </div>
                  {bd.isMissingVatTax && (
                    <label className="flex items-start gap-2 pt-1.5 border-t border-amber-300/60 dark:border-amber-700/60 cursor-pointer text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                      <input
                        type="checkbox"
                        checked={syncVatTaxOnSanction}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSyncVatTaxOnSanction(checked);
                          setSanctionData({
                            ...sanctionData,
                            sanctionedAmount: checked
                              ? bd.expectedWithVatTax
                              : selectedProposal.totalAmount,
                          });
                        }}
                        className="mt-0.5 rounded"
                      />
                      <span>
                        {language === "bn"
                          ? `মঞ্জুর করার সময় প্রস্তাবের মোট মূল্য (${formatCurrency(bd.expectedWithVatTax)}) ও দরদাতাদের দরের সাথে ভ্যাট-ট্যাক্স স্বয়ংক্রিয়ভাবে যোগ করে আপডেট করুন`
                          : `Automatically update proposal total (${formatCurrency(bd.expectedWithVatTax)}) and bidder prices with VAT & Tax on sanction`}
                      </span>
                    </label>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleSanctionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn" ? "অনুমোদনের ধরন" : "Sanction Type"}
                </label>
                <select
                  required
                  value={sanctionData.sanctionType || "budget_allocation"}
                  onChange={(e) =>
                    setSanctionData({
                      ...sanctionData,
                      sanctionType: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                >
                  <option value="budget_allocation">
                    {language === "bn"
                      ? "বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন"
                      : "Post-facto approval with budget allocation"}
                  </option>
                  <option value="only_sanction">
                    {language === "bn"
                      ? "খরচোত্তর অনুমোদন"
                      : "Post-facto approval"}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn"
                    ? "স্মারক নং (সূত্র)"
                    : "Memo No (Reference)"}
                </label>
                <input
                  type="text"
                  required
                  value={sanctionData.sanctionMemoNo || ""}
                  onChange={(e) =>
                    setSanctionData({
                      ...sanctionData,
                      sanctionMemoNo: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  placeholder={
                    language === "bn"
                      ? "যেমন: প্রশ-১(১৪)/২০২৫-২০২৬/"
                      : "e.g. Prash-1(14)/2025-2026/"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn" ? "শাখার পত্র নং" : "Branch Letter No"}
                </label>
                <input
                  type="text"
                  required
                  value={sanctionData.letterNo || ""}
                  onChange={(e) =>
                    setSanctionData({
                      ...sanctionData,
                      letterNo: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                  placeholder={
                    language === "bn"
                      ? "যেমন: প্রশা-০২/২০২৫-২০২৬/৯৭"
                      : "e.g. Prash-02..."
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn"
                    ? "শাখার পত্রের তারিখ"
                    : "Branch Letter Date"}
                </label>
                <input
                  type="date"
                  required
                  value={sanctionData.letterDate || ""}
                  onChange={(e) =>
                    setSanctionData({
                      ...sanctionData,
                      letterDate: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn" ? "মঞ্জুরী তারিখ" : "Sanction Date"}
                </label>
                <input
                  type="date"
                  required
                  value={sanctionData.sanctionDate || ""}
                  onChange={(e) =>
                    setSanctionData({
                      ...sanctionData,
                      sanctionDate: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn" ? "মঞ্জুরকৃত পরিমাণ" : "Sanctioned Amount"}
                </label>
                <input
                  type="number"
                  required
                  value={sanctionData.sanctionedAmount || ""}
                  onChange={(e) =>
                    setSanctionData({
                      ...sanctionData,
                      sanctionedAmount: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn" ? "ফাইল আপলোড" : "Upload File"}
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileChange(e, true)}
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                />
                {sanctionData.sanctionDocument && (
                  <p className="text-xs text-emerald-600 mt-1">
                    {language === "bn"
                      ? "ফাইল আপলোড হয়েছে"
                      : "File uploaded successfully"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === "bn" ? "মন্তব্য" : "Remarks"}
                </label>
                <textarea
                  rows={2}
                  value={sanctionData.sanctionRemarks || ""}
                  onChange={(e) =>
                    setSanctionData({
                      ...sanctionData,
                      sanctionRemarks: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSanctionModal(false)}
                  className="px-4 py-2 font-medium hover:bg-slate-100 rounded-xl"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSanctioning}
                  className={`px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center ${isSanctioning ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isSanctioning ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  ) : null}
                  {language === "bn"
                    ? isSanctioning
                      ? "অপেক্ষা করুন..."
                      : "মঞ্জুর করুন"
                    : isSanctioning
                      ? "Sanctioning..."
                      : "Sanction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Sheet Preview Modal for Post-Facto Proposals */}
      {previewNoteSheet && (
        <NoteSheetPreviewModal
          key={`${previewNoteSheet.id}-${previewInitialTab}`}
          noteSheet={previewNoteSheet}
          categories={categories}
          systemSettings={systemSettings}
          officeName={
            offices.find((o) => o.id === previewNoteSheet.officeId)?.name
          }
          categoryId={previewNoteSheet.categoryId}
          categoryName={
            categories.find((c) => c.id === previewNoteSheet.categoryId)?.name
          }
          onClose={() => setPreviewNoteSheet(null)}
          onUpdateNoteSheet={() => {
            fetchProposals();
          }}
          currentUser={currentUser}
          initialTab={previewInitialTab}
        />
      )}
      {/* Delete Confirmation Modal */}
      {deletingProposalId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex overflow-y-auto p-4 sm:p-6">
          <div className="m-auto rounded-2xl max-w-sm w-full p-6 shadow-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
              <span>{language === "bn" ? "নিশ্চিত করুন" : "Confirm Delete"}</span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              {language === "bn"
                ? "আপনি কি নিশ্চিত যে এই খরচোত্তর প্রস্তাব ও এর সংযুক্ত নথিপত্র মুছে ফেলতে চান? এটি আর ফেরত পাওয়া যাবে না।"
                : "Are you sure you want to delete this post-facto proposal and its linked documents? This action cannot be undone."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingProposalId(null)}
                className="px-4 py-2 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteProposal}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl font-semibold shadow text-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isDeleting
                    ? language === "bn"
                      ? "মুছে ফেলা হচ্ছে..."
                      : "Deleting..."
                    : language === "bn"
                      ? "মুছে ফেলুন"
                      : "Delete"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 border ${
            toastMsg.type === "error"
              ? "bg-rose-950 border-rose-700 text-rose-100"
              : "bg-slate-900 border-slate-700 text-white"
          }`}
        >
          {toastMsg.type === "error" ? (
            <X className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <p className="text-sm font-medium">{toastMsg.text}</p>
        </div>
      )}
    </div>
  );
}
