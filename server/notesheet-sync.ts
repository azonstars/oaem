import {
  getSheetData,
  saveSheetData,
  getAvailableBalance,
} from "./data-store.js";
import { isCategory134 } from "./utils.js";
import {
  renderExpenseNoteSheetContent,
  isFuelCategory,
  generateMotorFuelForwardingHtml,
  generateMotorFuelApplicationHtml,
  generateMotorVehicleApplicationHtml,
  generateMotorVehicleForwardingLetterHtml,
  generateMotorFuelSupplyOrderHtml,
  generateForm1ForwardingHtml,
  generateForm1SupplyOrderHtml,
  generatePostFactoNoteSheetHtml,
  generatePostFactoForwardingHtml,
  generatePostFactoSupplyOrderHtml,
  generatePostFactoSanctionNoteSheetHtml,
  generatePostFactoSanctionLetterHtml,
} from "./document-generators.js";

export async function syncNoteSheetForExpense(
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

  let applicationContent = undefined;
  let forwardingContent = undefined;
  let supplyOrderContent = undefined;

  const is133Series = Boolean(
    (category?.code &&
      (category.code.startsWith("১৩৩/") || category.code.startsWith("133/"))) ||
    category?.id === "cat-32" ||
    category?.id === "cat-33"
  );

  const is133_26 = category?.id === "cat-32" || (category?.code && (category.code === "১৩৩/২৬" || category.code === "133/26"));

  if (is133Series) {
    if (is133_26) {
      applicationContent = undefined;
      forwardingContent = generateMotorFuelForwardingHtml(expense, office, category, fy, balanceInfo);
      supplyOrderContent = undefined;
    } else {
      const docType = expense.motorDocType || "all";
      const isFuel = isFuelCategory(category);

      if (docType === "application") {
        applicationContent = isFuel
          ? generateMotorFuelApplicationHtml(expense, office, category, fy, balanceInfo)
          : generateMotorVehicleApplicationHtml(expense, office, category, fy, balanceInfo);
        forwardingContent = applicationContent;
      } else if (docType === "forwarding") {
        forwardingContent = isFuel
          ? generateMotorFuelForwardingHtml(expense, office, category, fy, balanceInfo)
          : generateMotorVehicleForwardingLetterHtml(expense, office, category, fy, balanceInfo);
      } else if (docType === "supplyorder") {
        supplyOrderContent = isFuel
          ? generateMotorFuelSupplyOrderHtml(expense, office, category, fy, balanceInfo)
          : generateForm1SupplyOrderHtml(expense, office, category, fy, balanceInfo);
      } else if (docType === "all") {
        applicationContent = isFuel
          ? generateMotorFuelApplicationHtml(expense, office, category, fy, balanceInfo)
          : generateMotorVehicleApplicationHtml(expense, office, category, fy, balanceInfo);
        forwardingContent = isFuel
          ? generateMotorFuelForwardingHtml(expense, office, category, fy, balanceInfo)
          : generateMotorVehicleForwardingLetterHtml(expense, office, category, fy, balanceInfo);
        supplyOrderContent = isFuel
          ? generateMotorFuelSupplyOrderHtml(expense, office, category, fy, balanceInfo)
          : generateForm1SupplyOrderHtml(expense, office, category, fy, balanceInfo);
      }
    }
  } else if (
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
      applicationContent: is133_26 ? undefined : (
        applicationContent !== undefined
          ? applicationContent
          : noteSheets[nsIndex].applicationContent
      ),
      forwardingContent: is133_26 ? forwardingContent : (
        forwardingContent !== undefined
          ? forwardingContent
          : noteSheets[nsIndex].forwardingContent
      ),
      supplyOrderContent: is133_26 ? undefined : (
        supplyOrderContent !== undefined
          ? supplyOrderContent
          : noteSheets[nsIndex].supplyOrderContent
      ),
      motorDocType: is133_26 ? "forwarding" : (expense.motorDocType || "all"),
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
      applicationContent: is133_26 ? undefined : applicationContent,
      forwardingContent: is133_26 ? forwardingContent : forwardingContent,
      supplyOrderContent: is133_26 ? undefined : supplyOrderContent,
      motorDocType: is133_26 ? "forwarding" : (expense.motorDocType || "all"),
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


export async function syncNoteSheetForPostFactoProposal(
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
