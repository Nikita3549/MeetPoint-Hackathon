import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const CONFIG = {
    unit: {
        title: 'Юнит-тесты',
        subtitle: 'Покрытие бизнес-логики, сервисов, контроллеров и утилит',
        coverageDir: path.join(rootDir, 'coverage'),
        summaryFile: 'coverage-summary.json',
        testDir: path.join(rootDir, 'src'),
        testSuffix: '.spec.ts',
        istanbulIndex: 'index.html',
    },
    e2e: {
        title: 'Интеграционные тесты (e2e)',
        subtitle: 'Сквозные сценарии API через HTTP (supertest + PostgreSQL)',
        coverageDir: path.join(rootDir, 'coverage', 'e2e'),
        summaryFile: 'coverage-summary.json',
        testDir: path.join(rootDir, 'test'),
        testSuffix: '.e2e-spec.ts',
        istanbulIndex: 'e2e/index.html',
    },
};

const MODULE_LABELS = {
    auth: 'Аутентификация',
    users: 'Пользователи',
    events: 'События',
    'match-requests': 'Match-запросы',
    images: 'Изображения',
    tags: 'Теги',
    prisma: 'Prisma',
    app: 'Приложение',
    other: 'Прочее',
};

function walkTestFiles(dir, suffix) {
    const results = [];

    function walk(current) {
        if (!fs.existsSync(current)) {
            return;
        }
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.endsWith(suffix)) {
                results.push(full);
            }
        }
    }

    walk(dir);
    return results.sort();
}

function parseTestFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(rootDir, filePath);
    const suites = [];
    const stack = [];
    let currentSuite = null;

    for (const line of content.split('\n')) {
        const describeMatch = line.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (describeMatch) {
            stack.push(describeMatch[1]);
            currentSuite = {
                name: stack.join(' › '),
                tests: [],
            };
            suites.push(currentSuite);
            continue;
        }

        if (/^\s*\}\);?\s*$/.test(line.trim()) && stack.length > 0) {
            stack.pop();
            currentSuite = suites.at(-1) ?? null;
        }

        const itMatch = line.match(/^\s*it(?:\.each)?\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (itMatch) {
            if (!currentSuite) {
                currentSuite = { name: path.basename(filePath), tests: [] };
                suites.push(currentSuite);
            }
            currentSuite.tests.push(itMatch[1]);
        }
    }

    const tests = suites.flatMap((suite) =>
        suite.tests.map((title) => ({
            title,
            suite: suite.name,
        })),
    );

    return { relPath, tests };
}

function detectModule(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const modulesMatch = normalized.match(/modules\/([^/]+)/);
    if (modulesMatch) {
        return modulesMatch[1];
    }
    if (normalized.includes('/common/tags/')) {
        return 'tags';
    }
    if (normalized.includes('/prisma/')) {
        return 'prisma';
    }
    if (normalized.includes('app.controller')) {
        return 'app';
    }
    if (normalized.includes('health.e2e') || normalized.includes('assetlinks')) {
        return 'app';
    }
    const e2eMatch = normalized.match(/test\/([^/.]+)\.e2e-spec/);
    if (e2eMatch) {
        const name = e2eMatch[1];
        if (name === 'match-requests') {
            return 'match-requests';
        }
        if (['auth', 'users', 'events', 'images'].includes(name)) {
            return name;
        }
        return 'app';
    }
    return 'other';
}

