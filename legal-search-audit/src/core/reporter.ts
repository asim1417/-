// ===========================================================================
// reporter.ts — Turns the collected audit bundles into all required outputs
// (§28–§30): JSON files, summary.csv, competitive_opportunities.json, and two
// HTML reports (report.html, ux_report.html). Reporting is fully separated
// from scanning logic, per the code-quality requirements (§32).
// ===========================================================================

import * as path from "path";
import {
  CompetitiveOpportunities,
  RunOptions,
  TargetAuditBundle,
} from "../types";
import { writeJson, writeCsv, log, round } from "./utils";

export class Reporter {
  constructor(private readonly options: RunOptions) {}

  private out(file: string): string {
    return path.join(this.options.output, file);
  }

  /** Write everything for the full set of audited targets. */
  writeAll(bundles: TargetAuditBundle[]): void {
    log.step("Writing reports…");

    // 1) results.json — full search results across targets.
    writeJson(
      this.out("results.json"),
      bundles.flatMap((b) => b.searchResults)
    );

    // 2) summary.csv — one row per query/target.
    this.writeSummaryCsv(bundles);

    // 3–12) per-domain audit JSON files.
    writeJson(this.out("ui_audit.json"), bundles.map((b) => ({ target: b.target, pages: b.pages })));
    writeJson(this.out("navigation_map.json"), bundles.map((b) => b.navigation));
    writeJson(this.out("search_box_audit.json"), bundles.map((b) => b.searchBox));
    writeJson(this.out("indexes_audit.json"), bundles.map((b) => b.indexes));
    writeJson(this.out("filters_audit.json"), bundles.map((b) => b.filters));
    writeJson(this.out("performance_audit.json"), bundles.map((b) => b.performance));
    writeJson(this.out("accessibility_audit.json"), bundles.map((b) => b.accessibility));
    writeJson(this.out("seo_audit.json"), bundles.map((b) => b.seo));
    writeJson(this.out("legal_trust_audit.json"), bundles.map((b) => b.legalTrust));
    writeJson(this.out("knowledge_features_audit.json"), bundles.map((b) => b.knowledge));
    writeJson(this.out("icons_audit.json"), bundles.map((b) => b.icons));
    writeJson(this.out("details_audit.json"), bundles.map((b) => b.details));
    writeJson(this.out("subscription_audit.json"), bundles.map((b) => b.subscription));
    writeJson(this.out("scores.json"), bundles.map((b) => b.scores));

    // 13) competitive_opportunities.json.
    const opps = buildOpportunities(bundles);
    writeJson(this.out("competitive_opportunities.json"), opps);

    // 14) report.html and 15) ux_report.html.
    writeText(this.out("report.html"), renderReportHtml(bundles, opps));
    writeText(this.out("ux_report.html"), renderUxReportHtml(bundles, opps));

    log.ok(`Reports written to ${this.options.output}`);
  }

  private writeSummaryCsv(bundles: TargetAuditBundle[]): void {
    const headers = [
      "target",
      "query_id",
      "category",
      "probe_type",
      "query",
      "status",
      "response_time_ms",
      "results_count_visible",
      "top1_title",
      "top1_relevance_auto",
      "best_relevance_auto",
      "has_article_number",
      "has_system_name",
      "filters_detected",
      "screenshot",
    ];
    const rows = bundles.flatMap((b) =>
      b.searchResults.map((r) => {
        const best = r.top_results.reduce(
          (m, t) => (t.relevance_score_auto > m ? t.relevance_score_auto : m),
          0
        );
        return {
          target: r.target,
          query_id: r.query_id,
          category: r.category,
          probe_type: r.probe_type,
          query: r.query,
          status: r.status,
          response_time_ms: r.response_time_ms,
          results_count_visible: r.results_count_visible,
          top1_title: r.top_results[0]?.title ?? "",
          top1_relevance_auto: r.top_results[0]?.relevance_score_auto ?? "",
          best_relevance_auto: best,
          has_article_number: r.top_results.some((t) => t.has_article_number),
          has_system_name: r.top_results.some((t) => t.has_system_name),
          filters_detected: r.filters_detected.join(" | "),
          screenshot: r.screenshots[0] ?? "",
        };
      })
    );
    writeCsv(this.out("summary.csv"), headers, rows);
  }
}

