# jsx-migr8

> **Declarative JSX/TSX codemod CLI with interactive wizard, diff-preview and one-shot “YOLO” mode**

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## ✨ What it does

1. **Wizard-driven spec** – tell the tool which component you want to migrate \
   (old package(s) ➜ new package, named vs default import, new component name).
2. **Static analysis pass** – scans every `*.js|jsx|ts|tsx` file, records:
   - import locations
   - every JSX element for that component
   - full prop snapshots
3. **Rich reports** – JSON overview plus an **interactive CLI** where you can:
   - filter by package ➜ component
   - see frequency of each prop key / value
   - drill into duplicates tables
4. **Codemod rules** – configure property `remove`/`set`/`rename` or
   full-snippet `replaceWith` (outer/inner placeholders handled for you).
5. **Diff preview (dry-run)** – shows Git-style coloured patch for every file.
6. **Migration (YOLO)** – rewrites the files in-place, updates / removes imports
   and prints a success summary.

---

## 🚀 Quick start

```bash
git clone git@github.com:jvPalma-anchorage/jsx-migr8.git
cd jsx-migr8
yarn          # or npm install / pnpm i
```

```bash
# configure env variables
mv .env.example .env      # launches the interactive menu
code
```

```bash
# run the wizard
yarn start      # launches the interactive menu

# generate reports
# (option appears in the menu after the wizard)
# ...
```

```bash
# dry-run migration with coloured diffs
yarn dry-run

# do the real thing (writes files)
yarn yolo
```

---

## 🗺️ CLI flags (non-interactive)

| Flag           | Shorthand | Description                                     |
| -------------- | --------- | ----------------------------------------------- |
| `--root <dir>` | `-r`      | Project root to scan (default: `process.cwd()`) |
| `--blacklist`  | `-b`      | Comma-separated folders to ignore               |
| `--interative` | `-i`      | Force wizard even if spec already exists        |
| `--showProps`  | `-sp`     | Jump directly to props report                   |
| `--dryRun`     | `-d`      | Print diffs but do **not** write files          |
| `--yolo`       | `-y`      | Apply migration immediately                     |
| `--info`       |           | Verbose informational logs                      |
| `--debug`      |           | Extra AST/debug logs                            |

---

## 🧩 Writing rules

Rules live under `src/remap/**`. A rule can:

```ts
{
  match: [ { tag: "a", size: true } ],   // OR-array of AND-objects
  remove: ["tag", "size"],               // props to drop
  rename: { oldName: "newName" },        // map old ➜ new
  set: { variant: "linkStandalone" },    // add / override
  importFrom: "@old/pkg",
  importTo:   "@new/pkg",
  replaceWith: {
    INNER_PROPS: ["href","target"],
    code: `
      <Text {...OUTER_PROPS}>
        <a {...INNER_PROPS}>{CHILDREN}</a>
      </Text>`
  }
}
```

Placeholders:

| Token              | Replaced with                                       |
| ------------------ | --------------------------------------------------- |
| `{...OUTER_PROPS}` | All surviving / new props for the _outer_ component |
| `{...INNER_PROPS}` | Sub-set of props pushed down to the inner element   |
| `{CHILDREN}`       | Original children nodes                             |

---

## 🛠️ Project layout

```
src/
 ├─ analyzer/        Static analysis (imports & JSX)
 ├─ cli/             Interactive menus & wizard
 ├─ remap/           Rule definitions + helpers
 ├─ migrator/        Applies rules, prints diffs / writes files
 ├─ report/          JSON + interactive prop reports
 └─ utils/           AST / logging / diff helpers
```

---

## 📄 License

[MIT](LICENSE)

Enjoy & happy migrating! 🎉



# 🚚 **jsx-migr8**

---

## Project overview

### Why we built it – the never-ending **Common → Latitude** migration

Anchorage’s front-end still contains thousands of `<Text>` and other design-system components imported from `@anchorage/common`.
Maintaining *two* DS packages forces every feature team to:

* scan huge codebases to discover what still lives in **Common**
* hand-convert dozens of subtle prop/variant changes (often by search-and-replace 😱)
* run risky “big-bang” PRs that break styling or behaviour

The pain is time, risk and developer frustration.

### Vision – **jsx-migr8** to the rescue

