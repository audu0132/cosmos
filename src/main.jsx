import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles.css";
import { STOCK_FORMS, DEFAULT_STOCK_MM, usesBarCutting, cutCalc, woLine, validateForFinalize } from "./calc.js";

/* ---------- Demo seed: Max Estate Tower-4 Hydraulic BCS, qty for single cage ---------- */
// Source: factory PDF, "QTY FOR SINGLE CAGE" column. Unconfirmed or ambiguous lines are kept
// out of the seed and listed in OPEN_ITEMS instead of being guessed.
const mat = (id, form, desc, size, grade, cut, qty, unit = "PCS") => ({
  id, form, desc, size, grade, spec: "", unit, remarks: "",
  stock: usesBarCutting({ form }) ? DEFAULT_STOCK_MM : null,
  cut: usesBarCutting({ form }) ? cut : null, qty,
});
const SEED_MATERIALS = [
  mat("m1", "Profile", "Main Profile ISMC C-Channel", "125x65x5 mm", "", 6000, 4),
  mat("m2", "Profile", "Main Profile ISMC C-Channel", "125x65x5 mm", "", 2000, 4),
  mat("m3", "Profile", "Upper Profile RHS", "100x50x3.2 mm", "", 5000, 2),
  mat("m4", "Profile", "Upper Profile RHS", "100x50x3.2 mm", "", 4000, 2),
  mat("m5", "Sheet / Plate", "Rec Tub Connecting Plate (CP1)", "600x100x10", "", null, 4),
  mat("m6", "Sheet / Plate", "Platform Mtg Plate (CP3)", "230x170x5", "", null, 12),
  mat("m7", "Sheet / Plate", "Platform Mtg Plate (CP4)", "185x170x5", "", null, 12),
  mat("m8", "Sheet / Plate", "Platform Mtg Plate (CP5)", "160x150x5", "", null, 6),
  mat("m9", "Bar", "Locking Pin 45 mm OD", "45 OD", "", 193, 6),
  mat("m10", "Bar", "Locking Pin 32 mm OD", "32 OD", "", 66, 12),
  mat("m11", "Bought-out", "HT Hex Bolt M20", "M20 x 100 mm", "8.8", null, 19),
  mat("m12", "Bought-out", "HT Hex Bolt M12", "M12 x 80 mm", "8.8", null, 48),
  mat("m13", "Bought-out", "R Pin 6 mm dia", "STD", "", null, 6),
  mat("m14", "Bought-out", "Cone Screw", "M24 x 70", "", null, 6),
];
const comp = (id, name, type, src, qty) => ({ id, name, type, src, qty, unit: "PCS" });
const SEED_COMPONENTS = [
  comp("c1", "Main profile, full length", "Made-from", "m1", 4),
  comp("c2", "Main profile, 2000 mm", "Made-from", "m2", 4),
  comp("c3", "Upper profile, 5000 mm", "Made-from", "m3", 2),
  comp("c4", "Upper profile, 4000 mm", "Made-from", "m4", 2),
  comp("c5", "CP1 connecting plate", "Made-from", "m5", 4),
  comp("c6", "CP3 platform mounting plate", "Made-from", "m6", 12),
  comp("c7", "CP4 platform mounting plate", "Made-from", "m7", 12),
  comp("c8", "CP5 platform mounting plate", "Made-from", "m8", 6),
  comp("c9", "Locking pin 45 OD x 193", "Made-from", "m9", 6),
  comp("c10", "Locking pin 32 OD x 66", "Made-from", "m10", 12),
  comp("c11", "HT hex bolt M20 x 100, 8.8", "Bought-out", "m11", 19),
  comp("c12", "HT hex bolt M12 x 80, 8.8", "Bought-out", "m12", 48),
  comp("c13", "R pin 6 mm", "Bought-out", "m13", 6),
  comp("c14", "Cone screw M24 x 70", "Bought-out", "m14", 6),
];
const op = (id, name, process, mode = "In-House", extra = {}) => ({
  id, name, process, machine: "", mode, vendor: "", reason: "", drawing: false, ...extra,
});
const SEED_ROUTE = [
  op("o1", "Cutting", "Cutting", "In-House", { drawing: true }),
  op("o2", "Drilling", "Machining", "In-House", { drawing: true }),
  op("o3", "Welding", "Welding", "In-House", { drawing: true }),
  op("o4", "Fabrication", "Fabrication"),
  op("o5", "Assembly", "Assembly"),
  op("o6", "Surface Treatment", "Surface Treatment", "External", { reason: "Galvanising, to be confirmed by SMW" }),
  op("o7", "Final QC", "Quality Control"),
];
const OPEN_ITEMS = [
  ["Saw kerf", "Actual kerf in mm. Until set, cutting figures are nominal (0 mm kerf)."],
  ["Mill-length tolerance", "Is received stock exactly 6000 mm? Calculations use nominal stock length."],
  ["Profile cutting machine", "Which machine/process cuts profiles. Machine left unassigned in routing."],
  ["M20 nut and washer quantities", "Not stated separately in the PDF (bolt and nut listed as one line). Not seeded."],
  ["HT Hex Bolt M20 Grade 8.9", "8.9 is not a standard property class. Not created as master data."],
  ["Cross Bracing Support 80X40X3.2 SHS", "SHS means square; 80x40 is rectangular. Stateland shows 50X50X2."],
  ["CP2 plate thickness", "Truncated in the scan. CP2 not seeded."],
  ["Centre bush sizes", "Several OD/ID/length combinations. Not seeded until the standard cage set is confirmed."],
  ["Working Deck (x24) and Special Types", "Apply to only some cages. Need separate Recipe/variant decision."],
  ["Sheet / plate stock sizes", "Needed before plate nesting or sheet requirement can be calculated."],
  ["Platform Support Tube length", "Listed as Variable. Needs a rule or per-variant value."],
];
const USER = "Audumbar More";
const TODAY = "01 Oct 2026";
const SEED_VERSIONS = [{
  v: 1, status: "Final", summary: "Initial recipe from Max Estate Tower-4 BOM",
  createdAt: TODAY, createdBy: USER, finalizedAt: TODAY, finalizedBy: USER,
  materials: SEED_MATERIALS, components: SEED_COMPONENTS, route: SEED_ROUTE,
}];
const SEED_AUDIT = [
  { at: TODAY, user: USER, action: "Version finalized", detail: "V1 locked" },
  { at: TODAY, user: USER, action: "Recipe created", detail: "REC-0001 V1 draft" },
];

