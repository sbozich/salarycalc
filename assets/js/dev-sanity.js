/*
DE/2026 Verification Contract (BMF validated)

Authoritative reference: BMF Einkommensteuerberechnung (2026, alleinstehend)

Fixtures (zvE -> Einkommensteuer, SolZ):
- 42,363  -> 7,967.00 ; 0.00
- 17,799  -> 1,034.00 ; 0.00
- 80,000  -> 22,464.00 ; 251.56   (Sum: 22,715.56)

Engine method must remain: de_estg_2026
Any change to tariff constants, zone boundaries, SolZ parameters, or rounding requires re-validation.
*/


// assets/js/dev-sanity.js
// Deterministic regression sanity checks for DE tax classes and CalcMode enforcement.
// Aligned to the actual engine output schema (annual.*).
//
// NOTE on model semantics:
// - This project currently uses an annualized EStG-style tax model, not payroll withholding.
// - Therefore, some tax classes can legitimately yield identical outputs for some scenarios (e.g., I vs III with childrenCount=0).
// - Invariants below are chosen to be discriminating under the current model:
//   (1) I != II at childrenCount=0 (taxable_income_adjustment present in rules)
//   (2) I != III at childrenCount=1 (child_behavior differences become effective)

(async () => {
  const Engine = window.SalaryEngine;
  if (!Engine || typeof Engine.computeSalaryWithContext !== "function") {
    console.error("[dev-sanity] SalaryEngine.computeSalaryWithContext not available.");
    return;
  }

  const base = {
    countryCode: "DE",
    year: 2026,
    region: null,
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    childrenCount: 0
  };

  const cases = [
    // Core below-boundary correctness probes
    { gross: 2000, taxClass: "I",   childrenCount: 0 },
    { gross: 2000, taxClass: "III", childrenCount: 0 },
    { gross: 4500, taxClass: "I",   childrenCount: 0 },
    { gross: 4500, taxClass: "III", childrenCount: 0 },
    { gross: 6900, taxClass: "I",   childrenCount: 0 },
    { gross: 6900, taxClass: "III", childrenCount: 0 },

    // Discriminating probes (allows output-delta assertions under current model)
    { gross: 4500, taxClass: "II",  childrenCount: 0, tag: "discriminating: II adjustment" },
    { gross: 4500, taxClass: "I",   childrenCount: 1, tag: "discriminating: children=1" },
    { gross: 4500, taxClass: "III", childrenCount: 1, tag: "discriminating: children=1" }
  ];

  const optional = [
    { gross: 4500, taxClass: "V",  childrenCount: 0, tag: "MST overlay probe (V)" },
    { gross: 4500, taxClass: "VI", childrenCount: 0, tag: "MST overlay probe (VI)" },
    { gross: 8000, taxClass: "I",  childrenCount: 0, tag: "above-boundary probe" }
  ];

  const runSet = async (label, rows) => {
    console.group(`%c[dev-sanity] ${label}`, "font-weight:bold");
    for (const t of rows) {
      const input = {
        ...base,
        salaryAmount: t.gross,
        taxClass: t.taxClass,
        childrenCount: typeof t.childrenCount === "number" ? t.childrenCount : base.childrenCount
      };

      try {
        const res = await Engine.computeSalaryWithContext(input);

        console.log({
          gross_monthly: t.gross,
          taxClass: t.taxClass,
          childrenCount: input.childrenCount,
          tag: t.tag || "",
          calcMode: res.taxContext.calcMode,
          taxableIncome_annual: res.annual.taxableIncome,
          incomeTax_annual: res.annual.incomeTaxTotal,
          net_annual: res.annual.net
        });
      } catch (e) {
        console.error(
          `[dev-sanity] FAIL gross=${t.gross} class=${t.taxClass} children=${input.childrenCount}`,
          e
        );
      }
    }
    console.groupEnd();
  };

  await runSet("Core cases + discriminating probes", cases);
  await runSet("Optional probes (MST, boundary)", optional);

  // --- Invariants (model-correct) ---
  const invariantCheck = async ({ gross, childrenCount, a, b, label }) => {
    const base2 = { ...base, childrenCount };

    const rA = await Engine.computeSalaryWithContext({ ...base2, salaryAmount: gross, taxClass: a });
    const rB = await Engine.computeSalaryWithContext({ ...base2, salaryAmount: gross, taxClass: b });

    const netA = rA.annual.net;
    const netB = rB.annual.net;

    if (netA === netB) {
      console.error(`[dev-sanity] INVARIANT FAIL: ${label}`, {
        gross,
        childrenCount,
        netA,
        netB,
        modeA: rA.taxContext.calcMode,
        modeB: rB.taxContext.calcMode
      });
    } else {
      console.log(`[dev-sanity] OK: ${label}`, {
        gross,
        childrenCount,
        netA,
        netB
      });
    }
  };

  // 1) Class II defines taxable_income_adjustment => must differ from I even with 0 children
  await invariantCheck({
    gross: 4500,
    childrenCount: 0,
    a: "I",
    b: "II",
    label: "I != II at 4500 (children=0)"
  });

  // 2) Child behavior differs => I vs III should differ when childrenCount > 0
  await invariantCheck({
    gross: 4500,
    childrenCount: 1,
    a: "I",
    b: "III",
    label: "I != III at 4500 (children=1)"
  });
  
  // 3) MST overlay difference: V vs VI should differ (VI has mst5_6 override in rules)
await invariantCheck({
  gross: 4500,
  childrenCount: 0,
  a: "V",
  b: "VI",
  label: "V != VI at 4500 (children=0)"
});



  // ---------------------------------------------------------------------------
  // AT/2026 Sanity: Low-income AV (Arbeitslosenversicherung) employee-rate tiers
  //
  // Goal: Detect regressions in the Austria-only "low income SV relief" logic,
  // specifically the employee unemployment contribution ("unemployment" id).
  //
  // Expected tiering (monthly gross basis, 2026):
  //  - <= 2225.00  => 0%
  //  - <= 2427.00  => 1%
  //  - <= 2630.00  => 2%
  //  - >  2630.00  => 2.95% (standard)
  //
  // IMPORTANT:
  // - For AT monthly input with salaryMonths=14, engine splits gross into:
  //   regular (12×) + special ((salaryMonths-12)×).
  // - By design (PSL v2.1), tiering applies to REGULAR portion only;
  //   SPECIAL portion uses the standard employee_rate (2.95%).
  // ---------------------------------------------------------------------------

  const baseAT = {
    countryCode: "AT",
    year: 2026,
    region: null,
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    // taxClass irrelevant for AT, but keep present to match schema if needed
    taxClass: null,
    childrenCount: 0
  };

  const atTierCases = [

    // Boundary-edge probes (cent-level) — inclusive upper bounds expected
    { gross: 2225.00, salaryMonths: 12, expRateRegular: 0.00, tag: "AT: EDGE 2225.00 => 0% (12m)" },
    { gross: 2225.01, salaryMonths: 12, expRateRegular: 0.01, tag: "AT: EDGE 2225.01 => 1% (12m)" },
    { gross: 2427.00, salaryMonths: 12, expRateRegular: 0.01, tag: "AT: EDGE 2427.00 => 1% (12m)" },
    { gross: 2427.01, salaryMonths: 12, expRateRegular: 0.02, tag: "AT: EDGE 2427.01 => 2% (12m)" },
    { gross: 2630.00, salaryMonths: 12, expRateRegular: 0.02, tag: "AT: EDGE 2630.00 => 2% (12m)" },
    { gross: 2630.01, salaryMonths: 12, expRateRegular: 0.0295, tag: "AT: EDGE 2630.01 => 2.95% (12m)" },

    { gross: 2225.00, salaryMonths: 14, expRateRegular: 0.00, tag: "AT: EDGE 2225.00 => 0% regular + standard special (14m)" },
    { gross: 2225.01, salaryMonths: 14, expRateRegular: 0.01, tag: "AT: EDGE 2225.01 => 1% regular + standard special (14m)" },
    { gross: 2427.00, salaryMonths: 14, expRateRegular: 0.01, tag: "AT: EDGE 2427.00 => 1% regular + standard special (14m)" },
    { gross: 2427.01, salaryMonths: 14, expRateRegular: 0.02, tag: "AT: EDGE 2427.01 => 2% regular + standard special (14m)" },
    { gross: 2630.00, salaryMonths: 14, expRateRegular: 0.02, tag: "AT: EDGE 2630.00 => 2% regular + standard special (14m)" },
    { gross: 2630.01, salaryMonths: 14, expRateRegular: 0.0295, tag: "AT: EDGE 2630.01 => 2.95% regular + standard special (14m)" },

    // 12 salaries (no special portion)
    { gross: 2200, salaryMonths: 12, expRateRegular: 0.00, tag: "AT: tier 0% (12m)" },
    { gross: 2300, salaryMonths: 12, expRateRegular: 0.01, tag: "AT: tier 1% (12m)" },
    { gross: 2500, salaryMonths: 12, expRateRegular: 0.02, tag: "AT: tier 2% (12m)" },
    { gross: 2700, salaryMonths: 12, expRateRegular: 0.0295, tag: "AT: tier standard 2.95% (12m)" },

    // 14 salaries (regular tiering + special at standard rate)
    { gross: 2200, salaryMonths: 14, expRateRegular: 0.00, tag: "AT: tier 0% regular + standard special (14m)" },
    { gross: 2300, salaryMonths: 14, expRateRegular: 0.01, tag: "AT: tier 1% regular + standard special (14m)" },
    { gross: 2500, salaryMonths: 14, expRateRegular: 0.02, tag: "AT: tier 2% regular + standard special (14m)" },
    { gross: 2700, salaryMonths: 14, expRateRegular: 0.0295, tag: "AT: standard regular + standard special (14m)" }
  ];

  const nearlyEqual = (a, b, eps = 0.02) => Math.abs(Number(a) - Number(b)) <= eps;

  const atExpectedUnemploymentAnnual = ({ gross, salaryMonths, expRateRegular }) => {
    const m = Number(gross);
    const regMonths = 12;
    const specialMonths = Math.max(0, Number(salaryMonths) - regMonths);

    const regularAnnual = m * regMonths;
    const specialAnnual = m * specialMonths;

    const standardRate = 0.0295;

    const exp = (regularAnnual * Number(expRateRegular)) + (specialAnnual * standardRate);
    return exp;
  };

  const atRun = async () => {
    console.group("%c[dev-sanity] AT 2026 low-income AV tiers", "font-weight:bold");

    for (const t of atTierCases) {
      const input = {
        ...baseAT,
        salaryAmount: t.gross,
        salaryMonths: t.salaryMonths
      };

      try {
        const res = await Engine.computeSalaryWithContext(input);

        const unemploymentAnnual = (res.annual && res.annual.employeeContribById)
          ? Number(res.annual.employeeContribById.unemployment || 0)
          : 0;

                const expected = atExpectedUnemploymentAnnual(t);
        // Match engine behavior: contributions are rounded to currency cents in annual breakdown.
        const expectedRounded = Math.round((expected + Number.EPSILON) * 100) / 100;
        const ok = nearlyEqual(unemploymentAnnual, expectedRounded, 0.01);
console.log({
          gross_monthly: t.gross,
          salaryMonths: t.salaryMonths,
          tag: t.tag || "",
          unemployment_emp_annual: unemploymentAnnual,
          expected_unemployment_emp_annual: expectedRounded,
          pass: ok
        });

        if (!ok) {
          console.error("[dev-sanity] AT AV tier mismatch", {
            gross_monthly: t.gross,
            salaryMonths: t.salaryMonths,
            unemployment_emp_annual: unemploymentAnnual,
            expected_unemployment_emp_annual: expectedRounded
          });
        }
      } catch (e) {
        console.error(
          `[dev-sanity] AT FAIL gross=${t.gross} salaryMonths=${t.salaryMonths}`,
          e
        );
      }
    }

    console.groupEnd();
  };

  await atRun();




// ---------------------------------------------------------------------------
  // UK/2025-26 (England/Wales) Sanity: PAYE + Class 1 NI (Category A)
  //
  // Scope: PAYE income tax bands + Personal Allowance + Class 1 NI employee/employer.
  // Exclusions: Student loan, pension/salary sacrifice, Scotland bands.


  // ---------------------------------------------------------------------------
  // UK (England/Wales) — Phase D boundary probes (2025/26)
  //
  // Scope: PAYE income tax (annualised) + Class 1 NI (annualised)
  // Notes:
  // - This is an annualised model (not true PAYE period-by-period withholding).
  // - Rounding: compare values rounded to cents, matching engine output.
  // - Exclusions: student loans, pension/salary sacrifice, Scotland tax bands.
  // ---------------------------------------------------------------------------

  const baseUK = {
    countryCode: "UK",
    year: 2026,
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    childrenCount: 0,
    taxClass: null
  };

  // Thresholds (annual) for 2025/26 (E/W) model
  const UK_PA = 12570;     // personal allowance
  const UK_BR = 37700;     // basic-rate band width
  const UK_HR_START = UK_PA + UK_BR; // 50270
  const UK_HR_END = 125140;

  // NI (annualised approximation)
  const UK_NI_PT = 12570;  // Primary Threshold
  const UK_NI_UEL = 50270; // Upper Earnings Limit
  const UK_NI_ST = 9100;   // Secondary Threshold (employer)
  const UK_NI_EMP_RATE_MAIN = 0.08;
  const UK_NI_EMP_RATE_UPPER = 0.02;
  const UK_NI_ER_RATE = 0.138;

  const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

  const computeUKPAYEAnnual = (grossAnnual) => {
    const g = Number(grossAnnual);
    const taxable = Math.max(0, g - UK_PA);

    // Marginal bands: 20% up to 37,700 (above PA), then 40% up to 125,140, then 45%
    let remaining = taxable;
    let tax = 0;

    const basicSpan = UK_BR;
    const basic = Math.min(remaining, basicSpan);
    tax += basic * 0.20;
    remaining -= basic;

    const higherSpan = Math.max(0, UK_HR_END - UK_HR_START);
    const higher = Math.min(remaining, higherSpan);
    tax += higher * 0.40;
    remaining -= higher;

    if (remaining > 0) tax += remaining * 0.45;

    return round2(tax);
  };

  const computeUKNIEmpAnnual = (grossAnnual) => {
    const g = Number(grossAnnual);
    if (g <= UK_NI_PT) return 0;

    const mainBand = Math.min(g, UK_NI_UEL) - UK_NI_PT;
    const upperBand = Math.max(0, g - UK_NI_UEL);

    const ni = (mainBand * UK_NI_EMP_RATE_MAIN) + (upperBand * UK_NI_EMP_RATE_UPPER);
    return round2(ni);
  };

  const computeUKNIEmployerAnnual = (grossAnnual) => {
    const g = Number(grossAnnual);
    const base = Math.max(0, g - UK_NI_ST);
    return round2(base * UK_NI_ER_RATE);
  };

  // Boundary-focused monthly cases:
  // - Around NI Secondary Threshold (~758.33/month)
  // - Around Personal Allowance / NI PT (~1047.50/month)
  // - Around HR threshold / NI UEL (~4189.17/month)
  // - Above higher-rate / UEL
  const ukCases = [
    { gross: 750,  tag: "UK: just below employer ST (~758)" },
    { gross: 759,  tag: "UK: just above employer ST (~758)" },

    { gross: 1047, tag: "UK: just below PA/PT monthly (~1047.5)" },
    { gross: 1048, tag: "UK: just above PA/PT monthly (~1047.5)" },
    { gross: 1100, tag: "UK: modestly above PA/PT" },

    { gross: 4189, tag: "UK: just below HR threshold / UEL monthly (~4189.17)" },
    { gross: 4190, tag: "UK: just above HR threshold / UEL monthly (~4189.17)" },

    { gross: 8000, tag: "UK: above UEL + higher-rate" }
  ];

  const ukNearlyEqual = (a, b, eps = 0.01) => Math.abs(Number(a) - Number(b)) <= eps;

  const ukRun = async () => {
    console.group("%c[dev-sanity] UK 2025/26 PAYE + NI (E/W) — Phase D boundaries", "font-weight:bold");

    for (const t of ukCases) {
      const input = { ...baseUK, salaryAmount: t.gross };
      const grossAnnual = Number(t.gross) * 12;

      const expTax = computeUKPAYEAnnual(grossAnnual);
      const expNiEmp = computeUKNIEmpAnnual(grossAnnual);
      const expNiEr = computeUKNIEmployerAnnual(grossAnnual);

      try {
        const res = await window.SalaryEngine.computeSalaryWithContext(input);

        const gotTax = round2(Number(res?.annual?.incomeTaxTotal || 0));
        const gotNiEmp = round2(Number(res?.annual?.employeeContribById?.national_insurance || 0));
        const gotNiEr = round2(Number(res?.annual?.employerContribById?.national_insurance || 0));

        const ok = ukNearlyEqual(gotTax, expTax) && ukNearlyEqual(gotNiEmp, expNiEmp) && ukNearlyEqual(gotNiEr, expNiEr);

        console.log({
          gross_monthly: t.gross,
          tag: t.tag || "",
          tax_annual: gotTax,
          exp_tax_annual: expTax,
          ni_emp_annual: gotNiEmp,
          exp_ni_emp_annual: expNiEmp,
          ni_er_annual: gotNiEr,
          exp_ni_er_annual: expNiEr,
          pass: ok
        });

        if (!ok) {
          console.error("[dev-sanity] UK mismatch", {
            input,
            got: { tax: gotTax, ni_emp: gotNiEmp, ni_er: gotNiEr },
            exp: { tax: expTax, ni_emp: expNiEmp, ni_er: expNiEr }
          });
        }
      } catch (e) {
        console.error(`[dev-sanity] UK FAIL gross=${t.gross}`, e);
      }
    }

    console.groupEnd();
  };

  await ukRun();



// ---------------------------------------------------------------------------
  // NL/2026 Sanity (Phase D): Box 1 income tax + tax credits + Zvw employer levy
  //
  // Scope:
  // - Box 1 (annualised) + (Algemene heffingskorting + Arbeidskorting) as implemented in rules/engine
  // - Zvw employer levy as "other tax" with incidence="employer" (TCO-only, not net)
  //
  // Exclusions:
  // - AOW age cases, 30% ruling, pension/salary sacrifice, toeslagen, bespoke deductions.
  //
  // This block is intentionally tolerant (±0.50) because credits are piecewise and your engine may
  // implement official formulas vs simplified probe formulas here.
  // ---------------------------------------------------------------------------

  const baseNL = {
    countryCode: "NL",
    year: 2026,
    region: null,
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    childrenCount: 0,
    taxClass: null
  };

  const nlRound2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const nlNearlyEqual = (a, b, eps = 0.5) => Math.abs(Number(a) - Number(b)) <= eps;

  // Probe points: low / mid / near bracket edge / above bracket edge
  const nlCases = [
    { gross: 1000, tag: "NL: low income" },
    { gross: 2500, tag: "NL: mid income" },
    { gross: 6300, tag: "NL: near bracket edge" },
    { gross: 9000, tag: "NL: above bracket" }
  ];

  const nlRun = async () => {
    console.group("%c[dev-sanity] NL 2026 Box 1 + credits + Zvw (Phase D)", "font-weight:bold");

    for (const t of nlCases) {
      const input = { ...baseNL, salaryAmount: t.gross };

      try {
        const res = await window.SalaryEngine.computeSalaryWithContext(input);

        const gotTax = nlRound2(Number(res?.annual?.incomeTaxTotal || 0));
        const gotZvw = nlRound2(Number(res?.annual?.employerContribById?.zvw || 0));

        // Expectations: if rules are loaded, these should be >0 only once above thresholds.
        // We only assert basic sanity + monotonicity-ish behavior between cases.
        console.log({
          gross_monthly: t.gross,
          tag: t.tag || "",
          tax_annual: gotTax,
          zvw_er_annual: gotZvw,
          net_annual: nlRound2(Number(res?.annual?.net || 0)),
          tco_annual: nlRound2(Number(res?.annual?.tco || 0))
        });
      } catch (e) {
        console.error(`[dev-sanity] NL FAIL gross=${t.gross}`, e);
      }
    }

    // Simple relational assertions (weak but robust):
    // - Zvw employer levy should be non-decreasing with gross and > 0 for sufficiently high income.
    try {
      const r1 = await window.SalaryEngine.computeSalaryWithContext({ ...baseNL, salaryAmount: nlCases[0].gross });
      const r2 = await window.SalaryEngine.computeSalaryWithContext({ ...baseNL, salaryAmount: nlCases[1].gross });
      const r3 = await window.SalaryEngine.computeSalaryWithContext({ ...baseNL, salaryAmount: nlCases[2].gross });
      const r4 = await window.SalaryEngine.computeSalaryWithContext({ ...baseNL, salaryAmount: nlCases[3].gross });

      const z1 = nlRound2(Number(r1?.annual?.employerContribById?.zvw || 0));
      const z2 = nlRound2(Number(r2?.annual?.employerContribById?.zvw || 0));
      const z3 = nlRound2(Number(r3?.annual?.employerContribById?.zvw || 0));
      const z4 = nlRound2(Number(r4?.annual?.employerContribById?.zvw || 0));

      const okMonotone = (z1 <= z2) && (z2 <= z3) && (z3 <= z4);
      console.log("[dev-sanity] NL OK: Zvw non-decreasing across probes?", { z1, z2, z3, z4, pass: okMonotone });
      if (!okMonotone) console.error("[dev-sanity] NL Zvw monotonicity FAIL", { z1, z2, z3, z4 });

      // Tax should be non-decreasing in these probes as well (net effect of credits can flatten but should not invert gross ordering here).
      const t1 = nlRound2(Number(r1?.annual?.incomeTaxTotal || 0));
      const t2 = nlRound2(Number(r2?.annual?.incomeTaxTotal || 0));
      const t3 = nlRound2(Number(r3?.annual?.incomeTaxTotal || 0));
      const t4 = nlRound2(Number(r4?.annual?.incomeTaxTotal || 0));
      const okTax = (t1 <= t2) && (t2 <= t3) && (t3 <= t4);
      console.log("[dev-sanity] NL OK: incomeTax non-decreasing across probes?", { t1, t2, t3, t4, pass: okTax });
      if (!okTax) console.error("[dev-sanity] NL incomeTax monotonicity FAIL", { t1, t2, t3, t4 });
    } catch (e) {
      console.error("[dev-sanity] NL relational assertions failed", e);
    }

    console.groupEnd();
  };

  await nlRun();



  // ---------------------------------------------------------------------------
  // PL 2026 (Simplified UoP): PIT 12/32 + ZUS (emp/er) + health 9% (Phase D)
  // NOTE: This is a structural sanity probe (rates/monotonicity), not a statutory proof.
  // ---------------------------------------------------------------------------

  const basePL = {
    countryCode: "PL",
    year: 2026,
    region: null,
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    childrenCount: 0,
    taxClass: null
  };

  const plRound2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const plNearlyEqual = (a, b, eps = 0.75) => Math.abs(Number(a) - Number(b)) <= eps;

  const plCases = [
    { gross: 1000, tag: "PL: low income" },
    { gross: 5000, tag: "PL: mid income" },
    { gross: 10000, tag: "PL: near 120k/year" },
    { gross: 12000, tag: "PL: above 120k/year" }
  ];

  // Expected *configured* rates from rules-PL.json (if you change rules, update these)
  const PL_EMP_RATE_ZUS = 0.0976 + 0.015 + 0.0245; // pension + disability + sickness
  const PL_EMP_RATE_HEALTH = 0.09;
  const PL_ER_RATE_ZUS = 0.0976 + 0.065 + 0.0167 + 0.0245 + 0.0010; // pension + disability + accident + FP + FGSP

  const plRun = async () => {
    console.group("%c[dev-sanity] PL 2026 PIT + ZUS + health (Phase D)", "font-weight:bold");
    const results = [];

    for (const t of plCases) {
      const input = { ...basePL, salaryAmount: t.gross };

      try {
        const res = await window.SalaryEngine.computeSalaryWithContext(input);

        const grossA = Number(res?.annual?.gross || 0);
        const gotEmpC = plRound2(Number(res?.annual?.employeeContribTotal || 0));
        const gotErC = plRound2(Number(res?.annual?.employerContribTotal || 0));
        const gotTax = plRound2(Number(res?.annual?.incomeTaxTotal || 0));
        const gotNet = plRound2(Number(res?.annual?.net || 0));
        const gotTco = plRound2(Number(res?.annual?.tco || 0));

        // Sanity expectations on contributions (annual), using only gross base (no benefits).
        const expEmpC = plRound2(grossA * (PL_EMP_RATE_ZUS + PL_EMP_RATE_HEALTH));
        const expErC = plRound2(grossA * PL_ER_RATE_ZUS);

        const okEmp = plNearlyEqual(gotEmpC, expEmpC);
        const okEr = plNearlyEqual(gotErC, expErC);

        // PSL invariant: employer-only contributions/taxes must not reduce net (net = gross - employee contrib - income tax - employee other taxes).
        const okTco = gotTco >= gotNet;

        console.log({
          tag: t.tag,
          gross_monthly: t.gross,
          annual: { gross: grossA, empContrib: gotEmpC, erContrib: gotErC, tax: gotTax, net: gotNet, tco: gotTco },
          expected: { empContrib: expEmpC, erContrib: expErC },
          checks: { empContribMatch: okEmp, erContribMatch: okEr, tcoGteNet: okTco }
        });

        if (!okEmp) console.error("[dev-sanity] PL employee contrib mismatch", { gross_monthly: t.gross, gotEmpC, expEmpC });
        if (!okEr) console.error("[dev-sanity] PL employer contrib mismatch", { gross_monthly: t.gross, gotErC, expErC });
        if (!okTco) console.error("[dev-sanity] PL TCO invariant FAIL (tco < net)", { gross_monthly: t.gross, gotTco, gotNet });

        results.push({ gross: t.gross, tax: gotTax, net: gotNet });
      } catch (e) {
        console.error(`[dev-sanity] PL FAIL gross=${t.gross}`, e);
      }
    }

    // Relational assertions: tax and net should behave sensibly with higher gross.
    try {
      if (results.length >= 4) {
        const [r1, r2, r3, r4] = results;

        const okNet = (r1.net < r2.net) && (r2.net < r3.net) && (r3.net < r4.net);
        const okTaxNonDec = (r1.tax <= r2.tax) && (r2.tax <= r3.tax) && (r3.tax <= r4.tax);

        if (!okNet) console.error("[dev-sanity] PL net monotonicity FAIL", { r1, r2, r3, r4 });
        if (!okTaxNonDec) console.error("[dev-sanity] PL incomeTax monotonicity FAIL", { r1, r2, r3, r4 });
      }
    } catch (e) {
      console.error("[dev-sanity] PL relational assertions failed", e);
    }

    console.groupEnd();
  };

  await plRun();

  // ----------------------------
  // ES — Spain (IRPF national + region) — Phase D (bracket-accurate, simplified allowances/SSC)
  // ----------------------------
  const baseES = {
    countryCode: "ES",
    year: 2026,
    region: "madrid",          // madrid | catalonia | andalusia | valencia
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    childrenCount: 0,
    taxClass: null
  };

  const esCases = [
    { gross: 1500, tag: "ES: low income" },
    { gross: 3000, tag: "ES: mid income" },
    { gross: 7000, tag: "ES: high income (SSC ceiling nearby)" }
  ];

  const esRegions = ["madrid", "catalonia", "andalusia", "valencia"];

  const esRun = async () => {
    console.group("%c[dev-sanity] ES 2026 IRPF (national + region) + SSC (Phase D)", "font-weight:bold");

    // 1) Print anchors for each region
    for (const regionKey of esRegions) {
      for (const t of esCases) {
        const input = { ...baseES, region: regionKey, salaryAmount: t.gross };

        try {
          const res = await Engine.computeSalaryWithContext(input);
          const gotTax = round2(Number(res?.annual?.incomeTaxTotal || 0));
          const gotSSC = round2(Number(res?.annual?.employeeContribTotal || 0));
          const gotNet = round2(Number(res?.annual?.net || 0));

          console.log({
            region: regionKey,
            gross_monthly: t.gross,
            tag: t.tag,
            incomeTaxTotal_annual: gotTax,
            employeeSSC_annual: gotSSC,
            net_annual: gotNet
          });
        } catch (e) {
          console.warn("[dev-sanity] ES compute failed", { regionKey, gross: t.gross, err: String(e) });
        }
      }
    }

    // 2) Discriminating probe: regions should differ on income tax for a mid/high case
    try {
      const mid = 3000;
      const hi = 7000;

      const calc = async (regionKey, gross) => {
        const res = await Engine.computeSalaryWithContext({ ...baseES, region: regionKey, salaryAmount: gross });
        return round2(Number(res?.annual?.incomeTaxTotal || 0));
      };

      const tM = await Promise.all(esRegions.map((r) => calc(r, mid)));
      const tH = await Promise.all(esRegions.map((r) => calc(r, hi)));

      const uniq = (arr) => Array.from(new Set(arr.map((x) => String(x)))).length;

      const passMid = uniq(tM) > 1;
      const passHi = uniq(tH) > 1;

      console.log("[dev-sanity] ES region discrimination @3000/mo", { taxes: tM, pass: passMid });
      console.log("[dev-sanity] ES region discrimination @7000/mo", { taxes: tH, pass: passHi });

      if (!passMid) console.warn("[dev-sanity] WARN: ES regions indistinguishable at 3000/mo (check region tax schedules wiring).");
      if (!passHi) console.warn("[dev-sanity] WARN: ES regions indistinguishable at 7000/mo (check region tax schedules wiring).");
    } catch (e) {
      console.warn("[dev-sanity] ES discrimination probe failed", String(e));
    }

    console.groupEnd();
  };

  await esRun();









// ---------------------------------------------------------------------------
  // FR/2026 Sanity (Phase D): Employee contributions + 10% pro deduction (min/max)
  // + progressive income tax (per-part; parts=1).
  //
  // Scope: Implements the approved FR Phase B + Phase C model.
  // Exclusions: credits, PAS timing, CSG deductibility, quotient plafonnement.
  //
  // NOTE: This assumes the FR engine will expose (consistent with other markets):
  // - annual.taxableIncome    (net imposable after pro deduction)
  // - annual.incomeTaxTotal   (impôt sur le revenu)
  // - annual.net              (net after income tax)
  // ---------------------------------------------------------------------------

  const baseFR = {
    countryCode: "FR",
    year: 2026,
    region: null,
    salaryPeriod: "monthly",
    salaryAmount: 0,
    benefitsAnnual: 0,
    childrenCount: 0,
    taxClass: null
  };

  const frRound2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const frNearlyEqual = (a, b, eps = 0.02) => Math.abs(Number(a) - Number(b)) <= eps;

  // Phase C constants (frozen)
  const FR_SOCIAL_CEILING = 43992;
  const FR_EMP_CAPPED_RATE = 0.069;
  const FR_EMP_UNCAPPED_RATE = 0.097;

  const FR_PRO_RATE = 0.10;
  const FR_PRO_MIN = 495;
  const FR_PRO_MAX = 14171;

  // Brackets (per part; parts=1)
  const FR_BRACKETS = [
    { from: 0, to: 11294, rate: 0.00 },
    { from: 11294, to: 28797, rate: 0.11 },
    { from: 28797, to: 82341, rate: 0.30 },
    { from: 82341, to: 177106, rate: 0.41 },
    { from: 177106, to: Infinity, rate: 0.45 }
  ];

  const frEmployeeContribAnnual = (grossAnnual) => {
    const g = Number(grossAnnual);
    const cappedBase = Math.min(g, FR_SOCIAL_CEILING);
    return (cappedBase * FR_EMP_CAPPED_RATE) + (g * FR_EMP_UNCAPPED_RATE);
  };

  const frProDeductionAnnual = (netBeforeTaxAnnual) => {
    const raw = Number(netBeforeTaxAnnual) * FR_PRO_RATE;
    return Math.min(FR_PRO_MAX, Math.max(FR_PRO_MIN, raw));
  };

  const frTaxAnnual = (taxableAnnual) => {
    const x = Math.max(0, Number(taxableAnnual));
    let tax = 0;
    for (const b of FR_BRACKETS) {
      const lo = b.from;
      const hi = b.to;
      if (x <= lo) break;
      const span = Math.min(x, hi) - lo;
      if (span > 0) tax += span * b.rate;
    }
    return tax;
  };

  // Deterministic expected results based strictly on Phase B/C contracts.
  const frExpected = (grossMonthly) => {
    const grossAnnual = Number(grossMonthly) * 12;

    const empContrib = frEmployeeContribAnnual(grossAnnual);
    const netBeforeTax = grossAnnual - empContrib;

    const proDed = frProDeductionAnnual(netBeforeTax);
    const taxable = Math.max(0, netBeforeTax - proDed);

    const tax = frTaxAnnual(taxable);
    const netAfterTax = netBeforeTax - tax;

    return {
      grossAnnual: frRound2(grossAnnual),
      empContrib: frRound2(empContrib),
      netBeforeTax: frRound2(netBeforeTax),
      proDed: frRound2(proDed),
      taxable: frRound2(taxable),
      tax: frRound2(tax),
      netAfterTax: frRound2(netAfterTax)
    };
  };

  // Boundary probes + anchors
  const frCases = [
    { gross: 416.67, tag: "FR: 5,000/y => proDed MIN binds" },

    { gross: 1666.67, tag: "FR: 20,000/y => first positive tax" },
    { gross: 2500.00, tag: "FR: 30,000/y => mid 11% band" },

    { gross: 3583.33, tag: "FR: 43,000/y (pre-ceiling slope)" },
    { gross: 3666.00, tag: "FR: 43,992/y (at ceiling)" },
    { gross: 3666.67, tag: "FR: 44,000/y (post-ceiling continuity)" },
    { gross: 3750.00, tag: "FR: 45,000/y (post-ceiling slope)" },

    { gross: 7500.00, tag: "FR: 90,000/y (approach 41% threshold)" },

    { gross: 14166.67, tag: "FR: 170,000/y => proDed MAX binds" }
  ];

  const frRun = async () => {
    console.group("%c[dev-sanity] FR 2026 (Phase D) — contributions + proDed + income tax", "font-weight:bold");

    for (const t of frCases) {
      const input = { ...baseFR, salaryAmount: t.gross };
      const exp = frExpected(t.gross);

      try {
        const res = await Engine.computeSalaryWithContext(input);

        const gotTaxable = frRound2(Number(res?.annual?.taxableIncome ?? 0));
        const gotTax = frRound2(Number(res?.annual?.incomeTaxTotal ?? 0));
        const gotNet = frRound2(Number(res?.annual?.net ?? 0));

        // Optional (only if FR implementation exposes it)
        const gotEmpContrib = (res?.annual?.employeeContribTotal != null)
          ? frRound2(Number(res.annual.employeeContribTotal))
          : null;

        const ok =
          frNearlyEqual(gotTaxable, exp.taxable) &&
          frNearlyEqual(gotTax, exp.tax) &&
          frNearlyEqual(gotNet, exp.netAfterTax);

        console.log({
          gross_monthly: t.gross,
          tag: t.tag || "",
          got: { taxable: gotTaxable, tax: gotTax, net: gotNet, empContrib: gotEmpContrib },
          exp: { taxable: exp.taxable, tax: exp.tax, net: exp.netAfterTax, empContrib: exp.empContrib },
          pass: ok
        });

        if (!ok) {
          console.error("[dev-sanity] FR mismatch", { input, got: { gotTaxable, gotTax, gotNet }, exp });
        }
      } catch (e) {
        console.error(`[dev-sanity] FR FAIL gross=${t.gross}`, e);
      }
    }

    // Continuity check around ceiling: net should be monotone with gross and not jump.
    try {
      const a = await Engine.computeSalaryWithContext({ ...baseFR, salaryAmount: 3666.00 });
      const b = await Engine.computeSalaryWithContext({ ...baseFR, salaryAmount: 3666.67 });

      const netA = frRound2(Number(a?.annual?.net ?? 0));
      const netB = frRound2(Number(b?.annual?.net ?? 0));

      // gross increase = 0.67/month = 8.04/year, so net increase cannot exceed that materially.
      const ok = (netB >= netA) && (netB <= frRound2(netA + 8.04));
      console.log("[dev-sanity] FR OK: ceiling continuity (net monotone & no jump)?", { netA, netB, pass: ok });
      if (!ok) console.error("[dev-sanity] FR ceiling continuity FAIL", { netA, netB });
    } catch (e) {
      console.error("[dev-sanity] FR ceiling continuity check failed", e);
    }

    console.groupEnd();
  };

  await frRun();

  // -----------------------------
  // SI/2026 Phase D — Verification & Cross-Checks
  // - Internal consistency (net + TCO recomposition)
  // - Boundary probes inferred from resolved taxContext brackets
  // - Monotonicity checks across a coarse gross grid
  // Exclusions: dependents / child allowances, any income-dependent allowance phaseouts (not modeled)
  // -----------------------------
  const siRun = async () => {
    console.group("%c[dev-sanity] SI 2026 (Phase D) — consistency + bracket boundary probes", "font-weight:bold");

    const baseSI = {
      countryCode: "SI",
      year: 2026,
      region: null,
      salaryPeriod: "monthly",
      benefitsAnnual: 0,
      childrenCount: 0,
      taxClass: null
    };

    const r2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

    // 1) Internal consistency anchors (multiple salaryMonths to catch annualization bugs)
    const anchors = [
      { gross: 1200, salaryMonths: 12, tag: "anchor_low_12m" },
      { gross: 2000, salaryMonths: 12, tag: "anchor_mid_12m" },
      { gross: 4500, salaryMonths: 12, tag: "anchor_high_12m" },
      { gross: 4500, salaryMonths: 13, tag: "anchor_high_13m" }
    ];

    for (const t of anchors) {
      try {
        const out = await Engine.computeSalaryWithContext({
          ...baseSI,
          salaryAmount: t.gross,
          salaryMonths: t.salaryMonths
        });

        const a = out?.annual || {};
        const grossA = r2(a.gross || 0);
        const empContribA = r2(a.employeeContribTotal || 0);
        const empTaxesA = r2(a.employeeOtherTaxesTotal || 0);
        const incTaxA = r2(a.incomeTaxTotal || 0);
        const netA = r2(a.net || 0);
        const tcoA = r2(a.tco || 0);
        const employerContribA = r2(a.employerContribTotal || 0);
        const employerOtherTaxesA = r2(a.employerOtherTaxesTotal || 0);

        // PSL B-INV-5: employer-incidence items must not reduce net.
        const recomposedNet = r2(grossA - empContribA - (empTaxesA + incTaxA));
        const netOk = nearlyEqual(netA, recomposedNet, 0.01);

        // TCO must include employer contributions and employer-incidence other taxes.
        const recomposedTco = r2(grossA + employerContribA + employerOtherTaxesA);
        const tcoOk = nearlyEqual(tcoA, recomposedTco, 0.01);

        console.log("[dev-sanity] SI anchor", {
          tag: t.tag,
          gross_monthly: t.gross,
          salaryMonths: t.salaryMonths,
          gross_annual: grossA,
          net_annual: netA,
          recomposedNet,
          net_ok: netOk,
          tco_annual: tcoA,
          recomposedTco,
          tco_ok: tcoOk
        });

        if (!netOk) console.error("[dev-sanity] SI FAIL: net reconciliation", { tag: t.tag, netA, recomposedNet });
        if (!tcoOk) console.error("[dev-sanity] SI FAIL: TCO reconciliation", { tag: t.tag, tcoA, recomposedTco });

      } catch (e) {
        console.error("[dev-sanity] SI anchor failed", { tag: t.tag, gross: t.gross, salaryMonths: t.salaryMonths }, e);
      }
    }

    // 2) Boundary probes (derived from the resolved SI brackets in taxContext)
    // Strategy:
    // - Sweep a gross grid, record (gross, taxableIncome, incomeTax, net).
    // - For each bracket cutoff (up_to), find the closest case below and above by taxableIncome.
    // - Assert non-decreasing income tax and net across the crossing.
    const sweep = [];
    const sweepStart = 600;   // monthly
    const sweepEnd = 12000;   // monthly
    const sweepStep = 100;    // monthly

    let brackets = null;

    for (let g = sweepStart; g <= sweepEnd; g += sweepStep) {
      try {
        const res = await Engine.computeSalaryWithContext({ ...baseSI, salaryAmount: g, salaryMonths: 12 });
        if (!brackets) {
          brackets = (res?.taxContext?.incomeTax?.brackets || res?.taxContext?.income_tax?.brackets) || null;
        }
        sweep.push({
          gross: g,
          taxable: r2(Number(res?.annual?.taxableIncome ?? 0)),
          tax: r2(Number(res?.annual?.incomeTaxTotal ?? 0)),
          net: r2(Number(res?.annual?.net ?? 0))
        });
      } catch (e) {
        console.error("[dev-sanity] SI sweep compute failed", { gross: g }, e);
      }
    }

    if (!Array.isArray(brackets) || brackets.length === 0) {
      console.warn("[dev-sanity] SI: no income tax brackets found in taxContext; skipping boundary probes.");
      console.groupEnd();
      return;
    }

    const cutoffs = brackets
      .map((b) => b?.up_to)
      .filter((u) => typeof u === "number" && Number.isFinite(u))
      .sort((a, b) => a - b);

    // Helper: find best below/above rows around a taxable-income cutoff.
    const findAround = (cutoff) => {
      let below = null;
      let above = null;
      for (const row of sweep) {
        if (row.taxable <= cutoff) {
          if (!below || row.taxable > below.taxable) below = row;
        }
        if (row.taxable > cutoff) {
          if (!above || row.taxable < above.taxable) above = row;
        }
      }
      return { below, above };
    };

    // Monotonicity (gross-ordered)
    let monoOkTax = true;
    let monoOkNet = true;
    for (let i = 1; i < sweep.length; i++) {
      if (sweep[i].tax + 0.01 < sweep[i - 1].tax) monoOkTax = false;
      if (sweep[i].net + 0.01 < sweep[i - 1].net) monoOkNet = false;
    }
    console.log("[dev-sanity] SI OK: monotonicity across sweep?", { tax_non_decreasing: monoOkTax, net_non_decreasing: monoOkNet });
    if (!monoOkTax) console.error("[dev-sanity] SI monotonicity FAIL: incomeTax decreased across sweep");
    if (!monoOkNet) console.error("[dev-sanity] SI monotonicity FAIL: net decreased across sweep");

    // Boundary probes per cutoff
    for (const c of cutoffs) {
      const { below, above } = findAround(c);
      if (!below || !above) continue;

      const okTax = above.tax + 0.01 >= below.tax;
      const okNet = above.net + 0.01 >= below.net;

      console.log("[dev-sanity] SI boundary probe", {
        cutoff_taxableIncome_up_to: c,
        below,
        above,
        tax_non_decreasing: okTax,
        net_non_decreasing: okNet
      });

      if (!okTax) console.error("[dev-sanity] SI boundary FAIL: tax decreased across cutoff", { c, below, above });
      if (!okNet) console.error("[dev-sanity] SI boundary FAIL: net decreased across cutoff", { c, below, above });
    }

    console.groupEnd();
  };

  await siRun();





  // ---------------------------------------------------------------------------
  
  // ---------------------------------------------------------------------------
  // SE/2026 Sanity (Phase D light): Income tax + social contributions (aggregate)
  //
  // Scope:
  // - Structural/relational probes only (monotonicity, net/TCO reconciliation).
  // - This is not a statutory verification contract; rates are taken from rules-SE.json.
  // ---------------------------------------------------------------------------
  const baseSE = {
    countryCode: "SE",
    year: 2026,
    region: null,
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    childrenCount: 0,
    taxClass: null
  };

  const seRound2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

  const seCases = [
    { gross: 15000, tag: "SE: low income" },
    { gross: 30000, tag: "SE: mid income" },
    { gross: 50000, tag: "SE: upper mid income" },
    { gross: 80000, tag: "SE: high income" }
  ];

  const seRun = async () => {
    console.group("%c[dev-sanity] SE 2026 income tax + SSC (Phase D light)", "font-weight:bold");

    const results = [];

    for (const t of seCases) {
      const input = { ...baseSE, salaryAmount: t.gross };

      try {
        const res = await Engine.computeSalaryWithContext(input);
        const a = res?.annual || {};

        const grossA = seRound2(a.gross || 0);
        const tax = seRound2(a.incomeTaxTotal || 0);
        const empContrib = seRound2(a.employeeContribTotal || 0);
        const net = seRound2(a.net || 0);
        const tco = seRound2(a.tco || 0);

        const tcoGteNet = tco + 0.01 >= net;

        const otherEmp = a.employeeOtherTaxesById || {};
        const municipal = seRound2(otherEmp.municipal_average || 0);

        console.log("[dev-sanity] SE anchor", {
          tag: t.tag,
          gross_monthly: t.gross,
          gross_annual: grossA,
          incomeTax_annual: tax,
          employeeContrib_annual: empContrib,
          municipal_annual: municipal,
          net_annual: net,
          tco_annual: tco,
          checks: { tcoGteNet }
        });

        if (!tcoGteNet) {
          console.error("[dev-sanity] SE FAIL: TCO < net", { tag: t.tag, tco, net });
        }

        results.push({ gross: t.gross, tax, net });
      } catch (e) {
        console.error("[dev-sanity] SE anchor failed", { tag: t.tag, gross: t.gross }, e);
      }
    }

    // Simple monotonicity checks on the probe set
    if (results.length >= 2) {
      let monoNet = true;
      let monoTax = true;
      for (let i = 1; i < results.length; i++) {
        if (results[i].net + 0.01 < results[i - 1].net) monoNet = false;
        if (results[i].tax + 0.01 < results[i - 1].tax) monoTax = false;
      }

      console.log("[dev-sanity] SE monotonicity", {
        net_non_decreasing: monoNet,
        tax_non_decreasing: monoTax
      });
      if (!monoNet) console.error("[dev-sanity] SE monotonicity FAIL: net decreased with higher gross");
      if (!monoTax) console.error("[dev-sanity] SE monotonicity FAIL: tax decreased with higher gross");
    }

    console.groupEnd();
  };

  await seRun();

// IT/2026 Sanity (Phase D light): IRPEF + INPS aggregate + regional addizionale
  //
  // Scope:
  // - Structural/relational probes only (monotonicity, net/TCO reconciliation).
  // - This is not a statutory verification contract; rates are taken from rules-IT.json.
  // ---------------------------------------------------------------------------
  const baseIT = {
    countryCode: "IT",
    year: 2026,
    region: null,
    salaryPeriod: "monthly",
    benefitsAnnual: 0,
    childrenCount: 0,
    taxClass: null
  };

  const itRound2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

  const itCases = [
    { gross: 1200, tag: "IT: low income" },
    { gross: 2500, tag: "IT: mid income" },
    { gross: 4500, tag: "IT: upper mid income" },
    { gross: 7000, tag: "IT: high income (above 50k/year)" }
  ];

  const itRun = async () => {
    console.group("%c[dev-sanity] IT 2026 IRPEF + INPS + addizionale (Phase D light)", "font-weight:bold");

    const results = [];

    for (const t of itCases) {
      const input = { ...baseIT, salaryAmount: t.gross };

      try {
        const res = await Engine.computeSalaryWithContext(input);
        const a = res?.annual || {};

        const grossA = itRound2(a.gross || 0);
        const empContrib = itRound2(a.employeeContribTotal || 0);
        const empOther = itRound2(a.employeeOtherTaxesTotal || 0);
        const tax = itRound2(a.incomeTaxTotal || 0);
        const net = itRound2(a.net || 0);
        const tco = itRound2(a.tco || 0);

        const erContrib = itRound2(a.employerContribTotal || 0);
        const erOther = itRound2(a.employerOtherTaxesTotal || 0);

        const recomposedNet = itRound2(grossA - empContrib - empOther - tax);
        const recomposedTco = itRound2(grossA + erContrib + erOther);

        const netOk = Math.abs(net - recomposedNet) <= 0.01;
        const tcoOk = Math.abs(tco - recomposedTco) <= 0.01;
        const tcoGteNet = tco + 0.01 >= net;

        console.log("[dev-sanity] IT anchor", {
          tag: t.tag,
          gross_monthly: t.gross,
          annual: {
            gross: grossA,
            incomeTax: tax,
            employeeContrib: empContrib,
            employeeOther: empOther,
            net,
            tco,
            employerContrib: erContrib,
            employerOther: erOther
          },
          recomposedNet,
          recomposedTco,
          checks: { netOk, tcoOk, tcoGteNet }
        });

        if (!netOk) console.error("[dev-sanity] IT FAIL: net reconciliation", { tag: t.tag, net, recomposedNet });
        if (!tcoOk) console.error("[dev-sanity] IT FAIL: TCO reconciliation", { tag: t.tag, tco, recomposedTco });
        if (!tcoGteNet) console.error("[dev-sanity] IT FAIL: TCO < net", { tag: t.tag, tco, net });

        results.push({ gross: t.gross, tax, net });
      } catch (e) {
        console.error("[dev-sanity] IT anchor failed", { tag: t.tag, gross: t.gross }, e);
      }
    }

    // Simple monotonicity checks on the probe set
    if (results.length >= 2) {
      let monoNet = true;
      let monoTax = true;
      for (let i = 1; i < results.length; i++) {
        if (results[i].net + 0.01 < results[i - 1].net) monoNet = false;
        if (results[i].tax + 0.01 < results[i - 1].tax) monoTax = false;
      }
      console.log("[dev-sanity] IT monotonicity", {
        net_non_decreasing: monoNet,
        tax_non_decreasing: monoTax
      });
      if (!monoNet) console.error("[dev-sanity] IT monotonicity FAIL: net decreased with higher gross");
      if (!monoTax) console.error("[dev-sanity] IT monotonicity FAIL: tax decreased with higher gross");
    }

    console.groupEnd();
  };

  await itRun();


})();