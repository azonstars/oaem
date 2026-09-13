// Default data and template configurations for initial database seeding and restoration

export const initialData: Record<string, any[]> = {
  NoteTemplates: [
    {
      id: "tpl-form1-quotation",
      title: "ফর্ম-১: দরপত্র ও কোটেশন ক্রয় অনুমোদন নোটশীট (কাস্টম টেমপ্লেট)",
      categoryId: "all",
      bodyTemplate: `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
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
      userId: "usr-1",
    },
    {
      id: "tpl-form2-quotation",
      title:
        "ফর্ম-২: মুদ্রিত মনিহারী দ্রব্য মুদ্রণ দরপত্র তুলনামূলক বিবরণী ও নোটশীট (কাস্টম টেমপ্লেট)",
      categoryId: "cat-2",
      bodyTemplate: `<div style="font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; font-size: 15px; line-height: 1.6; text-align: justify;">
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
      userId: "usr-1",
    },
  ],
  OpeningBalances: [],
  AuditLogs: [],
};

export const officialOffices = [
  {
    id: "off-ho",
    name: "আঞ্চলিক কার্যালয়, রাঙ্গামাটি",
    type: "HeadOffice",
    code: "RO-3300",
    address: "বনরূপা, রাঙ্গামাটি",
    status: "Active",
  },
  {
    id: "off-bo-3301",
    name: "কাপ্তাই শাখা (3301)",
    type: "SubOffice",
    code: "BO-3301",
    address: "নতুন বাজার, কাপ্তাই, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3302",
    name: "রাইখালী বাজার শাখা (3302)",
    type: "SubOffice",
    code: "BO-3302",
    address: "রাইখালী বাজার, কাপ্তাই, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3303",
    name: "বিলাইছড়ি শাখা (3303)",
    type: "SubOffice",
    code: "BO-3303",
    address: "বিলাইছড়ি, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3304",
    name: "রাজস্থলী শাখা (3304)",
    type: "SubOffice",
    code: "BO-3304",
    address: "রাজস্থলী, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3501",
    name: "রাঙ্গামাটি শাখা (3501)",
    type: "SubOffice",
    code: "BO-3501",
    address: "রাঙ্গামাটি সদর, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3502",
    name: "নানিয়ারচর শাখা (3502)",
    type: "SubOffice",
    code: "BO-3502",
    address: "নানিয়ারচর, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3503",
    name: "বরকল শাখা (3503)",
    type: "SubOffice",
    code: "BO-3503",
    address: "বরকল, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3504",
    name: "লংগদু শাখা (3504)",
    type: "SubOffice",
    code: "BO-3504",
    address: "লংগদু, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3505",
    name: "কাউখালী শাখা (3505)",
    type: "SubOffice",
    code: "BO-3505",
    address: "কলমপতি, কাউখালী, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3506",
    name: "জুড়াছড়ি শাখা (3506)",
    type: "SubOffice",
    code: "BO-3506",
    address: "জুড়াছড়ি, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
  {
    id: "off-bo-3507",
    name: "বাঘাইছড়ি শাখা (3507)",
    type: "SubOffice",
    code: "BO-3507",
    address: "মারিশ্যা, বাঘাইছড়ি, রাঙ্গামাটি",
    parentOfficeId: "off-ho",
    status: "Active",
  },
];

export const officialCategories = [
  {
    id: "cat-1",
    code: "৪১/৮৬",
    name: "আয়কর অগ্রিম কর্তন",
    description: "আয়কর অগ্রিম কর্তন (৪১/৮৬)",
    budgetHead: "৪১/৮৬",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-2",
    code: "১৩২",
    name: "মুদ্রিত মনোহারী মুদ্রণ",
    description: "মুদ্রিত মনোহারী মুদ্রণ (১৩২)",
    budgetHead: "১৩২",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-3",
    code: "১৩৩/২",
    name: "কর্মকর্তাদের বেতন",
    description: "কর্মকর্তাদের বেতন (১৩৩/২)",
    budgetHead: "১৩৩/২",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-4",
    code: "১৩৩/৩",
    name: "কর্মচারীদের বেতন",
    description: "কর্মচারীদের বেতন (১৩৩/৩)",
    budgetHead: "১৩৩/৩",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-5",
    code: "১৩৩/৪",
    name: "বাড়ি ভাড়া ভাতা",
    description: "বাড়ি ভাড়া ভাতা (১৩৩/৪)",
    budgetHead: "১৩৩/৪",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-6",
    code: "১৩৩/৫",
    name: "অধিকাল ভাতা",
    description: "অধিকাল ভাতা (১৩৩/৫)",
    budgetHead: "১৩৩/৫",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-7",
    code: "১৩৩/৬",
    name: "অন্যান্য ভাতা (যাতায়াত, টিফিন, ধোলাই)",
    description: "অন্যান্য ভাতা (যাতায়াত, টিফিন, ধোলাই) (১৩৩/৬)",
    budgetHead: "১৩৩/৬",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-8",
    code: "১৩৩/৬ (বি)",
    name: "ছুটির নগদায়ন",
    description: "ছুটির নগদায়ন (১৩৩/৬ (বি))",
    budgetHead: "১৩৩/৬ (বি)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-9",
    code: "১৩৩/৬ (সি)",
    name: "মধ্যাহ্ন ভোজ/ ইফতারি ভাতা",
    description: "মধ্যাহ্ন ভোজ/ ইফতারি ভাতা (১৩৩/৬ (সি))",
    budgetHead: "১৩৩/৬ (সি)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-10",
    code: "১৩৩/৬ (ই)",
    name: "শ্রান্তি বিনোদন ভাতা",
    description: "শ্রান্তি বিনোদন ভাতা (১৩৩/৬ (ই))",
    budgetHead: "১৩৩/৬ (ই)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-11",
    code: "১৩৩/৭",
    name: "ভ্রমণ ভাতা (সাধারণ)",
    description: "ভ্রমণ ভাতা (সাধারণ) (১৩৩/৭)",
    budgetHead: "১৩৩/৭",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-12",
    code: "১৩৩/৮",
    name: "কর্মচারীদের পোশাক",
    description: "কর্মচারীদের পোশাক (১৩৩/৮)",
    budgetHead: "১৩৩/৮",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-13",
    code: "১৩৩/৯",
    name: "চিকিৎসা ভাতা",
    description: "চিকিৎসা ভাতা (১৩৩/৯)",
    budgetHead: "১৩৩/৯",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-14",
    code: "১৩৩/৯ এ",
    name: "শিশু শিক্ষা ভাতা",
    description: "শিশু শিক্ষা ভাতা (১৩৩/৯ এ)",
    budgetHead: "১৩৩/৯ এ",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-15",
    code: "১৩৩/১০",
    name: "বদলী/ প্রশিক্ষণ ভাতা",
    description: "বদলী/ প্রশিক্ষণ ভাতা (১৩৩/১০)",
    budgetHead: "১৩৩/১০",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-16",
    code: "১৩৩/১৩(বি)",
    name: "মাঠ পর্যায়ে সম্মেলন (আঃ কাঃ)",
    description: "মাঠ পর্যায়ে সম্মেলন (আঃ কাঃ) (১৩৩/১৩(বি))",
    budgetHead: "১৩৩/১৩(বি)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-17",
    code: "১৩৩/১৪",
    name: "উৎসব বোনাস",
    description: "উৎসব বোনাস (১৩৩/১৪)",
    budgetHead: "১৩৩/১৪",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-18",
    code: "১৩৩/১৫",
    name: "সুপারএনুয়েশন",
    description: "সুপারএনুয়েশন (১৩৩/১৫)",
    budgetHead: "১৩৩/১৫",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-19",
    code: "১৩৩/১৭",
    name: "বিদ্যুৎ ও পানি",
    description: "বিদ্যুৎ ও পানি (১৩৩/১৭)",
    budgetHead: "১৩৩/১৭",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-20",
    code: "১৩৩/১৮",
    name: "অফিস/ কার্যালয় ভাড়া",
    description: "অফিস/ কার্যালয় ভাড়া (১৩৩/১৮)",
    budgetHead: "১৩৩/১৮",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-21",
    code: "১৩৩/১৮ বি",
    name: "অফিস/ কার্যালয় ভাড়ার উপর ভ্যাট ১৫%",
    description: "অফিস/ কার্যালয় ভাড়ার উপর ভ্যাট ১৫% (১৩৩/১৮ বি)",
    budgetHead: "১৩৩/১৮ বি",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-22",
    code: "১৩৩/১৯ (এ)",
    name: "মেরামত ও নবায়ন (সাধারণ) আঃ কাঃ",
    description: "মেরামত ও নবায়ন (সাধারণ) আঃ কাঃ (১৩৩/১৯ (এ))",
    budgetHead: "১৩৩/১৯ (এ)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-23",
    code: "১৩৩/১৯ (বি)",
    name: "মেরামত ও নবায়ন (ইমারত)",
    description: "মেরামত ও নবায়ন (ইমারত) (১৩৩/১৯ (বি))",
    budgetHead: "১৩৩/১৯ (বি)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-24",
    code: "১৩৩/১৯ (সি)",
    name: "মেরামত ও নবায়ন অফিস যন্ত্রপাতি",
    description: "মেরামত ও নবায়ন অফিস যন্ত্রপাতি (১৩৩/১৯ (সি))",
    budgetHead: "১৩৩/১৯ (সি)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-25",
    code: "১৩৩/২০",
    name: "কর/ ট্যাক্স (গাড়ী)",
    description: "কর/ ট্যাক্স (গাড়ী) (১৩৩/২০)",
    budgetHead: "১৩৩/২০",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-26",
    code: "১৩৩/২১ (বি)",
    name: "স্থানীয় মনোহারী দ্রব্য ক্রয়",
    description: "স্থানীয় মনোহারী দ্রব্য ক্রয় (১৩৩/২১ (বি))",
    budgetHead: "১৩৩/২১ (বি)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-27",
    code: "১৩৩/২২",
    name: "ডাক/ কুরিয়ার খরচ",
    description: "ডাক/ কুরিয়ার খরচ (১৩৩/২২)",
    budgetHead: "১৩৩/২২",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-28",
    code: "১৩৩/২৩ (এ)",
    name: "টেলিফোন দাপ্তরিক",
    description: "টেলিফোন দাপ্তরিক (১৩৩/২৩ (এ))",
    budgetHead: "১৩৩/২৩ (এ)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-29",
    code: "১৩৩/২৩ (সি)",
    name: "ইন্টারনেট (মডেম খরচ)",
    description: "ইন্টারনেট (মডেম খরচ) (১৩৩/২৩ (সি))",
    budgetHead: "১৩৩/২৩ (সি)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-30",
    code: "১৩৩/২৪",
    name: "যাতায়াত (স্থানীয়)",
    description: "যাতায়াত (স্থানীয়) (১৩৩/২৪)",
    budgetHead: "১৩৩/২৪",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-31",
    code: "১৩৩/২৫",
    name: "বীমা",
    description: "বীমা (১৩৩/২৫)",
    budgetHead: "১৩৩/২৫",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-32",
    code: "১৩৩/২৬",
    name: "মোটর গাড়ীর জ্বালানী খরচ",
    description: "মোটর গাড়ীর জ্বালানী খরচ (১৩৩/২৬)",
    budgetHead: "১৩৩/২৬",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-33",
    code: "১৩৩/২৬ (এ)",
    name: "মোটর গাড়ী রক্ষণাবেক্ষণ",
    description: "মোটর গাড়ী রক্ষণাবেক্ষণ (১৩৩/২৬ (এ))",
    budgetHead: "১৩৩/২৬ (এ)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-34",
    code: "১৩৩/৩০",
    name: "অবচয়",
    description: "অবচয় (১৩৩/৩০)",
    budgetHead: "১৩৩/৩০",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-35",
    code: "১৩৩/৩২",
    name: "আপ্যায়ন খরচ",
    description: "আপ্যায়ন খরচ (১৩৩/৩২)",
    budgetHead: "১৩৩/৩২",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-36",
    code: "১৩৩/৩২ (বি)",
    name: "কাস্টমার কনফারেন্স/বিভিন্ন সভার আপ্যায়ন",
    description: "কাস্টমার কনফারেন্স/বিভিন্ন সভার আপ্যায়ন (১৩৩/৩২ (বি))",
    budgetHead: "১৩৩/৩২ (বি)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-37",
    code: "১৩৩/৩৬ (এ)",
    name: "কম্পিউটার পরিচালনা ব্যয়",
    description: "কম্পিউটার পরিচালনা ব্যয় (১৩৩/৩৬ (এ))",
    budgetHead: "১৩৩/৩৬ (এ)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-38",
    code: "১৩৩/৩৬ (সি)",
    name: "বিবিধ খরচ (সাধারণ)",
    description: "বিবিধ খরচ (সাধারণ) (১৩৩/৩৬ (সি))",
    budgetHead: "১৩৩/৩৬ (সি)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-39",
    code: "১৩৩/৩৬ (ডি)",
    name: "পত্রিকা বিল",
    description: "পত্রিকা বিল (১৩৩/৩৬ (ডি))",
    budgetHead: "১৩৩/৩৬ (ডি)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-40",
    code: "১৩৩/৩৬ (কে)",
    name: "হিসাব সমাপনী ভাতা",
    description: "হিসাব সমাপনী ভাতা (১৩৩/৩৬ (কে))",
    budgetHead: "১৩৩/৩৬ (কে)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-41",
    code: "১৩৪/১",
    name: "আসবাবপত্র সাজ-সরঞ্জাম",
    description: "আসবাবপত্র সাজ-সরঞ্জাম (১৩৪/১)",
    budgetHead: "১৩৪/১",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-42",
    code: "১৩৪/২",
    name: "অফিস সরঞ্জাম/ উপকরণ (ইকুইপমেন্ট)",
    description: "অফিস সরঞ্জাম/ উপকরণ (ইকুইপমেন্ট) (১৩৪/২)",
    budgetHead: "১৩৪/২",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-43",
    code: "১৩৪/৩",
    name: "অফিস যন্ত্রপাতি (মেশিনারিজ) কম্পিউটার",
    description: "অফিস যন্ত্রপাতি (মেশিনারিজ) কম্পিউটার (১৩৪/৩)",
    budgetHead: "১৩৪/৩",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-44",
    code: "১৩৪/৪",
    name: "বৈদ্যুতিক স্থাপনা (ফ্যান/ জেনারেটর)",
    description: "বৈদ্যুতিক স্থাপনা (ফ্যান/ জেনারেটর) (১৩৪/৪)",
    budgetHead: "১৩৪/৪",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-45",
    code: "১৩৩/১৯(এ)",
    name: "মেরামত সাধারণ (শাখার জন্য)",
    description: "মেরামত সাধারণ (শাখার জন্য) (১৩৩/১৯(এ))",
    budgetHead: "১৩৩/১৯(এ)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-46",
    code: "১৩৩/১৯(সি)",
    name: "মেরামত যন্ত্রপাতি (শাখার জন্য)",
    description: "মেরামত যন্ত্রপাতি (শাখার জন্য) (১৩৩/১৯(সি))",
    budgetHead: "১৩৩/১৯(সি)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-47",
    code: "১৩৩/১৯(বি)",
    name: "মেরামত ইমারত (শাখার জন্য)",
    description: "মেরামত ইমারত (শাখার জন্য) (১৩৩/১৯(বি))",
    budgetHead: "১৩৩/১৯(বি)",
    status: "Active",
    allowInQuotation: true,
    allowExcess: false,
    requireApproval: true,
  },
  {
    id: "cat-48",
    code: "১৩৩/১২(বি)",
    name: "বেসরকারি নিরাপত্তা প্রহরী / ঝাড়ুদারের বেতন",
    description: "বেসরকারি নিরাপত্তা প্রহরী / ঝাড়ুদারের বেতন (১৩৩/১২(বি))",
    budgetHead: "১৩৩/১২(বি)",
    status: "Active",
    allowInQuotation: false,
    allowExcess: false,
    requireApproval: true,
  },
];
