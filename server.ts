import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import {
  initSqlite,
  getDbSheetData,
  saveDbSheetData,
  getSqliteStats,
  querySql,
  checkpointWal,
  restoreSqliteFromFile,
  restoreFromDataMap,
  getAllDataMap,
} from "./sqlite.js";
import {
  sanitizeHtmlServer,
  withSheetLock,
  convertToBengaliNumber,
  numberToBengaliWords,
  formatQtyWithBengaliWord,
  formatItemsListText,
  formatDateToDDMMYYYY,
  isRepairWork,
  isBranchOffice,
  isCategory134,
  toBnDigits,
  computeExpenseAmounts,
  detectFileTypeFromMagicBytes,
} from "./server/utils.js";
import {
  SheetSchemas,
  SheetUpdateSchemas,
  validateReferentialIntegrity as validateReferentialIntegritySchema,
  checkReferentialIntegrityOnDelete as checkReferentialIntegrityOnDeleteSchema,
} from "./server/schemas.js";
import {
  hashPassword,
  createToken,
  verifyToken,
  requireRole,
  requireAuth,
} from "./server/auth.js";
import {
  initialData,
  officialOffices,
  officialCategories,
} from "./server/default-data.js";

function generateQuotationBiddersTableHtml(
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

function generateBudgetProvisionTableHtml(
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

function getBankPadHeaderHtml(officeName?: string): string {
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

  const displayOffice = officeName || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি।";

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 12px; width: 100%;">
      <div style="width: 70px; display: flex; align-items: center; justify-content: flex-start;">
        ${logoElement}
      </div>
      <div style="flex: 1; text-align: center; padding: 0 10px;">
        <div style="font-size: 20pt; font-weight: bold; color: #000; line-height: 1.1;">${appSettings?.institutionName || "বাংলাদেশ কৃষি ব্যাংক"}</div>
        <div style="font-size: 12.5pt; font-weight: bold; color: #000; margin-top: 2px;">${displayOffice}</div>
      </div>
      <div style="width: 125px; text-align: right; line-height: 1.2;">
        <div style="font-size: 10.5pt; font-weight: bold; color: #000;">গণমানুষের ব্যাংক</div>
        <div style="font-size: 8.5pt; color: #222; margin-top: 2px;">www.krishibank.gov.bd</div>
      </div>
    </div>
  `;
}

function getBankWatermarkHtml(): string {
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

function getBudgetHeadForExpense(expense: any, category: any): string {
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

function generateForm1ForwardingHtml(
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
          <div><strong>তারিখ : </strong>${voucherDate} খ্রিঃ</div>
        </div>

        <div style="margin-bottom: 12px; line-height: 1.4; font-size: 11pt;">
          ব্যবস্থাপক<br/>
          বাংলাদেশ কৃষি ব্যাংক<br/>
          ${expense.branchName || "প্রধান শাখা"}<br/>
          ${expense.branchAddress || "প্রধান কার্যালয়।"}
        </div>

        <div style="font-weight: bold; margin-bottom: 12px; font-size: 11pt;">
          বিষয় :- ${formattedItems} ${isRepair ? "বিল" : "ক্রয়ের বিল"} সমন্বয়/পরিশোধ প্রসঙ্গে।
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

        <p style="margin-bottom: 6px; font-weight: bold; font-size: 10.5pt;">খরচের বিলটি নিম্নভাবে সমন্বয় করতে হবে :</p>

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

function generateForm1SupplyOrderHtml(
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
          <div><strong>সূত্র নং:</strong> ${supplyOrderNo}</div>
          <div><strong>তারিখ:</strong> ${quotationDate} খ্রিঃ</div>
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

        <div style="margin-bottom: 10pt; font-weight: bold; font-size: 11pt;">শর্তাবলী :</div>
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

function generateForm2NoteSheetHtml(
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

function generateForm1NoteSheetHtml(
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

export const app = express();
const PORT = 3000;

export { createToken, verifyToken, requireRole, requireAuth, hashPassword };
export { computeExpenseAmounts, convertToBengaliNumber, numberToBengaliWords };

function validateReferentialIntegrity(sheet: string, payload: any) {
  return validateReferentialIntegritySchema(sheet, payload, getSheetData);
}

export function isFYClosed(financialYearId: string): boolean {
  if (!financialYearId) return false;
  const fys = getSheetData("FinancialYears");
  const fy = fys.find((f: any) => f.id === financialYearId);
  return !!(fy && fy.isClosed);
}

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function addAuditLog(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  details: string,
): Promise<void> {
  const auditLogs = getSheetData("AuditLogs");
  const prevLog = auditLogs.length > 0 ? auditLogs[0] : null;
  const prevHash = prevLog
    ? crypto.createHash("sha256").update(JSON.stringify(prevLog)).digest("hex")
    : "0".repeat(64);

  const newLog = {
    id: `al-${Date.now()}`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    userId,
    action,
    tableName,
    recordId,
    details,
    prevHash,
  };
  auditLogs.unshift(newLog);
  await saveSheetData("AuditLogs", auditLogs);
}

export function getAvailableBalance(
  financialYearId: string,
  officeId: string,
  categoryId: string,
) {
  const allocations = getSheetData("Allocations");
  const expenses = getSheetData("Expenses");

  const categoryAllocations = allocations.filter(
    (a: any) =>
      a.financialYearId === financialYearId &&
      a.officeId === officeId &&
      a.categoryId === categoryId,
  );

  const initialBudget = categoryAllocations
    .filter((a: any) => a.type === "Initial" || !a.type)
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const provisionAmount = categoryAllocations
    .filter((a: any) => a.type === "Adjustment")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const additionalBudget = categoryAllocations
    .filter((a: any) => a.type === "Additional")
    .reduce((sum: number, a: any) => sum + Number(a.allocatedAmount || 0), 0);

  const totalAllocated = initialBudget + provisionAmount + additionalBudget;

  const categoryExpenses = expenses.filter(
    (e: any) =>
      e.financialYearId === financialYearId &&
      e.officeId === officeId &&
      e.categoryId === categoryId,
  );

  let totalSpent = 0;
  let totalPending = 0;

  categoryExpenses.forEach((e: any) => {
    const computed = computeExpenseAmounts(e.amount, e.vatRate, e.taxRate);
    const gross = Number(computed.grossAmount || 0);
    if (e.status === "Pending") {
      totalPending += gross;
    } else if (e.status === "Rejected") {

    } else {

      totalSpent += gross;
    }
  });

  const available = totalAllocated - totalSpent - totalPending;

  return {
    initialBudget,
    provisionAmount,
    additionalBudget,
    allocated: totalAllocated,
    totalAllocated,
    spent: totalSpent,
    totalSpent,
    pending: totalPending,
    totalPending,
    available,
    availableBalance: available,
  };
}

function getSheetData(sheetName: string): any[] {
  return getDbSheetData(sheetName, initialData);
}

const BACKUP_DIR = path.join(DATA_DIR, "backups");
let lastBackupDate = "";

function ensureDailyBackup() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  if (lastBackupDate === today) return;

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const todayBackupDir = path.join(BACKUP_DIR, today);
    if (!fs.existsSync(todayBackupDir)) {
      fs.mkdirSync(todayBackupDir, { recursive: true });
      if (fs.existsSync(DATA_DIR)) {

        const sqliteFile = path.join(DATA_DIR, "database.sqlite");
        if (fs.existsSync(sqliteFile)) {
          try {
            fs.copyFileSync(
              sqliteFile,
              path.join(todayBackupDir, "database.sqlite"),
            );
          } catch (_e) {
            console.error(`Backup copy error for database.sqlite:`, _e);
          }
        }

        const files = fs
          .readdirSync(DATA_DIR)
          .filter((f) => f.endsWith(".json"));
        for (const f of files) {
          const src = path.join(DATA_DIR, f);
          const dest = path.join(todayBackupDir, f);
          try {
            fs.copyFileSync(src, dest);
          } catch (_e) {
            console.error(`Backup copy error for ${f}:`, _e);
          }
        }
      }
    }

    lastBackupDate = today;

    const retentionDays =
      parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const backupFolders = fs.readdirSync(BACKUP_DIR);
    for (const folder of backupFolders) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(folder)) {
        if (folder < cutoffStr) {
          const folderPath = path.join(BACKUP_DIR, folder);
          try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(
              `[Backup Clean] Removed backup folder older than ${retentionDays} days: ${folder}`,
            );
          } catch (cleanErr) {
            console.error(
              `Failed to delete old backup folder ${folder}:`,
              cleanErr,
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("Backup routine error:", err);
  }
}

async function saveSheetData(sheetName: string, data: any[]): Promise<void> {
  ensureDailyBackup();

  await saveDbSheetData(sheetName, data);

  try {
    const filePath = path.join(DATA_DIR, `${sheetName}.json`);
    const tmpPath = path.join(
      DATA_DIR,
      `${sheetName}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`,
    );
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (_e) {
    console.warn(`[JSON Mirror warning on ${sheetName}]:`, _e);
  }
}

function renderExpenseNoteSheetContent(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
  template?: any,
): string {
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

async function syncNoteSheetForExpense(
  expense: any,
  userId: string,
  force: boolean = false,
): Promise<any | null> {
  const offices = getSheetData("Offices");
  const categories = getSheetData("Categories");
  const templates = getSheetData("NoteTemplates");
  const financialYears = getSheetData("FinancialYears");
  const noteSheets = getSheetData("NoteSheets");

  const office = offices.find((o: any) => o.id === expense.officeId);
  const category = categories.find((c: any) => c.id === expense.categoryId);
  const fy = financialYears.find((f: any) => f.id === expense.financialYearId);

  let template = null;
  if (expense.noteTemplateId) {
    template = templates.find((t: any) => t.id === expense.noteTemplateId);
  }

  if (
    !template &&
    expense.expenseType === "Quotation" &&
    expense.quotationFormType === "Form1"
  ) {
    template = templates.find((t: any) => t.id === "tpl-form1-quotation");
  }
  if (
    !template &&
    expense.expenseType === "Quotation" &&
    expense.quotationFormType === "Form2"
  ) {
    template = { id: "tpl-form2-quotation" }; // Dummy template to bypass category fallback and use generateForm2NoteSheetHtml directly inside renderExpenseNoteSheetContent
  }

  if (!template) {
    template = templates.find((t: any) => t.categoryId === expense.categoryId);
  }

  if (!template) {
    template =
      templates.find((t: any) => t.id === "tpl-regular-expense") ||
      templates.find(
        (t: any) =>
          (t.categoryId === "all" || !t.categoryId) &&
          t.id !== "tpl-form1-quotation",
      ) ||
      templates.find((t: any) => t.categoryId === "all");
  }
  const balanceInfo = getAvailableBalance(
    expense.financialYearId,
    expense.officeId,
    expense.categoryId,
  );

  const content = renderExpenseNoteSheetContent(
    expense,
    office,
    category,
    fy,
    balanceInfo,
    template,
  );
  if (!content) {
    return null;
  }

  let forwardingContent = undefined;
  let supplyOrderContent = undefined;
  if (
    expense.expenseType === "Quotation" &&
    (expense.quotationFormType === "Form1" ||
      expense.quotationFormType === "Form2")
  ) {
    forwardingContent = generateForm1ForwardingHtml(
      expense,
      office,
      category,
      fy,
      balanceInfo,
    );
    supplyOrderContent = generateForm1SupplyOrderHtml(
      expense,
      office,
      category,
      fy,
      balanceInfo,
    );
  }

  const nsIndex = noteSheets.findIndex(
    (ns: any) =>
      (expense.noteSheetId && ns.id === expense.noteSheetId) ||
      (expense.id && ns.expenseId === expense.id),
  );

  if (nsIndex !== -1) {
    if (noteSheets[nsIndex].isCustomEdited && !force) {
      expense.noteSheetId = noteSheets[nsIndex].id;
      return noteSheets[nsIndex];
    }
    noteSheets[nsIndex] = {
      ...noteSheets[nsIndex],
      financialYearId: expense.financialYearId,
      officeId: expense.officeId,
      expenseId: expense.id,
      title: `${category ? category.name : "Expense"} - ${expense.voucherNo || ""}`,
      content: content,
      forwardingContent:
        forwardingContent !== undefined
          ? forwardingContent
          : noteSheets[nsIndex].forwardingContent,
      supplyOrderContent:
        supplyOrderContent !== undefined
          ? supplyOrderContent
          : noteSheets[nsIndex].supplyOrderContent,
      expenseType: expense.expenseType || "General",
      expenseGrossAmount: expense.grossAmount || expense.amount || 0,
      isUnder1500:
        (expense.grossAmount || expense.amount || 0) <= 1500 &&
        expense.expenseType !== "Quotation",
      isCustomEdited: false,
      updatedAt: new Date().toISOString(),
    };
    await saveSheetData("NoteSheets", noteSheets);
    expense.noteSheetId = noteSheets[nsIndex].id;
    return noteSheets[nsIndex];
  } else {
    const newNoteSheetId = `ns-${Date.now()}`;
    const newNoteSheet = {
      id: newNoteSheetId,
      financialYearId: expense.financialYearId,
      officeId: expense.officeId,
      expenseId: expense.id,
      title: `${category ? category.name : "Expense"} - ${expense.voucherNo || ""}`,
      content: content,
      forwardingContent: forwardingContent,
      supplyOrderContent: supplyOrderContent,
      expenseType: expense.expenseType || "General",
      expenseGrossAmount: expense.grossAmount || expense.amount || 0,
      isUnder1500:
        (expense.grossAmount || expense.amount || 0) <= 1500 &&
        expense.expenseType !== "Quotation",
      isCustomEdited: false,
      createdBy: userId,
      createdAt: new Date().toISOString().split("T")[0],
    };
    noteSheets.push(newNoteSheet);
    await saveSheetData("NoteSheets", noteSheets);
    expense.noteSheetId = newNoteSheetId;
    return newNoteSheet;
  }
}

function generatePostFactoNoteSheetHtml(
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

function generatePostFactoForwardingHtml(
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

function generatePostFactoSupplyOrderHtml(
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

function generatePostFactoSanctionNoteSheetHtml(
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

async function syncNoteSheetForPostFactoProposal(
  proposal: any,
  userId: string,
  force: boolean = false,
): Promise<any> {
  const noteSheets = getSheetData("NoteSheets");
  const offices = getSheetData("Offices");
  const categories = getSheetData("Categories");
  const financialYears = getSheetData("FinancialYears");

  const office = offices.find((o: any) => o.id === proposal.officeId);
  const category = categories.find((c: any) => c.id === proposal.categoryId);
  const financialYear = financialYears.find(
    (f: any) => f.id === proposal.financialYearId,
  );

  const is134 = isCategory134(category);
  const regionalOffice =
    offices.find(
      (o: any) =>
        o.type === "HeadOffice" ||
        o.id === "off-ho" ||
        (o.name && o.name.includes("আঞ্চলিক কার্যালয়")),
    ) || office;

  const branchBalanceInfo = getAvailableBalance(
    proposal.financialYearId,
    proposal.officeId,
    proposal.categoryId,
  );

  const sanctionBalanceInfo = is134
    ? getAvailableBalance(
        proposal.financialYearId,
        regionalOffice.id,
        proposal.categoryId,
      )
    : branchBalanceInfo;

  const content = generatePostFactoNoteSheetHtml(
    proposal,
    office,
    category,
    financialYear,
    branchBalanceInfo,
  );
  const forwardingContent = generatePostFactoForwardingHtml(
    proposal,
    office,
    category,
    financialYear,
  );
  const supplyOrderContent = generatePostFactoSupplyOrderHtml(
    proposal,
    office,
    category,
    financialYear,
  );

  let sanctionNoteSheetContent = "";
  let sanctionLetterContent = "";
  if (proposal.status === "Sanctioned") {
    sanctionNoteSheetContent = generatePostFactoSanctionNoteSheetHtml(
      proposal,
      office,
      regionalOffice,
      category,
      financialYear,
      sanctionBalanceInfo,
      is134,
    );
    sanctionLetterContent = generatePostFactoSanctionLetterHtml(
      proposal,
      office,
      category,
      financialYear,
    );
  }

  const nsIndex = noteSheets.findIndex(
    (ns: any) =>
      (proposal.noteSheetId && ns.id === proposal.noteSheetId) ||
      (proposal.id && ns.expenseId === proposal.id),
  );

  if (nsIndex !== -1) {
    if (noteSheets[nsIndex].isCustomEdited && !force) {
      proposal.noteSheetId = noteSheets[nsIndex].id;
      return noteSheets[nsIndex];
    }
    noteSheets[nsIndex] = {
      ...noteSheets[nsIndex],
      financialYearId: proposal.financialYearId,
      officeId: proposal.officeId,
      expenseId: proposal.id,
      title: `${category ? category.name : "Post-Facto"} - ${proposal.description}`,
      content: content,
      forwardingContent: forwardingContent,
      supplyOrderContent: supplyOrderContent,
      sanctionNoteSheetContent:
        sanctionNoteSheetContent ||
        noteSheets[nsIndex].sanctionNoteSheetContent ||
        "",
      sanctionLetterContent:
        sanctionLetterContent ||
        noteSheets[nsIndex].sanctionLetterContent ||
        "",
      expenseType: "Post-Facto",
      expenseGrossAmount: proposal.totalAmount || 0,
      isUnder1500: false,
      isCustomEdited: false,
      updatedAt: new Date().toISOString(),
    };
    await saveSheetData("NoteSheets", noteSheets);
    proposal.noteSheetId = noteSheets[nsIndex].id;
    return noteSheets[nsIndex];
  } else {
    const newNoteSheetId = `ns-${Date.now()}`;
    const newNoteSheet = {
      id: newNoteSheetId,
      financialYearId: proposal.financialYearId,
      officeId: proposal.officeId,
      expenseId: proposal.id,
      title: `${category ? category.name : "Post-Facto"} - ${proposal.description}`,
      content: content,
      forwardingContent: forwardingContent,
      supplyOrderContent: supplyOrderContent,
      sanctionNoteSheetContent: sanctionNoteSheetContent,
      sanctionLetterContent: sanctionLetterContent,
      expenseType: "Post-Facto",
      expenseGrossAmount: proposal.totalAmount || 0,
      isUnder1500: false,
      isCustomEdited: false,
      createdBy: userId,
      createdAt: new Date().toISOString().split("T")[0],
    };
    noteSheets.push(newNoteSheet);
    await saveSheetData("NoteSheets", noteSheets);
    proposal.noteSheetId = newNoteSheetId;
    return newNoteSheet;
  }
}

function checkReferentialIntegrityOnDelete(
  sheet: string,
  id: string,
): { allowed: boolean; error?: string } {
  return checkReferentialIntegrityOnDeleteSchema(sheet, id, getSheetData);
}

app.post(
  "/api/expenses/:id/generate-notesheet",
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role === "Report Viewer") {
        return res
          .status(403)
          .json({ error: "Forbidden: Report Viewers cannot modify data" });
      }

      const { id } = req.params;
      const { userId } = req.body || {};
      const lockedSheets = [
        "Expenses",
        "NoteSheets",
        "Categories",
        "Offices",
        "FinancialYears",
        "Allocations",
        "NoteTemplates",
        "PostFactoProposals",
      ];
      const result = await withSheetLock(lockedSheets, async () => {
        const expenses = getSheetData("Expenses");
        const expense = expenses.find((e: any) => e.id === id);

        if (!expense) {

          const proposals = getSheetData("PostFactoProposals");
          const proposal = proposals.find((p: any) => p.id === id);
          if (!proposal) {
            const err: any = new Error("Expense or Proposal not found");
            err.statusCode = 404;
            throw err;
          }

          if (
            user.role === "Sub-office User" &&
            proposal.officeId !== user.officeId
          ) {
            const err: any = new Error(
              "Forbidden: Cannot modify records for other offices",
            );
            err.statusCode = 403;
            throw err;
          }

          const generatedNoteSheet = await syncNoteSheetForPostFactoProposal(
            proposal,
            userId || user.userId || "system",
            true,
          );

          await saveSheetData("PostFactoProposals", proposals);

          return { success: true, noteSheet: generatedNoteSheet, proposal };
        }

        if (
          user.role === "Sub-office User" &&
          expense.officeId !== user.officeId
        ) {
          const err: any = new Error(
            "Forbidden: Cannot modify records for other offices",
          );
          err.statusCode = 403;
          throw err;
        }

        const generatedNoteSheet = await syncNoteSheetForExpense(
          expense,
          userId || user.userId || "system",
          true,
        );
        if (!generatedNoteSheet) {
          const err: any = new Error("Template not found for this category");
          err.statusCode = 400;
          throw err;
        }

        await saveSheetData("Expenses", expenses);

        return { success: true, noteSheet: generatedNoteSheet, expense };
      });

      res.json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  },
);


app.post("/api/users/propose", requireAuth, async (req, res) => {
  try {
    const { name, userId, email, designation } = req.body;
    const proposer = (req as any).user;
    if (!name || !userId) {
      return res.status(400).json({ error: "Name and User ID are required" });
    }
    const cleanId = userId.trim().toLowerCase();

    const result = await withSheetLock("Users", async () => {
      const users = getSheetData("Users");
      const exists = users.find(
        (u: any) =>
          (u.userId || "").toLowerCase() === cleanId ||
          (u.email && u.email.toLowerCase() === (email || "").toLowerCase()),
      );
      if (exists) {
        const err: any = new Error(
          "User ID or Email already exists in the system.",
        );
        err.statusCode = 409;
        throw err;
      }

      const newId = `u_${Date.now()}`;
      const randomSalt = crypto.randomBytes(16).toString("hex");
      const defaultPassword = "password123";
      const initialHash = hashPassword(defaultPassword, randomSalt, 60000);

      const newUser = {
        id: newId,
        userId: cleanId,
        name: name.trim(),
        email: (email || "").trim(),
        role: "Sub-office User",
        officeId: proposer.officeId, // Inherit office ID from proposer
        designation: designation || "",
        passwordHash: initialHash,
        passwordSalt: randomSalt,
        status: "Pending", // Admin must approve
        mustChangePassword: true,
      };

      users.push(newUser);
      await saveSheetData("Users", users);

      addAuditLog(
        proposer.userId,
        "USER_PROPOSAL",
        "Users",
        newId,
        `Proposed new colleague: ${cleanId}`,
      );
      return {
        success: true,
        message: "User proposal submitted successfully.",
      };
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

app.get("/api/public/settings", (req, res) => {
  try {
    const settingsList = getSheetData("Settings");
    const appSettings =
      settingsList && settingsList.length > 0 ? settingsList[0] : null;
    if (appSettings) {
      res.json({
        institutionName: appSettings.institutionName || "",
        webAppName: appSettings.webAppName || "",
        logoUrl: appSettings.logoUrl || "",
        loginLogoUrl: appSettings.loginLogoUrl || "",
        customThemeColor: appSettings.customThemeColor || "",
      });
    } else {
      res.json({});
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    const cleanId = (userId || "").trim().toLowerCase();
    const users = getSheetData("Users");

    const user = users.find((u: any) => {
      const uId = (u.userId || "").toLowerCase();
      const uEmail = (u.email || "").toLowerCase();
      const sysId = (u.id || "").toLowerCase();
      return uId === cleanId || uEmail === cleanId || sysId === cleanId;
    });

    if (!user) {
      addAuditLog(
        cleanId || "unknown",
        "LOGIN_FAILED",
        "Users",
        "system",
        `Failed login attempt from IP: ${req.ip}`,
      );
      return res.status(401).json({ error: "Invalid User ID or Password" });
    }
    if (user.status === "Inactive") {
      return res
        .status(401)
        .json({ error: "User account is inactive. Contact Administrator." });
    }

    let isValidPass = false;
    let needsUpgrade = false;

    if (user.passwordSalt) {
      const hashed = hashPassword(password, user.passwordSalt, 60000);
      try {
        isValidPass = crypto.timingSafeEqual(
          Buffer.from(hashed, "hex"),
          Buffer.from(user.passwordHash || "", "hex"),
        );
      } catch (_e) {
        isValidPass = false;
      }
    } else {
      const hashedLegacy = hashPassword(password, "gov_alloc_salt_2026", 1000);
      try {
        isValidPass = crypto.timingSafeEqual(
          Buffer.from(hashedLegacy, "hex"),
          Buffer.from(user.passwordHash || "", "hex"),
        );
      } catch (_e) {
        isValidPass = false;
      }
      if (isValidPass) needsUpgrade = true;
    }

    if (!isValidPass) {
      addAuditLog(
        user.userId,
        "LOGIN_FAILED",
        "Users",
        user.id,
        `Failed login attempt from IP: ${req.ip}`,
      );
      return res.status(401).json({ error: "Invalid User ID or Password" });
    }

    if (needsUpgrade) {
      const newSalt = crypto.randomBytes(16).toString("hex");
      user.passwordSalt = newSalt;
      user.passwordHash = hashPassword(password, newSalt, 60000);
      const index = users.findIndex((u: any) => u.id === user.id);
      if (index !== -1) {
        users[index] = user;
        await saveSheetData("Users", users);
      }
    }

    const { passwordHash: _hash, passwordSalt: _salt, ...safeUser } = user;
    const token = createToken(safeUser);
    res.json({ success: true, user: safeUser, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Old password and new password are required" });
    }

    const result = await withSheetLock("Users", async () => {
      const users = getSheetData("Users");
      const index = users.findIndex(
        (u: any) => u.id === userId || u.userId === userId,
      );
      if (index === -1) {
        const err: any = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }

      const user = users[index];
      let isValidOld = false;

      if (user.passwordSalt) {
        const hashedOld = hashPassword(oldPassword, user.passwordSalt, 60000);
        try {
          isValidOld = crypto.timingSafeEqual(
            Buffer.from(hashedOld, "hex"),
            Buffer.from(user.passwordHash || "", "hex"),
          );
        } catch (_e) {
          isValidOld = false;
        }
      } else {
        const hashedOld = hashPassword(
          oldPassword,
          "gov_alloc_salt_2026",
          1000,
        );
        try {
          isValidOld = crypto.timingSafeEqual(
            Buffer.from(hashedOld, "hex"),
            Buffer.from(user.passwordHash || "", "hex"),
          );
        } catch (_e) {
          isValidOld = false;
        }
      }

      if (!isValidOld) {
        const err: any = new Error("Incorrect old password");
        err.statusCode = 400;
        throw err;
      }

      const newSalt = crypto.randomBytes(16).toString("hex");
      users[index].passwordSalt = newSalt;
      users[index].passwordHash = hashPassword(newPassword, newSalt, 60000);
      delete users[index].mustChangePassword;
      await saveSheetData("Users", users);

      const {
        passwordHash: _hash,
        passwordSalt: _salt,
        ...safeUser
      } = users[index];
      return {
        success: true,
        message: "Password updated successfully",
        user: safeUser,
      };
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

app.post(
  "/api/auth/reset-password",
  requireAuth,
  requireRole("Super Admin", "Head Office Admin"),
  async (req, res) => {
    try {
      const { targetUserId, newPassword } = req.body;
      const adminUser = (req as any).user;

      const result = await withSheetLock("Users", async () => {
        const users = getSheetData("Users");
        const index = users.findIndex(
          (u: any) => u.id === targetUserId || u.userId === targetUserId,
        );
        if (index === -1) {
          const err: any = new Error("User not found");
          err.statusCode = 404;
          throw err;
        }

        const targetUser = users[index];
        if (
          targetUser.role === "Super Admin" &&
          adminUser.role !== "Super Admin"
        ) {
          const err: any = new Error(
            "এডমিন ইউজার সুপার এডমিনের পাসওয়ার্ড রিসেট করতে পারবেন না। / Admin users cannot reset Super Admin passwords.",
          );
          err.statusCode = 403;
          throw err;
        }
        const newSalt = crypto.randomBytes(16).toString("hex");
        users[index].passwordSalt = newSalt;
        users[index].passwordHash = hashPassword(
          newPassword || "password123",
          newSalt,
          60000,
        );
        await saveSheetData("Users", users);

        await addAuditLog(
          adminUser.userId,
          "RESET_PASSWORD",
          "Users",
          targetUser.id,
          `Admin ${adminUser.userId} reset password for user ${targetUser.userId}`,
        );

        return {
          success: true,
          message: "Password reset successfully by Admin",
        };
      });

      res.json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  },
);

const sheetsList = [
  "Settings",
  "FinancialYears",
  "Offices",
  "Users",
  "Categories",
  "Allocations",
  "Expenses",
  "NoteSheets",
  "NoteTemplates",
  "OpeningBalances",
  "AuditLogs",
  "PostFactoProposals",
  "FlowTools",
  "StockProProducts",
  "StockProBranches",
  "StockProInvoices",
  "StockProVoucherPads",
  "ToolDocuments",
];

const checkWriteAccess = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role === "Report Viewer") {
    return res
      .status(403)
      .json({ error: "Forbidden: Report Viewers cannot modify data" });
  }
  const sheet = (req as any).sheetName;
  const isStaff = [
    "Super Admin",
    "Admin",
    "Head Office Admin",
    "HeadOfficeAdmin",
    "Moderator",
  ].includes(user.role);
  if (
    [
      "Settings",
      "FinancialYears",
      "Offices",
      "Categories",
      "Users",
      "Allocations",
    ].includes(sheet)
  ) {
    if (!isStaff) {
      return res
        .status(403)
        .json({ error: `Forbidden: Insufficient privileges for ${sheet}` });
    }
  }
  next();
};

sheetsList.forEach((sheet) => {

  app.get(`/api/${sheet.toLowerCase()}`, requireAuth, (req, res) => {
    try {
      let data = getSheetData(sheet);
      const user = (req as any).user;
      const isStaff = [
        "Super Admin",
        "Admin",
        "Head Office Admin",
        "HeadOfficeAdmin",
        "Moderator",
      ].includes(user.role);

      if (
        !isStaff &&
        [
          "Allocations",
          "Expenses",
          "NoteSheets",
          "OpeningBalances",
          "PostFactoProposals",
        ].includes(sheet)
      ) {
        data = data.filter((item: any) => item.officeId === user.officeId);
      }
      if (!isStaff && sheet === "Users") {
        data = data.filter((item: any) => item.officeId === user.officeId);
      }

      if (sheet === "Users") {
        // Admin or other users must not see Super Admin in the user list
        if (user.role !== "Super Admin") {
          data = data.filter((item: any) => item.role !== "Super Admin");
        }
        data = data.map((u: any) => {
          const { passwordHash: _hash, passwordSalt: _salt, ...rest } = u;
          return rest;
        });
      }

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const injectSheetName = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as any).sheetName = sheet;
    next();
  };

  app.post(
    `/api/${sheet.toLowerCase()}`,
    requireAuth,
    injectSheetName,
    checkWriteAccess,
    async (req, res) => {
      try {
        if (sheet === "AuditLogs") {
          return res.status(405).json({
            error: "Method Not Allowed: Audit logs cannot be created via API",
          });
        }

        const user = (req as any).user;
        const isStaff = [
          "Super Admin",
          "Admin",
          "Head Office Admin",
          "HeadOfficeAdmin",
          "Moderator",
        ].includes(user.role);
        if (
          ["Expenses", "NoteSheets", "PostFactoProposals"].includes(sheet) &&
          !isStaff
        ) {
          if (req.body.officeId && req.body.officeId !== user.officeId) {
            return res.status(403).json({
              error: "Forbidden: Cannot create records for other offices",
            });
          }
        }

        const schema = SheetSchemas[sheet];
        let validatedBody = req.body;
        if (schema) {
          const parseResult = schema.safeParse(req.body);
          if (!parseResult.success) {
            const errorMessages = parseResult.error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join("; ");
            return res.status(400).json({
              error: `ইনপুট ডেটা সঠিক নয়: ${errorMessages}`,
              details: parseResult.error.format(),
            });
          }
          validatedBody = parseResult.data;
        }

        const refCheck = validateReferentialIntegrity(sheet, validatedBody);
        if (!refCheck.valid) {
          return res.status(422).json({ error: refCheck.error });
        }

        if (
          ["Allocations", "Expenses", "NoteSheets", "OpeningBalances"].includes(
            sheet,
          )
        ) {
          if (
            validatedBody.financialYearId &&
            isFYClosed(validatedBody.financialYearId)
          ) {
            return res.status(423).json({
              error:
                "🔒 এই অর্থবছরটি ক্লোজড। বন্ধ অর্থবছরে নতুন কোনো এন্ট্রি প্রদান সম্ভব নয়।",
            });
          }
        }

        const lockedSheets =
          sheet === "Expenses"
            ? [
                "Expenses",
                "NoteSheets",
                "Categories",
                "Offices",
                "FinancialYears",
                "Allocations",
              ]
            : [sheet];

        const result = await withSheetLock(lockedSheets, async () => {
          const data = getSheetData(sheet);
          const rawItem = {
            id: `${sheet.toLowerCase().slice(0, 3)}-${Date.now()}`,
            ...validatedBody,
          };

          let newItem = rawItem;
          if (sheet === "Expenses") {
            const computed = computeExpenseAmounts(
              rawItem.amount,
              rawItem.vatRate,
              rawItem.taxRate,
            );
            const categories = getSheetData("Categories");
            const category = categories.find(
              (c: any) => c.id === rawItem.categoryId,
            );
            const requireApproval = category?.requireApproval !== false;

            newItem = {
              ...rawItem,
              status:
                rawItem.status || (requireApproval ? "Pending" : "Approved"),
              ...computed,
            };

            const financialYears = getSheetData("FinancialYears");
            const fy = financialYears.find(
              (f: any) => f.id === newItem.financialYearId,
            );
            if (fy && fy.startDate && fy.endDate && newItem.expenseDate) {
              if (
                newItem.expenseDate < fy.startDate ||
                newItem.expenseDate > fy.endDate
              ) {
                const err: any = new Error(
                  `ব্যয়ের তারিখ অবশ্যই নির্বাচিত অর্থবছরের সীমার (${fy.startDate} হতে ${fy.endDate}) মধ্যে হতে হবে। / Expense date must be within financial year limits.`,
                );
                err.statusCode = 422;
                throw err;
              }
            }

            if (newItem.voucherNo && newItem.voucherNo.trim() !== "") {
              const duplicate = data.find(
                (e: any) =>
                  e.financialYearId === newItem.financialYearId &&
                  e.officeId === newItem.officeId &&
                  e.voucherNo.trim().toLowerCase() ===
                    newItem.voucherNo.trim().toLowerCase(),
              );
              if (duplicate) {
                const err: any = new Error(
                  `এই ভাউচার নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে। / This voucher number has already been used.`,
                );
                err.statusCode = 409;
                throw err;
              }
            }

            const allowExcess = category?.allowExcess === true;
            const availableBalance = getAvailableBalance(
              newItem.financialYearId,
              newItem.officeId,
              newItem.categoryId,
            ).available;
            if (
              !allowExcess &&
              Number(newItem.grossAmount) > availableBalance
            ) {
              const err: any = new Error(
                `অবশিষ্ট ব্যালেন্স ৳${availableBalance}, ফলে ৳${newItem.grossAmount} ব্যয় অনুমোদনযোগ্য নয়। / Available balance is ৳${availableBalance}, so expense of ৳${newItem.grossAmount} is not allowed.`,
              );
              err.statusCode = 422;
              throw err;
            }
          }

          if (sheet === "Expenses") {
            const syncedNs = await syncNoteSheetForExpense(
              newItem,
              user.userId,
            );
            if (syncedNs) {
              newItem.noteSheetId = syncedNs.id;
            }
          }

          if (sheet === "NoteTemplates") {
            if (newItem.bodyTemplate) {
              newItem.bodyTemplate = sanitizeHtmlServer(newItem.bodyTemplate);
            }
          }

          if (sheet === "NoteSheets") {
            if (newItem.content) {
              newItem.content = sanitizeHtmlServer(newItem.content);
            }
            if (newItem.forwardingContent) {
              newItem.forwardingContent = sanitizeHtmlServer(
                newItem.forwardingContent,
              );
            }
            if (newItem.supplyOrderContent) {
              newItem.supplyOrderContent = sanitizeHtmlServer(
                newItem.supplyOrderContent,
              );
            }
            if (newItem.sanctionNoteSheetContent) {
              newItem.sanctionNoteSheetContent = sanitizeHtmlServer(
                newItem.sanctionNoteSheetContent,
              );
            }
            if (newItem.sanctionLetterContent) {
              newItem.sanctionLetterContent = sanitizeHtmlServer(
                newItem.sanctionLetterContent,
              );
            }
          }

          if (sheet === "Users") {
            if (newItem.role === "Super Admin" && user.role !== "Super Admin") {
              const err: any = new Error(
                "শুধুমাত্র সুপার এডমিনই নতুন সুপার এডমিন একাউন্ট তৈরি করতে পারবেন। / Only Super Admin can create Super Admin accounts.",
              );
              err.statusCode = 403;
              throw err;
            }
            if (newItem.password) {
              const newSalt = crypto.randomBytes(16).toString("hex");
              newItem.passwordSalt = newSalt;
              newItem.passwordHash = hashPassword(
                newItem.password,
                newSalt,
                60000,
              );
              delete newItem.password;
            }
            if (!newItem.status) newItem.status = "Active";
          }

          if (sheet === "PostFactoProposals") {
            if (!newItem.status) newItem.status = "Pending";
            newItem.submittedBy = user.name || user.userId;
            newItem.submittedAt = new Date().toISOString();
            if (!isStaff) {
              newItem.officeId = user.officeId;
              newItem.status = "Pending";
            }

            const syncedNs = await syncNoteSheetForPostFactoProposal(
              newItem,
              user.userId,
              true,
            );
            if (syncedNs) {
              newItem.noteSheetId = syncedNs.id;
            }
          }

          data.push(newItem);
          await saveSheetData(sheet, data);

          await addAuditLog(
            user.userId,
            `CREATE_${sheet.toUpperCase()}`,
            sheet,
            newItem.id,
            `Created record in ${sheet}`,
          );

          let responseItem = newItem;
          if (sheet === "Users") {
            const {
              passwordHash: _hash,
              passwordSalt: _salt,
              ...rest
            } = newItem;
            responseItem = rest;
          }

          return responseItem;
        });

        res.status(201).json(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ error: err.message });
      }
    },
  );

  app.put(
    `/api/${sheet.toLowerCase()}/:id`,
    requireAuth,
    injectSheetName,
    checkWriteAccess,
    async (req, res) => {
      try {
        if (sheet === "AuditLogs") {
          return res.status(405).json({
            error: "Method Not Allowed: Audit logs cannot be modified",
          });
        }

        const { id } = req.params;

        const updateSchema = SheetUpdateSchemas[sheet];
        let validatedBody = req.body;
        if (updateSchema) {
          const parseResult = updateSchema.safeParse(req.body);
          if (!parseResult.success) {
            const errorMessages = parseResult.error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join("; ");
            return res.status(400).json({
              error: `ইনপুট ডেটা সঠিক নয়: ${errorMessages}`,
              details: parseResult.error.format(),
            });
          }
          validatedBody = parseResult.data;
        }

        const refCheck = validateReferentialIntegrity(sheet, validatedBody);
        if (!refCheck.valid) {
          return res.status(422).json({ error: refCheck.error });
        }

        const lockedSheets =
          sheet === "Expenses"
            ? [
                "Expenses",
                "NoteSheets",
                "Categories",
                "Offices",
                "FinancialYears",
                "Allocations",
              ]
            : [sheet];

        const result = await withSheetLock(lockedSheets, async () => {
          const data = getSheetData(sheet);
          const index = data.findIndex((item) => item.id === id);
          if (index === -1) {
            const err: any = new Error("Record not found");
            err.statusCode = 404;
            throw err;
          }

          const user = (req as any).user;
          const isStaff = [
            "Super Admin",
            "Admin",
            "Head Office Admin",
            "HeadOfficeAdmin",
            "Moderator",
          ].includes(user.role);
          if (
            ["Expenses", "NoteSheets", "PostFactoProposals"].includes(sheet) &&
            !isStaff
          ) {
            const existingItem = data[index];
            if (
              existingItem.officeId !== user.officeId ||
              (validatedBody.officeId &&
                validatedBody.officeId !== user.officeId)
            ) {
              const err: any = new Error(
                "Forbidden: Cannot modify records for other offices",
              );
              err.statusCode = 403;
              throw err;
            }
          }

          if (
            [
              "Allocations",
              "Expenses",
              "NoteSheets",
              "OpeningBalances",
            ].includes(sheet)
          ) {
            const targetFyId =
              validatedBody.financialYearId || data[index]?.financialYearId;
            if (targetFyId && isFYClosed(targetFyId)) {
              const err: any = new Error(
                "🔒 এই অর্থবছরটি ক্লোজড। বন্ধ অর্থবছরের কোনো এন্ট্রি সম্পাদনা সম্ভব নয়।",
              );
              err.statusCode = 423;
              throw err;
            }
          }

          if (sheet === "Users") {
            const existingItem = data[index];
            if (
              existingItem.role === "Super Admin" &&
              user.role !== "Super Admin"
            ) {
              const err: any = new Error(
                "এডমিন ইউজার সুপার এডমিনের একাউন্ট সম্পাদনা করতে পারবেন না। / Admin users cannot edit Super Admin accounts.",
              );
              err.statusCode = 403;
              throw err;
            }
            if (
              validatedBody.role === "Super Admin" &&
              user.role !== "Super Admin"
            ) {
              const err: any = new Error(
                "শুধুমাত্র সুপার এডমিনই কাউকে সুপার এডমিন হিসেবে আপগ্রেড করতে পারবেন। / Only Super Admin can assign the Super Admin role.",
              );
              err.statusCode = 403;
              throw err;
            }
          }

          if (sheet === "Allocations") {
            const existingItem = data[index];
            const newAllocatedAmount =
              validatedBody.allocatedAmount !== undefined
                ? Number(validatedBody.allocatedAmount)
                : Number(existingItem.allocatedAmount);
            const diff =
              newAllocatedAmount - Number(existingItem.allocatedAmount);
            if (diff < 0) {
              const categories = getSheetData("Categories");
              const category = categories.find(
                (c: any) => c.id === existingItem.categoryId,
              );
              if (!category?.allowExcess) {
                const currentBalance = getAvailableBalance(
                  existingItem.financialYearId,
                  existingItem.officeId,
                  existingItem.categoryId,
                ).available;
                const hypotheticalBalance = currentBalance + diff;
                if (hypotheticalBalance < 0) {
                  const err: any = new Error(
                    `বরাদ্দ কমালে খাতের ব্যালেন্স ঋণাত্মক (৳${hypotheticalBalance}) হয়ে যাবে। তাই বরাদ্দ কমানো সম্ভব নয়।`,
                  );
                  err.statusCode = 409;
                  throw err;
                }
              }
            }
          }

          let updatePayload = validatedBody;
          if (sheet === "Expenses") {
            const existingItem = data[index];
            if (existingItem.noteSheetId) {
              const noteSheets = getSheetData("NoteSheets");
              const ns = noteSheets.find(
                (n: any) => n.id === existingItem.noteSheetId,
              );
              if (ns && ns.status === "Approved") {
                const err: any = new Error(
                  `এই ব্যয়ের নোটশিট অনুমোদিত (Approved) হয়েছে। সরাসরি সম্পাদনা না করে নতুন Adjustment বা সংশোধনী এন্ট্রি দিন। / Approved note sheet exists. Please use Adjustment entry.`,
                );
                err.statusCode = 409;
                throw err;
              }
            }

            const merged = { ...data[index], ...validatedBody };
            const computed = computeExpenseAmounts(
              merged.amount,
              merged.vatRate,
              merged.taxRate,
            );
            updatePayload = {
              ...merged,
              ...computed,
            };

            const financialYears = getSheetData("FinancialYears");
            const fy = financialYears.find(
              (f: any) => f.id === updatePayload.financialYearId,
            );
            if (fy && fy.startDate && fy.endDate && updatePayload.expenseDate) {
              if (
                updatePayload.expenseDate < fy.startDate ||
                updatePayload.expenseDate > fy.endDate
              ) {
                const err: any = new Error(
                  `ব্যয়ের তারিখ অবশ্যই নির্বাচিত অর্থবছরের সীমার (${fy.startDate} হতে ${fy.endDate}) মধ্যে হতে باشد। / Expense date must be within financial year limits.`,
                );
                err.statusCode = 422;
                throw err;
              }
            }

            if (
              updatePayload.voucherNo &&
              updatePayload.voucherNo.trim() !== ""
            ) {
              const duplicate = data.find(
                (e: any) =>
                  e.id !== id &&
                  e.financialYearId === updatePayload.financialYearId &&
                  e.officeId === updatePayload.officeId &&
                  e.voucherNo.trim().toLowerCase() ===
                    updatePayload.voucherNo.trim().toLowerCase(),
              );
              if (duplicate) {
                const err: any = new Error(
                  `এই ভাউচার নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে। / This voucher number has already been used.`,
                );
                err.statusCode = 409;
                throw err;
              }
            }

            const categories = getSheetData("Categories");
            const category = categories.find(
              (c: any) => c.id === updatePayload.categoryId,
            );
            const allowExcess = category?.allowExcess === true;

            const availableBalance = getAvailableBalance(
              updatePayload.financialYearId,
              updatePayload.officeId,
              updatePayload.categoryId,
            ).available;
            const oldGross = Number(
              data[index].grossAmount || data[index].amount || 0,
            );
            const newGross = Number(updatePayload.grossAmount || 0);
            const diff = newGross - oldGross;

            if (!allowExcess && diff > 0 && diff > availableBalance) {
              const err: any = new Error(
                `অবশিষ্ট ব্যালেন্স ৳${availableBalance}, ফলে ব্যয়ের পরিমাণ বৃদ্ধি অনুমোদনযোগ্য নয়। / Available balance is ৳${availableBalance}, so expense increase is not allowed.`,
              );
              err.statusCode = 422;
              throw err;
            }
          }

          if (sheet === "NoteTemplates") {
            if (updatePayload.bodyTemplate) {
              updatePayload.bodyTemplate = sanitizeHtmlServer(
                updatePayload.bodyTemplate,
              );
            }
          }

          if (sheet === "NoteSheets") {
            if (updatePayload.content) {
              updatePayload.content = sanitizeHtmlServer(updatePayload.content);
            }
            if (updatePayload.forwardingContent) {
              updatePayload.forwardingContent = sanitizeHtmlServer(
                updatePayload.forwardingContent,
              );
            }
            if (updatePayload.supplyOrderContent) {
              updatePayload.supplyOrderContent = sanitizeHtmlServer(
                updatePayload.supplyOrderContent,
              );
            }
            if (updatePayload.sanctionNoteSheetContent) {
              updatePayload.sanctionNoteSheetContent = sanitizeHtmlServer(
                updatePayload.sanctionNoteSheetContent,
              );
            }
            if (updatePayload.sanctionLetterContent) {
              updatePayload.sanctionLetterContent = sanitizeHtmlServer(
                updatePayload.sanctionLetterContent,
              );
            }
          }

          if (sheet === "Users") {
            if (updatePayload.password) {
              const newSalt = crypto.randomBytes(16).toString("hex");
              updatePayload.passwordSalt = newSalt;
              updatePayload.passwordHash = hashPassword(
                updatePayload.password,
                newSalt,
                60000,
              );
              delete updatePayload.password;
            }
          }

          const oldJson = JSON.stringify(data[index]);
          data[index] = { ...data[index], ...updatePayload, id };

          if (sheet === "Expenses") {
            const syncedNs = await syncNoteSheetForExpense(
              data[index],
              user.userId,
              true,
            );
            if (syncedNs) {
              data[index].noteSheetId = syncedNs.id;
            }
          }

          if (sheet === "PostFactoProposals") {
            const syncedNs = await syncNoteSheetForPostFactoProposal(
              data[index],
              user.userId,
              true,
            );
            if (syncedNs) {
              data[index].noteSheetId = syncedNs.id;
            }
          }

          const newJson = JSON.stringify(data[index]);
          await saveSheetData(sheet, data);

          const auditDetails =
            sheet === "Expenses"
              ? `Updated expense ${id}. Old: ${oldJson}, New: ${newJson}`
              : `Updated record ${id} in ${sheet}`;
          await addAuditLog(
            user.userId,
            `UPDATE_${sheet.toUpperCase()}`,
            sheet,
            id,
            auditDetails,
          );

          let responseItem = data[index];
          if (sheet === "Users") {
            const {
              passwordHash: _hash,
              passwordSalt: _salt,
              ...rest
            } = data[index];
            responseItem = rest;
          }

          return responseItem;
        });

        res.json(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ error: err.message });
      }
    },
  );

  app.delete(
    `/api/${sheet.toLowerCase()}/:id`,
    requireAuth,
    injectSheetName,
    checkWriteAccess,
    async (req, res) => {
      try {
        if (sheet === "AuditLogs") {
          return res.status(405).json({
            error: "Method Not Allowed: Audit logs cannot be deleted",
          });
        }

        const { id } = req.params;

        const deleteCheck = checkReferentialIntegrityOnDelete(sheet, id);
        if (!deleteCheck.allowed) {
          return res.status(409).json({ error: deleteCheck.error });
        }

        const lockedSheets = [
          sheet,
          "Allocations",
          "Expenses",
          "NoteSheets",
          "OpeningBalances",
          "Users",
        ];

        const result = await withSheetLock(lockedSheets, async () => {
          let data = getSheetData(sheet);
          const item = data.find((i) => i.id === id);
          if (!item) {
            const err: any = new Error("Record not found");
            err.statusCode = 404;
            throw err;
          }

          const user = (req as any).user;
          const isStaff = [
            "Super Admin",
            "Admin",
            "Head Office Admin",
            "HeadOfficeAdmin",
            "Moderator",
          ].includes(user.role);
          if (["Expenses", "NoteSheets"].includes(sheet) && !isStaff) {
            if (item && item.officeId !== user.officeId) {
              const err: any = new Error(
                "Forbidden: Cannot delete records for other offices",
              );
              err.statusCode = 403;
              throw err;
            }
          }

          if (
            [
              "Allocations",
              "Expenses",
              "NoteSheets",
              "OpeningBalances",
            ].includes(sheet)
          ) {
            if (
              item &&
              item.financialYearId &&
              isFYClosed(item.financialYearId)
            ) {
              const err: any = new Error(
                "🔒 এই অর্থবছরটি ক্লোজড। বন্ধ অর্থবছরের কোনো তথ্য মুছে ফেলা সম্ভব নয়।",
              );
              err.statusCode = 423;
              throw err;
            }
          }

          if (sheet === "Users") {
            if (
              item &&
              item.role === "Super Admin" &&
              user.role !== "Super Admin"
            ) {
              const err: any = new Error(
                "এডমিন ইউজার সুপার এডমিনের একাউন্ট ডিলিট করতে পারবেন না। / Admin users cannot delete Super Admin accounts.",
              );
              err.statusCode = 403;
              throw err;
            }
          }

          if (sheet === "Allocations") {
            const itemToDelete = data.find((i: any) => i.id === id);
            if (itemToDelete) {
              const categories = getSheetData("Categories");
              const category = categories.find(
                (c: any) => c.id === itemToDelete.categoryId,
              );
              if (!category?.allowExcess) {
                const currentBalance = getAvailableBalance(
                  itemToDelete.financialYearId,
                  itemToDelete.officeId,
                  itemToDelete.categoryId,
                ).available;
                const hypotheticalBalance =
                  currentBalance - Number(itemToDelete.allocatedAmount || 0);
                if (hypotheticalBalance < 0) {
                  const err: any = new Error(
                    `এই বরাদ্দ মুছে ফেললে খাতের ব্যালেন্স ঋণাত্মক (৳${hypotheticalBalance}) হয়ে যাবে। তাই বরাদ্দ মোছা সম্ভব নয়।`,
                  );
                  err.statusCode = 409;
                  throw err;
                }
              }
            }
          }

          if (sheet === "Expenses") {
            const itemToDelete = data.find((i: any) => i.id === id);
            const noteSheets = getSheetData("NoteSheets");
            const remainingNoteSheets = noteSheets.filter(
              (ns: any) =>
                ns.expenseId !== id && ns.id !== itemToDelete?.noteSheetId,
            );
            if (remainingNoteSheets.length !== noteSheets.length) {
              await saveSheetData("NoteSheets", remainingNoteSheets);
            }
          }

          data = data.filter((i) => i.id !== id);
          await saveSheetData(sheet, data);

          await addAuditLog(
            user.userId,
            `DELETE_${sheet.toUpperCase()}`,
            sheet,
            id,
            `Deleted record ${id} from ${sheet}`,
          );

          return { success: true, deletedId: id };
        });

        res.json(result);
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ error: err.message });
      }
    },
  );
});

app.post(
  "/api/postfactoproposals/:id/sanction",
  requireAuth,
  requireRole(
    "Super Admin",
    "Admin",
    "Head Office Admin",
    "HeadOfficeAdmin",
    "Moderator",
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        sanctionType,
        sanctionMemoNo,
        sanctionDate,
        sanctionedAmount,
        sanctionRemarks,
        sanctionDocument,
        letterNo,
        letterDate,
      } = req.body;
      const user = (req as any).user;

      const result = await withSheetLock(
        [
          "PostFactoProposals",
          "NoteSheets",
          "Offices",
          "Categories",
          "FinancialYears",
        ],
        async () => {
          const proposals = getSheetData("PostFactoProposals");
          const idx = proposals.findIndex((p: any) => p.id === id);
          if (idx === -1) {
            const err: any = new Error(
              "প্রস্তাবটি পাওয়া যায়নি। / Proposal not found",
            );
            err.statusCode = 404;
            throw err;
          }

          proposals[idx].status = "Sanctioned";
          if (sanctionType !== undefined)
            proposals[idx].sanctionType = sanctionType;
          if (sanctionMemoNo !== undefined)
            proposals[idx].sanctionMemoNo = sanctionMemoNo;
          if (sanctionDate !== undefined)
            proposals[idx].sanctionDate = sanctionDate;
          if (letterNo !== undefined) proposals[idx].letterNo = letterNo;
          if (letterDate !== undefined) proposals[idx].letterDate = letterDate;
          if (sanctionedAmount !== undefined) {
            proposals[idx].sanctionedAmount = Number(sanctionedAmount);
          }
          if (sanctionRemarks !== undefined) {
            proposals[idx].sanctionRemarks = sanctionRemarks;
          }
          if (sanctionDocument !== undefined) {
            proposals[idx].sanctionDocument = sanctionDocument;
          }
          proposals[idx].sanctionedBy = user.name || user.userId;
          proposals[idx].sanctionedAt = new Date().toISOString();

          await saveSheetData("PostFactoProposals", proposals);

          try {
            await syncNoteSheetForPostFactoProposal(
              proposals[idx],
              user.userId,
              true,
            );
          } catch (_e) {
            console.error("Failed to sync note sheet on sanction:", _e);
          }

          await addAuditLog(
            user.userId,
            "SANCTION_POST_FACTO_PROPOSAL",
            "PostFactoProposals",
            id,
            `Sanctioned post-facto proposal ${id} with memo ${sanctionMemoNo || "N/A"}`,
          );

          return proposals[idx];
        },
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  },
);

app.post(
  "/api/postfactoproposals/:id/upload-sanction-document",
  requireAuth,
  requireRole(
    "Super Admin",
    "Admin",
    "Head Office Admin",
    "HeadOfficeAdmin",
    "Moderator",
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { sanctionDocument } = req.body;
      if (!sanctionDocument) {
        return res.status(400).json({ error: "No document URL provided" });
      }

      const result = await withSheetLock(["PostFactoProposals"], async () => {
        const proposals = getSheetData("PostFactoProposals");
        const idx = proposals.findIndex((p: any) => p.id === id);
        if (idx === -1) {
          const err: any = new Error(
            "প্রস্তাবটি পাওয়া যায়নি। / Proposal not found",
          );
          err.statusCode = 404;
          throw err;
        }

        proposals[idx].sanctionDocument = sanctionDocument;
        await saveSheetData("PostFactoProposals", proposals);

        await addAuditLog(
          (req as any).user.userId,
          "UPLOAD_SANCTION_DOCUMENT",
          "PostFactoProposals",
          id,
          `Uploaded sanction document for proposal ${id}`,
        );

        return proposals[idx];
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  },
);

app.get("/api/apps-script-code", requireAuth, (req, res) => {
  try {
    const codeGsPath = path.join(process.cwd(), "src", "gas", "Code.gs");
    const setupDbPath = path.join(
      process.cwd(),
      "src",
      "gas",
      "SetupDatabase.gs",
    );
    const indexPath = path.join(process.cwd(), "src", "gas", "Index.html");

    const codeGs = fs.existsSync(codeGsPath)
      ? fs.readFileSync(codeGsPath, "utf-8")
      : "";
    const setupDb = fs.existsSync(setupDbPath)
      ? fs.readFileSync(setupDbPath, "utf-8")
      : "";
    const indexHtml = fs.existsSync(indexPath)
      ? fs.readFileSync(indexPath, "utf-8")
      : "";

    res.json({
      code: codeGs,
      codeGs,
      setupDb,
      indexHtml,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/generate-notesheet", requireAuth, async (req, res) => {
  try {
    const { categoryName, amount, description, officeName, financialYear } =
      req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Gemini API key not configured." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Draft a formal government office Note Sheet in Bengali and English formal style for an expense sanction.
      Office: ${officeName}
      Financial Year: ${financialYear}
      Category: ${categoryName}
      Amount: ${amount} BDT
      Description/Purpose: ${description}
      
      Provide a professional subject line, reference to approved budget allocation, justification, and recommendation for approval.`,
    });

    res.json({ result: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/parse-word-doc", requireAuth, async (req, res) => {
  try {
    let rawBase64 =
      req.body.base64 || req.body.base64Data || req.body.file || "";
    const filename = req.body.filename || req.body.fileName || "document.docx";

    if (typeof rawBase64 === "string" && rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    const cleanBase64 =
      typeof rawBase64 === "string"
        ? rawBase64.replace(/^data:[^;]+;base64,/, "").trim()
        : "";
    if (!cleanBase64) {
      return res
        .status(400)
        .json({ error: "Base64 file content is required." });
    }

    const buffer = Buffer.from(cleanBase64, "base64");

    let html = "";
    try {
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value || "";
    } catch (mammothErr: any) {
      console.warn(
        "Mammoth parse failed, checking text fallback:",
        mammothErr.message,
      );

      const textCandidate = buffer.toString("utf-8");
      const sample = textCandidate.substring(0, 100);
      const hasControlChars = Array.from(sample).some((c) => {
        const code = c.charCodeAt(0);
        return (code >= 0 && code <= 8) || (code >= 14 && code <= 31);
      });
      if (textCandidate && !hasControlChars) {
        if (
          textCandidate.includes("<html") ||
          textCandidate.includes("<table") ||
          textCandidate.includes("<p>")
        ) {
          html = textCandidate;
        } else {
          html = textCandidate
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => `<p>${line.trim()}</p>`)
            .join("\n");
        }
      } else {
        throw new Error(
          "ওয়ার্ড ফাইলটি (.docx) ফরম্যাটে হতে হবে। পুরনো বাইনারি .doc ফাইল হলে দয়া করে সেটি Word বা Google Docs-এ ওপেন করে .docx হিসেবে সেভ করে আপলোড করুন।",
        );
      }
    }

    if (html.includes("<table")) {
      html = html.replace(
        /<table/g,
        '<table style="width:100%; border-collapse:collapse; margin:12px 0; border:1.5px solid #000; font-size:inherit;"',
      );
      html = html.replace(
        /<td/g,
        '<td style="border:1px solid #000; padding:6px 8px; vertical-align:top;"',
      );
      html = html.replace(
        /<th/g,
        '<th style="border:1px solid #000; padding:6px 8px; background-color:#f1f5f9; text-align:center;"',
      );
    }

    const cleanHtml = sanitizeHtmlServer(html);

    res.json({
      success: true,
      html: cleanHtml,
      filename,
    });
  } catch (err: any) {
    console.error("Word Doc parsing error:", err);
    res
      .status(400)
      .json({ error: err.message || "Failed to parse Word document." });
  }
});

app.post(
  "/api/expenses/:id/approve",
  requireAuth,
  requireRole("Super Admin", "Head Office Admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const result = await withSheetLock("Expenses", async () => {
        const expenses = getSheetData("Expenses");
        const index = expenses.findIndex((e: any) => e.id === id);
        if (index === -1) {
          const err: any = new Error("Expense not found");
          err.statusCode = 404;
          throw err;
        }
        const expense = expenses[index];
        expense.status = "Approved";
        expense.approvedBy = user.userId;
        expense.approvedAt = new Date()
          .toISOString()
          .replace("T", " ")
          .substring(0, 19);

        await saveSheetData("Expenses", expenses);
        await addAuditLog(
          user.userId,
          "APPROVE_EXPENSE",
          "Expenses",
          id,
          `Approved expense ${id} (Voucher: ${expense.voucherNo}, Amount: ৳${expense.amount})`,
        );

        return expense;
      });

      res.json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  },
);

