// Single source of truth for all cutting and Work Order calculations.
// UI, CSV export and tests all call these functions. Lengths are integer millimetres.

export const CUT_FORMS = ["Profile", "Tube", "Bar"];
export const STOCK_FORMS = ["Profile", "Tube", "Bar", "Sheet / Plate", "Bought-out"];
export const DEFAULT_STOCK_MM = 6000;

export const usesBarCutting = (line) => CUT_FORMS.includes(line.form);

// Returns null for lines that do not use bar cutting.
// kerf === null means "not configured": figures are nominal (0 mm kerf) and flagged.
export function cutCalc(line, kerf) {
  if (!usesBarCutting(line)) return null;
  const L = line.stock, c = line.cut;
  if (!L || !c) return { error: "Stock and cut length required" };
  if (c > L) return { error: "Cut length exceeds stock length" };
  const k = kerf ?? 0;
  const perBar = Math.floor((L + k) / (c + k));
  const used = perBar * c;
  const offcut = Math.max(0, L - perBar * (c + k));
  const kerfLoss = L - used - offcut;
  return { perBar, used, offcut, kerfLoss, kerfConfigured: kerf !== null && kerf !== undefined };
}

// Work Order requirement: multiply PIECES first, then derive bars.
export function woLine(line, kerf, woQty) {
  const total = line.qty == null ? null : line.qty * woQty;
  const base = { total, bars: null, perCageRounded: null, utilisation: null };
  if (total == null) return base;
  const cc = cutCalc(line, kerf);
  if (!cc || cc.error) return base;
  const bars = Math.ceil(total / cc.perBar);
  const perCageRounded = Math.ceil(line.qty / cc.perBar) * woQty;
  const utilisation = (total * line.cut) / (bars * line.stock);
  return { total, bars, perCageRounded, utilisation, perBar: cc.perBar };
}

export function validateForFinalize(version) {
  const issues = [];
  const ids = new Set(version.materials.map((m) => m.id));
  version.materials.forEach((m, i) => {
    const n = i + 1;
    if (m.qty == null) issues.push(`Material line ${n}: quantity is unconfirmed`);
    if (usesBarCutting(m)) {
      const cc = cutCalc(m, 0);
      if (cc?.error) issues.push(`Material line ${n}: ${cc.error.toLowerCase()}`);
    }
  });
  version.components.forEach((c, i) => {
    if (!ids.has(c.src)) issues.push(`Component ${i + 1}: source material line was removed`);
  });
  if (version.route.length === 0) issues.push("Routing has no operations");
  return issues;
}