/* ---------- helpers ---------- */
const m3 = (mm) => (mm == null ? "Not set" : `${(mm / 1000).toFixed(3)} m`);
const clone = (x) => JSON.parse(JSON.stringify(x));
const now = () => new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const numOrNull = (s) => (s === "" || s == null ? null : Math.max(0, Math.round(Number(s))));
let idSeq = 100;
const newId = (p) => `${p}${++idSeq}`;

/* ---------- App ---------- */
function App() {
  const [page, setPage] = useState("list");
  const [tab, setTab] = useState("materials");
  const [versions, setVersions] = useState(SEED_VERSIONS);
  const [viewV, setViewV] = useState(1);
  const [kerf, setKerf] = useState(null);
  const [audit, setAudit] = useState(SEED_AUDIT);
  const [workOrders, setWorkOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const ver = versions.find((x) => x.v === viewV);
  const latestFinal = [...versions].reverse().find((x) => x.status === "Final");
  const draft = versions.find((x) => x.status === "Draft");
  const locked = ver.status === "Final";

  const flash = (text, kind = "ok") => { setToast({ text, kind }); setTimeout(() => setToast(null), 3200); };
  const log = (action, detail) => setAudit((a) => {
    if (action === "Draft edited" && a[0]?.action === action && a[0]?.detail === detail) return [{ ...a[0], at: now() }, ...a.slice(1)];
    return [{ at: now(), user: USER, action, detail }, ...a];
  });

  // "Service layer": every edit goes through here. Final versions reject all writes.
  const update = (fn) => {
    if (ver.status !== "Draft") {
      log("Locked edit rejected", `V${ver.v} is Final`);
      flash(`V${ver.v} is locked. Create a new version to make changes.`, "err");
      return;
    }
    setVersions((vs) => vs.map((x) => (x.v === ver.v ? fn(clone(x)) : x)));
    log("Draft edited", `V${ver.v}`);
  };

  const finalize = () => {
    const issues = validateForFinalize(ver);
    if (issues.length) { setModal({ type: "issues", issues }); return; }
    setModal({ type: "finalize" });
  };
  const doFinalize = () => {
    setVersions((vs) => vs.map((x) => (x.v === ver.v ? { ...x, status: "Final", finalizedAt: now(), finalizedBy: USER } : x)));
    log("Version finalized", `V${ver.v} locked`);
    setModal(null); flash(`V${ver.v} finalized and locked`);
  };
  const doNewVersion = (summary) => {
    const base = latestFinal;
    const v = Math.max(...versions.map((x) => x.v)) + 1;
    setVersions((vs) => [...vs, { ...clone(base), v, status: "Draft", summary, createdAt: now(), createdBy: USER, finalizedAt: null, finalizedBy: null }]);
    log("New version created", `V${v} copied from V${base.v}`);
    setViewV(v); setModal(null); flash(`V${v} created as Draft from V${base.v}`);
  };
  const exportCsv = () => { downloadCsv(ver, kerf); log("Exported", `V${ver.v} to CSV`); flash("Export downloaded"); };

  const stats = useMemo(() => ({
    materials: ver.materials.length,
    components: ver.components.length,
    ops: ver.route.length,
    inhouse: ver.route.filter((o) => o.mode === "In-House").length,
    outsourced: ver.route.filter((o) => o.mode !== "In-House").length,
    drawingOps: ver.route.filter((o) => o.drawing).length,
  }), [ver]);

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => setPage("list")}><b>SMW</b> COSMOS</button>
        <span className="muted">Recipe module demo prototype</span>
      </header>
      {toast && <div className={`toastx ${toast.kind}`} role="status">{toast.text}</div>}
      {modal && <Modal modal={modal} close={() => setModal(null)} onFinalize={doFinalize} onNewVersion={doNewVersion} ver={ver} base={latestFinal} />}

      {page === "list" ? (
        <RecipeList versions={versions} latestFinal={latestFinal} draft={draft} open={() => { setViewV(latestFinal.v); setPage("detail"); }} />
      ) : (
        <main>
          <button className="crumb" onClick={() => setPage("list")}><i className="bi bi-arrow-left" /> Recipes</button>

          <section className="hero">
            <div>
              <p className="eyebrow">Recipe REC-0001</p>
              <h1>Hydraulic BCS Cage</h1>
              <p className="muted">Max Estate Tower-4, Delhi. Quantities are for one cage. Demo data.</p>
            </div>
            <div className="hero-right">
              <label className="vpick">Version
                <select value={viewV} onChange={(e) => setViewV(+e.target.value)}>
                  {versions.map((x) => <option key={x.v} value={x.v}>V{x.v} ({x.status})</option>)}
                </select>
              </label>
              <span className={locked ? "badge-final" : "badge-draft"}>
                <i className={`bi ${locked ? "bi-lock-fill" : "bi-pencil"}`} /> {locked ? "Final, locked" : "Draft, editable"}
              </span>
              <span className="muted small">{locked ? `Finalized ${ver.finalizedAt} by ${ver.finalizedBy}` : `Created ${ver.createdAt} by ${ver.createdBy}`}</span>
            </div>
          </section>

          <section className="stats">
            <Stat n={stats.materials} l="Material lines" />
            <Stat n={stats.components} l="Components" />
            <Stat n={stats.ops} l="Operations" />
            <Stat n={stats.inhouse} l="In-house" />
            <Stat n={stats.outsourced} l="Outsourced" />
            <Stat n={stats.drawingOps} l="Ops needing drawing" />
          </section>

          <div className="toolbar">
            <nav className="tabs" role="tablist">
              {[["materials", "Materials & cutting"], ["components", "Components"], ["routing", "Routing"], ["drawings", "Drawings"], ["workorder", "Work Order"], ["versions", "Versions"], ["audit", "Audit log"], ["open", `Open questions (${OPEN_ITEMS.length})`]].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</button>
              ))}
            </nav>
            <div className="actions">
              {!locked && <button className="btn-primary-s" onClick={finalize}><i className="bi bi-lock" /> Finalize V{ver.v}</button>}
              {locked && !draft && <button className="btn-primary-s" onClick={() => setModal({ type: "newversion" })}><i className="bi bi-plus-lg" /> Create new version</button>}
              {locked && draft && <button onClick={() => setViewV(draft.v)}><i className="bi bi-pencil" /> Open draft V{draft.v}</button>}
              <button onClick={exportCsv}><i className="bi bi-file-earmark-spreadsheet" /> Export</button>
              <button onClick={() => window.print()}><i className="bi bi-printer" /> Print</button>
            </div>
          </div>

          {locked && <div className="lockbar"><i className="bi bi-lock-fill" /> V{ver.v} is finalized. It can never be edited. Changes go into a new version.</div>}

          {tab === "materials" && <Materials ver={ver} locked={locked} update={update} kerf={kerf} setKerf={(k) => { setKerf(k); log("Factory setting changed", `Saw kerf ${k == null ? "cleared" : k + " mm"}`); }} />}
          {tab === "components" && <Components ver={ver} locked={locked} update={update} />}
          {tab === "routing" && <Routing ver={ver} locked={locked} update={update} />}
          {tab === "drawings" && <Drawings ver={ver} />}
          {tab === "workorder" && <WorkOrders versions={versions} kerf={kerf} workOrders={workOrders} setWorkOrders={setWorkOrders} log={log} flash={flash} />}
          {tab === "versions" && <Versions versions={versions} viewV={viewV} setViewV={setViewV} workOrders={workOrders} />}
          {tab === "audit" && <Audit audit={audit} />}
          {tab === "open" && <OpenItems />}
        </main>
      )}
    </>
  );
}

