// Take-home estimate for hourly pay. Each week is treated like a paycheck:
// annualize it (x52), work out the year's tax, divide back by 52 — the way payroll withholding works.
// Figures are 2026 federal numbers; state figures are simplified. It's an estimate, not a pay stub.
(function (root) {
  const FED = {
    single:  { std: 16100, brackets: [[12400, .10], [50400, .12], [105700, .22], [201775, .24], [256225, .32], [640600, .35], [Infinity, .37]] },
    married: { std: 32200, brackets: [[24800, .10], [100800, .12], [211400, .22], [403550, .24], [512450, .32], [768700, .35], [Infinity, .37]] },
  };
  const SS_RATE = .062, SS_WAGE_BASE = 184500, MEDICARE = .0145;

  // kind: "none" no wage income tax · "flat" rate after an exempt amount · "approx" rough effective rate (progressive states)
  // exempt: [single, married] amount of yearly income that isn't taxed
  const STATES = {
    AL: ["Alabama", "approx", .04], AK: ["Alaska", "none"], AZ: ["Arizona", "flat", .025, [16100, 32200]],
    AR: ["Arkansas", "approx", .03], CA: ["California", "approx", .03], CO: ["Colorado", "flat", .044, [16100, 32200]],
    CT: ["Connecticut", "approx", .04], DE: ["Delaware", "approx", .045], DC: ["District of Columbia", "approx", .05],
    FL: ["Florida", "none"], GA: ["Georgia", "flat", .0519, [12000, 24000]], HI: ["Hawaii", "approx", .065],
    ID: ["Idaho", "flat", .053, [16100, 32200]], IL: ["Illinois", "flat", .0495, [2850, 5700]], IN: ["Indiana", "flat", .0295, [1000, 2000]],
    IA: ["Iowa", "flat", .038, [16100, 32200]], KS: ["Kansas", "approx", .05], KY: ["Kentucky", "flat", .035, [3360, 6720]],
    LA: ["Louisiana", "flat", .03, [12500, 25000]], ME: ["Maine", "approx", .055], MD: ["Maryland", "approx", .0475],
    MA: ["Massachusetts", "flat", .05, [4400, 8800]], MI: ["Michigan", "flat", .0425, [5800, 11600]], MN: ["Minnesota", "approx", .0535],
    MS: ["Mississippi", "flat", .04, [8300, 16600]], MO: ["Missouri", "approx", .04], MT: ["Montana", "approx", .047],
    NE: ["Nebraska", "approx", .045], NV: ["Nevada", "none"], NH: ["New Hampshire", "none"], NJ: ["New Jersey", "approx", .02],
    NM: ["New Mexico", "approx", .035], NY: ["New York", "approx", .05], NC: ["North Carolina", "flat", .0399, [12750, 25500]],
    ND: ["North Dakota", "approx", .01], OH: ["Ohio", "flat", .0275, [26050, 26050]], OK: ["Oklahoma", "approx", .04],
    OR: ["Oregon", "approx", .075], PA: ["Pennsylvania", "flat", .0307, [0, 0]], RI: ["Rhode Island", "approx", .0375],
    SC: ["South Carolina", "approx", .03], SD: ["South Dakota", "none"], TN: ["Tennessee", "none"], TX: ["Texas", "none"],
    UT: ["Utah", "utah"], VT: ["Vermont", "approx", .0335], VA: ["Virginia", "approx", .05], WA: ["Washington", "none"],
    WV: ["West Virginia", "approx", .04], WI: ["Wisconsin", "approx", .045], WY: ["Wyoming", "none"],
  };

  function federalYear(income, status) {
    const f = FED[status] || FED.single;
    let taxable = Math.max(0, income - f.std), tax = 0, low = 0;
    for (const [top, rate] of f.brackets) {
      if (taxable <= low) break;
      tax += (Math.min(taxable, top) - low) * rate;
      low = top;
    }
    return tax;
  }

  function stateYear(income, code, status) {
    const s = STATES[code];
    if (!s) return 0;
    const m = status === "married" ? 1 : 0;
    if (s[1] === "none") return 0;
    if (s[1] === "flat") return Math.max(0, income - s[3][m]) * s[2];
    if (s[1] === "approx") return income * s[2];
    // Utah: 4.5% flat, minus a taxpayer credit (6% of the federal standard deduction)
    // that shrinks by 1.3% of income over a threshold.
    const tax = income * .045;
    const credit = Math.max(0, .06 * FED[status === "married" ? "married" : "single"].std - .013 * Math.max(0, income - (m ? 37900 : 18950)));
    return Math.max(0, tax - credit);
  }

  // gross: one week's pay. Returns that week's estimated taxes and take-home.
  function weekPay(gross, settings) {
    const status = settings.status === "married" ? "married" : "single";
    const year = gross * 52;
    const federal = federalYear(year, status) / 52;
    const fica = Math.min(gross, SS_WAGE_BASE / 52) * SS_RATE + gross * MEDICARE;
    const state = settings.stateRate != null && settings.stateRate !== ""
      ? gross * Number(settings.stateRate) / 100
      : stateYear(year, settings.state, status) / 52;
    return { gross, federal, fica, state, net: gross - federal - fica - state };
  }

  const api = { weekPay, STATES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PayTax = api;
})(this);
