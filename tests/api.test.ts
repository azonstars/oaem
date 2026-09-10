import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app, createToken } from "../server";

describe("API Integration Tests", () => {
  let adminToken: string;
  let subOfficeToken: string;

  beforeAll(() => {
    adminToken = createToken({
      id: "usr-1",
      userId: "admin",
      role: "Head Office Admin",
      officeId: "off-ho"
    });
    subOfficeToken = createToken({
      id: "usr-2",
      userId: "ctg_manager",
      role: "Sub-office User",
      officeId: "off-sub1"
    });
  });

  describe("Authentication", () => {
    it("should return 401 on unauthorized access without token", async () => {
      const res = await request(app).get("/api/expenses");
      expect(res.status).toBe(401);
    });

    it("should return 401 on bad/expired token", async () => {
      const res = await request(app)
        .get("/api/expenses")
        .set("Authorization", "Bearer invalid.token.here");
      expect(res.status).toBe(401);
    });
  });

  describe("Data Isolation & Authorization", () => {
    it("sub-office users cannot delete expenses from other offices", async () => {
      // Sub-office user (off-sub1) trying to delete an expense from Sylhet Branch (off-sub2, exp-3)
      const res = await request(app)
        .delete("/api/expenses/exp-3")
        .set("Authorization", `Bearer ${subOfficeToken}`);
      
      // Must be forbidden (403)
      expect([403, 404]).toContain(res.status);
    });
  });

  describe("Overspend Validation", () => {
    it("should return 422 Unprocessable Entity when creating expense exceeding available balance", async () => {
      const res = await request(app)
        .post("/api/expenses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          financialYearId: "fy-2",
          officeId: "off-ho", // Head Office
          categoryId: "cat-1", // Salary
          amount: 9999999999, // Exceeds allocation
          voucherNo: "V-TEST-999",
          voucherDate: "2025-08-01",
          expenseDate: "2025-08-01",
          description: "Test overspend",
          status: "Pending",
          applicant: { type: "OwnOffice", name: "Test" },
          entryOfficer: { name: "Test", designation: "Test", officeId: "off-ho" }
        });
        
      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("Financial Year Fetching", () => {
    it("should fetch financial years successfully with valid admin token", async () => {
      const res = await request(app)
        .get("/api/financialyears")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
