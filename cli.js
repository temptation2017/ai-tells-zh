#!/usr/bin/env node
// 用法：node cli.js 文件.md   或   cat 文件 | node cli.js   加 --json 输出 JSON
const fs = require('fs');
const AITells = require('./tells.js');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const files = args.filter(a => !a.startsWith('--'));

if (args.includes('-h') || args.includes('--help')) {
  console.log('用法: node cli.js [文件...] [--json] [--max 分数]\n不给文件时从标准输入读。--max 超过该分数时退出码为 1，可放进 CI。');
  process.exit(0);
}
const maxIdx = args.indexOf('--max');
const max = maxIdx >= 0 ? Number(args[maxIdx + 1]) : null;
const realFiles = files.filter((f, i) => !(maxIdx >= 0 && args.indexOf(f) === maxIdx + 1));

function report(name, text) {
  const r = AITells.analyze(text);
  if (asJson) return { name, ...r };
  console.log(`\n${name}  约 ${r.size} 字  得分 ${r.score}  AI 腔：${r.level}`);
  if (!r.findings.length) console.log('  没发现常见套话。');
  for (const f of r.findings) {
    console.log(`  [${f.name}] ×${f.count}  ${f.hint}`);
    for (const h of f.hits.slice(0, 3)) console.log(`     第 ${h.line} 行：${h.context}`);
  }
  return { name, ...r };
}

function run(inputs) {
  const out = inputs.map(([n, t]) => report(n, t));
  if (asJson) console.log(JSON.stringify(out, null, 2));
  if (max !== null && out.some(r => r.score > max)) process.exit(1);
}

if (realFiles.length) {
  run(realFiles.map(f => [f, fs.readFileSync(f, 'utf8')]));
} else {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => (buf += d));
  process.stdin.on('end', () => run([['stdin', buf]]));
}
