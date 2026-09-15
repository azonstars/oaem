#!/bin/bash
sed -i 's/const sanctionMemoNo = proposal.sanctionMemoNo || "প্রশ-১(১৪)\/২০২৫-২০২৬\/";/const sanctionMemoNo = proposal.sanctionMemoNo || "প্রশা-১(১৪)\/২০২৫-২০২৬\/";/' server.ts

sed -i 's/const subjectText = isBudget/const isRepair = isRepairWork(proposal.description);\n  const vendorType = isRepair ? "মেরামতকারী" : "সরবরাহকারী";\n\n  const subjectText = isBudget/' server.ts

sed -i 's/শাখায় ব্যবহৃত ${proposal.description || "-"} এর বিল/শাখায় ব্যবহৃত ${proposal.description || "-"} বিল/g' server.ts

sed -i 's/বিকেবি, ${office?.name || "শাখা"} এর জন্য ${proposal.description || "-"} করতে: মেরামতকারী প্রতিষ্ঠান/বিকেবি, ${office?.name || "শাখা"} শাখা এর জন্য ${proposal.description || "-"} করতে: ${vendorType} প্রতিষ্ঠান/g' server.ts

sed -i 's/হতে ${proposal.vatRate || 10}% ভ্যাটসহ ${formattedAmount}\/-/হতে ${proposal.vatRate || 10}% ভ্যাটসহ ৳=${formattedAmount}\/-/g' server.ts

sed -i 's/বিকেবি, ${office?.name || "শাখা"} এর জন্য ${proposal.description || "-"} বাবদ ${proposal.vatRate || 10}% ভ্যাটসহ মোট ${formattedAmount}\/-/বিকেবি, ${office?.name || "শাখা"} শাখা এর জন্য ${proposal.description || "-"} বাবদ ${proposal.vatRate || 10}% ভ্যাটসহ মোট ৳=${formattedAmount}\/-/g' server.ts
