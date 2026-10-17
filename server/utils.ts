import DOMPurify from "isomorphic-dompurify";

export const ALLOWED_HTML_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "hr",
  "s", "strike", "sub", "sup", "font", "blockquote", "pre", "code",
  "img", "svg", "path", "circle", "rect", "line", "g", "polygon", "polyline"
];

export const ALLOWED_HTML_ATTR = [
  "style", "colspan", "rowspan", "align", "valign",
  "width", "height", "border", "cellpadding", "cellspacing",
  "color", "face", "size", "class", "id",
  "src", "alt", "viewBox", "xmlns", "cx", "cy", "r", "d",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "transform"
];

export function sanitizeHtmlServer(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_HTML_TAGS,
    ALLOWED_ATTR: ALLOWED_HTML_ATTR,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "applet"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
    ALLOW_DATA_ATTR: false,
  });
}

// ----------------------------------------------------
// In-Memory Mutex / Queue for Per-Sheet Concurrency Lock
// ----------------------------------------------------
export class AsyncMutex {
  private queue: Promise<any> = Promise.resolve();

  dispatch<T>(fn: () => Promise<T> | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue
        .catch(() => {})
        .then(async () => {
          try {
            const res = await fn();
            resolve(res);
          } catch (err) {
            reject(err);
          }
        });
    });
  }
}

export const sheetLocks: Map<string, AsyncMutex> = new Map();

export function getSheetLock(sheetName: string): AsyncMutex {
  if (!sheetLocks.has(sheetName)) {
    sheetLocks.set(sheetName, new AsyncMutex());
  }
  return sheetLocks.get(sheetName)!;
}

export function withSheetLock<T>(sheetNames: string | string[], fn: () => Promise<T> | T): Promise<T> {
  const sheets = Array.from(new Set(Array.isArray(sheetNames) ? sheetNames : [sheetNames])).sort();
  if (sheets.length === 1) {
    return getSheetLock(sheets[0]).dispatch(fn);
  }
  
  const runChain = (index: number): Promise<T> => {
    if (index >= sheets.length) {
      return Promise.resolve().then(fn);
    }
    return getSheetLock(sheets[index]).dispatch(() => runChain(index + 1));
  };
  return runChain(0);
}

// ----------------------------------------------------
// Bengali Number & String Formatting Utilities
// ----------------------------------------------------
export function convertToBengaliNumber(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
}

export const bnWords1To99 = [
  "", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ",
  "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ", "বিশ",
  "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আটাশ", "ঊনত্রিশ", "ত্রিশ",
  "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "ঊনচল্লিশ", "চল্লিশ",
  "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "ঊনপঞ্চাশ", "পঞ্চাশ",
  "একান্ন", "বায়ান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "ঊনষাট", "ষাট",
  "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "ঊনসত্তর", "সত্তর",
  "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "ঊনআশি", "আশি",
  "একআশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "অষ্টআশি", "ঊননব্বই", "নব্বই",
  "একানব্বই", "বানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই"
];

export function numberToBengaliWords(num: number): string {
  if (num === 0) return "শূন্য";
  
  function convertLessThanOneThousand(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (n >= 100) {
      const h = Math.floor(n / 100);
      str += (bnWords1To99[h] || "") + " শত ";
      n %= 100;
    }
    if (n > 0 && n < 100) {
      str += bnWords1To99[n] || "";
    }
    return str.trim();
  }

  function convert(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (n >= 10000000) {
      str += convert(Math.floor(n / 10000000)) + " কোটি ";
      n %= 10000000;
    }
    if (n >= 100000) {
      str += convert(Math.floor(n / 100000)) + " লক্ষ ";
      n %= 100000;
    }
    if (n >= 1000) {
      str += convert(Math.floor(n / 1000)) + " হাজার ";
      n %= 1000;
    }
    if (n > 0) {
      str += convertLessThanOneThousand(n);
    }
    return str.trim();
  }
  
  return convert(num);
}