const Stat = ({ n, l }) => <div><b>{n}</b><span>{l}</span></div>;

/* ---------- List ---------- */
function RecipeList({ versions, latestFinal, draft, open }) {
  const [q, setQ] = useState(""); const [st, setSt] = useState("all");
  const row = { no: "REC-0001", product: "Hydraulic BCS Cage", code: "Demo", project: "Max Estate Tower-4", v: latestFinal, draft, materials: latestFinal.materials.length, ops: latestFinal.route.length };
  const hay = `${row.no} ${row.product} ${row.project}`.toLowerCase();
  const show = hay.includes(q.toLowerCase()) && (st === "all" || (st === "Final" ? true : !!draft));
  return (
    <main>
      <div className="title">
        <div><h1>Recipes</h1><p className="muted">Versioned manufacturing specifications. Each recipe describes one finished cage or product.</p></div>
        <button className="btn-primary-s" onClick={open}><i className="bi bi-plus-lg" /> Create recipe</button>
      </div>
      <section className="card filters">
        <input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipe, product or project" />
        <select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)}><option value="all">All statuses</option><option>Final</option><option>Draft</option></select>
      </section>
      <section className="card scroll">
        <table>
          <thead><tr><th>Recipe</th><th>Product</th><th>Customer / project</th><th>Current version</th><th>Status</th><th className="num">Materials</th><th className="num">Operations</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {show ? (
              <tr>
                <td><b>{row.no}</b></td><td><b>{row.product}</b></td><td>{row.project}</td>
                <td>V{row.v.v}{draft && <span className="muted small d-block">V{draft.v} draft in progress</span>}</td>
                <td><span className="badge-final sm">Final</span></td>
                <td className="num">{row.materials}</td><td className="num">{row.ops}</td>
                <td>{row.v.finalizedAt}<span className="muted small d-block">{row.v.finalizedBy}</span></td>
                <td><button onClick={open}>Open</button></td>
              </tr>
            ) : (
              <tr><td colSpan={9} className="empty">No recipes match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

/* ---------- Materials ---------- */
function Materials({ ver, locked, update, kerf, setKerf }) {
  const set = (id, key, val) => update((v) => { v.materials.find((m) => m.id === id)[key] = val; return v; });
  const setForm = (id, form) => update((v) => {
    const m = v.materials.find((x) => x.id === id); m.form = form;
    if (usesBarCutting(m)) { m.stock = m.stock ?? DEFAULT_STOCK_MM; } else { m.stock = null; m.cut = null; }
    return v;
  });
  const add = () => update((v) => { v.materials.push({ id: newId("m"), form: "Profile", desc: "", size: "", grade: "", spec: "", stock: DEFAULT_STOCK_MM, cut: null, qty: null, unit: "PCS", remarks: "" }); return v; });
  const remove = (id) => update((v) => { v.materials = v.materials.filter((m) => m.id !== id); return v; });
  const cutLines = ver.materials.filter(usesBarCutting);

  return (
    <>
      <section className="card settings">
        <div>
          <h2>Factory settings</h2>
          <p className="muted small">Shared configuration. Not part of the recipe version.</p>
        </div>
        <label>Saw kerf
          <span className="inp-unit"><input type="number" min="0" value={kerf ?? ""} placeholder="Not set" onChange={(e) => setKerf(numOrNull(e.target.value))} /> mm</span>
        </label>
        <div className="setting-ro"><span>Default stock length</span><b>6.000 m</b></div>
        <div className="setting-ro"><span>Mill tolerance</span><b className="warn-t">Not confirmed</b></div>
        {kerf == null && <div className="warnbox"><i className="bi bi-exclamation-triangle" /> Kerf not configured. Pieces per bar and offcuts below are nominal (0 mm kerf) and will be lower once kerf is set.</div>}
      </section>

      <section className="card">
        <div className="sechead">
          <div><h2>Material requirements</h2><p className="muted small">Per one cage. Lengths stored in mm, shown in metres.</p></div>
          {!locked && <button onClick={add}><i className="bi bi-plus-lg" /> Add line</button>}
        </div>
        <div className="scroll">
          <table className="mt">
            <thead><tr>
              <th>Line</th><th>Stock form</th><th>Material / item</th><th>Profile / size</th><th>Grade</th>
              <th className="num">Stock length</th><th className="num">Cut length</th><th className="num">Qty / cage</th><th>Unit</th>
              <th className="num">Pieces / bar</th><th className="num">Offcut / bar</th>{!locked && <th></th>}
            </tr></thead>
            <tbody>
              {ver.materials.length === 0 && <tr><td colSpan={12} className="empty">No materials yet. Add the first line.</td></tr>}
              {ver.materials.map((m, i) => {
                const cc = cutCalc(m, kerf);
                return (
                  <tr key={m.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{locked ? <span className="pill">{m.form}</span> : <select value={m.form} onChange={(e) => setForm(m.id, e.target.value)}>{STOCK_FORMS.map((f) => <option key={f}>{f}</option>)}</select>}</td>
                    <td>{locked ? <b>{m.desc}</b> : <input value={m.desc} onChange={(e) => set(m.id, "desc", e.target.value)} placeholder="Description" />}</td>
                    <td>{locked ? m.size : <input value={m.size} onChange={(e) => set(m.id, "size", e.target.value)} placeholder="e.g. 125x65x5 mm" />}</td>
                    <td>{locked ? (m.grade || <span className="muted">Not specified</span>) : <input className="w-sm" value={m.grade} onChange={(e) => set(m.id, "grade", e.target.value)} />}</td>
                    <td className="num">{!usesBarCutting(m) ? <span className="muted">n/a</span> : locked ? m3(m.stock) : <MmInput v={m.stock} on={(x) => set(m.id, "stock", x)} />}</td>
                    <td className="num">{!usesBarCutting(m) ? <span className="muted">n/a</span> : locked ? m3(m.cut) : <MmInput v={m.cut} on={(x) => set(m.id, "cut", x)} />}</td>
                    <td className="num">{locked ? (m.qty ?? <span className="warn-t">Unconfirmed</span>) : <input className="w-sm num" type="number" min="0" value={m.qty ?? ""} placeholder="Unconfirmed" onChange={(e) => set(m.id, "qty", numOrNull(e.target.value))} />}</td>
                    <td>{m.unit}</td>
                    <td className="num">{cc ? (cc.error ? <span className="err-t">{cc.error}</span> : <>{cc.perBar}{!cc.kerfConfigured && <sup className="warn-t" title="Kerf not configured">*</sup>}</>) : <span className="muted">n/a</span>}</td>
                    <td className="num">{cc && !cc.error ? m3(cc.offcut) : <span className="muted">n/a</span>}</td>
                    {!locked && <td><button className="icon" aria-label="Remove line" onClick={() => remove(m.id)}><i className="bi bi-trash" /></button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {kerf == null && <p className="foot small"><span className="warn-t">*</span> Nominal figure, saw kerf not configured.</p>}
      </section>

      <section className="card">
        <div className="sechead"><div><h2>Cutting view</h2><p className="muted small">How one stock bar is cut for each Profile, Tube and Bar line.</p></div></div>
        <div className="bars">
          {cutLines.length === 0 && <p className="empty">No lines use bar cutting.</p>}
          {cutLines.map((m) => <CutBar key={m.id} m={m} kerf={kerf} n={ver.materials.indexOf(m) + 1} />)}
        </div>
      </section>
    </>
  );
}

function MmInput({ v, on }) {
  return <span className="inp-unit"><input className="w-md num" type="number" min="0" value={v ?? ""} placeholder="mm" onChange={(e) => on(numOrNull(e.target.value))} /> mm</span>;
}

function CutBar({ m, kerf, n }) {
  const cc = cutCalc(m, kerf);
  if (!cc || cc.error) return <div className="cutcard"><b>Line {n}: {m.desc || "Untitled"}</b><p className="err-t small">{cc?.error}</p></div>;
  const pct = (x) => `${(x / m.stock) * 100}%`;
  const many = cc.perBar > 16;
  const k = kerf ?? 0;
  return (
    <div className="cutcard">
      <div className="cuthead"><b>Line {n}: {m.desc} <span className="muted">{m.size}</span></b><span className="muted small">{cc.perBar} pcs per {m3(m.stock)} bar</span></div>
      <div className="bar" aria-label={`${cc.perBar} pieces of ${m.cut} mm, offcut ${cc.offcut} mm`}>
        {many
          ? <span className="piece" style={{ width: pct(cc.used) }}>{cc.perBar} x {m.cut} mm</span>
          : Array.from({ length: cc.perBar }).map((_, i) => (
            <React.Fragment key={i}>
              <span className="piece" style={{ width: pct(m.cut) }}>{m3(m.cut)}</span>
              {k > 0 && (i < cc.perBar - 1 || cc.offcut > 0) && <span className="kerf" style={{ width: pct(Math.max(k, 12)) }} />}
            </React.Fragment>
          ))}
        {cc.offcut > 0 && <span className="offcut" style={{ width: pct(cc.offcut) }}>{cc.offcut >= 400 ? `offcut ${m3(cc.offcut)}` : ""}</span>}
      </div>
      <dl className="cutfacts">
        <div><dt>Used</dt><dd>{m3(cc.used)}</dd></div>
        <div><dt>Kerf loss</dt><dd>{cc.kerfConfigured ? `${cc.kerfLoss} mm` : <span className="warn-t">Not set</span>}</dd></div>
        <div><dt>Offcut</dt><dd>{m3(cc.offcut)}</dd></div>
        <div><dt>Bars / cage</dt><dd>{(m.qty == null ? "Unconfirmed" : (m.qty / cc.perBar).toFixed(2))}</dd></div>
      </dl>
    </div>
  );
}

/* ---------- Components ---------- */
function Components({ ver, locked, update }) {
  const srcLabel = (c) => {
    const i = ver.materials.findIndex((m) => m.id === c.src);
    if (i < 0) return <span className="err-t">Source line removed</span>;
    const m = ver.materials[i];
    return <>Line {i + 1}: {m.desc} {m.size}</>;
  };
  const setQty = (id, q) => update((v) => { v.components.find((c) => c.id === id).qty = q; return v; });
  return (
    <section className="card">
      <div className="sechead"><div><h2>Components</h2><p className="muted small">Made-from parts link to the material line they are cut from. Bolts, nuts and washers stay separate lines.</p></div></div>
      <div className="scroll">
        <table>
          <thead><tr><th>No.</th><th>Component</th><th>Type</th><th>Source material line</th><th className="num">Qty / cage</th><th>Unit</th></tr></thead>
          <tbody>
            {ver.components.map((c, i) => (
              <tr key={c.id}>
                <td className="muted">{i + 1}</td><td><b>{c.name}</b></td>
                <td><span className={c.type === "Made-from" ? "pill" : "pill pill-alt"}>{c.type}</span></td>
                <td>{srcLabel(c)}</td>
                <td className="num">{locked ? c.qty : <input className="w-sm num" type="number" min="0" value={c.qty ?? ""} onChange={(e) => setQty(c.id, numOrNull(e.target.value))} />}</td>
                <td>{c.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Routing ---------- */
const MODES = ["In-House", "Overload Outsourced", "External"];
function Routing({ ver, locked, update }) {
  const set = (id, key, val) => update((v) => { v.route.find((o) => o.id === id)[key] = val; return v; });
  const move = (i, d) => update((v) => { const r = v.route; [r[i], r[i + d]] = [r[i + d], r[i]]; return v; });
  const add = () => update((v) => { v.route.push(op(newId("o"), "New operation", "")); return v; });
  const remove = (id) => update((v) => { v.route = v.route.filter((o) => o.id !== id); return v; });
  return (
    <section className="card">
      <div className="sechead">
        <div><h2>Manufacturing route</h2><p className="muted small">Sequence flows to Work Order and Job Queue unchanged. Outsourced steps keep their place.</p></div>
        {!locked && <button onClick={add}><i className="bi bi-plus-lg" /> Add operation</button>}
      </div>
      <ol className="route">
        {ver.route.map((o, i) => (
          <li key={o.id} className={o.mode !== "In-House" ? "out" : ""}>
            <span className="seq">{(i + 1) * 10}</span>
            <div className="opmain">
              {locked ? <b>{o.name}</b> : <input value={o.name} onChange={(e) => set(o.id, "name", e.target.value)} />}
              <span className="muted small">Process: {o.process || "Not set"}</span>
            </div>
            <div className="opfield"><span className="lbl">Machine</span>{locked ? (o.machine || <span className="warn-t">Not assigned</span>) : <input value={o.machine} placeholder="Not assigned" onChange={(e) => set(o.id, "machine", e.target.value)} />}</div>
            <div className="opfield"><span className="lbl">Execution</span>
              {locked ? <span className={`mode ${o.mode === "External" ? "ext" : o.mode === "Overload Outsourced" ? "ovl" : ""}`}>{o.mode}</span>
                : <select value={o.mode} onChange={(e) => set(o.id, "mode", e.target.value)}>{MODES.map((x) => <option key={x}>{x}</option>)}</select>}
            </div>
            <div className="opfield"><span className="lbl">{o.mode === "In-House" ? "Drawing" : "Vendor / reason"}</span>
              {o.mode === "In-House"
                ? (locked ? (o.drawing ? "Required" : "Not required") : <label className="chk"><input type="checkbox" checked={o.drawing} onChange={(e) => set(o.id, "drawing", e.target.checked)} /> Required</label>)
                : (locked ? <span>{o.vendor || <span className="warn-t">Vendor not assigned</span>}<span className="muted small d-block">{o.reason}</span></span>
                  : <span className="stack"><input value={o.vendor} placeholder="Vendor" onChange={(e) => set(o.id, "vendor", e.target.value)} /><input value={o.reason} placeholder={o.mode === "Overload Outsourced" ? "Overload reason" : "Note"} onChange={(e) => set(o.id, "reason", e.target.value)} /></span>)}
            </div>
            {!locked && (
              <div className="opbtns">
                <button className="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><i className="bi bi-arrow-up" /></button>
                <button className="icon" aria-label="Move down" disabled={i === ver.route.length - 1} onClick={() => move(i, 1)}><i className="bi bi-arrow-down" /></button>
                <button className="icon" aria-label="Remove operation" onClick={() => remove(o.id)}><i className="bi bi-trash" /></button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Drawings ---------- */
function Drawings({ ver }) {
  const need = ver.route.filter((o) => o.drawing);
  return (
    <section className="card pad">
      <h2>Drawings</h2>
      <div className="emptybox"><i className="bi bi-file-earmark-richtext" /><div><b>No drawing linked</b><p className="muted small">In COSMOS this links to the existing Documents module. No separate document store is created for Recipe.</p></div></div>
      <h3 className="h6 mt-3">Operations that require a drawing</h3>
      {need.length ? <ul className="plain">{need.map((o) => <li key={o.id}><span className="seq sm">{(ver.route.indexOf(o) + 1) * 10}</span> {o.name} <span className="warn-t small">Drawing not linked</span></li>)}</ul> : <p className="muted">None.</p>}
      <p className="muted small">Whether these operations can start without a drawing is decided by the existing COSMOS workflow rules.</p>
    </section>
  );
}

/* ---------- Work Orders ---------- */
function WorkOrders({ versions, kerf, workOrders, setWorkOrders, log, flash }) {
  const finals = versions.filter((x) => x.status === "Final");
  const [selV, setSelV] = useState(finals[finals.length - 1].v);
  const [qty, setQty] = useState(30);
  const [openWo, setOpenWo] = useState(null);
  const v = versions.find((x) => x.v === (openWo ? openWo.v : selV));
  const q = openWo ? openWo.qty : qty;
  const create = () => {
    const no = `WO-DEMO-${String(workOrders.length + 1).padStart(3, "0")}`;
    const wo = { no, v: selV, qty };
    setWorkOrders((w) => [...w, wo]); setOpenWo(wo);
    log("Work order linked", `${no} to V${selV}, qty ${qty}`); flash(`${no} created against V${selV}`);
  };
  const totalBars = v.materials.reduce((s, m) => s + (woLine(m, kerf, q).bars || 0), 0);
  const naiveBars = v.materials.reduce((s, m) => s + (woLine(m, kerf, q).perCageRounded || 0), 0);

  return (
    <>
      <section className="card settings">
        <div><h2>Work Order requirement</h2><p className="muted small">Only finalized versions can be used. The work order keeps that exact version.</p></div>
        <label>Recipe version<select value={selV} onChange={(e) => { setSelV(+e.target.value); setOpenWo(null); }}>{finals.map((x) => <option key={x.v} value={x.v}>V{x.v}</option>)}</select></label>
        <label>Quantity (cages)<input type="number" min="1" value={qty} onChange={(e) => { setQty(Math.max(1, +e.target.value || 1)); setOpenWo(null); }} /></label>
        <button className="btn-primary-s" onClick={create}><i className="bi bi-clipboard-plus" /> Create demo work order</button>
      </section>

      {workOrders.length > 0 && (
        <section className="card pad">
          <h2>Demo work orders</h2>
          <div className="wochips">{workOrders.map((w) => (
            <button key={w.no} className={openWo?.no === w.no ? "active" : ""} onClick={() => setOpenWo(w)}>{w.no}<span>Recipe V{w.v}, {w.qty} cages</span></button>
          ))}</div>
        </section>
      )}

      <section className="card">
        <div className="sechead">
          <div><h2>{openWo ? openWo.no : "Preview"}: V{v.v} x {q} cages</h2><p className="muted small">Pieces are multiplied first, then stock bars are calculated for the whole order.</p></div>
          <div className="savings"><b>{naiveBars - totalBars}</b> stock bars saved<span className="muted small d-block">{totalBars} bars by whole-order calculation vs {naiveBars} if rounded per cage</span></div>
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Line</th><th>Material / item</th><th>Form</th><th className="num">Qty / cage</th><th className="num">Total qty</th><th className="num">Pieces / bar</th><th className="num">Bars required</th><th className="num">Rounded per cage</th><th className="num">Utilisation</th></tr></thead>
            <tbody>
              {v.materials.map((m, i) => {
                const r = woLine(m, kerf, q);
                return (
                  <tr key={m.id}>
                    <td className="muted">{i + 1}</td><td><b>{m.desc}</b> <span className="muted">{m.size}</span></td><td>{m.form}</td>
                    <td className="num">{m.qty ?? <span className="warn-t">Unconfirmed</span>}</td>
                    <td className="num">{r.total ?? <span className="warn-t">Unconfirmed</span>} {m.unit}</td>
                    <td className="num">{r.perBar ?? <span className="muted">n/a</span>}</td>
                    <td className="num">{r.bars != null ? <b>{r.bars}</b> : m.form === "Sheet / Plate" ? <span className="warn-t small">Sheet size not set</span> : <span className="muted">n/a</span>}</td>
                    <td className="num muted">{r.perCageRounded ?? "n/a"}</td>
                    <td className="num">{r.utilisation != null ? `${(r.utilisation * 100).toFixed(1)}%` : <span className="muted">n/a</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {kerf == null && <p className="foot small warn-t">Saw kerf not configured. Bar counts are nominal.</p>}
      </section>

      <section className="card pad">
        <h2>Job Queue routing</h2>
        <p className="muted small">Operations passed to the existing Job Queue in recipe sequence.</p>
        <div className="flow">{v.route.map((o, i) => (
          <div key={o.id} className={`flowstep ${o.mode !== "In-House" ? "out" : ""}`}><span className="seq sm">{(i + 1) * 10}</span><b>{o.name}</b><span className="small">{o.mode}</span></div>
        ))}</div>
      </section>
    </>
  );
}

/* ---------- Versions / Audit / Open ---------- */
function Versions({ versions, viewV, setViewV, workOrders }) {
  return (
    <section className="card">
      <div className="sechead"><div><h2>Version history</h2><p className="muted small">Finalized versions are permanent. A new version always starts as a copy of the latest final.</p></div></div>
      <div className="scroll">
        <table>
          <thead><tr><th>Version</th><th>Status</th><th>Change summary</th><th>Created</th><th>Finalized</th><th>Work orders</th><th></th></tr></thead>
          <tbody>
            {[...versions].reverse().map((x) => (
              <tr key={x.v} className={x.v === viewV ? "sel" : ""}>
                <td><b>V{x.v}</b></td>
                <td>{x.status === "Final" ? <span className="badge-final sm"><i className="bi bi-lock-fill" /> Final</span> : <span className="badge-draft sm">Draft</span>}</td>
                <td>{x.summary}</td>
                <td>{x.createdAt}<span className="muted small d-block">{x.createdBy}</span></td>
                <td>{x.finalizedAt ? <>{x.finalizedAt}<span className="muted small d-block">{x.finalizedBy}</span></> : <span className="muted">Not finalized</span>}</td>
                <td>{workOrders.filter((w) => w.v === x.v).map((w) => w.no).join(", ") || <span className="muted">None</span>}</td>
                <td><button onClick={() => setViewV(x.v)} disabled={x.v === viewV}>{x.v === viewV ? "Viewing" : "View"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Audit({ audit }) {
  return (
    <section className="card">
      <div className="sechead"><div><h2>Audit log</h2><p className="muted small">In COSMOS these events go to the existing activity log.</p></div></div>
      <div className="scroll"><table>
        <thead><tr><th>When</th><th>User</th><th>Event</th><th>Detail</th></tr></thead>
        <tbody>{audit.map((a, i) => <tr key={i} className={a.action === "Locked edit rejected" ? "rej" : ""}><td>{a.at}</td><td>{a.user}</td><td><b>{a.action}</b></td><td>{a.detail}</td></tr>)}</tbody>
      </table></div>
    </section>
  );
}

function OpenItems() {
  return (
    <section className="card">
      <div className="sechead"><div><h2>Open factory questions</h2><p className="muted small">Not guessed. Each needs SMW confirmation before production use.</p></div></div>
      <ol className="openlist">{OPEN_ITEMS.map(([t, d]) => <li key={t}><b>{t}</b><span className="muted">{d}</span></li>)}</ol>
    </section>
  );
}

/* ---------- Modal ---------- */
function Modal({ modal, close, onFinalize, onNewVersion, ver, base }) {
  const [summary, setSummary] = useState("");
  return (
    <div className="backdrop" onClick={close}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {modal.type === "finalize" && <>
          <h2>Finalize V{ver.v}?</h2>
          <p>V{ver.v} will be locked permanently. It cannot be edited or reopened. Further changes need a new version.</p>
          <div className="dlg-actions"><button onClick={close}>Cancel</button><button className="btn-primary-s" onClick={onFinalize}><i className="bi bi-lock" /> Finalize and lock</button></div>
        </>}
        {modal.type === "issues" && <>
          <h2>V{ver.v} can't be finalized yet</h2>
          <ul className="issues">{modal.issues.map((x) => <li key={x}>{x}</li>)}</ul>
          <div className="dlg-actions"><button className="btn-primary-s" onClick={close}>Fix draft</button></div>
        </>}
        {modal.type === "newversion" && <>
          <h2>Create new version</h2>
          <p>Copies V{base.v} into a new Draft. V{base.v} stays locked and unchanged.</p>
          <label className="full">Change summary<textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What is changing and why" /></label>
          <div className="dlg-actions"><button onClick={close}>Cancel</button><button className="btn-primary-s" disabled={!summary.trim()} onClick={() => onNewVersion(summary.trim())}>Create V{base.v + 1} draft</button></div>
        </>}
      </div>
    </div>
  );
}

/* ---------- Export (uses the same calc functions as the UI) ---------- */
function downloadCsv(ver, kerf) {
  const esc = (x) => `"${String(x ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Recipe", "REC-0001"], ["Product", "Hydraulic BCS Cage"], ["Project", "Max Estate Tower-4 (demo)"],
    ["Version", `V${ver.v}`], ["Status", ver.status], ["Finalized", ver.finalizedAt ? `${ver.finalizedAt} by ${ver.finalizedBy}` : "Not finalized"],
    ["Saw kerf (mm)", kerf ?? "Not configured"], [],
    ["MATERIALS (per cage)"],
    ["Line", "Stock form", "Material", "Size", "Grade", "Stock length (mm)", "Cut length (mm)", "Qty", "Unit", "Pieces per bar", "Offcut per bar (mm)"],
    ...ver.materials.map((m, i) => { const c = cutCalc(m, kerf); return [i + 1, m.form, m.desc, m.size, m.grade, m.stock ?? "", m.cut ?? "", m.qty ?? "Unconfirmed", m.unit, c && !c.error ? c.perBar : "", c && !c.error ? c.offcut : ""]; }),
    [], ["COMPONENTS"], ["No", "Component", "Type", "Source line", "Qty", "Unit"],
    ...ver.components.map((c, i) => [i + 1, c.name, c.type, ver.materials.findIndex((m) => m.id === c.src) + 1 || "Removed", c.qty, c.unit]),
    [], ["ROUTING"], ["Seq", "Operation", "Process", "Machine", "Execution", "Vendor", "Reason", "Drawing required"],
    ...ver.route.map((o, i) => [(i + 1) * 10, o.name, o.process, o.machine || "Not assigned", o.mode, o.vendor, o.reason, o.drawing ? "Yes" : "No"]),
  ];
  const csv = "\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `REC-0001-V${ver.v}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

createRoot(document.getElementById("root")).render(<App />);