app.post(
  "/api/expenses/:id/reject",
  requireAuth,
  requireRole("Super Admin", "Head Office Admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({
          error: "প্রত্যাখ্যানের কারণ আবশ্যক। / Rejection reason is required.",
        });
      }
      const user = (req as any).user;

      const result = await withSheetLock("Expenses", async () => {
        const expenses = getSheetData("Expenses");
        const index = expenses.findIndex((e: any) => e.id === id);
        if (index === -1) {
          const err: any = new Error("Expense not found");
          err.statusCode = 404;
          throw err;
        }
        const expense = expenses[index];
        expense.status = "Rejected";
        expense.approvedBy = user.userId;
        expense.approvedAt = new Date()
          .toISOString()
          .replace("T", " ")
          .substring(0, 19);
        expense.rejectionReason = reason.trim();

        await saveSheetData("Expenses", expenses);
        await addAuditLog(
          user.userId,
          "REJECT_EXPENSE",
          "Expenses",
          id,
          `Rejected expense ${id}. Reason: ${reason.trim()}`,
        );

        return expense;
      });

      res.json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  },
);

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.post("/api/upload", requireAuth, (req, res) => {
  try {
    const { base64Data, expenseId, originalName } = req.body;
    if (!base64Data || typeof base64Data !== "string") {
      return res
        .status(400)
        .json({ error: "ফাইল ডাটা আবশ্যক। / File data is required." });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const maxSizeBytes = 5 * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      return res.status(400).json({
        error:
          "ফাইলের আকার ৫ MB এর বেশি হতে পারবে না। / File size cannot exceed 5 MB.",
      });
    }

    const detected = detectFileTypeFromMagicBytes(buffer);
    if (!detected) {
      return res.status(400).json({
        error:
          "অনুমোদিত ফাইল ফরম্যাট: pdf, jpg, jpeg, png, webp, gif, docx। / Allowed file formats: pdf, jpg, jpeg, png, webp, gif, docx.",
      });
    }

    let ext = detected.ext;
    if (originalName && typeof originalName === "string") {
      const origExt = path.extname(originalName).toLowerCase().replace(".", "");
      if (origExt === "jpeg" && detected.ext === "jpg") {
        ext = "jpeg";
      }
    }

    const cleanId = (expenseId || "exp").replace(/[^a-zA-Z0-9_-]/g, "");
    const safeFilename = `${cleanId}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const user = (req as any).user;
    addAuditLog(
      user.userId,
      "UPLOAD_DOCUMENT",
      "Uploads",
      safeFilename,
      `Uploaded supporting document ${safeFilename} (${buffer.length} bytes, format: ${ext})`,
    );

    res.json({
      success: true,
      filename: safeFilename,
      url: `/api/upload/${safeFilename}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "File upload failed" });
  }
});