function readCoverage(summaryPath) {
    if (!fs.existsSync(summaryPath)) {
        throw new Error(
            `Файл покрытия не найден: ${summaryPath}. Сначала запустите test:cov или test:e2e:cov.`,
        );
    }

    const raw = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const total = raw.total;
    const files = Object.entries(raw)
        .filter(([key]) => key !== 'total')
        .map(([absPath, metrics]) => {
            const relPath = path.relative(rootDir, absPath);
            return {
                relPath,
                module: detectModule(relPath),
                lines: metrics.lines.pct,
                statements: metrics.statements.pct,
                functions: metrics.functions.pct,
                branches: metrics.branches.pct,
            };
        })
        .sort((a, b) => a.relPath.localeCompare(b.relPath));

    const modulesMap = new Map();
    for (const file of files) {
        const bucket = modulesMap.get(file.module) ?? {
            key: file.module,
            label: MODULE_LABELS[file.module] ?? file.module,
            files: [],
            lines: [],
            statements: [],
            functions: [],
            branches: [],
        };
        bucket.files.push(file);
        bucket.lines.push(file.lines);
        bucket.statements.push(file.statements);
        bucket.functions.push(file.functions);
        bucket.branches.push(file.branches);
        modulesMap.set(file.module, bucket);
    }

    const modules = [...modulesMap.values()]
        .map((module) => ({
            ...module,
            lines: average(module.lines),
            statements: average(module.statements),
            functions: average(module.functions),
            branches: average(module.branches),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

    return { total, files, modules };
}

function average(values) {
    if (values.length === 0) {
        return 0;
    }
    return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

function groupSuitesByModule(testFiles) {
    const groups = new Map();

    for (const filePath of testFiles) {
        const parsed = parseTestFile(filePath);
        const moduleKey = detectModule(parsed.relPath);
        const bucket = groups.get(moduleKey) ?? {
            key: moduleKey,
            label: MODULE_LABELS[moduleKey] ?? moduleKey,
            files: [],
            testCount: 0,
        };

        bucket.files.push({
            relPath: parsed.relPath,
            tests: parsed.tests,
        });
        bucket.testCount += parsed.tests.length;
        groups.set(moduleKey, bucket);
    }

    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

function extractHttpMethod(title) {
    const match = title.match(/^(GET|POST|PUT|PATCH|DELETE)\s+/i);
    return match ? match[1].toUpperCase() : null;
}

function pctClass(value) {
    if (value >= 85) {
        return 'good';
    }
    if (value >= 70) {
        return 'warn';
    }
    return 'bad';
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatPct(value) {
    return Number.isFinite(value) ? `${value}%` : '—';
}

function renderMetricCard(label, value) {
    return `<div class="metric-card ${pctClass(value)}">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${formatPct(value)}</div>
      <div class="metric-bar"><span style="width:${Math.min(value, 100)}%"></span></div>
    </div>`;
}

function renderHtml({ kind, config, coverage, moduleGroups, generatedAt, testCount }) {
    const total = coverage.total;

    const moduleRows = coverage.modules
        .map(
            (module) => `
      <tr>
        <td>${escapeHtml(module.label)}</td>
        <td class="num ${pctClass(module.lines)}">${formatPct(module.lines)}</td>
        <td class="num ${pctClass(module.branches)}">${formatPct(module.branches)}</td>
        <td class="num ${pctClass(module.functions)}">${formatPct(module.functions)}</td>
        <td class="num ${pctClass(module.statements)}">${formatPct(module.statements)}</td>
        <td class="num">${module.files.length}</td>
      </tr>`,
        )
        .join('');

    const scenarioSections = moduleGroups
        .map((group) => {
            const fileBlocks = group.files
                .map((file) => {
                    const tests = file.tests
                        .map((test) => {
                            const method = extractHttpMethod(test.title);
                            const methodBadge = method
                                ? `<span class="http ${method.toLowerCase()}">${method}</span>`
                                : '';
                            return `<li>${methodBadge}${escapeHtml(test.title)}</li>`;
                        })
                        .join('');
                    return `
          <details class="file-block" open>
            <summary><code>${escapeHtml(file.relPath)}</code> — ${file.tests.length} тест(ов)</summary>
            <ul class="test-list">${tests}</ul>
          </details>`;
                })
                .join('');

            return `
        <section class="module-section">
          <h2>${escapeHtml(group.label)} <span class="badge">${group.testCount}</span></h2>
          ${fileBlocks}
        </section>`;
        })
        .join('');

    const metricsHtml = [
        renderMetricCard('Строки', total.lines.pct),
        renderMetricCard('Ветвления', total.branches.pct),
        renderMetricCard('Функции', total.functions.pct),
        renderMetricCard('Выражения', total.statements.pct),
    ].join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(config.title)} — отчёт</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f1419;
      --panel: #1a2332;
      --panel-2: #243044;
      --text: #e7ecf3;
      --muted: #9aa8bc;
      --accent: #5b9cff;
      --good: #3ecf8e;
      --warn: #f0b429;
      --bad: #ff6b6b;
      --border: rgba(255,255,255,0.08);
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f4f7fb;
        --panel: #ffffff;
        --panel-2: #eef3fa;
        --text: #152033;
        --muted: #5c6b82;
        --border: rgba(21,32,51,0.1);
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: radial-gradient(1200px 600px at 10% -10%, rgba(91,156,255,0.18), transparent),
                  radial-gradient(900px 500px at 90% 0%, rgba(62,207,142,0.12), transparent),
                  var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    header { margin-bottom: 2rem; }
    h1 { margin: 0 0 0.35rem; font-size: 1.85rem; letter-spacing: -0.02em; }
    .subtitle { color: var(--muted); margin: 0; }
    .meta { margin-top: 1rem; color: var(--muted); font-size: 0.92rem; display: flex; gap: 1rem; flex-wrap: wrap; }
    .meta a { color: var(--accent); }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.85rem;
      margin: 1.5rem 0 2rem;
    }
    .metric-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1rem 1.1rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12);
    }
    .metric-label { color: var(--muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.06em; }
    .metric-value { font-size: 1.65rem; font-weight: 700; margin: 0.2rem 0 0.55rem; }
    .metric-bar { height: 6px; background: var(--panel-2); border-radius: 999px; overflow: hidden; }
    .metric-bar span { display: block; height: 100%; border-radius: 999px; background: var(--accent); }
    .metric-card.good .metric-bar span { background: var(--good); }
    .metric-card.warn .metric-bar span { background: var(--warn); }
    .metric-card.bad .metric-bar span { background: var(--bad); }
    .metric-card.good .metric-value { color: var(--good); }
    .metric-card.warn .metric-value { color: var(--warn); }
    .metric-card.bad .metric-value { color: var(--bad); }
    h2 { font-size: 1.15rem; margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.25rem 1.35rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 12px 40px rgba(0,0,0,0.1);
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    th, td { padding: 0.65rem 0.5rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
    td.num.good { color: var(--good); }
    td.num.warn { color: var(--warn); }
    td.num.bad { color: var(--bad); }
    .module-section { margin-bottom: 1.25rem; }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.6rem;
      height: 1.6rem;
      padding: 0 0.45rem;
      border-radius: 999px;
      background: var(--panel-2);
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 600;
    }
    details.file-block {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 0.75rem;
      overflow: hidden;
    }
    details.file-block summary {
      cursor: pointer;
      padding: 0.85rem 1rem;
      font-weight: 600;
      list-style: none;
    }
    details.file-block summary::-webkit-details-marker { display: none; }
    .test-list { margin: 0; padding: 0 1rem 1rem 1.35rem; }
    .test-list li { margin: 0.35rem 0; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; }
    .http {
      display: inline-block;
      min-width: 3.2rem;
      text-align: center;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.12rem 0.35rem;
      border-radius: 6px;
      margin-right: 0.45rem;
      vertical-align: middle;
    }
    .http.get { background: rgba(91,156,255,0.2); color: #8ec0ff; }
    .http.post { background: rgba(62,207,142,0.2); color: #7ce8b5; }
    .http.put, .http.patch { background: rgba(240,180,41,0.2); color: #ffd978; }
    .http.delete { background: rgba(255,107,107,0.2); color: #ff9f9f; }
    .note { color: var(--muted); font-size: 0.92rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${escapeHtml(config.title)}</h1>
      <p class="subtitle">${escapeHtml(config.subtitle)}</p>
      <div class="meta">
        <span>Сгенерировано: ${escapeHtml(generatedAt)}</span>
        <span>Тестов: <strong>${testCount}</strong></span>
        <span>Файлов покрытия: <strong>${coverage.files.length}</strong></span>
        <a href="${kind === 'e2e' ? 'e2e/index.html' : config.istanbulIndex}">Детальный Istanbul HTML →</a>
      </div>
    </header>

    <div class="metrics">${metricsHtml}</div>

    <section class="panel">
      <h2>Покрытие по модулям</h2>
      <table>
        <thead>
          <tr>
            <th>Модуль</th>
            <th>Строки</th>
            <th>Ветвления</th>
            <th>Функции</th>
            <th>Выражения</th>
            <th>Файлов</th>
          </tr>
        </thead>
        <tbody>${moduleRows}</tbody>
      </table>
    </section>

    <section>
      <h2>${kind === 'e2e' ? 'Покрытые сценарии API' : 'Покрытые тест-кейсы'}</h2>
      <p class="note">${
          kind === 'e2e'
              ? 'Каждый пункт — интеграционный сценарий с реальной БД и HTTP-запросами.'
              : 'Каждый пункт — изолированный юнит-тест (моки зависимостей, без поднятия сервера).'
      }</p>
      ${scenarioSections}
    </section>
  </div>
</body>
</html>`;
}

function renderMarkdown({ kind, config, coverage, moduleGroups, generatedAt, testCount }) {
    const total = coverage.total;
    const lines = [
        `# ${config.title}`,
        '',
        config.subtitle,
        '',
        `Сгенерировано: ${generatedAt}`,
        '',
        '## Сводка покрытия кода',
        '',
        '| Метрика | Значение |',
        '| --- | ---: |',
        `| Строки | ${formatPct(total.lines.pct)} |`,
        `| Ветвления | ${formatPct(total.branches.pct)} |`,
        `| Функции | ${formatPct(total.functions.pct)} |`,
        `| Выражения | ${formatPct(total.statements.pct)} |`,
        `| Тестов | ${testCount} |`,
        '',
        '## Покрытие по модулям',
        '',
        '| Модуль | Строки | Ветвления | Функции | Выражения |',
        '| --- | ---: | ---: | ---: | ---: |',
    ];

    for (const module of coverage.modules) {
        lines.push(
            `| ${module.label} | ${formatPct(module.lines)} | ${formatPct(module.branches)} | ${formatPct(module.functions)} | ${formatPct(module.statements)} |`,
        );
    }

    lines.push('', kind === 'e2e' ? '## Сценарии' : '## Тест-кейсы', '');

    for (const group of moduleGroups) {
        lines.push(`### ${group.label} (${group.testCount})`, '');
        for (const file of group.files) {
            lines.push(`**${file.relPath}**`, '');
            for (const test of file.tests) {
                lines.push(`- ${test.title}`);
            }
            lines.push('');
        }
    }

    lines.push('', 'Детальный построчный отчёт Istanbul: `index.html` в этой папке coverage.');

    return lines.join('\n');
}

function renderIndexHtml(reports) {
    const cards = reports
        .map(
            (report) => `
      <a class="card" href="${report.href}">
        <h2>${escapeHtml(report.title)}</h2>
        <p>${escapeHtml(report.description)}</p>
        <div class="stats">
          <span>${report.testCount} тестов</span>
          <span>${formatPct(report.lines)} строк</span>
        </div>
      </a>`,
        )
        .join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Отчёты о тестировании</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, sans-serif;
      background: #0f1419;
      color: #e7ecf3;
    }
    .grid {
      display: grid;
      gap: 1rem;
      width: min(720px, 92vw);
    }
    .card {
      display: block;
      text-decoration: none;
      color: inherit;
      background: #1a2332;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 1.25rem 1.35rem;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .card:hover { transform: translateY(-2px); border-color: #5b9cff; }
    h1 { text-align: center; margin-bottom: 1.5rem; }
    h2 { margin: 0 0 0.35rem; }
    p { margin: 0; color: #9aa8bc; }
    .stats { margin-top: 0.85rem; display: flex; gap: 1rem; color: #5b9cff; font-weight: 600; }
  </style>
</head>
<body>
  <div>
    <h1>Отчёты о тестировании</h1>
    <div class="grid">${cards}</div>
  </div>
</body>
</html>`;
}

function generateReport(kind) {
    const config = CONFIG[kind];
    const testFiles = walkTestFiles(config.testDir, config.testSuffix);
    const summaryPath = path.join(config.coverageDir, config.summaryFile);
    const coverage = readCoverage(summaryPath);
    const moduleGroups = groupSuitesByModule(testFiles);
    const testCount = moduleGroups.reduce((sum, group) => sum + group.testCount, 0);
    const generatedAt = new Date().toISOString();

    const html = renderHtml({
        kind,
        config,
        coverage,
        moduleGroups,
        generatedAt,
        testCount,
    });

    const markdown = renderMarkdown({
        kind,
        config,
        coverage,
        moduleGroups,
        generatedAt,
        testCount,
    });

    fs.mkdirSync(config.coverageDir, { recursive: true });
    const htmlPath =
        kind === 'e2e'
            ? path.join(rootDir, 'coverage', 'test-report-e2e.html')
            : path.join(config.coverageDir, 'test-report.html');
    const mdPath =
        kind === 'e2e'
            ? path.join(rootDir, 'coverage', 'test-report-e2e.md')
            : path.join(config.coverageDir, 'test-report.md');
    fs.writeFileSync(htmlPath, html);
    fs.writeFileSync(mdPath, markdown);

    console.log(`✓ ${kind}: ${htmlPath}`);
    console.log(`✓ ${kind}: ${mdPath}`);

    return {
        kind,
        testCount,
        lines: coverage.total.lines.pct,
        title: config.title,
        description: config.subtitle,
        href: kind === 'unit' ? 'test-report.html' : 'test-report-e2e.html',
    };
}

function generateIndex(reports) {
    const indexPath = path.join(rootDir, 'coverage', 'index-dashboard.html');
    fs.writeFileSync(indexPath, renderIndexHtml(reports));
    console.log(`✓ index: ${indexPath}`);
}

const mode = process.argv[2] ?? 'all';
const generated = [];

if (mode === 'unit' || mode === 'all') {
    generated.push(generateReport('unit'));
}
if (mode === 'e2e' || mode === 'all') {
    generated.push(generateReport('e2e'));
}
if (mode === 'all' && generated.length === 2) {
    generateIndex(generated);
}

if (generated.length === 0) {
    console.error('Использование: node scripts/generate-test-report.mjs [unit|e2e|all]');
    process.exit(1);
}