// ---------------------------------------------------------------------------
// Competitive opportunities (§30) — data-driven strengths/weaknesses plus a
// curated, actionable blueprint for a better Saudi legal search engine.
// ---------------------------------------------------------------------------
function buildOpportunities(bundles: TargetAuditBundle[]): CompetitiveOpportunities {
  const find = (id: string) => bundles.find((b) => b.target === id);
  const q = find("qanoniah");
  const k = find("qistas");

  const strengths = (b?: TargetAuditBundle): string[] => {
    if (!b) return ["(لم يُفحص هذا الموقع في هذه الجولة)"];
    const s: string[] = [];
    if (b.searchBox.found) s.push("صندوق بحث ظاهر وقابل للاستخدام.");
    if (b.searchBox.supports_rtl) s.push("دعم اتجاه RTL في صندوق البحث.");
    if (b.searchBox.has_autosuggest) s.push("اقتراحات تلقائية أثناء الكتابة.");
    if (b.searchBox.has_advanced_search) s.push("توفر بحث متقدم.");
    if (b.filters.filters.length >= 3) s.push(`فلاتر متعددة (${b.filters.filters.length}).`);
    if (b.indexes.indexes.length > 0) s.push("توفر صفحات فهارس/تصنيفات للتصفح.");
    if (b.legalTrust.records.some((r) => r.has_official_source)) s.push("الإشارة إلى مصدر رسمي.");
    if (b.legalTrust.records.some((r) => r.has_enforcement_status)) s.push("بيان حالة السريان.");
    if (b.knowledge.related_articles) s.push("عرض مواد مرتبطة.");
    if (b.knowledge.ai_assistant) s.push("وجود مساعد/بحث ذكي ظاهر.");
    if (b.seo.records.some((r) => r.has_structured_data)) s.push("بيانات منظمة (schema) قابلة للأرشفة.");
    if (b.scores.performance.total >= 60) s.push("أداء تحميل جيد نسبيًا.");
    return s.slice(0, 10).length ? s.slice(0, 10) : ["(لم تُرصد مزايا بارزة آليًا — راجع اللقطات يدويًا)"];
  };

  const weaknesses = (b?: TargetAuditBundle): string[] => {
    if (!b) return ["(لم يُفحص هذا الموقع في هذه الجولة)"];
    const w: string[] = [];
    if (b.blocked) w.push("ظهر منع/كابتشا فأوقف الفحص — تجربة قاسية على الزوار غير المسجلين.");
    if (!b.searchBox.has_autosuggest) w.push("لا توجد اقتراحات تلقائية أثناء الكتابة.");
    if (!b.searchBox.has_spelling_suggestions) w.push("لا يوجد تصحيح إملائي/«هل تقصد».");
    if (!b.searchBox.has_clear_button) w.push("لا يوجد زر مسح واضح في صندوق البحث.");
    if (b.filters.missing_important_filters.length > 0)
      w.push(`فلاتر قانونية ناقصة: ${b.filters.missing_important_filters.slice(0, 4).join("، ")}.`);
    if (!b.knowledge.related_judgments) w.push("ضعف الربط بين الأنظمة والأحكام.");
    if (!b.legalTrust.records.some((r) => r.has_update_date)) w.push("غياب تاريخ آخر تحديث للمحتوى.");
    if (!b.legalTrust.records.some((r) => r.has_official_source)) w.push("غياب الإشارة الواضحة للمصدر الرسمي.");
    if (b.accessibility.records.some((r) => r.issues.length > 2)) w.push("مشكلات إمكانية وصول متعددة.");
    if (b.seo.records.some((r) => r.issues.length > 2)) w.push("نواقص SEO/أرشفة في صفحات المحتوى.");
    if (b.scores.performance.total < 55) w.push("أداء تحميل بطيء نسبيًا.");
    const successRate =
      b.searchResults.length
        ? b.searchResults.filter((r) => r.status === "success").length / b.searchResults.length
        : 0;
    if (successRate < 0.6) w.push(`نسبة نجاح بحث منخفضة (${Math.round(successRate * 100)}%).`);
    return w.slice(0, 10).length ? w.slice(0, 10) : ["(لم تُرصد نقاط ضعف بارزة آليًا)"];
  };

  return {
    generated_at: new Date().toISOString(),
    qanoniah_top_strengths: strengths(q),
    qistas_top_strengths: strengths(k),
    qanoniah_top_weaknesses: weaknesses(q),
    qistas_top_weaknesses: weaknesses(k),
    unexploited_opportunities: [
      "ربط معرفي قوي ثنائي الاتجاه بين النظام ↔ اللائحة ↔ الأحكام ↔ المبادئ.",
      "بحث دلالي عربي يفهم المرادفات (فسخ/إنهاء، ضرر/تعويض) لا التطابق اللفظي فقط.",
      "تطبيع تلقائي للهمزات والتشكيل والأرقام العربية/الهندية في فهرسة البحث.",
      "صفحة مادة قابلة للاستشهاد مع نص رسمي + تاريخ + حالة سريان + نسخ بصيغة استشهاد.",
      "مساعد ذكي يستشهد بالمصدر (النظام/المادة) ويميز النص النظامي عن التحليل.",
      "خط زمني للتعديلات يقارن إصدارات المادة جنبًا إلى جنب.",
      "تجربة جوال مصممة أصلاً للجوال (لا مجرد تصغير لسطح المكتب).",
    ],
    ideal_search_box: [
      "حقل كبير بارز أعلى الصفحة يدعم RTL والعربية والاستعلام الطويل.",
      "اقتراحات فورية مصنّفة (نظام/مادة/حكم) مع إبراز رقم المادة.",
      "تطبيع تلقائي للهمزات/التشكيل والأرقام العربية والهندية + «هل تقصد».",
      "قبول رقم المادة واسم النظام والسؤال الطبيعي في نفس الحقل.",
      "اختيار نوع المصدر والاختصاص قبل البحث + زر مسح واضح + سجل بحث اختياري.",
    ],
    ideal_results_page: [
      "بطاقة نتيجة تُظهر: العنوان، نوع المصدر، اسم النظام، رقم المادة، مقتطف مُبرز.",
      "فلاتر جانبية لحظية (نوع/محكمة/سنة/حالة سريان) محفوظة في رابط الصفحة.",
      "إبراز كلمات الاستعلام داخل المقتطف، وترتيب نتائج قابل للتغيير.",
      "بحث داخل النتائج، وعدّاد نتائج لكل فلتر، وروابط مباشرة قابلة للمشاركة.",
    ],
    ideal_article_page: [
      "نص المادة الرسمي + اسم النظام + رقمها + تاريخ الإصدار + حالة السريان.",
      "أزرار نسخ/استشهاد/مشاركة/طباعة/PDF، ورابط للمصدر الرسمي.",
      "مواد سابقة/تالية، لوائح تنفيذية مرتبطة، وأحكام طبّقت المادة.",
      "خط زمني للتعديلات ومقارنة الإصدارات، وبحث داخل النظام نفسه.",
    ],
    ideal_judgment_page: [
      "المحكمة/الدائرة/التاريخ/رقم الحكم/رقم القضية + الموضوع + المبادئ.",
      "الأنظمة والمواد المطبّقة كروابط، وأحكام مشابهة، وملخص واضح.",
      "تمييز صريح بين نص الحكم والتعليق التحليلي، مع مصدر رسمي إن وُجد.",
    ],
    linking_recommendations: [
      "اجعل كل ذكر لمادة/نظام داخل أي وثيقة رابطًا قابلًا للنقر.",
      "ابنِ رسمًا معرفيًا (graph) يربط النظام باللائحة وبالأحكام وبالمبادئ.",
      "اعرض «الأحكام التي طبّقت هذه المادة» على صفحة المادة، والعكس.",
    ],
    filters_indexes_recommendations: [
      "فلاتر قانونية أساسية: نوع المصدر، المحكمة، السنة، حالة السريان، درجة التقاضي.",
      "فهارس متعددة المداخل: أبجدي + موضوعي + زمني + حسب الجهة، مع عدّادات.",
      "شجرة تصنيف قابلة للطي مع breadcrumb وعمق وصول لا يتجاوز 3 نقرات.",
    ],
    mobile_recommendations: [
      "تصميم جوال أولًا: صندوق بحث ثابت، فلاتر في لوحة منزلقة، أزرار ≥ 44px.",
      "منع التمرير الأفقي والتداخل، وخطوط عربية واضحة وسريعة التحميل.",
    ],
    trust_source_recommendations: [
      "اعرض المصدر الرسمي وتاريخي الإصدار/التحديث وحالة السريان على كل وثيقة.",
      "ميّز بوضوح نوع المحتوى (تشريع/لائحة/حكم/مبدأ/تحليل) وحذّر عند نقص المحتوى.",
      "وفّر زر «تحقّق من المصدر» يربط بالجهة الرسمية مباشرة.",
    ],
    information_architecture_recommendations: [
      "ابنِ الموقع حول التصفح المعرفي لا حول البحث فقط.",
      "مسارات وصول قصيرة وواضحة مع breadcrumbs ثابتة وروابط دائمة ومفهومة.",
      "اسمح بالوصول للمعلومة دون معرفة المصطلح الدقيق (مرادفات + اقتراحات).",
    ],
    ai_assistant_recommendations: [
      "مساعد يستشهد دائمًا بالنظام والمادة، ولا يجيب بلا سند.",
      "يميّز النص النظامي عن التحليل، ويحذّر عند غياب مصدر، دون تجاوز اشتراك.",
    ],
    adopt: [
      "بحث دلالي عربي متسامح مع الهمزات/التشكيل/الأرقام.",
      "ربط ثنائي الاتجاه بين الأنظمة والأحكام والمبادئ.",
      "صفحات مادة/حكم قابلة للاستشهاد مع مصدر وتاريخ وحالة سريان.",
      "فلاتر لحظية محفوظة في الرابط، وتجربة جوال أصلية.",
    ],
    avoid: [
      "إخفاء الوظائف الأساسية خلف جدار اشتراك مبكر أو كابتشا عدوانية.",
      "أيقونات بلا نص مساعد/aria، وأزرار بلا وظيفة واضحة.",
      "اعتماد التطابق اللفظي فقط دون فهم دلالي.",
      "تجربة جوال = مجرد تصغير لسطح المكتب.",
    ],
    win_areas: [
      "الفهم الدلالي العربي وتطبيع النص القانوني.",
      "الربط المعرفي العميق بين مصادر القانون.",
      "الشفافية والثقة القانونية (مصدر/تاريخ/سريان).",
      "تجربة جوال وأداء متفوقان.",
    ],
  };
}

