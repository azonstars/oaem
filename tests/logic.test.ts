import { describe, it, expect, beforeEach } from "vitest";
import { getAvailableBalance, computeExpenseAmounts } from "../server";
import { saveDbSheetData } from "../sqlite";

describe("Backend Logic Unit Tests", () => {
  describe("computeExpenseAmounts", () => {
    it("should calculate amounts correctly without tax/VAT", () => {
      const res = computeExpenseAmounts(1000, 0, 0);
      expect(res.baseAmount).toBe(1000);
      expect(res.vatAmount).toBe(0);
      expect(res.taxAmount).toBe(0);
      expect(res.netPayable).toBe(1000);
      expect(res.grossAmount).toBe(1000);
    });

    it("should calculate amounts correctly with tax and VAT", () => {
      const res = computeExpenseAmounts(1000, 15, 10);
      expect(res.vatAmount).toBe(150); // 1000 * 15%
      expect(res.taxAmount).toBe(100); // 1000 * 10%
      expect(res.netPayable).toBe(750); // 1000 - 150 - 100
      expect(res.baseAmount).toBe(1000);
      expect(res.grossAmount).toBe(1000);
    });
  });

  describe("getAvailableBalance", () => {
    beforeEach(async () => {
      await saveDbSheetData("Allocations", [
        {
          id: "alc-test-1",
          financialYearId: "fy-test",
          officeId: "off-test",
          categoryId: "cat-test",
          type: "Initial",
          allocatedAmount: 50000
        }
      ]);
      await saveDbSheetData("Expenses", [
        {
          id: "exp-test-1",
          financialYearId: "fy-test",
          officeId: "off-test",
          categoryId: "cat-test",
          amount: 10000,
          status: "Approved"
        }
      ]);
    });

    it("should calculate correctly based on allocations and expenses", () => {
      const balance = getAvailableBalance("fy-test", "off-test", "cat-test");
      expect(balance.allocated).toBe(50000);
      expect(balance.spent).toBe(10000);
      expect(balance.available).toBe(40000);
    });
  });
});
