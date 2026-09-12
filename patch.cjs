const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add filtering for Sub-office User fetching Users
code = code.replace(
  `if (user.role === "Sub-office User" && ["Allocations", "Expenses", "NoteSheets"].includes(sheet)) {\n        data = data.filter((item: any) => item.officeId === user.officeId);\n      }`,
  `if (user.role === "Sub-office User" && ["Allocations", "Expenses", "NoteSheets"].includes(sheet)) {\n        data = data.filter((item: any) => item.officeId === user.officeId);\n      }\n      if (user.role === "Sub-office User" && sheet === "Users") {\n        data = data.filter((item: any) => item.officeId === user.officeId);\n      }`
);

// 2. Add /api/auth/propose-user endpoint
const proposeEndpoint = `
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
      const exists = users.find((u: any) => (u.userId || "").toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === (email || "").toLowerCase()));
      if (exists) {
        const err: any = new Error("User ID or Email already exists in the system.");
        err.statusCode = 409;
        throw err;
      }
      
      const newId = \`u_\${Date.now()}\`;
      const randomSalt = crypto.randomBytes(16).toString("hex");
      const randomHash = hashPassword(crypto.randomBytes(8).toString("hex"), randomSalt, 60000);
      
      const newUser = {
        id: newId,
        userId: cleanId,
        name: name.trim(),
        email: (email || "").trim(),
        role: "Sub-office User",
        officeId: proposer.officeId, // Inherit office ID from proposer
        designation: designation || "",
        passwordHash: randomHash,
        passwordSalt: randomSalt,
        status: "Pending", // Admin must approve
        mustChangePassword: true
      };
      
      users.push(newUser);
      await saveSheetData("Users", users);
      
      addAuditLog(proposer.userId, "USER_PROPOSAL", "Users", newId, \`Proposed new colleague: \${cleanId}\`);
      return { success: true, message: "User proposal submitted successfully." };
    });
    
    res.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

`;

code = code.replace(
  'app.post("/api/auth/login", async (req, res) => {',
  proposeEndpoint + 'app.post("/api/auth/login", async (req, res) => {'
);

fs.writeFileSync('server.ts', code);
