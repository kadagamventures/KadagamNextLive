// server/scripts/seedThreePlans.js

require("dotenv").config();
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const dbConfig = require("../config/dbConfig");

async function seed() {
  await dbConfig();

  const plans = [
    {
      name:         "Card 1 – Free Trial",
      duration:     { value: 7, unit: "days" },
      price:        0,
      gstPercentage: 18,       // default GST
      isActive:     true,
      isFreeTrial:  true,
    },
    {
      name:         "Card 2 – 1 Month",
      duration:     { value: 1, unit: "months" },
      price:        2999,
      gstPercentage: 18,
      isActive:     true,
      isFreeTrial:  false,
    },
    {
      name:         "Card 3 – 3 Months",
      duration:     { value: 3, unit: "months" },
      price:        5999,
      gstPercentage: 18,
      isActive:     true,
      isFreeTrial:  false,
    },
  ];

  for (const plan of plans) {
    await Plan.findOneAndUpdate(
      { name: plan.name },
      { $set: plan },
      { upsert: true, new: true }
    );
    console.log(`✅ Upserted plan: ${plan.name} (GST ${plan.gstPercentage}%)`);
  }

  console.log("🎉 Default plans with GST have been seeded.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
