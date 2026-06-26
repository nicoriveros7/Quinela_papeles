/**
 * update-player-display-names.ts
 *
 * Reads a reviewed Excel file and updates Player.shortName ONLY.
 * Does NOT touch: fullName, firstNames, lastNames, nameOnShirt, externalRef, id,
 *                 TournamentPlayer, MatchQuestionOption, predictions, scoring.
 *
 * Usage:
 *   --file <path>       Path to Excel file (required)
 *   --dry-run           Preview changes without writing (DEFAULT — safe mode)
 *   --apply             Write changes to DB (must be explicit; requires --file)
 *   --allow-unmatched   Skip rows with no DB match instead of aborting
 *
 * Default behavior (no flags): dry-run.
 * Writing requires explicit --apply.
 *
 * Examples:
 *   # Dry-run (safe, no writes):
 *   DATABASE_URL="..." pnpm --filter @quinela/db players:update-display-names -- \
 *     --file ./players-name-audit.xlsx --dry-run
 *
 *   # Apply (writes to DB):
 *   DATABASE_URL="..." pnpm --filter @quinela/db players:update-display-names -- \
 *     --file ./players-name-audit.xlsx --apply
 */

import * as fs from 'fs';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPECTED_ROWS = 1248;
const EXCEL_SHEET   = 'Auditoría';
const MONOREPO_ROOT = path.resolve(__dirname, '../../..');

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExcelRow {
  Team:                string;
  '#':                 number | string;
  POS:                 string;
  'Player name (MD)':  string;
  'First name(s)':     string;
  'Last name(s)':      string;
  'Name on shirt':     string;
  'Formato detectado': string;
  'Nombre sugerido':   string;
  Ajuste:              string;
  Confianza:           string;
}

interface PlayerUpdate {
  externalRef:  string;
  playerId:     string;
  oldShortName: string | null;
  newShortName: string;
  source:       'AJUSTE' | 'SUGERIDO';
  team:         string;
  shirt:        number;
}

interface SummaryStats {
  totalExcelRows: number;
  matched:        number;
  unmatched:      number;
  unchanged:      number;
  updated:        number;
  backupPath:     string | null;
  mode:           'dry-run' | 'apply';
}

// ─── Arg parsing ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  const rawFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

  const isApply    = args.includes('--apply');
  const isDryRun   = !isApply; // default is dry-run
  const allowUnmatched = args.includes('--allow-unmatched');

  if (!rawFile) {
    console.error('❌  --file <path> is required.');
    console.error('    Example: --file ./players-name-audit.xlsx');
    process.exit(1);
  }

  // Resolve relative to the monorepo root (pnpm sets CWD to the package dir,
  // so we use __dirname-based root to keep paths predictable).
  const filePath = path.isAbsolute(rawFile)
    ? rawFile
    : path.resolve(MONOREPO_ROOT, rawFile);

  return { isApply, isDryRun, allowUnmatched, filePath };
}

// ─── Excel reading ────────────────────────────────────────────────────────────

function readExcel(filePath: string): ExcelRow[] {
  if (!fs.existsSync(filePath)) {
    console.error(`❌  File not found: ${filePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);

  if (!wb.SheetNames.includes(EXCEL_SHEET)) {
    console.error(`❌  Sheet "${EXCEL_SHEET}" not found in ${filePath}.`);
    console.error(`    Available sheets: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }

  const ws = wb.Sheets[EXCEL_SHEET];
  return XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '' });
}

// ─── Row parsing + validation ─────────────────────────────────────────────────

interface ParsedRow {
  externalRef: string;
  finalName:   string;
  source:      'AJUSTE' | 'SUGERIDO';
  team:        string;
  shirt:       number;
}