// ---------------------------------------------------------------------------
// HTML rendering helpers
// ---------------------------------------------------------------------------
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<style>
  :root{--bg:#0f172a;--card:#1e293b;--ink:#e2e8f0;--muted:#94a3b8;--accent:#38bdf8;--good:#22c55e;--bad:#ef4444;--warn:#f59e0b;}
  *{box-sizing:border-box}
  body{font-family:"Segoe UI",Tahoma,system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a;line-height:1.7}
  header{background:linear-gradient(135deg,#0f172a,#1e3a8a);color:#fff;padding:28px 20px}
  header h1{margin:0 0 6px;font-size:24px}
  header p{margin:0;color:#cbd5e1;font-size:14px}
  main{max-width:1100px;margin:0 auto;padding:20px}
  section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:18px 0;box-shadow:0 1px 3px rgba(0,0,0,.05)}
  h2{font-size:19px;border-right:4px solid var(--accent);padding-right:10px;margin-top:0}
  h3{font-size:16px;color:#1e293b}
  table{width:100%;border-collapse:collapse;font-size:14px;margin:10px 0}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:right;vertical-align:top}
  th{background:#f1f5f9}
  .num{font-variant-numeric:tabular-nums}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;color:#fff}
  .ok{background:var(--good)}.no{background:var(--bad)}.warn{background:var(--warn)}
  .score{font-size:28px;font-weight:700}
  .bar{height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden}
  .bar>span{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#1d4ed8)}
  ul{margin:6px 0;padding-right:20px}
  li{margin:3px 0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .muted{color:#64748b;font-size:13px}
  .note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:13px}
  img.shot{max-width:100%;border:1px solid #e2e8f0;border-radius:8px;margin:6px 0}
  @media(max-width:760px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
${body}
<footer style="text-align:center;color:#94a3b8;font-size:12px;padding:24px">
  أُنشئ بواسطة legal-search-audit — فحص وصفي لتجربة المستخدم فقط، دون استخراج محتوى أو تجاوز اشتراك.
</footer>
</body></html>`;
}

function yn(v: boolean): string {
  return v
    ? '<span class="badge ok">نعم</span>'
    : '<span class="badge no">لا</span>';
}

function scoreBar(total: number): string {
  const pct = Math.max(0, Math.min(100, total));
  return `<div class="bar"><span style="width:${pct}%"></span></div>`;
}

// --- report.html (§29) -----------------------------------------------------
function renderReportHtml(
  bundles: TargetAuditBundle[],
  opps: CompetitiveOpportunities
): string {
  const labels = bundles.map((b) => b.label);

  const successRate = (b: TargetAuditBundle) =>
    b.searchResults.length
      ? Math.round(
          (b.searchResults.filter((r) => r.status === "success").length /
            b.searchResults.length) *
            100
        )
      : 0;
  const avgTime = (b: TargetAuditBundle) => {
    const t = b.searchResults.filter((r) => r.response_time_ms > 0).map((r) => r.response_time_ms);
    return t.length ? Math.round(t.reduce((a, c) => a + c, 0) / t.length) : 0;
  };
  const bestQueries = (b: TargetAuditBundle) =>
    b.searchResults
      .filter((r) => r.status === "success")
      .map((r) => ({ q: r.query, s: Math.max(0, ...r.top_results.map((t) => t.relevance_score_auto)) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
  const worstQueries = (b: TargetAuditBundle) =>
    b.searchResults
      .filter((r) => r.status !== "success" || r.top_results.length === 0)
      .map((r) => r.query)
      .slice(0, 5);

  const scoreRow = (label: string, getter: (b: TargetAuditBundle) => number) =>
    `<tr><th>${esc(label)}</th>${bundles
      .map((b) => `<td class="num"><b>${getter(b)}</b>/100 ${scoreBar(getter(b))}</td>`)
      .join("")}</tr>`;

  const comparison = `
  <table>
    <tr><th>المعيار</th>${labels.map((l) => `<th>${esc(l)}</th>`).join("")}</tr>
    <tr><th>نسبة نجاح البحث</th>${bundles.map((b) => `<td class="num">${successRate(b)}%</td>`).join("")}</tr>
    <tr><th>متوسط زمن الاستجابة</th>${bundles.map((b) => `<td class="num">${avgTime(b)} ms</td>`).join("")}</tr>
    <tr><th>عدد الاستعلامات</th>${bundles.map((b) => `<td class="num">${b.searchResults.length}</td>`).join("")}</tr>
    ${scoreRow("تقييم البحث", (b) => b.scores.search.total)}
    ${scoreRow("تقييم UX", (b) => b.scores.ux.total)}
    ${scoreRow("الثقة القانونية", (b) => b.scores.legal_trust.total)}
    ${scoreRow("الأداء", (b) => b.scores.performance.total)}
  </table>`;

  const perTarget = bundles
    .map((b) => {
      const best = bestQueries(b)
        .map((x) => `<li>${esc(x.q)} <span class="muted">(${x.s.toFixed(1)}/5)</span></li>`)
        .join("");
      const worst = worstQueries(b).map((q) => `<li>${esc(q)}</li>`).join("") || "<li class='muted'>—</li>";
      const breakdownTable = (title: string, card: { total: number; breakdown: Record<string, number> }) => `
        <h3>${esc(title)} — <span class="num">${card.total}/100</span></h3>
        <table>${Object.entries(card.breakdown)
          .map(([k, v]) => `<tr><th>${esc(k)}</th><td class="num">${v}</td></tr>`)
          .join("")}</table>`;
      const shots = b.searchResults
        .flatMap((r) => r.screenshots)
        .slice(0, 3)
        .map((s) => `<img class="shot" src="${esc(s)}" alt="screenshot"/>`)
        .join("");
      return `
      <section>
        <h2>${esc(b.label)} ${b.blocked ? '<span class="badge warn">توقف بسبب منع/كابتشا</span>' : ""}</h2>
        <div class="grid">
          <div><h3>أكثر الاستعلامات نجاحًا</h3><ul>${best || "<li class='muted'>—</li>"}</ul></div>
          <div><h3>أكثر الاستعلامات فشلًا</h3><ul>${worst}</ul></div>
        </div>
        ${breakdownTable("تقييم البحث", b.scores.search)}
        ${breakdownTable("تقييم تجربة المستخدم", b.scores.ux)}
        ${breakdownTable("الثقة القانونية", b.scores.legal_trust)}
        ${breakdownTable("الأداء", b.scores.performance)}
        ${shots ? `<h3>لقطات مختارة</h3>${shots}` : ""}
        ${b.notes.length ? `<div class="note"><b>ملاحظات تقنية:</b><ul>${b.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
      </section>`;
    })
    .join("");

  const recs = `
  <section>
    <h2>توصيات عملية</h2>
    <div class="grid">
      <div><h3>نتبنّى</h3><ul>${opps.adopt.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div><h3>نتجنّب</h3><ul>${opps.avoid.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>
    <h3>أين نتفوّق</h3><ul>${opps.win_areas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </section>`;

  const body = `
  <header>
    <h1>تقرير مقارنة محركات البحث القانونية</h1>
    <p>${esc(labels.join(" مقابل "))} — تقرير وصفي لتجربة المستخدم والبحث · ${esc(new Date().toISOString().slice(0, 10))}</p>
  </header>
  <main>
    <section>
      <h2>ملخص تنفيذي</h2>
      <p>يقدّم هذا التقرير فحصًا مهنيًا وصفيًا لتجربة البحث والواجهة والفهارس والتنقل والأداء والثقة القانونية والجوال على المنصتين، دون استخراج محتوى أو تجاوز أي اشتراك أو حماية. تعتمد التقييمات على إشارات ظاهرة للمستخدم ومقاييس قابلة لإعادة الإنتاج.</p>
      ${comparison}
    </section>
    ${perTarget}
    ${renderOppsSection(opps)}
    ${recs}
    <section class="note">
      <b>القيود المنهجية:</b> الأرقام مؤشرات آلية مبنية على ما هو ظاهر علنًا، وقد تتأثر بدقة الـ selectors في config.ts ووجود جدران اشتراك. تُستكمل بمراجعة بشرية للقطات الشاشة.
    </section>
  </main>`;
  return htmlShell("تقرير مقارنة محركات البحث القانونية", body);
}

// --- ux_report.html (§29) --------------------------------------------------
function renderUxReportHtml(
  bundles: TargetAuditBundle[],
  opps: CompetitiveOpportunities
): string {
  const sections = bundles
    .map((b) => {
      const pages = b.pages
        .map(
          (p) =>
            `<tr><td>${esc(p.page_key)}</td><td>${esc(p.title)}</td><td>${yn(p.is_rtl)}</td><td>${yn(
              p.layout_organised
            )}</td><td class="num">${p.rating_1_5}/5</td><td>${esc(p.visual_issues.join("؛ ") || "—")}</td></tr>`
        )
        .join("");

      const icons = b.icons.icons
        .slice(0, 20)
        .map(
          (i) =>
            `<tr><td>${esc(i.location)}</td><td>${esc(i.expected_function)}</td><td>${yn(
              i.meaning_clear
            )}</td><td>${yn(i.has_tooltip)}</td><td class="num">${i.size_px ?? "—"}</td><td>${yn(
              i.touch_friendly
            )}</td></tr>`
        )
        .join("");

      const filters = b.filters.filters
        .map(
          (f) =>
            `<tr><td>${esc(f.name)}</td><td>${esc(f.location)}</td><td>${yn(
              f.multi_select
            )}</td><td>${yn(f.updates_instantly)}</td><td>${yn(f.persists_in_url)}</td></tr>`
        )
        .join("");

      const sb = b.searchBox;
      const sbRows = [
        ["موجود", sb.found],
        ["يدعم العربية", sb.supports_arabic],
        ["RTL", sb.supports_rtl],
        ["زر بحث", sb.has_search_button],
        ["زر مسح", sb.has_clear_button],
        ["اقتراحات تلقائية", sb.has_autosuggest],
        ["تصحيح إملائي", sb.has_spelling_suggestions],
        ["بحث متقدم", sb.has_advanced_search],
        ["اختيار نوع المصدر", sb.has_source_type_selector],
      ]
        .map(([k, v]) => `<tr><th>${esc(k as string)}</th><td>${yn(v as boolean)}</td></tr>`)
        .join("");

      const indexes = b.indexes.indexes
        .map(
          (i) =>
            `<tr><td>${esc(i.name)}</td><td>${esc(i.organisation)}</td><td>${yn(
              i.has_internal_search
            )}</td><td>${yn(i.has_tree)}</td><td class="num">${i.clicks_to_reach_article ?? "—"}</td></tr>`
        )
        .join("");

      const details = b.details.pages
        .map(
          (d) =>
            `<tr><td>${esc(d.page_type)}</td><td>${yn(d.has_official_source)}</td><td>${yn(
              d.has_related_articles
            )}</td><td>${yn(d.content_hidden_by_subscription)}</td><td>${yn(
              d.readable_for_legal_research
            )}</td></tr>`
        )
        .join("");

      const shots = b.pages
        .filter((p) => p.screenshot)
        .map((p) => `<figure style="margin:0"><img class="shot" src="${esc(p.screenshot)}" alt="${esc(p.page_key)}"/><figcaption class="muted">${esc(p.page_key)}</figcaption></figure>`)
        .join("");

      return `
      <section>
        <h2>${esc(b.label)}</h2>

        <h3>خريطة عناصر الصفحات</h3>
        <table><tr><th>الصفحة</th><th>العنوان</th><th>RTL</th><th>منظم</th><th>تقييم</th><th>ملاحظات بصرية</th></tr>${pages || "<tr><td colspan=6 class='muted'>لا بيانات</td></tr>"}</table>

        <div class="grid">
          <div>
            <h3>تحليل صندوق البحث</h3>
            <table>${sbRows}</table>
          </div>
          <div>
            <h3>الفلاتر</h3>
            <table><tr><th>الفلتر</th><th>المكان</th><th>متعدد</th><th>فوري</th><th>في الرابط</th></tr>${filters || "<tr><td colspan=5 class='muted'>لم تُرصد فلاتر</td></tr>"}</table>
            ${b.filters.missing_important_filters.length ? `<div class="note">فلاتر ناقصة مهمة: ${esc(b.filters.missing_important_filters.join("، "))}</div>` : ""}
          </div>
        </div>

        <h3>الأيقونات</h3>
        <table><tr><th>المكان</th><th>الوظيفة</th><th>واضحة</th><th>tooltip</th><th>الحجم(px)</th><th>مناسبة للمس</th></tr>${icons || "<tr><td colspan=6 class='muted'>لا بيانات</td></tr>"}</table>

        <h3>الفهارس والتصفح</h3>
        <table><tr><th>الفهرس</th><th>التنظيم</th><th>بحث داخلي</th><th>شجرة</th><th>نقرات للوصول</th></tr>${indexes || "<tr><td colspan=5 class='muted'>لم تُرصد فهارس</td></tr>"}</table>

        <h3>صفحات التفاصيل</h3>
        <table><tr><th>النوع</th><th>مصدر رسمي</th><th>مواد مرتبطة</th><th>محتوى محجوب</th><th>قابلة للقراءة</th></tr>${details || "<tr><td colspan=5 class='muted'>لم تُفتح صفحة تفاصيل</td></tr>"}</table>

        ${shots ? `<h3>لقطات الشاشة</h3><div class="grid">${shots}</div>` : ""}
      </section>`;
    })
    .join("");

  const body = `
  <header>
    <h1>تقرير تجربة المستخدم والواجهة (UX/UI)</h1>
    <p>تحليل بصري للواجهات والأيقونات والفلاتر والفهارس وصناديق البحث وصفحات التفاصيل</p>
  </header>
  <main>
    ${renderSiteMaps(bundles)}
    ${sections}
    <section>
      <h2>نقاط القوة والضعف</h2>
      <div class="grid">
        <div><h3>قوة — ${esc(bundles[0]?.label ?? "")}</h3><ul>${opps.qanoniah_top_strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h3>ضعف — ${esc(bundles[0]?.label ?? "")}</h3><ul>${opps.qanoniah_top_weaknesses.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h3>قوة — ${esc(bundles[1]?.label ?? "")}</h3><ul>${opps.qistas_top_strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h3>ضعف — ${esc(bundles[1]?.label ?? "")}</h3><ul>${opps.qistas_top_weaknesses.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
    </section>
    <section>
      <h2>توصيات تصميمية لمحركنا القانوني</h2>
      <div class="grid">
        <div><h3>صندوق البحث المثالي</h3><ul>${opps.ideal_search_box.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h3>صفحة النتائج المثالية</h3><ul>${opps.ideal_results_page.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h3>صفحة المادة المثالية</h3><ul>${opps.ideal_article_page.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h3>صفحة الحكم المثالية</h3><ul>${opps.ideal_judgment_page.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
      <h3>توصيات الجوال</h3><ul>${opps.mobile_recommendations.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </section>
  </main>`;
  return htmlShell("تقرير تجربة المستخدم UX/UI", body);
}

function renderSiteMaps(bundles: TargetAuditBundle[]): string {
  const maps = bundles
    .map(
      (b) => `
    <div>
      <h3>${esc(b.label)}</h3>
      <p class="muted">القائمة الرئيسية:</p>
      <ul>${b.navigation.primary_menu.slice(0, 12).map((l) => `<li>${esc(l)}</li>`).join("") || "<li class='muted'>—</li>"}</ul>
      <p class="muted">الفوتر:</p>
      <ul>${b.navigation.footer_links.slice(0, 10).map((l) => `<li>${esc(l)}</li>`).join("") || "<li class='muted'>—</li>"}</ul>
      <p class="muted">breadcrumbs: ${b.navigation.has_breadcrumbs ? "نعم" : "لا"} · ترقيم صفحات: ${b.navigation.has_pagination ? "نعم" : "لا"}</p>
    </div>`
    )
    .join("");
  return `<section><h2>خريطة الموقع</h2><div class="grid">${maps}</div></section>`;
}

function renderOppsSection(opps: CompetitiveOpportunities): string {
  return `
  <section>
    <h2>فرص بناء محرك قانوني أفضل</h2>
    <h3>الفرص غير المستغلة</h3>
    <ul>${opps.unexploited_opportunities.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <div class="grid">
      <div><h3>ربط الأنظمة بالأحكام</h3><ul>${opps.linking_recommendations.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div><h3>الفلاتر والفهارس</h3><ul>${opps.filters_indexes_recommendations.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div><h3>الثقة القانونية والمصادر</h3><ul>${opps.trust_source_recommendations.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div><h3>بنية المعلومات</h3><ul>${opps.information_architecture_recommendations.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>
  </section>`;
}

// Local text writer (kept here to avoid importing fs everywhere).
import * as fs from "fs";
function writeText(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}