export function formatQtyWithBengaliWord(qty: number, unit: string = "টি"): string {
  const num = Math.round(Number(qty) || 1);
  const numStr = num < 10 ? `০${convertToBengaliNumber(num)}` : convertToBengaliNumber(num);
  const word = numberToBengaliWords(num);
  return `${numStr} (${word}) ${unit}`;
}

export function formatItemsListText(quotationItems: any[]): string {
  if (!quotationItems || quotationItems.length === 0) return "পণ্যের বিবরণ";
  const parts = quotationItems.map(qi => {
    const qty = Number(qi.qty || qi.quantity || 1);
    const unit = qi.unit || "টি";
    const qtyFormatted = formatQtyWithBengaliWord(qty, unit);
    let desc = (qi.itemDescription || qi.description || qi.name || "").trim();
    desc = desc.replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "").trim();
    if (qi.model && !desc.includes(qi.model)) {
      desc = `${desc} (${qi.model})`;
    }
    return `${qtyFormatted} ${desc}`;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ও ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} ও ${parts[parts.length - 1]}`;
}

export function formatDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return parts[2] + "-" + parts[1] + "-" + parts[0];
  }
  return dateStr;
}

export function isRepairWork(text?: string | null): boolean {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return (
    lower.includes("মেরামত") ||
    lower.includes("সার্ভিসিং") ||
    lower.includes("রক্ষণাবেক্ষণ") ||
    lower.includes("সংস্কার")
  );
}

export function isBranchOffice(office?: any): boolean {
  if (!office) return true;
  const name = String(office.name || "").trim().toLowerCase();
  const type = String(office.type || "").trim();

  if (name.includes("শাখা") || name.includes("branch")) return true;

  if (
    type === "HeadOffice" ||
    name.includes("প্রধান কার্যালয়") ||
    name.includes("প্রধান কার্যালয়") ||
    name.includes("আঞ্চলিক কার্যালয়") ||
    name.includes("আঞ্চলিক কার্যালয়") ||
    name.includes("বিভাগীয় কার্যালয়") ||
    name.includes("বিভাগীয় কার্যালয়") ||
    name.includes("নিরীক্ষা কার্যালয়") ||
    name.includes("নিরীক্ষা কার্যালয়")
  ) {
    return false;
  }

  if (type === "SubOffice" || type === "Branch" || type === "suboffice" || type === "branch") {
    return true;
  }

  return true;
}

export function toBnDigits(val: any): string {
  if (val === null || val === undefined) return "";
  return convertToBengaliNumber(val);
}

export function isCategory134(category: any): boolean {
  if (!category) return false;
  const str = `${category.code || ""} ${category.budgetHead || ""} ${category.name || ""}`.toLowerCase();
  return (
    /134\s*\/\s*(?:0?[1-5])/i.test(str) ||
    /১৩৪\s*\/\s*(?:০?[১-৫])/i.test(str) ||
    str.includes("134/1") ||
    str.includes("134/2") ||
    str.includes("134/3") ||
    str.includes("134/4") ||
    str.includes("134/5") ||
    str.includes("134/01") ||
    str.includes("134/02") ||
    str.includes("134/03") ||
    str.includes("134/04") ||
    str.includes("134/05") ||
    str.includes("১৩৪/১") ||
    str.includes("১৩৪/২") ||
    str.includes("১৩৪/৩") ||
    str.includes("১৩৪/৪") ||
    str.includes("১৩৪/৫") ||
    str.includes("১৩৪/০১") ||
    str.includes("১৩৪/০২") ||
    str.includes("১৩৪/০৩") ||
    str.includes("১৩৪/০৪") ||
    str.includes("১৩৪/০৫") ||
    str.includes("আসবাবপত্র")
  );
}

export function computeExpenseAmounts(
  itemOrAmount: any,
  vatRateInput: number = 0,
  taxRateInput: number = 0,
) {
  let base = 0;
  let vRate = 0;
  let tRate = 0;
  let explicitGross = 0;
  let hasMusok = false;
  let quotationItems: any[] | undefined = undefined;

  if (typeof itemOrAmount === "object" && itemOrAmount !== null) {
    quotationItems = itemOrAmount.quotationItems;
    hasMusok =
      itemOrAmount.hasStockChalan === "হ্যাঁ" ||
      (Number(itemOrAmount.taxRate) === 0 && itemOrAmount.hasStockChalan !== "না");
    vRate = Number(itemOrAmount.vatRate ?? vatRateInput) || 0;
    tRate = hasMusok ? 0 : (Number(itemOrAmount.taxRate ?? taxRateInput) || 0);

    if (
      itemOrAmount.baseAmount !== undefined &&
      itemOrAmount.baseAmount !== null &&
      Number(itemOrAmount.baseAmount) > 0
    ) {
      base = Number(itemOrAmount.baseAmount);
    } else if (Array.isArray(quotationItems) && quotationItems.length > 0) {
      const itemsSum = quotationItems.reduce(
        (sum: number, it: any) =>
          sum +
          (Number(it.totalPrice) ||
            Number(it.qty || 1) * Number(it.unitPrice || 0)),
        0,
      );
      if (itemsSum > 0) {
        base = itemsSum;
      }
    }

    if (!base && itemOrAmount.baseAmount !== undefined && itemOrAmount.baseAmount !== null) {
      base = Number(itemOrAmount.baseAmount) || 0;
    }

    explicitGross = Number(itemOrAmount.grossAmount || itemOrAmount.amount || 0);
  } else {
    base = Number(itemOrAmount) || 0;
    vRate = Number(vatRateInput) || 0;
    tRate = Number(taxRateInput) || 0;
    explicitGross = base;
  }

  const vatAmount =
    typeof itemOrAmount === "object" &&
    itemOrAmount !== null &&
    itemOrAmount.vatAmount !== undefined &&
    itemOrAmount.vatAmount !== null
      ? Math.round(Number(itemOrAmount.vatAmount))
      : Math.round((base * vRate) / 100);
  const taxAmount = hasMusok
    ? 0
    : typeof itemOrAmount === "object" &&
        itemOrAmount !== null &&
        itemOrAmount.taxAmount !== undefined &&
        itemOrAmount.taxAmount !== null
      ? Math.round(Number(itemOrAmount.taxAmount))
      : Math.round((base * tRate) / 100);
  const calculatedGross = Math.round(base + vatAmount + taxAmount);
  const grossAmount = explicitGross > 0 ? explicitGross : calculatedGross;
  const netPayable = Math.round(grossAmount - (hasMusok ? 0 : vatAmount) - taxAmount);

  return {
    baseAmount: base > 0 ? base : grossAmount,
    vatRate: vRate,
    vatAmount,
    taxRate: tRate,
    taxAmount,
    netPayable,
    grossAmount,
    amount: grossAmount,
  };
}

export function detectFileTypeFromMagicBytes(buffer: Buffer): { ext: string; mime: string } | null {
  if (!buffer || buffer.length < 4) return null;

  // PDF check: %PDF (0x25, 0x50, 0x44, 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { ext: "pdf", mime: "application/pdf" };
  }

  // PNG check: \x89PNG (0x89, 0x50, 0x4E, 0x47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }

  // JPEG/JPG check: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // WebP check: RIFF....WEBP (0x52, 0x49, 0x46, 0x46 and 0x57, 0x45, 0x42, 0x50 at offset 8)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer.length >= 12) {
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return { ext: "webp", mime: "image/webp" };
    }
  }

  // GIF check: GIF (0x47, 0x49, 0x46)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { ext: "gif", mime: "image/gif" };
  }

  // DOCX / PK zip check: 0x50 0x4B 0x03 0x04
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }

  return null;
}
