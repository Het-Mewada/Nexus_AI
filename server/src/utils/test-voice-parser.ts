import { voiceExpenseService } from "../services/voice-expense.service";

const sampleCategories = [
  { id: "cat-1", name: "Food" },
  { id: "cat-2", name: "Transportation" },
  { id: "cat-3", name: "Shopping" },
  { id: "cat-4", name: "Groceries" },
  { id: "cat-5", name: "Entertainment" },
  { id: "cat-6", name: "Utilities" },
  { id: "cat-7", name: "Personal" },
];

const testCases = [
  // Basic
  { category: "Basic", text: "Spent 500 on food", expectAmount: 500, expectCat: "Food" },
  { category: "Basic", text: "Paid ₹1000 for groceries", expectAmount: 1000, expectCat: "Groceries" },
  { category: "Basic", text: "I spent 250 rupees", expectAmount: 250 },

  // Dates
  { category: "Dates", text: "Spent ₹500 yesterday", expectAmount: 500, expectDateRelative: -1 },
  { category: "Dates", text: "Spent ₹700 last Monday", expectAmount: 700 },
  { category: "Dates", text: "Paid ₹900 this morning", expectAmount: 900, expectDateRelative: 0 },

  // Merchants
  { category: "Merchants", text: "Spent ₹450 at Starbucks", expectAmount: 450, expectMerchant: "Starbucks" },
  { category: "Merchants", text: "Paid 1200 at D-Mart for groceries", expectAmount: 1200, expectMerchant: "D-Mart" },

  // Payment Methods
  { category: "Payment Methods", text: "Spent ₹800 using UPI", expectAmount: 800, expectPaymentMethod: "upi" },
  { category: "Payment Methods", text: "Paid ₹2000 using my HDFC credit card", expectAmount: 2000, expectPaymentMethod: "debit_card" },

  // Natural Language
  { category: "Natural Language", text: "I grabbed dinner with friends and spent around 850 bucks.", expectAmount: 850, expectCat: "Food" },
  { category: "Natural Language", text: "Just paid 1.2k for groceries.", expectAmount: 1200, expectCat: "Groceries" },
  { category: "Natural Language", text: "Yesterday I spent two thousand five hundred on shopping.", expectAmount: 2500, expectCat: "Shopping" },

  // Ambiguous (Must NOT guess silent fake amounts)
  { category: "Ambiguous", text: "I spent some money yesterday.", expectNullAmount: true },
  { category: "Ambiguous", text: "Paid for dinner.", expectNullAmount: true },
  { category: "Ambiguous", text: "Spent around 500 or 600.", expectAmountRange: [500, 600] },
];

async function runTestSuite() {
  console.log("==================================================");
  console.log("    VOICE ASSISTANT PARSER ACCURACY TEST SUITE    ");
  console.log("==================================================\n");

  const referenceDate = "2026-08-28";
  let passedCount = 0;
  let totalCount = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i]!;
    console.log(`[Test ${i + 1}/${totalCount}] [Group: ${tc.category}] "${tc.text}"`);

    try {
      const res = await voiceExpenseService.parseVoiceExpense(
        tc.text,
        sampleCategories,
        "INR",
        "Asia/Kolkata",
        referenceDate
      );


      const amountVal = res.fields.amount.value;
      const amountConf = res.fields.amount.confidence;
      const catVal = res.fields.category.value;
      const merchantVal = res.fields.merchant.value;
      const pmVal = res.fields.payment_method.value;
      const dateVal = res.fields.date.value;

      console.log(`   -> Extracted Amount: ${amountVal} (Conf: ${Math.round(amountConf * 100)}%, Source: ${res.fields.amount.source})`);
      console.log(`   -> Extracted Category: ${catVal || "None"} (Conf: ${Math.round(res.fields.category.confidence * 100)}%)`);
      console.log(`   -> Extracted Merchant: ${merchantVal || "None"}`);
      console.log(`   -> Extracted Date: ${dateVal}`);
      console.log(`   -> Extracted Payment Method: ${pmVal || "None"}`);
      console.log(`   -> Overall Confidence: ${Math.round(res.overall_confidence * 100)}%`);

      let testPassed = true;

      if (tc.expectNullAmount && amountVal !== null) {
        console.error(`   ❌ Failed: Expected null amount for ambiguous text, got ${amountVal}`);
        testPassed = false;
      }
      if (tc.expectAmount !== undefined && amountVal !== tc.expectAmount) {
        console.error(`   ❌ Failed: Expected amount ${tc.expectAmount}, got ${amountVal}`);
        testPassed = false;
      }
      if (tc.expectAmountRange && (amountVal === null || amountVal < tc.expectAmountRange[0] || amountVal > tc.expectAmountRange[1])) {
        console.error(`   ❌ Failed: Expected amount between ${tc.expectAmountRange[0]}-${tc.expectAmountRange[1]}, got ${amountVal}`);
        testPassed = false;
      }

      if (testPassed) {
        console.log(`   ✅ PASS`);
        passedCount++;
      }
    } catch (err: any) {
      console.error(`   ❌ Error running test case:`, err.message);
    }
    console.log("--------------------------------------------------");
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }


  console.log(`\nTEST RESULTS SUMMARY: ${passedCount}/${totalCount} Passed.`);
  console.log("==================================================");
}

runTestSuite();
