// 零依赖自测：node test/run.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const A = require('../tells.js');
const panel = require('../panel.js');

const ai = A.analyze(fs.readFileSync(path.join(__dirname, '../examples/ai-style.md'), 'utf8'));
const plain = A.analyze(fs.readFileSync(path.join(__dirname, '../examples/plain.md'), 'utf8'));
const ids = ai.findings.map(f => f.id);

assert.strictEqual(ai.level, '高', 'AI 样例应为高，实际 ' + ai.score);
for (const id of ['opening', 'summary', 'filler', 'buzz', 'notbut', 'service', 'flatter', 'sequence', 'emoji']) {
  assert.ok(ids.includes(id), '应命中规则 ' + id);
}
assert.strictEqual(plain.level, '低', '人写样例应为低，实际 ' + plain.score + ' ' + JSON.stringify(plain.findings.map(f => f.id)));
assert.strictEqual(A.analyze('').score, 0);
assert.ok(A.analyze('As an AI, I hope this helps. Let us delve into the tapestry.').findings.some(f => f.id === 'en'));
assert.ok(A.analyze('作为一个AI语言模型，我无法访问互联网。').findings.some(f => f.id === 'selfai'));
// 单个破折号不报
assert.ok(!A.analyze('他说——算了。今天就这样吧，明天再说。').findings.some(f => f.id === 'emdash'));

// 书签源码必须能独立求值（工厂和浮层都不能引用外部变量）
const src = '(function(){var A=(' + A.AITellsFactory.toString() + ')();return typeof (' + panel.toString() + ');})()';
assert.strictEqual(eval(src), 'function');

console.log('ok  AI 样例', ai.score, ai.level, '| 人写样例', plain.score, plain.level);
