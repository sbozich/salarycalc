// assets/js/salary-formulas.js
// Registry for formula-based tax methods (e.g. "de_estg_2026").
// No tax-law numbers are hardcoded here by default; everything comes via JSON parameters.

(function (window) {
  'use strict';

  /**
   * Registry mapping formula method names to implementation functions.
   *
   * Each function will be called as:
   *   fn({
   *     taxable,          // Number, annual taxable income
   *     taxRules,         // IncomeTaxRules block from JSON
   *     parameters,       // taxRules.formula.parameters (JSON)
   *     currencyDecimals, // integer
   *     roundingMode,     // 'nearest_cent' | 'up' | 'down'
   *     extra             // optional, e.g. { countryCode, taxClass, year, yearRules }
   *   })
   *
   * and must return a Number (annual tax in currency units).
   */

  const registry = Object.create(null);

  function register(methodName, fn) {
    if (typeof methodName !== 'string' || !methodName) return;
    if (typeof fn !== 'function') return;
    registry[methodName] = fn;
  }

  function get(methodName) {
    if (typeof methodName !== 'string' || !methodName) return null;
    return registry[methodName] || null;
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback != null ? fallback : 0);
  }

  /**
   * ----------------------------------------------------------------------
   *  GERMANY — EStG-like tariff for 2026 (approximation)
   * ----------------------------------------------------------------------
   *
   * Uses only JSON-provided parameters:
   *   parameters.tariff.basic_allowance
   *   parameters.tariff.zone2_start, zone3_start, zone4_start
   *   parameters.tariff.zone1, zone2, zone3, zone4
   *   parameters.mst5_6.{ w1, w2, w3, min_rate }  // for MST overlay (classes V/VI)
   *
   * This function is deliberately defensive:
   *   - If tariff is missing or malformed → logs a warning and returns 0
   *   - Never throws; the engine handles generic UI errors separately
   *   - MST overlay only applies for DE tax classes V and VI
   */
  register('de_estg_2026', function deEstg2026(ctx) {
    if (!ctx) {
      console.warn('de_estg_2026: missing context');
      return 0;
    }

    const taxableRaw = Number(ctx.taxable || 0);
    const params = ctx.parameters || {};
    const tariff = params.tariff || null;

    if (!tariff || typeof tariff !== 'object') {
      console.warn('de_estg_2026: missing or invalid tariff parameters', params);
      return 0;
    }

    if (!Number.isFinite(taxableRaw) || taxableRaw <= 0) {
      return 0;
    }

    // x: taxable income rounded down to full euros (EStG-style).
    // Apply per-tax-class taxable income adjustment (e.g. Class II baseline).
    // The rules may provide this either via formula parameters (preferred) or via a top-level `classes` map.
    const extra = ctx.extra || {};
    const taxClass = extra.taxClass || null;

    let taxable = taxableRaw;

    // 1) Preferred: class-specific formula parameter (can be injected by rules-loader)
    if (Number.isFinite(Number(params.taxable_income_adjustment))) {
      taxable = Math.max(0, taxable + Number(params.taxable_income_adjustment));
    } else {
      // 2) Fallback: look for a `classes` map in likely places (root rules kept by loader)
      const classesMap =
        (params && params.classes) ||
        (extra && extra.classes) ||
        (extra && extra.yearRules && extra.yearRules.classes) ||
        (extra && extra.rootRules && extra.rootRules.classes) ||
        (extra && extra.countryRules && extra.countryRules.classes) ||
        (extra && extra.allRules && extra.allRules.classes) ||
        null;

      if (taxClass && classesMap && classesMap[taxClass]) {
        const adj = Number(classesMap[taxClass].taxable_income_adjustment || 0);
        if (Number.isFinite(adj) && adj !== 0) {
          taxable = Math.max(0, taxable + adj);
        }
      }
    }

    // x: taxable income rounded down to full euros (EStG-style).
    
// -------------------------------------------------
// CHILD EFFECTS (Phase A approximation)
// -------------------------------------------------
const childrenCount = Number(extra && extra.childrenCount ? extra.childrenCount : 0);
const childBehavior = (params && params.child_behavior) ? params.child_behavior : {};
const childParams = (params && params.child) ? params.child : {};
const allowances = (params && params.allowances) ? params.allowances : {};

const _num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// KFB values can appear in multiple places depending on loader wiring
const kfbFull = (Number.isFinite(_num(params && params.kfb_full_per_child, NaN)))
  ? _num(params && params.kfb_full_per_child, 0)
  : (Number.isFinite(_num(allowances.kfb_full_per_child, NaN))
      ? _num(allowances.kfb_full_per_child, 0)
      : _num(childParams.kfb_per_child, 0));

const kfbHalf = (Number.isFinite(_num(params && params.kfb_half_per_child, NaN)))
  ? _num(params && params.kfb_half_per_child, 0)
  : (Number.isFinite(_num(allowances.kfb_half_per_child, NaN))
      ? _num(allowances.kfb_half_per_child, 0)
      : _num(childParams.kfb_half_per_child, 0));

if (childrenCount > 0) {
  // Entlastungsbetrag (single parent relief) – only when enabled by class-specific child_behavior
  if (childBehavior && childBehavior.apply_entlastungsbetrag) {
    const base = _num(childBehavior.entlast_base, _num(allowances.entlastungsbetrag_base, 0));
    const perExtra = _num(
      childBehavior.entlast_per_additional_child,
      _num(allowances.entlastungsbetrag_per_additional_child, 0)
    );

    const entlast = base + Math.max(0, childrenCount - 1) * perExtra;
    if (entlast > 0) taxable = Math.max(0, taxable - entlast);
  }

  // Kinderfreibetrag (KFB) – rough Phase A behavior.
  // We reduce taxable income by KFB; real-world net effects depend on Kindergeld vs KFB comparison.
  if (childBehavior && childBehavior.apply_kfb) {
    const mode = String(childBehavior.kfb_mode || 'half');
    const perChild = (mode === 'full') ? kfbFull : (mode === 'none' ? 0 : kfbHalf);

    const multiplier = _num(childBehavior.per_child_multiplier, 1);
    const kfb = Math.max(0, perChild) * childrenCount * Math.max(0, multiplier);

    if (kfb > 0) taxable = Math.max(0, taxable - kfb);
  }
}

const x = Math.floor(taxable);

    const basicAllowance = num(tariff.basic_allowance, 0);
    const zone2Start = num(tariff.zone2_start, basicAllowance);
    const zone3Start = num(tariff.zone3_start, zone2Start);
    const zone4Start = num(tariff.zone4_start, zone3Start);

    const z1 = tariff.zone1 || {};
    const z2 = tariff.zone2 || {};
    const z3 = tariff.zone3 || {};
    const z4 = tariff.zone4 || {};

    let taxBase = 0;

    if (x <= basicAllowance) {
      // Up to Grundfreibetrag → no tax.
      taxBase = 0;
    } else if (x < zone2Start) {
      // Zone 1: (a * y + b) * y,  y = (x - basic) / 10,000
      const y = (x - basicAllowance) / 10000;
      taxBase = (num(z1.coeff_y) * y + num(z1.offset)) * y;
    } else if (x < zone3Start) {
      // Zone 2: (a * z + b) * z + c,  z = (x - zone2Start) / 10,000
      const z = (x - zone2Start) / 10000;
      taxBase =
        (num(z2.coeff_y) * z + num(z2.offset)) * z +
        num(z2.constant);
    } else if (x < zone4Start) {
      // Zone 3: linear in x
      taxBase = num(z3.rate) * x - num(z3.offset);
    } else {
      // Zone 4: top bracket
      taxBase = num(z4.rate) * x - num(z4.offset);
    }

    // First, floor to full euro as base tax.
    let tax = Math.floor(taxBase);
    if (!Number.isFinite(tax) || tax < 0) {
      tax = 0;
    }

    // -------------------------------------------------------------------
    // MST Option 2 overlay for tax classes V and VI (Germany only)
    // -------------------------------------------------------------------
    const mst = params.mst5_6 || null;

    if (
      extra &&
      extra.countryCode === 'DE' &&
      (extra.taxClass === 'V' || extra.taxClass === 'VI') &&
      mst
    ) {
      const w1 = num(mst.w1, 0);
      const w3 = num(mst.w3, 0);
      const minRate = num(mst.min_rate, 0.0);
      const topRate = num((tariff.zone4 || {}).rate, 0.45);

      if (x > w1 && w3 > w1) {
        let floorRate;

        if (x >= w3) {
          floorRate = topRate;
        } else {
          const t = (x - w1) / (w3 - w1);
          floorRate = (1 - t) * minRate + t * topRate;
        }

        const taxFloor = floorRate * x;
        if (Number.isFinite(taxFloor) && taxFloor > tax) {
          tax = taxFloor;
        }
      }
    }

    // Let engine do final currency rounding; return tax in currency units.
    const currencyDecimals =
      typeof ctx.currencyDecimals === 'number' ? ctx.currencyDecimals : 2;
    const roundingMode = ctx.roundingMode || 'nearest_cent';

    const factor = Math.pow(10, currencyDecimals);
    let rounded;

    switch (roundingMode) {
      case 'up':
        rounded = Math.ceil(tax * factor) / factor;
        break;
      case 'down':
        rounded = Math.floor(tax * factor) / factor;
        break;
      case 'nearest_cent':
      default:
        rounded = Math.round(tax * factor) / factor;
        break;
    }

    return rounded;
  });

  

// Sweden 2026 — municipal + state tax with job-tax credit (Option B)
register('se_job_credit_2026', function seJobCredit2026(ctx) {
  if (!ctx) return 0;

  var taxableRaw = Number(ctx.taxable || 0);
  if (!Number.isFinite(taxableRaw)) taxableRaw = 0;
  var taxable = Math.max(0, taxableRaw);

  var parameters = ctx.parameters || {};
  var currencyDecimals = Number.isInteger(ctx.currencyDecimals)
    ? ctx.currencyDecimals
    : 2;

  function roundCurrency(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    var factor = Math.pow(10, currencyDecimals);
    return Math.round(n * factor) / factor;
  }

  // Core parameters (all in annual terms)
  var basicAllowance = Number(parameters.basic_allowance || 0);      // e.g. 25,000
  var municipalRate  = Number(parameters.municipal_rate || 0);       // e.g. 0.255
  var stateThreshold = Number(parameters.state_threshold || 0);      // e.g. 660,400
  var stateRate      = Number(parameters.state_rate || 0);           // e.g. 0.20

  if (!Number.isFinite(basicAllowance)) basicAllowance = 0;
  if (!Number.isFinite(municipalRate))  municipalRate  = 0;
  if (!Number.isFinite(stateThreshold)) stateThreshold = 0;
  if (!Number.isFinite(stateRate))      stateRate      = 0;

  // Reconstruct an approximate gross annual income.
  // For SE 2026 in this simplified model we assume that
  // "taxable = gross - basicAllowance", so:
  var grossAnnual = taxable + basicAllowance;
  if (grossAnnual < 0) grossAnnual = 0;

  // Baseline municipal + state before credit
  var municipalTax = (municipalRate > 0 && grossAnnual > 0)
    ? (grossAnnual * municipalRate)
    : 0;

  var stateTax = 0;
  if (stateRate > 0 && stateThreshold > 0 && taxable > stateThreshold) {
    stateTax = (taxable - stateThreshold) * stateRate;
  }

  // Piecewise-linear approximation to the Swedish earned-income
  // (job tax) credit. Anchors are configured in JSON so we can
  // refine without touching this function.
  var seg1StartGA     = Number(parameters.seg1_start_gross_annual || 0); // e.g. 336,000 (28k/mo)
  var seg1StartCredit = Number(parameters.seg1_start_credit || 0);       // e.g. 21,600
  var seg1EndGA       = Number(parameters.seg1_end_gross_annual || 0);   // e.g. 420,000 (35k/mo)
  var seg1EndCredit   = Number(parameters.seg1_end_credit || 0);         // e.g. 21,360
  var seg2EndGA       = Number(parameters.seg2_end_gross_annual || 0);   // e.g. 720,000 (60k/mo)
  var seg2EndCredit   = Number(parameters.seg2_end_credit || 0);         // e.g. 0

  if (!Number.isFinite(seg1StartGA))     seg1StartGA     = 0;
  if (!Number.isFinite(seg1StartCredit)) seg1StartCredit = 0;
  if (!Number.isFinite(seg1EndGA))       seg1EndGA       = seg1StartGA;
  if (!Number.isFinite(seg1EndCredit))   seg1EndCredit   = seg1StartCredit;
  if (!Number.isFinite(seg2EndGA))       seg2EndGA       = seg1EndGA;
  if (!Number.isFinite(seg2EndCredit))   seg2EndCredit   = 0;

  var credit = 0;

  if (grossAnnual <= 0 || seg1StartGA <= 0 || seg1EndGA <= seg1StartGA) {
    credit = 0;
  } else if (grossAnnual <= seg1StartGA) {
    // Below first anchor: clamp to first credit level
    credit = seg1StartCredit;
  } else if (grossAnnual <= seg1EndGA) {
    // Between first and second anchor: linear interpolation
    var t1 = (grossAnnual - seg1StartGA) / (seg1EndGA - seg1StartGA);
    credit = seg1StartCredit + (seg1EndCredit - seg1StartCredit) * t1;
  } else if (grossAnnual <= seg2EndGA && seg2EndGA > seg1EndGA) {
    // Between second anchor and the fade-out endpoint
    var t2 = (grossAnnual - seg1EndGA) / (seg2EndGA - seg1EndGA);
    credit = seg1EndCredit + (seg2EndCredit - seg1EndCredit) * t2;
  } else {
    // Above fade-out: no credit
    credit = seg2EndCredit;
  }

  if (!Number.isFinite(credit) || credit < 0) {
    credit = 0;
  }

  var totalTax = municipalTax + stateTax - credit;
  if (!Number.isFinite(totalTax) || totalTax < 0) {
    totalTax = 0;
  }

  return roundCurrency(totalTax);
});

const SalaryFormulaRegistry = {
    register,
    get
  };

  // Backward-compatible alias expected by salary-engine
window.SalaryFormulas = {
  de_estg_2026: SalaryFormulaRegistry.get('de_estg_2026'),
  se_job_credit_2026: SalaryFormulaRegistry.get('se_job_credit_2026')
};


  window.SalaryFormulaRegistry = SalaryFormulaRegistry;
})(window);