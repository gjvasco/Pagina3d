/* ==========================================================================
   3D PRINT HUB - ADVANCED COST CALCULATOR ENGINE
   ========================================================================== */

class CostCalculator {
  static calculate({
    spoolCost = 25,
    spoolWeightGrams = 1000,
    jobWeightGrams = 100,
    printHours = 5,
    printerWattage = 250,
    electricityRateKwh = 0.18,
    wearCostPerHour = 0.25,
    labourTimeHours = 0.5,
    labourRatePerHour = 10.0,
    profitMarginPercent = 40
  }) {
    // 1. Material Cost
    const costPerGram = spoolCost / (spoolWeightGrams || 1000);
    const materialCost = jobWeightGrams * costPerGram;

    // 2. Electricity Cost: (Watts / 1000) * Hours * Rate
    const kwhConsumed = (printerWattage / 1000) * printHours;
    const electricityCost = kwhConsumed * electricityRateKwh;

    // 3. Machine Wear / Amortization Cost
    const wearCost = printHours * wearCostPerHour;

    // 4. Labour / Post-processing Cost
    const labourCost = labourTimeHours * labourRatePerHour;

    // Total production cost
    const totalCost = materialCost + electricityCost + wearCost + labourCost;

    // 5. Profit Margin: totalCost * (1 + margin/100)
    const profitAmount = totalCost * (profitMarginPercent / 100);
    const suggestedPrice = totalCost * (1 + profitMarginPercent / 100);

    return {
      materialCost: materialCost.toFixed(2),
      electricityCost: electricityCost.toFixed(2),
      wearCost: wearCost.toFixed(2),
      labourCost: labourCost.toFixed(2),
      totalCost: totalCost.toFixed(2),
      profitAmount: profitAmount.toFixed(2),
      suggestedPrice: suggestedPrice.toFixed(2),
      kwhConsumed: kwhConsumed.toFixed(2)
    };
  }
}

window.CostCalculator = CostCalculator;
