import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'Capstone_Report_Answers.txt'), 'utf8').replace(/\r\n/g, '\n');
const lines = src.split('\n');

const MAJOR = new Map([
  ['COVER PAGE', '## Cover Page'],
  ['DECLARATION', '## Declaration'],
  ['ABSTRACT (around 250–300 words)', '## Abstract (200–300 words)'],
  ['TABLE OF CONTENTS', '## Table of Contents'],
  ['LIST OF FIGURES', '## List of Figures'],
  ['LIST OF TABLES', '## List of Tables'],
  ['LIST OF ABBREVIATIONS', '## List of Abbreviations'],
  ['CHAPTER 1: INTRODUCTION', '# Chapter 1: Introduction'],
  ['CHAPTER 2: IMPLEMENTATION DETAILS', '# Chapter 2: Implementation Details'],
  ['CHAPTER 3: TESTING, VALIDATION & RESULTS', '# Chapter 3: Testing, Validation & Results'],
  ['CHAPTER 4: EXECUTION / DEPLOYMENT DETAILS', '# Chapter 4: Execution / Deployment Details'],
  ['CHAPTER 5: PROJECT EXECUTION EVIDENCE', '# Chapter 5: Project Execution Evidence'],
  ['CHAPTER 6: CONCLUSION & FUTURE WORK', '# Chapter 6: Conclusion & Future Work'],
  ['REFERENCES', '# References'],
  ['APPENDIX', '# Appendix'],
  ['FORMATTING REMINDER (for your final PDF)', '## Formatting Reminder (for final PDF)'],
  ['END OF CAPSTONE REPORT ANSWERS', '---\n\n*End of Capstone Report Answers*'],
]);

const LABEL_RE =
  /^(Problem context \(brief\)|Solution implemented|Technologies used|Outcomes and results|Problem|Motivation|Testing strategy|Tools used|Test environments|Observations|Performance \/ accuracy notes \(local demo level\)|Overall result|Hardware \(example local demo\)|Software|Runtime services|Commit history evidence|What the commit history generally shows|Branch used for development|Review dates|Key feedback received \(write in your own words after meetings\)|Example points you can adapt if they match your reviews|Actions taken on feedback|Suggested screenshots to capture|Important code sections \(explained simply; paste shortened snippets in PDF\)|Idea|For eligibility|Typical thresholds used in tests|Functional flow \(end-to-end happy path\)|Programming languages|Frameworks \/ libraries|Tools and platforms|In scope \(implemented \/ largely implemented\)|Out of scope \/ limited for this version|Main layers|Suggested demo script \(3–7 minutes\)|Cloud deployment \(possible future \/ optional note\)|How to read status|GitHub repository link|Project Title|Student Name\(s\) & Roll Number\(s\)|Program|Institution Name|Academic Year|Internal Supervisor Name|Pseudocode):$/;

function isSep(s) {
  const t = s.trim();
  return /^=+$/.test(t) || /^-+$/.test(t);
}

function countPipes(s) {
  return (s.match(/\|/g) || []).length;
}

/** True pipe table header: at least 2 columns */
function isPipeTableHeader(s) {
  const t = s.trim();
  if (!t.includes('|')) return false;
  // PlantUML swimlanes look like |Student Portal| alone on a line
  if (/^\|[A-Za-z][^|]*\|$/.test(t)) return false;
  if (/^\|(Student Portal|Backend API|Staff|AI Worker)/.test(t)) return false;
  const cells = splitRow(t.includes('|') && !t.startsWith('|') && !t.endsWith('|') ? `|${t}|` : t);
  // For "A | B" style without edge pipes:
  const simple = t.split('|').map((c) => c.trim()).filter(Boolean);
  return simple.length >= 2;
}

function isPipeSepRow(s) {
  const mid = splitRow(s);
  return mid.length >= 2 && mid.every((p) => /^:?-+:?$/.test(p) || /^-+$/.test(p));
}