function parseAndValidate(
  rows: ExcelRow[],
  opts: { isApply: boolean; allowUnmatched: boolean },
): ParsedRow[] {
  const errors: string[] = [];

  // ── Row count ──────────────────────────────────────────────────────────────
  if (rows.length !== EXPECTED_ROWS) {
    errors.push(
      `Row count mismatch: Excel has ${rows.length} rows, expected ${EXPECTED_ROWS}.`,
    );
  }

  // ── Parse each row ─────────────────────────────────────────────────────────
  const parsed: ParsedRow[] = [];
  const seenRefs = new Map<string, number>(); // externalRef → row index

  rows.forEach((row, idx) => {
    const lineNum = idx + 2; // Excel row (1-indexed header + 1)
    const team  = String(row['Team'] ?? '').trim().toUpperCase();
    const shirt = parseInt(String(row['#'] ?? ''), 10);
    const ajuste    = String(row['Ajuste'] ?? '').trim();
    const sugerido  = String(row['Nombre sugerido'] ?? '').trim();
    const finalName = ajuste || sugerido;
    const source: 'AJUSTE' | 'SUGERIDO' = ajuste ? 'AJUSTE' : 'SUGERIDO';

    if (!team || isNaN(shirt)) {
      errors.push(`Row ${lineNum}: missing Team or shirt number (Team="${team}", #="${row['#']}").`);
      return;
    }

    if (!finalName) {
      errors.push(`Row ${lineNum} [wc2026-${team}-${shirt}]: empty final name (Ajuste and Nombre sugerido are both empty).`);
      return;
    }

    const externalRef = `wc2026-${team}-${shirt}`;

    if (seenRefs.has(externalRef)) {
      errors.push(
        `Duplicate externalRef "${externalRef}" at rows ${seenRefs.get(externalRef)! + 2} and ${lineNum}.`,
      );
    } else {
      seenRefs.set(externalRef, idx);
    }

    parsed.push({ externalRef, finalName, source, team, shirt });
  });

  if (errors.length > 0) {
    console.error('\n❌  Validation errors — aborting:\n');
    errors.forEach((e) => console.error(`   • ${e}`));
    process.exit(1);
  }

  return parsed;
}

// ─── Backup CSV ───────────────────────────────────────────────────────────────

