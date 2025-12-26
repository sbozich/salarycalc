// assets/js/salary-engine.js
// Pure computation engine for the Salary Calculator.
// Depends on: window.SalaryRulesLoader.buildTaxContext (rules-loader.js)
// Optionally uses: window.SalaryFormulaRegistry (salary-formulas.js) for formula-based tax methods.

(function (window) {
  'use strict';

  /**
   * Generic engine error; UI should translate using i18nKey.
   * MSD defines app.error.generic as the generic error key.
   */
  class EngineError extends Error {
    constructor(i18nKey, details) {
      super(i18nKey);
      this.name = 'EngineError';
      this.i18nKey = i18nKey || 'app.error.generic';
      this.details = details || {};
    }
  }

  /**
   * Utility: round to currency_decimals with a rounding_mode.
   * Currently supports "nearest_cent" (as per MSD).
   */
  function roundCurrency(value, decimals, mode) {
    const d = (typeof decimals === 'number' && decimals >= 0) ? decimals : 2;
    const v = Number(value);

    if (!isFinite(v)) return 0;

    const factor = Math.pow(10, d);

    switch (mode) {
      case 'nearest_cent':
      default:
        return Math.round((v + Number.EPSILON) * factor) / factor;
    }
  }

  /**
   * Utility: convert a salary input to annual.
   * MSD: user inputs monthly or yearly; internal base is annual.
   */
  function toAnnual(amount, period) {
    const v = Number(amount);
    if (!isFinite(v) || v < 0) {
      throw new EngineError('error.invalidSalary', { amount, period });
    }
    if (period === 'monthly') {
      return v * 12;
    }
    if (period === 'yearly') {
      return v;
    }
    // Unknown period (should not happen if UI is wired correctly).
    throw new EngineError('app.error.generic', { cause: 'invalid_period', period });
  }

  /**
   * Utility: convert annual to monthly.
   * MSD: output must always show Month & Year columns.
   */
  function toMonthly(annual) {
    return annual / 12;
  }

  /**
   * Extract allowances from taxContext according to MSD.
   *
   * - For non-ES:
   *    use taxContext.incomeTax.allowances if present.
   * - For ES:
   *    use yearRules.income_tax.allowances (top-level allowances),
   *    while the actual tax schedules are per-region (national + regional).
   *
   * Result is a single annual allowances total.
   */
  function extractAnnualAllowances(taxContext) {
    const code = taxContext.countryCode;
    let src = null;

    if (code === 'ES') {
      // For Spain, use top-level YearRules.income_tax as allowance container.
      src = taxContext.yearRules && taxContext.yearRules.income_tax
        ? taxContext.yearRules.income_tax
        : null;
    } else {
      src = taxContext.incomeTax || null;
    }

    if (!src || !src.allowances) {
      return 0;
    }

    const a = src.allowances;
    const basic = Number(a.basic_tax_free || 0);
    const employment = Number(a.employment_expense_flat || 0);
    const other = Number(a.other_fixed || 0);

    const total = basic + employment + other;
    return total > 0 ? total : 0;
  }

  /**
   * Compute social contributions for employee and employer.
   *
   * socialContribRules structure (per MSD):
   * {
   *   health: { label, applies, employee_rate, employer_rate, ceiling, floor, basis, deductible_for_tax },
   *   pension: { ... },
   *   unemployment: { ... },
   *   other: [ { ... }, ... ]
   * }
   *
   * For now, basis is assumed to be gross (as in MSD examples).
   * Contributions that do not apply (applies === false) are skipped (amount = 0).
   */
  function computeContributionsAnnual(grossAnnual, socialContribRules, opts) {
    const base = Number(grossAnnual);
    opts = opts || {};

    if (!socialContribRules || typeof socialContribRules !== 'object') {
      return {
        employeeById: {},
        employerById: {},
        labelsById: {},
        employeeTotal: 0,
        employerTotal: 0,
        deductibleEmployeeTotal: 0
      };
    }

    const employeeById = {};
    const employerById = {};
    const labelsById = {};
    let employeeTotal = 0;
    let employerTotal = 0;
    let deductibleEmployeeTotal = 0;

    function processEntry(id, entry) {
      if (!entry || typeof entry !== 'object') return;

      const applies = !!entry.applies;
      const label = entry.label || id;

      labelsById[id] = label;

      if (!applies) {
        employeeById[id] = 0;
        employerById[id] = 0;
        return;
      }

      // Currently we treat basis as gross (as per MSD example).
      const contribBase = base;

      // Employee contribution can be either flat-rate (legacy) or bracketed (UK NI style).

      let empRate = Number(entry.employee_rate || 0);

      // Austria-specific: low-income tiered employee rate (e.g., unemployment/AV).
      // Basis: monthly gross, applied to REGULAR portion only. Tiers are evaluated on the pre-cap base.
      if (opts.countryCode === 'AT' && opts.atPortion !== 'special' &&
          Array.isArray(entry.low_income_employee_rate_tiers) &&
          entry.low_income_employee_rate_tiers.length > 0) {
        const basis = (entry.low_income_employee_rate_basis || 'monthly');
        const baseForTier = (basis === 'monthly') ? (contribBase / 12) : contribBase;

        let tierRate = empRate;
        for (const tier of entry.low_income_employee_rate_tiers) {
          const upTo = (tier.up_to == null) ? Infinity : Number(tier.up_to);
          if (baseForTier <= upTo) { tierRate = (('employee_rate' in tier) ? Number(tier.employee_rate) : empRate); break; }
        }
        empRate = tierRate;
      }

      let erRate  = Number(entry.employer_rate || 0);
// Ceilings/floors are optional; default unlimited and 0.
      const floor = (entry.floor != null) ? Number(entry.floor) : 0;
      const ceiling = (entry.ceiling != null) ? Number(entry.ceiling) : null;

      let effectiveBase = contribBase;
      if (effectiveBase < floor) effectiveBase = floor;
      if (ceiling != null && effectiveBase > ceiling) effectiveBase = ceiling;

      if (effectiveBase < 0) effectiveBase = 0;
      // Austria-specific: for 13th/14th salary calculations, low-income tiering is applied to REGULAR portion only.
      // If apply_to_special_payments is false, we still apply the contribution on SPECIAL portion at the base employee_rate (tiers already excluded by atPortion check).
let empAmount = 0;

      let erAmount  = 0;


      // Bracketed employee contribution (UK NI style)

      if (entry.employee && Array.isArray(entry.employee.brackets)) {

        empAmount = computeBracketedContribution(effectiveBase, entry.employee.brackets);

      } else {

        // Flat-rate employee contribution (legacy/most markets)

        empAmount = effectiveBase * empRate;

      }


      // Thresholded employer contribution (UK employer NI style)

      if (entry.employer && Number.isFinite(Number(entry.employer.threshold))) {

        const threshold = Number(entry.employer.threshold);

        const rate = Number(entry.employer.rate || 0);

        const employerBase = Math.max(0, effectiveBase - threshold);

        erAmount = employerBase * rate;

      } else {

        // Flat-rate employer contribution (legacy/most markets)

        erAmount = effectiveBase * erRate;

      }
employeeById[id] = empAmount;
      employerById[id] = erAmount;

      employeeTotal += empAmount;
      employerTotal += erAmount;

      if (entry.deductible_for_tax) {
        deductibleEmployeeTotal += empAmount;
      }
    }

    // Named contributions (health / pension / unemployment)
    Object.keys(socialContribRules).forEach((key) => {
      if (key === 'other') return;
      const entry = socialContribRules[key];
      processEntry(key, entry);
    });

    // "other" contributions (array).
    const otherList = Array.isArray(socialContribRules.other) ? socialContribRules.other : [];
    otherList.forEach((entry, index) => {
      const id = 'other_' + index;
      processEntry(id, entry);
    });

    return {
      employeeById,
      employerById,
      labelsById,
      employeeTotal,
      employerTotal,
      deductibleEmployeeTotal
    };
  }

  /**
   * Compute tax according to IncomeTaxRules for a single schedule.
   *
   * Supports:
   *  - type: "progressive" with brackets[]
   *  - type: "flat" with flat_rate
   *  - type: "formula" with formula.use_formula + formula.method (hook)
   *
   * Returns:
   * {
   *   amount: Number,
   *   type: "progressive" | "flat" | "formula",
   *   details: {...}
   * }
   */
  
function computeBracketedContribution(baseAnnual, brackets) {
  let remaining = Number(baseAnnual || 0);
  let prevLimit = 0;
  let total = 0;

  for (const b of brackets) {
    const upTo = (b.up_to == null) ? Infinity : Number(b.up_to);
    const rate = Number(b.rate || 0);
    const span = Math.max(0, upTo - prevLimit);

    if (remaining <= 0) break;

    const taxable = Math.min(remaining, span);
    total += taxable * rate;

    remaining -= taxable;
    prevLimit = upTo;
  }
  return total;
}

function computeTaxByRules(taxableAnnual, taxRules, currencyDecimals, roundingMode, extraCtx) {
    if (!taxRules || typeof taxRules !== 'object') {
      return {
        amount: 0,
        type: 'none',
        details: {}
      };
    }

    const taxable = Math.max(0, Number(taxableAnnual) || 0);
    const type = taxRules.type || 'progressive';

    // Progressive tax with brackets.
    if (type === 'progressive') {
      const brackets = Array.isArray(taxRules.brackets) ? taxRules.brackets : [];
      let remaining = taxable;
      let prevLimit = 0;
      let tax = 0;

      for (let i = 0; i < brackets.length; i++) {
        const b = brackets[i];
        if (!b) continue;

        const upTo = (b.up_to == null) ? null : Number(b.up_to);
        const rate = Number(b.rate || 0);

        const upper = (upTo == null) ? Infinity : upTo;
        const span = Math.max(0, upper - prevLimit);

        if (remaining <= 0 || span <= 0) {
          prevLimit = upper;
          continue;
        }

        const taxableInBracket = Math.min(remaining, span);
        tax += taxableInBracket * rate;

        remaining -= taxableInBracket;
        prevLimit = upper;

        if (remaining <= 0) break;
      }

      const rounded = roundCurrency(tax, currencyDecimals, roundingMode);
      return {
        amount: rounded,
        type: 'progressive',
        details: {
          taxable,
          bracketsUsed: brackets.length
        }
      };
    }

    // Flat rate tax.
    if (type === 'flat') {
      const rate = Number(taxRules.flat_rate || 0);
      const tax = taxable * rate;
      const rounded = roundCurrency(tax, currencyDecimals, roundingMode);
      return {
        amount: rounded,
        type: 'flat',
        details: {
          taxable,
          rate
        }
      };
    }

    // Formula-based tax (pluggable via SalaryFormulaRegistry).
    if (type === 'formula') {
      const f = taxRules.formula || {};
      const useFormula = !!f.use_formula;
      const method = f.method || null;
      const parameters = f.parameters || {};

      if (!useFormula || !method) {
        // No valid formula definition; treat as zero tax.
        return {
          amount: 0,
          type: 'formula',
          details: {
            taxable,
            method: null,
            note: 'formula_not_configured'
          }
        };
      }

      const registry = window.SalaryFormulaRegistry || null;
      if (!registry || typeof registry.get !== 'function') {
        // Registry missing — misconfigured build.
        throw new EngineError('app.error.generic', {
          cause: 'formula_registry_missing',
          method,
          taxable
        });
      }

      const impl = registry.get(method);
      if (typeof impl !== 'function') {
        // Method not registered — explicit failure.
        throw new EngineError('app.error.generic', {
          cause: 'formula_not_registered',
          method,
          taxable
        });
      }

      let taxRaw;
      try {
        const formulaCtx = {
          taxable,
          taxRules,
          parameters,
          currencyDecimals,
          roundingMode
        };
        if (extraCtx && typeof extraCtx === 'object') {
          formulaCtx.extra = extraCtx;
        }
        taxRaw = impl(formulaCtx);
      } catch (e) {
        // Bubble up as generic error, but keep details for debugging.
        throw new EngineError('app.error.generic', {
          cause: 'formula_execution_error',
          method,
          taxable,
          originalError: String(e && e.message ? e.message : e)
        });
      }

      const tax = Number(taxRaw);
      if (!isFinite(tax) || tax < 0) {
        throw new EngineError('app.error.generic', {
          cause: 'formula_invalid_result',
          method,
          taxable,
          taxRaw
        });
      }

      const rounded = roundCurrency(tax, currencyDecimals, roundingMode);
      return {
        amount: rounded,
        type: 'formula',
        details: {
          taxable,
          method,
          usedParameters: parameters
        }
      };
    }

    // Unknown type -> no tax.
    return {
      amount: 0,
      type: 'unknown',
      details: {
        taxable,
        type
      }
    };
  }

  /**
   * Compute Spain dual IRPF: national + regional schedules.
   * Expects taxContext.spainRegionTax to be:
   * { nationalIncomeTax: IncomeTaxRules, regionalIncomeTax: IncomeTaxRules }
   */
  function computeSpainIncomeTax(taxableAnnual, taxContext, currencyDecimals, roundingMode) {
    const spainRegionTax = taxContext.spainRegionTax;
    if (!spainRegionTax) {
      throw new EngineError('app.error.generic', { cause: 'missing_spain_region_tax' });
    }

    const nationalRules = spainRegionTax.nationalIncomeTax || null;
    const regionalRules = spainRegionTax.regionalIncomeTax || null;

    const national = computeTaxByRules(taxableAnnual, nationalRules, currencyDecimals, roundingMode);
    const regional = computeTaxByRules(taxableAnnual, regionalRules, currencyDecimals, roundingMode);

    const total = roundCurrency(
      (national.amount || 0) + (regional.amount || 0),
      currencyDecimals,
      roundingMode
    );

    return {
      total,
      national,
      regional
    };
  }

  /**
   * Compute "other taxes" (e.g., solidarity) as per MSD.
   *
   * Structure example:
   * {
   *   "solidarity": {
   *     "applies": false,
   *     "rate": 0.055,
   *     "basis": "income_tax",
   *     "cap": null
   *   }
   * }
   *
   * Basis may refer to:
   *   - "income_tax" (use total income tax as base)
   *   - "gross" (use grossAnnual as base)
   * (If anything else is encountered, we conservatively default to 0.)
   */
  
function computeTaxCreditsAnnual(incomeAnnual, taxCreditsRules) {
  // Generic credit handler supporting:
  // 1) phase-out model: { max, phaseout_start, phaseout_end, phaseout_rate_per_eur }
  // 2) segments model: { segments:[{ up_to, base, rate, over }] }
  // Returns { total, byId } with all values >= 0.
  const byId = {};
  let total = 0;

  if (!taxCreditsRules || typeof taxCreditsRules !== "object") return { total: 0, byId: {} };

  for (const [id, rule] of Object.entries(taxCreditsRules)) {
    if (!rule || typeof rule !== "object") continue;

    let v = 0;

    // Phase-out style
    if (typeof rule.max === "number" && typeof rule.phaseout_start === "number") {
      const max = rule.max;
      const start = rule.phaseout_start;
      const end = (typeof rule.phaseout_end === "number") ? rule.phaseout_end : null;
      const rate = (typeof rule.phaseout_rate_per_eur === "number") ? rule.phaseout_rate_per_eur
        : (typeof rule.phaseout_rate === "number") ? rule.phaseout_rate
        : 0;

      if (incomeAnnual <= start) {
        v = max;
      } else if (end != null && incomeAnnual >= end) {
        v = 0;
      } else {
        const excess = incomeAnnual - start;
        v = Math.max(0, max - (excess * rate));
      }
    }

    // Segments style (override v if segments present)
    if (Array.isArray(rule.segments)) {
      let cur = 0;
      for (const seg of rule.segments) {
        if (!seg || typeof seg !== "object") continue;
        const upTo = (typeof seg.up_to === "number") ? seg.up_to : null;

        const base = (typeof seg.base === "number") ? seg.base : 0;
        const rate = (typeof seg.rate === "number") ? seg.rate : 0;
        const over = (typeof seg.over === "number") ? seg.over : 0;

        if (upTo == null || incomeAnnual <= upTo) {
          cur = base + rate * Math.max(0, incomeAnnual - over);
          break;
        } else {
          cur = base + rate * Math.max(0, upTo - over);
        }
      }
      v = cur;
    }

    v = Math.max(0, v);
    byId[id] = v;
    total += v;
  }

  return { total, byId };
}

function computeOtherTaxesAnnual(
    grossAnnual,
    taxableAnnual,
    incomeTaxTotalAnnual,
    otherTaxRules,
    currencyDecimals,
    roundingMode
  ) {
    if (!otherTaxRules || typeof otherTaxRules !== 'object') {
      return {
        total: 0,
        byId: {},
        employeeTotal: 0,
        employerTotal: 0,
        employeeById: {},
        employerById: {}
      };
    }

    const byId = {};
    const employeeById = {};
    const employerById = {};
    let total = 0;
    let employeeTotal = 0;
    let employerTotal = 0;

    Object.keys(otherTaxRules).forEach((key) => {
      const rule = otherTaxRules[key];
      if (!rule || typeof rule !== 'object') {
        byId[key] = 0;
        employeeById[key] = 0;
        employerById[key] = 0;
        return;
      }

      const applies = rule.applies !== false;
      if (!applies) {
        byId[key] = 0;
        employeeById[key] = 0;
        employerById[key] = 0;
        return;
      }

      const basis = rule.basis || 'gross'; // 'gross' | 'taxable_income' | 'income_tax'
      const incidence = (rule.incidence || 'employee').toLowerCase(); // 'employee' | 'employer'

      let baseAmount = 0;
      if (basis === 'gross') baseAmount = grossAnnual;
      else if (basis === 'taxable_income') baseAmount = taxableAnnual;
      else if (basis === 'income_tax') baseAmount = incomeTaxTotalAnnual;
      else baseAmount = grossAnnual;

      let amount = 0;

      // Standard rate
      if (Number.isFinite(Number(rule.rate))) {
        amount = baseAmount * Number(rule.rate);
      }

      // Optional tapered income-tax style rules (used by some markets)
      if (
        Number.isFinite(Number(rule.free_threshold)) &&
        Number.isFinite(Number(rule.taper_rate)) &&
        Number.isFinite(Number(rule.standard_rate)) &&
        basis === 'income_tax'
      ) {
        const freeThreshold = Number(rule.free_threshold);
        const taperRate = Number(rule.taper_rate);
        const standardRate = Number(rule.standard_rate);

        if (baseAmount <= freeThreshold) {
          amount = 0;
        } else {
          const taper = (baseAmount - freeThreshold) * taperRate;
          const standard = baseAmount * standardRate;
          amount = Math.min(taper, standard);
        }
      }

      // Apply cap if present
      const cap = rule.cap != null ? Number(rule.cap) : (rule.max != null ? Number(rule.max) : null);
      if (cap != null && cap >= 0 && amount > cap) {
        amount = cap;
      }

      const rounded = roundCurrency(amount, currencyDecimals, roundingMode);
      byId[key] = rounded;
      total += rounded;

      if (incidence === 'employer') {
        employerById[key] = rounded;
        employeeById[key] = 0;
        employerTotal += rounded;
      } else {
        employeeById[key] = rounded;
        employerById[key] = 0;
        employeeTotal += rounded;
      }
    });

    total = roundCurrency(total, currencyDecimals, roundingMode);
    employeeTotal = roundCurrency(employeeTotal, currencyDecimals, roundingMode);
    employerTotal = roundCurrency(employerTotal, currencyDecimals, roundingMode);

    return {
      total,
      byId,
      employeeTotal,
      employerTotal,
      employeeById,
      employerById
    };
  }

  /**
   * Build high-level "tables" structure with Month & Year columns,
   * ready for UI rendering. Labels are provided via i18n keys and
   * contribution labels from JSON.
   */
  function buildOutputTables(result) {
    const r = result;

    // Summary block
    const summary = [
      {
        key: 'gross',
        labelKey: 'output.gross.label',
        month: r.monthly.gross,
        year: r.annual.gross
      },
      {
        key: 'benefits',
        labelKey: 'output.benefits.label',
        month: r.monthly.benefits,
        year: r.annual.benefits
      }
    ];

    // Taxes block
    const taxes = [
      {
        key: 'income_tax',
        labelKey: 'output.taxes.income',
        month: r.monthly.incomeTaxTotal,
        year: r.annual.incomeTaxTotal
      },
      {
        key: 'other_taxes',
        labelKey: 'output.taxes.other',
        month: r.monthly.otherTaxesTotal,
        year: r.annual.otherTaxesTotal
      },
      {
        key: 'taxes_total',
        labelKey: 'output.taxes.total',
        month: r.monthly.taxesTotal,
        year: r.annual.taxesTotal
      }
    ];

    // Employee contributions block
    const contribEmployee = [];
    Object.keys(r.annual.employeeContribById).forEach((id) => {
      contribEmployee.push({
        key: id,
        label: r.contributionLabels[id] || id,
        month: r.monthly.employeeContribById[id],
        year: r.annual.employeeContribById[id]
      });
    });
    const contribEmployeeTotals = [
      {
        key: 'employee_total',
        labelKey: 'output.contrib.totalEmployee',
        month: r.monthly.employeeContribTotal,
        year: r.annual.employeeContribTotal
      }
    ];

    // Employer contributions block
    const contribEmployer = [];
    Object.keys(r.annual.employerContribById).forEach((id) => {
      contribEmployer.push({
        key: id,
        label: r.contributionLabels[id] || id,
        month: r.monthly.employerContribById[id],
        year: r.annual.employerContribById[id]
      });
    });
    const contribEmployerTotals = [
      {
        key: 'employer_total',
        labelKey: 'output.contrib.totalEmployer',
        month: r.monthly.employerContribTotal,
        year: r.annual.employerContribTotal
      }
    ];

    // Net / TCO block
    const netTco = [
      {
        key: 'net',
        labelKey: 'output.net.label',
        month: r.monthly.net,
        year: r.annual.net
      },
      {
        key: 'tco',
        labelKey: 'output.tco.label',
        month: r.monthly.tco,
        year: r.annual.tco
      }
    ];

    return {
      summary,
      taxes,
      employeeContributions: {
        rows: contribEmployee,
        totals: contribEmployeeTotals
      },
      employerContributions: {
        rows: contribEmployer,
        totals: contribEmployerTotals
      },
      netAndTco: netTco
    };
  }

  /**
   * Core compute function.
   *
   * options = {
   *   taxContext,    // from SalaryRulesLoader.buildTaxContext(...)
   *   salaryAmount,  // user input
   *   salaryPeriod,  // "monthly" | "yearly"
   *   benefitsAnnual // optional, defaults to 0
   * }
   */
  function computeSalary(options) {
    const taxContext = options.taxContext;
    const salaryAmount = options.salaryAmount;
    const salaryPeriod = options.salaryPeriod;
    const benefitsAnnual = Number(options.benefitsAnnual || 0);

    if (!taxContext) {
      throw new EngineError('app.error.generic', { cause: 'missing_tax_context' });
    }

    // NEW (B-INV-1): DE tax class required when yearRules.tax_classes exists
    if (
      taxContext.countryCode === 'DE' &&
      taxContext.yearRules &&
      taxContext.yearRules.tax_classes &&
      typeof taxContext.yearRules.tax_classes === 'object' &&
      !taxContext.taxClass
    ) {
      throw new EngineError('error.invalidTaxClass', {
        country: 'DE',
        year: taxContext.year,
        cause: 'missing_tax_class_required'
      });
    }

    // NEW (B-INV-2): CalcMode must exist and match taxContext core keys
    if (!taxContext.calcMode) {
      throw new EngineError('app.error.generic', { cause: 'missing_calc_mode' });
    }

    if (
      taxContext.calcMode.countryCode !== taxContext.countryCode ||
      String(taxContext.calcMode.year) !== String(taxContext.year) ||
      String(taxContext.calcMode.taxClass || '') !== String(taxContext.taxClass || '')
    ) {
      throw new EngineError('app.error.generic', {
        cause: 'calc_mode_mismatch',
        calcMode: taxContext.calcMode
      });
    }

    // Accept both calculationFlags (from context) and calculation_flags (from raw JSON)
    const flags = taxContext.calculationFlags || taxContext.calculation_flags || {};
    const roundingMode = flags.rounding_mode || 'nearest_cent';
    const currencyDecimals = (typeof flags.currency_decimals === 'number')
      ? flags.currency_decimals
      : 2;

    if (salaryAmount == null || salaryAmount === '') {
      throw new EngineError('error.noSalary', {});
    }

    // 1) Convert to annual (with AT special-pay support)
    const salaryMonthsInput = (options.salaryMonths != null && options.salaryMonths !== '')
      ? Number(options.salaryMonths)
      : null;

    const yearRules = taxContext.yearRules || {};
const sp = (taxContext.countryCode === 'AT' &&
            yearRules &&
            yearRules.special_payments &&
            yearRules.special_payments.enabled)
  ? yearRules.special_payments
  : null;

// Default gross annualization
let grossAnnual = toAnnual(salaryAmount, salaryPeriod);
let grossMonthly = (salaryPeriod === 'monthly') ? Number(salaryAmount) : toMonthly(grossAnnual);

// AT: if special payments enabled and user provides salaryMonths > regular_months,
// split into regular (12) + special part, for BOTH monthly and yearly input.
let atRegularGrossAnnual = null;
let atSpecialGrossAnnual = null;
let atSalaryMonthsEffective = null;

if (sp) {
  const regularMonths = Number(sp.regular_months || 12);
  const requestedMonths =
    (salaryMonthsInput != null && Number.isFinite(salaryMonthsInput))
      ? salaryMonthsInput
      : Number(sp.default_salary_months || regularMonths);

  const effectiveMonths = Math.max(regularMonths, Math.round(requestedMonths));
  atSalaryMonthsEffective = effectiveMonths;

  if (effectiveMonths > regularMonths) {
    if (salaryPeriod === 'monthly') {
      const monthly = Number(salaryAmount);
      atRegularGrossAnnual = monthly * regularMonths;
      atSpecialGrossAnnual = monthly * (effectiveMonths - regularMonths);
      grossAnnual = atRegularGrossAnnual + atSpecialGrossAnnual;
      grossMonthly = monthly; // keep user-entered monthly
    } else if (salaryPeriod === 'yearly') {
      const annual = grossAnnual; // already yearly input
      const monthlyBase = annual / effectiveMonths;

      atRegularGrossAnnual = monthlyBase * regularMonths;
      atSpecialGrossAnnual = annual - atRegularGrossAnnual;

      grossAnnual = atRegularGrossAnnual + atSpecialGrossAnnual;
      // Monthly outputs stay as "annual / 12" average
      grossMonthly = grossAnnual / 12;
    }
  }
}



    // 2) Compute contributions
    let contrib;
    if (sp && atRegularGrossAnnual != null && atSpecialGrossAnnual != null) {
      const sc = taxContext.socialContributions;
      const scCfg = (sp && sp.social_contributions) ? sp.social_contributions : {};
      const regularCeiling = (scCfg.regular_ceiling_annual != null) ? Number(scCfg.regular_ceiling_annual) : null;
      const specialCeiling = (scCfg.special_ceiling_annual != null) ? Number(scCfg.special_ceiling_annual) : null;

      function cloneSocialWithCeilingCap(socialRules, capAnnual) {
        if (!socialRules || typeof socialRules !== 'object') return socialRules;
        const out = JSON.parse(JSON.stringify(socialRules));
        const applyCap = (entry) => {
          if (!entry || typeof entry !== 'object') return;
          if (capAnnual == null || !Number.isFinite(capAnnual)) return;
          if (entry.ceiling == null) {
            entry.ceiling = capAnnual;
          } else {
            const c = Number(entry.ceiling);
            entry.ceiling = Math.min(c, capAnnual);
          }
        };
        ['health','pension','unemployment'].forEach(k => { if (out[k]) applyCap(out[k]); });
        if (Array.isArray(out.other)) out.other.forEach(applyCap);
        return out;
      }

      const contribRegular = computeContributionsAnnual(atRegularGrossAnnual, cloneSocialWithCeilingCap(sc, regularCeiling), { countryCode: 'AT', atPortion: 'regular' });
      const contribSpecial = computeContributionsAnnual(atSpecialGrossAnnual, cloneSocialWithCeilingCap(sc, specialCeiling), { countryCode: 'AT', atPortion: 'special' });

      // Merge (sum by id)
      const employeeById = {};
      const employerById = {};
      const labelsById = {};
      for (const [k,v] of Object.entries(contribRegular.employeeById || {})) employeeById[k] = (employeeById[k] || 0) + Number(v||0);
      for (const [k,v] of Object.entries(contribSpecial.employeeById || {})) employeeById[k] = (employeeById[k] || 0) + Number(v||0);
      for (const [k,v] of Object.entries(contribRegular.employerById || {})) employerById[k] = (employerById[k] || 0) + Number(v||0);
      for (const [k,v] of Object.entries(contribSpecial.employerById || {})) employerById[k] = (employerById[k] || 0) + Number(v||0);
      Object.assign(labelsById, (contribRegular.labelsById||{}), (contribSpecial.labelsById||{}));

      contrib = {
        employeeById,
        employerById,
        labelsById,
        employeeTotal: Number(contribRegular.employeeTotal||0) + Number(contribSpecial.employeeTotal||0),
        employerTotal: Number(contribRegular.employerTotal||0) + Number(contribSpecial.employerTotal||0),
        deductibleEmployeeTotal: Number(contribRegular.deductibleEmployeeTotal||0) + Number(contribSpecial.deductibleEmployeeTotal||0),
        _atSplit: {
          regular: contribRegular,
          special: contribSpecial
        }
      };
    } else {

      // Fallback: if loader did not populate taxContext.socialContributions, read directly from yearRules.
      if (!taxContext.socialContributions || Object.keys(taxContext.socialContributions).length === 0) {
        taxContext.socialContributions = (taxContext.yearRules && taxContext.yearRules.social_contributions) ? taxContext.yearRules.social_contributions : (taxContext.socialContributions || {});
      }
      contrib = computeContributionsAnnual(grossAnnual, taxContext.socialContributions, { countryCode: taxContext.countryCode });
    }


    // 3) Apply allowances
    const allowancesAnnual = extractAnnualAllowances(taxContext);

    // 4) Taxable income
    const taxablePreClamp = grossAnnual - contrib.deductibleEmployeeTotal - allowancesAnnual;
    let taxableAnnual = taxablePreClamp > 0 ? taxablePreClamp : 0;

    // FR (Phase D): taxable income is based on net-before-tax minus professional expense deduction.
    // This overrides the generic "allowances/deductible contributions" model, while keeping the same output schema.
    if (taxContext.countryCode === 'FR') {
      const netBeforeTaxAnnual = Math.max(0, grossAnnual - Number(contrib.employeeTotal || 0));

      const frDed =
        (yearRules && yearRules.income_tax && yearRules.income_tax.professional_deduction)
          ? yearRules.income_tax.professional_deduction
          : null;

      if (frDed && frDed.enabled !== false) {
        const rate = Number(frDed.rate != null ? frDed.rate : 0.10);
        const min = Number(frDed.min != null ? frDed.min : 0);
        const max = Number(frDed.max != null ? frDed.max : Infinity);

        const raw = netBeforeTaxAnnual * rate;
        const proDed = Math.min(max, Math.max(min, raw));

        taxableAnnual = Math.max(0, netBeforeTaxAnnual - proDed);
      } else {
        taxableAnnual = netBeforeTaxAnnual;
      }
    }

    // 5) Income tax
    let incomeTax;

    // AT special payments (13th/14th): preferential taxation within annual-sixth
    if (sp && atRegularGrossAnnual != null && atSpecialGrossAnnual != null) {
      const contribRegular = (contrib && contrib._atSplit && contrib._atSplit.regular) ? contrib._atSplit.regular : null;
      const contribSpecial = (contrib && contrib._atSplit && contrib._atSplit.special) ? contrib._atSplit.special : null;
      if (!contribRegular || !contribSpecial) {
        throw new EngineError('app.error.generic', { cause: 'missing_at_split_contrib' });
      }

      const deductibleRegular = Number(contribRegular.deductibleEmployeeTotal || 0);
      const deductibleSpecial = Number(contribSpecial.deductibleEmployeeTotal || 0);

      // Allowances apply once (annual)
      const allowancesAnnualLocal = allowancesAnnual;

      const regularTaxableBase = Math.max(0, atRegularGrossAnnual - deductibleRegular - allowancesAnnualLocal);
      const specialTaxableBase = Math.max(0, atSpecialGrossAnnual - deductibleSpecial);

      // Annual-sixth cap: based on regular gross (mode regular_gross_over_6)
      const sixth = Math.max(0, atRegularGrossAnnual / 6);
      const preferentialCapBase = Math.min(specialTaxableBase, sixth);
      const overflowToRegular = Math.max(0, specialTaxableBase - preferentialCapBase);

      // Apply special allowance against preferential base
      const specialAllowance = Number(sp.allowance_annual || 0);
      const preferentialTaxable = Math.max(0, preferentialCapBase - specialAllowance);

      // Regular tax rules
      const mainRules = taxContext.incomeTax;
      if (!mainRules) {
        throw new EngineError('app.error.generic', { cause: 'missing_income_tax_rules' });
      }

      const regularTax = computeTaxByRules(
        Math.max(0, regularTaxableBase + overflowToRegular),
        mainRules,
        currencyDecimals,
        roundingMode,
        {
          countryCode: taxContext.countryCode,
          taxClass: taxContext.taxClass || null,
          childrenCount: (taxContext.childrenCount != null ? Number(taxContext.childrenCount) : 0),
          yearRules
        }
      );

      const specialRules = sp.income_tax || null;
      const specialTax = computeTaxByRules(
        preferentialTaxable,
        specialRules,
        currencyDecimals,
        roundingMode,
        {
          countryCode: taxContext.countryCode,
          taxClass: taxContext.taxClass || null,
          childrenCount: (taxContext.childrenCount != null ? Number(taxContext.childrenCount) : 0),
          yearRules,
          specialPay: true
        }
      );

      incomeTax = {
        total: Number(regularTax.amount || 0) + Number(specialTax.amount || 0),
        main: regularTax,
        special: {
          amount: specialTax.amount || 0,
          taxablePreferential: preferentialTaxable,
          taxableBase: specialTaxableBase,
          capBase: preferentialCapBase,
          sixth,
          allowance: specialAllowance,
          overflowToRegular
        }
      };

    } else if (taxContext.countryCode === 'ES') {
      incomeTax = computeSpainIncomeTax(taxableAnnual, taxContext, currencyDecimals, roundingMode);
    } else {
      const mainRules = taxContext.incomeTax;
      if (!mainRules) {
        throw new EngineError('app.error.generic', { cause: 'missing_income_tax_rules' });
      }
      const main = computeTaxByRules(
        taxableAnnual,
        mainRules,
        currencyDecimals,
        roundingMode,
        {
          countryCode: taxContext.countryCode,
          taxClass: taxContext.taxClass || null,
          childrenCount: (taxContext.childrenCount != null ? Number(taxContext.childrenCount) : 0),
          yearRules: taxContext.yearRules || null
        }
      );
      incomeTax = {
        total: main.amount,
        main
      };
    }

    let incomeTaxTotalAnnual = incomeTax.total || 0;
  // Apply tax credits if defined in rules (e.g., NL "heffingskortingen").
  // Credits reduce income tax (non-refundable in this simplified model).
  let taxCreditsTotalAnnual = 0;
  let taxCreditsById = {};
  if (yearRules && yearRules.income_tax && yearRules.income_tax.tax_credits) {
    const credits = computeTaxCreditsAnnual(grossAnnual, yearRules.income_tax.tax_credits);
    taxCreditsTotalAnnual = credits.total || 0;
    taxCreditsById = credits.byId || {};
    const reduced = Math.max(0, incomeTaxTotalAnnual - taxCreditsTotalAnnual);
    incomeTax.total = reduced;
        // Re-sync scalar total used for net/tax totals AFTER credits (do not use a pre-credit frozen value)
        incomeTaxTotalAnnual = incomeTax.total;

    if (incomeTax.main) incomeTax.main.amount = Math.max(0, (incomeTax.main.amount || 0) - taxCreditsTotalAnnual);
    incomeTax.credits = { total: taxCreditsTotalAnnual, byId: taxCreditsById };
  }

  // Refresh after credit reduction
  incomeTaxTotalAnnual = incomeTax.total || 0;

    // 6) Other taxes
    const otherTaxes = computeOtherTaxesAnnual(
      grossAnnual,
      taxableAnnual,
      incomeTaxTotalAnnual,
      taxContext.otherTaxes,
      currencyDecimals,
      roundingMode
    );
    const otherTaxesTotalAnnual = otherTaxes.total || 0;
    const otherTaxesEmployeeTotalAnnual = otherTaxes.employeeTotal || 0;
    const otherTaxesEmployerTotalAnnual = otherTaxes.employerTotal || 0;

    // 7) Net salary
    const employeeContribTotalAnnual = contrib.employeeTotal;
    const employerContribTotalAnnual = contrib.employerTotal;

    // Employee-borne taxes only (income tax + employee-incidence other taxes)
    const taxesTotalAnnual = incomeTaxTotalAnnual + otherTaxesEmployeeTotalAnnual;

    const netAnnual = grossAnnual - employeeContribTotalAnnual - taxesTotalAnnual;
    const netMonthly = toMonthly(netAnnual);

    // 8) TCO (Total Cost to Employer) includes employer contributions + employer-incidence other taxes
    const tcoAnnual = grossAnnual + employerContribTotalAnnual + otherTaxesEmployerTotalAnnual;
    const tcoMonthly = toMonthly(tcoAnnual);

    // 9) Benefits
    const benefitsAnnualFinal = benefitsAnnual > 0 ? benefitsAnnual : 0;
    const benefitsMonthlyFinal = toMonthly(benefitsAnnualFinal);

    // 10) Build annual + monthly rounded outputs
    const annual = {
      gross: roundCurrency(grossAnnual, currencyDecimals, roundingMode),
      benefits: roundCurrency(benefitsAnnualFinal, currencyDecimals, roundingMode),
      employeeContribById: {},
      employerContribById: {},
      employeeContribTotal: roundCurrency(employeeContribTotalAnnual, currencyDecimals, roundingMode),
      employerContribTotal: roundCurrency(employerContribTotalAnnual, currencyDecimals, roundingMode),
      allowances: roundCurrency(allowancesAnnual, currencyDecimals, roundingMode),
      taxableIncome: roundCurrency(taxableAnnual, currencyDecimals, roundingMode),
      incomeTaxTotal: roundCurrency(incomeTaxTotalAnnual, currencyDecimals, roundingMode),
      otherTaxesTotal: roundCurrency(otherTaxesTotalAnnual, currencyDecimals, roundingMode),
      employeeOtherTaxesTotal: roundCurrency(otherTaxesEmployeeTotalAnnual, currencyDecimals, roundingMode),
      employerOtherTaxesTotal: roundCurrency(otherTaxesEmployerTotalAnnual, currencyDecimals, roundingMode),
      employeeOtherTaxesById: otherTaxes.employeeById || {},
      employerOtherTaxesById: otherTaxes.employerById || {},
      taxesTotal: roundCurrency(taxesTotalAnnual, currencyDecimals, roundingMode),
      net: roundCurrency(netAnnual, currencyDecimals, roundingMode),
      tco: roundCurrency(tcoAnnual, currencyDecimals, roundingMode)
    };

    const monthly = {
      gross: roundCurrency(grossMonthly, currencyDecimals, roundingMode),
      benefits: roundCurrency(benefitsMonthlyFinal, currencyDecimals, roundingMode),
      employeeContribById: {},
      employerContribById: {},
      employeeContribTotal: roundCurrency(toMonthly(employeeContribTotalAnnual), currencyDecimals, roundingMode),
      employerContribTotal: roundCurrency(toMonthly(employerContribTotalAnnual), currencyDecimals, roundingMode),
      allowances: roundCurrency(toMonthly(allowancesAnnual), currencyDecimals, roundingMode),
      taxableIncome: roundCurrency(toMonthly(taxableAnnual), currencyDecimals, roundingMode),
      incomeTaxTotal: roundCurrency(toMonthly(incomeTaxTotalAnnual), currencyDecimals, roundingMode),
      otherTaxesTotal: roundCurrency(toMonthly(otherTaxesTotalAnnual), currencyDecimals, roundingMode),
      taxesTotal: roundCurrency(toMonthly(taxesTotalAnnual), currencyDecimals, roundingMode),
      net: roundCurrency(netMonthly, currencyDecimals, roundingMode),
      tco: roundCurrency(tcoMonthly, currencyDecimals, roundingMode)
    };

    // Fill contribution breakdowns (annual + monthly).
    Object.keys(contrib.employeeById).forEach((id) => {
      const a = contrib.employeeById[id] || 0;
      annual.employeeContribById[id] = roundCurrency(a, currencyDecimals, roundingMode);
      monthly.employeeContribById[id] = roundCurrency(toMonthly(a), currencyDecimals, roundingMode);
    });

    Object.keys(contrib.employerById).forEach((id) => {
      const a = contrib.employerById[id] || 0;
      annual.employerContribById[id] = roundCurrency(a, currencyDecimals, roundingMode);
      monthly.employerContribById[id] = roundCurrency(toMonthly(a), currencyDecimals, roundingMode);
    });

    // 11) Build table-oriented structure for UI
    const tables = buildOutputTables({
      annual,
      monthly,
      contributionLabels: contrib.labelsById
    });

    return {
      meta: {
        countryCode: taxContext.countryCode,
        countryName: taxContext.countryName,
        year: taxContext.year,
        currency: taxContext.currency,
        inputPeriod: salaryPeriod,
        roundingMode,
        currencyDecimals
      },
      taxContext,
      annual,
      monthly,
      incomeTax,
      otherTaxes,
      contributionLabels: contrib.labelsById,
      tables
    };
  }

  /**
   * Orchestrator helper: build taxContext and compute in one step.
   *
   * options = {
   *   countryCode,
   *   year,
   *   region,        // ES only
   *   taxClass,      // DE only, optional for others
   *   salaryAmount,
   *   salaryPeriod,  // "monthly" | "yearly"
   *   benefitsAnnual // optional
   * }
   */
  async function computeSalaryWithContext(options) {
    const loader = window.SalaryRulesLoader;
    if (!loader || typeof loader.buildTaxContext !== 'function') {
      throw new EngineError('app.error.generic', { cause: 'missing_rules_loader' });
    }

    const taxContext = await loader.buildTaxContext({
      countryCode: options.countryCode,
      year: options.year,
      region: options.region,
      taxClass: options.taxClass
    });

    // Children are a DE-specific input (currently used for tax class II relief / KFB heuristics)
    // Keep it on taxContext so it can be forwarded into formula implementations via extraCtx.
    taxContext.childrenCount = (options.childrenCount != null ? Number(options.childrenCount) : 0);

    return computeSalary({
      taxContext,
      salaryAmount: options.salaryAmount,
      salaryPeriod: options.salaryPeriod,
      salaryMonths: options.salaryMonths,
      benefitsAnnual: options.benefitsAnnual
    });
  }

  // Public API
  const SalaryEngine = {
    EngineError,
    computeSalary,
    computeSalaryWithContext
  };

  window.SalaryEngine = SalaryEngine;
})(window);