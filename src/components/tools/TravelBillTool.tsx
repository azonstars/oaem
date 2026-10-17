import React, { useState, useEffect } from "react";
import { User, SystemSettings, Office, FinancialYear, isStaffOrAdmin } from "../../types";
import { apiFetch } from "../../api";
import {
  Save,
  FolderOpen,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Plus,
  Edit2,
  Printer,
  Calculator,
  Briefcase,
  FileText,
  Send,
  Eye,
  FileCheck,
  Search,
  FileDown,
} from "lucide-react";

interface TravelBillToolProps {
  currentUser: User;
  systemSettings: SystemSettings | null;
  offices?: Office[];
  financialYears?: FinancialYear[];
  selectedFY?: string;
  onBack?: () => void;
}

const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (s: string | number) => String(s).replace(/[0-9]/g, (d) => BN[+d]);

// Number to Bengali words converter for TTA Bill
function numberToBengaliWords(num: number): string {
  if (!num || isNaN(num)) return "শূন্য";
  let n = Math.round(num);
  if (n === 0) return "শূন্য";

  const ones = ["", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ", "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোল", "সতেরো", "আঠারো", "উনিশ"];
  const tens = ["", "দশ", "বিশ", "ত্রিশ", "চল্লিশ", "পঞ্চাশ", "ষাট", "সত্তর", "আশি", "নব্বই"];

  function convertGroup(val: number): string {
    if (val === 0) return "";
    if (val < 20) return ones[val];
    if (val < 100) {
      const t = Math.floor(val / 10);
      const o = val % 10;
      return tens[t] + (o ? " " + ones[o] : "");
    }
    const h = Math.floor(val / 100);
    const rem = val % 100;
    return ones[h] + " শত" + (rem ? " " + convertGroup(rem) : "");
  }

  let result = "";
  if (n >= 10000000) {
    const crore = Math.floor(n / 10000000);
    result += convertGroup(crore) + " কোটি ";
    n %= 10000000;
  }
  if (n >= 100000) {
    const lakh = Math.floor(n / 100000);
    result += convertGroup(lakh) + " লাখ ";
    n %= 100000;
  }
  if (n >= 1000) {
    const thousand = Math.floor(n / 1000);
    result += convertGroup(thousand) + " হাজার ";
    n %= 1000;
  }
  if (n > 0) {
    result += convertGroup(n);
  }
  return result.trim() + " টাকা মাত্র";
}

interface JourneyItem {
  id: string;
  // Outbound trip
  depPlace: string;
  depDate: string;
  depTime: string;
  arrPlace: string;
  arrDate: string;
  arrTime: string;
  // Return trip
  returnDepPlace: string;
  returnDepDate: string;
  returnDepTime: string;
  returnArrPlace: string;
  returnArrDate: string;
  returnArrTime: string;
  // Stay at destination (multi-day stay)
  stayStartDate: string;
  stayEndDate: string;
  stayDescription: string;
  // Transport & Fare
  transportMode: string;
  fareClass: string;
  fareRateCount: string;
  fareAmount: number;
  // Distance (Outbound & Return separate)
  roadDistOrdinary: number;
  roadDistHilly: number;
  returnRoadDistOrdinary: number;
  returnRoadDistHilly: number;
  roadDistRate: number;
  // Daily Allowance (Outbound & Return separate unmerged)
  daOrdinaryCount: number;
  daCostlyCount: number;
  daHillyCount: number;
  returnDaOrdinaryCount: number;
  returnDaCostlyCount: number;
  returnDaHillyCount: number;
  daRate: number;
  // Other
  otherCharges: number;
  purpose: string;
  remarks: string;
}

export function TravelBillTool({
  currentUser,
  systemSettings: _systemSettings,
  offices: _offices,
  financialYears: _financialYears,
  selectedFY,
  onBack,
}: TravelBillToolProps) {
  // Header info states (Empty by default)
  const [name, setName] = useState(currentUser?.name || "");
  const [designation, setDesignation] = useState(currentUser?.designation || "");
  const [basicSalary, setBasicSalary] = useState("");
  const [district, setDistrict] = useState("");
  const [monthName, setMonthName] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingsAccountNo, setSavingsAccountNo] = useState("");

  // Advance info
  const [advanceDate, setAdvanceDate] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);

  // Journey list empty by default
  const [journeys, setJourneys] = useState<JourneyItem[]>([]);

  // Current editing / creating item form state
  const [formData, setFormData] = useState<Omit<JourneyItem, "id">>({
    depPlace: "কর্মস্থল",
    depDate: "০৮.০৯.২৬",
    depTime: "সং: ৮-৩০",
    arrPlace: "",
    arrDate: "০৮.০৯.২৬",
    arrTime: "",
    returnDepPlace: "",
    returnDepDate: "০৮.০৯.২৬",
    returnDepTime: "",
    returnArrPlace: "কর্মস্থল",
    returnArrDate: "০৮.০৯.২৬",
    returnArrTime: "",
    stayStartDate: "",
    stayEndDate: "",
    stayDescription: "",
    transportMode: "অফিস গাড়ি",
    fareClass: "",
    fareRateCount: "",
    fareAmount: 0,
    roadDistOrdinary: 0,
    roadDistHilly: 0,
    returnRoadDistOrdinary: 0,
    returnRoadDistHilly: 0,
    roadDistRate: 5,
    daOrdinaryCount: 0,
    daCostlyCount: 0,
    daHillyCount: 1,
    returnDaOrdinaryCount: 0,
    returnDaCostlyCount: 0,
    returnDaHillyCount: 0,
    daRate: 750,
    otherCharges: 0,
    purpose: "",
    remarks: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [dbSuccessMsg, setDbSuccessMsg] = useState("");
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview" | "archive">("form");
  const [isBillSubmitted, setIsBillSubmitted] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState("");
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load saved docs from SQLite database with office/branch isolation
  const loadSavedDocs = async () => {
    try {
      const res = await apiFetch("/api/tooldocuments");
      if (res.ok) {
        const allDocs = await res.json();
        if (Array.isArray(allDocs)) {
          const isHeadOffice = isStaffOrAdmin(currentUser?.role);
          const travelDocs = allDocs.filter((d: any) => {
            const isTravel =
              d.toolId === "travel-bill" ||
              d.toolType === "travel_bill" ||
              d.toolType === "travel-bill" ||
              (d.title && typeof d.title === "string" && d.title.includes("ভ্রমণ বিল"));
            if (!isTravel) return false;

            if (isHeadOffice) return true;
            return d.officeId && currentUser?.officeId && d.officeId === currentUser.officeId;
          });
          setSavedDocs(travelDocs);
        }
      }
    } catch (e) {
      console.warn("Load saved travel bills error:", e);
    }
  };

  useEffect(() => {
    loadSavedDocs();
  }, []);

  const handleSaveJourneyForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setJourneys(journeys.map((j) => (j.id === editingId ? { ...formData, id: editingId } : j)));
      setEditingId(null);
    } else {
      const newItem: JourneyItem = {
        ...formData,
        id: `j-${Date.now()}`,
      };
      setJourneys([...journeys, newItem]);
    }
    // Reset form defaults
    setFormData({
      depPlace: "কর্মস্থল",
      depDate: new Date().toLocaleDateString("bn-BD"),
      depTime: "",
      arrPlace: "",
      arrDate: new Date().toLocaleDateString("bn-BD"),
      arrTime: "",
      returnDepPlace: "",
      returnDepDate: new Date().toLocaleDateString("bn-BD"),
      returnDepTime: "",
      returnArrPlace: "কর্মস্থল",
      returnArrDate: new Date().toLocaleDateString("bn-BD"),
      returnArrTime: "",
      stayStartDate: "",
      stayEndDate: "",
      stayDescription: "",
      transportMode: "বাস/অফিস গাড়ি",
      fareClass: "",
      fareRateCount: "",
      fareAmount: 0,
      roadDistOrdinary: 0,
      roadDistHilly: 0,
      returnRoadDistOrdinary: 0,
      returnRoadDistHilly: 0,
      roadDistRate: 5,
      daOrdinaryCount: 0,
      daCostlyCount: 0,
      daHillyCount: 0,
      returnDaOrdinaryCount: 0,
      returnDaCostlyCount: 0,
      returnDaHillyCount: 0,
      daRate: 750,
      otherCharges: 0,
      purpose: "",
      remarks: "",
    });
  };

  const handleEditJourney = (item: JourneyItem) => {
    setEditingId(item.id);
    setFormData({
      depPlace: item.depPlace,
      depDate: item.depDate,
      depTime: item.depTime,
      arrPlace: item.arrPlace,
      arrDate: item.arrDate,
      arrTime: item.arrTime,
      returnDepPlace: item.returnDepPlace,
      returnDepDate: item.returnDepDate,
      returnDepTime: item.returnDepTime,
      returnArrPlace: item.returnArrPlace,
      returnArrDate: item.returnArrDate,
      returnArrTime: item.returnArrTime,
      stayStartDate: item.stayStartDate || "",
      stayEndDate: item.stayEndDate || "",
      stayDescription: item.stayDescription || "",
      transportMode: item.transportMode,
      fareClass: item.fareClass,
      fareRateCount: item.fareRateCount,
      fareAmount: item.fareAmount,
      roadDistOrdinary: item.roadDistOrdinary,
      roadDistHilly: item.roadDistHilly,
      returnRoadDistOrdinary: item.returnRoadDistOrdinary || 0,
      returnRoadDistHilly: item.returnRoadDistHilly || 0,
      roadDistRate: item.roadDistRate,
      daOrdinaryCount: item.daOrdinaryCount,
      daCostlyCount: item.daCostlyCount,
      daHillyCount: item.daHillyCount,
      returnDaOrdinaryCount: item.returnDaOrdinaryCount || 0,
      returnDaCostlyCount: item.returnDaCostlyCount || 0,
      returnDaHillyCount: item.returnDaHillyCount || 0,
      daRate: item.daRate,
      otherCharges: item.otherCharges,
      purpose: item.purpose,
      remarks: item.remarks,
    });
  };

  const handleDeleteJourney = (id: string) => {
    setJourneys(journeys.filter((j) => j.id !== id));
  };

  // Calculations for Page 2 Summary
  const totalFare = journeys.reduce((sum, j) => sum + Number(j.fareAmount || 0), 0);
  const totalRoadOrdinaryDist = journeys.reduce((sum, j) => sum + Number(j.roadDistOrdinary || 0) + Number(j.returnRoadDistOrdinary || 0), 0);
  const totalRoadHillyDist = journeys.reduce((sum, j) => sum + Number(j.roadDistHilly || 0) + Number(j.returnRoadDistHilly || 0), 0);
  
  const roadRate = journeys.length > 0 && journeys[0].roadDistRate ? journeys[0].roadDistRate : 5.00;
  const totalRoadFare = (totalRoadOrdinaryDist + totalRoadHillyDist) * roadRate;

  const totalDaOrdinary = journeys.reduce((sum, j) => sum + Number(j.daOrdinaryCount || 0) + Number(j.returnDaOrdinaryCount || 0), 0);
  const totalDaCostly = journeys.reduce((sum, j) => sum + Number(j.daCostlyCount || 0) + Number(j.returnDaCostlyCount || 0), 0);
  const totalDaHilly = journeys.reduce((sum, j) => sum + Number(j.daHillyCount || 0) + Number(j.returnDaHillyCount || 0), 0);
  const daRateVal = journeys.length > 0 && journeys[0].daRate ? journeys[0].daRate : 750;

  const totalDaAmount = journeys.reduce((sum, j) => {
    const rate = Number(j.daRate || 750);
    const count = Number(j.daOrdinaryCount || 0) + Number(j.daCostlyCount || 0) + Number(j.daHillyCount || 0) + Number(j.returnDaOrdinaryCount || 0) + Number(j.returnDaCostlyCount || 0) + Number(j.returnDaHillyCount || 0);
    return sum + (count * rate);
  }, 0);

  const totalOtherCharges = journeys.reduce((sum, j) => sum + Number(j.otherCharges || 0), 0);
  
  const grandTotalGross = totalFare + totalRoadFare + totalDaAmount + totalOtherCharges;
  const netPayable = Math.max(0, grandTotalGross - Number(advanceAmount || 0));
  const netPayableWords = numberToBengaliWords(netPayable);

  // Auto-Save or Draft-Save to database
  const handleSaveToDatabase = async (isDraft: boolean = false) => {
    setIsSavingDb(true);
    try {
      const payload = {
        toolId: "travel-bill",
        toolType: "travel_bill",
        title: `ভ্রমণ বিল - ${name || "কর্মকর্তা"} (${monthName || "মাস উল্লেখ নেই"})`,
        monthName: monthName || "",
        officerName: name || "",
        designation: designation || "",
        totalAmount: grandTotalGross,
        netPayable: netPayable,
        journeyCount: journeys.length,
        financialYearId: selectedFY || "fy-3",
        officeId: currentUser?.officeId || "off-ho",
        content: JSON.stringify({
          header: {
            name,
            designation,
            basicSalary,
            district,
            monthName,
            voucherNo,
            docDate,
            savingsAccountNo,
            advanceDate,
            advanceAmount,
          },
          journeys,
          grandTotalGross,
          netPayable,
          totalFare,
          totalRoadFare,
          totalDaAmount,
          totalOtherCharges,
        }),
      };

      if (currentDocId) {
        await apiFetch(`/api/tooldocuments/${currentDocId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await apiFetch("/api/tooldocuments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          if (created?.id) {
            setCurrentDocId(created.id);
          }
        }
      }

      await loadSavedDocs();
      if (isDraft) {
        setDbSuccessMsg("খসড়া হিসেবে ভ্রমণ বিল ডাটাবেজে সংরক্ষিত হয়েছে!");
        setTimeout(() => setDbSuccessMsg(""), 3500);
      }
    } catch (e) {
      console.warn("Save travel bill error:", e);
      alert("ডাটাবেজে সংরক্ষণে ত্রুটি হয়েছে।");
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleLoadDoc = (
    doc: any,
    targetTab: "preview" | "form" = "preview",
    triggerPrint: boolean = false
  ) => {
    try {
      const data = typeof doc.content === "string" ? JSON.parse(doc.content) : doc.content;
      if (data?.header) {
        setName(data.header.name || "");
        setDesignation(data.header.designation || "");
        setBasicSalary(data.header.basicSalary || "");
        setDistrict(data.header.district || "");
        setMonthName(data.header.monthName || "");
        setVoucherNo(data.header.voucherNo || "");
        setDocDate(data.header.docDate || "");
        setSavingsAccountNo(data.header.savingsAccountNo || "");
        setAdvanceDate(data.header.advanceDate || "");
        setAdvanceAmount(Number(data.header.advanceAmount || 0));
      }
      if (Array.isArray(data?.journeys)) {
        setJourneys(data.journeys);
      }
      setCurrentDocId(doc.id);
      setIsBillSubmitted(true);
      setShowPreviewModal(false);
      setActiveTab(targetTab);

      if (triggerPrint) {
        setTimeout(() => {
          handlePrintBill();
        }, 300);
      } else if (targetTab === "preview") {
        setTimeout(() => {
          const el = document.getElementById("printable-tta-bill");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 200);
      }
    } catch (e) {
      console.warn("Load doc parse error:", e);
      alert("বিলটি লোড করতে ত্রুটি হয়েছে।");
    }
  };

  const handleStartNewBill = () => {
    if (journeys.length > 0 && !confirm("নতুন ভ্রমণ বিল শুরু করতে চান? বর্তমান অসংরক্ষিত কোনো পরিবর্তন থাকলে তা মুছে যেতে পারে।")) {
      return;
    }
    setCurrentDocId(null);
    setIsBillSubmitted(false);
    setJourneys([]);
    setVoucherNo("");
    setMonthName("");
    setAdvanceAmount(0);
    setAdvanceDate("");
    setActiveTab("form");
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("আপনি কি নিশ্চিত এই সংরক্ষিত ভ্রমণ বিলটি মুছে ফেলতে চান?")) return;
    try {
      await apiFetch(`/api/tooldocuments/${id}`, { method: "DELETE" });
      setDbSuccessMsg("সংরক্ষিত ভ্রমণ বিলটি সফলভাবে মুছে ফেলা হয়েছে!");
      if (currentDocId === id) {
        setCurrentDocId(null);
      }
      loadSavedDocs();
      setTimeout(() => setDbSuccessMsg(""), 3000);
    } catch (e) {
      console.warn("Delete doc error:", e);
      alert("বিলটি মুছতে ত্রুটি হয়েছে।");
    }
  };

  // Submit Full Month Bill & Auto-Save to Database
  const handleSubmitFullMonthBill = async () => {
    if (journeys.length === 0) {
      alert("অনুগ্রহ করে অন্তত একটি দিনের ভ্রমণ তথ্য এন্ট্রি করুন।");
      return;
    }
    // Auto-save to database immediately with the submission
    await handleSaveToDatabase(false);
    setIsBillSubmitted(true);
    setActiveTab("preview");
    setSubmitSuccessMsg(
      `✓ ${monthName || ""} মাসের ভ্রমণ বিলটি ডাটাবেজে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়েছে এবং চূড়ান্ত এসআইএফ-৬৬ বিল প্রস্তুত হয়েছে! পরবর্তীতে যেকোনো সময় 'সংরক্ষিত বিলসমূহ' থেকে এই বিলটি চেক ও রি-প্রিন্ট করতে পারবেন।`
    );
    setTimeout(() => {
      setSubmitSuccessMsg("");
    }, 8000);
    setTimeout(() => {
      const el = document.getElementById("printable-tta-bill");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  // Comprehensive, bulletproof print function for Travel Bill Form SIF-66 (Legal Paper, Portrait or Landscape)
  const handlePrintBill = (orientationInput?: "portrait" | "landscape" | any) => {
    const orientation = typeof orientationInput === "string" ? orientationInput : "portrait";
    setActiveTab("preview");

    setTimeout(() => {
      const billElem = document.getElementById("printable-tta-bill");
      if (!billElem) {
        window.focus();
        window.print();
        return;
      }

      const billHtml = billElem.innerHTML;

      const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ভ্রমণ বিল ফরম এসআইএফ/৬৬ - ${name || "কর্মকর্তা"} (${monthName || "মাস"})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
    @page {
      size: ${orientation === "landscape" ? "landscape" : "portrait"} A4;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Hind Siliguri', sans-serif;
      font-size: 10pt;
    }
    .bill-wrapper {
      width: 100%;
      background: #ffffff;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #000000 !important;
      color: #000000 !important;
      padding: 2px 3px;
      word-wrap: break-word;
      font-size: 9pt;
    }
    th {
      font-weight: bold;
      text-align: center;
      background-color: #f8fafc !important;
    }
    @media print {
      body { background: #ffffff !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div style="font-weight: bold; font-size: 14px;">
      ভ্রমণ বিল ফরম এসআইএফ/৬৬ (সংশোধিত) - লিগ্যাল প্রিন্ট ভিউ
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="print-btn" onclick="window.print()">🖨️ লিগ্যাল পেজে প্রিন্ট করুন (Print / Save PDF)</button>
      <button class="close-btn" onclick="window.close()">✕ বন্ধ করুন</button>
    </div>
  </div>
  <div class="bill-wrapper">
    ${billHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

      // Strategy 1: Try dedicated window first (bypasses iframe restrictions)
      let opened = false;
      try {
        const printWin = window.open("", "_blank", "width=1000,height=900,menubar=no,toolbar=no");
        if (printWin) {
          printWin.document.open();
          printWin.document.write(printHtml);
          printWin.document.close();
          opened = true;
        }
      } catch (err) {
        console.warn("window.open blocked:", err);
      }

      // Strategy 2: If popup blocked or inside iframe, use hidden print iframe
      if (!opened) {
        try {
          const old = document.getElementById("print-tta-hidden-frame");
          if (old) old.remove();

          const iframe = document.createElement("iframe");
          iframe.id = "print-tta-hidden-frame";
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "300px";
          iframe.style.height = "300px";
          iframe.style.border = "none";
          iframe.style.opacity = "0.01";
          iframe.style.pointerEvents = "none";
          iframe.style.zIndex = "-999";
          document.body.appendChild(iframe);

          const doc = iframe.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(printHtml);
            doc.close();

            setTimeout(() => {
              try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
              } catch (e) {
                console.warn("iframe print failed, falling back to window.print():", e);
                window.focus();
                window.print();
              }
              setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
              }, 4000);
            }, 500);
            return;
          }
        } catch (e) {
          console.warn("iframe print error:", e);
        }

        // Strategy 3: Standard window.print
        window.focus();
        window.print();
      }
    }, 150);
  };

  // Word (.doc) export for offline printing
  const handleDownloadWord = () => {
    setActiveTab("preview");
    setTimeout(() => {
      const billElem = document.getElementById("printable-tta-bill");
      if (!billElem) return;

      const content = billElem.innerHTML;
      const wordDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/><title>ভ্রমণ বিল ফরম এসআইএফ/৬৬</title>
<style>
  @page Section1 { size: 215.9mm 355.6mm; margin: 12mm 15mm; }
  body { font-family: 'Vrinda', 'SolaimanLipi', 'Noto Serif Bengali', serif; font-size: 10pt; line-height: 1.4; color: #000; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  th, td { border: 1pt solid #000; padding: 3pt 4pt; }
  .print-page { page-break-after: always; }
</style>
</head>
<body><div class="Section1">${content}</div></body></html>`;

      const blob = new Blob(["\ufeff" + wordDoc], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ভ্রমণ_বিল_${(name || "কর্মকর্তা").replace(/\s+/g, "_")}_${(monthName || "চলতি_মাস").replace(/\s+/g, "_")}.doc`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    }, 150);
  };

  const filteredSavedDocs = savedDocs.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (doc.title || "").toLowerCase();
    const officer = (doc.officerName || "").toLowerCase();
    const desig = (doc.designation || "").toLowerCase();
    const mName = (doc.monthName || "").toLowerCase();
    return title.includes(q) || officer.includes(q) || desig.includes(q) || mName.includes(q);
  });

  return (
    <div className="bg-[#f0f4ff] min-h-screen p-4 sm:p-6 font-sans text-slate-800 animate-fadeIn print:p-0 print:m-0 print:bg-white">
      {/* Inline styles for dedicated Legal portrait print */}
      <style>{`
        @media print {
          @page {
            size: legal portrait;
            margin: 8mm 10mm;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, .print\\:hidden, button, header, nav, aside {
            display: none !important;
            visibility: hidden !important;
          }
          #printable-tta-bill {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }
          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto bg-white border border-[#dbe4ff] rounded-2xl p-6 sm:p-8 shadow-sm print:max-w-none print:p-0 print:m-0 print:border-none print:shadow-none">
        {dbSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold animate-fadeIn no-print print:hidden">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{dbSuccessMsg}</span>
          </div>
        )}

        {submitSuccessMsg && (
          <div className="mb-5 p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-sm animate-fadeIn no-print print:hidden">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
              <span>{submitSuccessMsg}</span>
            </div>
            <button
              onClick={handlePrintBill}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-2 self-end sm:self-auto shrink-0"
            >
              <Printer size={16} />
              <span>লিগ্যাল পেজে প্রিন্ট করুন</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-4 no-print print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <Briefcase size={12} /> এসআইএফ/৬৬ (সংশোধিত)
              </span>
              {isBillSubmitted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 size={12} /> সাবমিট সম্পন্ন
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 font-serif">
              ভ্রমণ বিল জেনারেটর (Travel Allowance Bill Generator)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              কর্মকর্তা/কর্মচারীদের ভ্রমণ ভাতা বিল (টিটিএ বিল), দৈনিক ভ্রমণ বিবরণী ও ১ম/২য় পাতা জেনারেটর
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>ফিরে যান</span>
              </button>
            )}

            <button
              onClick={handleStartNewBill}
              className="px-3.5 py-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="বর্তমান বিল রিসেট করে নতুন মাসের বিল শুরু করুন"
            >
              <Plus size={15} />
              <span>নতুন বিল তৈরি</span>
            </button>

            <button
              onClick={() => {
                loadSavedDocs();
                setActiveTab("archive");
              }}
              className="px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="ডাটাবেজে সংরক্ষিত ও সাবমিটকৃত সকল ভ্রমণ বিল দেখুন ও চেক করুন"
            >
              <FolderOpen size={15} />
              <span>সংরক্ষিত বিলসমূহ ({toBn(savedDocs.length)})</span>
            </button>

            <button
              onClick={handleSubmitFullMonthBill}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="সম্পূর্ণ বিল সাবমিট করুন - ডাটাবেজে অটো সেভ হবে এবং লিগ্যাল প্রিন্ট তৈরি হবে"
            >
              <Send size={15} />
              <span>সম্পূর্ণ বিল সাবমিট ও অটো-সেভ</span>
            </button>

            <button
              onClick={() => handlePrintBill("portrait")}
              className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="পোর্ট্রেট (লম্বালম্বি) লিগ্যাল পেজে প্রিন্ট করুন"
            >
              <Printer size={15} />
              <span>পোর্ট্রেট প্রিন্ট</span>
            </button>
            <button
              onClick={() => handlePrintBill("landscape")}
              className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="ল্যান্ডস্কেপ (আড়াআড়ি) লিগ্যাল পেজে প্রিন্ট করুন"
            >
              <Printer size={15} />
              <span>ল্যান্ডস্কেপ প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Current loaded bill banner */}
        {currentDocId && (
          <div className="mb-5 px-4 py-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-950 font-bold no-print print:hidden">
            <div className="flex items-center gap-2">
              <Briefcase size={15} className="text-indigo-600 shrink-0" />
              <span>বর্তমানে লোডকৃত বিল: <strong>{monthName ? `${monthName} মাস - ` : ""}{name || "কর্মকর্তা"}</strong> ({toBn(journeys.length)} টি ভ্রমণ)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">ডাটাবেজে সংরক্ষিত ✓</span>
            </div>
            <button
              onClick={handleStartNewBill}
              className="text-xs text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={13} />
              <span>নতুন বিল শুরু করুন</span>
            </button>
          </div>
        )}

        {/* View Mode Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-2 no-print print:hidden flex-wrap">
          <button
            onClick={() => setActiveTab("form")}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "form"
                ? "border-blue-600 text-blue-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={16} />
            <span>১. ভ্রমণ এন্ট্রি ফরম ও তালিকা ({toBn(journeys.length)} টি)</span>
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "preview"
                ? "border-emerald-600 text-emerald-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCheck size={16} />
            <span>২. জেনারেটকৃত ভ্রমণ বিল - ১ম ও ২য় পাতা (লিগ্যাল প্রিন্ট) {isBillSubmitted ? "✓" : ""}</span>
          </button>
          <button
            onClick={() => {
              loadSavedDocs();
              setActiveTab("archive");
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "archive"
                ? "border-indigo-600 text-indigo-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FolderOpen size={16} />
            <span>৩. সংরক্ষিত ও সাবমিটকৃত বিলসমূহ ({toBn(savedDocs.length)} টি)</span>
          </button>
        </div>

        {/* Form and Journey List view wrapper */}
        <div className={activeTab !== "form" ? "hidden no-print print:hidden" : "no-print print:hidden"}>
          {/* ── PART 1: HEADER / PERSONAL INFO ── */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            <span>১. ভ্রমণকারীর ব্যক্তিগত ও প্রশাসনিক তথ্য (Header Info)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">নাম</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">পদবী</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মূল বেতন</label>
              <input
                type="text"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">জেলা</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মাসের নাম</label>
              <input
                type="text"
                value={monthName}
                onChange={(e) => setMonthName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ভাউচার নং (ঐচ্ছিক)</label>
              <input
                type="text"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                placeholder="যেমন: ১২০"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">তারিখ</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">সঞ্চয়ী হিসাব নং</label>
              <input
                type="text"
                value={savingsAccountNo}
                onChange={(e) => setSavingsAccountNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* ── PART 2, 3, 4, 5, 6: JOURNEY & EXPENSE ENTRY FORM (2 lines / legs per day) ── */}
        <div className="bg-[#f8fafc] border border-blue-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator size={16} className="text-blue-600" />
              <span>{editingId ? "ভ্রমণ এন্ট্রি সম্পাদন (Edit Journey Entry)" : "নতুন দৈনিক ভ্রমণ তথ্য এন্ট্রি (Add Journey Schedule)"}</span>
            </span>
            <span className="text-[11px] font-normal text-slate-500">বহির্গমন, অবস্থান (একাধিক দিন), প্রত্যাগমন ও পৃথক দূরত্ব/ভাতা এন্ট্রি</span>
          </h3>

          <form onSubmit={handleSaveJourneyForm} className="space-y-4 text-xs">
            {/* Outbound Leg */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs">
              <div className="font-bold text-blue-800 text-[11px] uppercase tracking-wider">
                ক) প্রথম অংশ / বহির্গমন (Outbound Journey)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">প্রস্থান স্থান (Col 01)</label>
                  <input
                    type="text"
                    value={formData.depPlace}
                    onChange={(e) => setFormData({ ...formData, depPlace: e.target.value })}
                    placeholder="যেমন: কর্মস্থল"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">প্রস্থান তারিখ (Col 02)</label>
                  <input
                    type="text"
                    value={formData.depDate}
                    onChange={(e) => setFormData({ ...formData, depDate: e.target.value })}
                    placeholder="০৮.০৯.২৬"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">প্রস্থান সময় (Col 03)</label>
                  <input
                    type="text"
                    value={formData.depTime}
                    onChange={(e) => setFormData({ ...formData, depTime: e.target.value })}
                    placeholder="সং: ৮-৩০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">আগমন স্থান (Col 04)</label>
                  <input
                    type="text"
                    value={formData.arrPlace}
                    onChange={(e) => setFormData({ ...formData, arrPlace: e.target.value })}
                    placeholder="রাইখখালী বাজার"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">আগমন তারিখ (Col 05)</label>
                  <input
                    type="text"
                    value={formData.arrDate}
                    onChange={(e) => setFormData({ ...formData, arrDate: e.target.value })}
                    placeholder="০৮.০৯.২৬"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">আগমন সময় (Col 06)</label>
                  <input
                    type="text"
                    value={formData.arrTime}
                    onChange={(e) => setFormData({ ...formData, arrTime: e.target.value })}
                    placeholder="সং: ১০-০৫"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">বহির্গমন সড়ক পথ (সাধারণ) কিমি</label>
                  <input
                    type="number"
                    value={formData.roadDistOrdinary}
                    onChange={(e) => setFormData({ ...formData, roadDistOrdinary: Number(e.target.value) })}
                    placeholder="০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">বহির্গমন সড়ক পথ (পাহাড়ী) কিমি</label>
                  <input
                    type="number"
                    value={formData.roadDistHilly}
                    onChange={(e) => setFormData({ ...formData, roadDistHilly: Number(e.target.value) })}
                    placeholder="০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">বহির্গমন পাহাড়ি দৈনিক ভাতা সংখ্যা</label>
                  <input
                    type="number"
                    value={formData.daHillyCount}
                    onChange={(e) => setFormData({ ...formData, daHillyCount: Number(e.target.value) })}
                    placeholder="১"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Multi-day Stay at Destination (Requirement 2) */}
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3 shadow-xs">
              <div className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                খ) ভ্রমনের স্থানে একাধিক দিন স্টে / অবস্থানের বিবরণ (Multi-day Stay Details)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">অবস্থানের শুরুর তারিখ</label>
                  <input
                    type="text"
                    value={formData.stayStartDate}
                    onChange={(e) => setFormData({ ...formData, stayStartDate: e.target.value })}
                    placeholder="০৯.০৯.২৬"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">অবস্থানের শেষের তারিখ</label>
                  <input
                    type="text"
                    value={formData.stayEndDate}
                    onChange={(e) => setFormData({ ...formData, stayEndDate: e.target.value })}
                    placeholder="১০.০৯.২৬"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">অবস্থানের বিবরণ / কাজের বিবরণ</label>
                  <input
                    type="text"
                    value={formData.stayDescription}
                    onChange={(e) => setFormData({ ...formData, stayDescription: e.target.value })}
                    placeholder="যেমন: খাগড়াছড়ি শাখায় অবস্থান ও ঋণ পরিদর্শন"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Return Leg */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs">
              <div className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider">
                গ) দ্বিতীয় অংশ / ফেরৎ যাত্রা / প্রত্যাগমন (Return Journey)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">প্রস্থান স্থান</label>
                  <input
                    type="text"
                    value={formData.returnDepPlace}
                    onChange={(e) => setFormData({ ...formData, returnDepPlace: e.target.value })}
                    placeholder="রাইখখালী বাজার"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">প্রস্থান তারিখ</label>
                  <input
                    type="text"
                    value={formData.returnDepDate}
                    onChange={(e) => setFormData({ ...formData, returnDepDate: e.target.value })}
                    placeholder="০৮.০৯.২৬"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">প্রস্থান সময়</label>
                  <input
                    type="text"
                    value={formData.returnDepTime}
                    onChange={(e) => setFormData({ ...formData, returnDepTime: e.target.value })}
                    placeholder="বিঃ ৪-১৫"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">কর্মস্থলে আগমন স্থান</label>
                  <input
                    type="text"
                    value={formData.returnArrPlace}
                    onChange={(e) => setFormData({ ...formData, returnArrPlace: e.target.value })}
                    placeholder="কর্মস্থল"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">আগমন তারিখ</label>
                  <input
                    type="text"
                    value={formData.returnArrDate}
                    onChange={(e) => setFormData({ ...formData, returnArrDate: e.target.value })}
                    placeholder="০৮.০৯.২৬"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">আগমন সময়</label>
                  <input
                    type="text"
                    value={formData.returnArrTime}
                    onChange={(e) => setFormData({ ...formData, returnArrTime: e.target.value })}
                    placeholder="বিঃ ৫-৫৫"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ফেরার পথে সড়ক পথ (সাধারণ) কিমি (Requirement 1)</label>
                  <input
                    type="number"
                    value={formData.returnRoadDistOrdinary}
                    onChange={(e) => setFormData({ ...formData, returnRoadDistOrdinary: Number(e.target.value) })}
                    placeholder="০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ফেরার পথে সড়ক পথ (পাহাড়ী) কিমি (Requirement 1)</label>
                  <input
                    type="number"
                    value={formData.returnRoadDistHilly}
                    onChange={(e) => setFormData({ ...formData, returnRoadDistHilly: Number(e.target.value) })}
                    placeholder="০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ফেরার পথে পাহাড়ি দৈনিক ভাতা সংখ্যা</label>
                  <input
                    type="number"
                    value={formData.returnDaHillyCount}
                    onChange={(e) => setFormData({ ...formData, returnDaHillyCount: Number(e.target.value) })}
                    placeholder="০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Transport, Fare, Distance Rate, Purpose */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                ঘ) পরিবহন, ভাড়া ও অন্যান্য বিবরণ
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ভ্রমণের মাধ্যম (Col 07)</label>
                  <input
                    type="text"
                    value={formData.transportMode}
                    onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
                    placeholder="অফিস গাড়ি / বাস / ট্রেন"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ভাড়া টাকার পরিমাণ (Col 10)</label>
                  <input
                    type="number"
                    value={formData.fareAmount}
                    onChange={(e) => setFormData({ ...formData, fareAmount: Number(e.target.value) })}
                    placeholder="০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">প্রতি কিমি টাকার হার</label>
                  <input
                    type="number"
                    value={formData.roadDistRate}
                    onChange={(e) => setFormData({ ...formData, roadDistRate: Number(e.target.value) })}
                    placeholder="৫"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">দৈনিক ভাতার হার (টাকা)</label>
                  <input
                    type="number"
                    value={formData.daRate}
                    onChange={(e) => setFormData({ ...formData, daRate: Number(e.target.value) })}
                    placeholder="৭৫০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ভ্রমণের উদ্দেশ্য / আদেশ নং (Col 18)</label>
                  <textarea
                    rows={2}
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="শাখার সম্ভাব্য ঋণ গ্রাহকের প্রকল্প পরিদর্শন..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">মন্তব্য (Col 19)</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="বিশেষ মন্তব্য..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Advance info */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                ঙ) ভ্রমণ অগ্রিম (Advance Taken if any)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">অগ্রিম গ্রহণের তারিখ</label>
                  <input
                    type="date"
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">অগ্রিম পরিমাণ (টাকা)</label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    placeholder="০"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      depPlace: "কর্মস্থল",
                      depDate: "",
                      depTime: "",
                      arrPlace: "",
                      arrDate: "",
                      arrTime: "",
                      returnDepPlace: "",
                      returnDepDate: "",
                      returnDepTime: "",
                      returnArrPlace: "কর্মস্থল",
                      returnArrDate: "",
                      returnArrTime: "",
                      stayStartDate: "",
                      stayEndDate: "",
                      stayDescription: "",
                      transportMode: "",
                      fareClass: "",
                      fareRateCount: "",
                      fareAmount: 0,
                      roadDistOrdinary: 0,
                      roadDistHilly: 0,
                      returnRoadDistOrdinary: 0,
                      returnRoadDistHilly: 0,
                      roadDistRate: 5,
                      daOrdinaryCount: 0,
                      daCostlyCount: 0,
                      daHillyCount: 0,
                      returnDaOrdinaryCount: 0,
                      returnDaCostlyCount: 0,
                      returnDaHillyCount: 0,
                      daRate: 750,
                      otherCharges: 0,
                      purpose: "",
                      remarks: "",
                    });
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  বাতিল
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>{editingId ? "তথ্য আপডেট করুন" : "ভ্রমণ এন্ট্রি তালিকাভুক্ত করুন"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── PART 8: JOURNEYS LIST TABLE ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>২. এন্ট্রিকৃত ভ্রমণ তালিকা ({journeys.length} টি)</span>
            <span className="text-xs text-slate-400">তালিকা হতে এডিট বা ডিলিট করতে পারবেন</span>
          </h3>

          {journeys.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">কোনো ভ্রমণ এন্ট্রি যোগ করা হয়নি।</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-slate-200 p-2 text-center">ক্রিঃ</th>
                    <th className="border border-slate-200 p-2 text-center">বহির্গমন</th>
                    <th className="border border-slate-200 p-2 text-center">অবস্থান/স্ট্যান্ড</th>
                    <th className="border border-slate-200 p-2 text-center">প্রত্যাগমন (ফেরার পথ)</th>
                    <th className="border border-slate-200 p-2 text-center">দূরত্ব ও ভাতা</th>
                    <th className="border border-slate-200 p-2 text-center">উদ্দেশ্য</th>
                    <th className="border border-slate-200 p-2 text-center">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody>
                  {journeys.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="border border-slate-200 p-2 text-center font-bold">{toBn(idx + 1)}।</td>
                      <td className="border border-slate-200 p-2">
                        <div>{item.depPlace} ➔ {item.arrPlace}</div>
                        <div className="text-slate-400 text-[11px]">{item.depDate}, {item.depTime}</div>
                      </td>
                      <td className="border border-slate-200 p-2">
                        {item.stayDescription ? (
                          <div>
                            <span className="font-semibold text-amber-800">স্ট্যান্ড/অবস্থান:</span> {item.stayDescription}
                            <div className="text-slate-400 text-[11px]">{item.stayStartDate} হতে {item.stayEndDate}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="border border-slate-200 p-2">
                        {item.returnDepPlace ? (
                          <div>
                            <div>{item.returnDepPlace} ➔ {item.returnArrPlace}</div>
                            <div className="text-slate-400 text-[11px]">{item.returnDepDate}, {item.returnDepTime}</div>
                            <div className="text-emerald-700 text-[11px]">ফেরার দূরত্ব: {toBn((item.returnRoadDistOrdinary || 0) + (item.returnRoadDistHilly || 0))} কিমি</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="border border-slate-200 p-2 text-center">
                        <div>সড়ক মোট: {toBn((item.roadDistOrdinary || 0) + (item.roadDistHilly || 0) + (item.returnRoadDistOrdinary || 0) + (item.returnRoadDistHilly || 0))} কিমি</div>
                        <div>পাহাড়ী ভাতা: {toBn((item.daHillyCount || 0) + (item.returnDaHillyCount || 0))} টি</div>
                      </td>
                      <td className="border border-slate-200 p-2 text-slate-600 max-w-xs truncate">{item.purpose || "-"}</td>
                      <td className="border border-slate-200 p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditJourney(item)}
                            className="p-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                            title="সম্পাদন করুন"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteJourney(item.id)}
                            className="p-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── PART 8.5: MONTH BILL SUBMISSION CALLOUT ── */}
        <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 border-2 border-blue-300 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm no-print print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-blue-950 font-black text-lg">
                <Send className="text-blue-600 shrink-0" size={22} />
                <span>{monthName || "উক্ত মাসের"} সম্পূর্ণ ভ্রমণ বিল সাবমিট ও ডাটাবেজে অটো-সেভ</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                উক্ত মাসের সকল দিনের ভ্রমণ তথ্য এন্ট্রি সম্পন্ন হলে এই বাটনে ক্লিক করে সম্পূর্ণ বিলটি সাবমিট করুন। <strong>সাবমিট বাটনে চাপ দেওয়া মাত্রই সম্পূর্ণ বিল ডাটাবেজে স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে</strong> এবং হুবহু সরকারি ফরম্যাটে <strong>এসআইএফ/৬৬ (সংশোধিত) লিগ্যাল ভ্রমণ বিল</strong> প্রস্তুত হবে। আলাদাভাবে ডাটাবেজে সেভ করার কোনো প্রয়োজন নেই। পরবর্তীতে যেকোনো সময় <strong>&quot;সংরক্ষিত বিলসমূহ&quot;</strong> ট্যাবে গিয়ে এই বিলটি চেক, রি-প্রিন্ট বা এডিট করতে পারবেন।
              </p>
              <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold text-blue-900 bg-white/80 border border-blue-200 px-4 py-2 rounded-2xl w-fit">
                <span>মোট ভ্রমণ: {toBn(journeys.length)} টি</span>
                <span>• সর্বমোট দাবী: {toBn(grandTotalGross.toFixed(2))} টাকা</span>
                {Number(advanceAmount || 0) > 0 && <span>• বাদ অগ্রিম: (-) {toBn(Number(advanceAmount).toFixed(2))} টাকা</span>}
                <span className="text-emerald-800">• নীট প্রদেয়: {toBn(netPayable.toFixed(2))} টাকা</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                onClick={handleSubmitFullMonthBill}
                className="px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 active:scale-95 group cursor-pointer"
              >
                <CheckCircle2 size={20} className="text-blue-200 group-hover:scale-110 transition-transform" />
                <span>সম্পূর্ণ বিল সাবমিট ও অটো-সেভ করুন</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveToDatabase(true)}
                  disabled={isSavingDb}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="কাজ অসম্পূর্ণ থাকলে সাময়িক খসড়া হিসেবে সংরক্ষণ করুন"
                >
                  <Save size={14} className="text-slate-500" />
                  <span>{isSavingDb ? "সংরক্ষণ..." : "খসড়া সেভ"}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintBill}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} className="text-emerald-700" />
                  <span>প্রিন্ট প্রিভিউ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* ── PART 9: PREVIEW OF FORM SIF-66 (REVISED) - 2 PAGES (LEGAL) ── */}
        <div
          className={
            activeTab !== "preview"
              ? "hidden"
              : "bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 print:bg-white print:text-black print:p-0 print:m-0 print:shadow-none print:space-y-0 print:border-none print:block"
          }
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 no-print print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {isBillSubmitted ? "সাবমিট সম্পন্ন ✓" : "খসড়া বিল"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  ডাটাবেজে অটো-সংরক্ষিত
                </span>
                <h3 className="font-extrabold text-lg text-white">ভ্রমণ বিল ফরম এসআইএফ/৬৬ (সংশোধিত) - ১ম ও ২য় পাতা</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">সংযুক্ত ১ম ও ২য় চিত্রের হুবহু ফরম্যাটে লিগ্যাল পেজে (Legal 8.5 × 14 in) প্রিন্ট করার উপযোগী</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("form")}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 size={14} />
                <span>তথ্য সংশোধন করুন</span>
              </button>
              <button
                onClick={() => {
                  loadSavedDocs();
                  setActiveTab("archive");
                }}
                className="px-4 py-2.5 rounded-xl border border-indigo-700 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen size={14} />
                <span>সংরক্ষিত বিলসমূহ ({toBn(savedDocs.length)})</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintBill("portrait")}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="পোর্ট্রেট (লম্বালম্বি) লিগ্যাল পেজে প্রিন্ট"
              >
                <Printer size={15} />
                <span>পোর্ট্রেট প্রিন্ট</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintBill("landscape")}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="ল্যান্ডস্কেপ (আড়াআড়ি) লিগ্যাল পেজে প্রিন্ট"
              >
                <Printer size={15} />
                <span>ল্যান্ডস্কেপ প্রিন্ট</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-4 py-2.5 rounded-xl border border-sky-600 bg-sky-950/70 hover:bg-sky-900 text-sky-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="মাইক্রোসফট ওয়ার্ড (.doc) ফাইল ডাউনলোড করে যেকোনো প্রিন্টারে প্রিন্ট করুন"
              >
                <FileDown size={15} />
                <span>Word (.doc) ডাউনলোড</span>
              </button>
            </div>
          </div>

          {/* Quick Print Tip Banner */}
          <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-200 text-xs flex items-center gap-2 no-print print:hidden">
            <span>💡 <strong>প্রিন্ট নির্দেশিকা:</strong> প্রিন্ট ডায়ালগে Paper Size "Legal" (৮.৫ × ১৪ ইঞ্চি), Orientation "Portrait" এবং Margins "Default" অথবা "Minimum" নির্বাচন করুন।</span>
          </div>

          {/* Printable Container matching Image 1 (Page 1) and Image 2 (Page 2) */}
          <div
            id="printable-tta-bill"
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-12 font-sans text-[11pt] leading-normal print:p-0 print:m-0 print:shadow-none print:bg-white print:text-black print:space-y-0 print:block print:w-full print:border-none"
          >
            
            {/* ================= PAGE 1 ================= */}
            <div className="print-page pb-8 border-b-2 border-dashed border-slate-300 print:border-none print:pb-0 print:break-after-page print:block print:w-full">
              <div className="flex justify-between items-start mb-6 text-xs">
                <div className="space-y-1">
                  <div><strong>নাম</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {name}</div>
                  <div><strong>পদবী</strong> &nbsp;&nbsp;&nbsp;&nbsp;: {designation}</div>
                  <div><strong>মূল বেতন</strong> : {basicSalary}</div>
                  <div><strong>জেলা</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {district}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-base">বাংলাদেশ কৃষি ব্যাংক</div>
                  <div className="text-sm font-bold">আঞ্চলিক কার্যালয়, রাঙ্গামাটি।</div>
                  <div className="font-bold underline mt-1">ভ্রমণ ভাতা বিল (কর্মকর্তা/কর্মচারী)</div>
                  <div className="text-xs text-slate-500">(অনুচ্ছেদ নং-৪.৪৬)</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="font-bold text-[10pt]">এসআইএফ/৬৬(সংশোধিত)</div>
                  <div><strong>মাস</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {monthName}</div>
                  <div><strong>ভাউচার নং</strong> : {voucherNo ? toBn(voucherNo) : ".........."}</div>
                  <div><strong>তারিখ</strong> &nbsp;&nbsp;&nbsp;&nbsp;: {toBn(docDate)} ইং</div>
                </div>
              </div>

              {/* Table Columns 01 to 19 (Image 1 Format - unmerged DA columns for Requirement 3) */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-[9.5pt]">
                  <thead>
                    <tr className="bg-slate-50 text-center font-bold">
                      <th colSpan={6} className="border border-black p-1.5">ভ্রমণ এবং অবস্থানের বিবরণ</th>
                      <th rowSpan={2} className="border border-black p-1 text-[8pt] w-[8%]">ভ্রমণের মাধ্যমে (বিমান/রেল/স্টিমার/জাহাজ/লঞ্চ/বাস)</th>
                      <th colSpan={3} className="border border-black p-1 text-[8pt]">(বিমান/রেল/স্টিমার/জাহাজ/লঞ্চ/বাস ভাড়া)</th>
                      <th colSpan={3} className="border border-black p-1 text-[8pt]">সড়ক পথে/ট্রলার/অন্যান্য জলযানযোগে ভ্রমণের দূরত্ব</th>
                      <th colSpan={3} className="border border-black p-1 text-[8pt]">দৈনিক ভাতার সংখ্যা ও টাকার পরিমাণ</th>
                      <th rowSpan={2} className="border border-black p-1 text-[8pt] w-[7%]">অন্যান্য (বদলীর ক্ষেত্রে গোছানো চার্জ ও মালামালের ভাড়া)</th>
                      <th rowSpan={2} className="border border-black p-1 text-[8pt] w-[18%]">ভ্রমণের উদ্দেশ্য/আদেশ নং</th>
                      <th rowSpan={2} className="border border-black p-1 text-[8pt] w-[5%]">মস্তব্য</th>
                    </tr>
                    <tr className="bg-slate-50 text-center font-bold text-[8.5pt]">
                      {/* Outbound */}
                      <th className="border border-black p-1">স্থান</th>
                      <th className="border border-black p-1">তারিখ</th>
                      <th className="border border-black p-1">সময়</th>
                      {/* Arrival */}
                      <th className="border border-black p-1">স্থান</th>
                      <th className="border border-black p-1">তারিখ</th>
                      <th className="border border-black p-1">সময়</th>
                      {/* Fare subcols */}
                      <th className="border border-black p-1">শ্রেণী</th>
                      <th className="border border-black p-1">টিকেটের হার ও প্রাপ্যতা সংখ্যা</th>
                      <th className="border border-black p-1">টাকার পরিমাণ</th>
                      {/* Dist subcols */}
                      <th className="border border-black p-1">সাধারণ হারে কিঃমিঃ</th>
                      <th className="border border-black p-1">পাহাড়ী এলাকার হারে কিঃমিঃ</th>
                      <th className="border border-black p-1">প্রতি কিঃমিঃ টাকার হার</th>
                      {/* DA subcols */}
                      <th className="border border-black p-1">সাধারণ এলাকা</th>
                      <th className="border border-black p-1">ব্যয় বহুল এলাকা</th>
                      <th className="border border-black p-1">পাহাড়ী এলাকা</th>
                    </tr>
                    <tr className="bg-slate-100 text-center font-mono text-[8pt]">
                      {Array.from({ length: 19 }).map((_, i) => (
                        <th key={i} className="border border-black p-0.5">{toBn(i + 1 < 10 ? `০${i + 1}` : i + 1)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {journeys.map((item) => {
                      const hasReturn = Boolean(item.returnDepPlace);
                      return (
                        <React.Fragment key={item.id}>
                          {/* Row 1: Outbound */}
                          <tr>
                            <td className="border border-black p-1 text-center">{item.depPlace}</td>
                            <td className="border border-black p-1 text-center">{toBn(item.depDate)}</td>
                            <td className="border border-black p-1 text-center">{item.depTime}</td>
                            <td className="border border-black p-1 text-center">{item.arrPlace}</td>
                            <td className="border border-black p-1 text-center">{toBn(item.arrDate)}</td>
                            <td className="border border-black p-1 text-center">{item.arrTime}</td>
                            <td className="border border-black p-1 text-center">{item.transportMode}</td>
                            <td className="border border-black p-1 text-center">{item.fareClass}</td>
                            <td className="border border-black p-1 text-center">{item.fareRateCount}</td>
                            <td className="border border-black p-1 text-right">{item.fareAmount ? toBn(item.fareAmount.toFixed(2)) : ""}</td>
                            <td className="border border-black p-1 text-center">{item.roadDistOrdinary ? toBn(item.roadDistOrdinary) : ""}</td>
                            <td className="border border-black p-1 text-center">{item.roadDistHilly ? toBn(item.roadDistHilly) : ""}</td>
                            <td className="border border-black p-1 text-center">{item.roadDistRate ? toBn(item.roadDistRate) : ""}</td>
                            <td className="border border-black p-1 text-center">{item.daOrdinaryCount ? toBn(item.daOrdinaryCount) : ""}</td>
                            <td className="border border-black p-1 text-center">{item.daCostlyCount ? toBn(item.daCostlyCount) : ""}</td>
                            <td className="border border-black p-1 text-center font-semibold text-blue-900">{item.daHillyCount ? toBn(item.daHillyCount) : ""}</td>
                            <td className="border border-black p-1 text-right">{item.otherCharges ? toBn(item.otherCharges.toFixed(2)) : ""}</td>
                            <td rowSpan={hasReturn ? 2 : 1} className="border border-black p-1 text-justify align-middle">
                              {item.purpose}
                              {item.stayDescription && (
                                <div className="text-[8.5pt] text-amber-900 mt-0.5 italic">
                                  [অবস্থান: {item.stayStartDate} - {item.stayEndDate}: {item.stayDescription}]
                                </div>
                              )}
                            </td>
                            <td rowSpan={hasReturn ? 2 : 1} className="border border-black p-1 text-center align-middle">{item.remarks}</td>
                          </tr>
                          {/* Row 2: Return (if present) */}
                          {hasReturn && (
                            <tr>
                              <td className="border border-black p-1 text-center">{item.returnDepPlace}</td>
                              <td className="border border-black p-1 text-center">{toBn(item.returnDepDate)}</td>
                              <td className="border border-black p-1 text-center">{item.returnDepTime}</td>
                              <td className="border border-black p-1 text-center">{item.returnArrPlace}</td>
                              <td className="border border-black p-1 text-center">{toBn(item.returnArrDate)}</td>
                              <td className="border border-black p-1 text-center">{item.returnArrTime}</td>
                              <td className="border border-black p-1 text-center">-</td>
                              <td className="border border-black p-1 text-center"></td>
                              <td className="border border-black p-1 text-center"></td>
                              <td className="border border-black p-1 text-right"></td>
                              <td className="border border-black p-1 text-center">{item.returnRoadDistOrdinary ? toBn(item.returnRoadDistOrdinary) : ""}</td>
                              <td className="border border-black p-1 text-center">{item.returnRoadDistHilly ? toBn(item.returnRoadDistHilly) : ""}</td>
                              <td className="border border-black p-1 text-center">{item.roadDistRate ? toBn(item.roadDistRate) : ""}</td>
                              <td className="border border-black p-1 text-center">{item.returnDaOrdinaryCount ? toBn(item.returnDaOrdinaryCount) : ""}</td>
                              <td className="border border-black p-1 text-center">{item.returnDaCostlyCount ? toBn(item.returnDaCostlyCount) : ""}</td>
                              <td className="border border-black p-1 text-center font-semibold text-blue-900">{item.returnDaHillyCount ? toBn(item.returnDaHillyCount) : ""}</td>
                              <td className="border border-black p-1 text-right"></td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 text-[10pt] space-y-1 text-slate-700">
                <div>• স্টিমার, জাহাজ ও লঞ্চ ব্যতীত অন্য যে কোন জলযানে ভ্রমণ সড়কপথে ভ্রমণের অন্তর্ভুক্ত ধরিয়া দূরত্ব অনুযায়ী প্রতি কিলোমিটারে প্রযোজ্য ভ্রমণ ভাতা দাবি করিতে হইবে।</div>
                <div>• বিমানে ভ্রমণের ক্ষেত্রে বিমানের টিকেটের মোট মূল্য হইতে ভ্যাট বা অন্যান্য চার্জ বাদ দিয়া টিকেটের প্রকৃত মূল্যের ভিত্তিতে আনুসাঙ্গিক (ইনসিডেন্টাল) চার্জ দাবি করিতে হইবে।</div>
              </div>

              <div className="mt-12 flex justify-end">
                <div className="text-center text-xs">
                  <div className="font-bold underline">ভ্রমণকারীর স্বাক্ষর</div>
                  <div>(নামের সীলসহ)</div>
                </div>
              </div>
            </div>

            {/* ================= PAGE 2 (Matching Image 2) ================= */}
            <div className="print-page pt-6 print:pt-0 print:break-after-auto print:block print:w-full">
              <div className="flex justify-between items-start mb-6 text-xs">
                <div></div>
                <div className="text-center">
                  <div className="font-bold text-base">বাংলাদেশ কৃষি ব্যাংক</div>
                  <div className="text-sm font-bold">আঞ্চলিক কার্যালয়, রাঙ্গামাটি।</div>
                  <div className="font-bold underline mt-1">কর্মকর্তা/কর্মচারীদের ভ্রমণভাতা বিল তৈরী করার নির্দেশিকা</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[10pt]">এসআইএফ/৬৬(সংশোধিত)</div>
                  <div>মাস: {monthName} বিল</div>
                  <div>ভাউচার নং: {voucherNo ? toBn(voucherNo) : ".........."}</div>
                </div>
              </div>

              {/* 50% - 50% Equal Split 2-Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 items-start w-full">
                
                {/* Left Column (50%): Table & Everything below it */}
                <div className="space-y-4 w-full">
                  <div className="border border-black text-[10pt] w-full">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-2 text-center font-bold w-[8%]">০১.</td>
                          <td className="border-r border-black p-2">
                            <div>বিমান/রেল/স্টিমার/জাহাজ/লঞ্চ/বাস ভাড়া</div>
                            <div className="text-slate-500 text-[9pt]">(বাস ভাড়া এসি @ ............)</div>
                            <div className="text-slate-500 text-[9pt]">(বাস ভাড়া এসির ......... @ ............)</div>
                          </td>
                          <td className="p-2 text-right font-bold w-[25%]" style={{ whiteSpace: "nowrap" }}>{toBn(totalFare.toFixed(2))}/-</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-2 text-center font-bold">০২.</td>
                          <td className="border-r border-black p-2">
                            <div>সড়ক পথ/ট্রলার/অন্যান্য জলযানযোগে</div>
                            <div className="text-slate-500 text-[9pt]">সাধারণ ও পাহাড়ী মোট: {toBn(totalRoadOrdinaryDist + totalRoadHillyDist)} কিঃমিঃ @ {toBn(roadRate.toFixed(2))}</div>
                          </td>
                          <td className="p-2 text-right font-bold" style={{ whiteSpace: "nowrap" }}>{toBn(totalRoadFare.toFixed(2))}/-</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-2 text-center font-bold">০৩.</td>
                          <td className="border-r border-black p-2">
                            <div>দৈনিক ভাতা: প্যাকিং ও ক্রেটিং</div>
                            <div className="text-slate-500 text-[9pt]">সাধারণ হারে: {toBn(totalDaOrdinary)} টি @ ({toBn(daRateVal)})</div>
                            <div className="text-slate-500 text-[9pt]">ব্যয়বহুল হারে: {toBn(totalDaCostly)} টি @ ({toBn(daRateVal)})</div>
                            <div className="text-slate-500 text-[9pt]">পাহাড়ী হারে: {toBn(totalDaHilly)} টি @ ({toBn(daRateVal)})</div>
                          </td>
                          <td className="p-2 text-right font-bold" style={{ whiteSpace: "nowrap" }}>{toBn(totalDaAmount.toFixed(2))}/-</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-2 text-center font-bold">০৪.</td>
                          <td className="border-r border-black p-2">অন্যান্য / প্যাকিং ও ক্রেটিং</td>
                          <td className="p-2 text-right font-bold" style={{ whiteSpace: "nowrap" }}>{toBn(totalOtherCharges.toFixed(2))}/-</td>
                        </tr>
                        <tr className="border-b border-black bg-slate-50 font-bold">
                          <td colSpan={2} className="border-r border-black p-2 text-right">মোটঃ</td>
                          <td className="p-2 text-right" style={{ whiteSpace: "nowrap" }}>{toBn(grandTotalGross.toFixed(2))}/-</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td colSpan={2} className="border-r border-black p-2 text-right">
                            বাদ {advanceDate ? toBn(advanceDate) : ".........."} তারিখে গৃহীত অগ্রিম <br />
                            <strong>নীট প্রদেয় / আদায়যোগ্য :</strong>
                          </td>
                          <td className="p-2 text-right font-bold align-bottom" style={{ whiteSpace: "nowrap" }}>
                            (-) {toBn(Number(advanceAmount || 0).toFixed(2))}/- <br />
                            {toBn(netPayable.toFixed(2))}/-
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="text-center text-xs font-bold">
                    (কথায়: {netPayableWords})
                  </div>

                  <div className="text-[9pt] text-slate-700 space-y-1">
                    <div>প্রত্যয়ন করিতেছি যে, যেই শ্রেণীর জন্য ভাতা দাবী করা হইয়াছি আমি সেই শ্রেণীতে ভ্রমণ করিয়াছি। বিলের যাবতীয় তথ্য সঠিক আছে।</div>
                    <div>বিলটি অনুমোদিত হইলে অনুগ্রহপূর্বক প্রদেয় অর্থ নগদ/সঞ্চয়ী হিসাব নং {toBn(savingsAccountNo)} -এর মাধ্যমে প্রদান করার জন্য অনুরোধ করা হইল।</div>
                  </div>

                  {/* Signatures */}
                  <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] font-bold text-center">
                    <div>
                      <div className="underline">পরীক্ষাকারী কর্মকর্তার স্বাক্ষর</div>
                      <div className="font-normal text-[9pt]">(নামের সীলসহ)</div>
                    </div>
                    <div>
                      <div className="underline">ভ্রমণকারীর স্বাক্ষর</div>
                      <div className="font-normal text-[9pt]">(নামের সীলসহ)</div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4 text-[10px]">
                    <div>মোট টাকা ................................... (কথায়: ....................................................................) মঞ্জুর করা হইল।</div>
                    <div className="flex justify-end pt-2">
                      <div className="text-center font-bold">
                        <div>সুপারিশকারী/নিয়ন্ত্রণকারী কর্মকর্তার স্বাক্ষর</div>
                        <div className="font-normal text-[9pt]">(নামের সীলসহ)</div>
                      </div>
                    </div>
                    <div>মোট টাকা ................................... (কথায়: ....................................................................) মঞ্জুর করা হইল।</div>
                    <div>মোট টাকা ................................... (কথায়: ....................................................................) প্রদান/আদায় করা হউক।</div>
                    <div className="flex justify-end pt-4">
                      <div className="text-center font-bold">
                        <div className="underline">মঞ্জুরকারী/অনুমোদনকারী কর্মকর্তার স্বাক্ষর</div>
                        <div className="font-normal text-[9pt]">(নামের সীলসহ)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (50%): First Paragraph / Instructions */}
                <div className="space-y-4 w-full">
                  <div className="text-[10pt] space-y-2 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="font-bold underline mb-1">নির্দেশিকা ও নিয়মাবলি:</div>
                    <div>০১. কোন একক ভ্রমণের ক্ষেত্রে মোট বিলে কিলোমিটারের ভগ্নাংশের জন্য ভাতা দাবি করা যাইবে না।</div>
                    <div>০২. চাকুরী বিধি মোতাবেক আদালতে উপস্থিতির ক্ষেত্রে আদালত কর্তৃপক্ষ কর্তৃক আদালতে উপস্থিতি সংক্রান্ত প্রত্যয়নপত্র সংযুক্ত করিতে হইবে।</div>
                    <div>০৩. নীট আদায়যোগ্য অংকের বেলায় পরীক্ষাকারী কর্মকর্তা কতৃক (-) চিহ্ন এবং প্রদেয় অংকের ক্ষেত্রে (+) চিহ্ন ব্যবহার করিতে হইবে।</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ── PART 10: SAVED & SUBMITTED BILLS ARCHIVE / CHECKER ── */}
        {activeTab === "archive" && (
          <div className="space-y-6 no-print print:hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      ডাটাবেজ আর্কাইভ ও বিল চেকার
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      সাবমিট করলেই অটো-সেভ
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-serif">
                    সংরক্ষিত ও সাবমিটকৃত ভ্রমণ বিলসমূহ ({toBn(savedDocs.length)} টি)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    সাবমিট করা সকল মাসের ভ্রমণ বিল এখানে ডাটাবেজে স্থায়ীভাবে সংরক্ষিত থাকে। পরবর্তীতে যেকোনো সময় এখান থেকে পূর্বের বিল চেক, সরাসরি এসআইএফ-৬৬ লিগ্যাল প্রিন্ট কিংবা সংশোধন করা যাবে।
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={handleStartNewBill}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>নতুন বিল তৈরি করুন</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("form")}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={15} />
                    <span>এন্ট্রি ফর্মে ফিরুন</span>
                  </button>
                </div>
              </div>

              {/* Search filter */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="মাসের নাম, কর্মকর্তা বা পদবি দিয়ে বিল খুঁজুন..."
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-slate-400 hover:text-white px-3 py-2 cursor-pointer"
                  >
                    মুছে ফেলুন
                  </button>
                )}
              </div>
            </div>

            {/* List of bills */}
            {filteredSavedDocs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3 shadow-xs">
                <FolderOpen size={48} className="mx-auto text-slate-300" />
                <div className="font-bold text-slate-600 text-base">কোনো সংরক্ষিত বা সাবমিটকৃত ভ্রমণ বিল পাওয়া যায়নি</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  ফরম থেকে তথ্য পূরণ করে &quot;সম্পূর্ণ বিল সাবমিট ও অটো-সেভ&quot; বাটনে ক্লিক করলেই বিলটি ডাটাবেজে স্থায়ীভাবে সংরক্ষিত হয়ে এখানে চলে আসবে।
                </p>
                <button
                  onClick={() => setActiveTab("form")}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow"
                >
                  <Plus size={15} />
                  <span>এখনই বিল এন্ট্রি শুরু করুন</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSavedDocs.map((doc: any) => {
                  let docContent: any = null;
                  try {
                    docContent = typeof doc.content === "string" ? JSON.parse(doc.content) : doc.content;
                  } catch {
                    docContent = null;
                  }
                  const journeyCount = doc.journeyCount || (Array.isArray(docContent?.journeys) ? docContent.journeys.length : 0);
                  const officerName = doc.officerName || docContent?.header?.name || "-";
                  const offDesignation = doc.designation || docContent?.header?.designation || "";
                  const mName = doc.monthName || docContent?.header?.monthName || "মাস উল্লেখ নেই";
                  const vNo = docContent?.header?.voucherNo || "-";
                  const totalClaim = doc.totalAmount || docContent?.grandTotalGross || 0;
                  const netAmount = doc.netPayable || docContent?.netPayable || totalClaim;
                  const isCurrent = currentDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 hover:shadow-md ${
                        isCurrent ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20" : "border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                📅 {mName}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  ✓ বর্তমান বিল
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mt-1">{doc.title}</h4>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {officerName} {offDesignation ? `(${offDesignation})` : ""}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0">
                            ভাউচার: {vNo}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-xl">
                            <span className="text-slate-400 block text-[10px]">ভ্রমণ সংখ্যা</span>
                            <span className="font-bold text-slate-700">{toBn(journeyCount)} টি ভ্রমণ</span>
                          </div>
                          <div className="bg-emerald-50 p-2.5 rounded-xl">
                            <span className="text-emerald-600 block text-[10px]">নীট পরিশোধযোগ্য দাবি</span>
                            <span className="font-black text-emerald-900">৳{toBn(Number(netAmount).toFixed(2))}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-2.5 flex items-center justify-between">
                          <span>সংরক্ষিত তারিখ: {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("bn-BD") : (doc.updatedAt || "-")}</span>
                          <span className="text-emerald-700 font-bold">ডাটাবেজে সংরক্ষিত ✓</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleLoadDoc(doc, "preview")}
                          className="flex-1 min-w-[120px] px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          title="সরাসরি বিল চেক ও প্রিভিউ দেখুন"
                        >
                          <Eye size={14} />
                          <span>বিল চেক করুন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadDoc(doc, "preview", true)}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                          title="সরাসরি লিগ্যাল পেজে প্রিন্ট করুন"
                        >
                          <Printer size={14} />
                          <span>প্রিন্ট</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadDoc(doc, "form")}
                          className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="এন্ট্রি ফর্মে লোড করে এডিট বা পরিবর্তন করুন"
                        >
                          <Edit2 size={13} />
                          <span>এডিট</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDoc(doc.id, e)}
                          className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="ডাটাবেজ হতে মুছে ফেলুন"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Saved Documents Modal */}
        {showPreviewModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen size={18} className="text-indigo-600" />
                  <h3 className="text-base font-black text-slate-800">সংরক্ষিত ভ্রমণ বিলসমূহ</h3>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {savedDocs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">কোনো সংরক্ষিত বিল পাওয়া যায়নি।</div>
                ) : (
                  savedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-800">{doc.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">সংরক্ষিত তারিখ: {doc.createdAt || doc.updatedAt}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadDoc(doc, "preview")}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>চেক করুন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadDoc(doc, "form")}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          এডিট
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDoc(doc.id, e)}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