function writeBackup(updates: PlayerUpdate[]): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15); // YYYYMMDD-HHmmss
  const filename = `player-display-names-backup-${ts}.csv`;
  const outPath  = path.join(MONOREPO_ROOT, filename);

  const header = 'externalRef,playerId,oldShortName,newShortName\n';
  const lines  = updates.map((u) =>
    [
      u.externalRef,
      u.playerId,
      csvEscape(u.oldShortName ?? ''),
      csvEscape(u.newShortName),
    ].join(','),
  );
  fs.writeFileSync(outPath, header + lines.join('\n'), 'utf-8');
  return outPath;
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { isApply, isDryRun, allowUnmatched, filePath } = parseArgs();
  const mode = isApply ? 'apply' : 'dry-run';

  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  update-player-display-names');
  console.log(`  Mode:  ${mode.toUpperCase()}${isDryRun ? '  (no writes — pass --apply to write)' : ''}`);
  console.log(`  File:  ${filePath}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  // ── Read Excel ─────────────────────────────────────────────────────────────
  console.log('📄  Reading Excel...');
  const rows = readExcel(filePath);
  console.log(`    ${rows.length} rows found in sheet "${EXCEL_SHEET}".`);

  // ── Validate ───────────────────────────────────────────────────────────────
  console.log('🔍  Validating...');
  const parsed = parseAndValidate(rows, { isApply, allowUnmatched });
  console.log(`    ✓ ${parsed.length} rows valid, 0 errors.`);

  // ── Query DB ───────────────────────────────────────────────────────────────
  const prisma = new PrismaClient();

  try {
    console.log('🗄   Querying DB...');
    const allRefs = parsed.map((p) => p.externalRef);

    const dbPlayers = await prisma.player.findMany({
      where:  { externalRef: { in: allRefs } },
      select: { id: true, externalRef: true, shortName: true },
    });

    const dbMap = new Map(dbPlayers.map((p) => [p.externalRef!, p]));

    // ── Classify ────────────────────────────────────────────────────────────
    const unmatched: ParsedRow[]  = [];
    const unchanged: PlayerUpdate[] = [];
    const toUpdate:  PlayerUpdate[] = [];

    for (const row of parsed) {
      const dbPlayer = dbMap.get(row.externalRef);
      if (!dbPlayer) {
        unmatched.push(row);
        continue;
      }

      const update: PlayerUpdate = {
        externalRef:  row.externalRef,
        playerId:     dbPlayer.id,
        oldShortName: dbPlayer.shortName,
        newShortName: row.finalName,
        source:       row.source,
        team:         row.team,
        shirt:        row.shirt,
      };

      if (dbPlayer.shortName === row.finalName) {
        unchanged.push(update);
      } else {
        toUpdate.push(update);
      }
    }

    // ── Unmatched check ─────────────────────────────────────────────────────
    if (unmatched.length > 0) {
      const refs = unmatched.map((u) => u.externalRef).join(', ');
      if (!allowUnmatched && isApply) {
        console.error(`\n❌  ${unmatched.length} unmatched player(s) — aborting.`);
        console.error(`    Pass --allow-unmatched to skip them.`);
        console.error(`    Refs: ${refs}`);
        process.exit(1);
      } else {
        console.warn(`\n⚠️   ${unmatched.length} unmatched player(s) — will be skipped.`);
        console.warn(`    Refs: ${refs}`);
      }
    }

    // ── Print preview ────────────────────────────────────────────────────────
    console.log('');
    console.log('─── Preview ─────────────────────────────────────────────────');
    if (toUpdate.length > 0) {
      const preview = toUpdate.slice(0, 30);
      for (const u of preview) {
        const src = u.source === 'AJUSTE' ? ' [AJUSTE MANUAL]' : '';
        console.log(`  ${u.externalRef.padEnd(20)}  "${u.oldShortName ?? '(null)'}"  →  "${u.newShortName}"${src}`);
      }
      if (toUpdate.length > 30) {
        console.log(`  ... and ${toUpdate.length - 30} more (see backup CSV for full list).`);
      }
    } else {
      console.log('  No changes needed — all players already have the correct shortName.');
    }

    // ── Apply ────────────────────────────────────────────────────────────────
    let backupPath: string | null = null;

    if (isApply && toUpdate.length > 0) {
      // Write backup BEFORE touching DB
      console.log('');
      console.log('💾  Writing backup CSV...');
      backupPath = writeBackup([...toUpdate, ...unchanged]);
      console.log(`    Backup: ${backupPath}`);

      console.log('');
      console.log('✏️   Applying updates in transaction...');
      await prisma.$transaction(
        toUpdate.map((u) =>
          prisma.player.update({
            where: { id: u.playerId },
            data:  { shortName: u.newShortName },
          }),
        ),
      );
      console.log(`    ✓ ${toUpdate.length} player(s) updated.`);
    } else if (isApply && toUpdate.length === 0) {
      console.log('\n  Nothing to apply — DB is already up to date.');
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const stats: SummaryStats = {
      totalExcelRows: rows.length,
      matched:        dbPlayers.length,
      unmatched:      unmatched.length,
      unchanged:      unchanged.length,
      updated:        isApply ? toUpdate.length : 0,
      backupPath,
      mode,
    };

    console.log('');
    console.log('─── Summary ─────────────────────────────────────────────────');
    console.log(`  Mode:              ${stats.mode.toUpperCase()}`);
    console.log(`  Excel rows:        ${stats.totalExcelRows}`);
    console.log(`  Matched in DB:     ${stats.matched}`);
    console.log(`  Unmatched:         ${stats.unmatched}`);
    console.log(`  Already correct:   ${stats.unchanged}`);
    if (isDryRun) {
      console.log(`  Would update:      ${toUpdate.length}`);
      console.log('');
      console.log('  ⚠️  DRY-RUN — No changes written to DB.');
      console.log('      Run with --apply to apply changes.');
    } else {
      console.log(`  Updated:           ${stats.updated}`);
    }
    if (stats.backupPath) {
      console.log(`  Backup CSV:        ${stats.backupPath}`);
    }
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    if (isApply && toUpdate.length > 0) {
      console.log('✅  Done.');
    } else if (isDryRun) {
      console.log('✅  Dry-run complete. No data was modified.');
    } else {
      console.log('✅  Nothing to update.');
    }
    console.log('');

  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n❌  Fatal error:\n', err);
  process.exit(1);
});
