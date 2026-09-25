import {
  convertToBengaliNumber,
  numberToBengaliWords,
  formatQtyWithBengaliWord,
  formatItemsListText,
  formatDateToDDMMYYYY,
  isRepairWork,
  isBranchOffice,
  toBnDigits,
  sanitizeHtmlServer,
} from "./utils.js";
import { getSheetData } from "./data-store.js";

export function generateQuotationBiddersTableHtml(
  expense: any,
  vatTaxMultiplier: number,
  taxVatStr: string,
): {
  biddersHtml: string;
  lowestBidderName: string;
  totalBiddersCount: number;
  isMultipleItems: boolean;
} {
  const quotationItems = expense.quotationItems || [];
  const isMultipleItems = quotationItems.length > 1;
  const totalItemsCount = quotationItems.reduce(
    (acc: number, item: any) => acc + Number(item.qty || 0),
    0,
  );
  const showUnitPriceCol = totalItemsCount > 1;
  const formattedItems = formatItemsListText(quotationItems);

  let biddersHtml = "";
  let lowestBidderName = expense.supplyRecipientOrgName || "";
  let totalBiddersCount = 3;

  if (isMultipleItems) {

    const bidderMap: Map<string, { name: string; index: number }> = new Map();
    quotationItems.forEach((item: any) => {
      (item.suppliers || []).forEach((s: any, sIdx: number) => {
        const rawName = (s.nameAndAddress || "").trim();
        const key = rawName || `supplier_slot_${sIdx}`;
        if (!bidderMap.has(key)) {
          bidderMap.set(key, { name: rawName, index: sIdx });
        }
      });
    });

    const biddersList = Array.from(bidderMap.entries()).map(([key, info]) => {
      let grandTotal = 0;
      const itemRates: { unitPrice: number; totalPrice: number }[] = [];

      quotationItems.forEach((item: any) => {
        const q = Number(item.qty || 1);
        const matchingSup =
          (item.suppliers || []).find(
            (s: any) => (s.nameAndAddress || "").trim() === key,
          ) || (item.suppliers || [])[info.index];

        const baseUnit = Number(matchingSup?.unitPrice || 0);
        const uPrice = baseUnit * vatTaxMultiplier;
        const tPrice = q * uPrice;

        grandTotal += tPrice;
        itemRates.push({
          unitPrice: uPrice,
          totalPrice: tPrice,
        });
      });

      return {
        key,
        name: info.name,
        index: info.index,
        grandTotal,
        itemRates,
      };
    });

    biddersList.sort((a, b) => a.grandTotal - b.grandTotal);
    totalBiddersCount = biddersList.length || 3;

    if (biddersList.length > 0 && !lowestBidderName) {
      lowestBidderName = biddersList[0].name;
    }

    const biddersCount = biddersList.length || 3;
    let slWidth = 4;
    let descWidth = 34;
    let qtyWidth = 6.5;
    if (biddersCount <= 2) {
      slWidth = 4.5;
      descWidth = 38.5;
      qtyWidth = 7;
    } else if (biddersCount >= 4) {
      slWidth = 3.5;
      descWidth = 28.5;
      qtyWidth = 6;
    }
    const remainingWidth = 100 - (slWidth + descWidth + qtyWidth);
    const rateColWidth = (remainingWidth / (biddersCount * 2)).toFixed(2);

    biddersHtml = `
      <table class="quotation-bidders-table" border="1" style="width: 100%; max-width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 10pt; border: 1pt solid black; font-size: 9.5pt; table-layout: fixed; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
        <colgroup>
          <col style="width: ${slWidth}%;">
          <col style="width: ${descWidth}%;">
          <col style="width: ${qtyWidth}%;">
          ${biddersList
            .map(
              () => `
            <col style="width: ${rateColWidth}%;">
            <col style="width: ${rateColWidth}%;">
          `,
            )
            .join("")}
        </colgroup>
        <thead>
          <tr style="page-break-inside: avoid; break-inside: avoid; background-color: #f8fafc;">
            <th rowspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">ক্রম</th>
            <th rowspan="2" style="border: 1pt solid black; padding: 4pt 4pt; text-align: center; font-size: 9.5pt;">পণ্যের বিবরণ</th>
            <th rowspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">পরিমান</th>
            ${biddersList
              .map(
                (b, bIdx) => `
              <th colspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-weight: bold; font-size: 9.5pt; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">
                ${b.name || `দরদাতা প্রতিষ্ঠান ${convertToBengaliNumber(bIdx + 1)}`}
              </th>
            `,
              )
              .join("")}
          </tr>
          <tr style="page-break-inside: avoid; break-inside: avoid; background-color: #f8fafc;">
            ${biddersList
              .map(
                () => `
              <th style="border: 1pt solid black; padding: 3pt 1.5pt; text-align: center; white-space: nowrap; font-size: 8.5pt;">একক দর</th>
              <th style="border: 1pt solid black; padding: 3pt 1.5pt; text-align: center; white-space: nowrap; font-size: 8.5pt;">মোট মূল্য</th>
            `,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${quotationItems
            .map((item: any, iIdx: number) => {
              const sl = convertToBengaliNumber(iIdx + 1);
              let itemDesc = (
                item.itemDescription ||
                item.description ||
                ""
              ).trim();
              itemDesc = itemDesc
                .replace(
                  /^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i,
                  "",
                )
                .trim();
              if (item.model && !itemDesc.includes(item.model)) {
                itemDesc = `${itemDesc} (${item.model})`;
              } else if (
                item.specification &&
                !itemDesc.includes(item.specification)
              ) {
                itemDesc = `${itemDesc} (${item.specification})`;
              }
              const qtyStr = `${convertToBengaliNumber(item.qty || 1)} ${item.unit || "টি"}`;

              return `
              <tr style="page-break-inside: avoid; break-inside: avoid;">
                <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">০${sl}</td>
                <td style="border: 1pt solid black; padding: 3.5pt 4pt; font-size: 9.5pt; line-height: 1.45; word-wrap: break-word; overflow-wrap: break-word;">${itemDesc}</td>
                <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">${qtyStr}</td>
                ${biddersList
                  .map((b) => {
                    const rate = b.itemRates[iIdx];
                    const uPrc = rate ? rate.unitPrice : 0;
                    const tPrc = rate ? rate.totalPrice : 0;
                    const uStr =
                      uPrc > 0
                        ? convertToBengaliNumber(
                            (uPrc % 1 === 0
                              ? uPrc
                              : Math.round(uPrc)
                            ).toLocaleString("en-IN"),
                          )
                        : "-";
                    const tStr =
                      tPrc > 0
                        ? convertToBengaliNumber(
                            Math.round(tPrc).toLocaleString("en-IN"),
                          )
                        : "-";
                    return `
                    <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: right; font-size: 9pt; white-space: nowrap;">${uStr}</td>
                    <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: right; font-size: 9pt; white-space: nowrap;">${tStr}</td>
                  `;
                  })
                  .join("")}
              </tr>
            `;
            })
            .join("")}
          
          <!-- Grand Total Row (merged পণ্যের বিবরণ and পরিমাণ) -->
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1pt solid black; padding: 4pt 2pt;"></td>
            <td colspan="2" style="border: 1pt solid black; padding: 4pt 6pt; text-align: right; font-weight: bold; font-size: 9.5pt; word-wrap: break-word; overflow-wrap: break-word;">
              ${taxVatStr.endsWith("সহ") || taxVatStr.endsWith("ব্যতীত") ? taxVatStr : taxVatStr + " সহ"} সর্বমোট মূল্য:
            </td>
            ${biddersList
              .map(
                (b) => `
              <td colspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-weight: bold; font-size: 9.5pt; white-space: nowrap;">
                ${convertToBengaliNumber(Math.round(b.grandTotal).toLocaleString("en-IN"))}
              </td>
            `,
              )
              .join("")}
          </tr>
          
          <!-- Remarks / Lowest Bidder Row (merged পণ্যের বিবরণ and পরিমাণ) -->
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1pt solid black; padding: 3.5pt 2pt;"></td>
            <td colspan="2" style="border: 1pt solid black; padding: 3.5pt 6pt; text-align: right; font-weight: bold; font-size: 9.5pt;">মন্তব্য:</td>
            ${biddersList
              .map((_, bIdx) => {
                let remarks = "";
                if (bIdx === 0) remarks = "সর্বনিম্ন দরদাতা";
                else if (bIdx === biddersList.length - 1)
                  remarks = "সর্বোচ্চ দরদাতা";
                else if (bIdx === 1) remarks = "২য় সর্বোচ্চ দরদাতা";
                else remarks = `${convertToBengaliNumber(bIdx + 1)}ম দরদাতা`;

                return `
                <td colspan="2" style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: center; font-weight: bold; font-size: 9.5pt; white-space: nowrap;">
                  ${remarks}
                </td>
              `;
              })
              .join("")}
          </tr>
        </tbody>
      </table>
    `;
  } else {

    const supplierUnitTotals: Record<string, number> = {};
    const supplierTotals: Record<string, number> = {};
    let totalQty = 0;

    quotationItems.forEach((item: any) => {
      const q = Number(item.qty || 1);
      totalQty += q;
      (item.suppliers || []).forEach((s: any) => {
        const name = (s.nameAndAddress || "").trim();
        if (name) {
          if (!supplierTotals[name]) {
            supplierTotals[name] = 0;
            supplierUnitTotals[name] = 0;
          }
          const uPrice = Number(s.unitPrice || 0) * vatTaxMultiplier;
          const tPrice =
            (s.totalPrice || q * Number(s.unitPrice || 0)) * vatTaxMultiplier;
          supplierTotals[name] += tPrice;
          supplierUnitTotals[name] += uPrice;
        }
      });
    });

    const entries = Object.entries(supplierTotals);
    if (entries.length === 0) {
      const billAmount = Number(expense.grossAmount || expense.amount || 0);
      const sup1 =
        expense.supplyRecipientOrgName ||
        expense.supplierOrg1 ||
        expense.applicant?.institutionName ||
        expense.applicant?.name ||
        "মেসার্স জননী এজেন্সী, বনরুপা, রাঙ্গামাটি";
      const sup2 =
        expense.supplierOrg2 ||
        "মেসার্স মায়ের দোয়া ট্রেডার্স, ফিসারীঘাট, রাঙ্গামাটি";
      const sup3 =
        expense.supplierOrg3 ||
        "মেসার্স আজমীর কর্পোরেশন, রিজার্ভ বাজার, রাঙ্গামাটি";

      const p1 = billAmount > 0 ? billAmount : 13750;
      const p2 = Math.round(p1 * 1.048);
      const p3 = Math.round(p1 * 1.115);

      entries.push([sup1, p1]);
      entries.push([sup2, p2]);
      entries.push([sup3, p3]);

      supplierTotals[sup1] = p1;
      supplierTotals[sup2] = p2;
      supplierTotals[sup3] = p3;
      supplierUnitTotals[sup1] = p1;
      supplierUnitTotals[sup2] = p2;
      supplierUnitTotals[sup3] = p3;
      lowestBidderName = sup1;
      totalBiddersCount = 3;
    }

    if (!lowestBidderName && entries.length > 0) {
      const minEntry = entries.reduce(
        (min, cur) => (cur[1] < min[1] ? cur : min),
        entries[0],
      );
      lowestBidderName = minEntry[0];
    }
    totalBiddersCount = entries.length || 3;

    if (entries.length > 0) {
      entries.sort((a, b) => a[1] - b[1]);
      const displayItemDesc =
        formattedItems && formattedItems !== "পণ্যের বিবরণ"
          ? formattedItems
          : expense.description || "দ্রব্যাদি / সেবা সরবরাহ";

      biddersHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1.5px solid #000; font-size: inherit; table-layout: auto; page-break-inside: avoid; break-inside: avoid;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #000; page-break-inside: avoid; break-inside: avoid;">
              <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 8%;">ক্রম</th>
              <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 26%;">পণ্যের বিবরণ</th>
              <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 34%;">দরপত্র দাতা প্রতিষ্ঠানের নাম</th>
              ${showUnitPriceCol ? `<th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 20%;">${taxVatStr} একক মূল্য</th>` : ""}
              <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 20%;">${taxVatStr} মোট মূল্য</th>
              <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 12%;">মন্তব্য</th>
            </tr>
          </thead>
          <tbody>
      `;

      entries.forEach((entry, idx) => {
        const name = entry[0];
        const totalPrc = entry[1];
        const unitPrc = supplierUnitTotals[name] || totalPrc / (totalQty || 1);
        const sl = convertToBengaliNumber(idx + 1);
        const prodDesc =
          idx === 0
            ? `<td rowspan="${entries.length}" style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: top;">${displayItemDesc}</td>`
            : "";
        const unitAmountStr = `= ${convertToBengaliNumber(unitPrc.toLocaleString("en-IN"))}/-`;
        const amountStr = `= ${convertToBengaliNumber(totalPrc.toLocaleString("en-IN"))}/-`;

        let remarks = "";
        if (idx === 0) remarks = "সর্বনিম্ন দরদাতা";
        else if (idx === entries.length - 1) remarks = "সর্বোচ্চ দরদাতা";
        else if (idx === 1) remarks = "২য় সর্বোচ্চ দরদাতা";
        else remarks = "";

        const priceStyle =
          idx === 0 ? "font-weight: bold;" : "font-weight: bold;";

        biddersHtml += `
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">০${sl}</td>
            ${prodDesc}
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">${name}</td>
            ${showUnitPriceCol ? `<td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">${unitAmountStr}</td>` : ""}
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle; ${priceStyle}">${amountStr}</td>
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">${remarks}</td>
          </tr>
        `;
      });
      biddersHtml += `</tbody></table>`;
    }
  }

  return { biddersHtml, lowestBidderName, totalBiddersCount, isMultipleItems };
}

export function generateBudgetProvisionTableHtml(
  balanceInfo: any,
  category: any,
  financialYear: any,
  currentBill: number,
  previousExpense: number,
  remainingBalance: number,
): string {
  const budgetHeadDisplay = category?.budgetHead
    ? convertToBengaliNumber(category.budgetHead)
    : category?.code
      ? convertToBengaliNumber(category.code)
      : "-";
  const fyText = financialYear ? financialYear.name : "";

  let budgetHtml = `
    <table class="budget-provision-table" style="width: 100%; border-collapse: collapse; margin-top: 14pt; margin-bottom: 12pt; font-size: inherit; page-break-inside: avoid; break-inside: avoid; border: none !important; table-layout: auto;">
      <tbody>
  `;

  if (balanceInfo.provisionAmount > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">প্রভিশন</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.provisionAmount.toLocaleString("en-IN"))}/-</td>
      </tr>
    `;
  }

  budgetHtml += `
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">${category?.name || ""} (${budgetHeadDisplay}) খাতে ${convertToBengaliNumber(fyText)} অর্থ বছরে বাজেট বরাদ্দ</td>
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.initialBudget.toLocaleString("en-IN"))}/-</td>
    </tr>
  `;

  if (balanceInfo.provisionAmount > 0 && balanceInfo.additionalBudget > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">মোট বরাদ্দ</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber((balanceInfo.initialBudget + balanceInfo.provisionAmount).toLocaleString("en-IN"))}/-</td>
      </tr>
    `;
  }

  if (balanceInfo.additionalBudget > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">অতিরিক্ত বরাদ্দ</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.additionalBudget.toLocaleString("en-IN"))}/-</td>
      </tr>
    `;
  }

  if (balanceInfo.provisionAmount > 0 || balanceInfo.additionalBudget > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">সর্বমোট বাজেট</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.totalAllocated.toLocaleString("en-IN"))}/-</td>
      </tr>
    `;
  }

  budgetHtml += `
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">অত্র খরচসহ সর্বমোট খরচের পরিমাণ (${convertToBengaliNumber(previousExpense.toLocaleString("en-IN"))} + ${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))})/-</td>
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; border-bottom: 1.5px solid #000 !important; white-space: nowrap;">= ${convertToBengaliNumber((previousExpense + currentBill).toLocaleString("en-IN"))}/-</td>
    </tr>
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td style="border: none !important; padding: 6px 8px; font-size: inherit; text-align: right; padding-right: 12px; font-weight: bold; white-space: nowrap;">এ খাতে অবশিষ্ট বাজেটের পরিমাণ</td>
      <td style="border: none !important; padding: 6px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: bold; border-bottom: 3px double #000 !important; white-space: nowrap;">= ${convertToBengaliNumber(remainingBalance.toLocaleString("en-IN"))}/-</td>
    </tr>
  `;
  budgetHtml += `</tbody></table>`;
  return budgetHtml;
}

export function getBankPadHeaderHtml(officeName?: string): string {
  const settingsList = getSheetData("Settings");
  const appSettings =
    settingsList && settingsList.length > 0 ? settingsList[0] : null;
  const logoUrl = appSettings?.logoUrl;

  const logoElement =
    logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== ""
      ? `<img src="${logoUrl}" alt="Logo" style="max-height: 55px; max-width: 65px; object-fit: contain; display: block;" />`
      : `<svg width="55" height="55" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" stroke-width="6"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" stroke-width="1.5" stroke-dasharray="3,2"/>
        <path d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82" fill="none" stroke="#006a4e" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="22" r="3" fill="#f42a41"/>
      </svg>`;

  const rawInstName = appSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক";
  const cleanedInstName =
    rawInstName
      .replace(/\/Bangladesh Krishi Bank/gi, "")
      .replace(/\/[\s]*[a-zA-Z\s]+/g, "")
      .trim() || "বাংলাদেশ কৃষি ব্যাংক";

  const displayOffice = officeName || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 12px; width: 100%;">
      <div style="width: 70px; display: flex; align-items: center; justify-content: flex-start;">
        ${logoElement}
      </div>
      <div style="flex: 1; text-align: center; padding: 0 10px;">
        <div style="font-size: 20pt; font-weight: bold; color: #000; line-height: 1.1;">${cleanedInstName}</div>
        <div style="font-size: 12.5pt; font-weight: bold; color: #000; margin-top: 2px;">${displayOffice}</div>
      </div>
      <div style="width: 125px; text-align: right; line-height: 1.2;">
        <div style="font-size: 10.5pt; font-weight: bold; color: #000;">গণমানুষের ব্যাংক</div>
        <div style="font-size: 8.5pt; color: #222; margin-top: 2px;">www.krishibank.gov.bd</div>
      </div>
    </div>
  `;
}

export function getBankWatermarkHtml(): string {
  const settingsList = getSheetData("Settings");
  const appSettings =
    settingsList && settingsList.length > 0 ? settingsList[0] : null;
  const logoUrl = appSettings?.logoUrl;

  const logoWatermarkContent =
    logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== ""
      ? `<img src="${logoUrl}" alt="Watermark" style="max-height: 280px; max-width: 280px; width: 280px; height: 280px; object-fit: contain; filter: grayscale(100%); opacity: 0.07; display: block;" />`
      : `<svg width="280" height="280" viewBox="0 0 100 100" style="opacity: 0.065; display: block;">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#006a4e" stroke-width="5"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#006a4e" stroke-width="1.5" stroke-dasharray="3,2"/>
        <path d="M 50 16 L 50 84 M 32 30 C 40 45 40 60 50 78 M 68 30 C 60 45 60 60 50 78 M 25 50 C 38 52 45 65 50 82 M 75 50 C 62 52 55 65 50 82" fill="none" stroke="#006a4e" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="22" r="3" fill="#f42a41"/>
      </svg>`;

  return `
    <div class="watermark-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 0; user-select: none; display: flex; align-items: center; justify-content: center;">
      ${logoWatermarkContent}
    </div>
  `;
}

export function getBudgetHeadForExpense(expense: any, category: any): string {
  const categoriesList = getSheetData("Categories");
  let cat = category;
  if (!cat && expense?.categoryId) {
    cat = categoriesList.find(
      (c: any) =>
        c.id === expense.categoryId ||
        c.code?.toLowerCase() === expense.categoryId.toLowerCase(),
    );
  }
  if (!cat && expense?.debitAccount) {
    cat = categoriesList.find(
      (c: any) =>
        c.id?.toLowerCase() === expense.debitAccount.toLowerCase() ||
        c.code?.toLowerCase() === expense.debitAccount.toLowerCase() ||
        c.budgetHead === expense.debitAccount ||
        c.name === expense.debitAccount,
    );
  }
  if (cat && cat.budgetHead) {
    return toBnDigits(cat.budgetHead);
  }
  if (expense?.debitAccount) {
    const match = expense.debitAccount.match(/cat[-_]?([0-9]+)/i);
    if (match) {
      const c = categoriesList.find(
        (item: any) =>
          item.id === `cat-${match[1]}` || item.code === `CAT-${match[1]}`,
      );
      if (c && c.budgetHead) return toBnDigits(c.budgetHead);
    }
    if (expense.debitAccount.includes("/")) {
      return toBnDigits(expense.debitAccount);
    }
  }
  if (expense?.categoryId) {
    const match = expense.categoryId.match(/cat[-_]?([0-9]+)/i);
    if (match) {
      const c = categoriesList.find(
        (item: any) =>
          item.id === `cat-${match[1]}` || item.code === `CAT-${match[1]}`,
      );
      if (c && c.budgetHead) return toBnDigits(c.budgetHead);
    }
  }
  return "১৩৪/০৫";
}

export function generateForm1ForwardingHtml(
  expense: any,
  office: any,
  category: any,
  _financialYear?: any,
  _balanceInfo?: any,
): string {
  const hasMusok =
    expense.hasStockChalan === "হ্যাঁ" ||
    (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);

  const budgetHeadAcc = getBudgetHeadForExpense(expense, category);

  const quotationItems = expense.quotationItems || [];
  const baseAmt = Number(
    expense.baseAmount ||
      quotationItems.reduce(
        (acc: number, item: any) =>
          acc +
          (Number(item.totalPrice) ||
            Number(item.qty || 1) * Number(item.unitPrice || 0)),
        0,
      ),
  );
  const calcVat = Number(expense.vatAmount || (baseAmt * vatRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * taxRate) / 100);
  const currentBill = Number(
    expense.grossAmount || expense.amount || baseAmt + calcVat + calcTax,
  );
  const netPayable = Number(
    expense.netPayable || currentBill - (hasMusok ? 0 : calcVat) - calcTax,
  );
  const amountWords = numberToBengaliWords(Math.round(currentBill));
  const netPayableWords = numberToBengaliWords(Math.round(netPayable));

  const itemsListForParagraph = quotationItems.map((qi: any) => {
    const q = Number(qi.qty || qi.quantity || 1);
    const u = qi.unit || "টি";
    let d = (qi.itemDescription || qi.description || qi.name || "").trim();
    d = d
      .replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "")
      .trim();
    if (qi.model && !d.includes(qi.model)) {
      d = `${d} (${qi.model})`;
    }
    return `${toBnDigits(q)}${u} ${d}`;
  });
  const itemsSummaryForParagraph =
    itemsListForParagraph.length === 1
      ? itemsListForParagraph[0]
      : itemsListForParagraph.length === 2
        ? `${itemsListForParagraph[0]} ও ${itemsListForParagraph[1]}`
        : `${itemsListForParagraph.slice(0, -1).join(", ")} ও ${itemsListForParagraph[itemsListForParagraph.length - 1]}`;

  const formattedItems = formatItemsListText(quotationItems);

  const supplierOrgName =
    expense.supplyRecipientOrgName ||
    expense.supplierOrg1 ||
    "রূপার মেটাল ইন্ডাস্ট্রিজ লিমিটেড, প্রাণ-আর এফ এল সেন্টার, প্রগতি সরণি, মধ্য বাড্ডা, ঢাকা";
  let forwardingNo =
    expense.memoForwardingNo || "আঃ কাঃ (বাংলা) প্রশা-১(৪৭)/২০২৫-২০২৬/";
  forwardingNo = forwardingNo.replace(/^(সূত্র\s*নং-|নং-)\s*/, "").trim();
  const forwardingNoFormatted = toBnDigits(forwardingNo);

  const voucherDate = toBnDigits(
    formatDateToDDMMYYYY(
      expense.voucherDate || expense.expenseDate || "২২/০৬/২০২৬",
    ),
  );
  const vatChalanNo =
    expense.vatChalanNo && expense.vatChalanNo !== "না"
      ? expense.vatChalanNo
      : "";
  const totalVatChalanAmount = Number(
    expense.totalVatChalanAmount ||
      expense.vatChalanTotal ||
      expense.vatChalanAmount ||
      calcVat,
  );

  const currentBillStr = toBnDigits(
    currentBill.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  const calcVatStr = toBnDigits(
    calcVat.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  const vatChalanTotalStr = toBnDigits(
    (totalVatChalanAmount || calcVat).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  const calcTaxStr = toBnDigits(
    calcTax.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  const netPayableStr = toBnDigits(
    netPayable.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );

  const isRepair =
    isRepairWork(formattedItems) || isRepairWork(expense.description);

  let paragraph2Text = isRepair
    ? `প্রতিষ্ঠান "${supplierOrgName}" কর্তৃক অত্র অঞ্চলাধীন শাখাসমূহের জন্য ${itemsSummaryForParagraph} কাজ সম্পাদন করতঃ ৳=${currentBillStr} (${amountWords}) টাকার বিল অত্র কার্যালয়ে দাখিল করা হয়েছে।`
    : `সরবরাহকারী প্রতিষ্ঠান "${supplierOrgName}" কর্তৃক অত্র অঞ্চলাধীন শাখাসমূহের জন্য ${itemsSummaryForParagraph} সরবরাহ করতঃ ৳=${currentBillStr} (${amountWords}) টাকার বিল অত্র কার্যালয়ে দাখিল করা হয়েছে।`;
  if (vatChalanNo && vatChalanNo.trim() !== "" && (hasMusok || calcVat > 0)) {
    const vatRateDisplay = vatRate > 0 ? toBnDigits(vatRate) : "১০";
    paragraph2Text += ` উক্ত বিলের ${vatRateDisplay}% ভ্যাট বাবদ ৳=${calcVatStr}, যা ${toBnDigits(vatChalanNo)} নং চালানের মাধ্যমে সরবরাহকারী প্রতিষ্ঠানের বিলের বিপরীতে পরিশোধিত সর্বমোট ভ্যাট বাবদ ৳=${vatChalanTotalStr} এর অন্তর্ভুক্ত (কপি সংযুক্ত)।`;
  }

  const vatRateDisplay = vatRate > 0 ? toBnDigits(vatRate) : "১০";
  const taxRateDisplay =
    taxRate > 0
      ? toBnDigits(taxRate)
      : expense.taxRate
        ? toBnDigits(expense.taxRate)
        : "৫";

  const supplierOrgLabel = isRepair
    ? `প্রতিষ্ঠান "${supplierOrgName}"`
    : `সরবরাহকারী প্রতিষ্ঠান "${supplierOrgName}"`;
  let paragraph3Text = "";
  if (calcVat > 0 && !hasMusok && (!vatChalanNo || vatChalanNo.trim() === "")) {
    paragraph3Text = `প্রাপ্ত ৳=${currentBillStr} (${amountWords}) টাকার বিল হতে ${vatRateDisplay}% ভ্যাট বাবদ ৳=${calcVatStr} এবং ${taxRateDisplay}% উৎসে কর বাবদ ৳=${calcTaxStr} কর্তন করে অবশিষ্ট ৳=${netPayableStr} (${netPayableWords}) টাকা পেমেন্ট অর্ডারের মাধ্যমে ${supplierOrgLabel} বরাবর পরিশোধের জন্য অনুরোধ করা হলো।`;
  } else {
    paragraph3Text = `প্রাপ্ত ৳=${currentBillStr} (${amountWords}) টাকার বিল হতে ${taxRateDisplay}% উৎসে কর বাবদ ৳=${calcTaxStr} কর্তন করে অবশিষ্ট ৳=${netPayableStr} (${netPayableWords}) টাকা পেমেন্ট অর্ডারের মাধ্যমে ${supplierOrgLabel} বরাবর পরিশোধের জন্য অনুরোধ করা হলো।`;
  }

  const itemsCount = quotationItems.length;

  let effectiveBranchEntries: any[] =
    expense.branchEntries &&
    Array.isArray(expense.branchEntries) &&
    expense.branchEntries.length > 0
      ? expense.branchEntries
      : [];

  const realItemsBaseSum = quotationItems.reduce((acc: number, item: any) => {
    return (
      acc +
      (Number(item.totalPrice) ||
        Number(item.qty || 1) * Number(item.unitPrice || 0) ||
        0)
    );
  }, 0);

  const upperItemGrossAmounts: number[] = [];
  let allocatedGrossSum = 0;

  for (let i = 0; i < quotationItems.length; i++) {
    const item = quotationItems[i];
    const itemBase = Number(
      item.totalPrice ||
        Number(item.qty || 1) * Number(item.unitPrice || 0) ||
        0,
    );

    const branchEntriesForItem = effectiveBranchEntries.filter((b: any) => {
      if (
        b.itemIndex !== undefined &&
        b.itemIndex !== null &&
        b.itemIndex !== ""
      ) {
        return Number(b.itemIndex) === i;
      }
      const bDesc = (b.itemDescription || "").trim().toLowerCase();
      const iDesc = (
        item.itemDescription ||
        item.description ||
        item.name ||
        ""
      )
        .trim()
        .toLowerCase();
      const bModel = (b.model || "").trim().toLowerCase();
      const iSpec = (item.specification || item.model || "")
        .trim()
        .toLowerCase();
      return (
        (bDesc && iDesc && (bDesc.includes(iDesc) || iDesc.includes(bDesc))) ||
        (bModel && iSpec && (bModel.includes(iSpec) || iSpec.includes(bModel)))
      );
    });

    const branchSumForItem = branchEntriesForItem.reduce(
      (sum: number, b: any) => sum + Number(b.amount || 0),
      0,
    );

    let gross = 0;
    if (branchSumForItem > 0) {
      gross = branchSumForItem;
    } else if (i === quotationItems.length - 1) {
      gross = Math.max(0, Math.round(currentBill - allocatedGrossSum));
    } else if (realItemsBaseSum > 0) {
      gross = Math.round(currentBill * (itemBase / realItemsBaseSum));
    } else {
      gross = Math.round(itemBase * (1 + (vatRate + taxRate) / 100));
    }

    allocatedGrossSum += gross;
    upperItemGrossAmounts.push(gross);
  }

  const upperTotal = upperItemGrossAmounts.reduce((a, b) => a + b, 0);
  if (upperTotal !== currentBill && upperItemGrossAmounts.length > 0) {
    const diff = currentBill - upperTotal;
    upperItemGrossAmounts[upperItemGrossAmounts.length - 1] += diff;
  }

  if (effectiveBranchEntries.length === 0 && quotationItems.length > 0) {
    const defaultRegionalBranches = [
      { name: "কাপ্তাই শাখা", code: "3301" },
      { name: "রাইখালী বাজার শাখা", code: "3302" },
      { name: "কাউখালী শাখা", code: "3505" },
      { name: "বাঘাইছড়ি শাখা", code: "3507" },
    ];
    effectiveBranchEntries = quotationItems.map((item: any, idx: number) => {
      const bInfo =
        defaultRegionalBranches[idx % defaultRegionalBranches.length];
      const itemGross =
        upperItemGrossAmounts[idx] !== undefined
          ? upperItemGrossAmounts[idx]
          : Math.round(
              Number(item.totalPrice || 0) * (1 + (vatRate + taxRate) / 100),
            );
      return {
        branchName: `${bInfo.name} (${bInfo.code})`,
        itemIndex: idx,
        itemDescription:
          item.itemDescription || item.description || item.name || "",
        qty: item.qty || item.quantity || 1,
        unit: item.unit || "টি",
        amount: itemGross,
        model: item.model || item.specification || "",
      };
    });
  }

  const creditLines = [
    { account: "৪৭ (পে-অর্ডার)", amount: netPayable, isDash: false },
    {
      account: `৪১/১৭১ (${vatRateDisplay}% ভ্যাট)`,
      amount: hasMusok ? 0 : calcVat,
      isDash: hasMusok,
    },
    ...(calcTax > 0
      ? [
          {
            account: `৪১/১৭১-এ (${taxRateDisplay}% উৎসে কর)`,
            amount: calcTax,
            isDash: false,
          },
        ]
      : []),
  ];

  const maxMainRows = Math.max(itemsCount, creditLines.length);
  const mainDebitTotal = currentBill;
  const mainCreditTotal = currentBill;

  let debitCreditRowsHtml = "";

  for (let i = 0; i < maxMainRows; i++) {
    const item = quotationItems[i];
    const creditLine = creditLines[i];
    const isFirst = i === 0;

    let itemDescCell = "";
    let itemPriceCell = "";
    if (item) {
      const qFormatted = formatQtyWithBengaliWord(
        item.qty || item.quantity || 1,
        item.unit || "টি",
      );
      let d = (
        item.itemDescription ||
        item.description ||
        item.name ||
        ""
      ).trim();
      d = d
        .replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "")
        .trim();
      if (item.model && !d.includes(item.model)) {
        d = `${d} (${item.model})`;
      } else if (item.specification && !d.includes(item.specification)) {
        d = `${d} (${item.specification})`;
      }
      itemDescCell = `${qFormatted} ${d}`;
      const itemGross =
        upperItemGrossAmounts[i] !== undefined
          ? upperItemGrossAmounts[i]
          : item.totalPrice || 0;
      itemPriceCell = toBnDigits(
        itemGross.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
    }

    let crAccountCell = "";
    let crAmountCell = "";
    if (creditLine) {
      crAccountCell = creditLine.account;
      if (creditLine.isDash) {
        crAmountCell = "-";
      } else if (creditLine.amount > 0) {
        crAmountCell = toBnDigits(
          creditLine.amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        );
      } else {
        crAmountCell = "-";
      }
    }

    debitCreditRowsHtml += `<tr>`;
    if (isFirst) {
      debitCreditRowsHtml += `<td rowspan="${maxMainRows}" style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; font-weight: bold;">${budgetHeadAcc}</td>`;
    }
    debitCreditRowsHtml += `<td style="border: 1px solid #000; padding: 5px; vertical-align: middle;">${itemDescCell}</td>`;
    debitCreditRowsHtml += `<td style="border: 1px solid #000; padding: 5px; text-align: right; vertical-align: middle; white-space: nowrap;">${itemPriceCell}</td>`;
    debitCreditRowsHtml += `<td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle;">${crAccountCell}</td>`;
    debitCreditRowsHtml += `<td style="border: 1px solid #000; padding: 5px; text-align: right; vertical-align: middle; white-space: nowrap;">${crAmountCell}</td>`;
    debitCreditRowsHtml += `</tr>`;
  }

  debitCreditRowsHtml += `
    <tr>
      <td style="border: 1px solid #000; padding: 5px;"></td>
      <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle;">মোট=</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(mainDebitTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; vertical-align: middle;"></td>
      <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(mainCreditTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
    </tr>
  `;

  let branchDebitTotal = 0;
  effectiveBranchEntries.forEach((b: any, bIdx: number) => {
    let bAmt = Number(b.amount || 0);
    if (!bAmt || bAmt === 0) {
      const itemObj =
        b.itemIndex !== undefined && quotationItems[b.itemIndex]
          ? quotationItems[b.itemIndex]
          : quotationItems[bIdx] || null;
      const q = Number(b.qty || b.quantity || itemObj?.qty || 1);
      const uPrice = Number(itemObj?.unitPrice || 0);
      bAmt = Math.round(uPrice * q * (1 + (vatRate + taxRate) / 100));
    }
    branchDebitTotal += bAmt;

    let branchClean = (b.branchName || "শাখা")
      .replace(/^(1114|১১১৪)[-\s:]*/i, "")
      .trim();
    if (
      !branchClean.includes("শাখা") &&
      !branchClean.includes("অফিস") &&
      !branchClean.includes("কার্যালয়")
    ) {
      branchClean = `${branchClean} শাখা`;
    }
    const fullBranchColStr = `১১১৪- ${toBnDigits(branchClean)}`;

    const itemObj =
      b.itemIndex !== undefined && quotationItems[b.itemIndex]
        ? quotationItems[b.itemIndex]
        : quotationItems[bIdx] || null;
    const q = Number(b.qty || b.quantity || itemObj?.qty || 1);
    const unit = b.unit || itemObj?.unit || "টি";
    const qFormatted = formatQtyWithBengaliWord(q, unit);

    let desc = (
      b.itemDescription ||
      itemObj?.itemDescription ||
      itemObj?.description ||
      itemObj?.name ||
      b.itemDesc ||
      ""
    ).trim();
    desc = desc
      .replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "")
      .trim();
    const model = b.model || itemObj?.model || itemObj?.specification;
    if (model && !desc.includes(model)) {
      desc = `${desc} (${model})`;
    }
    const itemDescStr = `${qFormatted} ${desc}`;

    debitCreditRowsHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; font-weight: bold;">${fullBranchColStr}</td>
        <td style="border: 1px solid #000; padding: 5px; vertical-align: middle;">${itemDescStr}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; vertical-align: middle; white-space: nowrap;">${toBnDigits(bAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; font-weight: bold;">${budgetHeadAcc}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; vertical-align: middle; white-space: nowrap;">${toBnDigits(bAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
      </tr>
    `;
  });

  if (effectiveBranchEntries.length > 0) {
    debitCreditRowsHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 5px;"></td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle;">সর্বমোট=</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(branchDebitTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; vertical-align: middle;"></td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(branchDebitTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
      </tr>
    `;
  }

  const padHeader = getBankPadHeaderHtml(office?.name);
  const watermarkHtml = getBankWatermarkHtml();

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 11pt; line-height: 1.45; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      ${watermarkHtml}
      <div style="position: relative; z-index: 1;">
        ${padHeader}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 11pt;">
          <div><strong>নং- </strong>${forwardingNoFormatted}</div>
          <div><strong>তারিখঃ </strong>${voucherDate} খ্রিঃ</div>
        </div>

        <div style="margin-bottom: 12px; line-height: 1.4; font-size: 11pt;">
          ব্যবস্থাপক<br/>
          বাংলাদেশ কৃষি ব্যাংক<br/>
          ${expense.branchName || "প্রধান শাখা"}<br/>
          ${expense.branchAddress || "প্রধান কার্যালয়।"}
        </div>

        <div style="font-weight: bold; margin-bottom: 12px; font-size: 11pt;">
          বিষয়ঃ ${formattedItems} ${isRepair ? "বিল" : "ক্রয়ের বিল"} সমন্বয়/পরিশোধ প্রসঙ্গে।
        </div>

        <p style="margin-bottom: 6pt; font-size: 11pt;">
          প্রিয় মহোদয়,<br/>
          <span style="display: inline-block; width: 35px;"></span>শিরোনামে বর্ণিত বিষয়ে আপনার দৃষ্টি আকর্ষণ করা যাচ্ছে।
        </p>

        <p style="text-indent: 35px; margin-bottom: 10px; text-align: justify; line-height: 1.55; font-size: 11pt;">
          ০২। ${paragraph2Text}
        </p>

        <p style="text-indent: 35px; margin-bottom: 12px; text-align: justify; line-height: 1.55; font-size: 11pt;">
          ০৩। ${paragraph3Text}
        </p>

        <p style="margin-bottom: 6px; font-weight: bold; font-size: 10.5pt;">খরচের বিলটি নিম্নভাবে সমন্বয় করতে হবেঃ</p>

        <table class="forwarding-table" border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5pt; border: 1.5px solid #000;">
          <thead>
            <tr>
              <th rowspan="2" style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 20%;">হিসাবের খাত</th>
              <th colspan="2" style="border: 1px solid #000; padding: 4px; text-align: center; width: 44%;">ডেবিট</th>
              <th colspan="2" style="border: 1px solid #000; padding: 4px; text-align: center; width: 36%;">ক্রেডিট</th>
            </tr>
            <tr>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 30%;">বিবরণ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 14%;">টাকা</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: center; width: 20%;">হিসাবের খাত</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 16%;">টাকা</th>
            </tr>
          </thead>
          <tbody>
            ${debitCreditRowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11pt;">
          <div><strong>সংযুক্তি: </strong></div>
          <div style="text-align: center; min-width: 170px;">
            <div style="font-weight: normal; margin-bottom: 35px;">আপনার বিশ্বস্ত</div>
            <div style="font-weight: bold;">(মোহাম্মদ কামরুল হাসান)</div>
            <div style="font-size: 10.5pt;">আঞ্চলিক ব্যবস্থাপক</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateForm1SupplyOrderHtml(
  expense: any,
  office: any,
  _category: any,
  _financialYear?: any,
  _balanceInfo?: any,
): string {
  const hasMusok =
    expense.hasStockChalan === "হ্যাঁ" ||
    (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);

  let taxVatStr = "১০% ভ্যাট ও ৫% ট্যাক্স";
  if (vatRate > 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাট ও ${toBnDigits(taxRate)}% ট্যাক্স`;
  } else if (vatRate > 0 && taxRate === 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাট`;
  } else if (vatRate === 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(taxRate)}% ট্যাক্স`;
  }

  const quotationItems = expense.quotationItems || [];
  const formattedItems = formatItemsListText(quotationItems);
  const isRepair =
    isRepairWork(formattedItems) || isRepairWork(expense.description);

  const supplyOrderNo = toBnDigits(
    expense.memoSupplyOrderNo || "সূত্র নং-প্রশ-১(৪০)/২০২৪-২০২৫/",
  );
  const quotationDate = toBnDigits(
    formatDateToDDMMYYYY(expense.quotationDate || "২১/০৪/২০২৬"),
  );

  const recipientName = expense.supplyRecipientName || "জনাব সুমন বিকাশ চাকমা";
  const recipientDesignation = expense.supplyRecipientDesignation || "সিইও";
  const recipientOrg =
    expense.supplyRecipientOrgName || "কম্পিউটার ভিলেজ টেকনোলজিস";
  const addr1 =
    expense.supplyRecipientAddress1 || "১৪ আইসিআর শপিং প্লাজা (২য় তলা),";
  const addr2 = expense.supplyRecipientAddress2 || "বনরূপা, রাঙ্গামাটি";

  const padHeader = getBankPadHeaderHtml(office?.name);
  const watermarkHtml = getBankWatermarkHtml();

  const subjectText = isRepair
    ? `বিষয়ঃ- ${formattedItems} কাজের কার্যাদেশ।`
    : `বিষয়ঃ- ${formattedItems} সরবরাহের আদেশ।`;

  const para2Text = isRepair
    ? `০২। অত্র অঞ্চলাধীন শাখাসমূহের জন্য ${formattedItems} কার্য সম্পাদনের নিমিত্তে কোটেশন আহ্বান করা হলে আপনার প্রতিষ্ঠান কর্তৃক ${quotationDate} খ্রিঃ তারিখে দাখিলকৃত কোটেশনটি সর্বনিম্ন হিসেবে গণ্য হওয়ায় ${formattedItems} কাজ সম্পন্ন করার প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য আপনাকে অনুরোধ করা হলো।`
    : `০২। অত্র অঞ্চলাধীন শাখাসমূহের জন্য ${formattedItems} সরবরাহের নিমিত্তে কোটেশন আহ্বান করা হলে আপনার প্রতিষ্ঠান কর্তৃক ${quotationDate} খ্রিঃ তারিখে দাখিলকৃত কোটেশনটি সর্বনিম্ন হিসেবে গণ্য হওয়ায় ${formattedItems} সরবরাহের প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য আপনাকে অনুরোধ করা হলো।`;

  const term1Text = isRepair
    ? `অত্র কার্যালয়ের চাহিদা ও স্পেসিফিকেশন অনুযায়ী ${formattedItems} যথাযথভাবে সম্পন্ন করতে হবে।`
    : `অত্র কার্যালয় কর্তৃক সরবরাহকৃত নমুনা অনুযায়ী ${formattedItems} সরবরাহ করতে হবে।`;

  const term2Text = isRepair
    ? `কার্যাদেশ প্রদানের অনধিক ৫ (পাঁচ) কার্যদিবসের মধ্যে কাজ সম্পন্ন করতে হবে।`
    : `কার্যাদেশ প্রদানের অনধিক ৫ (পাঁচ) কার্যদিবসের মধ্যে পণ্য সরবরাহ করতে হবে।`;

  const term3Text = isRepair
    ? `গুণগত মান ও যথাযথভাবে সম্পাদিত কাজ যাচাই করে বুঝে নেওয়ার পর বিল দাখিল সাপেক্ষে পেমেন্ট অর্ডার এর মাধ্যমে/নগদে বিল পরিশোধ করা হবে।`
    : `গুণগত মান ও যথাযথভাবে সরবরাহের পরিমাণ যাচাই করে বুঝে নেওয়ার পর বিল দাখিল সাপেক্ষে পেমেন্ট অর্ডার এর মাধ্যমে/নগদে বিল পরিশোধ করা হবে।`;

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      ${watermarkHtml}
      <div style="position: relative; z-index: 1;">
        ${padHeader}

        <div style="display: flex; justify-content: space-between; margin-bottom: 14pt; font-size: 11pt;">
          <div><strong>সূত্র নংঃ</strong> ${supplyOrderNo}</div>
          <div><strong>তারিখঃ</strong> ${quotationDate} খ্রিঃ</div>
        </div>

        <div style="margin-bottom: 12pt; line-height: 1.4; font-size: 11pt;">
          ${recipientName},<br/>
          ${recipientDesignation},<br/>
          ${recipientOrg},<br/>
          ${addr1}<br/>
          ${addr2}
        </div>

        <div style="font-weight: bold; margin-bottom: 12pt; font-size: 11pt;">
          ${subjectText}
        </div>

        <p style="text-indent: 35px; margin-bottom: 8pt; font-size: 11pt;">
          প্রিয় মহোদয়,<br/>
          <span style="display: inline-block; width: 35px;"></span>বর্ণিত বিষয়ে আপনার দৃষ্টি আকর্ষণ করা যাচ্ছে।
        </p>

        <p style="text-indent: 35px; margin-bottom: 12pt; line-height: 1.55; font-size: 11pt;">
          ${para2Text}
        </p>

        <div style="margin-bottom: 10pt; font-weight: bold; font-size: 11pt;">শর্তাবলীঃ</div>
        <div style="margin-top: 0; line-height: 1.7; font-size: 10.5pt;">
          <div style="display: flex;"><span style="min-width: 25px;">১।</span><span>${term1Text}</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">২।</span><span>${term2Text}</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">৩।</span><span>${term3Text}</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">৪।</span><span>দাখিলকৃত মূল্য হতে ${taxVatStr} কর্তন করা হবে।</span></div>
        </div>

        <div style="margin-top: 24pt; display: flex; justify-content: flex-end; font-size: 11pt;">
          <div style="text-align: center; min-width: 170pt;">
            <div style="font-weight: bold;">আপনার বিশ্বস্ত,</div>
            <div style="height: 35pt;"></div>
            <div style="font-weight: bold;">(মোহাম্মদ কামরুল হাসান)</div>
            <div style="font-size: 10.5pt;">আঞ্চলিক ব্যবস্থাপক</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateForm2NoteSheetHtml(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
): string {
  const hasMusok =
    expense.hasStockChalan === "হ্যাঁ" ||
    (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);
  const vatTaxMultiplier = 1 + (vatRate + taxRate) / 100;

  let taxVatStr = "ভ্যাট ও উৎসে কর ব্যতীত";
  if (vatRate > 0 && taxRate > 0) {
    taxVatStr = `${convertToBengaliNumber(vatRate)}% ভ্যাট ও ${convertToBengaliNumber(taxRate)}% উৎসে করসহ`;
  } else if (vatRate > 0 && taxRate === 0) {
    taxVatStr = `${convertToBengaliNumber(vatRate)}% ভ্যাটসহ`;
  } else if (vatRate === 0 && taxRate > 0) {
    taxVatStr = `${convertToBengaliNumber(taxRate)}% উৎসে করসহ`;
  }

  const quotationItems = expense.quotationItems || [];
  const itemsCount = quotationItems.length > 0 ? quotationItems.length : 1;
  const baseAmt = Number(
    expense.baseAmount ||
      quotationItems.reduce(
        (acc: number, item: any) => acc + (item.totalPrice || 0),
        0,
      ) ||
      expense.amount ||
      0,
  );
  const calcVat = Number(expense.vatAmount || (baseAmt * vatRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * taxRate) / 100);
  const currentBill = Number(
    expense.grossAmount || expense.amount || baseAmt + calcVat + calcTax,
  );
  const previousExpense = Math.max(
    0,
    balanceInfo.totalSpent + balanceInfo.totalPending - currentBill,
  );
  const remainingBalance =
    balanceInfo.totalAllocated - (previousExpense + currentBill);

  const amountWords = numberToBengaliWords(currentBill);

  const itemTypeWord = "মুদ্রিত মনিহারী দ্রব্য";

  const { biddersHtml, lowestBidderName, totalBiddersCount } =
    generateQuotationBiddersTableHtml(expense, vatTaxMultiplier, taxVatStr);
  const budgetHtml = generateBudgetProvisionTableHtml(
    balanceInfo,
    category,
    financialYear,
    currentBill,
    previousExpense,
    remainingBalance,
  );

  const biddersWord =
    totalBiddersCount === 3
      ? "তিন"
      : numberToBengaliWords(totalBiddersCount) || "তিন";
  const biddersCountDigits =
    totalBiddersCount < 10 ? `0${totalBiddersCount}` : `${totalBiddersCount}`;
  const totalBiddersStr = `${biddersCountDigits} (${biddersWord})`;

  const formattedAmount = convertToBengaliNumber(
    currentBill.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  const applicantDesignation = expense.applicant?.designation || "শাখা প্রধান";
  const entryOfficer =
    expense.applicant?.name ||
    expense.applicant?.designation ||
    expense.createdBy ||
    "usr-1";

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
      <div style="font-weight: bold; margin-bottom: 20pt; text-align: center; font-size: 16px;">
        বিষয়ঃ অঞ্চলাধীন শাখা সমূহের জন্য ${itemTypeWord} মুদ্রণের বিল প্রদান প্রসঙ্গে ।
      </div>
      
      <p style="text-indent: 40px; margin-bottom: 10pt;">
        অত্র অঞ্চলাধীন শাখা সমূহের চাহিদা পূরণের নিমিত্তে নিম্নোক্ত ${convertToBengaliNumber(itemsCount)} টি আইটেমের ${itemTypeWord} অফ-দ্যা-সেল্ফ ক্রয় প্রক্রিয়ায় মুদ্রণের লক্ষ্যে স্থানীয় ${itemTypeWord} সরবরাহকারী প্রতিষ্ঠান হতে কোটেশন চাওয়া হয় । নিম্ন বর্ণিতভাবে প্রাপ্ত ${totalBiddersStr} টি প্রতিষ্ঠানের দরপত্র সমূহ যাচাই করত: সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে ${taxVatStr} সর্বমোট ৳=${formattedAmount} (${amountWords}) টাকা মাত্র মূল্যে উক্ত দ্রব্যাদি মুদ্রণ করা হয় ।
      </p>
      
      <p style="margin-bottom: 5pt; font-weight: bold; text-decoration: underline;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>
      
      ${biddersHtml}
      
      <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 15pt;">
        উক্ত ${convertToBengaliNumber(totalBiddersCount)} টি দরপত্র এর মধ্যে '${lowestBidderName}' কর্তৃক ${itemTypeWord} মুদ্রণ বাবদ ${taxVatStr} সর্বনিম্ন দর ৳=${formattedAmount} (${amountWords}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে উক্ত দ্রব্যাদি মুদ্রণ করা হয়।
      </p>
      
      <p style="text-indent: 40px; margin-bottom: 25pt;">
        এমতাবস্থায়, অত্র অঞ্চলাধীন শাখা সমূহের জন্য ${itemTypeWord} মুদ্রণ বাবদ ${taxVatStr} ৳=${formattedAmount} (${amountWords}) টাকা মাত্র খরচের বিষয়টি ${applicantDesignation}, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি"} এর আর্থিক সম্মতি গ্রহণপূর্বক ${taxVatStr} সর্বমোট ৳=${formattedAmount} (${amountWords}) টাকা মাত্র বিলের অর্থ প্রদানের অনুমোদন দেয়া যেতে পারে।
      </p>
      
      ${budgetHtml}
      
      <div style="margin-top: 15pt; margin-bottom: 0pt; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 170pt; display: inline-block;">
          <div style="height: 35pt;"></div>
          <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
            প্রস্তুতকারী কর্মকর্তা
          </div>
          <div style="font-size: 0.85em; color: #444; font-family: monospace;">
            ${entryOfficer}
          </div>
        </div>
      </div>
      
      <div class="form1-approval-chain" style="margin-top: 25pt; line-height: 1.6;">
        <div style="margin-bottom: 56pt;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহনের নিমিত্তে নথি আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি"} বরাবরে প্রেরণ করুন।</div>
        <div style="margin-bottom: 56pt;"><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> অত্র অঞ্চলাধীন শাখা সমূহের জন্য ${itemTypeWord} মুদ্রণ বাবদ ${taxVatStr} সর্বমোট ৳=${formattedAmount} (${amountWords}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</div>
        <div style="margin-bottom: 45pt;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
      </div>
    </div>`;
}

export function generateForm1NoteSheetHtml(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
): string {
  const hasMusok =
    expense.hasStockChalan === "হ্যাঁ" ||
    (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);
  const vatTaxMultiplier = 1 + (vatRate + taxRate) / 100;

  let taxVatStr = "ভ্যাট ও ট্যাক্স ব্যতীত";
  if (vatRate > 0 && taxRate > 0) {
    taxVatStr = `${convertToBengaliNumber(vatRate)}% ভ্যাট ও ${convertToBengaliNumber(taxRate)}% ট্যাক্সসহ`;
  } else if (vatRate > 0 && taxRate === 0) {
    taxVatStr = `${convertToBengaliNumber(vatRate)}% ভ্যাটসহ`;
  } else if (vatRate === 0 && taxRate > 0) {
    taxVatStr = `${convertToBengaliNumber(taxRate)}% ট্যাক্সসহ`;
  }

  const quotationItems = expense.quotationItems || [];
  const baseAmt = Number(
    expense.baseAmount ||
      quotationItems.reduce(
        (acc: number, item: any) => acc + (item.totalPrice || 0),
        0,
      ) ||
      expense.amount ||
      0,
  );
  const calcVat = Number(expense.vatAmount || (baseAmt * vatRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * taxRate) / 100);
  const currentBill = Number(
    expense.grossAmount || expense.amount || baseAmt + calcVat + calcTax,
  );

  const previousExpense = Math.max(
    0,
    balanceInfo.totalSpent + balanceInfo.totalPending - currentBill,
  );
  const remainingBalance =
    balanceInfo.totalAllocated - (previousExpense + currentBill);

  const amountWords = numberToBengaliWords(currentBill);
  const formattedItems = formatItemsListText(quotationItems);
  const isRepair =
    isRepairWork(formattedItems) || isRepairWork(expense.description);

  const { biddersHtml, lowestBidderName, totalBiddersCount, isMultipleItems } =
    generateQuotationBiddersTableHtml(expense, vatTaxMultiplier, taxVatStr);
  const budgetHtml = generateBudgetProvisionTableHtml(
    balanceInfo,
    category,
    financialYear,
    currentBill,
    previousExpense,
    remainingBalance,
  );

  const itemTextPhrase = isMultipleItems ? "উক্ত পণ্য সমূহ" : "উক্ত পণ্যটি";
  const descTextPhrase = isMultipleItems ? "বর্ণিত পণ্য সমূহ" : "বর্ণিত পণ্যটি";

  const hasBranchEntries =
    expense.branchEntries &&
    Array.isArray(expense.branchEntries) &&
    expense.branchEntries.length > 0;
  const targetOfficeForText = hasBranchEntries
    ? "অত্র অঞ্চলাধীন শাখাসমূহের জন্য"
    : `${office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি"} এর জন্য`;

  const formattedAmount = convertToBengaliNumber(
    currentBill.toLocaleString("en-IN"),
  );
  const applicantDesignation = expense.applicant?.designation || "শাখা প্রধান";
  const entryOfficer =
    expense.applicant?.name ||
    expense.applicant?.designation ||
    expense.createdBy ||
    "usr-1";

  const subjectText = isRepair
    ? `বিষয়ঃ- ${targetOfficeForText} ${formattedItems} বিল প্রদান প্রসঙ্গে।`
    : `বিষয়ঃ- ${targetOfficeForText} ${formattedItems} ক্রয়ের বিল প্রদান প্রসঙ্গে।`;

  const para1Text = isRepair
    ? `${targetOfficeForText} ${formattedItems} কাজের নিমিত্তে স্থানীয় ভাবে ${convertToBengaliNumber(totalBiddersCount)} টি প্রতিষ্ঠানের দরপত্র সংগ্রহ করতঃ সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র মূল্যে উক্ত কাজ সম্পন্ন করা হয়।`
    : `${targetOfficeForText} ${formattedItems} ক্রয়ের নিমিত্তে স্থানীয় ভাবে ${convertToBengaliNumber(totalBiddersCount)} টি প্রতিষ্ঠানের দরপত্র সংগ্রহ করতঃ সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র মূল্যে ${itemTextPhrase} ক্রয় করা হয়।`;

  const para2Text = isRepair
    ? `উক্ত ${convertToBengaliNumber(totalBiddersCount)} টি দরপত্র এর মধ্যে '${lowestBidderName}' কর্তৃক ${formattedItems} বাবদ ${taxVatStr} সর্বনিম্ন দর ৮= ${formattedAmount}/- (${amountWords}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে ${descTextPhrase} মেরামত কাজ সম্পন্ন করা হয়।`
    : `উক্ত ${convertToBengaliNumber(totalBiddersCount)} টি দরপত্র এর মধ্যে '${lowestBidderName}' কর্তৃক ${formattedItems} ক্রয় বাবদ ${taxVatStr} সর্বনিম্ন দর ৮= ${formattedAmount}/- (${amountWords}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে ${descTextPhrase} ক্রয় করা হয়।`;

  const para3Text = isRepair
    ? `এমতাবস্থায়, ${targetOfficeForText} ${formattedItems} বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র খরচের বিষয়টি ${applicantDesignation}, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${office?.name || ""} এর আর্থিক সম্মতি গ্রহণপূর্বক ${taxVatStr} সর্বমোট ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিলের অর্থ প্রদানের অনুমোদন দেয়া যেতে পারে।`
    : `এমতাবস্থায়, ${targetOfficeForText} ${formattedItems} ক্রয় বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র খরচের বিষয়টি ${applicantDesignation}, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${office?.name || ""} এর আর্থিক সম্মতি গ্রহণপূর্বক ${taxVatStr} সর্বমোট ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিলের অর্থ প্রদানের অনুমোদন দেয়া যেতে পারে।`;

  const auditNoteText = isRepair
    ? `<strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> ${targetOfficeForText} ${formattedItems} বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।`
    : `<strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> ${targetOfficeForText} ${formattedItems} ক্রয় বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।`;

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
      <div style="font-weight: bold; margin-bottom: 20pt; text-align: center;">
        ${subjectText}
      </div>
      
      <p style="text-indent: 40px; margin-bottom: 10pt;">
        ${para1Text}
      </p>
      
      <p style="margin-bottom: 5pt; font-weight: bold; text-decoration: underline;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>
      
      ${biddersHtml}
      
      <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 15pt;">
        ${para2Text}
      </p>
      
      <p style="text-indent: 40px; margin-bottom: 25pt;">
        ${para3Text}
      </p>
      
      ${budgetHtml}
      
      <div style="margin-top: 15pt; margin-bottom: 0pt; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 170pt; display: inline-block;">
          <div style="height: 35pt;"></div>
          <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
            প্রস্তুতকারী কর্মকর্তা
          </div>
          <div style="font-size: 0.85em; color: #444; font-family: monospace;">
            ${entryOfficer}
          </div>
        </div>
      </div>
      
      <div class="form1-approval-chain" style="margin-top: 25pt; line-height: 1.6;">
        <div style="margin-bottom: 56pt;">
          <strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহনের নিমিত্তে নথি আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${office?.name || ""} বরাবরে প্রেরণ করুন।
        </div>
        <div style="margin-bottom: 56pt;">
          ${auditNoteText}
        </div>
        <div style="margin-bottom: 45pt;">
          <strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।
        </div>
      </div>
    </div>
  `;
}


export function generateMotorFuelApplicationHtml(
  expense: any,
  office: any,
  _category: any,
  _financialYear: any,
  _balanceInfo: any,
): string {
  const offName = office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";
  
  const vRate = Number(expense.vatRate || 0);
  const tRate = Number(expense.taxRate || 0);
  const baseAmt = Number(expense.baseAmount || expense.amount || 0);
  const calcVat = Number(expense.vatAmount !== undefined ? expense.vatAmount : (baseAmt * vRate) / 100);
  const calcTax = Number(expense.taxAmount !== undefined ? expense.taxAmount : (baseAmt * tRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const amountWords = numberToBengaliWords(currentBill);

  const baseAmtFormatted = convertToBengaliNumber(baseAmt.toFixed(2));
  const calcVatFormatted = convertToBengaliNumber(calcVat.toFixed(2));
  const calcTaxFormatted = convertToBengaliNumber(calcTax.toFixed(2));
  const currentBillFormatted = convertToBengaliNumber(currentBill.toFixed(2));

  const categoryCode = _category?.code || "১৩৩/২৬";
  const vehicleModel = expense.vehicleModel || "Toyota Land Cruiser Prado";
  const vehicleRegNo = expense.vehicleRegNo || "ঢাকা-মেট্রো-ঘ-১৪-১১৩২";
  const fuelMonthYear = expense.fuelMonthYear || expense.monthYear || "অক্টোবর/২০২৪";
  const fuelType = expense.fuelType || "অকটেন";
  const fuelSupplierName = expense.fuelSupplierName || expense.supplyRecipientOrgName || expense.supplierOrg1 || "মেসার্স রহমান ফিলিং স্টেশন";

  const applicantName = expense.applicant?.name || expense.applicantName || expense.driverName || "মো: এনামুল হক";
  const applicantDesignation = expense.applicant?.designation || expense.applicantDesignation || "গাড়ী চালক";

  const purposeDescription = `অত্র কার্যালয়ের ব্যবহৃত ${vehicleModel} গাড়ী নং-${vehicleRegNo} এর ${fuelMonthYear} মাসের জ্বালানী (${fuelType}) বাবদ ${fuelSupplierName} এর অনুকূলে বিল পরিশোধ`;

  return `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%; padding: 10px 5px;">
  <div style="text-align: center; margin-bottom: 22px;">
    <div style="font-size: 1.35em; font-weight: bold; color: #000; line-height: 1.2;">বাংলাদেশ কৃষি ব্যাংক</div>
    <div style="font-size: 1.1em; font-weight: bold; color: #000; margin-top: 3px;">${offName}</div>
  </div>

  <div style="text-align: center; font-weight: bold; margin-bottom: 24px; text-decoration: underline;">
    বিষয় : অত্র কার্যালয়ের ${vehicleModel} গাড়ীর ${fuelMonthYear} মাসের জ্বালানী (${fuelType}) খরচ পরিশোধের আবেদন ।
  </div>

  <table border="1" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 25px;">
    <thead>
      <tr style="border-bottom: 1.5px solid #000; background-color: #fafafa;">
        <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 7%; font-weight: bold;">ক্রম</th>
        <th style="border: 1px solid #000; padding: 6px 6px; text-align: center; width: 15%; font-weight: bold;">খাত</th>
        <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 60%; font-weight: bold;">উদ্দেশ্য/বিবরণ</th>
        <th style="border: 1px solid #000; padding: 6px 6px; text-align: center; width: 18%; font-weight: bold;">টাকার পরিমান</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">১.</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-weight: bold;">${categoryCode}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${purposeDescription}</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">${baseAmtFormatted}</td>
      </tr>
      ${calcVat > 0 ? `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${convertToBengaliNumber(vRate)}% ভ্যাট</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">${calcVatFormatted}</td>
      </tr>` : ''}
      ${calcTax > 0 ? `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${convertToBengaliNumber(tRate)}% ট্যাক্স</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">${calcTaxFormatted}</td>
      </tr>` : ''}
      <tr style="font-weight: bold;">
        <td colspan="3" style="border: 1px solid #000; padding: 6px 8px; text-align: left;">
          মোট টাকা (কথায়) : ${amountWords} টাকা মাত্র
        </td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">
          ${currentBillFormatted}
        </td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
    <div>
      <strong>সংযুক্তি :-</strong>
      <div style="margin-top: 4px; font-size: 0.95em;">১. জ্বালানী ক্রয়ের মূল ক্যাশ মেমো / রশিদ</div>
      <div style="margin-top: 2px; font-size: 0.95em;">২. গাড়ির সংশ্লিষ্ট লগবইয়ের সত্যায়িত অনুলিপি</div>
    </div>
    <div style="text-align: center; min-width: 170px;">
      <div>আবেদনকারীর স্বাক্ষর</div>
      <div style="margin-top: 25px; border-top: 1px solid #000; padding-top: 3px; font-weight: bold;">
        ${applicantName ? `(${applicantName})` : ""}<br/>
        <span style="font-size: 0.9em; font-weight: normal;">${applicantDesignation}</span>
      </div>
    </div>
  </div>
</div>`;
}

export function generateMotorFuelForwardingHtml(
  expense: any,
  office: any,
  _category: any,
  _financialYear: any,
  _balanceInfo: any,
): string {
  const _offName = office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";
  
  const vRate = Number(expense.vatRate || 0);
  const tRate = Number(expense.taxRate || 0);
  const baseAmt = Number(expense.baseAmount || expense.amount || 0);
  const calcVat = Number(expense.vatAmount !== undefined ? expense.vatAmount : (baseAmt * vRate) / 100);
  const calcTax = Number(expense.taxAmount !== undefined ? expense.taxAmount : (baseAmt * tRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const amountWords = numberToBengaliWords(currentBill);

  const vehicleModel = expense.vehicleModel || "জীপ";
  const vehicleDisplayName = vehicleModel.includes("গাড়ী") || vehicleModel.includes("গাড়ি") ? vehicleModel : `${vehicleModel} গাড়ী`;
  const vehicleRegNo = expense.vehicleRegNo || "ঢাকা-মেট্রো-ঘ-১৪-১১৩২";
  const rawFuelMonthYear = (expense.fuelMonthYear || expense.monthYear || "জুন/২০২৬").trim();
  const fuelMonthYear = rawFuelMonthYear.replace(/খ্রিঃ|খ্রি/g, "").trim();

  const fuelSupplierName = expense.fuelSupplierName || expense.supplyRecipientOrgName || expense.supplierOrg1 || "মেসার্স হিল ভিউ, রাঙ্গামাটি";
  const regionalManagerName = expense.regionalManagerName || "মোহাম্মদ কামরুল হাসান";

  const letterNoRaw = (expense.voucherNo || expense.memoForwardingNo || "১১").replace(/^(স্মারক\s*নং-|সূত্র\s*নং-|পত্র\s*নং-|নং-)\s*/, "").trim();
  const letterNoFormatted = toBnDigits(letterNoRaw);
  
  const voucherDateFormatted = toBnDigits(
    formatDateToDDMMYYYY(expense.voucherDate || expense.expenseDate || new Date().toISOString().split("T")[0])
  );

  // Parse fuel items if available
  let fuelItems: any[] = [];
  if (Array.isArray(expense.fuelItems) && expense.fuelItems.length > 0) {
    fuelItems = expense.fuelItems;
  } else if (typeof expense.fuelItems === "string") {
    try {
      fuelItems = JSON.parse(expense.fuelItems);
    } catch {}
  }

  if (!fuelItems || fuelItems.length === 0) {
    fuelItems = [
      {
        fuelType: "অকটেন",
        supplyDate: "2026-06-02",
        qtyLiters: 20,
        ratePerLiter: 145,
        supplierName: fuelSupplierName,
        totalAmount: 2900,
      },
      {
        fuelType: "অকটেন",
        supplyDate: "2026-06-09",
        qtyLiters: 40,
        ratePerLiter: 145,
        supplierName: fuelSupplierName,
        totalAmount: 5800,
      },
      {
        fuelType: "অকটেন",
        supplyDate: "2026-06-24",
        qtyLiters: 7,
        ratePerLiter: 145,
        supplierName: fuelSupplierName,
        totalAmount: 1015,
      },
      {
        fuelType: "মবিল",
        supplyDate: "2026-06-24",
        qtyLiters: 5,
        ratePerLiter: 1000,
        supplierName: fuelSupplierName,
        totalAmount: 5000,
      },
    ];
  }

  // Group fuel items by month & fuel type for multi-month breakdown
  const monthGroups: { [month: string]: { [fuelType: string]: { qty: number; total: number } } } = {};
  const monthTotals: { [month: string]: number } = {};
  const monthOrder: string[] = [];

  fuelItems.forEach((item) => {
    const m = extractMonthYearFromFuelItem(item, fuelMonthYear);
    if (!monthGroups[m]) {
      monthGroups[m] = {};
      monthTotals[m] = 0;
      monthOrder.push(m);
    }
    const fType = (item.fuelType || expense.fuelType || "অকটেন").trim();
    if (!monthGroups[m][fType]) {
      monthGroups[m][fType] = { qty: 0, total: 0 };
    }
    const q = Number(item.qtyLiters || 0);
    const lineTotal = Number(
      item.totalAmount !== undefined
        ? item.totalAmount
        : Number(item.ratePerLiter || 0) * q
    );
    monthGroups[m][fType].qty += q;
    monthGroups[m][fType].total += lineTotal;
    monthTotals[m] += lineTotal;
  });

  const monthParts: string[] = [];
  monthOrder.forEach((m) => {
    const fTypes = monthGroups[m];
    const fTypeStrings: string[] = [];
    Object.entries(fTypes).forEach(([fType, data]) => {
      const formattedQty = convertToBengaliNumber(
        data.qty % 1 === 0 ? data.qty.toString() : data.qty.toFixed(2)
      );
      fTypeStrings.push(
        `${formattedQty} লিটার ${fType}`
      );
    });

    const fTypeCombined = fTypeStrings.join(" এবং ");
    monthParts.push(`${m} মাসে ${fTypeCombined}`);
  });

  const monthBreakdownText = monthParts.length > 0
    ? monthParts.join(", ও ")
    : `${fuelMonthYear} মাসে প্রয়োজনীয় জ্বালানী`;

  let amountsBreakdownText = "";
  if (monthOrder.length > 1) {
    const monthAmountStrings = monthOrder.map((m) => {
      const amt = monthTotals[m] || 0;
      const amtFormatted = convertToBengaliNumber(amt.toLocaleString("en-IN"));
      return `মং-${amtFormatted}/-`;
    });
    const joinedAmounts = monthAmountStrings.length === 2
      ? monthAmountStrings.join(" ও ")
      : monthAmountStrings.slice(0, -1).join(", ") + " ও " + monthAmountStrings[monthAmountStrings.length - 1];
    amountsBreakdownText = `যথাক্রমে ${joinedAmounts} `;
  }

  const subjectMonths = monthOrder.length > 0 ? monthOrder.join(" ও ") : fuelMonthYear;
  const fuelMonthYearSubject = subjectMonths.replace(/খ্রিঃ|খ্রি/g, "").trim();

  const currentBillFormatted = convertToBengaliNumber(currentBill % 1 === 0 ? currentBill.toString() : currentBill.toFixed(2));
  const officeNameDisplay = office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";

  const padHeader = getBankPadHeaderHtml(office?.name);
  const watermarkHtml = getBankWatermarkHtml();

  return `
    <div style="font-size: 11pt; line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      ${watermarkHtml}
      <div style="position: relative; z-index: 1;">
        ${padHeader}

        <div style="display: flex; justify-content: space-between; margin-bottom: 12pt; font-size: 11pt;">
          <div><strong>পত্র নংঃ</strong> ${letterNoFormatted}</div>
          <div><strong>তারিখঃ</strong> ${voucherDateFormatted} ইং।</div>
        </div>

        <div style="margin-bottom: 12pt; line-height: 1.4; font-size: 11pt;">
          ব্যবস্থাপক<br/>
          বাংলাদেশ কৃষি ব্যাংক<br/>
          রাঙ্গামাটি শাখা, রাঙ্গামাটি।
        </div>

        <div style="font-weight: bold; margin-bottom: 12pt; font-size: 11pt; line-height: 1.5;">
          বিষয়ঃ <u>অত্র কার্যালয়ের ${vehicleDisplayName} নংঃ ${vehicleRegNo} এর ${fuelMonthYearSubject} মাসের জ্বালানী বিল পরিশোধ প্রসঙ্গে।</u>
        </div>

        <div style="margin-bottom: 8pt; font-size: 11pt;">
          প্রিয় মহোদয়,
        </div>

        <p style="text-indent: 40px; text-align: justify; line-height: 1.7; font-size: 11pt; margin-bottom: 12pt;">
          শিরোনামে বর্ণিত বিষয়ে মহোদয়ের সদয় দৃষ্টি আকর্ষণ করা যাচ্ছে।
        </p>

        <p style="text-indent: 40px; text-align: justify; line-height: 1.7; font-size: 11pt; margin-bottom: 14pt;">
          ০২। &nbsp; অত্র কার্যালয়ে ব্যবহৃত ${vehicleDisplayName} নংঃ ${vehicleRegNo} এর জ্বালানী বাবদ ${monthBreakdownText} ক্রয় বাবদ ${fuelSupplierName} এর অনুকূলে ${amountsBreakdownText}সর্বমোট ৳=${currentBillFormatted}/- (${amountWords}) টাকা মাত্র পে-অর্ডার ইস্যুর মাধ্যমে বিল প্রদানের পরামর্শ দেয়া হলো।
        </p>

        <table border="1" class="forwarding-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin: 16pt 0; font-size: 10pt;">
          <thead>
            <tr style="background-color: #fff; border-bottom: 1.5px solid #000;">
              <th style="border: 1px solid #000; padding: 7px 4px; text-align: center; width: 8%; font-weight: bold;">ক্রম</th>
              <th style="border: 1px solid #000; padding: 7px 6px; text-align: center; width: 34%; font-weight: bold;">সরবরাহকারী প্রতিষ্ঠানের নাম</th>
              <th style="border: 1px solid #000; padding: 7px 6px; text-align: center; width: 29%; font-weight: bold;">পে-অর্ডার ইস্যুর পরিমাণ</th>
              <th style="border: 1px solid #000; padding: 7px 6px; text-align: center; width: 29%; font-weight: bold;">১৩৩/২৬ খাতে হিসাব ভূক্তির পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 10px 4px; text-align: center;">১.</td>
              <td style="border: 1px solid #000; padding: 10px 8px; text-align: center;">${fuelSupplierName}</td>
              <td style="border: 1px solid #000; padding: 10px 8px; text-align: center;">৳=${currentBillFormatted}/- (${amountWords}) টাকা মাত্র</td>
              <td style="border: 1px solid #000; padding: 10px 8px; text-align: center;">৳=${currentBillFormatted}/- (${amountWords}) টাকা মাত্র</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 24pt; font-size: 11pt;">
          <div>
            <strong>সংযুক্তিঃ বর্ণনামতে।</strong>
          </div>
          <div style="text-align: center; min-width: 180pt; line-height: 1.4;">
            <div>আপনার বিশ্বস্ত</div>
            <div style="height: 40pt;"></div>
            <div style="font-weight: bold;">(${regionalManagerName})</div>
            <div>আঞ্চলিক ব্যবস্থাপক</div>
            <div>বাংলাদেশ কৃষি ব্যাংক</div>
            <div>${officeNameDisplay}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateMotorFuelSupplyOrderHtml(
  expense: any,
  office: any,
  _category: any,
  financialYear: any,
  _balanceInfo: any,
): string {
  const offName = office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";
  const vehicleModel = expense.vehicleModel || "Toyota Land Cruiser Prado";
  const vehicleRegNo = expense.vehicleRegNo || "ঢাকা-মেট্রো-ঘ-১৪-১১৩২";
  const fuelMonthYear = expense.fuelMonthYear || expense.monthYear || "অক্টোবর/২০২৪";
  const fuelType = expense.fuelType || "অকটেন";
  const fuelSupplierName = expense.fuelSupplierName || expense.supplyRecipientOrgName || expense.supplierOrg1 || "মেসার্স রহমান ফিলিং স্টেশন";

  const currentBill = Number(expense.grossAmount || expense.amount || 0);
  const _currentBillFormatted = convertToBengaliNumber(currentBill.toFixed(2));

  const voucherNoClean = (expense.voucherNo || "১৩").replace(/^(স্মারক\s*নং-|সূত্র\s*নং-|নং-)\s*/, "").trim();
  const supplyOrderNo = `আঃ কাঃ (বাংলা) প্রশা-১(সাপ্লাই)/${toBnDigits(voucherNoClean)}/${financialYear?.name || "২০২৬-২০২৭"}/`;
  const voucherDateFormatted = toBnDigits(
    formatDateToDDMMYYYY(expense.voucherDate || expense.expenseDate || new Date().toISOString().split("T")[0])
  );

  return `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; line-height: 1.6; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%; padding: 10px 5px;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px;">
    <div style="font-size: 1.4em; font-weight: bold; color: #000; line-height: 1.2;">বাংলাদেশ কৃষি ব্যাংক</div>
    <div style="font-size: 1.1em; font-weight: bold; color: #000; margin-top: 3px;">${offName}</div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11pt;">
    <div><strong>সূত্র নংঃ</strong> ${supplyOrderNo}</div>
    <div><strong>তারিখঃ</strong> ${voucherDateFormatted} খ্রিঃ</div>
  </div>

  <div style="margin-bottom: 14px; font-size: 11pt; line-height: 1.5;">
    স্বত্বাধিকারী / ব্যবস্থাপক,<br/>
    ${fuelSupplierName}।
  </div>

  <div style="font-weight: bold; font-size: 11.5pt; margin-bottom: 16px; text-decoration: underline;">
    বিষয়ঃ অত্র কার্যালয়ে ব্যবহৃত ${vehicleModel} (রেজিঃ নং- ${vehicleRegNo}) গাড়ীর ${fuelMonthYear} মাসের জ্বালানী (${fuelType}) সরবরাহের আদেশ (Supply Order)।
  </div>

  <p style="text-indent: 40px; margin-bottom: 14px; text-align: justify; line-height: 1.7; font-size: 11pt;">
    মহোদয়, অত্র কার্যালয়ে সরকারি দায়িত্ব পালনে সার্বক্ষণিক নিয়োজিত ${vehicleModel} গাড়ী (রেজিঃ নং- ${vehicleRegNo})-এর অনুকূলে ${fuelMonthYear} মাসে প্রয়োজনীয় জ্বালানী (${fuelType}) সরকারি নির্ধারিত মূল্যে সরবরাহের জন্য এতদ্বারা সরবরাহ আদেশ প্রদান করা হলো।
  </p>

  <table border="1" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 18px; font-size: 10.5pt;">
    <thead>
      <tr style="border-bottom: 1.5px solid #000; background-color: #fafafa;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 10%;">ক্রমিক নং</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 35%;">গাড়ির বিবরণ ও নম্বর</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 25%;">জ্বালানীর ধরণ</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 30%;">সরবরাহের মাস ও বছর</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">১.</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${vehicleModel}<br/>(রেজিঃ নং- ${vehicleRegNo})</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${fuelType}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${fuelMonthYear}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-bottom: 18px; font-size: 10.5pt; line-height: 1.7;">
    <strong>শর্তাবলীঃ</strong><br/>
    ১. সরকার নির্ধারিত মূল্যে জ্বালানী সরবরাহ করতে হবে।<br/>
    ২. জ্বালানী সরবরাহের সময় চালকের গাড়ির লগবইয়ে মিটার রিডিং ও সরবরাহকৃত জ্বালানীর পরিমাণ স্বাক্ষরসহ লিপিবদ্ধ করতে হবে।<br/>
    ৩. সরবরাহকৃত জ্বালানীর বিপরীতে সঠিক ক্যাশমেমো ও ভাউচার দাখিল সাপেক্ষে বিল পরিশোধ করা হবে।
  </div>

  <div style="display: flex; justify-content: flex-end; margin-top: 35px;">
    <div style="text-align: center; min-width: 170px;">
      <div style="border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 11pt;">
        আঞ্চলিক ব্যবস্থাপক
      </div>
      <div style="font-size: 9.5pt; color: #333;">বাংলাদেশ কৃষি ব্যাংক, ${offName}</div>
    </div>
  </div>
</div>`;
}

export function generateMotorVehicleApplicationHtml(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
): string {
  return generateMotorVehicleForwardingHtml(expense, office, category, financialYear, balanceInfo);
}

export function generateMotorVehicleForwardingLetterHtml(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  _balanceInfo: any,
): string {
  const offName = office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";
  const vehicleModel = expense.vehicleModel || "Toyota Land Cruiser Prado";
  const vehicleRegNo = expense.vehicleRegNo || "ঢাকা-মেট্রো-ঘ-১৪-১১৩২";
  const currentBill = Number(expense.grossAmount || expense.amount || 0);
  const amountWords = numberToBengaliWords(currentBill);
  const currentBillFormatted = convertToBengaliNumber(currentBill.toFixed(2));
  const _categoryCode = category?.code || "১৩৩/২৬ (এ)";
  const purposeText = expense.description || expense.purpose || expense.maintenancePurpose || "মেরামত ও রক্ষণাবেক্ষণ";

  const voucherNoClean = (expense.voucherNo || "১৩").replace(/^(স্মারক\s*নং-|সূত্র\s*নং-|নং-)\s*/, "").trim();
  const memoNo = `আঃ কাঃ (বাংলা) প্রশা-১(${toBnDigits(voucherNoClean)})/${financialYear?.name || "২০২৬-২০২৭"}/`;
  const voucherDateFormatted = toBnDigits(
    formatDateToDDMMYYYY(expense.voucherDate || expense.expenseDate || new Date().toISOString().split("T")[0])
  );

  return `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; line-height: 1.6; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%; padding: 10px 5px;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px;">
    <div style="font-size: 1.4em; font-weight: bold; color: #000; line-height: 1.2;">বাংলাদেশ কৃষি ব্যাংক</div>
    <div style="font-size: 1.1em; font-weight: bold; color: #000; margin-top: 3px;">${offName}</div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11pt;">
    <div><strong>সূত্র নং:</strong> ${memoNo}</div>
    <div><strong>তারিখ:</strong> ${voucherDateFormatted} খ্রিঃ</div>
  </div>

  <div style="margin-bottom: 14px; font-size: 11pt; line-height: 1.5;">
    উপ-মহাব্যবস্থাপক / বিভাগীয় প্রধান,<br/>
    প্রশাসন বিভাগ,<br/>
    বাংলাদেশ কৃষি ব্যাংক, প্রধান কার্যালয়, ঢাকা।
  </div>

  <div style="font-weight: bold; font-size: 11.5pt; margin-bottom: 16px; text-decoration: underline;">
    বিষয় : অত্র কার্যালয়ে ব্যবহৃত ${vehicleModel} (রেজিঃ নং-${vehicleRegNo}) গাড়ীর ${purposeText} বাবদ বিল পরিশোধের ফরোয়ার্ডিং পত্র।
  </div>

  <p style="text-indent: 40px; margin-bottom: 14px; text-align: justify; line-height: 1.7; font-size: 11pt;">
    উপযুক্ত বিষয়ের প্রেক্ষিতে জানানো যাচ্ছে যে, অত্র কার্যালয়ে সরকারি দায়িত্ব পালনে সার্বক্ষণিক নিয়োজিত ${vehicleModel} গাড়ী (রেজিঃ নং-${vehicleRegNo})-এর ${purposeText} বাবদ দাখিলকৃত সর্বমোট ৳=${currentBillFormatted} (${amountWords}) টাকার বিল ও সংশ্লিষ্ট মূল ভাউচারাদি যাচাইপূর্বক বিল পরিশোধের প্রয়োজনীয় ব্যবস্থা গ্রহণের নিমিত্তে অত্র পত্রের সাথে অগ্রবর্তী করা হলো।
  </p>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 35px;">
    <div style="font-size: 10pt;">
      <strong>সংযুক্তি :-</strong><br/>
      ১. কাজের মূল ক্যাশ মেমো / বিল ভাউচার<br/>
      ২. সংশ্লিষ্ট অনুমোদিত নোট শিট
    </div>
    <div style="text-align: center; min-width: 170px;">
      <div style="height: 45px;"></div>
      <div style="border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 11pt;">
        আঞ্চলিক ব্যবস্থাপক
      </div>
      <div style="font-size: 9.5pt; color: #333;">বাংলাদেশ কৃষি ব্যাংক, ${offName}</div>
    </div>
  </div>
</div>`;
}

export function generateMotorVehicleForwardingHtml(
  expense: any,
  office: any,
  _category: any,
  _financialYear: any,
  _balanceInfo: any,
): string {
  const offName = office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";
  
  const vRate = Number(expense.vatRate || 0);
  const tRate = Number(expense.taxRate || 0);
  const baseAmt = Number(expense.baseAmount || expense.amount || 0);
  const calcVat = Number(expense.vatAmount !== undefined ? expense.vatAmount : (baseAmt * vRate) / 100);
  const calcTax = Number(expense.taxAmount !== undefined ? expense.taxAmount : (baseAmt * tRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const amountWords = numberToBengaliWords(currentBill);

  const baseAmtFormatted = convertToBengaliNumber(baseAmt.toFixed(2));
  const calcVatFormatted = convertToBengaliNumber(calcVat.toFixed(2));
  const calcTaxFormatted = convertToBengaliNumber(calcTax.toFixed(2));
  const currentBillFormatted = convertToBengaliNumber(currentBill.toFixed(2));

  const categoryCode = _category?.code || "১৩৩/২৬ (এ)";
  const applicantName = expense.applicant?.name || expense.applicantName || expense.driverName || "";
  const applicantDesignation = expense.applicant?.designation || expense.applicantDesignation || "";
  const purposeText = expense.description || expense.purpose || expense.maintenancePurpose || "মবিল পরিবর্তন ও মেরামত";

  const isVehicleCat =
    _category?.code === "১৩৩/২৬" ||
    _category?.code === "133/26" ||
    _category?.code === "১৩৩/২৬ (এ)" ||
    _category?.code === "133/26 (A)" ||
    _category?.code === "133/26(A)" ||
    _category?.code === "১৩৩/২৬(এ)" ||
    _category?.id === "cat-32" ||
    _category?.id === "cat-33" ||
    Boolean(
      _category?.name &&
        (_category.name.includes("গাড়ী") ||
          _category.name.includes("গাড়ি") ||
          _category.name.includes("মোটর")) &&
        (_category.name.includes("জ্বালানী") ||
          _category.name.includes("জ্বালানি") ||
          _category.name.includes("রক্ষণাবেক্ষণ") ||
          _category.name.includes("রক্ষণাবেক্ষন") ||
          _category.name.includes("মেরামত")),
    );

  const purposeDescription = isVehicleCat
    ? `অত্র কার্যালয়ের গাড়ীর ${purposeText} বাবদ`
    : `অত্র কার্যালয়ের ${purposeText || _category?.name || "প্রয়োজনীয় কার্যক্রম"} বাবদ`;

  return `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%; padding: 10px 5px;">
  <div style="text-align: center; margin-bottom: 22px;">
    <div style="font-size: 1.35em; font-weight: bold; color: #000; line-height: 1.2;">বাংলাদেশ কৃষি ব্যাংক</div>
    <div style="font-size: 1.1em; font-weight: bold; color: #000; margin-top: 3px;">${offName}</div>
  </div>

  <div style="text-align: center; font-weight: bold; margin-bottom: 24px; text-decoration: underline;">
    বিষয় : ভ্রমণ অগ্রিম/ বিল মূল্য/ খরচের অগ্রিম/ খরচের পুরঃভরণ পাওয়ার আবেদন ।
  </div>

  <table border="1" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 25px;">
    <thead>
      <tr style="border-bottom: 1.5px solid #000; background-color: #fafafa;">
        <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 7%; font-weight: bold;">ক্রম</th>
        <th style="border: 1px solid #000; padding: 6px 6px; text-align: center; width: 15%; font-weight: bold;">খাত</th>
        <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 60%; font-weight: bold;">উদ্দেশ্য/বিবরণ</th>
        <th style="border: 1px solid #000; padding: 6px 6px; text-align: center; width: 18%; font-weight: bold;">টাকার পরিমান</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">১.</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-weight: bold;">${categoryCode}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${purposeDescription}</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">${baseAmtFormatted}</td>
      </tr>
      ${calcVat > 0 ? `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${convertToBengaliNumber(vRate)}% ভ্যাট</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">${calcVatFormatted}</td>
      </tr>` : ''}
      ${calcTax > 0 ? `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${convertToBengaliNumber(tRate)}% ট্যাক্স</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">${calcTaxFormatted}</td>
      </tr>` : ''}
      <tr style="font-weight: bold;">
        <td colspan="3" style="border: 1px solid #000; padding: 6px 8px; text-align: left;">
          মোট টাকা (কথায়) : ${amountWords} টাকা মাত্র
        </td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif;">
          ${currentBillFormatted}
        </td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
    <div>
      <strong>সংযুক্তি :-</strong>
    </div>
    <div style="text-align: center; min-width: 170px;">
      <div>আবেদনকারীর স্বাক্ষর</div>
      <div style="height: 50px;"></div>
      <div style="font-weight: bold;">
        ${applicantName ? `(${applicantName})` : "নাম ও পদবী"}
      </div>
      ${applicantDesignation ? `<div>${applicantDesignation}</div>` : ""}
    </div>
  </div>

  <div style="margin-bottom: 1in; line-height: 1.6;">
    প্রস্তাব মতে ৳=${currentBillFormatted}/- (কথায়ঃ ${amountWords} টাকা মাত্র) প্রদান করার সুপারিশ করা হলো ।
  </div>

  <div style="margin-bottom: 1in; line-height: 1.6;">
    ৳=${currentBillFormatted}/- (কথায়ঃ ${amountWords} টাকা মাত্র) প্রদান করুন ।
  </div>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
    <div style="text-align: right; font-weight: bold; min-width: 150px;">
      আঞ্চলিক ব্যবস্থাপক
    </div>
  </div>

  <div style="margin-top: 20px; border-top: 1px dashed #94a3b8; padding-top: 12px;">
    প্রয়োজনীয় ব্যবস্থা গ্রহনের জন্য প্রেরিত : ব্যবস্থাপক, বিকেবি, রাঙ্গামাটি শাখা, রাঙ্গামাটি ।
  </div>
</div>`;
}

export function extractMonthYearFromFuelItem(item: any, fallbackMonthYear: string): string {
  if (item.monthYear && typeof item.monthYear === "string" && item.monthYear.trim()) {
    return item.monthYear.trim().replace(/খ্রিঃ|খ্রি/g, "").trim();
  }
  if (item.month && typeof item.month === "string" && item.month.trim()) {
    return item.month.trim().replace(/খ্রিঃ|খ্রি/g, "").trim();
  }
  const dateStr = String(item.supplyDate || item.receiptNoDate || item.date || "").trim();
  if (!dateStr) return fallbackMonthYear.replace(/খ্রিঃ|খ্রি/g, "").trim();

  const asciiDate = dateStr.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

  const bnMonths = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];
  for (let i = 0; i < bnMonths.length; i++) {
    if (dateStr.includes(bnMonths[i])) {
      const yearMatch = asciiDate.match(/(?:20\d\d|১৯\d\d|২০\d\d)/);
      const yearStr = yearMatch ? toBnDigits(yearMatch[0]) : "২০২৬";
      return `${bnMonths[i]}/${yearStr}`;
    }
  }

  // Check YYYY-MM-DD
  const ymdMatch = asciiDate.match(/^(\d{4})[-/](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    if (m >= 1 && m <= 12) {
      return `${bnMonths[m - 1]}/${toBnDigits(y)}`;
    }
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = asciiDate.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (dmyMatch) {
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m >= 1 && m <= 12) {
      return `${bnMonths[m - 1]}/${toBnDigits(y)}`;
    }
  }

  return fallbackMonthYear.replace(/খ্রিঃ|খ্রি/g, "").trim();
}

export function generateMotorFuelNoteSheetHtml(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
): string {
  const vRate = Number(expense.vatRate || 0);
  const tRate = Number(expense.taxRate || 0);
  const baseAmt = Number(expense.baseAmount || expense.amount || 0);
  const calcVat = Number(expense.vatAmount !== undefined ? expense.vatAmount : (baseAmt * vRate) / 100);
  const calcTax = Number(expense.taxAmount !== undefined ? expense.taxAmount : (baseAmt * tRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const amountWords = numberToBengaliWords(currentBill);

  const vehicleModel = expense.vehicleModel || "জীপ";
  const vehicleDisplayName = vehicleModel.includes("গাড়ী") || vehicleModel.includes("গাড়ি") ? vehicleModel : `${vehicleModel} গাড়ী`;
  const vehicleRegNo = expense.vehicleRegNo || "ঢাকা-মেট্রো-ঘ-১৪-১১৩২";
  const rawFuelMonthYear = (expense.fuelMonthYear || expense.monthYear || "জুন/২০২৬").trim();
  const fuelMonthYear = rawFuelMonthYear.replace(/খ্রিঃ|খ্রি/g, "").trim();

  const fuelSupplierName = expense.fuelSupplierName || expense.supplyRecipientOrgName || expense.supplierOrg1 || "মেসার্স হিল ভিউ";
  const pageNoStr = expense.pageNo ? convertToBengaliNumber(expense.pageNo) : "৪১৯";

  const spentSoFar = balanceInfo.totalSpent + balanceInfo.totalPending - currentBill;
  const safeSpentSoFar = Math.max(0, spentSoFar);
  const spentIncludingCurrent = safeSpentSoFar + currentBill;
  const remainingBalance = balanceInfo.totalAllocated - spentIncludingCurrent;

  const budgetHtml = generateBudgetProvisionTableHtml(
    balanceInfo,
    category,
    financialYear,
    currentBill,
    safeSpentSoFar,
    remainingBalance,
  );

  const vatTaxStr = (vRate > 0 || tRate > 0)
    ? ` ${convertToBengaliNumber(vRate)}% ভ্যাট ও ${convertToBengaliNumber(tRate)}% ট্যাক্স সহ`
    : "";

  const categoryLabel = category?.name
    ? `${category.name} (${category.code || "১৩৩/২৬"})`
    : "মোটর গাড়ি জ্বালানী খরচ (১৩৩/২৬)";

  // Parse fuel items if available
  let fuelItems: any[] = [];
  if (Array.isArray(expense.fuelItems) && expense.fuelItems.length > 0) {
    fuelItems = expense.fuelItems;
  } else if (typeof expense.fuelItems === "string") {
    try {
      fuelItems = JSON.parse(expense.fuelItems);
    } catch {}
  }

  if (!fuelItems || fuelItems.length === 0) {
    fuelItems = [
      {
        fuelType: "অকটেন",
        supplyDate: "2026-06-02",
        qtyLiters: 20,
        ratePerLiter: 145,
        supplierName: fuelSupplierName,
        totalAmount: 2900,
      },
      {
        fuelType: "অকটেন",
        supplyDate: "2026-06-09",
        qtyLiters: 40,
        ratePerLiter: 145,
        supplierName: fuelSupplierName,
        totalAmount: 5800,
      },
      {
        fuelType: "অকটেন",
        supplyDate: "2026-06-24",
        qtyLiters: 7,
        ratePerLiter: 145,
        supplierName: fuelSupplierName,
        totalAmount: 1015,
      },
      {
        fuelType: "মবিল",
        supplyDate: "2026-06-24",
        qtyLiters: 5,
        ratePerLiter: 1000,
        supplierName: fuelSupplierName,
        totalAmount: 5000,
      },
    ];
  }

  // Group fuel items by month & fuel type for multi-month breakdown
  const monthGroups: { [month: string]: { [fuelType: string]: { qty: number; total: number } } } = {};
  const monthOrder: string[] = [];

  fuelItems.forEach((item) => {
    const m = extractMonthYearFromFuelItem(item, fuelMonthYear);
    if (!monthGroups[m]) {
      monthGroups[m] = {};
      monthOrder.push(m);
    }
    const fType = (item.fuelType || expense.fuelType || "অকটেন").trim();
    if (!monthGroups[m][fType]) {
      monthGroups[m][fType] = { qty: 0, total: 0 };
    }
    const q = Number(item.qtyLiters || 0);
    const lineTotal = Number(
      item.totalAmount !== undefined
        ? item.totalAmount
        : Number(item.ratePerLiter || 0) * q
    );
    monthGroups[m][fType].qty += q;
    monthGroups[m][fType].total += lineTotal;
  });

  const monthParts: string[] = [];
  monthOrder.forEach((m, idx) => {
    const fTypes = monthGroups[m];
    const fTypeStrings: string[] = [];
    Object.entries(fTypes).forEach(([fType, data]) => {
      const formattedQty = convertToBengaliNumber(
        data.qty % 1 === 0 ? data.qty.toString() : data.qty.toFixed(2)
      );
      const formattedAmt = convertToBengaliNumber(data.total.toFixed(2));
      fTypeStrings.push(
        `${formattedQty} লিটার ${fType} বাবদ ${formattedAmt} টাকা`
      );
    });

    const fTypeCombined = fTypeStrings.join(" এবং ");
    const monthSuffix = idx === 0 ? "মাসের" : "মাসে";
    monthParts.push(`${m} ${monthSuffix} ${fTypeCombined}`);
  });

  const monthBreakdownText = monthParts.length > 0
    ? monthParts.join(" ও ")
    : `${fuelMonthYear} মাসের প্রয়োজনীয় জ্বালানী`;

  const subjectMonths = monthOrder.length > 0 ? monthOrder.join(" ও ") : fuelMonthYear;
  const fuelMonthYearSubject = subjectMonths.includes("খ্রিঃ") || subjectMonths.includes("খ্রি")
    ? subjectMonths
    : `${subjectMonths} খ্রিঃ`;

  const totalFuelAmount = fuelItems.reduce((sum, it) => sum + Number(it.totalAmount || 0), 0) || currentBill;
  const currentBillFormatted = convertToBengaliNumber(currentBill % 1 === 0 ? currentBill.toString() : currentBill.toFixed(2));
  const totalFuelAmtFormatted = convertToBengaliNumber(Number(totalFuelAmount).toFixed(2));

  const fuelTableRows = fuelItems
    .map((item, idx) => {
      const slNo = convertToBengaliNumber(idx + 1) + "।";
      const fType = item.fuelType || "অকটেন";
      let dateStr = item.supplyDate || item.receiptNoDate || "";
      if (dateStr && dateStr.includes("-") && dateStr.length === 10) {
        dateStr = formatDateToDDMMYYYY(dateStr);
      }
      const supplyDateFormatted = dateStr ? convertToBengaliNumber(dateStr) : "-";
      const qtyFormatted = item.qtyLiters ? convertToBengaliNumber(item.qtyLiters % 1 === 0 ? item.qtyLiters.toString() : Number(item.qtyLiters).toFixed(2)) : "-";
      const rateFormatted = item.ratePerLiter ? convertToBengaliNumber(item.ratePerLiter % 1 === 0 ? item.ratePerLiter.toString() : Number(item.ratePerLiter).toFixed(2)) : "-";
      const itemSupName = item.supplierName || fuelSupplierName;
      const lineTotal = Number(item.totalAmount !== undefined ? item.totalAmount : (Number(item.ratePerLiter || 0) * Number(item.qtyLiters || 0)));
      const lineTotalFormatted = convertToBengaliNumber(lineTotal.toFixed(2));

      const priceFormula = (Number(item.ratePerLiter || 0) > 0 && Number(item.qtyLiters || 0) > 0)
        ? `${rateFormatted} &nbsp;×&nbsp; ${qtyFormatted} &nbsp;=&nbsp; ${lineTotalFormatted}`
        : lineTotalFormatted;

      return `<tr>
        <td style="border: 1px solid #000; padding: 6px 3px; text-align: center;">${slNo}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${fType}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; white-space: nowrap;">${supplyDateFormatted}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; white-space: nowrap;">${qtyFormatted}&nbsp; লিঃ</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${itemSupName}</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: right; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; white-space: nowrap;">${priceFormula}</td>
      </tr>`;
    })
    .join("");

  return `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; line-height: 1.6; text-align: justify;">
  <div style="text-align: center; font-weight: bold; margin-bottom: 8pt;">
    (পাতা-${pageNoStr})
  </div>
  <div style="font-weight: bold; margin-bottom: 16pt; text-align: center;">
    <u>বিষয় : ${fuelMonthYearSubject} মাসের ${vehicleDisplayName}র জ্বালানী তেলের মূল্য পরিশোধ প্রসঙ্গে</u>
  </div>
  
  <p style="text-indent: 40px; margin-bottom: 12pt; text-align: justify; line-height: 1.7;">
    অত্র কার্যালয়ের ${vehicleDisplayName} নং-${vehicleRegNo} এর ${monthBreakdownText} খরচ বাবদ ${fuelSupplierName} কর্তৃক সর্বমোট ৳=${currentBillFormatted}/-, (${amountWords}) টাকা মূল্যের নিম্ন বর্ণনা মোতাবেক একটি বিল দাখিল করা হয়।
  </p>

  <table border="1" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin: 12pt 0 14pt 0; font-size: 0.95em;">
    <thead>
      <tr style="background-color: #f8fafc; border-bottom: 1.5px solid #000;">
        <th style="border: 1px solid #000; padding: 6px 2px; text-align: center; width: 6%; font-weight: bold;">ক্রমিক<br/>নং</th>
        <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 11%; font-weight: bold;">জ্বালানীর<br/>ধরণ</th>
        <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 13%; font-weight: bold;">সরবরাহের তারিখ</th>
        <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 14%; font-weight: bold;">সরবরাহকৃত<br/>জ্বালানীর পরিমাণ</th>
        <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 18%; font-weight: bold;">সরবরাহকারী প্রতিষ্ঠান</th>
        <th style="border: 1px solid #000; padding: 6px 6px; text-align: center; width: 38%; font-weight: bold;">মূল্য</th>
      </tr>
    </thead>
    <tbody>
      ${fuelTableRows}
      <tr style="font-weight: bold; background-color: #fcfcfc;">
        <td colspan="4" style="border: 1px solid #000; padding: 6px 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: center; font-weight: bold;">মোট=</td>
        <td style="border: 1px solid #000; padding: 6px 6px; text-align: right; font-weight: bold; font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; white-space: nowrap;">৳=&nbsp; ${totalFuelAmtFormatted}</td>
      </tr>
    </tbody>
  </table>

  ${budgetHtml}

  <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 1in; text-align: justify; line-height: 1.6;">
    অতএব, আর্থিক সম্মতি প্রদানের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, বিকেবি, আঞ্চলিক নিরীক্ষা কার্যালয়, রাঙ্গামাটি মহোদয়ের নিকট প্রেরণ করা যেতে পারে।
  </p>
  
  <div class="audit-approval-section" style="display: flex; flex-direction: column; gap: 1in; line-height: 1.6;">
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহণের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, বিকেবি, আঞ্চলিক নিরীক্ষা কার্যালয়, রাঙ্গামাটি মহোদয়ের নিকট প্রেরণ করুন।</div>
    <div><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> আঞ্চলিক কার্যালয়, রাঙ্গামাটি এর ${categoryLabel} খাতে${vatTaxStr} সর্বমোট ৳=${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))}/- (কথায়: ${amountWords} টাকা মাত্র) বিল প্রদানের আর্থিক সম্মতি প্রদান করা হলো।</div>
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>
</div>`;
}

export function generateMotorVehicleNoteSheetHtml(
  expense: any,
  _office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
): string {
  const vRate = Number(expense.vatRate || 0);
  const tRate = Number(expense.taxRate || 0);
  const baseAmt = Number(expense.baseAmount || expense.amount || 0);
  const calcVat = Number(expense.vatAmount || (baseAmt * vRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * tRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const amountWords = numberToBengaliWords(currentBill);

  const vehicleModel = expense.vehicleModel || "Toyota Land Cruiser Prado";
  const vehicleRegNo = expense.vehicleRegNo || "ঢাকা-মেট্রো-ঘ-১৪-১১৩২";
  const applicantName = expense.applicant?.name || expense.applicantName || expense.driverName || "মোঃ এনামুল হক";
  const applicantDesignation = expense.applicant?.designation || expense.applicantDesignation || "গাড়ী চালক";
  const purposeText = expense.description || expense.purpose || expense.maintenancePurpose || "মেরামত ও রক্ষণাবেক্ষণ";

  const pageNoStr = expense.pageNo ? convertToBengaliNumber(expense.pageNo) : "৪১৯";

  const spentSoFar = balanceInfo.totalSpent + balanceInfo.totalPending - currentBill;
  const safeSpentSoFar = Math.max(0, spentSoFar);
  const spentIncludingCurrent = safeSpentSoFar + currentBill;
  const remainingBalance = balanceInfo.totalAllocated - spentIncludingCurrent;

  const budgetHtml = generateBudgetProvisionTableHtml(
    balanceInfo,
    category,
    financialYear,
    currentBill,
    safeSpentSoFar,
    remainingBalance,
  );

  const vatTaxStr = (vRate > 0 || tRate > 0)
    ? ` ${convertToBengaliNumber(vRate)}% ভ্যাট ও ${convertToBengaliNumber(tRate)}% ট্যাক্স সহ`
    : "";

  const categoryLabel = category?.name
    ? `${category.name} (${category.code || "১৩৩/২৬ (এ)"})`
    : "মোটর গাড়ী রক্ষণাবেক্ষণ (১৩৩/২৬ (এ))";

  const subjectText = `বিষয় : অত্র কার্যালয়ের ${vehicleModel} গাড়ি ${purposeText} বাবদ খরচকৃত অর্থ পরিশোধ প্রসঙ্গে।`;

  const para1Prefix = `অত্র কার্যালয়ের ${vehicleModel} গাড়ী নং-${vehicleRegNo} এর জরুরী ভিত্তিতে ${purposeText} বাবদ${vatTaxStr}`;

  return `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; line-height: 1.6; text-align: justify;">
  <div style="text-align: center; font-weight: bold; margin-bottom: 8pt;">
    (পাতা-${pageNoStr})
  </div>
  <div style="font-weight: bold; margin-bottom: 16pt; text-align: center; text-decoration: underline;">
    ${subjectText}
  </div>
  
  <p style="text-indent: 40px; margin-bottom: 12pt; text-align: justify; line-height: 1.6;">
    ${para1Prefix} সর্বমোট ৳=${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))}/- (কথায়: ${amountWords} টাকা মাত্র) খরচ পূর্বক অত্র কার্যালয়ের ${applicantDesignation} জনাব ${applicantName} কর্তৃক খরচের রশিদ সহ একখানা আবেদন করা হয়। তাঁর আবেদন সঠিক ও যথাযথ পরিলক্ষিত হওয়ায় আবেদনকৃত ৳=${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))}/- (কথায়: ${amountWords} টাকা মাত্র) নগদে প্রদানাদেশ দেওয়া যেতে পারে।
  </p>

  ${budgetHtml}

  <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 1in; text-align: justify; line-height: 1.6;">
    আর্থিক সম্মতি প্রদানের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, বিকেবি, আঞ্চলিক নিরীক্ষা কার্যালয়, রাঙ্গামাটি মহোদয়ের নিকট প্রেরণ করা যেতে পারে।
  </p>
  
  <div class="audit-approval-section" style="display: flex; flex-direction: column; gap: 1in; line-height: 1.6;">
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহণের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, বিকেবি, আঞ্চলিক নিরীক্ষা কার্যালয়, রাঙ্গামাটি মহোদয়ের নিকট প্রেরণ করুন।</div>
    <div><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> আঞ্চলিক কার্যালয়, রাঙ্গামাটি এর ${categoryLabel} খাতে${vatTaxStr} সর্বমোট ৳=${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))}/- (কথায়: ${amountWords} টাকা মাত্র) বিল প্রদানের আর্থিক সম্মতি প্রদান করা হলো।</div>
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>
</div>`;
}

export function generateMiscNoteSheetHtml(
  expense: any,
  _office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
): string {
  const vRate = Number(expense.vatRate || 0);
  const tRate = Number(expense.taxRate || 0);
  const baseAmt = Number(expense.baseAmount || expense.amount || 0);
  const calcVat = Number(expense.vatAmount || (baseAmt * vRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * tRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const amountWords = numberToBengaliWords(currentBill);

  const applicantName = expense.applicant?.name || expense.applicantName || "জনাব মো: এনামুল হক";
  const applicantDesignation = expense.applicant?.designation || expense.applicantDesignation || "গাড়ী চালক";
  const rawPurpose = expense.description || expense.purpose || "ফেরি পাড়াপাড় খরচ";
  const cleanPurpose = rawPurpose.trim();
  const purposeWithUrgent = cleanPurpose.startsWith("জরুরী ভিত্তিতে")
    ? cleanPurpose
    : `জরুরী ভিত্তিতে ${cleanPurpose}`;

  const pageNoStr = expense.pageNo ? convertToBengaliNumber(expense.pageNo) : "৪১৯";

  const spentSoFar = balanceInfo.totalSpent + balanceInfo.totalPending - currentBill;
  const safeSpentSoFar = Math.max(0, spentSoFar);
  const spentIncludingCurrent = safeSpentSoFar + currentBill;
  const remainingBalance = balanceInfo.totalAllocated - spentIncludingCurrent;

  const budgetHtml = generateBudgetProvisionTableHtml(
    balanceInfo,
    category,
    financialYear,
    currentBill,
    safeSpentSoFar,
    remainingBalance,
  );

  const vatTaxStr = (vRate > 0 || tRate > 0)
    ? ` ${convertToBengaliNumber(vRate)}% ভ্যাট ও ${convertToBengaliNumber(tRate)}% ট্যাক্স সহ`
    : "";

  const categoryLabel = category?.name
    ? `${category.name} (${category.code || "১৩৩/৩৬ (সি)"})`
    : "বিবিধ খরচ (সাধারণ) (১৩৩/৩৬ (সি))";

  return `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; line-height: 1.6; text-align: justify;">
  <div style="text-align: center; font-weight: bold; margin-bottom: 8pt;">
    (পাতা-${pageNoStr})
  </div>
  <div style="font-weight: bold; margin-bottom: 16pt; text-align: center; text-decoration: underline;">
    বিষয় : অত্র কার্যালয়ের ${categoryLabel} বাবদ খরচকৃত অর্থ পরিশোধ প্রসঙ্গে।
  </div>
  
  <p style="text-indent: 40px; margin-bottom: 12pt; text-align: justify; line-height: 1.6;">
    অত্র কার্যালয়ের ${purposeWithUrgent} বাবদ${vatTaxStr} সর্বমোট ৳=${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))}/- (কথায়: ${amountWords} টাকা মাত্র) খরচ পূর্বক অত্র কার্যালয়ের ${applicantDesignation} জনাব ${applicantName} কর্তৃক খরচের রশিদ সহ একখানা আবেদন করা হয়। তাঁর আবেদন সঠিক ও যথাযথ পরিলক্ষিত হওয়ায় আবেদনকৃত ৳=${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))}/- (কথায়: ${amountWords} টাকা মাত্র) নগদে প্রদানাদেশ দেওয়া যেতে পারে।
  </p>

  ${budgetHtml}

  <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 1in; text-align: justify; line-height: 1.6;">
    আর্থিক সম্মতি প্রদানের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, বিকেবি, আঞ্চলিক নিরীক্ষা কার্যালয়, রাঙ্গামাটি মহোদয়ের নিকট প্রেরণ করা যেতে পারে।
  </p>
  
  <div class="audit-approval-section" style="display: flex; flex-direction: column; gap: 1in; line-height: 1.6;">
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহণের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, বিকেবি, আঞ্চলিক নিরীক্ষা কার্যালয়, রাঙ্গামাটি মহোদয়ের নিকট প্রেরণ করুন।</div>
    <div><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> আঞ্চলিক কার্যালয়, রাঙ্গামাটি এর ${categoryLabel} খাতে${vatTaxStr} সর্বমোট ৳=${convertToBengaliNumber(currentBill.toLocaleString("en-IN"))}/- (কথায়: ${amountWords} টাকা মাত্র) বিল প্রদানের আর্থিক সম্মতি প্রদান করা হলো।</div>
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>
</div>`;
}

export function isFuelCategory(category: any): boolean {
  if (!category) return false;
  const code = (category.code || "").trim();
  if (code === "১৩৩/২৬" || code === "133/26" || category.id === "cat-32") return true;
  const name = category.name || "";
  const isVehicle = name.includes("গাড়ী") || name.includes("গাড়ি") || name.includes("মোটর");
  const isFuel = name.includes("জ্বালানী") || name.includes("জ্বালানি") || name.includes("ফুয়েল") || name.toLowerCase().includes("fuel");
  return isVehicle && isFuel;
}

export function isMaintenanceCategory(category: any): boolean {
  if (!category) return false;
  const code = (category.code || "").trim();
  if (
    code === "১৩৩/২৬ (এ)" ||
    code === "133/26 (A)" ||
    code === "133/26(A)" ||
    code === "১৩৩/২৬(এ)" ||
    category.id === "cat-33"
  ) return true;
  const name = category.name || "";
  const isVehicle = name.includes("গাড়ী") || name.includes("গাড়ি") || name.includes("মোটর");
  const isMaint = name.includes("রক্ষণাবেক্ষণ") || name.includes("রক্ষণাবেক্ষন") || name.includes("মেরামত");
  return isVehicle && isMaint;
}

export function isMiscCategory(category: any): boolean {
  if (!category) return false;
  return (
    category.id === "cat-38" ||
    Boolean(
      category.code &&
        (category.code.includes("১৩৩/৩৬ (সি)") ||
          category.code.includes("133/36 (C)") ||
          category.code.includes("133/36(C)")),
    ) ||
    Boolean(category.name && category.name.includes("বিবিধ"))
  );
}

export function renderExpenseNoteSheetContent(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
  template?: any,
): string {
  if (isFuelCategory(category)) {
    return generateMotorFuelNoteSheetHtml(
      expense,
      office,
      category,
      financialYear,
      balanceInfo,
    );
  }

  if (isMaintenanceCategory(category)) {
    return generateMotorVehicleNoteSheetHtml(
      expense,
      office,
      category,
      financialYear,
      balanceInfo,
    );
  }

  if (isMiscCategory(category)) {
    return generateMiscNoteSheetHtml(
      expense,
      office,
      category,
      financialYear,
      balanceInfo,
    );
  }
  if (
    expense.expenseType === "Quotation" &&
    expense.quotationFormType === "Form2"
  ) {
    return generateForm2NoteSheetHtml(
      expense,
      office,
      category,
      financialYear,
      balanceInfo,
    );
  }
  if (
    expense.expenseType === "Quotation" &&
    expense.quotationFormType === "Form1"
  ) {
    if (
      !template ||
      template.id === "tpl-form1-quotation" ||
      !template.bodyTemplate
    ) {
      return generateForm1NoteSheetHtml(
        expense,
        office,
        category,
        financialYear,
        balanceInfo,
      );
    }
  }

  if (!template) {
    const defaultTemplate = {
      id: "tpl-default-regular",
      title: "নিয়মিত ব্যয় বিল পরিশোধ নোটশিট",
      bodyTemplate: `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 12pt; line-height: 1.6; text-align: justify;">
  <div style="text-align: center; font-weight: bold; margin-bottom: 8pt;">
    (পাতা-{{PAGE_NO}})
  </div>
  <div style="font-weight: bold; margin-bottom: 16pt; text-align: center; text-decoration: underline;">
    বিষয়ঃ {{CATEGORY_NAME}} খাতের {{DESCRIPTION}} বিল পরিশোধ প্রসঙ্গে ।
  </div>
  
  <p style="text-indent: 40px; margin-bottom: 10pt;">
    অত্র কার্যালয়ের/অঞ্চলের জন্য {{DESCRIPTION}} আনায়ন/ক্রয় বাবদ {{VAT_LABEL}} ও {{TAX_LABEL}}সহ সর্বমোট ৳={{EXPENSE_AMOUNT}} ({{AMOUNT_IN_WORDS}}) টাকা মাত্র খরচের ভাউচারসহকারে খরচকৃত অর্থ প্রাপ্তির জন্য অত্র কার্যালয়ের {{APPLICANT_DESIGNATION}}, জনাব {{APPLICANT_NAME}} কর্তৃক একখানা আবেদন দাখিল করা হয়। তাঁর আবেদন সঠিক পরিলক্ষিত হওয়ায় ৳={{AMOUNT_WITH_WORDS}} টাকা মাত্র {{PAYMENT_TYPE}} প্রদানের অনুমোদন দেয়া যেতে পারে।
  </p>

  {{BUDGET_TABLE}}
  
  <div style="margin-top: 15pt; margin-bottom: 0pt; display: flex; justify-content: flex-end;">
    <div style="text-align: center; min-width: 170pt; display: inline-block;">
      <div style="height: 35pt;"></div>
      <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
        প্রস্তুতকারী কর্মকর্তা
      </div>
      <div style="font-size: 0.85em; color: #444; font-family: monospace;">
        {{ENTRY_OFFICER}}
      </div>
    </div>
  </div>
  
  <div class="audit-approval-section" style="margin-top: 20pt; display: flex; flex-direction: column; gap: 20pt;">
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা খরচের আর্থিক সম্মতির গ্রহনের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} বরাবরে নথি প্রেরণ করুন।</div>
    <div><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> {{OFFICE_NAME}} এর জন্য {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</div>
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>
</div>`,
    };
    return renderExpenseNoteSheetContent(
      expense,
      office,
      category,
      financialYear,
      balanceInfo,
      defaultTemplate,
    );
  }

  if (template && template.bodyTemplate) {
    let content = template.bodyTemplate;

    const hasMusok =
      expense.hasStockChalan === "হ্যাঁ" ||
      (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
    const vRate = Number(expense.vatRate || 0);
    const tRate = hasMusok ? 0 : Number(expense.taxRate || 0);
    const vatTaxMultiplier = 1 + (vRate + tRate) / 100;

    const vatWord = "ভ্যাট";
    const taxWord = "ট্যাক্স";
    const vatText =
      vRate > 0 ? `${convertToBengaliNumber(vRate)}% ভ্যাট` : "ভ্যাট";
    const taxText =
      tRate > 0 ? `${convertToBengaliNumber(tRate)}% ট্যাক্স` : "ট্যাক্স";

    let tvText = "ভ্যাট ও ট্যাক্স ব্যতীত";
    if (vRate > 0 && tRate > 0) {
      tvText = `${convertToBengaliNumber(vRate)}% ভ্যাট ও ${convertToBengaliNumber(tRate)}% ট্যাক্সসহ`;
    } else if (vRate > 0 && tRate === 0) {
      tvText = `${convertToBengaliNumber(vRate)}% ভ্যাটসহ`;
    } else if (vRate === 0 && tRate > 0) {
      tvText = `${convertToBengaliNumber(tRate)}% ট্যাক্সসহ`;
    }

    const quotationItems = expense.quotationItems || [];
    const baseAmt = Number(
      expense.baseAmount ||
        quotationItems.reduce(
          (acc: number, item: any) => acc + (item.totalPrice || 0),
          0,
        ) ||
        expense.amount ||
        0,
    );
    const calcVat = Number(expense.vatAmount || (baseAmt * vRate) / 100);
    const calcTax = Number(expense.taxAmount || (baseAmt * tRate) / 100);
    const currentBillAmount = Number(
      expense.grossAmount || expense.amount || baseAmt + calcVat + calcTax,
    );

    const spentSoFar =
      balanceInfo.totalSpent + balanceInfo.totalPending - currentBillAmount;
    const safeSpentSoFar = Math.max(0, spentSoFar);
    const spentIncludingCurrent = safeSpentSoFar + currentBillAmount;
    const remainingBalance = balanceInfo.totalAllocated - spentIncludingCurrent;
    const amountWords = numberToBengaliWords(currentBillAmount);
    const amountBn = convertToBengaliNumber(
      currentBillAmount.toLocaleString("en-IN"),
    );
    const amountWithSlash = `${amountBn}/-`;
    const amountWithWords = `${amountWithSlash} (${amountWords})`;

    const itemsText = formatItemsListText(quotationItems);
    content = content.replace(
      /{{ITEMS_DESCRIPTION}}/g,
      itemsText || expense.description || "",
    );
    content = content.replace(
      /{{ITEMS_LIST}}/g,
      itemsText || expense.description || "",
    );
    content = content.replace(
      /{{QUANTITY_AND_ITEMS}}/g,
      itemsText || expense.description || "",
    );
    content = content.replace(
      /{{EXPENSE_ITEM}}/g,
      itemsText || expense.description || "",
    );

    const {
      biddersHtml,
      lowestBidderName,
      totalBiddersCount,
      isMultipleItems,
    } = generateQuotationBiddersTableHtml(expense, vatTaxMultiplier, tvText);
    const budgetHtml = generateBudgetProvisionTableHtml(
      balanceInfo,
      category,
      financialYear,
      currentBillAmount,
      safeSpentSoFar,
      remainingBalance,
    );




    const isRegularExpense =
      template?.id === "tpl-regular-expense" ||
      template?.id === "tpl-default-regular" ||
      expense.expenseType !== "Quotation";
    const isBillUnder1500 = isRegularExpense && currentBillAmount <= 1500;

    const auditApprovalHtml = `<div class="audit-approval-section" style="margin-top: 20pt; display: flex; flex-direction: column; gap: 20pt;">
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা খরচের আর্থিক সম্মতির গ্রহনের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} বরাবরে নথি প্রেরণ করুন।</div>
    <div><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> {{OFFICE_NAME}} এর জন্য {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</div>
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>`;

    if (isBillUnder1500) {

      content = content.replace(/{{AUDIT_APPROVAL_SECTION}}/g, "");
      content = content.replace(/{{AUDIT_APPROVAL_PARAGRAPHS}}/g, "");

      content = content.replace(
        /<div[^>]*class="[^"]*audit-approval-section[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi,
        "",
      );
      content = content.replace(
        /<div[^>]*id="audit-approval-section"[\s\S]*?<\/div>\s*<\/div>/gi,
        "",
      );
      content = content.replace(
        /<div[^>]*style="[^"]*(?:flex-direction:\s*column|gap:\s*2[04]pt)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi,
        "",
      );
      content = content.replace(
        /<div[^>]*>[\s\S]*?<strong>\s*আঞ্চলিক ব্যবস্থাপক\s*:-[\s\S]*?আঞ্চলিক নিরীক্ষা কর্মকর্তা[\s\S]*?অনুমোদিত[\s\S]*?<\/div>\s*<\/div>/gi,
        "",
      );
      content = content.replace(
        /<(?:div|p)[^>]*>[\s\S]*?আঞ্চলিক ব্যবস্থাপক\s*:-[\s\S]*?আঞ্চলিক নিরীক্ষা কর্মকর্তা[\s\S]*?<\/(?:div|p)>/gi,
        "",
      );
      content = content.replace(
        /<(?:div|p)[^>]*>[\s\S]*?আঞ্চলিক নিরীক্ষা কর্মকর্তা\s*:-[\s\S]*?<\/(?:div|p)>/gi,
        "",
      );
      content = content.replace(
        /<(?:div|p)[^>]*>[\s\S]*?আঞ্চলিক ব্যবস্থাপক\s*:-[\s\S]*?অনুমোদিত[\s\S]*?<\/(?:div|p)>/gi,
        "",
      );
    } else {

      if (
        content.includes("{{AUDIT_APPROVAL_SECTION}}") ||
        content.includes("{{AUDIT_APPROVAL_PARAGRAPHS}}")
      ) {
        content = content.replace(
          /{{AUDIT_APPROVAL_SECTION}}/g,
          auditApprovalHtml,
        );
        content = content.replace(
          /{{AUDIT_APPROVAL_PARAGRAPHS}}/g,
          auditApprovalHtml,
        );
      } else if (
        !content.includes("আঞ্চলিক নিরীক্ষা কর্মকর্তা") &&
        (template.id === "tpl-regular-expense" ||
          template.id === "tpl-default-regular" ||
          expense.expenseType !== "Quotation")
      ) {
        content += "\n\n" + auditApprovalHtml;
      }
    }



    const singleLineDualSigHtml = `<div class="regular-signatures-single-line" style="margin-top: 25pt; margin-bottom: 0pt; display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
    <div style="text-align: center; min-width: 170pt; display: inline-block;">
      <div style="height: 35pt;"></div>
      <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
        আঞ্চলিক ব্যবস্থাপক
      </div>
      <div style="font-size: 0.85em; color: #444;">
        {{INSTITUTION_NAME}}
      </div>
    </div>
    <div style="text-align: center; min-width: 170pt; display: inline-block;">
      <div style="height: 35pt;"></div>
      <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
        প্রস্তুতকারী কর্মকর্তা
      </div>
      <div style="font-size: 0.85em; color: #444; font-family: monospace;">
        {{ENTRY_OFFICER}}
      </div>
    </div>
  </div>`;

    const standardRightOnlySigHtml = `<div style="margin-top: 15pt; margin-bottom: 0pt; display: flex; justify-content: flex-end;">
    <div style="text-align: center; min-width: 170pt; display: inline-block;">
      <div style="height: 35pt;"></div>
      <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
        প্রস্তুতকারী কর্মকর্তা
      </div>
      <div style="font-size: 0.85em; color: #444; font-family: monospace;">
        {{ENTRY_OFFICER}}
      </div>
    </div>
  </div>`;

    if (isRegularExpense) {
      if (isBillUnder1500) {

        const rightSigPattern =
          /<div[^>]*style="[^"]*justify-content:\s*flex-end[^"]*"[\s\S]*?প্রস্তুতকারী কর্মকর্তা[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
        if (rightSigPattern.test(content)) {
          content = content.replace(rightSigPattern, singleLineDualSigHtml);
        } else if (!content.includes("regular-signatures-single-line")) {
          content += "\n\n" + singleLineDualSigHtml;
        }
      } else {

        if (content.includes("regular-signatures-single-line")) {
          content = content.replace(
            /<div[^>]*class="[^"]*regular-signatures-single-line[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
            standardRightOnlySigHtml,
          );
        }
      }
    }

    const itemTextPhrase = isMultipleItems ? "উক্ত পণ্য সমূহ" : "উক্ত পণ্যটি";
    const descTextPhrase = isMultipleItems
      ? "বর্ণিত পণ্য সমূহ"
      : "বর্ণিত পণ্যটি";

    content = content.replace(/{{QUOTATION_TABLE}}/g, biddersHtml);
    content = content.replace(/{{BUDGET_TABLE}}/g, budgetHtml);
    content = content.replace(/{{PROVISION_TABLE}}/g, budgetHtml);
    content = content.replace(/{{BUDGET_PROVISION_TABLE}}/g, budgetHtml);
    content = content.replace(
      /{{TOTAL_BIDDERS_COUNT}}/g,
      convertToBengaliNumber(totalBiddersCount),
    );
    content = content.replace(/{{LOWEST_BIDDER_NAME}}/g, lowestBidderName);
    content = content.replace(/{{AMOUNT_IN_WORDS}}/g, amountWords);
    content = content.replace(/{{AMOUNT_WORDS}}/g, amountWords);
    content = content.replace(/{{EXPENSE_AMOUNT_WORDS}}/g, amountWords);
    content = content.replace(/{{AMOUNT_WITH_WORDS}}/g, amountWithWords);
    content = content.replace(/{{EXPENSE_AMOUNT_AND_WORDS}}/g, amountWithWords);
    content = content.replace(/{{EXPENSE_AMOUNT}}/g, amountWithSlash);
    content = content.replace(/{{AMOUNT}}/g, amountWithSlash);
    content = content.replace(/{{AMOUNT_NUM}}/g, amountBn);
    content = content.replace(/{{CURRENT_EXPENSE}}/g, amountBn);
    content = content.replace(/{{ITEM_TEXT_PHRASE}}/g, itemTextPhrase);
    content = content.replace(/{{DESC_TEXT_PHRASE}}/g, descTextPhrase);

    content = content.replace(/{{VAT_LABEL}}/g, vatWord);
    content = content.replace(/{{VAT_WORD}}/g, vatWord);
    content = content.replace(/{{TAX_LABEL}}/g, taxWord);
    content = content.replace(/{{TAX_WORD}}/g, taxWord);
    content = content.replace(/{{VAT_TEXT}}/g, vatText);
    content = content.replace(/{{TAX_TEXT}}/g, taxText);
    content = content.replace(/{{VAT_RATE_TEXT}}/g, vatText);
    content = content.replace(/{{TAX_RATE_TEXT}}/g, taxText);
    content = content.replace(/{{TAX_VAT_TEXT}}/g, tvText);
    content = content.replace(
      /{{VAT_RATE_PERCENT}}/g,
      `${convertToBengaliNumber(vRate)}%`,
    );
    content = content.replace(
      /{{TAX_RATE_PERCENT}}/g,
      `${convertToBengaliNumber(tRate)}%`,
    );
    content = content.replace(/{{VAT_RATE}}/g, convertToBengaliNumber(vRate));
    content = content.replace(/{{TAX_RATE}}/g, convertToBengaliNumber(tRate));
    content = content.replace(
      /{{VAT_AMOUNT}}/g,
      `${convertToBengaliNumber(calcVat.toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(
      /{{TAX_AMOUNT}}/g,
      `${convertToBengaliNumber(calcTax.toLocaleString("en-IN"))}/-`,
    );

    const pageNoStr = expense.pageNo
      ? convertToBengaliNumber(expense.pageNo)
      : "৪১৯";
    content = content.replace(/{{PAGE_NO}}/g, pageNoStr);
    content = content.replace(/{{NOTE_PAGE_NO}}/g, pageNoStr);

    const hasBranchEntries =
      expense.branchEntries &&
      Array.isArray(expense.branchEntries) &&
      expense.branchEntries.length > 0;
    const targetOfficeForText = hasBranchEntries
      ? "অত্র অঞ্চলাধীন শাখাসমূহের জন্য"
      : office?.name
        ? `${office.name} এর জন্য`
        : "আঞ্চলিক কার্যালয়, রাঙ্গামাটি এর জন্য";

    content = content.replace(
      /{{FOR_OFFICE_OR_BRANCHES}}/g,
      targetOfficeForText,
    );
    content = content.replace(/{{OFFICE_TARGET_TEXT}}/g, targetOfficeForText);

    if (hasBranchEntries) {
      content = content.replace(
        /{{OFFICE_NAME}}\s*এর জন্য/g,
        "অত্র অঞ্চলাধীন শাখাসমূহের জন্য",
      );
      content = content.replace(
        /আঞ্চলিক কার্যালয়[^\s,।]*\s*(?:,\s*[^\s,।]+)?\s*এর জন্য/g,
        "অত্র অঞ্চলাধীন শাখাসমূহের জন্য",
      );
      content = content.replace(
        /আঞ্চলিক কার্যালয়ের জন্য/g,
        "অত্র অঞ্চলাধীন শাখাসমূহের জন্য",
      );
    }

    content = content.replace(/{{OFFICE_NAME}}/g, office ? office.name : "");
    content = content.replace(
      /আঞ্চলিক নিরীক্ষা কার্যালয়,\s*আঞ্চলিক কার্যালয়,/g,
      "আঞ্চলিক নিরীক্ষা কার্যালয়,",
    );
    content = content.replace(
      /{{FINANCIAL_YEAR}}/g,
      financialYear ? financialYear.name : "",
    );
    content = content.replace(/{{CATEGORY}}/g, category ? category.name : "");
    content = content.replace(
      /{{CATEGORY_NAME}}/g,
      category ? category.name : "",
    );
    content = content.replace(
      /{{BUDGET_HEAD}}/g,
      category ? category.budgetHead || category.code || "" : "",
    );
    content = content.replace(
      /{{CATEGORY_BUDGET_HEAD}}/g,
      category ? category.budgetHead || category.code || "" : "",
    );
    content = content.replace(
      /{{CATEGORY_CODE}}/g,
      category ? category.code || "" : "",
    );
    content = content.replace(
      /{{EXPENSE_DATE}}/g,
      expense.expenseDate
        ? convertToBengaliNumber(formatDateToDDMMYYYY(expense.expenseDate))
        : "",
    );
    content = content.replace(
      /{{VOUCHER_DATE}}/g,
      expense.voucherDate
        ? convertToBengaliNumber(formatDateToDDMMYYYY(expense.voucherDate))
        : "",
    );
    content = content.replace(
      /{{BASE_AMOUNT}}/g,
      `${convertToBengaliNumber(baseAmt.toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(
      /{{NET_PAYABLE}}/g,
      `${convertToBengaliNumber(Number(expense.netPayable || expense.amount || currentBillAmount).toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(/{{GROSS_AMOUNT}}/g, amountWithSlash);
    content = content.replace(/{{DESCRIPTION}}/g, expense.description || "");
    content = content.replace(
      /{{EXPENSE_DESCRIPTION}}/g,
      expense.description || "",
    );
    content = content.replace(/{{PURPOSE}}/g, expense.description || "");
    content = content.replace(/{{EXPENSE_TITLE}}/g, expense.description || "");
    content = content.replace(/{{REMARKS}}/g, expense.remarks || "");

    const applicantName = expense.applicant?.name || expense.payeeName || "";
    const applicantDesig = expense.applicant?.designation || "";
    content = content.replace(/{{APPLICANT_NAME}}/g, applicantName);
    content = content.replace(/{{PAYEE_NAME}}/g, applicantName);
    content = content.replace(/{{EMPLOYEE_NAME}}/g, applicantName);
    content = content.replace(
      /{{APPLICANT_DESIGNATION_WITH_COMMA}}/g,
      applicantDesig ? `${applicantDesig},` : "",
    );
    content = content.replace(/{{APPLICANT_DESIGNATION}}/g, applicantDesig);
    content = content.replace(/{{DESIGNATION}}/g, applicantDesig);
    content = content.replace(/{{EMPLOYEE_DESIGNATION}}/g, applicantDesig);
    content = content.replace(
      /{{APPLICANT_INSTITUTION}}/g,
      expense.applicant?.institutionName || "",
    );
    content = content.replace(
      /{{APPLICANT_OFFICE_ID}}/g,
      expense.applicant?.officeId || "",
    );
    content = content.replace(
      /{{VOUCHER_NO}}/g,
      expense.voucherNo ? convertToBengaliNumber(expense.voucherNo) : "",
    );

    const entryOfficerDisplay = expense.entryOfficer?.name
      ? `${expense.entryOfficer.name} (${expense.entryOfficer.designation || "কর্মকর্তা"})`
      : expense.applicant?.name
        ? `${expense.applicant.name} (${expense.applicant?.designation || "কর্মকর্তা"})`
        : "মো: স্বপ্নীল দেওয়ান (কর্মকর্তা)";
    content = content.replace(/{{ENTRY_OFFICER}}/g, entryOfficerDisplay);
    content = content.replace(/{{DEBIT_ACCOUNT}}/g, expense.debitAccount || "");
    content = content.replace(
      /{{PAYMENT_TYPE}}/g,
      expense.paymentType || "নগদে",
    );
    content = content.replace(
      /{{MEMO_SUPPLY_ORDER_NO}}/g,
      expense.memoSupplyOrderNo || "",
    );
    content = content.replace(
      /{{MEMO_FORWARDING_NO}}/g,
      expense.memoForwardingNo || "",
    );
    content = content.replace(
      /{{QUOTATION_DATE}}/g,
      expense.quotationDate
        ? convertToBengaliNumber(formatDateToDDMMYYYY(expense.quotationDate))
        : "",
    );
    content = content.replace(
      /{{SUPPLY_RECIPIENT_NAME}}/g,
      expense.supplyRecipientName || "",
    );
    content = content.replace(
      /{{SUPPLY_RECIPIENT_DESIGNATION}}/g,
      expense.supplyRecipientDesignation || "",
    );
    content = content.replace(
      /{{SUPPLY_RECIPIENT_ORG_NAME}}/g,
      expense.supplyRecipientOrgName || "",
    );
    content = content.replace(
      /{{SUPPLY_RECIPIENT_ADDRESS_1}}/g,
      expense.supplyRecipientAddress1 || "",
    );
    content = content.replace(
      /{{SUPPLY_RECIPIENT_ADDRESS_2}}/g,
      expense.supplyRecipientAddress2 || "",
    );
    content = content.replace(
      /{{SUPPLIER_ORG_1}}/g,
      expense.supplierOrg1 || "",
    );
    content = content.replace(
      /{{SUPPLIER_ORG_2}}/g,
      expense.supplierOrg2 || "",
    );
    content = content.replace(
      /{{SUPPLIER_ORG_3}}/g,
      expense.supplierOrg3 || "",
    );

    let sup1UnitPrice = 0,
      sup1TotalPrice = 0;
    let sup2UnitPrice = 0,
      sup2TotalPrice = 0;
    let sup3UnitPrice = 0,
      sup3TotalPrice = 0;

    if (expense.quotationItems && expense.quotationItems.length > 0) {
      expense.quotationItems.forEach((item: any) => {
        sup1TotalPrice += Number(item.suppliers?.[0]?.totalPrice || 0);
        sup2TotalPrice += Number(item.suppliers?.[1]?.totalPrice || 0);
        sup3TotalPrice += Number(item.suppliers?.[2]?.totalPrice || 0);
      });
      sup1UnitPrice = Number(
        expense.quotationItems[0]?.suppliers?.[0]?.unitPrice || 0,
      );
      sup2UnitPrice = Number(
        expense.quotationItems[0]?.suppliers?.[1]?.unitPrice || 0,
      );
      sup3UnitPrice = Number(
        expense.quotationItems[0]?.suppliers?.[2]?.unitPrice || 0,
      );
    } else {
      sup1UnitPrice = currentBillAmount;
      sup1TotalPrice = currentBillAmount;
      sup2UnitPrice = Math.round(currentBillAmount * 1.048);
      sup2TotalPrice = sup2UnitPrice;
      sup3UnitPrice = Math.round(currentBillAmount * 1.115);
      sup3TotalPrice = sup3UnitPrice;
    }

    content = content.replace(
      /{{SUPPLIER_1_UNIT_PRICE}}/g,
      convertToBengaliNumber(sup1UnitPrice.toLocaleString("en-IN")),
    );
    content = content.replace(
      /{{SUPPLIER_1_TOTAL_PRICE}}/g,
      convertToBengaliNumber(sup1TotalPrice.toLocaleString("en-IN")),
    );
    content = content.replace(
      /{{SUPPLIER_2_UNIT_PRICE}}/g,
      convertToBengaliNumber(sup2UnitPrice.toLocaleString("en-IN")),
    );
    content = content.replace(
      /{{SUPPLIER_2_TOTAL_PRICE}}/g,
      convertToBengaliNumber(sup2TotalPrice.toLocaleString("en-IN")),
    );
    content = content.replace(
      /{{SUPPLIER_3_UNIT_PRICE}}/g,
      convertToBengaliNumber(sup3UnitPrice.toLocaleString("en-IN")),
    );
    content = content.replace(
      /{{SUPPLIER_3_TOTAL_PRICE}}/g,
      convertToBengaliNumber(sup3TotalPrice.toLocaleString("en-IN")),
    );

    if (balanceInfo.provisionAmount === 0) {
      content = content.replace(
        /<tr[^>]*>[\s\S]*?{{PROVISION_AMOUNT}}[\s\S]*?<\/tr>/gi,
        "",
      );
      content = content.replace(
        /<p[^>]*>[\s\S]*?{{PROVISION_AMOUNT}}[\s\S]*?<\/p>/gi,
        "",
      );
      content = content.replace(
        /<div[^>]*>[\s\S]*?{{PROVISION_AMOUNT}}[\s\S]*?<\/div>/gi,
        "",
      );
    }
    if (balanceInfo.additionalBudget === 0) {
      content = content.replace(
        /<tr[^>]*>[\s\S]*?{{ADDITIONAL_ALLOCATION}}[\s\S]*?<\/tr>/gi,
        "",
      );
      content = content.replace(
        /<p[^>]*>[\s\S]*?{{ADDITIONAL_ALLOCATION}}[\s\S]*?<\/p>/gi,
        "",
      );
      content = content.replace(
        /<div[^>]*>[\s\S]*?{{ADDITIONAL_ALLOCATION}}[\s\S]*?<\/div>/gi,
        "",
      );
    }

    content = content.replace(
      /{{PROVISION_AMOUNT}}/g,
      `${convertToBengaliNumber(Number(balanceInfo.provisionAmount || 0).toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(
      /{{BUDGET_ALLOCATION}}/g,
      `${convertToBengaliNumber(Number(balanceInfo.initialBudget || 0).toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(
      /{{ADDITIONAL_ALLOCATION}}/g,
      `${convertToBengaliNumber(Number(balanceInfo.additionalBudget || 0).toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(
      /{{TOTAL_ALLOCATION}}/g,
      `${convertToBengaliNumber(Number(balanceInfo.totalAllocated || 0).toLocaleString("en-IN"))}/-`,
    );

    content = content.replace(
      /{{TOTAL_SPENT_SO_FAR}}/g,
      `${convertToBengaliNumber(Number(safeSpentSoFar).toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(
      /{{TOTAL_SPENT_INCLUDING_CURRENT}}/g,
      `${convertToBengaliNumber(Number(spentIncludingCurrent).toLocaleString("en-IN"))}/-`,
    );
    content = content.replace(
      /{{REMAINING_BALANCE}}/g,
      `${convertToBengaliNumber(Number(remainingBalance).toLocaleString("en-IN"))}/-`,
    );

    content = content.replace(/,\s*,/g, ",");

    return sanitizeHtmlServer(content);
  }

  return "";
}


export function generatePostFactoNoteSheetHtml(
  proposal: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
): string {
  const bidders = proposal.bidders || [];
  const validBidders = bidders.filter(
    (b: any) => b.name && Number(b.price || 0) > 0,
  );
  const sortedBidders = [...validBidders].sort(
    (a: any, b: any) => Number(a.price || 0) - Number(b.price || 0),
  );
  const lowestBidder = sortedBidders[0] || {
    name: "সর্বনিম্ন দরদাতা",
    address: "",
    price: proposal.totalAmount,
  };

  const currentBill = Number(proposal.totalAmount || 0);
  const previousExpense = Math.max(
    0,
    balanceInfo.totalSpent + balanceInfo.totalPending - currentBill,
  );
  const remainingBalance =
    balanceInfo.totalAllocated - (previousExpense + currentBill);

  const amountWords = numberToBengaliWords(currentBill);
  const formattedAmount = convertToBengaliNumber(
    currentBill.toLocaleString("en-IN"),
  );

  let biddersHtml = "";
  bidders.forEach((b: any, idx: number) => {
    biddersHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${convertToBengaliNumber(idx + 1)}</td>
        <td style="border: 1px solid #000; padding: 6px;">${b.name || "-"}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx === 0 ? proposal.description || "-" : ""}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">${convertToBengaliNumber((b.price || 0).toLocaleString("en-IN"))}/-</td>
      </tr>
    `;
  });

  const budgetHtml = generateBudgetProvisionTableHtml(
    balanceInfo,
    category,
    financialYear,
    currentBill,
    previousExpense,
    remainingBalance,
  );

  const isRepair = isRepairWork(proposal.description);
  const isBranch = isBranchOffice(office);

  const officeOrgGen = isBranch ? "অত্র শাখার" : "অত্র কার্যালয়ের";
  const officeLoc = isBranch ? "অত্র শাখায়" : "অত্র কার্যালয়ে";

  const tenderDateBn = proposal.tenderDate
    ? convertToBengaliNumber(formatDateToDDMMYYYY(proposal.tenderDate))
    : ".../.../......";

  const subjectText = isRepair
    ? `<strong>বিষয়:</strong> ${proposal.description} বিলের বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন প্রদান প্রসঙ্গে।`
    : `<strong>বিষয়:</strong> ${proposal.description} ক্রয়ের বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন প্রদান প্রসঙ্গে।`;

  const instName = "বাংলাদেশ কৃষি ব্যাংক";

  const para1Text = isRepair
    ? `${instName}, ${office?.name || (isBranch ? "শাখা" : "শাখা কার্যালয়")} এর দৈনন্দিন দাপ্তরিক কার্যক্রম সুচারুরূপে সম্পাদনের নিমিত্তে অতীব জরুরি বিবেচনায় ${proposal.description} কাজ সম্পন্ন করা হয়েছে। উক্ত কাজের বিস্তারিত বিবরণ নিম্নে উপস্থাপন করা হলো:`
    : `${instName}, ${office?.name || (isBranch ? "শাখা" : "শাখা কার্যালয়")} এর দৈনন্দিন দাপ্তরিক কার্যক্রম সুচারুরূপে সম্পাদনের নিমিত্তে অতীব জরুরি বিবেচনায় স্থানীয় বাজার হতে ${proposal.description} ক্রয় করা হয়েছে। উক্ত কাজের বিস্তারিত বিবরণ নিম্নে উপস্থাপন করা হলো:`;

  const para2Text = isRepair
    ? `০২। তদালক্ষ্যে ${officeOrgGen} জন্য জরুরি ভিত্তিতে উক্ত মেরামত কার্য সম্পাদনের নিমিত্তে গত ${tenderDateBn} ইং তারিখে স্থানীয় দরপত্র আহ্বান করা হয়। উক্ত আহ্বানের প্রেক্ষিতে নিম্নলিখিত দরদাতা প্রতিষ্ঠানসমূহ তাদের সিলমোহরকৃত দরপত্র দাখিল করেন:`
    : `০২। তদালক্ষ্যে ${officeOrgGen} জন্য জরুরি ভিত্তিতে উক্ত মালামাল সরবরাহ করার নিমিত্তে গত ${tenderDateBn} ইং তারিখে স্থানীয় দরপত্র আহ্বান করা হয়। উক্ত আহ্বানের প্রেক্ষিতে নিম্নলিখিত দরদাতা প্রতিষ্ঠানসমূহ তাদের সিলমোহরকৃত দরপত্র দাখিল করেন:`;

  const tableHeaderItemDesc = isRepair ? "কাজের বিবরণ" : "মালামালের বিবরণ";

  const para5Text = isRepair
    ? `০৫। এমতাবস্থায়, ${officeOrgGen} কার্যক্রমের ধারাবাহিকতা রক্ষার্থে জরুরি ভিত্তিতে কৃত উক্ত মেরামতের বিপরীতে সর্বনিম্ন দরপত্র দাতা প্রতিষ্ঠান <strong>'${lowestBidder.name}'</strong>-কে সর্বমোট ৳=${formattedAmount}/- (ভ্যাটসহ) টাকা পরিশোধ করাসহ বাজেট বরাদ্দ প্রদানপূর্বক খরচোত্তর অনুমোদনের জন্য বিনীত অনুরোধ পেশ করা হলো।`
    : `০৫। এমতাবস্থায়, ${officeLoc} কার্যক্রমের ধারাবাহিকতা রক্ষার্থে জরুরি ভিত্তিতে কৃত উক্ত ক্রয়ের বিপরীতে সর্বনিম্ন দরপত্র দাতা প্রতিষ্ঠান <strong>'${lowestBidder.name}'</strong>-কে সর্বমোট ৳=${formattedAmount}/- (ভ্যাটসহ) টাকা পরিশোধ করাসহ বাজেট বরাদ্দ প্রদানপূর্বক খরচোত্তর অনুমোদনের জন্য বিনীত অনুরোধ পেশ করা হলো।`;

  return `
    <div style="font-family: 'SolaimanLipi', 'Nikosh', sans-serif; font-size: 15px; line-height: 1.6; color: #000; padding: 10px;">
      <h2 style="text-align: center; margin-bottom: 20px; font-size: 18px; font-weight: bold; text-decoration: underline;">খরচোত্তর অনুমোদন প্রস্তাব ও বরাদ্দ অনুরোধ</h2>
      
      <p style="margin-bottom: 12px; text-align: justify;">
        ${subjectText}
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        মহোদয়,<br>
        ${para1Text}
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        ${para2Text}
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1.5px solid #000; font-size: 14px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 8%;">ক্রমিক নং</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 45%;">প্রতিষ্ঠানের নাম</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 27%;">${tableHeaderItemDesc}</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 20%;">দর (ভ্যাটসহ)</th>
          </tr>
        </thead>
        <tbody>
          ${biddersHtml || '<tr><td colspan="4" style="text-align: center; padding: 8px;">কোনো দরপত্র পাওয়া যায়নি</td></tr>'}
        </tbody>
      </table>

      <p style="margin-bottom: 12px; text-align: justify;">
        ০৩। পর্যালোচনা করে দেখা যায় যে, দরদাতা প্রতিষ্ঠানসমূহ বা আবেদনকারীদের মধ্যে <strong>'${lowestBidder.name}'</strong> সর্বনিম্ন দরদাতা হিসেবে সর্বমোট ৳=${formattedAmount}/- (${amountWords} টাকা মাত্র) দর প্রস্তাব করেছে, যা বাজার দরের সাথে সামঞ্জস্যপূর্ণ ও গ্রহণযোগ্য বিবেচিত হয়।
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        ০৪। বর্ণিত কাজের বিপরীতে বাজেট বরাদ্দ ও আর্থিক সংস্থানের বিবরণ নিম্নরূপ:
      </p>

      <div style="margin: 15px 0;">
        ${budgetHtml}
      </div>

      <p style="margin-bottom: 12px; text-align: justify;">
        ${para5Text}
      </p>
    </div>
  `;
}

export function generatePostFactoForwardingHtml(
  proposal: any,
  office: any,
  category: any,
  financialYear: any,
): string {
  const bidders = proposal.bidders || [];
  const validBidders = bidders.filter(
    (b: any) => b.name && Number(b.price || 0) > 0,
  );
  const sortedBidders = [...validBidders].sort(
    (a: any, b: any) => Number(a.price || 0) - Number(b.price || 0),
  );
  const lowestBidder = sortedBidders[0] || {
    name: "সর্বনিম্ন দরদাতা",
    address: "",
    price: proposal.totalAmount,
  };

  const currentBill = Number(proposal.totalAmount || 0);
  const amountWords = numberToBengaliWords(currentBill);
  const formattedAmount = convertToBengaliNumber(
    currentBill.toLocaleString("en-IN"),
  );
  const isRepair = isRepairWork(proposal.description);
  const isBranch = isBranchOffice(office);

  const officeOrgGen = isBranch ? "অত্র শাখার" : "অত্র কার্যালয়ের";
  const officeLoc = isBranch ? "অত্র শাখায়" : "অত্র কার্যালয়ে";

  let biddersHtml = "";
  bidders.forEach((b: any, idx: number) => {
    biddersHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: inherit;">${convertToBengaliNumber(idx + 1)}</td>
        <td style="border: 1px solid #000; padding: 5px 6px; font-size: inherit;">${b.name || "-"}</td>
        <td style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: inherit;">${idx === 0 ? proposal.description || "-" : ""}</td>
        <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-size: inherit;">${convertToBengaliNumber((b.price || 0).toLocaleString("en-IN"))}/-</td>
      </tr>
    `;
  });

  const letterNo =
    proposal.letterNo ||
    `বকেবি/${office?.code || "শাখা"}/কম্পিউটার/${financialYear?.name || "২০২৫-২০২৬"}/...`;
  const letterDateBn = proposal.letterDate
    ? convertToBengaliNumber(formatDateToDDMMYYYY(proposal.letterDate))
    : ".../.../......";
  const tenderDateBn = proposal.tenderDate
    ? convertToBengaliNumber(formatDateToDDMMYYYY(proposal.tenderDate))
    : ".../.../......";

  const padHeader = getBankPadHeaderHtml(office?.name);
  const watermarkHtml = getBankWatermarkHtml();

  const subjectText = isRepair
    ? `বিষয়: ${proposal.description} বিলের বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন প্রদান প্রসঙ্গে।`
    : `বিষয়: ${proposal.description} ক্রয়ের বাজেট বরাদ্দসহ খরচোত্তর অনুমোদন প্রদান প্রসঙ্গে।`;

  const instName2 = "বাংলাদেশ কৃষি ব্যাংক";

  const para2Text = isRepair
    ? `০২। ${instName2}, ${office?.name || "শাখা কার্যালয়"} এর কার্যকারিতা সচল রাখার নিমিত্তে জরুরি ভিত্তিতে ${proposal.description} কাজ সম্পাদন করা হয়েছে।`
    : `০২। ${instName2}, ${office?.name || "শাখা কার্যালয়"} এর কার্যকারিতা সচল রাখার নিমিত্তে জরুরি ভিত্তিতে স্থানীয় বাজার হতে ${proposal.description} ক্রয় করা হয়েছে।`;

  const para3Text = isRepair
    ? `০৩। তদালক্ষ্যে উক্ত মেরামত কাজ সম্পাদনের জন্য গত ${tenderDateBn} ইং তারিখে দরপত্র আহ্বান করা হয় এবং নিম্নে উল্লেখিত প্রতিষ্ঠানের নিকট হতে সিলমোহরকৃত দরপত্র সংগ্রহপূর্বক উপস্থাপন করা হলো:`
    : `০৩। তদালক্ষ্যে স্থানীয় বাজার হতে উক্ত মালামাল ক্রয় করার জন্য গত ${tenderDateBn} ইং তারিখে দরপত্র আহ্বান করা হয় এবং নিম্নে উল্লেখিত প্রতিষ্ঠানের নিকট হতে সিলমোহরকৃত দরপত্র সংগ্রহপূর্বক উপস্থাপন করা হলো:`;

  const tableHeaderItemDesc = isRepair
    ? "চাহিতব্য কাজের বিবরণ"
    : "চাহিতব্য মালামালের বিবরণ";

  const para4Text = isRepair
    ? `০৪। উল্লেখিত দরপত্রসমূহ পর্যালোচনা করে সর্বনিম্ন দরপত্র দাতা প্রতিষ্ঠান হতে উক্ত মেরামত কার্য সম্পাদনের সিদ্ধান্ত গৃহীত হয়।`
    : `০৪। উল্লেখিত দরপত্রসমূহ পর্যালোচনা করে সর্বনিম্ন দরপত্র দাতা প্রতিষ্ঠান হতে উক্ত মালামাল ক্রয়ের সিদ্ধান্ত গৃহীত হয়।`;

  const para5Text = isRepair
    ? `০৫। এমতাবস্থায়, ${officeOrgGen} কার্যক্রমের ধারাবাহিকতা রক্ষার্থে কৃত উক্ত মেরামত বাবদ সর্বনিম্ন দরপত্রদাতা প্রতিষ্ঠান <strong>'${lowestBidder.name}'</strong>-এর অনুকূলে সর্বমোট ৳=${formattedAmount}/- (${amountWords} টাকা মাত্র) বাজেট বরাদ্দ প্রদানপূর্বক খরচোত্তর অনুমোদনের জন্য মহোদয়ের নিকট বিনীত অনুরোধ করা গেল।`
    : `০৫। এমতাবস্থায়, ${officeLoc} মালামাল-এর অপ্রতুলতার জন্য কৃত উক্ত ক্রয় বাবদ সর্বনিম্ন দরপত্রদাতা প্রতিষ্ঠান <strong>'${lowestBidder.name}'</strong>-এর অনুকূলে সর্বমোট ৳=${formattedAmount}/- (${amountWords} টাকা মাত্র) বাজেট বরাদ্দ প্রদানপূর্বক খরচোত্তর অনুমোদনের জন্য মহোদয়ের নিকট বিনীত অনুরোধ করা গেল।`;

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 11pt; line-height: 1.45; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      ${watermarkHtml}
      <div style="position: relative; z-index: 1;">
        ${padHeader}

        <!-- Letter Metadata Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 11pt;">
          <div><strong>পত্র নং:</strong> ${letterNo}</div>
          <div><strong>তারিখ:</strong> ${letterDateBn} খ্রিঃ</div>
        </div>

        <!-- To Recipient -->
        <div style="margin-bottom: 20px; line-height: 1.5; font-size: 11pt;">
          <p style="margin: 0;">বরাবর,</p>
          <p style="margin: 0; font-weight: bold;">আঞ্চলিক ব্যবস্থাপক</p>
          <p style="margin: 0;">বাংলাদেশ কৃষি ব্যাংক</p>
          <p style="margin: 0;">আঞ্চলিক কার্যালয়</p>
          <p style="margin: 0;">রাঙ্গামাটি।</p>
        </div>

        <!-- Subject -->
        <div style="margin-bottom: 20px; font-size: 11pt;">
          <p style="margin: 0; text-align: justify;"><strong>${subjectText}</strong></p>
        </div>

        <p style="margin-bottom: 15px; font-size: 11pt;">প্রিয় মহোদয়,</p>

        <p style="margin-bottom: 15px; text-align: justify; text-indent: 15mm; font-size: 11pt;">
          শিরোনামে বর্ণিত বিষয়ে মহোদয়ের সদয় দৃষ্টি আকর্ষণ করা হলো।
        </p>

        <p style="margin-bottom: 15px; text-align: justify; text-indent: 15mm; font-size: 11pt;">
          ${para2Text}
        </p>

        <p style="margin-bottom: 15px; text-align: justify; text-indent: 15mm; font-size: 11pt;">
          ${para3Text}
        </p>

        <!-- Bidders Table -->
        <table class="forwarding-table" style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1.5px solid #000; font-size: 11pt;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; width: 10%; font-size: inherit;">ক্রমিক নং</th>
              <th style="border: 1px solid #000; padding: 5px 6px; text-align: left; width: 45%; font-size: inherit;">প্রতিষ্ঠানের নাম</th>
              <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; width: 25%; font-size: inherit;">${tableHeaderItemDesc}</th>
              <th style="border: 1px solid #000; padding: 5px 6px; text-align: right; width: 20%; font-size: inherit;">দর (ভ্যাটসহ)</th>
            </tr>
          </thead>
          <tbody>
            ${biddersHtml || '<tr><td colspan="4" style="text-align: center; padding: 6px; font-size: inherit;">কোনো দরপত্র পাওয়া যায়নি</td></tr>'}
          </tbody>
        </table>

        <p style="margin-bottom: 15px; text-align: justify; text-indent: 15mm; font-size: 11pt;">
          ${para4Text}
        </p>

        <p style="margin-bottom: 30px; text-align: justify; text-indent: 15mm; font-size: 11pt;">
          ${para5Text}
        </p>

        <!-- Signature Section -->
        <div style="float: right; text-align: center; width: 200px; margin-top: 25px; font-size: 11pt;">
          <p style="margin-bottom: 50px;">আপনার বিশ্বস্ত,</p>
          <p style="margin: 0; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px;">${proposal.managerName || "ব্যবস্থাপক"}</p>
          <p style="margin: 0; font-size: 11pt;">ব্যবস্থাপক</p>
        </div>
        <div style="clear: both;"></div>
      </div>
    </div>
  `;
}

export function generatePostFactoSupplyOrderHtml(
  proposal: any,
  office: any,
  category: any,
  financialYear: any,
): string {
  const bidders = proposal.bidders || [];
  const validBidders = bidders.filter(
    (b: any) => b.name && Number(b.price || 0) > 0,
  );
  const sortedBidders = [...validBidders].sort(
    (a: any, b: any) => Number(a.price || 0) - Number(b.price || 0),
  );
  const lowestBidder = sortedBidders[0] || {
    name: "সর্বনিম্ন দরদাতা",
    address: "চন্দ্রঘোনা",
    price: proposal.totalAmount,
  };

  const currentBill = Number(proposal.totalAmount || 0);
  const _amountWords = numberToBengaliWords(currentBill);
  const formattedAmount = convertToBengaliNumber(
    currentBill.toLocaleString("en-IN"),
  );
  const isRepair = isRepairWork(proposal.description);
  const isBranch = isBranchOffice(office);

  const officeLoc = isBranch ? "অত্র শাখায়" : "আমাদের কার্যালয়ে";
  const officeOrg = isBranch ? "অত্র শাখা" : "অত্র কার্যালয়";
  const officeOrgGen = isBranch ? "অত্র শাখার" : "অত্র কার্যালয়ের";

  const vatRate = Number(proposal.vatRate ?? 10);
  const taxRate = Number(proposal.taxRate ?? 5);

  let taxVatStr = "১০% ভ্যাট ও ৫% ট্যাক্স";
  if (vatRate > 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাট ও ${toBnDigits(taxRate)}% ট্যাক্স`;
  } else if (vatRate > 0 && taxRate === 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাট`;
  } else if (vatRate === 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(taxRate)}% ট্যাক্স`;
  }

  const workOrderNo =
    proposal.workOrderNo ||
    `বকেবি/${office?.code || "শাখা"}/কম্পিউটার/কার্যাদেশ/${financialYear?.name || "২০২৫-২০২৬"}/...`;
  const workOrderDateBn = proposal.workOrderDate
    ? convertToBengaliNumber(formatDateToDDMMYYYY(proposal.workOrderDate))
    : ".../.../......";
  const tenderDateBn = proposal.tenderDate
    ? convertToBengaliNumber(formatDateToDDMMYYYY(proposal.tenderDate))
    : ".../.../......";

  const padHeader = getBankPadHeaderHtml(office?.name);
  const watermarkHtml = getBankWatermarkHtml();

  const subjectText = isRepair
    ? `বিষয়: ${proposal.description} কাজের কার্যাদেশ।`
    : `বিষয়: ${proposal.description} সরবরাহের কার্যাদেশ।`;

  const para1Text = isRepair
    ? `আপনার বিজ্ঞপ্তির প্রেক্ষিতে গত ${tenderDateBn} ইং তারিখে দাখিলকৃত দরপত্র সন্তোষজনক বিবেচিত হওয়ায় আপনাকে ${officeLoc} অনতিবিলম্বে নিচে বর্ণিত বিবরণ অনুযায়ী ${proposal.description} কার্য সম্পাদনের জন্য কার্যাদেশ প্রদান করা হলো।`
    : `আপনার বিজ্ঞপ্তির প্রেক্ষিতে গত ${tenderDateBn} ইং তারিখে দাখিলকৃত দরপত্র সন্তোষজনক বিবেচিত হওয়ায় আপনাকে ${officeLoc} ব্যবহারের নিমিত্তে অনতিবিলম্বে নিচে বর্ণিত বিবরণ অনুযায়ী ${proposal.description} সরবরাহের জন্য কার্যাদেশ প্রদান করা হলো।`;

  const tableHeaderCol2 = isRepair ? "কাজের বিবরণ" : "পণ্য ও বিবরণ";

  const term1Text = isRepair
    ? `${officeOrgGen} চাহিদা ও বিবরণ অনুযায়ী ${proposal.description || "মেরামত কাজ"} যথাযথভাবে সম্পন্ন করতে হবে।`
    : `${officeOrg} কর্তৃক সরবরাহকৃত নমুনা অনুযায়ী ${proposal.description || "মালামাল"} সরবরাহ করতে হবে।`;

  const term2Text = isRepair
    ? `কার্যাদেশ প্রদানের অনধিক ৫ (পাঁচ) কার্যদিবসের মধ্যে মেরামত কাজ সম্পন্ন করতে হবে।`
    : `কার্যাদেশ প্রদানের অনধিক ৫ (পাঁচ) কার্যদিবসের মধ্যে পণ্য সরবরাহ করতে হবে।`;

  const term3Text = isRepair
    ? `গুণগত মান ও যথাযথভাবে সম্পাদিত কাজ যাচাই করে বুঝে নেওয়ার পর বিল দাখিল সাপেক্ষে পেমেন্ট অর্ডার এর মাধ্যমে/নগদে বিল পরিশোধ করা হবে।`
    : `গুণগত মান ও যথাযথভাবে সরবরাহের পরিমাণ যাচাই করে বুঝে নেওয়ার পর বিল দাখিল সাপেক্ষে পেমেন্ট অর্ডার এর মাধ্যমে/নগদে বিল পরিশোধ করা হবে।`;

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      ${watermarkHtml}
      <div style="position: relative; z-index: 1;">
        ${padHeader}

        <!-- Letter Metadata Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14pt; font-size: 11pt;">
          <div><strong>সূত্র নং:</strong> ${workOrderNo}</div>
          <div><strong>তারিখ:</strong> ${workOrderDateBn} খ্রিঃ</div>
        </div>

        <!-- Supplier Address -->
        <div style="margin-bottom: 20px; line-height: 1.5; font-size: 11pt;">
          <p style="margin: 0;">প্রতি,</p>
          <p style="margin: 0; font-weight: bold;">${lowestBidder.name}</p>
          <p style="margin: 0;">${lowestBidder.address || "লিচুবাগান, চন্দ্রঘোনা।"}</p>
        </div>

        <!-- Subject -->
        <div style="margin-bottom: 20px; font-size: 11pt;">
          <p style="margin: 0; text-align: justify;"><strong>${subjectText}</strong></p>
        </div>

        <p style="margin-bottom: 15px; font-size: 11pt;">প্রিয় মহোদয়,</p>

        <p style="margin-bottom: 15px; text-align: justify; text-indent: 15mm; font-size: 11pt;">
          ${para1Text}
        </p>

        <!-- Work Order Items Table -->
        <table class="forwarding-table" style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1.5px solid #000; font-size: 11pt;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #000; padding: 5px 6px; text-align: center; width: 15%; font-size: inherit;">ক্রমিক নং</th>
              <th style="border: 1px solid #000; padding: 5px 6px; text-align: left; width: 55%; font-size: inherit;">${tableHeaderCol2}</th>
              <th style="border: 1px solid #000; padding: 5px 6px; text-align: right; width: 30%; font-size: inherit;">সর্বমোট মূল্য</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: inherit;">০১</td>
              <td style="border: 1px solid #000; padding: 5px 6px; font-size: inherit;">${proposal.description}</td>
              <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-weight: bold; font-size: inherit;">৳=${formattedAmount}/- (ভ্যাটসহ)</td>
            </tr>
            <tr>
              <td colspan="2" style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-weight: bold; font-size: inherit;">সর্বমোট মূল্য:</td>
              <td style="border: 1px solid #000; padding: 5px 6px; text-align: right; font-weight: bold; font-size: inherit;">৳=${formattedAmount}/-</td>
            </tr>
          </tbody>
        </table>

        <!-- Terms and Conditions -->
        <div style="margin-bottom: 8pt; font-weight: bold; font-size: 11pt;">শর্তাবলী :</div>
        <div style="margin-top: 0; line-height: 1.7; font-size: 11pt;">
          <div style="display: flex;"><span style="min-width: 25px;">১।</span><span>${term1Text}</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">২।</span><span>${term2Text}</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">৩।</span><span>${term3Text}</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">৪।</span><span>দাখিলকৃত মূল্য হতে ${taxVatStr} কর্তন করা হবে।</span></div>
        </div>

        <!-- Signature Section -->
        <div style="float: right; text-align: center; width: 200px; margin-top: 25px; font-size: 11pt;">
          <p style="margin-bottom: 50px;">আপনার বিশ্বস্ত,</p>
          <p style="margin: 0; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px;">${proposal.managerName || "ব্যবস্থাপক"}</p>
          <p style="margin: 0; font-size: 11pt;">ব্যবস্থাপক</p>
        </div>
        <div style="clear: both;"></div>
      </div>
    </div>
  `;
}

export function generatePostFactoSanctionNoteSheetHtml(
  proposal: any,
  office: any,
  regionalOffice: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
  is134: boolean,
): string {
  const vatRate = Number(proposal.vatRate ?? 10);
  const taxRate = Number(proposal.taxRate ?? 5);

  let taxVatStr = "ভ্যাট ও ট্যাক্স ব্যতীত";
  if (vatRate > 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাট ও ${toBnDigits(taxRate)}% ট্যাক্সসহ`;
  } else if (vatRate > 0 && taxRate === 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাটসহ`;
  } else if (vatRate === 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(taxRate)}% ট্যাক্সসহ`;
  }

  const bidders = proposal.bidders || [];
  const validBidders = bidders.filter(
    (b: any) => b.name && Number(b.price || 0) > 0,
  );
  const sortedBidders = [...validBidders].sort(
    (a: any, b: any) => Number(a.price || 0) - Number(b.price || 0),
  );
  const lowestBidder = sortedBidders[0] || {
    name: "সর্বনিম্ন দরদাতা",
    address: "",
    price: proposal.totalAmount,
  };

  const currentBill = Number(proposal.totalAmount || 0);
  const previousExpense = Math.max(
    0,
    balanceInfo.totalSpent + balanceInfo.totalPending - currentBill,
  );
  const remainingBalance =
    balanceInfo.totalAllocated - (previousExpense + currentBill);

  const amountWords = numberToBengaliWords(currentBill);
  const formattedAmount = convertToBengaliNumber(
    currentBill.toLocaleString("en-IN"),
  );
  const isRepair = isRepairWork(proposal.description);
  const isBranch = isBranchOffice(office);

  const branchOfficeName =
    office?.name || (isBranch ? "শাখা" : "শাখা কার্যালয়");
  const regOfficeName = regionalOffice?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি";

  const totalBiddersCount =
    validBidders.length > 0 ? validBidders.length : bidders.length || 3;
  const lowestBidderName = lowestBidder.name || "সর্বনিম্ন দরদাতা";

  let biddersHtml = "";
  if (sortedBidders.length > 0) {
    biddersHtml = `
      <table class="quotation-bidders-table" style="width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 8pt; font-size: inherit; border: 1.5px solid #000;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 8%;">ক্রমিক</th>
            <th style="border: 1px solid #000; padding: 6px 8px; text-align: left; width: 42%;">দরদাতার নাম ও ঠিকানা</th>
            <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 25%;">কাজের/মালামালের বিবরণ</th>
            <th style="border: 1px solid #000; padding: 6px 8px; text-align: right; width: 25%;">মোট দর (${taxVatStr})</th>
          </tr>
        </thead>
        <tbody>
    `;
    sortedBidders.forEach((b: any, idx: number) => {
      const sl = convertToBengaliNumber(idx + 1);
      const isLowest = idx === 0;
      biddersHtml += `
        <tr>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">${sl}</td>
          <td style="border: 1px solid #000; padding: 6px 8px; vertical-align: middle;">
            ${b.name || "-"}${b.address ? `<br><span style="font-size: 0.85em; color: #555;">${b.address}</span>` : ""}
          </td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle;">
            ${proposal.description || "-"}
          </td>
          <td style="border: 1px solid #000; padding: 6px 8px; text-align: right; vertical-align: middle; ${isLowest ? "font-weight: bold;" : ""}">
            = ${convertToBengaliNumber(Number(b.price || 0).toLocaleString("en-IN"))}/-
            ${isLowest ? `<br><span style="font-size: 0.8em; color: #047857; font-weight: bold;">(সর্বনিম্ন দরদাতা)</span>` : ""}
          </td>
        </tr>
      `;
    });
    biddersHtml += `</tbody></table>`;
  }

  const budgetHtml = generateBudgetProvisionTableHtml(
    balanceInfo,
    category,
    financialYear,
    currentBill,
    previousExpense,
    remainingBalance,
  );

  const subjectText = isRepair
    ? `বিষয়ঃ- বিকেবি, ${branchOfficeName} এর জন্য ${proposal.description} বিল খরচোত্তর অনুমোদন ও প্রদান প্রসঙ্গে।`
    : `বিষয়ঃ- বিকেবি, ${branchOfficeName} এর জন্য ${proposal.description} ক্রয়ের বিল খরচোত্তর অনুমোদন ও প্রদান প্রসঙ্গে।`;

  const para1Text = isRepair
    ? `বিকেবি, ${branchOfficeName} এর দৈনন্দিন দাপ্তরিক কার্যক্রম সচল রাখার নিমিত্তে জরুরি বিবেচনায় ${proposal.description} কাজ সম্পাদনের লক্ষ্যে স্থানীয়ভাবে ${convertToBengaliNumber(totalBiddersCount)} টি প্রতিষ্ঠানের দরপত্র সংগ্রহ করতঃ সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র মূল্যে উক্ত কাজ সম্পন্ন করা হয় এবং বিল খরচোত্তর অনুমোদনের নিমিত্তে অত্র কার্যালয়ে প্রস্তাব পেশ করা হয়।`
    : `বিকেবি, ${branchOfficeName} এর দৈনন্দিন দাপ্তরিক কার্যক্রম সচল রাখার নিমিত্তে জরুরি বিবেচনায় স্থানীয় বাজার হতে ${proposal.description} ক্রয়ের নিমিত্তে স্থানীয়ভাবে ${convertToBengaliNumber(totalBiddersCount)} টি প্রতিষ্ঠানের দরপত্র সংগ্রহ করতঃ সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র মূল্যে উক্ত মালামাল ক্রয়/সরবরাহ করা হয় এবং বিল খরচোত্তর অনুমোদনের নিমিত্তে অত্র কার্যালয়ে প্রস্তাব পেশ করা হয়।`;

  const para2Text = isRepair
    ? `উক্ত ${convertToBengaliNumber(totalBiddersCount)} টি দরপত্র এর মধ্যে '${lowestBidderName}' কর্তৃক ${proposal.description} বাবদ ${taxVatStr} সর্বনিম্ন দর ৮= ${formattedAmount}/- (${amountWords}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে উক্ত কাজ সম্পন্ন করা হয়।`
    : `উক্ত ${convertToBengaliNumber(totalBiddersCount)} টি দরপত্র এর মধ্যে '${lowestBidderName}' কর্তৃক ${proposal.description} ক্রয় বাবদ ${taxVatStr} সর্বনিম্ন দর ৮= ${formattedAmount}/- (${amountWords}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে বর্ণিত মালামাল ক্রয়/সরবরাহ করা হয়।`;

  const para3Text = isRepair
    ? `এমতাবস্থায়, বিকেবি, ${branchOfficeName} এর জন্য ${proposal.description} বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র খরচের বিষয়টি শাখা প্রধান, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${regOfficeName} এর আর্থিক সম্মতি গ্রহণপূর্বক ${taxVatStr} সর্বমোট ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিলের অর্থ প্রদানের খরচোত্তর অনুমোদন দেয়া যেতে পারে।`
    : `এমতাবস্থায়, বিকেবি, ${branchOfficeName} এর জন্য ${proposal.description} ক্রয় বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র খরচের বিষয়টি শাখা প্রধান, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${regOfficeName} এর আর্থিক সম্মতি গ্রহণপূর্বক ${taxVatStr} সর্বমোট ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিলের অর্থ প্রদানের খরচোত্তর অনুমোদন দেয়া যেতে পারে।`;

  const auditNoteText = isRepair
    ? `<strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> বিকেবি, ${branchOfficeName} এর জন্য ${proposal.description} বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।`
    : `<strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> বিকেবি, ${branchOfficeName} এর জন্য ${proposal.description} ক্রয় বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।`;

  const budgetScopeNote = is134
    ? `<div style="margin-top: 4pt; margin-bottom: 8pt; font-size: 0.9em; color: #1e293b; font-style: italic; text-align: right;">(নোট: ১৩৪/০১ হতে ১৩৪/০৫ খাতের ব্যয় বিধায় আঞ্চলিক কার্যালয়ের মূল বাজেট হতে সংস্থান করা হয়েছে)</div>`
    : `<div style="margin-top: 4pt; margin-bottom: 8pt; font-size: 0.9em; color: #1e293b; font-style: italic; text-align: right;">(নোট: সংশ্লিষ্ট শাখার নিজস্ব বাজেট হতে সংস্থান করা হয়েছে)</div>`;

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify; color: #000;">
      <div style="font-weight: bold; margin-bottom: 18pt; text-align: center; font-size: 16px;">
        ${subjectText}
      </div>
      
      <p style="text-indent: 40px; margin-bottom: 10pt;">
        ${para1Text}
      </p>
      
      <p style="margin-bottom: 5pt; font-weight: bold; text-decoration: underline;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>
      
      ${biddersHtml}
      
      <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 15pt;">
        ${para2Text}
      </p>
      
      <p style="text-indent: 40px; margin-bottom: 20pt;">
        ${para3Text}
      </p>
      
      ${budgetHtml}
      ${budgetScopeNote}
      
      <div style="margin-top: 15pt; margin-bottom: 0pt; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 170pt; display: inline-block;">
          <div style="height: 35pt;"></div>
          <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
            প্রস্তুতকারী কর্মকর্তা
          </div>
          <div style="font-size: 0.85em; color: #444; font-family: monospace;">
            প্রশাসনিক বিভাগ, ${regOfficeName}
          </div>
        </div>
      </div>
      
      <div class="form1-approval-chain" style="margin-top: 25pt; line-height: 1.6;">
        <div style="margin-bottom: 56pt;">
          <strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহনের নিমিত্তে নথি আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${regOfficeName} বরাবরে প্রেরণ করুন।
        </div>
        <div style="margin-bottom: 56pt;">
          ${auditNoteText}
        </div>
        <div style="margin-bottom: 45pt;">
          <strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।
        </div>
      </div>
    </div>
  `;
}


export function generatePostFactoSanctionLetterHtml(
  proposal: any,
  office: any,
  category: any,
  _financialYear: any,
): string {
  const isBudget =
    proposal.sanctionType === "budget_allocation" || !proposal.sanctionType;
  const currentBill = Number(proposal.totalAmount || 0);
  const amountWords = numberToBengaliWords(currentBill);
  const formattedAmount = convertToBengaliNumber(
    currentBill.toLocaleString("en-IN"),
  );
  const letterNo = proposal.letterNo || "...";
  const letterDateBn = proposal.letterDate
    ? convertToBengaliNumber(formatDateToDDMMYYYY(proposal.letterDate))
    : ".../.../......";

  const sanctionMemoNo = proposal.sanctionMemoNo || "প্রশা-১(১৪)/২০২৫-২০২৬/";
  const sanctionDate = proposal.sanctionDate
    ? convertToBengaliNumber(formatDateToDDMMYYYY(proposal.sanctionDate))
    : convertToBengaliNumber(
        formatDateToDDMMYYYY(new Date().toISOString().split("T")[0]),
      );

  const bidders = proposal.bidders || [];
  const validBidders = bidders.filter(
    (b: any) => b.name && Number(b.price || 0) > 0,
  );
  const sortedBidders = [...validBidders].sort(
    (a: any, b: any) => Number(a.price || 0) - Number(b.price || 0),
  );
  const lowestBidder = sortedBidders[0] || {
    name: "সর্বনিম্ন দরদাতা",
    address: "",
    price: proposal.totalAmount,
  };

  const isRepair = isRepairWork(proposal.description);
  const vendorType = isRepair ? "মেরামতকারী" : "সরবরাহকারী";

  const subjectText = isBudget
    ? `বিষয়: বিকেবি, ${office?.name || "শাখা"} শাখায় ব্যবহৃত ${proposal.description || "-"} বিল খরচোত্তর বাজেট বরাদ্দসহ অনুমোদন প্রসংগে।`
    : `বিষয়: বিকেবি, ${office?.name || "শাখা"} শাখায় ব্যবহৃত ${proposal.description || "-"} বিল খরচোত্তর অনুমোদন প্রসংগে।`;

  const sanctionText = isBudget
    ? `বাজেট বরাদ্দসহ বিলের খরচোত্তর অনুমোদন দেয়া হলো।`
    : `বিলের খরচোত্তর অনুমোদন দেয়া হলো।`;

  const padHeader = getBankPadHeaderHtml("আঞ্চলিক কার্যালয়, রাঙ্গামাটি"); // Always from RM
  const watermarkHtml = getBankWatermarkHtml();

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; background: #fff; width: 100%; box-sizing: border-box; position: relative; min-height: 100%;">
      ${watermarkHtml}
      <div style="position: relative; z-index: 1;">
        ${padHeader}

        <!-- Letter Metadata Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 11pt;">
          <div><strong>সূত্র নং:</strong> ${sanctionMemoNo}</div>
          <div><strong>তারিখ:</strong> ${sanctionDate} খ্রিঃ</div>
        </div>

        <!-- To Recipient -->
        <div style="margin-bottom: 20px; line-height: 1.5; font-size: 11pt;">
          <p style="margin: 0;">ব্যবস্থাপক</p>
          <p style="margin: 0;">বাংলাদেশ কৃষি ব্যাংক</p>
          <p style="margin: 0;">${office?.name || "শাখা"}</p>
          <p style="margin: 0;">রাঙ্গামাটি।</p>
        </div>

        <!-- Subject -->
        <div style="margin-bottom: 20px; font-weight: bold; font-size: 11pt;">
          ${subjectText}
        </div>

        <p>প্রিয় মহোদয়,</p>
        <p style="text-align: justify;">
          শিরোনামে বর্ণিত বিষয়ে আপনার শাখার ${letterDateBn} ইং তারিখের পত্র নং- ${letterNo} এর প্রতি দৃষ্টি আকর্ষণ করা যাচ্ছে।
        </p>
        
        <p style="text-align: justify;">
          ০২। উক্ত পত্রের মাধ্যমে বিকেবি, ${office?.name || "শাখা"} শাখা এর জন্য ${proposal.description || "-"} করতে: ${vendorType} প্রতিষ্ঠান ${lowestBidder.name}, ${lowestBidder.address} হতে ${proposal.vatRate || 10}% ভ্যাটসহ ৳=${formattedAmount}/- (${amountWords}) টাকা মূল্যের একখানা বিল খরচোত্তর অনুমোদনের জন্যে সংযুক্তি সহকারে অত্র কার্যালয়ে প্রেরণ করা হয়।
        </p>

        <p style="text-align: justify;">
          ০৩। উক্ত পত্রের প্রেক্ষিতে বিকেবি, ${office?.name || "শাখা"} শাখা এর জন্য ${proposal.description || "-"} বাবদ ${proposal.vatRate || 10}% ভ্যাটসহ মোট ৳=${formattedAmount}/- (${amountWords}) টাকা শাখার ${category?.name || "-"} খাতে ${sanctionText}
        </p>

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div>
            <p>সংযুক্তি: বর্ণনামতে।</p>
          </div>
          <div style="text-align: center;">
            <p style="margin: 0;">আপনার বিশ্বস্ত,</p>
            <br /><br />
            <p style="margin: 0;">(মোহাম্মদ কামরুল হাসান)</p>
            <p style="margin: 0;">আঞ্চলিক ব্যবস্থাপক</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
