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

# run the wizard
yarn start      # launches the interactive menu

# generate reports
# (option appears in the menu after the wizard)
# ...

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