function splitRow(s) {
  const t = s.trim();
  // Support both "| a | b |" and "a | b"
  if (!t.startsWith('|') && t.includes('|')) {
    return t.split('|').map((c) => c.trim());
  }
  const parts = t.split('|').map((c) => c.trim());
  if (parts[0] === '') parts.shift();
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

const out = [];
out.push('# Capstone Project Report — Complete Answers');
out.push('');
out.push('> Easy-reading Markdown version. Original file kept as `Capstone_Report_Answers.txt`.');
out.push('');

let i = 0;

// Skip opening banner =====
while (i < lines.length && (isSep(lines[i]) || lines[i].startsWith('BITS CAPSTONE'))) i++;

// Metadata until next separator
const metaLines = [];
while (i < lines.length && !isSep(lines[i])) {
  if (lines[i].trim()) metaLines.push(lines[i]);
  i++;
}
let key = null;
let val = [];
const emitMeta = () => {
  if (!key) return;
  out.push(`- **${key}:** ${val.join(' ').replace(/\s+/g, ' ').trim()}`);
  key = null;
  val = [];
};
for (const L of metaLines) {
  const m = L.match(/^([A-Za-z][A-Za-z /]*?)\s*:\s*(.*)$/);
  if (m && !/^\s/.test(L)) {
    emitMeta();
    key = m[1].trim();
    val = [m[2]];
  } else if (key) {
    val.push(L.trim());
  }
}
emitMeta();
out.push('');

let inPlantuml = false;
let inPseudo = false;
let pseudo = [];
let inListOfTables = false;
let inListOfFigures = false;
let inAbbreviations = false;
let abbrStarted = false;

const flushPseudo = () => {
  if (!inPseudo) return;
  out.push('```text');
  // trim trailing blanks
  while (pseudo.length && pseudo[pseudo.length - 1].trim() === '') pseudo.pop();
  out.push(...pseudo);
  out.push('```');
  out.push('');
  pseudo = [];
  inPseudo = false;
};

while (i < lines.length) {
  const raw = lines[i];
  const t = raw.trim();

  if (t.startsWith('@startuml')) {
    flushPseudo();
    inPlantuml = true;
    out.push('```plantuml');
    out.push(t);
    i++;
    continue;
  }
  if (inPlantuml) {
    out.push(raw);
    if (t.startsWith('@enduml')) {
      out.push('```');
      out.push('');
      inPlantuml = false;
    }
    i++;
    continue;
  }

  if (isSep(t)) {
    i++;
    continue;
  }

  if (MAJOR.has(t)) {
    flushPseudo();
    inListOfTables = t === 'LIST OF TABLES';
    inListOfFigures = t === 'LIST OF FIGURES';
    inAbbreviations = t === 'LIST OF ABBREVIATIONS';
    abbrStarted = false;
    out.push('');
    out.push(MAJOR.get(t));
    out.push('');
    i++;
    continue;
  }

  const ap = t.match(/^APPENDIX ([A-Z]):\s*(.+)$/);
  if (ap) {
    flushPseudo();
    inListOfTables = inListOfFigures = inAbbreviations = false;
    out.push('');
    out.push(`## Appendix ${ap[1]}: ${ap[2]}`);
    out.push('');
    i++;
    continue;
  }

  // List of Figures / Tables → bullets (do NOT treat "Table 2.1 ..." as a data table)
  if (inListOfFigures || inListOfTables) {
    if (!t) {
      out.push('');
      i++;
      continue;
    }
    if (t.startsWith('(') || t.startsWith('Generate')) {
      out.push(`*${t}*`);
      i++;
      continue;
    }
    out.push(`- ${t}`);
    i++;
    continue;
  }

  // Abbreviations → markdown table
  if (inAbbreviations) {
    if (!t) {
      i++;
      continue;
    }
    // leave abbreviations section when we hit next major (handled above) or chapter note
    if (t.startsWith('CHAPTER') || t.startsWith('(')) {
      inAbbreviations = false;
      // fall through
    } else {
      const parts = t.split(/\s{2,}/);
      if (parts.length >= 2) {
        if (!abbrStarted) {
          out.push('| Abbreviation | Meaning |');
          out.push('| --- | --- |');
          abbrStarted = true;
        }
        out.push(`| ${parts[0]} | ${parts.slice(1).join(' ')} |`);
        i++;
        continue;
      }
    }
  }

  // Section headings 1.1 / 2.1.1 / A.1
  const sec = t.match(/^(\d+\.\d+(?:\.\d+)?|[A-Z]\.\d+)\s+(.+)$/);
  if (sec && !t.includes('|')) {
    flushPseudo();
    inListOfTables = inListOfFigures = inAbbreviations = false;
    out.push('');
    out.push(`### ${sec[1]} ${sec[2]}`);
    out.push('');
    i++;
    continue;
  }

  if (t.startsWith('PlantUML —') || t.startsWith('PlantUML -')) {
    flushPseudo();
    out.push('');
    out.push(`#### ${t}`);
    out.push('');
    i++;
    continue;
  }

  const alg = t.match(/^([A-F])\)\s+(.+)$/);
  if (alg) {
    flushPseudo();
    out.push('');
    out.push(`#### ${alg[1]}) ${alg[2]}`);
    out.push('');
    i++;
    continue;
  }

  // Real data tables only (not list-of-tables, not plantuml)
  if (t.startsWith('Table ') && !t.includes('|')) {
    flushPseudo();
    out.push('');
    out.push(`**${t}**`);
    out.push('');
    i++;
    // skip blanks
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length && isPipeTableHeader(lines[i])) {
      const headerCells = splitRow(lines[i]);
      out.push('| ' + headerCells.join(' | ') + ' |');
      out.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');
      i++;
      if (i < lines.length && isPipeSepRow(lines[i])) i++;
      while (i < lines.length) {
        const row = (lines[i] || '').trim();
        if (!row.includes('|')) break;
        if (/^\|[A-Za-z][^|]*\|$/.test(row)) break; // plantuml swimlane
        if (isPipeSepRow(row)) {
          i++;
          continue;
        }
        const cells = splitRow(row);
        if (cells.length < 2) break;
        out.push('| ' + cells.join(' | ') + ' |');
        i++;
      }
      out.push('');
    }
    continue;
  }

  if (t === 'Pseudocode:') {
    flushPseudo();
    out.push('**Pseudocode:**');
    out.push('');
    inPseudo = true;
    pseudo = [];
    i++;
    continue;
  }

  if (inPseudo) {
    if (t === '') {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = (lines[j] || '').trim();
      const continues =
        !next ||
        next.startsWith('FUNCTION ') ||
        next.startsWith('IF ') ||
        next.startsWith('ELSE ') ||
        next.startsWith('END ') ||
        next.startsWith('RETURN ') ||
        /^(user |sessionId|payload|Redis|SetCookie|snapshot|app |outcome|step |save |queryVector|chunks|context|answer|maybe )/.test(next) ||
        /^\s/.test(lines[j] || '');
      if (!continues) {
        flushPseudo();
      } else {
        pseudo.push(raw);
        i++;
        continue;
      }
    } else {
      pseudo.push(raw);
      i++;
      continue;
    }
  }

  if (LABEL_RE.test(t)) {
    out.push(`**${t.slice(0, -1)}:**`);
    i++;
    continue;
  }

  const step = t.match(/^(Step \d+:)\s*(.*)$/);
  if (step) {
    flushPseudo();
    out.push('');
    out.push(`**${step[1]}** ${step[2]}`);
    i++;
    const cmds = [];
    while (i < lines.length) {
      const tt = lines[i].trim();
      if (!tt) break;
      if (isSep(tt) || /^Step \d+:/.test(tt) || tt.startsWith('Cloud deployment') || tt.startsWith('PlantUML') || /^\d+\.\d+/.test(tt)) break;
      if (
        /^(docker|cd |npm |copy |cp |git |Open |MONGODB|REDIS|SESSION|ADMIN_|STUDENT_|OPENAI|SMTP|RAZORPAY|Pinecone|Fill )/.test(tt) ||
        tt.includes('.env') ||
        tt.includes('→') ||
        /^\s/.test(lines[i])
      ) {
        cmds.push(tt);
        i++;
        continue;
      }
      break;
    }
    if (cmds.length) {
      out.push('');
      out.push('```bash');
      out.push(...cmds);
      out.push('```');
      out.push('');
    }
    continue;
  }

  if (!t) {
    if (out[out.length - 1] !== '') out.push('');
    i++;
    continue;
  }

  out.push(t);
  i++;
}

flushPseudo();

let md = out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

// Soft-join broken prose lines that are mid-sentence (optional light cleanup skipped to stay safe)

fs.writeFileSync(path.join(root, 'Capstone_Report_Answers.md'), md);
console.log('OK lines', md.split('\n').length);

// Sanity checks
const must = [
  '# Chapter 1: Introduction',
  '# Chapter 2: Implementation Details',
  '## List of Abbreviations',
  '### 1.1 Overview of the project',
  '### 2.1 System Architecture & Design',
  '```plantuml',
  '| Area | Choice |',
  '| Module | Purpose |',
  '| Test Case ID |',
];
for (const m of must) {
  if (!md.includes(m)) console.error('MISSING:', m);
  else console.log('ok:', m);
}