`jsx-migr8` is a CLI that:

1. **Scans** the whole repo on every run → an always-fresh graph of imports and JSX usage.
2. **Shows** prop statistics in a friendly table so teams can pick what matters.
3. **Generates** machine-readable migration specs (*Migr8Spec*) instead of ad-hoc scripts.
4. **Transforms & commits** code with AST-aware rules, preserving formatting and complex expressions.

Result: repeatable, reviewable, *safe* migrations that scale with the design-system roadmap.

---

## Milestones & tasks

Below is a Linear-ready break-down.  Each bullet is a task; indentations are sub-tasks where helpful.

---

### 🔬 **Proof of Concept**

| ID      | Title                                    | Goal / expected outcome                                                       |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| **P-1** | Minimal AST parser spike                 | Parse a single file, list all `import` statements and corresponding JSX tags. |
| **P-2** | Naïve codebase scanner                   | Recursively walk a root folder, collect the above info into an in-memory map. |
| **P-3** | JSON usage report (`usage.json`)         | Persist the map so we can inspect results between runs.                       |
| **P-4** | First hard-coded remap (`Text` → `Text`) | Transform one file in memory and print the diff to StdOut.                    |
| **P-5** | CLI wrapper (`jsx-migr8 scan`)           | Expose root-path flag, run tasks P-2 to P-4 from the terminal.                |

---

### 🎉 **Release 1.0 – “The Wizard era”**


**Queue folder bootstrap**            
     Create `./queue/` with `component-spec.json` scaffold on first run.                


Interactive **Wizard CLI**            
     Step-by-step prompts to fill `component-spec.json` (old & new import, alias type). 


Generate stub **Migr8Rule** JSON      
     Write `migr8Rules/<old>-to-<new>.json` with `TODO:` markers.                       


Props scanner & frequency table       
     Analyse selected component, show combinations + counts.                            


Colourised **diff preview**           
     Git-style output with context lines for every file to be changed.                  


`--dryRun` / `--yolo` flags           
     Choice between preview-only and in-place file rewrite (with backup).               


Basic logging helper                  
     Consistent `INFO / WARN / SUCS` prefixes; quiet by default.                        


CLI flags (`root`, `blacklist`, etc.) 
     Configurable without editing code.                                                 


Named vs default import handling      
     Correctly map `import Text` *and* `import { Text }` forms.                         


Example rule: **Text-to-Text**        
     Production-ready JSON used by Design-System team.                                  


Unit tests for utils                  
     Jest coverage for diff maker, path helpers, loggers.                               


Publish **v1.0.0** & docs             
     Tagged release, README update and internal demo.                                   



---

### 🚀 **Release 2.0 – Graph & Spec renaissance**  *(current)*


- **Graph builder** replaces old reports            
  - Always scan on start → `graph.jsx` & `graph.imports`, no stale JSON.                     
- Remove Wizard; new **dependency-first CLI**       
  - Scan → choose packages/components interactively → no more manual folder editing.         
- New **`Migr8Spec` schema**                        
  - Single file holds `lookup` + multiple component rule-blocks; loader with CLI precedence. 
- Multi-package/component prop tables               
  - Allow selecting many packages & comps, show individual prop tables.                      
- **Migration engine** consumes `Migr8Spec.rules[]` 
  - Adapt rule-matcher, import-rewriter, diff printer to new data-model.                     
- Preserve original **value node types**            
  - `rename` / `set` keep AST (`CallExpression`, etc.), not strings.                         
- Support `renameSpecifiers` & `dropSpecifiers`     
  - Enables package-wide icon migration; implement with Icons example.                       
- Improved diff UX & flow                           
  - Select spec → dry-run preview per file → confirm → mutate; collapsible diffs.            
- Remove legacy code & JSONs                        
  - Delete `reportGlobalUsage`, wizard modules; optional `graph.json` export only.           

*(Extra tasks grouped so milestone stays at \~8 items while covering M1–M8 initiatives.)*

---

## How to import into Linear

* **Project** → **🚚 jsx-migr8**
* Copy the **Overview** section into the project description.
* Create three **Milestones** named as above, with the indicated tasks.
* Paste each task title & description; mark sub-tasks where indented.

That’s it – the full history and the path ahead are now captured in Linear. 🎯
