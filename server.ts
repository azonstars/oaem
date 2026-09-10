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
  getAllDataMap
} from "./sqlite.js";
import {
  ALLOWED_HTML_TAGS,
  ALLOWED_HTML_ATTR,
  sanitizeHtmlServer,
  AsyncMutex,
  getSheetLock,
  withSheetLock,
  convertToBengaliNumber,
  bnWords1To99,
  numberToBengaliWords,
  formatQtyWithBengaliWord,
  formatItemsListText,
  formatDateToDDMMYYYY,
  toBnDigits,
  computeExpenseAmounts,
  detectFileTypeFromMagicBytes
} from "./server/utils.js";
import {
  SheetSchemas,
  SheetUpdateSchemas,
  validateReferentialIntegrity as validateReferentialIntegritySchema,
  checkReferentialIntegrityOnDelete as checkReferentialIntegrityOnDeleteSchema
} from "./server/schemas.js";
import {
  SESSION_SECRET,
  hashPassword,
  createToken,
  verifyToken,
  requireRole,
  requireAuth
} from "./server/auth.js";

function generateQuotationBiddersTableHtml(
  expense: any,
  vatTaxMultiplier: number,
  taxVatStr: string
): { biddersHtml: string; lowestBidderName: string; totalBiddersCount: number; isMultipleItems: boolean } {
  const quotationItems = expense.quotationItems || [];
  const isMultipleItems = quotationItems.length > 1;
  const totalItemsCount = quotationItems.reduce((acc: number, item: any) => acc + Number(item.qty || 0), 0);
  const showUnitPriceCol = totalItemsCount > 1;
  const formattedItems = formatItemsListText(quotationItems);

  let biddersHtml = "";
  let lowestBidderName = expense.supplyRecipientOrgName || "";
  let totalBiddersCount = 3;

  if (isMultipleItems) {
    // --- MULTIPLE ITEMS COMPARATIVE TABLE FORMAT ---
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
        const matchingSup = (item.suppliers || []).find((s: any) => (s.nameAndAddress || "").trim() === key) 
                         || (item.suppliers || [])[info.index];
        
        const baseUnit = Number(matchingSup?.unitPrice || 0);
        const uPrice = baseUnit * vatTaxMultiplier;
        const tPrice = q * uPrice;
        
        grandTotal += tPrice;
        itemRates.push({
          unitPrice: uPrice,
          totalPrice: tPrice
        });
      });

      return {
        key,
        name: info.name,
        index: info.index,
        grandTotal,
        itemRates
      };
    });

    // Sort bidders from lowest price to highest
    biddersList.sort((a, b) => a.grandTotal - b.grandTotal);
    totalBiddersCount = biddersList.length || 3;

    if (biddersList.length > 0 && !lowestBidderName) {
      lowestBidderName = biddersList[0].name;
    }

    // Generate Multiple Items Table conforming to the uploaded layout
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
          ${biddersList.map(() => `
            <col style="width: ${rateColWidth}%;">
            <col style="width: ${rateColWidth}%;">
          `).join("")}
        </colgroup>
        <thead>
          <tr style="page-break-inside: avoid; break-inside: avoid; background-color: #f8fafc;">
            <th rowspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">ক্রম</th>
            <th rowspan="2" style="border: 1pt solid black; padding: 4pt 4pt; text-align: center; font-size: 9.5pt;">পণ্যের বিবরণ</th>
            <th rowspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">পরিমান</th>
            ${biddersList.map((b, bIdx) => `
              <th colspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-weight: bold; font-size: 9.5pt; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">
                ${b.name || `দরদাতা প্রতিষ্ঠান ${convertToBengaliNumber(bIdx + 1)}`}
              </th>
            `).join("")}
          </tr>
          <tr style="page-break-inside: avoid; break-inside: avoid; background-color: #f8fafc;">
            ${biddersList.map(() => `
              <th style="border: 1pt solid black; padding: 3pt 1.5pt; text-align: center; white-space: nowrap; font-size: 8.5pt;">একক দর</th>
              <th style="border: 1pt solid black; padding: 3pt 1.5pt; text-align: center; white-space: nowrap; font-size: 8.5pt;">মোট মূল্য</th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${quotationItems.map((item: any, iIdx: number) => {
            const sl = convertToBengaliNumber(iIdx + 1);
            let itemDesc = (item.itemDescription || item.description || "").trim();
            itemDesc = itemDesc.replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "").trim();
            if (item.model && !itemDesc.includes(item.model)) {
              itemDesc = `${itemDesc} (${item.model})`;
            } else if (item.specification && !itemDesc.includes(item.specification)) {
              itemDesc = `${itemDesc} (${item.specification})`;
            }
            const qtyStr = `${convertToBengaliNumber(item.qty || 1)} ${item.unit || "টি"}`;
            
            return `
              <tr style="page-break-inside: avoid; break-inside: avoid;">
                <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">০${sl}</td>
                <td style="border: 1pt solid black; padding: 3.5pt 4pt; font-size: 9.5pt; line-height: 1.45; word-wrap: break-word; overflow-wrap: break-word;">${itemDesc}</td>
                <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: center; font-size: 9.5pt; white-space: nowrap;">${qtyStr}</td>
                ${biddersList.map((b) => {
                  const rate = b.itemRates[iIdx];
                  const uPrc = rate ? rate.unitPrice : 0;
                  const tPrc = rate ? rate.totalPrice : 0;
                  const uStr = uPrc > 0 ? convertToBengaliNumber((uPrc % 1 === 0 ? uPrc : Math.round(uPrc)).toLocaleString('en-IN')) : "-";
                  const tStr = tPrc > 0 ? convertToBengaliNumber(Math.round(tPrc).toLocaleString('en-IN')) : "-";
                  return `
                    <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: right; font-size: 9pt; white-space: nowrap;">${uStr}</td>
                    <td style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: right; font-size: 9pt; white-space: nowrap;">${tStr}</td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("")}
          
          <!-- Grand Total Row (merged পণ্যের বিবরণ and পরিমাণ) -->
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1pt solid black; padding: 4pt 2pt;"></td>
            <td colspan="2" style="border: 1pt solid black; padding: 4pt 6pt; text-align: right; font-weight: bold; font-size: 9.5pt; word-wrap: break-word; overflow-wrap: break-word;">
              ${taxVatStr.endsWith("সহ") || taxVatStr.endsWith("ব্যতীত") ? taxVatStr : taxVatStr + " সহ"} সর্বমোট মূল্য:
            </td>
            ${biddersList.map((b) => `
              <td colspan="2" style="border: 1pt solid black; padding: 4pt 2pt; text-align: center; font-weight: bold; font-size: 9.5pt; white-space: nowrap;">
                ${convertToBengaliNumber(Math.round(b.grandTotal).toLocaleString('en-IN'))}
              </td>
            `).join("")}
          </tr>
          
          <!-- Remarks / Lowest Bidder Row (merged পণ্যের বিবরণ and পরিমাণ) -->
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1pt solid black; padding: 3.5pt 2pt;"></td>
            <td colspan="2" style="border: 1pt solid black; padding: 3.5pt 6pt; text-align: right; font-weight: bold; font-size: 9.5pt;">মন্তব্য:</td>
            ${biddersList.map((_, bIdx) => {
              let remarks = "";
              if (bIdx === 0) remarks = "সর্বনিম্ন দরদাতা";
              else if (bIdx === biddersList.length - 1) remarks = "সর্বোচ্চ দরদাতা";
              else if (bIdx === 1) remarks = "২য় সর্বোচ্চ দরদাতা";
              else remarks = `${convertToBengaliNumber(bIdx + 1)}ম দরদাতা`;
              
              return `
                <td colspan="2" style="border: 1pt solid black; padding: 3.5pt 2pt; text-align: center; font-weight: bold; font-size: 9.5pt; white-space: nowrap;">
                  ${remarks}
                </td>
              `;
            }).join("")}
          </tr>
        </tbody>
      </table>
    `;
  } else {
    // --- SINGLE ITEM FORMAT ---
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
          const tPrice = (s.totalPrice || (q * Number(s.unitPrice || 0))) * vatTaxMultiplier;
          supplierTotals[name] += tPrice;
          supplierUnitTotals[name] += uPrice;
        }
      });
    });

    const entries = Object.entries(supplierTotals);
    if (entries.length === 0) {
      const billAmount = Number(expense.grossAmount || expense.amount || 0);
      const sup1 = expense.supplyRecipientOrgName || expense.supplierOrg1 || expense.applicant?.institutionName || expense.applicant?.name || "মেসার্স জননী এজেন্সী, বনরুপা, রাঙ্গামাটি";
      const sup2 = expense.supplierOrg2 || "মেসার্স মায়ের দোয়া ট্রেডার্স, ফিসারীঘাট, রাঙ্গামাটি";
      const sup3 = expense.supplierOrg3 || "মেসার্স আজমীর কর্পোরেশন, রিজার্ভ বাজার, রাঙ্গামাটি";

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
      const minEntry = entries.reduce((min, cur) => cur[1] < min[1] ? cur : min, entries[0]);
      lowestBidderName = minEntry[0];
    }
    totalBiddersCount = entries.length || 3;

    if (entries.length > 0) {
      entries.sort((a, b) => a[1] - b[1]);
      const displayItemDesc = (formattedItems && formattedItems !== "পণ্যের বিবরণ") ? formattedItems : (expense.description || "দ্রব্যাদি / সেবা সরবরাহ");
      
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
        const unitPrc = supplierUnitTotals[name] || (totalPrc / (totalQty || 1));
        const sl = convertToBengaliNumber(idx + 1);
        const prodDesc = idx === 0 ? `<td rowspan="${entries.length}" style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: top;">${displayItemDesc}</td>` : "";
        const unitAmountStr = `= ${convertToBengaliNumber(unitPrc.toLocaleString('en-IN'))}/-`;
        const amountStr = `= ${convertToBengaliNumber(totalPrc.toLocaleString('en-IN'))}/-`;
        
        let remarks = "";
        if (idx === 0) remarks = "সর্বনিম্ন দরদাতা";
        else if (idx === entries.length - 1) remarks = "সর্বোচ্চ দরদাতা";
        else if (idx === 1) remarks = "২য় সর্বোচ্চ দরদাতা";
        else remarks = "";

        const priceStyle = idx === 0 ? "font-weight: bold;" : "font-weight: bold;";

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
  remainingBalance: number
): string {
  const budgetHeadDisplay = category?.budgetHead 
    ? convertToBengaliNumber(category.budgetHead) 
    : (category?.code ? convertToBengaliNumber(category.code) : "-");
  const fyText = financialYear ? financialYear.name : "";

  let budgetHtml = `
    <table class="budget-provision-table" style="width: 100%; border-collapse: collapse; margin-top: 14pt; margin-bottom: 12pt; font-size: inherit; page-break-inside: avoid; break-inside: avoid; border: none !important; table-layout: auto;">
      <tbody>
  `;
  
  if (balanceInfo.provisionAmount > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">প্রভিশন</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.provisionAmount.toLocaleString('en-IN'))}/-</td>
      </tr>
    `;
  }
  
  budgetHtml += `
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">${category?.name || ""} (${budgetHeadDisplay}) খাতে ${convertToBengaliNumber(fyText)} অর্থ বছরে বাজেট বরাদ্দ</td>
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.initialBudget.toLocaleString('en-IN'))}/-</td>
    </tr>
  `;
  
  if (balanceInfo.provisionAmount > 0 && balanceInfo.additionalBudget > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">মোট বরাদ্দ</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber((balanceInfo.initialBudget + balanceInfo.provisionAmount).toLocaleString('en-IN'))}/-</td>
      </tr>
    `;
  }
  
  if (balanceInfo.additionalBudget > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">অতিরিক্ত বরাদ্দ</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.additionalBudget.toLocaleString('en-IN'))}/-</td>
      </tr>
    `;
  }

  if (balanceInfo.provisionAmount > 0 || balanceInfo.additionalBudget > 0) {
    budgetHtml += `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">সর্বমোট বাজেট</td>
        <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; white-space: nowrap;">= ${convertToBengaliNumber(balanceInfo.totalAllocated.toLocaleString('en-IN'))}/-</td>
      </tr>
    `;
  }
  
  budgetHtml += `
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; padding-right: 12px; white-space: nowrap;">অত্র খরচসহ সর্বমোট খরচের পরিমাণ (${convertToBengaliNumber(previousExpense.toLocaleString('en-IN'))} + ${convertToBengaliNumber(currentBill.toLocaleString('en-IN'))})/-</td>
      <td style="border: none !important; padding: 4px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: 600; border-bottom: 1.5px solid #000 !important; white-space: nowrap;">= ${convertToBengaliNumber((previousExpense + currentBill).toLocaleString('en-IN'))}/-</td>
    </tr>
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td style="border: none !important; padding: 6px 8px; font-size: inherit; text-align: right; padding-right: 12px; font-weight: bold; white-space: nowrap;">এ খাতে অবশিষ্ট বাজেটের পরিমাণ</td>
      <td style="border: none !important; padding: 6px 8px; font-size: inherit; text-align: right; width: 1%; font-weight: bold; border-bottom: 3px double #000 !important; white-space: nowrap;">= ${convertToBengaliNumber(remainingBalance.toLocaleString('en-IN'))}/-</td>
    </tr>
  `;
  budgetHtml += `</tbody></table>`;
  return budgetHtml;
}

function getBankPadHeaderHtml(officeName?: string): string {
  const settingsList = getSheetData("Settings");
  const appSettings = (settingsList && settingsList.length > 0) ? settingsList[0] : null;
  const logoUrl = appSettings?.logoUrl;

  const logoElement = (logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "")
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
        <div style="font-size: 20pt; font-weight: bold; color: #000; line-height: 1.1;">বাংলাদেশ কৃষি ব্যাংক</div>
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
  const appSettings = (settingsList && settingsList.length > 0) ? settingsList[0] : null;
  const logoUrl = appSettings?.logoUrl;

  const logoWatermarkContent = (logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "")
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
    cat = categoriesList.find((c: any) => c.id === expense.categoryId || c.code?.toLowerCase() === expense.categoryId.toLowerCase());
  }
  if (!cat && expense?.debitAccount) {
    cat = categoriesList.find((c: any) => 
      c.id?.toLowerCase() === expense.debitAccount.toLowerCase() || 
      c.code?.toLowerCase() === expense.debitAccount.toLowerCase() ||
      c.budgetHead === expense.debitAccount ||
      c.name === expense.debitAccount
    );
  }
  if (cat && cat.budgetHead) {
    return toBnDigits(cat.budgetHead);
  }
  if (expense?.debitAccount) {
    const match = expense.debitAccount.match(/cat[-_]?([0-9]+)/i);
    if (match) {
      const c = categoriesList.find((item: any) => item.id === `cat-${match[1]}` || item.code === `CAT-${match[1]}`);
      if (c && c.budgetHead) return toBnDigits(c.budgetHead);
    }
    if (expense.debitAccount.includes("/")) {
      return toBnDigits(expense.debitAccount);
    }
  }
  if (expense?.categoryId) {
    const match = expense.categoryId.match(/cat[-_]?([0-9]+)/i);
    if (match) {
      const c = categoriesList.find((item: any) => item.id === `cat-${match[1]}` || item.code === `CAT-${match[1]}`);
      if (c && c.budgetHead) return toBnDigits(c.budgetHead);
    }
  }
  return "১৩৪/০৫";
}

function generateForm1ForwardingHtml(expense: any, office: any, category: any, financialYear: any, balanceInfo: any): string {
  const hasMusok = expense.hasStockChalan === "হ্যাঁ" || (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);

  const budgetHeadAcc = getBudgetHeadForExpense(expense, category);

  const quotationItems = expense.quotationItems || [];
  const baseAmt = Number(expense.baseAmount || quotationItems.reduce((acc: number, item: any) => acc + (Number(item.totalPrice) || (Number(item.qty || 1) * Number(item.unitPrice || 0))), 0));
  const calcVat = Number(expense.vatAmount || (baseAmt * vatRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * taxRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const netPayable = Number(expense.netPayable || (currentBill - (hasMusok ? 0 : calcVat) - calcTax));
  const amountWords = numberToBengaliWords(Math.round(currentBill));
  const netPayableWords = numberToBengaliWords(Math.round(netPayable));

  // Natural items summary for paragraph 2: e.g. "৫টি লেজার প্রিন্টার ও ৬টি ইউপিএস (1200ভিএ)"
  const itemsListForParagraph = quotationItems.map((qi: any) => {
    const q = Number(qi.qty || qi.quantity || 1);
    const u = qi.unit || "টি";
    let d = (qi.itemDescription || qi.description || qi.name || "").trim();
    d = d.replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "").trim();
    if (qi.model && !d.includes(qi.model)) {
      d = `${d} (${qi.model})`;
    }
    return `${toBnDigits(q)}${u} ${d}`;
  });
  const itemsSummaryForParagraph = itemsListForParagraph.length === 1
    ? itemsListForParagraph[0]
    : itemsListForParagraph.length === 2
    ? `${itemsListForParagraph[0]} ও ${itemsListForParagraph[1]}`
    : `${itemsListForParagraph.slice(0, -1).join(", ")} ও ${itemsListForParagraph[itemsListForParagraph.length - 1]}`;

  const formattedItems = formatItemsListText(quotationItems);

  const supplierOrgName = expense.supplyRecipientOrgName || expense.supplierOrg1 || "রূপার মেটাল ইন্ডাস্ট্রিজ লিমিটেড, প্রাণ-আর এফ এল সেন্টার, প্রগতি সরণি, মধ্য বাড্ডা, ঢাকা";
  let forwardingNo = expense.memoForwardingNo || "আঃ কাঃ (বাংলা) প্রশা-১(৪৭)/২০২৫-২০২৬/";
  forwardingNo = forwardingNo.replace(/^(সূত্র\s*নং-|নং-)\s*/, "").trim();
  const forwardingNoFormatted = toBnDigits(forwardingNo);
  
  const voucherDate = toBnDigits(formatDateToDDMMYYYY(expense.voucherDate || expense.expenseDate || "২২/০৬/২০২৬"));
  const vatChalanNo = expense.vatChalanNo && expense.vatChalanNo !== "না" ? expense.vatChalanNo : "";
  const totalVatChalanAmount = Number(expense.totalVatChalanAmount || expense.vatChalanTotal || expense.vatChalanAmount || calcVat);

  const currentBillStr = toBnDigits(currentBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const calcVatStr = toBnDigits(calcVat.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const vatChalanTotalStr = toBnDigits((totalVatChalanAmount || calcVat).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const calcTaxStr = toBnDigits(calcTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const netPayableStr = toBnDigits(netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  let paragraph2Text = `সরবরাহকারী প্রতিষ্ঠান "${supplierOrgName}" কর্তৃক অত্র অঞ্চলাধীন শাখাসমূহের জন্য ${itemsSummaryForParagraph} সরবরাহ করতঃ ৳=${currentBillStr} (${amountWords}) টাকার বিল অত্র কার্যালয়ে দাখিল করা হয়েছে।`;
  if (vatChalanNo && vatChalanNo.trim() !== "" && (hasMusok || calcVat > 0)) {
    const vatRateDisplay = vatRate > 0 ? toBnDigits(vatRate) : "১০";
    paragraph2Text += ` উক্ত বিলের ${vatRateDisplay}% ভ্যাট বাবদ ৳=${calcVatStr}, যা ${toBnDigits(vatChalanNo)} নং চালানের মাধ্যমে সরবরাহকারী প্রতিষ্ঠানের বিলের বিপরীতে পরিশোধিত সর্বমোট ভ্যাট বাবদ ৳=${vatChalanTotalStr} এর অন্তর্ভুক্ত (কপি সংযুক্ত)।`;
  }

  const vatRateDisplay = vatRate > 0 ? toBnDigits(vatRate) : "১০";
  const taxRateDisplay = taxRate > 0 ? toBnDigits(taxRate) : (expense.taxRate ? toBnDigits(expense.taxRate) : "৫");
  
  let paragraph3Text = "";
  if (calcVat > 0 && !hasMusok && (!vatChalanNo || vatChalanNo.trim() === "")) {
    paragraph3Text = `প্রাপ্ত ৳=${currentBillStr} (${amountWords}) টাকার বিল হতে ${vatRateDisplay}% ভ্যাট বাবদ ৳=${calcVatStr} এবং ${taxRateDisplay}% উৎসে কর বাবদ ৳=${calcTaxStr} কর্তন করে অবশিষ্ট ৳=${netPayableStr} (${netPayableWords}) টাকা পেমেন্ট অর্ডারের মাধ্যমে সরবরাহকারী প্রতিষ্ঠান "${supplierOrgName}" বরাবর পরিশোধের জন্য অনুরোধ করা হলো।`;
  } else {
    paragraph3Text = `প্রাপ্ত ৳=${currentBillStr} (${amountWords}) টাকার বিল হতে ${taxRateDisplay}% উৎসে কর বাবদ ৳=${calcTaxStr} কর্তন করে অবশিষ্ট ৳=${netPayableStr} (${netPayableWords}) টাকা পেমেন্ট অর্ডারের মাধ্যমে সরবরাহকারী প্রতিষ্ঠান "${supplierOrgName}" বরাবর পরিশোধের জন্য অনুরোধ করা হলো।`;
  }

  const itemsCount = quotationItems.length;

  let effectiveBranchEntries: any[] = (expense.branchEntries && Array.isArray(expense.branchEntries) && expense.branchEntries.length > 0)
    ? expense.branchEntries
    : [];

  // Calculate real items base sum
  const realItemsBaseSum = quotationItems.reduce((acc: number, item: any) => {
    return acc + (Number(item.totalPrice) || (Number(item.qty || 1) * Number(item.unitPrice || 0)) || 0);
  }, 0);

  // Calculate upper item gross amounts including VAT & Tax ensuring exact sync with branch allocations and currentBill
  const upperItemGrossAmounts: number[] = [];
  let allocatedGrossSum = 0;

  for (let i = 0; i < quotationItems.length; i++) {
    const item = quotationItems[i];
    const itemBase = Number(item.totalPrice || (Number(item.qty || 1) * Number(item.unitPrice || 0)) || 0);
    
    // Check if there are branch entries allocated for this item
    const branchEntriesForItem = effectiveBranchEntries.filter((b: any) => {
      if (b.itemIndex !== undefined && b.itemIndex !== null && b.itemIndex !== "") {
        return Number(b.itemIndex) === i;
      }
      const bDesc = (b.itemDescription || "").trim().toLowerCase();
      const iDesc = (item.itemDescription || item.description || item.name || "").trim().toLowerCase();
      const bModel = (b.model || "").trim().toLowerCase();
      const iSpec = (item.specification || item.model || "").trim().toLowerCase();
      return (bDesc && iDesc && (bDesc.includes(iDesc) || iDesc.includes(bDesc))) ||
             (bModel && iSpec && (bModel.includes(iSpec) || iSpec.includes(bModel)));
    });

    const branchSumForItem = branchEntriesForItem.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

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

  // Ensure total matches currentBill exactly
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
      { name: "বাঘাইছড়ি শাখা", code: "3507" }
    ];
    effectiveBranchEntries = quotationItems.map((item: any, idx: number) => {
      const bInfo = defaultRegionalBranches[idx % defaultRegionalBranches.length];
      const itemGross = upperItemGrossAmounts[idx] !== undefined ? upperItemGrossAmounts[idx] : Math.round(Number(item.totalPrice || 0) * (1 + (vatRate + taxRate) / 100));
      return {
        branchName: `${bInfo.name} (${bInfo.code})`,
        itemIndex: idx,
        itemDescription: item.itemDescription || item.description || item.name || "",
        qty: item.qty || item.quantity || 1,
        unit: item.unit || "টি",
        amount: itemGross,
        model: item.model || item.specification || ""
      };
    });
  }

  const creditLines = [
    { account: "৪৭ (পে-অর্ডার)", amount: netPayable, isDash: false },
    { account: `৪১/১৭১ (${vatRateDisplay}% ভ্যাট)`, amount: hasMusok ? 0 : calcVat, isDash: hasMusok },
    ...(calcTax > 0 ? [{ account: `৪১/১৭১-এ (${taxRateDisplay}% উৎসে কর)`, amount: calcTax, isDash: false }] : [])
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
      const qFormatted = formatQtyWithBengaliWord(item.qty || item.quantity || 1, item.unit || "টি");
      let d = (item.itemDescription || item.description || item.name || "").trim();
      d = d.replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "").trim();
      if (item.model && !d.includes(item.model)) {
        d = `${d} (${item.model})`;
      } else if (item.specification && !d.includes(item.specification)) {
        d = `${d} (${item.specification})`;
      }
      itemDescCell = `${qFormatted} ${d}`;
      const itemGross = upperItemGrossAmounts[i] !== undefined ? upperItemGrossAmounts[i] : (item.totalPrice || 0);
      itemPriceCell = toBnDigits(itemGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }

    let crAccountCell = "";
    let crAmountCell = "";
    if (creditLine) {
      crAccountCell = creditLine.account;
      if (creditLine.isDash) {
        crAmountCell = "-";
      } else if (creditLine.amount > 0) {
        crAmountCell = toBnDigits(creditLine.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
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

  // Main block total row
  debitCreditRowsHtml += `
    <tr>
      <td style="border: 1px solid #000; padding: 5px;"></td>
      <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle;">মোট=</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(mainDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
      <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; vertical-align: middle;"></td>
      <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(mainCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
    </tr>
  `;

  let branchDebitTotal = 0;
  effectiveBranchEntries.forEach((b: any, bIdx: number) => {
    let bAmt = Number(b.amount || 0);
    if (!bAmt || bAmt === 0) {
      const itemObj = (b.itemIndex !== undefined && quotationItems[b.itemIndex]) ? quotationItems[b.itemIndex] : (quotationItems[bIdx] || null);
      const q = Number(b.qty || b.quantity || itemObj?.qty || 1);
      const uPrice = Number(itemObj?.unitPrice || 0);
      bAmt = Math.round(uPrice * q * (1 + (vatRate + taxRate) / 100));
    }
    branchDebitTotal += bAmt;

    let branchClean = (b.branchName || "শাখা").replace(/^(1114|১১১৪)[-\s:]*/i, "").trim();
    if (!branchClean.includes("শাখা") && !branchClean.includes("অফিস") && !branchClean.includes("কার্যালয়")) {
      branchClean = `${branchClean} শাখা`;
    }
    const fullBranchColStr = `১১১৪- ${toBnDigits(branchClean)}`;

    const itemObj = (b.itemIndex !== undefined && quotationItems[b.itemIndex]) ? quotationItems[b.itemIndex] : (quotationItems[bIdx] || null);
    const q = Number(b.qty || b.quantity || itemObj?.qty || 1);
    const unit = b.unit || itemObj?.unit || "টি";
    const qFormatted = formatQtyWithBengaliWord(q, unit);

    let desc = (b.itemDescription || itemObj?.itemDescription || itemObj?.description || itemObj?.name || b.itemDesc || "").trim();
    desc = desc.replace(/^[০-৯0-9]+\s*(টি|টা|পিস|সেট|বক্স|রোল|কেজি|লিটার)?\s*/i, "").trim();
    const model = b.model || itemObj?.model || itemObj?.specification;
    if (model && !desc.includes(model)) {
      desc = `${desc} (${model})`;
    }
    const itemDescStr = `${qFormatted} ${desc}`;

    debitCreditRowsHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; font-weight: bold;">${fullBranchColStr}</td>
        <td style="border: 1px solid #000; padding: 5px; vertical-align: middle;">${itemDescStr}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; vertical-align: middle; white-space: nowrap;">${toBnDigits(bAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; font-weight: bold;">${budgetHeadAcc}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; vertical-align: middle; white-space: nowrap;">${toBnDigits(bAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
      </tr>
    `;
  });

  if (effectiveBranchEntries.length > 0) {
    debitCreditRowsHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 5px;"></td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle;">সর্বমোট=</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(branchDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; vertical-align: middle;"></td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; vertical-align: middle; white-space: nowrap;">${toBnDigits(branchDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
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
          ${expense.branchName || "রাঙ্গামাটি শাখা"}<br/>
          ${expense.branchAddress || "রাঙ্গামাটি।"}
        </div>

        <div style="font-weight: bold; margin-bottom: 12px; font-size: 11pt;">
          বিষয় :- ${formattedItems} ক্রয়ের বিল সমন্বয়/পরিশোধ প্রসঙ্গে।
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

function generateForm1SupplyOrderHtml(expense: any, office: any, category: any, financialYear: any, balanceInfo: any): string {
  const hasMusok = expense.hasStockChalan === "হ্যাঁ" || (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);

  let taxVatStr = "ভ্যাট ও ট্যাক্স";
  if (vatRate > 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাট ও ${toBnDigits(taxRate)}% ট্যাক্স`;
  } else if (vatRate > 0 && taxRate === 0) {
    taxVatStr = `${toBnDigits(vatRate)}% ভ্যাট`;
  } else if (vatRate === 0 && taxRate > 0) {
    taxVatStr = `${toBnDigits(taxRate)}% ট্যাক্স`;
  }

  const quotationItems = expense.quotationItems || [];
  const formattedItems = formatItemsListText(quotationItems);

  const supplyOrderNo = toBnDigits(expense.memoSupplyOrderNo || "সূত্র নং-প্রশ-১(৪০)/২০২৪-২০২৫/");
  const quotationDate = toBnDigits(formatDateToDDMMYYYY(expense.quotationDate || "২১/০৪/২০২৬"));

  const recipientName = expense.supplyRecipientName || "জনাব সুমন বিকাশ চাকমা";
  const recipientDesignation = expense.supplyRecipientDesignation || "সিইও";
  const recipientOrg = expense.supplyRecipientOrgName || "কম্পিউটার ভিলেজ টেকনোলজিস";
  const addr1 = expense.supplyRecipientAddress1 || "১৪ আইসিআর শপিং প্লাজা (২য় তলা),";
  const addr2 = expense.supplyRecipientAddress2 || "বনরূপা, রাঙ্গামাটি";

  const padHeader = getBankPadHeaderHtml(office?.name);
  const watermarkHtml = getBankWatermarkHtml();

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
          বিষয়ঃ- ${formattedItems} সরবরাহের আদেশ।
        </div>

        <p style="text-indent: 35px; margin-bottom: 8pt; font-size: 11pt;">
          প্রিয় মহোদয়,<br/>
          <span style="display: inline-block; width: 35px;"></span>বর্ণিত বিষয়ে আপনার দৃষ্টি আকর্ষণ করা যাচ্ছে।
        </p>

        <p style="text-indent: 35px; margin-bottom: 12pt; line-height: 1.55; font-size: 11pt;">
          ০২। অত্র অঞ্চলাধীন শাখাসমূহের জন্য ${formattedItems} সরবরাহের নিমিত্তে কোটেশন আহ্বান করা হলে আপনার প্রতিষ্ঠান কর্তৃক ${quotationDate} খ্রিঃ তারিখে দাখিলকৃত কোটেশনটি সর্বনিম্ন হিসেবে গণ্য হওয়ায় ${formattedItems} সরবরাহের প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য আপনাকে অনুরোধ করা হলো।
        </p>

        <div style="margin-bottom: 10pt; font-weight: bold; font-size: 11pt;">শর্তাবলী :</div>
        <div style="margin-top: 0; line-height: 1.7; font-size: 10.5pt;">
          <div style="display: flex;"><span style="min-width: 25px;">১।</span><span>অত্র কার্যালয় কর্তৃক সরবরাহকৃত নমুনা অনুযায়ী ${formattedItems} সরবরাহ করতে হবে।</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">২।</span><span>কার্যাদেশ প্রদানের অনধিক ৫ (পাঁচ) কার্যদিবসের মধ্যে পণ্য সরবরাহ করতে হবে।</span></div>
          <div style="display: flex;"><span style="min-width: 25px;">৩।</span><span>গুণগত মান ও যথাযথভাবে সরবরাহের পরিমাণ যাচাই করে বুঝে নেওয়ার পর বিল দাখিল সাপেক্ষে পেমেন্ট অর্ডার এর মাধ্যমে/নগদে বিল পরিশোধ করা হবে।</span></div>
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


function generateForm2NoteSheetHtml(expense: any, office: any, category: any, financialYear: any, balanceInfo: any): string {
  const hasMusok = expense.hasStockChalan === "হ্যাঁ" || (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);
  const vatTaxMultiplier = 1 + ((vatRate + taxRate) / 100);
  
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
  const baseAmt = Number(expense.baseAmount || quotationItems.reduce((acc: number, item: any) => acc + (item.totalPrice || 0), 0) || expense.amount || 0);
  const calcVat = Number(expense.vatAmount || (baseAmt * vatRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * taxRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));
  const previousExpense = Math.max(0, (balanceInfo.totalSpent + balanceInfo.totalPending) - currentBill);
  const remainingBalance = balanceInfo.totalAllocated - (previousExpense + currentBill);
  
  const amountWords = numberToBengaliWords(currentBill);
  
  // For Form-2: Collective term for stationery printing
  const itemTypeWord = "মুদ্রিত মনিহারী দ্রব্য";
  
  const { biddersHtml, lowestBidderName, totalBiddersCount } = generateQuotationBiddersTableHtml(expense, vatTaxMultiplier, taxVatStr);
  const budgetHtml = generateBudgetProvisionTableHtml(balanceInfo, category, financialYear, currentBill, previousExpense, remainingBalance);
  
  const biddersWord = totalBiddersCount === 3 ? "তিন" : (numberToBengaliWords(totalBiddersCount) || "তিন");
  const biddersCountDigits = totalBiddersCount < 10 ? `0${totalBiddersCount}` : `${totalBiddersCount}`;
  const totalBiddersStr = `${biddersCountDigits} (${biddersWord})`;
  
  const formattedAmount = convertToBengaliNumber(currentBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const applicantDesignation = expense.applicant?.designation || "শাখা প্রধান";
  const entryOfficer = expense.applicant?.name || expense.applicant?.designation || (expense.createdBy || "usr-1");

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

function generateForm1NoteSheetHtml(expense: any, office: any, category: any, financialYear: any, balanceInfo: any): string {
  const hasMusok = expense.hasStockChalan === "হ্যাঁ" || (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
  const vatRate = Number(expense.vatRate || 0);
  const taxRate = hasMusok ? 0 : Number(expense.taxRate || 0);
  const vatTaxMultiplier = 1 + ((vatRate + taxRate) / 100);

  let taxVatStr = "ভ্যাট ও ট্যাক্স ব্যতীত";
  if (vatRate > 0 && taxRate > 0) {
    taxVatStr = `${convertToBengaliNumber(vatRate)}% ভ্যাট ও ${convertToBengaliNumber(taxRate)}% ট্যাক্সসহ`;
  } else if (vatRate > 0 && taxRate === 0) {
    taxVatStr = `${convertToBengaliNumber(vatRate)}% ভ্যাটসহ`;
  } else if (vatRate === 0 && taxRate > 0) {
    taxVatStr = `${convertToBengaliNumber(taxRate)}% ট্যাক্সসহ`;
  }

  const quotationItems = expense.quotationItems || [];
  const baseAmt = Number(expense.baseAmount || quotationItems.reduce((acc: number, item: any) => acc + (item.totalPrice || 0), 0) || expense.amount || 0);
  const calcVat = Number(expense.vatAmount || (baseAmt * vatRate) / 100);
  const calcTax = Number(expense.taxAmount || (baseAmt * taxRate) / 100);
  const currentBill = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));

  const previousExpense = Math.max(0, (balanceInfo.totalSpent + balanceInfo.totalPending) - currentBill);
  const remainingBalance = balanceInfo.totalAllocated - (previousExpense + currentBill);
  
  const amountWords = numberToBengaliWords(currentBill);
  const formattedItems = formatItemsListText(quotationItems);

  const { biddersHtml, lowestBidderName, totalBiddersCount, isMultipleItems } = generateQuotationBiddersTableHtml(expense, vatTaxMultiplier, taxVatStr);
  const budgetHtml = generateBudgetProvisionTableHtml(balanceInfo, category, financialYear, currentBill, previousExpense, remainingBalance);

  const itemTextPhrase = isMultipleItems ? "উক্ত পণ্য সমূহ" : "উক্ত পণ্যটি";
  const descTextPhrase = isMultipleItems ? "বর্ণিত পণ্য সমূহ" : "বর্ণিত পণ্যটি";

  const hasBranchEntries = expense.branchEntries && Array.isArray(expense.branchEntries) && expense.branchEntries.length > 0;
  const targetOfficeForText = hasBranchEntries 
    ? "অত্র অঞ্চলাধীন শাখাসমূহের জন্য" 
    : `${office?.name || "আঞ্চলিক কার্যালয়, রাঙ্গামাটি"} এর জন্য`;

  const formattedAmount = convertToBengaliNumber(currentBill.toLocaleString('en-IN'));
  const applicantDesignation = expense.applicant?.designation || "শাখা প্রধান";
  const entryOfficer = expense.applicant?.name || expense.applicant?.designation || (expense.createdBy || "usr-1");

  return `
    <div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
      <div style="font-weight: bold; margin-bottom: 20pt; text-align: center;">
        বিষয়ঃ- ${targetOfficeForText} ${formattedItems} ক্রয়ের বিল প্রদান প্রসঙ্গে।
      </div>
      
      <p style="text-indent: 40px; margin-bottom: 10pt;">
        ${targetOfficeForText} ${formattedItems} ক্রয়ের নিমিত্তে স্থানীয় ভাবে ${convertToBengaliNumber(totalBiddersCount)} টি প্রতিষ্ঠানের দরপত্র সংগ্রহ করতঃ সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র মূল্যে ${itemTextPhrase} ক্রয় করা হয়।
      </p>
      
      <p style="margin-bottom: 5pt; font-weight: bold; text-decoration: underline;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>
      
      ${biddersHtml}
      
      <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 15pt;">
        উক্ত ${convertToBengaliNumber(totalBiddersCount)} টি দরপত্র এর মধ্যে '${lowestBidderName}' কর্তৃক ${formattedItems} ক্রয় বাবদ ${taxVatStr} সর্বনিম্ন দর ৮= ${formattedAmount}/- (${amountWords}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে ${descTextPhrase} ক্রয় করা হয়।
      </p>
      
      <p style="text-indent: 40px; margin-bottom: 25pt;">
        এমতাবস্থায়, ${targetOfficeForText} ${formattedItems} ক্রয় বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র খরচের বিষয়টি ${applicantDesignation}, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, ${office?.name || ""} এর আর্থিক সম্মতি গ্রহণপূর্বক ${taxVatStr} সর্বমোট ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিলের অর্থ প্রদানের অনুমোদন দেয়া যেতে পারে।
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
          <strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> ${targetOfficeForText} ${formattedItems} ক্রয় বাবদ ${taxVatStr} ৮= ${formattedAmount}/- (${amountWords}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Data storage path
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function addAuditLog(userId: string, action: string, tableName: string, recordId: string, details: string): Promise<void> {
  const auditLogs = getSheetData("AuditLogs");
  const prevLog = auditLogs.length > 0 ? auditLogs[0] : null;
  const prevHash = prevLog 
    ? crypto.createHash('sha256').update(JSON.stringify(prevLog)).digest('hex') 
    : "0".repeat(64);

  const newLog = {
    id: `al-${Date.now()}`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    userId,
    action,
    tableName,
    recordId,
    details,
    prevHash
  };
  auditLogs.unshift(newLog);
  await saveSheetData("AuditLogs", auditLogs);
}

export function getAvailableBalance(financialYearId: string, officeId: string, categoryId: string) {
  const allocations = getSheetData("Allocations");
  const expenses = getSheetData("Expenses");

  const categoryAllocations = allocations.filter(
    (a: any) => a.financialYearId === financialYearId && a.officeId === officeId && a.categoryId === categoryId
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
    (e: any) => e.financialYearId === financialYearId && e.officeId === officeId && e.categoryId === categoryId
  );

  let totalSpent = 0;
  let totalPending = 0;

  categoryExpenses.forEach((e: any) => {
    const computed = computeExpenseAmounts(e.amount, e.vatRate, e.taxRate);
    const gross = Number(computed.grossAmount || 0);
    if (e.status === "Pending") {
      totalPending += gross;
    } else if (e.status === "Rejected") {
      // Rejected expenses do not deduct from spent or pending
    } else {
      // Approved or default legacy expenses
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
    availableBalance: available
  };
}

// Initial mock data setup for the required sheets
const initialData: Record<string, any[]> = {
  "NoteTemplates": [
    {
      "id": "tpl-form1-quotation",
      "title": "ফর্ম-১: দরপত্র ও কোটেশন ক্রয় অনুমোদন নোটশীট (কাস্টম টেমপ্লেট)",
      "categoryId": "all",
      "bodyTemplate": `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
  <div style="font-weight: bold; margin-bottom: 20pt; text-align: center;">
    বিষয়ঃ- {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} ক্রয়ের বিল প্রদান প্রসঙ্গে।
  </div>
  
  <p style="text-indent: 40px; margin-bottom: 10pt;">
    {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} ক্রয়ের নিমিত্তে স্থানীয় ভাবে {{TOTAL_BIDDERS_COUNT}} টি প্রতিষ্ঠানের দরপত্র সংগ্রহ করতঃ সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে {{TAX_VAT_TEXT}} ৮= {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র মূল্যে {{ITEM_TEXT_PHRASE}} ক্রয় করা হয়।
  </p>
  
  <p style="margin-bottom: 5pt; font-weight: bold; text-decoration: underline;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>
  
  {{QUOTATION_TABLE}}
  
  <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 15pt;">
    উক্ত {{TOTAL_BIDDERS_COUNT}} টি দরপত্র এর মধ্যে '{{LOWEST_BIDDER_NAME}}' কর্তৃক {{ITEMS_DESCRIPTION}} ক্রয় বাবদ {{TAX_VAT_TEXT}} সর্বনিম্ন দর ৮= {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে {{DESC_TEXT_PHRASE}} ক্রয় করা হয়।
  </p>
  
  <p style="text-indent: 40px; margin-bottom: 25pt;">
    এমতাবস্থায়, {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} ক্রয় বাবদ {{TAX_VAT_TEXT}} ৮= {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র খরচের বিষয়টি {{APPLICANT_DESIGNATION}}, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} এর আর্থিক সম্মতি গ্রহণপূর্বক {{TAX_VAT_TEXT}} সর্বমোট ৮= {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র বিলের অর্থ প্রদানের অনুমোদন দেয়া যেতে পারে।
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
  
  <div class="form1-approval-chain" style="margin-top: 25pt; line-height: 1.6;">
    <div style="margin-bottom: 56pt;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহনের নিমিত্তে নথি আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} বরাবরে প্রেরণ করুন।</div>
    <div style="margin-bottom: 56pt;"><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> {{OFFICE_NAME}} এর জন্য {{ITEMS_DESCRIPTION}} ক্রয় বাবদ {{TAX_VAT_TEXT}} ৮= {{CURRENT_EXPENSE}}/- ({{AMOUNT_IN_WORDS}}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</div>
    <div style="margin-bottom: 45pt;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>
</div>`,
      "userId": "usr-1"
    },
    {
      "id": "tpl-form2-quotation",
      "title": "ফর্ম-২: মুদ্রিত মনিহারী দ্রব্য মুদ্রণ দরপত্র তুলনামূলক বিবরণী ও নোটশীট (কাস্টম টেমপ্লেট)",
      "categoryId": "cat-2",
      "bodyTemplate": `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
  <div style="font-weight: bold; margin-bottom: 20pt; text-align: center; font-size: 16px;">
    বিষয়ঃ অঞ্চলাধীন শাখা সমূহের জন্য মুদ্রিত মনিহারী দ্রব্য মুদ্রণের বিল প্রদান প্রসঙ্গে ।
  </div>
  
  <p style="text-indent: 40px; margin-bottom: 10pt;">
    অত্র অঞ্চলাধীন শাখা সমূহের চাহিদা পূরণের নিমিত্তে নিম্নোক্ত {{ITEMS_COUNT}} টি আইটেমের মুদ্রিত মনিহারী দ্রব্য অফ-দ্যা-সেল্ফ ক্রয় প্রক্রিয়ায় মুদ্রণের লক্ষ্যে স্থানীয় মুদ্রিত মনিহারী দ্রব্য সরবরাহকারী প্রতিষ্ঠান হতে কোটেশন চাওয়া হয় । নিম্ন বর্ণিতভাবে প্রাপ্ত {{TOTAL_BIDDERS_COUNT}} টি প্রতিষ্ঠানের দরপত্র সমূহ যাচাই করত: সর্বনিম্ন দরদাতা প্রতিষ্ঠান হতে {{TAX_VAT_TEXT}} সর্বমোট ৳={{CURRENT_EXPENSE}} ({{AMOUNT_IN_WORDS}}) টাকা মাত্র মূল্যে উক্ত দ্রব্যাদি মুদ্রণ করা হয় ।
  </p>
  
  <p style="margin-bottom: 5pt; font-weight: bold; text-decoration: underline;">প্রাপ্ত দরপত্র সমূহের বিবরণ নিম্নরূপ :-</p>
  
  {{QUOTATION_TABLE}}
  
  <p style="text-indent: 40px; margin-top: 15pt; margin-bottom: 15pt;">
    উক্ত {{TOTAL_BIDDERS_COUNT}} টি দরপত্র এর মধ্যে '{{LOWEST_BIDDER_NAME}}' কর্তৃক মুদ্রিত মনিহারী দ্রব্য মুদ্রণ বাবদ {{TAX_VAT_TEXT}} সর্বনিম্ন দর ৳={{CURRENT_EXPENSE}} ({{AMOUNT_IN_WORDS}}) টাকা প্রদান করায় উক্ত প্রতিষ্ঠান হতে উক্ত দ্রব্যাদি মুদ্রণ করা হয়।
  </p>
  
  <p style="text-indent: 40px; margin-bottom: 25pt;">
    এমতাবস্থায়, অত্র অঞ্চলাধীন শাখা সমূহের জন্য মুদ্রিত মনিহারী দ্রব্য মুদ্রণ বাবদ {{TAX_VAT_TEXT}} ৳={{CURRENT_EXPENSE}} ({{AMOUNT_IN_WORDS}}) টাকা মাত্র খরচের বিষয়টি {{APPLICANT_DESIGNATION}}, আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} এর আর্থিক সম্মতি গ্রহণপূর্বক {{TAX_VAT_TEXT}} সর্বমোট ৳={{CURRENT_EXPENSE}} ({{AMOUNT_IN_WORDS}}) টাকা মাত্র বিলের অর্থ প্রদানের অনুমোদন দেয়া যেতে পারে।
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
  
  <div class="form1-approval-chain" style="margin-top: 25pt; line-height: 1.6;">
    <div style="margin-bottom: 56pt;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> আর্থিক সম্মতি গ্রহনের নিমিত্তে নথি আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} বরাবরে প্রেরণ করুন।</div>
    <div style="margin-bottom: 56pt;"><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> অত্র অঞ্চলাধীন শাখা সমূহের জন্য মুদ্রিত মনিহারী দ্রব্য মুদ্রণ বাবদ {{TAX_VAT_TEXT}} সর্বমোট ৳={{CURRENT_EXPENSE}} ({{AMOUNT_IN_WORDS}}) টাকা মাত্র বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</div>
    <div style="margin-bottom: 45pt;"><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>
</div>`,
      "userId": "usr-1"
    }
  ],
  "OpeningBalances": [],
  "AuditLogs": []
};

// Load data from SQLite (with fast in-memory cache)
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
        // Backup SQLite database file
        const sqliteFile = path.join(DATA_DIR, "database.sqlite");
        if (fs.existsSync(sqliteFile)) {
          try {
            fs.copyFileSync(sqliteFile, path.join(todayBackupDir, "database.sqlite"));
          } catch (e) {
            console.error(`Backup copy error for database.sqlite:`, e);
          }
        }
        // Also copy json snapshots
        const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
        for (const f of files) {
          const src = path.join(DATA_DIR, f);
          const dest = path.join(todayBackupDir, f);
          try {
            fs.copyFileSync(src, dest);
          } catch (e) {
            console.error(`Backup copy error for ${f}:`, e);
          }
        }
      }
    }

    lastBackupDate = today;

    // Cleanup backups older than retention period (default 30 days, or BACKUP_RETENTION_DAYS env)
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10) || 30;
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
            console.log(`[Backup Clean] Removed backup folder older than ${retentionDays} days: ${folder}`);
          } catch (cleanErr) {
            console.error(`Failed to delete old backup folder ${folder}:`, cleanErr);
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

  // Persist directly to SQLite database
  await saveDbSheetData(sheetName, data);

  // Mirror JSON file for export and file-level inspection
  try {
    const filePath = path.join(DATA_DIR, `${sheetName}.json`);
    const tmpPath = path.join(DATA_DIR, `${sheetName}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`);
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    console.warn(`[JSON Mirror warning on ${sheetName}]:`, e);
  }
}

function renderExpenseNoteSheetContent(
  expense: any,
  office: any,
  category: any,
  financialYear: any,
  balanceInfo: any,
  template?: any
): string {
  if (expense.expenseType === "Quotation" && expense.quotationFormType === "Form2") {
    return generateForm2NoteSheetHtml(expense, office, category, financialYear, balanceInfo);
  }
  if (expense.expenseType === "Quotation" && expense.quotationFormType === "Form1") {
    if (!template || template.id === "tpl-form1-quotation" || !template.bodyTemplate) {
      return generateForm1NoteSheetHtml(expense, office, category, financialYear, balanceInfo);
    }
  }

  // If no template is provided, select an appropriate default
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
</div>`
    };
    return renderExpenseNoteSheetContent(expense, office, category, financialYear, balanceInfo, defaultTemplate);
  }

  if (template && template.bodyTemplate) {
    let content = template.bodyTemplate;
    
    const hasMusok = expense.hasStockChalan === "হ্যাঁ" || (Number(expense.taxRate) === 0 && expense.hasStockChalan !== "না");
    const vRate = Number(expense.vatRate || 0);
    const tRate = hasMusok ? 0 : Number(expense.taxRate || 0);
    const vatTaxMultiplier = 1 + ((vRate + tRate) / 100);

    const vatWord = "ভ্যাট";
    const taxWord = "ট্যাক্স";
    const vatText = vRate > 0 ? `${convertToBengaliNumber(vRate)}% ভ্যাট` : "ভ্যাট";
    const taxText = tRate > 0 ? `${convertToBengaliNumber(tRate)}% ট্যাক্স` : "ট্যাক্স";

    let tvText = "ভ্যাট ও ট্যাক্স ব্যতীত";
    if (vRate > 0 && tRate > 0) {
      tvText = `${convertToBengaliNumber(vRate)}% ভ্যাট ও ${convertToBengaliNumber(tRate)}% ট্যাক্সসহ`;
    } else if (vRate > 0 && tRate === 0) {
      tvText = `${convertToBengaliNumber(vRate)}% ভ্যাটসহ`;
    } else if (vRate === 0 && tRate > 0) {
      tvText = `${convertToBengaliNumber(tRate)}% ট্যাক্সসহ`;
    }

    const quotationItems = expense.quotationItems || [];
    const baseAmt = Number(expense.baseAmount || quotationItems.reduce((acc: number, item: any) => acc + (item.totalPrice || 0), 0) || expense.amount || 0);
    const calcVat = Number(expense.vatAmount || (baseAmt * vRate) / 100);
    const calcTax = Number(expense.taxAmount || (baseAmt * tRate) / 100);
    const currentBillAmount = Number(expense.grossAmount || expense.amount || (baseAmt + calcVat + calcTax));

    const spentSoFar = (balanceInfo.totalSpent + balanceInfo.totalPending) - currentBillAmount;
    const safeSpentSoFar = Math.max(0, spentSoFar);
    const spentIncludingCurrent = safeSpentSoFar + currentBillAmount;
    const remainingBalance = balanceInfo.totalAllocated - spentIncludingCurrent;
    const amountWords = numberToBengaliWords(currentBillAmount);
    const amountBn = convertToBengaliNumber(currentBillAmount.toLocaleString('en-IN'));
    const amountWithSlash = `${amountBn}/-`;
    const amountWithWords = `${amountWithSlash} (${amountWords})`;

    const itemsText = formatItemsListText(quotationItems);
    content = content.replace(/{{ITEMS_DESCRIPTION}}/g, itemsText || expense.description || '');
    content = content.replace(/{{ITEMS_LIST}}/g, itemsText || expense.description || '');
    content = content.replace(/{{QUANTITY_AND_ITEMS}}/g, itemsText || expense.description || '');
    content = content.replace(/{{EXPENSE_ITEM}}/g, itemsText || expense.description || '');

    // Form-1 & Universal Dynamic Tables and Text Phrases
    const { biddersHtml, lowestBidderName, totalBiddersCount, isMultipleItems } = generateQuotationBiddersTableHtml(expense, vatTaxMultiplier, tvText);
    const budgetHtml = generateBudgetProvisionTableHtml(balanceInfo, category, financialYear, currentBillAmount, safeSpentSoFar, remainingBalance);

    // Conditional Approval Logic for Regular Expense Note Sheets:
    // 1. ভ্যাট ও ট্যাক্স সহ মোট বিল 1500/- টাকার মধ্যে হলে বাজেট টেবিলের নিচের আঞ্চলিক ব্যবস্থাপক, 
    //    আঞ্চলিক নিরীক্ষা কর্মকর্তা ও আঞ্চলিক ব্যবস্থাপক অনুমোদনের প্যারাগুলো থাকবে না।
    // 2. যদি ভ্যাট ও ট্যাক্স সহ মোট বিল 1500 টাকার অধিক হয় তাহলে সেগুলো প্রদর্শিত হবে।
    const isRegularExpense = (template?.id === "tpl-regular-expense" || template?.id === "tpl-default-regular" || expense.expenseType !== "Quotation");
    const isBillUnder1500 = isRegularExpense && currentBillAmount <= 1500;

    const auditApprovalHtml = `<div class="audit-approval-section" style="margin-top: 20pt; display: flex; flex-direction: column; gap: 20pt;">
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা খরচের আর্থিক সম্মতির গ্রহনের জন্য আঞ্চলিক নিরীক্ষা কর্মকর্তা, আঞ্চলিক নিরীক্ষা কার্যালয়, {{OFFICE_NAME}} বরাবরে নথি প্রেরণ করুন।</div>
    <div><strong>আঞ্চলিক নিরীক্ষা কর্মকর্তা :-</strong> {{OFFICE_NAME}} এর জন্য {{DESCRIPTION}} বাবদ {{VAT_TEXT}} ও {{TAX_TEXT}}সহ সর্বমোট ৳={{AMOUNT_WITH_WORDS}} টাকা বিল প্রদানের নিমিত্তে খরচের আর্থিক সম্মতি দেয়া হলো।</div>
    <div><strong>আঞ্চলিক ব্যবস্থাপক :-</strong> অনুমোদিত।</div>
  </div>`;

    if (isBillUnder1500) {
      // 1. Clear any placeholders
      content = content.replace(/{{AUDIT_APPROVAL_SECTION}}/g, '');
      content = content.replace(/{{AUDIT_APPROVAL_PARAGRAPHS}}/g, '');

      // 2. Strip existing approval blocks/paragraphs from template content
      content = content.replace(/<div[^>]*class="[^"]*audit-approval-section[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, '');
      content = content.replace(/<div[^>]*id="audit-approval-section"[\s\S]*?<\/div>\s*<\/div>/gi, '');
      content = content.replace(/<div[^>]*style="[^"]*(?:flex-direction:\s*column|gap:\s*2[04]pt)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, '');
      content = content.replace(/<div[^>]*>[\s\S]*?<strong>\s*আঞ্চলিক ব্যবস্থাপক\s*:-[\s\S]*?আঞ্চলিক নিরীক্ষা কর্মকর্তা[\s\S]*?অনুমোদিত[\s\S]*?<\/div>\s*<\/div>/gi, '');
      content = content.replace(/<(?:div|p)[^>]*>[\s\S]*?আঞ্চলিক ব্যবস্থাপক\s*:-[\s\S]*?আঞ্চলিক নিরীক্ষা কর্মকর্তা[\s\S]*?<\/(?:div|p)>/gi, '');
      content = content.replace(/<(?:div|p)[^>]*>[\s\S]*?আঞ্চলিক নিরীক্ষা কর্মকর্তা\s*:-[\s\S]*?<\/(?:div|p)>/gi, '');
      content = content.replace(/<(?:div|p)[^>]*>[\s\S]*?আঞ্চলিক ব্যবস্থাপক\s*:-[\s\S]*?অনুমোদিত[\s\S]*?<\/(?:div|p)>/gi, '');
    } else {
      // If bill > 1500: Include approval section
      if (content.includes("{{AUDIT_APPROVAL_SECTION}}") || content.includes("{{AUDIT_APPROVAL_PARAGRAPHS}}")) {
        content = content.replace(/{{AUDIT_APPROVAL_SECTION}}/g, auditApprovalHtml);
        content = content.replace(/{{AUDIT_APPROVAL_PARAGRAPHS}}/g, auditApprovalHtml);
      } else if (!content.includes("আঞ্চলিক নিরীক্ষা কর্মকর্তা") && (template.id === "tpl-regular-expense" || template.id === "tpl-default-regular" || expense.expenseType !== "Quotation")) {
        content += "\n\n" + auditApprovalHtml;
      }
    }

    // 3. Signature Layout Logic for Regular Expense Note Sheets:
    // শুধুমাত্র নিয়মিত ব্যয় বিল পরিশোধ নোটশিটে 1500 টাকার মধ্যে বিলগুলোতে ডানপাশে প্রস্তুতকারী কর্মকর্তা এবং বামপাশে আঞ্চলিক ব্যবস্থাপক একলাইনে থাকবে।
    
    const singleLineDualSigHtml = `<div class="regular-signatures-single-line" style="margin-top: 25pt; margin-bottom: 0pt; display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
    <div style="text-align: center; min-width: 170pt; display: inline-block;">
      <div style="height: 35pt;"></div>
      <div style="border-top: 1pt solid #000; padding-top: 3pt; font-weight: bold;">
        আঞ্চলিক ব্যবস্থাপক
      </div>
      <div style="font-size: 0.85em; color: #444;">
        বাংলাদেশ কৃষি ব্যাংক
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
        // Replace right-only signature block with single-line dual signature block (RM on left, Entry Officer on right)
        const rightSigPattern = /<div[^>]*style="[^"]*justify-content:\s*flex-end[^"]*"[\s\S]*?প্রস্তুতকারী কর্মকর্তা[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
        if (rightSigPattern.test(content)) {
          content = content.replace(rightSigPattern, singleLineDualSigHtml);
        } else if (!content.includes("regular-signatures-single-line")) {
          content += "\n\n" + singleLineDualSigHtml;
        }
      } else {
        // Bill > 1500: Revert to standard right-aligned signature before approval paragraphs
        if (content.includes("regular-signatures-single-line")) {
          content = content.replace(/<div[^>]*class="[^"]*regular-signatures-single-line[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, standardRightOnlySigHtml);
        }
      }
    }

    const itemTextPhrase = isMultipleItems ? "উক্ত পণ্য সমূহ" : "উক্ত পণ্যটি";
    const descTextPhrase = isMultipleItems ? "বর্ণিত পণ্য সমূহ" : "বর্ণিত পণ্যটি";

    content = content.replace(/{{QUOTATION_TABLE}}/g, biddersHtml);
    content = content.replace(/{{BUDGET_TABLE}}/g, budgetHtml);
    content = content.replace(/{{PROVISION_TABLE}}/g, budgetHtml);
    content = content.replace(/{{BUDGET_PROVISION_TABLE}}/g, budgetHtml);
    content = content.replace(/{{TOTAL_BIDDERS_COUNT}}/g, convertToBengaliNumber(totalBiddersCount));
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

    // Labels and rates
    content = content.replace(/{{VAT_LABEL}}/g, vatWord);
    content = content.replace(/{{VAT_WORD}}/g, vatWord);
    content = content.replace(/{{TAX_LABEL}}/g, taxWord);
    content = content.replace(/{{TAX_WORD}}/g, taxWord);
    content = content.replace(/{{VAT_TEXT}}/g, vatText);
    content = content.replace(/{{TAX_TEXT}}/g, taxText);
    content = content.replace(/{{VAT_RATE_TEXT}}/g, vatText);
    content = content.replace(/{{TAX_RATE_TEXT}}/g, taxText);
    content = content.replace(/{{TAX_VAT_TEXT}}/g, tvText);
    content = content.replace(/{{VAT_RATE_PERCENT}}/g, `${convertToBengaliNumber(vRate)}%`);
    content = content.replace(/{{TAX_RATE_PERCENT}}/g, `${convertToBengaliNumber(tRate)}%`);
    content = content.replace(/{{VAT_RATE}}/g, convertToBengaliNumber(vRate));
    content = content.replace(/{{TAX_RATE}}/g, convertToBengaliNumber(tRate));
    content = content.replace(/{{VAT_AMOUNT}}/g, `${convertToBengaliNumber(calcVat.toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{TAX_AMOUNT}}/g, `${convertToBengaliNumber(calcTax.toLocaleString('en-IN'))}/-`);

    // Page Number
    const pageNoStr = expense.pageNo ? convertToBengaliNumber(expense.pageNo) : '৪১৯';
    content = content.replace(/{{PAGE_NO}}/g, pageNoStr);
    content = content.replace(/{{NOTE_PAGE_NO}}/g, pageNoStr);

    const hasBranchEntries = expense.branchEntries && Array.isArray(expense.branchEntries) && expense.branchEntries.length > 0;
    const targetOfficeForText = hasBranchEntries 
      ? "অত্র অঞ্চলাধীন শাখাসমূহের জন্য" 
      : (office?.name ? `${office.name} এর জন্য` : "আঞ্চলিক কার্যালয়, রাঙ্গামাটি এর জন্য");

    content = content.replace(/{{FOR_OFFICE_OR_BRANCHES}}/g, targetOfficeForText);
    content = content.replace(/{{OFFICE_TARGET_TEXT}}/g, targetOfficeForText);
    
    if (hasBranchEntries) {
      content = content.replace(/{{OFFICE_NAME}}\s*এর জন্য/g, "অত্র অঞ্চলাধীন শাখাসমূহের জন্য");
      content = content.replace(/আঞ্চলিক কার্যালয়[^\s,।]*\s*(?:,\s*[^\s,।]+)?\s*এর জন্য/g, "অত্র অঞ্চলাধীন শাখাসমূহের জন্য");
      content = content.replace(/আঞ্চলিক কার্যালয়ের জন্য/g, "অত্র অঞ্চলাধীন শাখাসমূহের জন্য");
    }

    content = content.replace(/{{OFFICE_NAME}}/g, office ? office.name : '');
    content = content.replace(/আঞ্চলিক নিরীক্ষা কার্যালয়,\s*আঞ্চলিক কার্যালয়,/g, "আঞ্চলিক নিরীক্ষা কার্যালয়,");
    content = content.replace(/{{FINANCIAL_YEAR}}/g, financialYear ? financialYear.name : '');
    content = content.replace(/{{CATEGORY}}/g, category ? category.name : '');
    content = content.replace(/{{CATEGORY_NAME}}/g, category ? category.name : '');
    content = content.replace(/{{BUDGET_HEAD}}/g, category ? (category.budgetHead || category.code || '') : '');
    content = content.replace(/{{CATEGORY_BUDGET_HEAD}}/g, category ? (category.budgetHead || category.code || '') : '');
    content = content.replace(/{{CATEGORY_CODE}}/g, category ? (category.code || '') : '');
    content = content.replace(/{{EXPENSE_DATE}}/g, expense.expenseDate ? convertToBengaliNumber(formatDateToDDMMYYYY(expense.expenseDate)) : '');
    content = content.replace(/{{VOUCHER_DATE}}/g, expense.voucherDate ? convertToBengaliNumber(formatDateToDDMMYYYY(expense.voucherDate)) : '');
    content = content.replace(/{{BASE_AMOUNT}}/g, `${convertToBengaliNumber(baseAmt.toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{NET_PAYABLE}}/g, `${convertToBengaliNumber(Number(expense.netPayable || expense.amount || currentBillAmount).toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{GROSS_AMOUNT}}/g, amountWithSlash);
    content = content.replace(/{{DESCRIPTION}}/g, expense.description || '');
    content = content.replace(/{{EXPENSE_DESCRIPTION}}/g, expense.description || '');
    content = content.replace(/{{PURPOSE}}/g, expense.description || '');
    content = content.replace(/{{EXPENSE_TITLE}}/g, expense.description || '');
    content = content.replace(/{{REMARKS}}/g, expense.remarks || '');
    
    // Officers & Applicants
    const applicantName = expense.applicant?.name || expense.payeeName || '';
    const applicantDesig = expense.applicant?.designation || '';
    content = content.replace(/{{APPLICANT_NAME}}/g, applicantName);
    content = content.replace(/{{PAYEE_NAME}}/g, applicantName);
    content = content.replace(/{{EMPLOYEE_NAME}}/g, applicantName);
    content = content.replace(/{{APPLICANT_DESIGNATION_WITH_COMMA}}/g, applicantDesig ? `${applicantDesig},` : '');
    content = content.replace(/{{APPLICANT_DESIGNATION}}/g, applicantDesig);
    content = content.replace(/{{DESIGNATION}}/g, applicantDesig);
    content = content.replace(/{{EMPLOYEE_DESIGNATION}}/g, applicantDesig);
    content = content.replace(/{{APPLICANT_INSTITUTION}}/g, expense.applicant?.institutionName || '');
    content = content.replace(/{{APPLICANT_OFFICE_ID}}/g, expense.applicant?.officeId || '');
    content = content.replace(/{{VOUCHER_NO}}/g, expense.voucherNo ? convertToBengaliNumber(expense.voucherNo) : '');
    
    const entryOfficerDisplay = expense.entryOfficer?.name 
      ? `${expense.entryOfficer.name} (${expense.entryOfficer.designation || 'কর্মকর্তা'})`
      : (expense.applicant?.name ? `${expense.applicant.name} (${expense.applicant?.designation || 'কর্মকর্তা'})` : "মো: স্বপ্নীল দেওয়ান (কর্মকর্তা)");
    content = content.replace(/{{ENTRY_OFFICER}}/g, entryOfficerDisplay);
    content = content.replace(/{{DEBIT_ACCOUNT}}/g, expense.debitAccount || '');
    content = content.replace(/{{PAYMENT_TYPE}}/g, expense.paymentType || 'নগদে');
    content = content.replace(/{{MEMO_SUPPLY_ORDER_NO}}/g, expense.memoSupplyOrderNo || '');
    content = content.replace(/{{MEMO_FORWARDING_NO}}/g, expense.memoForwardingNo || '');
    content = content.replace(/{{QUOTATION_DATE}}/g, expense.quotationDate ? convertToBengaliNumber(formatDateToDDMMYYYY(expense.quotationDate)) : '');
    content = content.replace(/{{SUPPLY_RECIPIENT_NAME}}/g, expense.supplyRecipientName || '');
    content = content.replace(/{{SUPPLY_RECIPIENT_DESIGNATION}}/g, expense.supplyRecipientDesignation || '');
    content = content.replace(/{{SUPPLY_RECIPIENT_ORG_NAME}}/g, expense.supplyRecipientOrgName || '');
    content = content.replace(/{{SUPPLY_RECIPIENT_ADDRESS_1}}/g, expense.supplyRecipientAddress1 || '');
    content = content.replace(/{{SUPPLY_RECIPIENT_ADDRESS_2}}/g, expense.supplyRecipientAddress2 || '');
    content = content.replace(/{{SUPPLIER_ORG_1}}/g, expense.supplierOrg1 || '');
    content = content.replace(/{{SUPPLIER_ORG_2}}/g, expense.supplierOrg2 || '');
    content = content.replace(/{{SUPPLIER_ORG_3}}/g, expense.supplierOrg3 || '');

    // Supplier specific replacements
    let sup1UnitPrice = 0, sup1TotalPrice = 0;
    let sup2UnitPrice = 0, sup2TotalPrice = 0;
    let sup3UnitPrice = 0, sup3TotalPrice = 0;

    if (expense.quotationItems && expense.quotationItems.length > 0) {
      expense.quotationItems.forEach((item: any) => {
        sup1TotalPrice += Number(item.suppliers?.[0]?.totalPrice || 0);
        sup2TotalPrice += Number(item.suppliers?.[1]?.totalPrice || 0);
        sup3TotalPrice += Number(item.suppliers?.[2]?.totalPrice || 0);
      });
      sup1UnitPrice = Number(expense.quotationItems[0]?.suppliers?.[0]?.unitPrice || 0);
      sup2UnitPrice = Number(expense.quotationItems[0]?.suppliers?.[1]?.unitPrice || 0);
      sup3UnitPrice = Number(expense.quotationItems[0]?.suppliers?.[2]?.unitPrice || 0);
    } else {
      sup1UnitPrice = currentBillAmount;
      sup1TotalPrice = currentBillAmount;
      sup2UnitPrice = Math.round(currentBillAmount * 1.048);
      sup2TotalPrice = sup2UnitPrice;
      sup3UnitPrice = Math.round(currentBillAmount * 1.115);
      sup3TotalPrice = sup3UnitPrice;
    }

    content = content.replace(/{{SUPPLIER_1_UNIT_PRICE}}/g, convertToBengaliNumber(sup1UnitPrice.toLocaleString('en-IN')));
    content = content.replace(/{{SUPPLIER_1_TOTAL_PRICE}}/g, convertToBengaliNumber(sup1TotalPrice.toLocaleString('en-IN')));
    content = content.replace(/{{SUPPLIER_2_UNIT_PRICE}}/g, convertToBengaliNumber(sup2UnitPrice.toLocaleString('en-IN')));
    content = content.replace(/{{SUPPLIER_2_TOTAL_PRICE}}/g, convertToBengaliNumber(sup2TotalPrice.toLocaleString('en-IN')));
    content = content.replace(/{{SUPPLIER_3_UNIT_PRICE}}/g, convertToBengaliNumber(sup3UnitPrice.toLocaleString('en-IN')));
    content = content.replace(/{{SUPPLIER_3_TOTAL_PRICE}}/g, convertToBengaliNumber(sup3TotalPrice.toLocaleString('en-IN')));

    // Smart row removal for 0 values before replacing
    if (balanceInfo.provisionAmount === 0) {
      content = content.replace(/<tr[^>]*>[\s\S]*?{{PROVISION_AMOUNT}}[\s\S]*?<\/tr>/gi, '');
      content = content.replace(/<p[^>]*>[\s\S]*?{{PROVISION_AMOUNT}}[\s\S]*?<\/p>/gi, '');
      content = content.replace(/<div[^>]*>[\s\S]*?{{PROVISION_AMOUNT}}[\s\S]*?<\/div>/gi, '');
    }
    if (balanceInfo.additionalBudget === 0) {
      content = content.replace(/<tr[^>]*>[\s\S]*?{{ADDITIONAL_ALLOCATION}}[\s\S]*?<\/tr>/gi, '');
      content = content.replace(/<p[^>]*>[\s\S]*?{{ADDITIONAL_ALLOCATION}}[\s\S]*?<\/p>/gi, '');
      content = content.replace(/<div[^>]*>[\s\S]*?{{ADDITIONAL_ALLOCATION}}[\s\S]*?<\/div>/gi, '');
    }

    content = content.replace(/{{PROVISION_AMOUNT}}/g, `${convertToBengaliNumber(Number(balanceInfo.provisionAmount || 0).toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{BUDGET_ALLOCATION}}/g, `${convertToBengaliNumber(Number(balanceInfo.initialBudget || 0).toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{ADDITIONAL_ALLOCATION}}/g, `${convertToBengaliNumber(Number(balanceInfo.additionalBudget || 0).toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{TOTAL_ALLOCATION}}/g, `${convertToBengaliNumber(Number(balanceInfo.totalAllocated || 0).toLocaleString('en-IN'))}/-`);
    
    content = content.replace(/{{TOTAL_SPENT_SO_FAR}}/g, `${convertToBengaliNumber(Number(safeSpentSoFar).toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{TOTAL_SPENT_INCLUDING_CURRENT}}/g, `${convertToBengaliNumber(Number(spentIncludingCurrent).toLocaleString('en-IN'))}/-`);
    content = content.replace(/{{REMAINING_BALANCE}}/g, `${convertToBengaliNumber(Number(remainingBalance).toLocaleString('en-IN'))}/-`);

    // Fix double commas if created by template replacement
    content = content.replace(/,\s*,/g, ',');

    return sanitizeHtmlServer(content);
  }

  return "";
}

async function syncNoteSheetForExpense(expense: any, userId: string, force: boolean = false): Promise<any | null> {
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

  if (!template && expense.expenseType === "Quotation" && expense.quotationFormType === "Form1") {
    template = templates.find((t: any) => t.id === "tpl-form1-quotation");
  }
  if (!template && expense.expenseType === "Quotation" && expense.quotationFormType === "Form2") {
    template = { id: "tpl-form2-quotation" }; // Dummy template to bypass category fallback and use generateForm2NoteSheetHtml directly inside renderExpenseNoteSheetContent
  }

  if (!template) {
    template = templates.find((t: any) => t.categoryId === expense.categoryId);
  }

  if (!template) {
    template = templates.find((t: any) => t.id === "tpl-regular-expense") 
            || templates.find((t: any) => (t.categoryId === "all" || !t.categoryId) && t.id !== "tpl-form1-quotation")
            || templates.find((t: any) => t.categoryId === "all");
  }
  const balanceInfo = getAvailableBalance(expense.financialYearId, expense.officeId, expense.categoryId);

  const content = renderExpenseNoteSheetContent(expense, office, category, fy, balanceInfo, template);
  if (!content) {
    return null;
  }

  let forwardingContent = undefined;
  let supplyOrderContent = undefined;
  if (expense.expenseType === "Quotation" && (expense.quotationFormType === "Form1" || expense.quotationFormType === "Form2")) {
    forwardingContent = generateForm1ForwardingHtml(expense, office, category, fy, balanceInfo);
    supplyOrderContent = generateForm1SupplyOrderHtml(expense, office, category, fy, balanceInfo);
  }

  // Look for existing note sheet
  const nsIndex = noteSheets.findIndex((ns: any) => 
    (expense.noteSheetId && ns.id === expense.noteSheetId) || 
    (expense.id && ns.expenseId === expense.id)
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
      title: `${category ? category.name : 'Expense'} - ${expense.voucherNo || ''}`,
      content: content,
      forwardingContent: forwardingContent !== undefined ? forwardingContent : noteSheets[nsIndex].forwardingContent,
      supplyOrderContent: supplyOrderContent !== undefined ? supplyOrderContent : noteSheets[nsIndex].supplyOrderContent,
      expenseType: expense.expenseType || "General",
      expenseGrossAmount: expense.grossAmount || expense.amount || 0,
      isUnder1500: (expense.grossAmount || expense.amount || 0) <= 1500 && expense.expenseType !== "Quotation",
      isCustomEdited: false,
      updatedAt: new Date().toISOString()
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
      title: `${category ? category.name : 'Expense'} - ${expense.voucherNo || ''}`,
      content: content,
      forwardingContent: forwardingContent,
      supplyOrderContent: supplyOrderContent,
      expenseType: expense.expenseType || "General",
      expenseGrossAmount: expense.grossAmount || expense.amount || 0,
      isUnder1500: (expense.grossAmount || expense.amount || 0) <= 1500 && expense.expenseType !== "Quotation",
      isCustomEdited: false,
      createdBy: userId,
      createdAt: new Date().toISOString().split("T")[0]
    };
    noteSheets.push(newNoteSheet);
    await saveSheetData("NoteSheets", noteSheets);
    expense.noteSheetId = newNoteSheetId;
    return newNoteSheet;
  }
}

function checkReferentialIntegrityOnDelete(sheet: string, id: string): { allowed: boolean; error?: string } {
  return checkReferentialIntegrityOnDeleteSchema(sheet, id, getSheetData);
}

// Manual Note Sheet Generation
app.post("/api/expenses/:id/generate-notesheet", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role === "Report Viewer") {
      return res.status(403).json({ error: "Forbidden: Report Viewers cannot modify data" });
    }

    const { id } = req.params;
    const { userId } = req.body || {};
    const lockedSheets = ["Expenses", "NoteSheets", "Categories", "Offices", "FinancialYears", "Allocations", "NoteTemplates"];
    const result = await withSheetLock(lockedSheets, async () => {
      const expenses = getSheetData("Expenses");
      const expense = expenses.find((e: any) => e.id === id);
      
      if (!expense) {
        const err: any = new Error("Expense not found");
        err.statusCode = 404;
        throw err;
      }
      
      if (user.role === "Sub-office User" && expense.officeId !== user.officeId) {
        const err: any = new Error("Forbidden: Cannot modify records for other offices");
        err.statusCode = 403;
        throw err;
      }

      const generatedNoteSheet = await syncNoteSheetForExpense(expense, userId || user.userId || "system", true);
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
});

// Authentication Routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    const cleanId = (userId || "").trim().toLowerCase();
    const users = getSheetData("Users");
    
    const user = users.find((u: any) => {
      const uId = (u.userId || "").toLowerCase();
      const uEmail = (u.email || "").toLowerCase();
      const sysId = (u.id || "").toLowerCase();
      return (
        uId === cleanId || 
        uEmail === cleanId || 
        sysId === cleanId
      );
    });

    if (!user) {
      addAuditLog(cleanId || "unknown", "LOGIN_FAILED", "Users", "system", `Failed login attempt from IP: ${req.ip}`);
      return res.status(401).json({ error: "Invalid User ID or Password" });
    }
    if (user.status === "Inactive") {
      return res.status(401).json({ error: "User account is inactive. Contact Administrator." });
    }

    let isValidPass = false;
    let needsUpgrade = false;

    if (user.passwordSalt) {
      const hashed = hashPassword(password, user.passwordSalt, 60000);
      try {
        isValidPass = crypto.timingSafeEqual(Buffer.from(hashed, 'hex'), Buffer.from(user.passwordHash || '', 'hex'));
      } catch (e) { isValidPass = false; }
    } else {
      const hashedLegacy = hashPassword(password, "gov_alloc_salt_2026", 1000);
      try {
        isValidPass = crypto.timingSafeEqual(Buffer.from(hashedLegacy, 'hex'), Buffer.from(user.passwordHash || '', 'hex'));
      } catch (e) { isValidPass = false; }
      if (isValidPass) needsUpgrade = true;
    }

    if (!isValidPass) {
      addAuditLog(user.userId, "LOGIN_FAILED", "Users", user.id, `Failed login attempt from IP: ${req.ip}`);
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

    const { passwordHash, passwordSalt, ...safeUser } = user;
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
      return res.status(400).json({ error: "Old password and new password are required" });
    }

    const result = await withSheetLock("Users", async () => {
      const users = getSheetData("Users");
      const index = users.findIndex((u: any) => u.id === userId || u.userId === userId);
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
          isValidOld = crypto.timingSafeEqual(Buffer.from(hashedOld, 'hex'), Buffer.from(user.passwordHash || '', 'hex'));
        } catch (e) { isValidOld = false; }
      } else {
        const hashedOld = hashPassword(oldPassword, "gov_alloc_salt_2026", 1000);
        try {
          isValidOld = crypto.timingSafeEqual(Buffer.from(hashedOld, 'hex'), Buffer.from(user.passwordHash || '', 'hex'));
        } catch (e) { isValidOld = false; }
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
      
      const { passwordHash, passwordSalt, ...safeUser } = users[index];
      return { success: true, message: "Password updated successfully", user: safeUser };
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", requireAuth, requireRole("Super Admin", "Head Office Admin"), async (req, res) => {
  try {
    const { targetUserId, newPassword } = req.body;
    const adminUser = (req as any).user;

    const result = await withSheetLock("Users", async () => {
      const users = getSheetData("Users");
      const index = users.findIndex((u: any) => u.id === targetUserId || u.userId === targetUserId);
      if (index === -1) {
        const err: any = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }

      const targetUser = users[index];
      const newSalt = crypto.randomBytes(16).toString("hex");
      users[index].passwordSalt = newSalt;
      users[index].passwordHash = hashPassword(newPassword || "password123", newSalt, 60000);
      await saveSheetData("Users", users);

      await addAuditLog(
        adminUser.userId,
        "RESET_PASSWORD",
        "Users",
        targetUser.id,
        `Admin ${adminUser.userId} reset password for user ${targetUser.userId}`
      );

      return { success: true, message: "Password reset successfully by Admin" };
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// API Routes for all sheets
const sheetsList = ["Settings", "FinancialYears", "Offices", "Users", "Categories", "Allocations", "Expenses", "NoteSheets", "NoteTemplates", "OpeningBalances", "AuditLogs"];

const checkWriteAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role === "Report Viewer") {
    return res.status(403).json({ error: "Forbidden: Report Viewers cannot modify data" });
  }
  const sheet = (req as any).sheetName;
  if (["Settings", "FinancialYears", "Offices", "Categories", "Users", "Allocations"].includes(sheet)) {
    if (user.role !== "Super Admin" && user.role !== "Head Office Admin") {
      return res.status(403).json({ error: `Forbidden: Insufficient privileges for ${sheet}` });
    }
  }
  next();
};

sheetsList.forEach((sheet) => {
  // GET all
  app.get(`/api/${sheet.toLowerCase()}`, requireAuth, (req, res) => {
    try {
      let data = getSheetData(sheet);
      const user = (req as any).user;
      
      if (user.role === "Sub-office User" && ["Allocations", "Expenses", "NoteSheets"].includes(sheet)) {
        data = data.filter((item: any) => item.officeId === user.officeId);
      }

      if (sheet === "Users") {
        data = data.map((u: any) => {
          const { passwordHash, passwordSalt, ...rest } = u;
          return rest;
        });
      }
      
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Inject sheetName for middleware
  const injectSheetName = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    (req as any).sheetName = sheet;
    next();
  };

  // POST create
  app.post(`/api/${sheet.toLowerCase()}`, requireAuth, injectSheetName, checkWriteAccess, async (req, res) => {
    try {
      if (sheet === "AuditLogs") {
        return res.status(405).json({ error: "Method Not Allowed: Audit logs cannot be created via API" });
      }

      const user = (req as any).user;
      if (["Expenses", "NoteSheets"].includes(sheet) && user.role === "Sub-office User") {
        if (req.body.officeId && req.body.officeId !== user.officeId) {
          return res.status(403).json({ error: "Forbidden: Cannot create records for other offices" });
        }
      }

      // 1. Zod Schema Validation
      const schema = SheetSchemas[sheet];
      let validatedBody = req.body;
      if (schema) {
        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
          const errorMessages = parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
          return res.status(400).json({
            error: `ইনপুট ডেটা সঠিক নয়: ${errorMessages}`,
            details: parseResult.error.format()
          });
        }
        validatedBody = parseResult.data;
      }

      // 2. Referential Integrity Check
      const refCheck = validateReferentialIntegrity(sheet, validatedBody);
      if (!refCheck.valid) {
        return res.status(422).json({ error: refCheck.error });
      }

      // 3. Check if financial year is closed
      if (["Allocations", "Expenses", "NoteSheets", "OpeningBalances"].includes(sheet)) {
        if (validatedBody.financialYearId && isFYClosed(validatedBody.financialYearId)) {
          return res.status(423).json({
            error: "🔒 এই অর্থবছরটি ক্লোজড। বন্ধ অর্থবছরে নতুন কোনো এন্ট্রি প্রদান সম্ভব নয়।"
          });
        }
      }

      // Lock sheets that will be read/written
      const lockedSheets = sheet === "Expenses" 
        ? ["Expenses", "NoteSheets", "Categories", "Offices", "FinancialYears", "Allocations"] 
        : [sheet];

      const result = await withSheetLock(lockedSheets, async () => {
        const data = getSheetData(sheet);
        const rawItem = { id: `${sheet.toLowerCase().slice(0, 3)}-${Date.now()}`, ...validatedBody };
        
        let generatedNoteSheet = null;
        let newItem = rawItem;
        if (sheet === "Expenses") {
          const computed = computeExpenseAmounts(rawItem.amount, rawItem.vatRate, rawItem.taxRate);
          const categories = getSheetData("Categories");
          const category = categories.find((c: any) => c.id === rawItem.categoryId);
          const requireApproval = category?.requireApproval !== false;

          newItem = {
            ...rawItem,
            status: rawItem.status || (requireApproval ? "Pending" : "Approved"),
            ...computed
          };

          // Expense Date Validation against Financial Year
          const financialYears = getSheetData("FinancialYears");
          const fy = financialYears.find((f: any) => f.id === newItem.financialYearId);
          if (fy && fy.startDate && fy.endDate && newItem.expenseDate) {
            if (newItem.expenseDate < fy.startDate || newItem.expenseDate > fy.endDate) {
              const err: any = new Error(`ব্যয়ের তারিখ অবশ্যই নির্বাচিত অর্থবছরের সীমার (${fy.startDate} হতে ${fy.endDate}) মধ্যে হতে হবে। / Expense date must be within financial year limits.`);
              err.statusCode = 422;
              throw err;
            }
          }

          // Duplicate Voucher Check
          if (newItem.voucherNo && newItem.voucherNo.trim() !== "") {
            const duplicate = data.find((e: any) =>
              e.financialYearId === newItem.financialYearId &&
              e.officeId === newItem.officeId &&
              e.voucherNo.trim().toLowerCase() === newItem.voucherNo.trim().toLowerCase()
            );
            if (duplicate) {
              const err: any = new Error(`এই ভাউচার নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে। / This voucher number has already been used.`);
              err.statusCode = 409;
              throw err;
            }
          }

          const allowExcess = category?.allowExcess === true;
          const availableBalance = getAvailableBalance(newItem.financialYearId, newItem.officeId, newItem.categoryId).available;
          if (!allowExcess && Number(newItem.grossAmount) > availableBalance) {
            const err: any = new Error(`অবশিষ্ট ব্যালেন্স ৳${availableBalance}, ফলে ৳${newItem.grossAmount} ব্যয় অনুমোদনযোগ্য নয়। / Available balance is ৳${availableBalance}, so expense of ৳${newItem.grossAmount} is not allowed.`);
            err.statusCode = 422;
            throw err;
          }
        }

        // Expense specific logic: auto-generate note sheet if template or quotation exists
        if (sheet === "Expenses") {
          const syncedNs = await syncNoteSheetForExpense(newItem, user.userId);
          if (syncedNs) {
            newItem.noteSheetId = syncedNs.id;
            generatedNoteSheet = syncedNs;
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
        }

        if (sheet === "Users") {
          if (newItem.password) {
            const newSalt = crypto.randomBytes(16).toString("hex");
            newItem.passwordSalt = newSalt;
            newItem.passwordHash = hashPassword(newItem.password, newSalt, 60000);
            delete newItem.password;
          }
          if (!newItem.status) newItem.status = "Active";
        }

        data.push(newItem);
        await saveSheetData(sheet, data);

        // Add audit log
        await addAuditLog(user.userId, `CREATE_${sheet.toUpperCase()}`, sheet, newItem.id, `Created record in ${sheet}`);

        let responseItem = newItem;
        if (sheet === "Users") {
          const { passwordHash, passwordSalt, ...rest } = newItem;
          responseItem = rest;
        }

        return responseItem;
      });

      res.status(201).json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  });

  // PUT update
  app.put(`/api/${sheet.toLowerCase()}/:id`, requireAuth, injectSheetName, checkWriteAccess, async (req, res) => {
    try {
      if (sheet === "AuditLogs") {
        return res.status(405).json({ error: "Method Not Allowed: Audit logs cannot be modified" });
      }

      const { id } = req.params;

      // 1. Zod Schema Validation (Partial schema for updates)
      const updateSchema = SheetUpdateSchemas[sheet];
      let validatedBody = req.body;
      if (updateSchema) {
        const parseResult = updateSchema.safeParse(req.body);
        if (!parseResult.success) {
          const errorMessages = parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
          return res.status(400).json({
            error: `ইনপুট ডেটা সঠিক নয়: ${errorMessages}`,
            details: parseResult.error.format()
          });
        }
        validatedBody = parseResult.data;
      }

      // 2. Referential Integrity Check
      const refCheck = validateReferentialIntegrity(sheet, validatedBody);
      if (!refCheck.valid) {
        return res.status(422).json({ error: refCheck.error });
      }

      const lockedSheets = sheet === "Expenses" 
        ? ["Expenses", "NoteSheets", "Categories", "Offices", "FinancialYears", "Allocations"] 
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
        if (["Expenses", "NoteSheets"].includes(sheet) && user.role === "Sub-office User") {
          const existingItem = data[index];
          if (existingItem.officeId !== user.officeId || (validatedBody.officeId && validatedBody.officeId !== user.officeId)) {
            const err: any = new Error("Forbidden: Cannot modify records for other offices");
            err.statusCode = 403;
            throw err;
          }
        }

        if (["Allocations", "Expenses", "NoteSheets", "OpeningBalances"].includes(sheet)) {
          const targetFyId = validatedBody.financialYearId || data[index]?.financialYearId;
          if (targetFyId && isFYClosed(targetFyId)) {
            const err: any = new Error("🔒 এই অর্থবছরটি ক্লোজড। বন্ধ অর্থবছরের কোনো এন্ট্রি সম্পাদনা সম্ভব নয়।");
            err.statusCode = 423;
            throw err;
          }
        }

        if (sheet === "Allocations") {
          const existingItem = data[index];
          const newAllocatedAmount = validatedBody.allocatedAmount !== undefined ? Number(validatedBody.allocatedAmount) : Number(existingItem.allocatedAmount);
          const diff = newAllocatedAmount - Number(existingItem.allocatedAmount);
          if (diff < 0) {
            const categories = getSheetData("Categories");
            const category = categories.find((c: any) => c.id === existingItem.categoryId);
            if (!category?.allowExcess) {
              const currentBalance = getAvailableBalance(existingItem.financialYearId, existingItem.officeId, existingItem.categoryId).available;
              const hypotheticalBalance = currentBalance + diff;
              if (hypotheticalBalance < 0) {
                const err: any = new Error(`বরাদ্দ কমালে খাতের ব্যালেন্স ঋণাত্মক (৳${hypotheticalBalance}) হয়ে যাবে। তাই বরাদ্দ কমানো সম্ভব নয়।`);
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
            const ns = noteSheets.find((n: any) => n.id === existingItem.noteSheetId);
            if (ns && ns.status === "Approved") {
              const err: any = new Error(`এই ব্যয়ের নোটশিট অনুমোদিত (Approved) হয়েছে। সরাসরি সম্পাদনা না করে নতুন Adjustment বা সংশোধনী এন্ট্রি দিন। / Approved note sheet exists. Please use Adjustment entry.`);
              err.statusCode = 409;
              throw err;
            }
          }

          const merged = { ...data[index], ...validatedBody };
          const computed = computeExpenseAmounts(merged.amount, merged.vatRate, merged.taxRate);
          updatePayload = {
            ...merged,
            ...computed
          };

          const financialYears = getSheetData("FinancialYears");
          const fy = financialYears.find((f: any) => f.id === updatePayload.financialYearId);
          if (fy && fy.startDate && fy.endDate && updatePayload.expenseDate) {
            if (updatePayload.expenseDate < fy.startDate || updatePayload.expenseDate > fy.endDate) {
              const err: any = new Error(`ব্যয়ের তারিখ অবশ্যই নির্বাচিত অর্থবছরের সীমার (${fy.startDate} হতে ${fy.endDate}) মধ্যে হতে باشد। / Expense date must be within financial year limits.`);
              err.statusCode = 422;
              throw err;
            }
          }

          if (updatePayload.voucherNo && updatePayload.voucherNo.trim() !== "") {
            const duplicate = data.find((e: any) =>
              e.id !== id &&
              e.financialYearId === updatePayload.financialYearId &&
              e.officeId === updatePayload.officeId &&
              e.voucherNo.trim().toLowerCase() === updatePayload.voucherNo.trim().toLowerCase()
            );
            if (duplicate) {
              const err: any = new Error(`এই ভাউচার নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে। / This voucher number has already been used.`);
              err.statusCode = 409;
              throw err;
            }
          }

          const categories = getSheetData("Categories");
          const category = categories.find((c: any) => c.id === updatePayload.categoryId);
          const allowExcess = category?.allowExcess === true;

          // Temporarily adjust spent for balance check
          const availableBalance = getAvailableBalance(updatePayload.financialYearId, updatePayload.officeId, updatePayload.categoryId).available;
          const oldGross = Number(data[index].grossAmount || data[index].amount || 0);
          const newGross = Number(updatePayload.grossAmount || 0);
          const diff = newGross - oldGross;

          if (!allowExcess && diff > 0 && diff > availableBalance) {
            const err: any = new Error(`অবশিষ্ট ব্যালেন্স ৳${availableBalance}, ফলে ব্যয়ের পরিমাণ বৃদ্ধি অনুমোদনযোগ্য নয়। / Available balance is ৳${availableBalance}, so expense increase is not allowed.`);
            err.statusCode = 422;
            throw err;
          }
        }

        if (sheet === "NoteTemplates") {
          if (updatePayload.bodyTemplate) {
            updatePayload.bodyTemplate = sanitizeHtmlServer(updatePayload.bodyTemplate);
          }
        }

        if (sheet === "NoteSheets") {
          if (updatePayload.content) {
            updatePayload.content = sanitizeHtmlServer(updatePayload.content);
          }
          if (updatePayload.forwardingContent) {
            updatePayload.forwardingContent = sanitizeHtmlServer(updatePayload.forwardingContent);
          }
          if (updatePayload.supplyOrderContent) {
            updatePayload.supplyOrderContent = sanitizeHtmlServer(updatePayload.supplyOrderContent);
          }
        }

        const oldJson = JSON.stringify(data[index]);
        data[index] = { ...data[index], ...updatePayload, id };

        if (sheet === "Expenses") {
          const syncedNs = await syncNoteSheetForExpense(data[index], user.userId, true);
          if (syncedNs) {
            data[index].noteSheetId = syncedNs.id;
          }
        }

        const newJson = JSON.stringify(data[index]);
        await saveSheetData(sheet, data);

        // Audit log
        const auditDetails = sheet === "Expenses"
          ? `Updated expense ${id}. Old: ${oldJson}, New: ${newJson}`
          : `Updated record ${id} in ${sheet}`;
        await addAuditLog(user.userId, `UPDATE_${sheet.toUpperCase()}`, sheet, id, auditDetails);

        let responseItem = data[index];
        if (sheet === "Users") {
          const { passwordHash, passwordSalt, ...rest } = data[index];
          responseItem = rest;
        }

        return responseItem;
      });

      res.json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  });

  // DELETE
  app.delete(`/api/${sheet.toLowerCase()}/:id`, requireAuth, injectSheetName, checkWriteAccess, async (req, res) => {
    try {
      if (sheet === "AuditLogs") {
        return res.status(405).json({ error: "Method Not Allowed: Audit logs cannot be deleted" });
      }

      const { id } = req.params;

      // 1. Referential Integrity check on delete
      const deleteCheck = checkReferentialIntegrityOnDelete(sheet, id);
      if (!deleteCheck.allowed) {
        return res.status(409).json({ error: deleteCheck.error });
      }

      const lockedSheets = [sheet, "Allocations", "Expenses", "NoteSheets", "OpeningBalances", "Users"];

      const result = await withSheetLock(lockedSheets, async () => {
        let data = getSheetData(sheet);
        const item = data.find((i) => i.id === id);
        if (!item) {
          const err: any = new Error("Record not found");
          err.statusCode = 404;
          throw err;
        }

        const user = (req as any).user;
        if (["Expenses", "NoteSheets"].includes(sheet) && user.role === "Sub-office User") {
          if (item && item.officeId !== user.officeId) {
            const err: any = new Error("Forbidden: Cannot delete records for other offices");
            err.statusCode = 403;
            throw err;
          }
        }

        if (["Allocations", "Expenses", "NoteSheets", "OpeningBalances"].includes(sheet)) {
          if (item && item.financialYearId && isFYClosed(item.financialYearId)) {
            const err: any = new Error("🔒 এই অর্থবছরটি ক্লোজড। বন্ধ অর্থবছরের কোনো তথ্য মুছে ফেলা সম্ভব নয়।");
            err.statusCode = 423;
            throw err;
          }
        }

        if (sheet === "Allocations") {
          const itemToDelete = data.find((i: any) => i.id === id);
          if (itemToDelete) {
            const categories = getSheetData("Categories");
            const category = categories.find((c: any) => c.id === itemToDelete.categoryId);
            if (!category?.allowExcess) {
              const currentBalance = getAvailableBalance(itemToDelete.financialYearId, itemToDelete.officeId, itemToDelete.categoryId).available;
              const hypotheticalBalance = currentBalance - Number(itemToDelete.allocatedAmount || 0);
              if (hypotheticalBalance < 0) {
                const err: any = new Error(`এই বরাদ্দ মুছে ফেললে খাতের ব্যালেন্স ঋণাত্মক (৳${hypotheticalBalance}) হয়ে যাবে। তাই বরাদ্দ মোছা সম্ভব নয়।`);
                err.statusCode = 409;
                throw err;
              }
            }
          }
        }

        if (sheet === "Expenses") {
          const itemToDelete = data.find((i: any) => i.id === id);
          const noteSheets = getSheetData("NoteSheets");
          const remainingNoteSheets = noteSheets.filter((ns: any) => ns.expenseId !== id && ns.id !== (itemToDelete?.noteSheetId));
          if (remainingNoteSheets.length !== noteSheets.length) {
            await saveSheetData("NoteSheets", remainingNoteSheets);
          }
        }

        data = data.filter((i) => i.id !== id);
        await saveSheetData(sheet, data);

        await addAuditLog(user.userId, `DELETE_${sheet.toUpperCase()}`, sheet, id, `Deleted record ${id} from ${sheet}`);

        return { success: true, deletedId: id };
      });

      res.json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message });
    }
  });
});

// Google Apps Script Code Generator endpoint
app.get("/api/apps-script-code", requireAuth, (req, res) => {
  try {
    const codeGsPath = path.join(process.cwd(), "src", "gas", "Code.gs");
    const setupDbPath = path.join(process.cwd(), "src", "gas", "SetupDatabase.gs");
    const indexPath = path.join(process.cwd(), "src", "gas", "Index.html");

    const codeGs = fs.existsSync(codeGsPath) ? fs.readFileSync(codeGsPath, "utf-8") : "";
    const setupDb = fs.existsSync(setupDbPath) ? fs.readFileSync(setupDbPath, "utf-8") : "";
    const indexHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf-8") : "";

    res.json({
      code: codeGs,
      codeGs,
      setupDb,
      indexHtml
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gemini AI Note Sheet generator
app.post("/api/ai/generate-notesheet", requireAuth, async (req, res) => {
  try {
    const { categoryName, amount, description, officeName, financialYear } = req.body;
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
      
      Provide a professional subject line, reference to approved budget allocation, justification, and recommendation for approval.`
    });

    res.json({ result: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Parse Word Document (.docx / .doc) to HTML with tables & formatting
app.post("/api/parse-word-doc", requireAuth, async (req, res) => {
  try {
    let rawBase64 = req.body.base64 || req.body.base64Data || req.body.file || "";
    const filename = req.body.filename || req.body.fileName || "document.docx";

    if (typeof rawBase64 === "string" && rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    const cleanBase64 = typeof rawBase64 === "string" ? rawBase64.replace(/^data:[^;]+;base64,/, "").trim() : "";
    if (!cleanBase64) {
      return res.status(400).json({ error: "Base64 file content is required." });
    }

    const buffer = Buffer.from(cleanBase64, "base64");
    
    let html = "";
    try {
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value || "";
    } catch (mammothErr: any) {
      console.warn("Mammoth parse failed, checking text fallback:", mammothErr.message);
      // Attempt fallback: if it's UTF-8 / plain text / HTML disguised as doc
      const textCandidate = buffer.toString("utf-8");
      const sample = textCandidate.substring(0, 100);
      const hasControlChars = Array.from(sample).some(c => {
        const code = c.charCodeAt(0);
        return (code >= 0 && code <= 8) || (code >= 14 && code <= 31);
      });
      if (textCandidate && !hasControlChars) {
        if (textCandidate.includes("<html") || textCandidate.includes("<table") || textCandidate.includes("<p>")) {
          html = textCandidate;
        } else {
          html = textCandidate.split(/\r?\n/).filter(line => line.trim()).map(line => `<p>${line.trim()}</p>`).join("\n");
        }
      } else {
        throw new Error("ওয়ার্ড ফাইলটি (.docx) ফরম্যাটে হতে হবে। পুরনো বাইনারি .doc ফাইল হলে দয়া করে সেটি Word বা Google Docs-এ ওপেন করে .docx হিসেবে সেভ করে আপলোড করুন।");
      }
    }

    // Clean up HTML: Enhance table styles for Bangla/English Govt Note Sheets
    if (html.includes("<table")) {
      html = html.replace(/<table/g, '<table style="width:100%; border-collapse:collapse; margin:12px 0; border:1.5px solid #000; font-size:inherit;"');
      html = html.replace(/<td/g, '<td style="border:1px solid #000; padding:6px 8px; vertical-align:top;"');
      html = html.replace(/<th/g, '<th style="border:1px solid #000; padding:6px 8px; background-color:#f1f5f9; text-align:center;"');
    }

    // Sanitize with DOMPurify before sending response
    const cleanHtml = sanitizeHtmlServer(html);

    res.json({
      success: true,
      html: cleanHtml,
      filename
    });
  } catch (err: any) {
    console.error("Word Doc parsing error:", err);
    res.status(400).json({ error: err.message || "Failed to parse Word document." });
  }
});

// Approve Expense
app.post("/api/expenses/:id/approve", requireAuth, requireRole("Super Admin", "Head Office Admin"), async (req, res) => {
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
      expense.approvedAt = new Date().toISOString().replace("T", " ").substring(0, 19);

      await saveSheetData("Expenses", expenses);
      await addAuditLog(
        user.userId,
        "APPROVE_EXPENSE",
        "Expenses",
        id,
        `Approved expense ${id} (Voucher: ${expense.voucherNo}, Amount: ৳${expense.amount})`
      );

      return expense;
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// Reject Expense
app.post("/api/expenses/:id/reject", requireAuth, requireRole("Super Admin", "Head Office Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ error: "প্রত্যাখ্যানের কারণ আবশ্যক। / Rejection reason is required." });
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
      expense.approvedAt = new Date().toISOString().replace("T", " ").substring(0, 19);
      expense.rejectionReason = reason.trim();

      await saveSheetData("Expenses", expenses);
      await addAuditLog(
        user.userId,
        "REJECT_EXPENSE",
        "Expenses",
        id,
        `Rejected expense ${id}. Reason: ${reason.trim()}`
      );

      return expense;
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// Supporting Documents Upload & Serve API
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// POST /api/upload
app.post("/api/upload", requireAuth, (req, res) => {
  try {
    const { base64Data, expenseId, originalName } = req.body;
    if (!base64Data || typeof base64Data !== "string") {
      return res.status(400).json({ error: "ফাইল ডাটা আবশ্যক। / File data is required." });
    }

    // Clean data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // Max 5 MB check (5 * 1024 * 1024 bytes)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      return res.status(400).json({
        error: "ফাইলের আকার ৫ MB এর বেশি হতে পারবে না। / File size cannot exceed 5 MB."
      });
    }

    // Magic Bytes verification
    const detected = detectFileTypeFromMagicBytes(buffer);
    if (!detected) {
      return res.status(400).json({
        error: "অনুমোদিত ফাইল ফরম্যাট: pdf, jpg, jpeg, png, docx। / Allowed file formats: pdf, jpg, jpeg, png, docx."
      });
    }

    // Extension check: preserve jpeg if original ended with .jpeg, else use detected ext
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
      `Uploaded supporting document ${safeFilename} (${buffer.length} bytes, format: ${ext})`
    );

    res.json({
      success: true,
      filename: safeFilename,
      url: `/api/upload/${safeFilename}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "File upload failed" });
  }
});

// GET /api/upload/:filename
app.get("/api/upload/:filename", requireAuth, (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "ফাইল পাওয়া যায়নি। / File not found." });
    }

    const user = (req as any).user;

    // RBAC check: Sub-office users can only view attachments of their office's expenses
    if (user.role !== "Super Admin" && user.role !== "Head Office Admin") {
      const expenses = getSheetData("Expenses");
      const matchedExpense = expenses.find(
        (e: any) => e.supportingDocument && e.supportingDocument.includes(filename)
      );
      if (matchedExpense && matchedExpense.officeId !== user.officeId) {
        return res.status(403).json({
          error: "আপনার এই অফিসের সংযুক্তি দেখার অনুমতি নেই। / You do not have permission to view attachments for this office."
        });
      }
    }

    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    res.setHeader("Content-Type", contentType);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financialyears/:id/close
app.post("/api/financialyears/:id/close", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const isAdmin = user.role === "Super Admin" || user.role === "Head Office Admin" || user.role === "HeadOfficeAdmin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only Admin can close a financial year" });
    }

    const { id } = req.params;
    const { targetFinancialYearId, carryForwardMap } = req.body || {};

    const result = await withSheetLock(["FinancialYears", "Expenses", "OpeningBalances", "Offices", "Categories", "Allocations"], async () => {
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

      // Check for pending expenses in this FY
      const expenses = getSheetData("Expenses");
      const pendingInFY = expenses.filter(
        (e: any) => e.financialYearId === id && e.status === "Pending"
      );

      if (pendingInFY.length > 0) {
        const err: any = new Error(`এই অর্থবছরে ${pendingInFY.length} টি পেন্ডিং ব্যয় বিদ্যমান। অর্থবছর ক্লোজ করার পূর্বে সকল পেন্ডিং ব্যয় অনুমোদন বা প্রত্যাখ্যান করতে হবে।`);
        err.statusCode = 409;
        err.pendingCount = pendingInFY.length;
        throw err;
      }

      // Determine target financial year (targetFinancialYearId or next available)
      let nextFY = null;
      if (targetFinancialYearId) {
        nextFY = fys.find((f: any) => f.id === targetFinancialYearId);
      }
      if (!nextFY) {
        const otherFYs = fys.filter((f: any) => f.id !== id);
        nextFY = otherFYs.find((f: any) => f.status === "Active") || otherFYs[0];
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
              // Remove existing opening balance for same nextFY, off, cat if present
              openingBalances = openingBalances.filter(
                (ob: any) => !(ob.financialYearId === nextFY.id && ob.officeId === off.id && ob.categoryId === cat.id)
              );

              const obItem = {
                id: `ob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                financialYearId: nextFY.id,
                officeId: off.id,
                categoryId: cat.id,
                amount: carryAmount,
                sourceFYId: id,
                createdAt: new Date().toISOString(),
                createdBy: user.userId
              };
              openingBalances.push(obItem);
              createdOpeningBalances.push(obItem);
            }
          });
        });
        await saveSheetData("OpeningBalances", openingBalances);
      }

      // Mark current FY as closed
      currentFY.isClosed = true;
      currentFY.closedAt = new Date().toISOString();
      currentFY.closedBy = user.userId;
      fys[fyIndex] = currentFY;
      await saveSheetData("FinancialYears", fys);

      // Write audit log
      await addAuditLog(
        user.userId,
        "CLOSE_FINANCIAL_YEAR",
        "FinancialYears",
        id,
        `Closed Financial Year ${currentFY.name}. Carried forward opening balances to ${nextFY ? nextFY.name : "N/A"}.`
      );

      return {
        success: true,
        closedFY: currentFY,
        nextFY,
        openingBalancesCreated: createdOpeningBalances
      };
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message, pendingCount: err.pendingCount });
  }
});

// POST /api/settings/restore-defaults
app.post("/api/settings/restore-defaults", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const isAdmin = user.role === "Super Admin" || user.role === "Head Office Admin" || user.role === "HeadOfficeAdmin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only Admin can restore default configurations" });
    }

    const { target } = req.body || {}; // "offices" | "categories" | "all"

    const officialOffices = [
      { id: "off-ho", name: "আঞ্চলিক কার্যালয়, রাঙ্গামাটি", type: "HeadOffice", code: "RO-3300", address: "বনরূপা, রাঙ্গামাটি", status: "Active" },
      { id: "off-bo-3301", name: "কাপ্তাই শাখা (3301)", type: "SubOffice", code: "BO-3301", address: "নতুন বাজার, কাপ্তাই, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3302", name: "রাইখালী বাজার শাখা (3302)", type: "SubOffice", code: "BO-3302", address: "রাইখালী বাজার, কাপ্তাই, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3303", name: "বিলাইছড়ি শাখা (3303)", type: "SubOffice", code: "BO-3303", address: "বিলাইছড়ি, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3304", name: "রাজস্থলী শাখা (3304)", type: "SubOffice", code: "BO-3304", address: "রাজস্থলী, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3501", name: "রাঙ্গামাটি শাখা (3501)", type: "SubOffice", code: "BO-3501", address: "রাঙ্গামাটি সদর, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3502", name: "নানিয়ারচর শাখা (3502)", type: "SubOffice", code: "BO-3502", address: "নানিয়ারচর, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3503", name: "বরকল শাখা (3503)", type: "SubOffice", code: "BO-3503", address: "বরকল, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3504", name: "লংগদু শাখা (3504)", type: "SubOffice", code: "BO-3504", address: "লংগদু, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3505", name: "কাউখালী শাখা (3505)", type: "SubOffice", code: "BO-3505", address: "কলমপতি, কাউখালী, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3506", name: "জুড়াছড়ি শাখা (3506)", type: "SubOffice", code: "BO-3506", address: "জুড়াছড়ি, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" },
      { id: "off-bo-3507", name: "বাঘাইছড়ি শাখা (3507)", type: "SubOffice", code: "BO-3507", address: "মারিশ্যা, বাঘাইছড়ি, রাঙ্গামাটি", parentOfficeId: "off-ho", status: "Active" }
    ];

    const officialCategories = [
      { id: "cat-1", code: "৪১/৮৬", name: "আয়কর অগ্রিম কর্তন", description: "আয়কর অগ্রিম কর্তন (৪১/৮৬)", budgetHead: "৪১/৮৬", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-2", code: "১৩২", name: "মুদ্রিত মনোহারী মুদ্রণ", description: "মুদ্রিত মনোহারী মুদ্রণ (১৩২)", budgetHead: "১৩২", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-3", code: "১৩৩/২", name: "কর্মকর্তাদের বেতন", description: "কর্মকর্তাদের বেতন (১৩৩/২)", budgetHead: "১৩৩/২", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-4", code: "১৩৩/৩", name: "কর্মচারীদের বেতন", description: "কর্মচারীদের বেতন (১৩৩/৩)", budgetHead: "১৩৩/৩", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-5", code: "১৩৩/৪", name: "বাড়ি ভাড়া ভাতা", description: "বাড়ি ভাড়া ভাতা (১৩৩/৪)", budgetHead: "১৩৩/৪", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-6", code: "১৩৩/৫", name: "অধিকাল ভাতা", description: "অধিকাল ভাতা (১৩৩/৫)", budgetHead: "১৩৩/৫", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-7", code: "১৩৩/৬", name: "অন্যান্য ভাতা (যাতায়াত, টিফিন, ধোলাই)", description: "অন্যান্য ভাতা (যাতায়াত, টিফিন, ধোলাই) (১৩৩/৬)", budgetHead: "১৩৩/৬", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-8", code: "১৩৩/৬ (বি)", name: "ছুটির নগদায়ন", description: "ছুটির নগদায়ন (১৩৩/৬ (বি))", budgetHead: "১৩৩/৬ (বি)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-9", code: "১৩৩/৬ (সি)", name: "মধ্যাহ্ন ভোজ/ ইফতারি ভাতা", description: "মধ্যাহ্ন ভোজ/ ইফতারি ভাতা (১৩৩/৬ (সি))", budgetHead: "১৩৩/৬ (সি)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-10", code: "১৩৩/৬ (ই)", name: "শ্রান্তি বিনোদন ভাতা", description: "শ্রান্তি বিনোদন ভাতা (১৩৩/৬ (ই))", budgetHead: "১৩৩/৬ (ই)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-11", code: "১৩৩/৭", name: "ভ্রমণ ভাতা (সাধারণ)", description: "ভ্রমণ ভাতা (সাধারণ) (১৩৩/৭)", budgetHead: "১৩৩/৭", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-12", code: "১৩৩/৮", name: "কর্মচারীদের পোশাক", description: "কর্মচারীদের পোশাক (১৩৩/৮)", budgetHead: "১৩৩/৮", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-13", code: "১৩৩/৯", name: "চিকিৎসা ভাতা", description: "চিকিৎসা ভাতা (১৩৩/৯)", budgetHead: "১৩৩/৯", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-14", code: "১৩৩/৯ এ", name: "শিশু শিক্ষা ভাতা", description: "শিশু শিক্ষা ভাতা (১৩৩/৯ এ)", budgetHead: "১৩৩/৯ এ", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-15", code: "১৩৩/১০", name: "বদলী/ প্রশিক্ষণ ভাতা", description: "বদলী/ প্রশিক্ষণ ভাতা (১৩৩/১০)", budgetHead: "১৩৩/১০", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-16", code: "১৩৩/১৩(বি)", name: "মাঠ পর্যায়ে সম্মেলন (আঃ কাঃ)", description: "মাঠ পর্যায়ে সম্মেলন (আঃ কাঃ) (১৩৩/১৩(বি))", budgetHead: "১৩৩/১৩(বি)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-17", code: "১৩৩/১৪", name: "উৎসব বোনাস", description: "উৎসব বোনাস (১৩৩/১৪)", budgetHead: "১৩৩/১৪", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-18", code: "১৩৩/১৫", name: "সুপারএনুয়েশন", description: "সুপারএনুয়েশন (১৩৩/১৫)", budgetHead: "১৩৩/১৫", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-19", code: "১৩৩/১৭", name: "বিদ্যুৎ ও পানি", description: "বিদ্যুৎ ও পানি (১৩৩/১৭)", budgetHead: "১৩৩/১৭", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-20", code: "১৩৩/১৮", name: "অফিস/ কার্যালয় ভাড়া", description: "অফিস/ কার্যালয় ভাড়া (১৩৩/১৮)", budgetHead: "১৩৩/১৮", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-21", code: "১৩৩/১৮ বি", name: "অফিস/ কার্যালয় ভাড়ার উপর ভ্যাট ১৫%", description: "অফিস/ কার্যালয় ভাড়ার উপর ভ্যাট ১৫% (১৩৩/১৮ বি)", budgetHead: "১৩৩/১৮ বি", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-22", code: "১৩৩/১৯ (এ)", name: "মেরামত ও নবায়ন (সাধারণ) আঃ কাঃ", description: "মেরামত ও নবায়ন (সাধারণ) আঃ কাঃ (১৩৩/১৯ (এ))", budgetHead: "১৩৩/১৯ (এ)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-23", code: "১৩৩/১৯ (বি)", name: "মেরামত ও নবায়ন (ইমারত)", description: "মেরামত ও নবায়ন (ইমারত) (১৩৩/১৯ (বি))", budgetHead: "১৩৩/১৯ (বি)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-24", code: "১৩৩/১৯ (সি)", name: "মেরামত ও নবায়ন অফিস যন্ত্রপাতি", description: "মেরামত ও নবায়ন অফিস যন্ত্রপাতি (১৩৩/১৯ (সি))", budgetHead: "১৩৩/১৯ (সি)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-25", code: "১৩৩/২০", name: "কর/ ট্যাক্স (গাড়ী)", description: "কর/ ট্যাক্স (গাড়ী) (১৩৩/২০)", budgetHead: "১৩৩/২০", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-26", code: "১৩৩/২১ (বি)", name: "স্থানীয় মনোহারী দ্রব্য ক্রয়", description: "স্থানীয় মনোহারী দ্রব্য ক্রয় (১৩৩/২১ (বি))", budgetHead: "১৩৩/২১ (বি)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-27", code: "১৩৩/২২", name: "ডাক/ কুরিয়ার খরচ", description: "ডাক/ কুরিয়ার খরচ (১৩৩/২২)", budgetHead: "১৩৩/২২", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-28", code: "১৩৩/২৩ (এ)", name: "টেলিফোন দাপ্তরিক", description: "টেলিফোন দাপ্তরিক (১৩৩/২৩ (এ))", budgetHead: "১৩৩/২৩ (এ)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-29", code: "১৩৩/২৩ (সি)", name: "ইন্টারনেট (মডেম খরচ)", description: "ইন্টারনেট (মডেম খরচ) (১৩৩/২৩ (সি))", budgetHead: "১৩৩/২৩ (সি)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-30", code: "১৩৩/২৪", name: "যাতায়াত (স্থানীয়)", description: "যাতায়াত (স্থানীয়) (১৩৩/২৪)", budgetHead: "১৩৩/২৪", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-31", code: "১৩৩/২৫", name: "বীমা", description: "বীমা (১৩৩/২৫)", budgetHead: "১৩৩/২৫", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-32", code: "১৩৩/২৬", name: "মোটর গাড়ীর জ্বালানী খরচ", description: "মোটর গাড়ীর জ্বালানী খরচ (১৩৩/২৬)", budgetHead: "১৩৩/২৬", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-33", code: "১৩৩/২৬ (এ)", name: "মোটর গাড়ী রক্ষণাবেক্ষণ", description: "মোটর গাড়ী রক্ষণাবেক্ষণ (১৩৩/২৬ (এ))", budgetHead: "১৩৩/২৬ (এ)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-34", code: "১৩৩/৩০", name: "অবচয়", description: "অবচয় (১৩৩/৩০)", budgetHead: "১৩৩/৩০", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-35", code: "১৩৩/৩২", name: "আপ্যায়ন খরচ", description: "আপ্যায়ন খরচ (১৩৩/৩২)", budgetHead: "১৩৩/৩২", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-36", code: "১৩৩/৩২ (বি)", name: "কাস্টমার কনফারেন্স/বিভিন্ন সভার আপ্যায়ন", description: "কাস্টমার কনফারেন্স/বিভিন্ন সভার আপ্যায়ন (১৩৩/৩২ (বি))", budgetHead: "১৩৩/৩২ (বি)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-37", code: "১৩৩/৩৬ (এ)", name: "কম্পিউটার পরিচালনা ব্যয়", description: "কম্পিউটার পরিচালনা ব্যয় (১৩৩/৩৬ (এ))", budgetHead: "১৩৩/৩৬ (এ)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-38", code: "১৩৩/৩৬ (সি)", name: "বিবিধ খরচ (সাধারণ)", description: "বিবিধ খরচ (সাধারণ) (১৩৩/৩৬ (সি))", budgetHead: "১৩৩/৩৬ (সি)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-39", code: "১৩৩/৩৬ (ডি)", name: "পত্রিকা বিল", description: "পত্রিকা বিল (১৩৩/৩৬ (ডি))", budgetHead: "১৩৩/৩৬ (ডি)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-40", code: "১৩৩/৩৬ (কে)", name: "হিসাব সমাপনী ভাতা", description: "হিসাব সমাপনী ভাতা (১৩৩/৩৬ (কে))", budgetHead: "১৩৩/৩৬ (কে)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true },
      { id: "cat-41", code: "১৩৪/১", name: "আসবাবপত্র সাজ-সরঞ্জাম", description: "আসবাবপত্র সাজ-সরঞ্জাম (১৩৪/১)", budgetHead: "১৩৪/১", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-42", code: "১৩৪/২", name: "অফিস সরঞ্জাম/ উপকরণ (ইকুইপমেন্ট)", description: "অফিস সরঞ্জাম/ উপকরণ (ইকুইপমেন্ট) (১৩৪/২)", budgetHead: "১৩৪/২", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-43", code: "১৩৪/৩", name: "অফিস যন্ত্রপাতি (মেশিনারিজ) কম্পিউটার", description: "অফিস যন্ত্রপাতি (মেশিনারিজ) কম্পিউটার (১৩৪/৩)", budgetHead: "১৩৪/৩", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-44", code: "১৩৪/৪", name: "বৈদ্যুতিক স্থাপনা (ফ্যান/ জেনারেটর)", description: "বৈদ্যুতিক স্থাপনা (ফ্যান/ জেনারেটর) (১৩৪/৪)", budgetHead: "১৩৪/৪", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-45", code: "১৩৩/১৯(এ)", name: "মেরামত সাধারণ (শাখার জন্য)", description: "মেরামত সাধারণ (শাখার জন্য) (১৩৩/১৯(এ))", budgetHead: "১৩৩/১৯(এ)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-46", code: "১৩৩/১৯(সি)", name: "মেরামত যন্ত্রপাতি (শাখার জন্য)", description: "মেরামত যন্ত্রপাতি (শাখার জন্য) (১৩৩/১৯(সি))", budgetHead: "১৩৩/১৯(সি)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-47", code: "১৩৩/১৯(বি)", name: "মেরামত ইমারত (শাখার জন্য)", description: "মেরামত ইমারত (শাখার জন্য) (১৩৩/১৯(বি))", budgetHead: "১৩৩/১৯(বি)", status: "Active", allowInQuotation: true, allowExcess: false, requireApproval: true },
      { id: "cat-48", code: "১৩৩/১২(বি)", name: "বেসরকারি নিরাপত্তা প্রহরী / ঝাড়ুদারের বেতন", description: "বেসরকারি নিরাপত্তা প্রহরী / ঝাড়ুদারের বেতন (১৩৩/১২(বি))", budgetHead: "১৩৩/১২(বি)", status: "Active", allowInQuotation: false, allowExcess: false, requireApproval: true }
    ];

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
      message: "বাংলাদেশ কৃষি ব্যাংকের প্রমিত অফিস ও ব্যয়ের খাতসমূহ সফলভাবে রিকভার করা হয়েছে।",
      officesCount: restoredOfficesCount,
      categoriesCount: restoredCategoriesCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SQLite Database Management & Diagnostics Endpoints
// ----------------------------------------------------
app.get("/api/database/status", requireAuth, async (req, res) => {
  try {
    const stats = await getSqliteStats();
    res.json({
      engine: stats.isRemote ? "Remote Cloud LibSQL / Turso" : "SQLite (WAL Mode)",
      isRemote: stats.isRemote,
      remoteUrl: stats.remoteUrl,
      status: "Connected & Synchronized",
      location: stats.dbPath,
      sizeBytes: stats.sizeBytes,
      sizeFormatted: stats.isRemote ? "Cloud-Hosted" : `${(stats.sizeBytes / 1024).toFixed(2)} KB`,
      tables: stats.tableCounts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/database/download", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "Super Admin" && user.role !== "Head Office Admin") {
    return res.status(403).json({ error: "Forbidden: Only Admin can download raw database" });
  }

  // Ensure WAL is committed into database.sqlite before download
  await checkpointWal();

  const sqliteFile = path.join(DATA_DIR, "database.sqlite");
  if (!fs.existsSync(sqliteFile)) {
    return res.status(404).json({ error: "database.sqlite file not found" });
  }
  res.download(sqliteFile, `database-${new Date().toISOString().split("T")[0]}.sqlite`);
});

app.get("/api/database/export-json", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "Super Admin" && user.role !== "Head Office Admin") {
    return res.status(403).json({ error: "Forbidden: Only Admin can export database JSON" });
  }

  await checkpointWal();
  const allData = getAllDataMap();
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    system: "Office Allocation & Expense Management",
    version: "2.0.0",
    data: allData
  };

  const filename = `backup-${new Date().toISOString().split("T")[0]}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(exportPayload, null, 2));
});

app.post("/api/database/restore", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "Super Admin" && user.role !== "Head Office Admin") {
    return res.status(403).json({ error: "Forbidden: Only Admin can restore database" });
  }

  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data || typeof base64Data !== "string") {
      return res.status(400).json({ error: "ফাইল ডাটা পাওয়া যায়নি। / File data is required." });
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
      await addAuditLog(user.userId, "RESTORE_DATABASE_SQLITE", "System", "database.sqlite", "Restored full SQLite database file");
      return res.json({ success: true, message: "SQLite ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে।" });
    } else if (nameLower.endsWith(".json")) {
      const rawText = buffer.toString("utf8");
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (pe: any) {
        return res.status(400).json({ error: "JSON ফাইলটি বৈধ নয়। / Invalid JSON file format." });
      }

      const dataMap = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
      const count = await restoreFromDataMap(dataMap, DATA_DIR);
      await addAuditLog(user.userId, "RESTORE_DATABASE_JSON", "System", "AllSheets", `Restored ${count} records from JSON backup`);
      return res.json({ success: true, message: `JSON ব্যাকআপ থেকে ${count} টি রেকর্ড সফলভাবে রিস্টোর করা হয়েছে।`, count });
    } else {
      return res.status(400).json({ error: "শুধুমাত্র .sqlite অথবা .json ফাইল সমর্থিত।" });
    }
  } catch (err: any) {
    console.error("[Restore Error]:", err);
    res.status(500).json({ error: err.message || "Database restore failed" });
  }
});

app.post("/api/database/checkpoint", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "Super Admin" && user.role !== "Head Office Admin") {
    return res.status(403).json({ error: "Forbidden: Admin privilege required" });
  }
  try {
    await checkpointWal();
    res.json({ success: true, message: "WAL Checkpoint executed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/database/query", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "Super Admin" && user.role !== "Head Office Admin") {
    return res.status(403).json({ error: "Forbidden: Admin privilege required for direct SQL" });
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

// Fallback handler for unmatched API routes - guarantees a JSON response and prevents returning HTML
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl || req.url}` });
});

async function startServer() {
  await initSqlite(DATA_DIR, initialData);

  // Ensure note sheets are synchronized according to current templates and rules
  try {
    const expenses = getSheetData("Expenses");
    const noteSheets = getSheetData("NoteSheets");
    for (const exp of expenses) {
      const existingNs = noteSheets.find((ns: any) => ns.expenseId === exp.id || ns.id === exp.noteSheetId);
      const isForm2 = exp.expenseType === "Quotation" && exp.quotationFormType === "Form2";
      if (!existingNs || !existingNs.isCustomEdited || isForm2) {
        await syncNoteSheetForExpense(exp, "system", true);
      }
    }
  } catch (e) {
    console.warn("NoteSheet startup sync warning:", e);
  }

  // Vite middleware setup for development
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
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
      console.log(`Allocation & Expense Management Server running on port ${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  startServer();
}