app.get("/api/upload/:filename", requireAuth, (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: "ফাইল পাওয়া যায়নি। / File not found." });
    }

    const user = (req as any).user;

    if (
      user.role !== "Super Admin" &&
      user.role !== "Head Office Admin" &&
      user.role !== "Admin" &&
      user.role !== "Moderator"
    ) {
      const expenses = getSheetData("Expenses");
      const matchedExpense = expenses.find(
        (e: any) =>
          e.supportingDocument && e.supportingDocument.includes(filename),
      );
      const proposals = getSheetData("PostFactoProposals");
      const matchedProposal = proposals.find(
        (p: any) => p.sanctionDocument && p.sanctionDocument.includes(filename),
      );

      if (matchedExpense && matchedExpense.officeId !== user.officeId) {
        return res.status(403).json({
          error:
            "আপনার এই অফিসের সংযুক্তি দেখার অনুমতি নেই। / You do not have permission to view attachments for this office.",
        });
      }
      if (matchedProposal && matchedProposal.officeId !== user.officeId) {
        return res.status(403).json({
          error:
            "আপনার এই অফিসের সংযুক্তি দেখার অনুমতি নেই। / You do not have permission to view attachments for this office.",
        });
      }
    }

    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".docx")
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    res.setHeader("Content-Type", contentType);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/financialyears/:id/close", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const isAdmin =
      user.role === "Super Admin" ||
      user.role === "Head Office Admin" ||
      user.role === "HeadOfficeAdmin";
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "Forbidden: Only Admin can close a financial year" });
    }

    const { id } = req.params;
    const { targetFinancialYearId, carryForwardMap } = req.body || {};

    const result = await withSheetLock(
      [
        "FinancialYears",
        "Expenses",
        "OpeningBalances",
        "Offices",
        "Categories",
        "Allocations",
      ],
      async () => {
        const fys = getSheetData("FinancialYears");
        const fyIndex = fys.findIndex((f: any) => f.id === id);
        if (fyIndex === -1) {
          const err: any = new Error("Financial year not found");
          err.statusCode = 404;
          throw err;
        }

        const currentFY = fys[fyIndex];
        if (currentFY.isClosed) {
          const err: any = new Error("এই অর্থবছরটি ইতিপূর্বে ক্লোজ করা হয়েছে।");
          err.statusCode = 400;
          throw err;
        }

        const expenses = getSheetData("Expenses");
        const pendingInFY = expenses.filter(
          (e: any) => e.financialYearId === id && e.status === "Pending",
        );

        if (pendingInFY.length > 0) {
          const err: any = new Error(
            `এই অর্থবছরে ${pendingInFY.length} টি পেন্ডিং ব্যয় বিদ্যমান। অর্থবছর ক্লোজ করার পূর্বে সকল পেন্ডিং ব্যয় অনুমোদন বা প্রত্যাখ্যান করতে হবে।`,
          );
          err.statusCode = 409;
          err.pendingCount = pendingInFY.length;
          throw err;
        }

        let nextFY = null;
        if (targetFinancialYearId) {
          nextFY = fys.find((f: any) => f.id === targetFinancialYearId);
        }
        if (!nextFY) {
          const otherFYs = fys.filter((f: any) => f.id !== id);
          nextFY =
            otherFYs.find((f: any) => f.status === "Active") || otherFYs[0];
        }

        const offices = getSheetData("Offices");
        const categories = getSheetData("Categories");
        let openingBalances = getSheetData("OpeningBalances");

        const createdOpeningBalances: any[] = [];

        if (nextFY) {
          offices.forEach((off: any) => {
            categories.forEach((cat: any) => {
              const key = `${off.id}_${cat.id}`;
              const currentBalInfo = getAvailableBalance(id, off.id, cat.id);
              const availableAmount = Math.max(0, currentBalInfo.available);

              let carryAmount = availableAmount;
              if (carryForwardMap && carryForwardMap[key] !== undefined) {
                carryAmount = Math.max(0, Number(carryForwardMap[key]) || 0);
              }

              if (carryAmount > 0) {

                openingBalances = openingBalances.filter(
                  (ob: any) =>
                    !(
                      ob.financialYearId === nextFY.id &&
                      ob.officeId === off.id &&
                      ob.categoryId === cat.id
                    ),
                );

                const obItem = {
                  id: `ob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  financialYearId: nextFY.id,
                  officeId: off.id,
                  categoryId: cat.id,
                  amount: carryAmount,
                  sourceFYId: id,
                  createdAt: new Date().toISOString(),
                  createdBy: user.userId,
                };
                openingBalances.push(obItem);
                createdOpeningBalances.push(obItem);
              }
            });
          });
          await saveSheetData("OpeningBalances", openingBalances);
        }

        currentFY.isClosed = true;
        currentFY.closedAt = new Date().toISOString();
        currentFY.closedBy = user.userId;
        fys[fyIndex] = currentFY;
        await saveSheetData("FinancialYears", fys);

        await addAuditLog(
          user.userId,
          "CLOSE_FINANCIAL_YEAR",
          "FinancialYears",
          id,
          `Closed Financial Year ${currentFY.name}. Carried forward opening balances to ${nextFY ? nextFY.name : "N/A"}.`,
        );

        return {
          success: true,
          closedFY: currentFY,
          nextFY,
          openingBalancesCreated: createdOpeningBalances,
        };
      },
    );

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res
      .status(statusCode)
      .json({ error: err.message, pendingCount: err.pendingCount });
  }
});

app.put("/api/settings", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const isAdmin = [
      "Super Admin",
      "Admin",
      "Head Office Admin",
    ].includes(user.role);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only Admin can update settings" });
    }

    const result = await withSheetLock(["Settings"], async () => {
      const data = getSheetData("Settings");
      if (data.length === 0) {
        data.push({ id: "set-1", ...req.body });
      } else {
        data[0] = { ...data[0], ...req.body };
      }
      await saveSheetData("Settings", data);

      await addAuditLog(
        user.userId,
        "UPDATE_SETTINGS",
        "Settings",
        data[0].id,
        "Updated global settings centrally"
      );
      return data[0];
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/restore-defaults", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const isAdmin =
      user.role === "Super Admin" ||
      user.role === "Head Office Admin" ||
      user.role === "HeadOfficeAdmin";
    if (!isAdmin) {
      return res.status(403).json({
        error: "Forbidden: Only Admin can restore default configurations",
      });
    }

    const { target } = req.body || {}; // "offices" | "categories" | "all"

    let restoredOfficesCount = 0;
    let restoredCategoriesCount = 0;

    if (!target || target === "all" || target === "offices") {
      await withSheetLock(["Offices"], async () => {
        saveSheetData("Offices", officialOffices);
        restoredOfficesCount = officialOffices.length;
      });
    }

    if (!target || target === "all" || target === "categories") {
      await withSheetLock(["Categories"], async () => {
        saveSheetData("Categories", officialCategories);
        restoredCategoriesCount = officialCategories.length;
      });
    }

    res.json({
      success: true,
      message:
        "বাংলাদেশ কৃষি ব্যাংকের প্রমিত অফিস ও ব্যয়ের খাতসমূহ সফলভাবে রিকভার করা হয়েছে।",
      officesCount: restoredOfficesCount,
      categoriesCount: restoredCategoriesCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



app.get("/api/database/status", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== "Super Admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Only Super Admin can access Central SQLite Database" });
  }

  try {
    const stats = await getSqliteStats();
    res.json({
      engine: stats.isRemote
        ? "Remote Cloud LibSQL / Turso"
        : "SQLite (WAL Mode)",
      isRemote: stats.isRemote,
      remoteUrl: stats.remoteUrl,
      status: "Connected & Synchronized",
      location: stats.dbPath,
      sizeBytes: stats.sizeBytes,
      sizeFormatted: stats.isRemote
        ? "Cloud-Hosted"
        : `${(stats.sizeBytes / 1024).toFixed(2)} KB`,
      tables: stats.tableCounts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/database/download", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== "Super Admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Only Super Admin can download raw database" });
  }

  await checkpointWal();

  const sqliteFile = path.join(DATA_DIR, "database.sqlite");
  if (!fs.existsSync(sqliteFile)) {
    return res.status(404).json({ error: "database.sqlite file not found" });
  }
  res.download(
    sqliteFile,
    `database-${new Date().toISOString().split("T")[0]}.sqlite`,
  );
});

app.get("/api/database/export-json", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== "Super Admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Only Super Admin can export database JSON" });
  }

  await checkpointWal();
  const allData = getAllDataMap();
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    system: "Office Allocation & Expense Management",
    version: "2.0.0",
    data: allData,
  };

  const filename = `backup-${new Date().toISOString().split("T")[0]}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(exportPayload, null, 2));
});

app.post("/api/database/restore", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== "Super Admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Only Super Admin can restore database" });
  }

  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data || typeof base64Data !== "string") {
      return res
        .status(400)
        .json({ error: "ফাইল ডাটা পাওয়া যায়নি। / File data is required." });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const nameLower = (fileName || "").toLowerCase();

    if (nameLower.endsWith(".sqlite") || nameLower.endsWith(".db")) {
      const tempPath = path.join(DATA_DIR, `restore-${Date.now()}.tmp`);
      fs.writeFileSync(tempPath, buffer);
      try {
        await restoreSqliteFromFile(tempPath, DATA_DIR, initialData);
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
      await addAuditLog(
        user.userId,
        "RESTORE_DATABASE_SQLITE",
        "System",
        "database.sqlite",
        "Restored full SQLite database file",
      );
      return res.json({
        success: true,
        message: "SQLite ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে।",
      });
    } else if (nameLower.endsWith(".json")) {
      const rawText = buffer.toString("utf8");
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return res
          .status(400)
          .json({ error: "JSON ফাইলটি বৈধ নয়। / Invalid JSON file format." });
      }

      const dataMap =
        parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
      const count = await restoreFromDataMap(dataMap, DATA_DIR);
      await addAuditLog(
        user.userId,
        "RESTORE_DATABASE_JSON",
        "System",
        "AllSheets",
        `Restored ${count} records from JSON backup`,
      );
      return res.json({
        success: true,
        message: `JSON ব্যাকআপ থেকে ${count} টি রেকর্ড সফলভাবে রিস্টোর করা হয়েছে।`,
        count,
      });
    } else {
      return res
        .status(400)
        .json({ error: "শুধুমাত্র .sqlite অথবা .json ফাইল সমর্থিত।" });
    }
  } catch (err: any) {
    console.error("[Restore Error]:", err);
    res.status(500).json({ error: err.message || "Database restore failed" });
  }
});

app.post("/api/database/checkpoint", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== "Super Admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Only Super Admin can access Central SQLite Database checkpoint" });
  }
  try {
    await checkpointWal();
    res.json({
      success: true,
      message: "WAL Checkpoint executed successfully",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/database/query", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== "Super Admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Only Super Admin can query Central SQLite Database" });
  }
  try {
    const { sql, args } = req.body;
    if (!sql || typeof sql !== "string") {
      return res.status(400).json({ error: "Valid SQL string is required" });
    }
    const rows = await querySql(sql, args || []);
    res.json({ rows, count: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

async function startServer() {
  await initSqlite(DATA_DIR, initialData);

  try {
    const expenses = getSheetData("Expenses");
    const noteSheets = getSheetData("NoteSheets");
    for (const exp of expenses) {
      const existingNs = noteSheets.find(
        (ns: any) => ns.expenseId === exp.id || ns.id === exp.noteSheetId,
      );
      const isForm2 =
        exp.expenseType === "Quotation" && exp.quotationFormType === "Form2";
      if (!existingNs || !existingNs.isCustomEdited || isForm2) {
        await syncNoteSheetForExpense(exp, "system", true);
      }
    }

    const proposals = getSheetData("PostFactoProposals");
    for (const prop of proposals) {
      const existingNs = noteSheets.find(
        (ns: any) => ns.expenseId === prop.id || ns.id === prop.noteSheetId,
      );
      if (
        !existingNs ||
        !existingNs.isCustomEdited ||
        !existingNs.forwardingContent?.includes("watermark-container") ||
        !existingNs.forwardingContent?.includes("pad-header") ||
        !existingNs.supplyOrderContent?.includes("watermark-container") ||
        !existingNs.supplyOrderContent?.includes("শর্তাবলী") ||
        (prop.status === "Sanctioned" &&
          (!existingNs.sanctionNoteSheetContent ||
            !existingNs.sanctionLetterContent))
      ) {
        await syncNoteSheetForPostFactoProposal(prop, "system", true);
      }
    }
  } catch (_e) {
    console.warn("NoteSheet startup sync warning:", _e);
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "test"
  ) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Allocation & Expense Management Server running on port ${PORT}`,
      );
    });
  }
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  startServer();
}
function generatePostFactoSanctionLetterHtml(
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
