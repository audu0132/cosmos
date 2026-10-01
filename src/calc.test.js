import test from "node:test";
import assert from "node:assert/strict";
import { cutCalc, woLine, validateForFinalize, usesBarCutting } from "./calc.js";

const bar = (cut, qty = 1, stock = 6000, form = "Profile") => ({ form, stock, cut, qty });

test("exact division with no kerf gives 3 x 2000 from 6000", () => {
  const r = cutCalc(bar(2000), 0);
  assert.equal(r.perBar, 3); assert.equal(r.offcut, 0);
});
test("3 mm kerf drops 2000 mm cuts to 2 per bar, offcut 1994", () => {
  const r = cutCalc(bar(2000), 3);
  assert.equal(r.perBar, 2); assert.equal(r.offcut, 1994); assert.equal(r.kerfLoss, 6);
});
test("3000 mm cuts with kerf give 1 per bar", () => assert.equal(cutCalc(bar(3000), 3).perBar, 1));
test("full 6000 mm piece uses whole bar even with kerf", () => {
  const r = cutCalc(bar(6000), 3);
  assert.equal(r.perBar, 1); assert.equal(r.offcut, 0);
});
test("unconfigured kerf is flagged", () => assert.equal(cutCalc(bar(2000), null).kerfConfigured, false));
test("sheet/plate and bought-out skip bar cutting", () => {
  assert.equal(cutCalc({ form: "Sheet / Plate", qty: 4 }, 3), null);
  assert.equal(cutCalc({ form: "Bought-out", qty: 19 }, 3), null);
  assert.equal(usesBarCutting({ form: "Tube" }), true);
});
test("cut longer than stock is an error", () => assert.ok(cutCalc(bar(7000), 0).error));
test("Work Order multiplies pieces before bars (66 mm pin, 12/cage, 30 cages)", () => {
  const r = woLine(bar(66, 12), 0, 30);
  assert.equal(r.total, 360); assert.equal(r.bars, 4); assert.equal(r.perCageRounded, 30);
});
test("Work Order with kerf 3: 87 per bar, 5 bars", () => {
  const r = woLine(bar(66, 12), 3, 30);
  assert.equal(r.perBar, 87); assert.equal(r.bars, 5);
});
test("unconfirmed quantity stays unconfirmed on Work Order", () => {
  assert.equal(woLine({ form: "Bought-out", qty: null }, 0, 30).total, null);
});
test("finalize blocked by unconfirmed qty and removed source line", () => {
  const v = { materials: [{ id: "a", form: "Bought-out", qty: null }], components: [{ src: "zz" }], route: [] };
  assert.equal(validateForFinalize(v).length, 3);
});
