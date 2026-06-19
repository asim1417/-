# Muqtafi Legal Issue Tree Extractor

A small, **safe-by-design** crawler that samples **public** pages of the
[Muqtafi legal database](https://muqtafi.birzeit.edu/) (Birzeit University) and
extracts *legal issue-tree candidates* — domains, law names, chapters, article
numbers, and legal concepts/issues/procedures — as clean JSONL.

The output is meant to feed a **human-reviewed** mapping step into the
**Hakeem Legal Issues Core**. The extractor is deliberately kept independent and
is **not** wired to any production database.

---

## Purpose

Building a legal "issue tree" (a hierarchy of legal domains → laws → chapters →
articles → issues/procedures) by hand is slow. This tool produces *candidate*
nodes with evidence and a confidence score so a human expert can quickly accept,
edit, or reject them. It extracts **structure and public text only**; it does not
attempt to reproduce full legislative texts or any subscriber-only content.

Each candidate is one of these `candidate_type` values:

| type              | meaning                                              | level |
| ----------------- | ---------------------------------------------------- | ----- |
| `law_title`       | A law / regulation / decree title                    | 0     |
| `concept`         | A legal module, navigation, or breadcrumb concept    | 1     |
| `concept`         | A chapter / section heading (الباب/الفصل/القسم …)     | 2     |
| `article_heading` | An article heading (مادة (N))                         | 3     |
| `procedure`       | A procedural/enforcement issue keyword in an article | 4     |
| `legal_issue`     | A substantive issue keyword in an article            | 4     |
| `alias`           | Alternate phrasings (also listed in `aliases`)       | —     |

---

## Safe usage

This crawler is intentionally conservative:

- **Respects `robots.txt`** where it is reachable (paths disallowed for the bot
  are skipped).
- **Polite rate limiting** via `--delay` (default **3s** between requests).
- **Hard page cap** via `--max-pages` (default **5**). Single-threaded queue.
- **Skips non-public URLs** — anything whose URL contains `login`, `register`,
  `subscribe`/`subscription`, `account`, `password`, `payment`, `admin`, etc. is
  never fetched.
- **Stays on host** — only `muqtafi.birzeit.edu` (and subdomains) are followed.
- **Retries transient errors** (DNS failures, timeouts, connection resets) with
  exponential backoff (`--retries`, `--backoff`); HTTP 4xx/5xx are recorded, not
  hammered.
- **Narrow link expansion** — only legal-module navigation and public
  legislation pages are followed; legislation pages are leaves (not expanded).

> Do **not** raise `--max-pages` for bulk harvesting without written permission
> from the data owner or proper API access. See the legal/ethical note below.

### Install

```bash
pip install -r scripts/legal_issues/requirements.txt
```

---

## CLI examples

A tiny, cautious sample run:

```bash
python scripts/legal_issues/muqtafi_issue_tree_extractor.py \
    --max-pages 3 --delay 3 \
    --out muqtafi_issue_candidates.jsonl \
    --log muqtafi_run_log.json
```

Add your own seed pages (repeatable), keep it slow and small:

```bash
python scripts/legal_issues/muqtafi_issue_tree_extractor.py \
    --max-pages 5 --delay 4 --retries 3 --backoff 2 \
    --seed "https://muqtafi.birzeit.edu/Welcome_legislation.aspx" \
    --out out.jsonl
```

### Options

| flag           | default                          | meaning                                  |
| -------------- | -------------------------------- | ---------------------------------------- |
| `--max-pages`  | `5`                              | Maximum number of pages to *fetch*.      |
| `--delay`      | `3.0`                            | Seconds to wait between requests.        |
| `--retries`    | `3`                              | Retries for transient network errors.    |
| `--backoff`    | `2.0`                            | Base seconds for exponential backoff.    |
| `--seed`       | (built-in seeds)                 | Extra seed URL (repeatable).             |
| `--out`        | `muqtafi_issue_candidates.jsonl` | JSONL output path.                       |
| `--log`        | `muqtafi_run_log.json`           | Run log (fetched pages, errors, counts). |

---

## Output format

One JSON object per line (JSONL). See
[`data/samples/muqtafi_issue_candidates_sample.jsonl`](../../data/samples/muqtafi_issue_candidates_sample.jsonl)
for real generated examples.

```json
{
  "source": "Muqtafi / Birzeit",
  "jurisdiction": "PS",
  "domain": "التنفيذ",
  "law_name": "قانون التنفيذ رقم (23) لسنة 2005",
  "chapter": "الفصل الثاني في حبس المدين",
  "issue_candidate": "حبس المدين",
  "candidate_type": "procedure",
  "issue_level": 4,
  "aliases": ["الأمر بالقبض", "القبض على المنفذ ضده", "إكراه المدين"],
  "evidence": {
    "url": "https://muqtafi.birzeit.edu/pg/getleg.asp?id=15138",
    "text_snippet": "يجوز حبس المدين الممتنع عن الوفاء …",
    "article_number": "22"
  },
  "confidence": 0.63,
  "needs_human_review": true
}
```

### Field reference

| field                | type            | notes                                                              |
| -------------------- | --------------- | ------------------------------------------------------------------ |
| `source`             | string          | Always `"Muqtafi / Birzeit"`.                                      |
| `jurisdiction`       | string          | ISO-ish code; `"PS"` (Palestine).                                  |
| `domain`             | string \| null  | Inferred legal domain (e.g. التنفيذ، الإثبات).                     |
| `law_name`           | string \| null  | Inferred law/regulation title.                                     |
| `chapter`            | string \| null  | Nearest chapter/section heading.                                   |
| `issue_candidate`    | string          | The candidate label/phrase.                                        |
| `candidate_type`     | string          | One of the types in the table above.                              |
| `issue_level`        | int             | Depth hint: 0 law, 1 module, 2 chapter, 3 article, 4 issue.       |
| `aliases`            | string[]        | Known alternate phrasings.                                         |
| `evidence.url`       | string          | Source page URL.                                                   |
| `evidence.text_snippet` | string       | Short supporting snippet.                                          |
| `evidence.article_number` | string \| null | Article number when applicable.                              |
| `confidence`         | float           | 0–0.95 heuristic score.                                            |
| `needs_human_review` | bool            | `true` when `confidence < 0.85` — i.e. almost always.             |

> **Confidence is heuristic, not authoritative.** It combines simple signals
> (matched in a heading, law/domain detected, phrase repetition). Treat every
> candidate as a draft requiring expert review.

---

## Legal / ethical caution

- **Public content only.** This tool targets publicly reachable pages and
  explicitly skips login, subscription, account, and payment URLs. Do **not**
  modify it to access closed, paywalled, or restricted material.
- **Respect the source.** Muqtafi is operated by Birzeit University's Institute
  of Law. Honor its terms of use, `robots.txt`, and any rate or volume limits.
  For anything beyond small lawful sampling, obtain **written permission** or use
  an official API.
- **No aggressive crawling.** Keep `--delay` high and `--max-pages` low. Do not
  parallelize or remove the politeness controls.
- **Human-in-the-loop.** Output is *candidate* data with `needs_human_review`
  set. It must be reviewed by a qualified person before being used or published,
  and is **not** a substitute for authoritative legal texts.
- **Not connected to production.** This extractor stands alone and is not wired
  into the Hakeem production database; integration is a separate, reviewed step.
