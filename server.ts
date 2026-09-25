import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import {
  initSqlite,
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
import {
  DATA_DIR,
  getSheetData,
  saveSheetData,
  addAuditLog,
  getAvailableBalance,
  isFYClosed,
} from "./server/data-store.js";
import {
  syncNoteSheetForExpense,
  syncNoteSheetForPostFactoProposal,
} from "./server/notesheet-sync.js";

export const app = express();
const PORT = 3000;

export {
  createToken,
  verifyToken,
  requireRole,
  requireAuth,
  hashPassword,
  computeExpenseAmounts,
  convertToBengaliNumber,
  numberToBengaliWords,
  isFYClosed,
  getAvailableBalance,
  getSheetData,
  saveSheetData,
};

function validateReferentialIntegrity(sheet: string, payload: any) {
  return validateReferentialIntegritySchema(sheet, payload, getSheetData);
}

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

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
    const categories = getSheetData("Categories");
    const noteSheets = getSheetData("NoteSheets");
    let noteSheetsModified = false;
    for (const exp of expenses) {
      const expCategory = categories.find((c: any) => c.id === exp.categoryId);
      const is133_26 =
        exp.categoryId === "cat-32" ||
        (expCategory?.code &&
          (expCategory.code === "১৩৩/২৬" || expCategory.code === "133/26"));

      const existingNs = noteSheets.find(
        (ns: any) => ns.expenseId === exp.id || ns.id === exp.noteSheetId,
      );

      if (is133_26 && existingNs) {
        if (
          existingNs.applicationContent !== undefined ||
          existingNs.supplyOrderContent !== undefined
        ) {
          delete existingNs.applicationContent;
          delete existingNs.supplyOrderContent;
          noteSheetsModified = true;
        }
      }

      const isForm2 =
        exp.expenseType === "Quotation" && exp.quotationFormType === "Form2";
      if (!existingNs || !existingNs.isCustomEdited || isForm2 || is133_26) {
        await syncNoteSheetForExpense(exp, "system", true);
      }
    }
    if (noteSheetsModified) {
      await saveSheetData("NoteSheets", noteSheets);
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
    try {
      const expenses = getSheetData("Expenses");
      const categories = getSheetData("Categories");
      for (const exp of expenses) {
        const cat = categories.find((c: any) => c.id === exp.categoryId);
        const is133 = Boolean(
          (cat?.code &&
            (cat.code.startsWith("১৩৩/") || cat.code.startsWith("133/"))) ||
            cat?.id === "cat-33",
        );
        if (is133) {
          await syncNoteSheetForExpense(
            exp,
            exp.entryOfficer?.userId || "system",
            false,
          );
        }
      }
    } catch (_e) {
      console.warn("Auto-sync 133 series note sheets on boot error:", _e);
    }

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