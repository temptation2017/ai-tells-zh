// ai-tells-zh core: 规则 + 打分。浏览器、书签小工具和 Node 共用同一份。
// 整个工厂函数会被 toString() 拼进书签，所以内部不要引用外部变量。
function AITellsFactory() {
  'use strict';

  // kind: 'phrase' 逐个命中计数；'density' 按每千字频次判断
  var RULES = [
    { id: 'opening', name: '宏大开场', weight: 3,
      re: /在当今[^，。\n]{0,12}(时代|社会|世界)|随着[^，。\n]{1,16}的(快速|飞速|迅猛|不断|日益)?(发展|普及|进步)|在这个[^，。\n]{0,10}的时代/g,
      hint: '直接从具体问题或结论说起，删掉时代背景。' },
    { id: 'summary', name: '总结腔', weight: 2,
      re: /总而言之|总的来说|综上所述|归根结底|总之[，,]|一言以蔽之/g,
      hint: '短文不需要“综上”。最后一句写结论本身即可。' },
    { id: 'filler', name: '强调填充词', weight: 2,
      re: /值得注意的是|需要指出的是|值得一提的是|不可否认|毋庸置疑|显而易见|众所周知|不言而喻/g,
      hint: '如果真重要，直接写那件事，不用先预告它重要。' },
    { id: 'buzz', name: '大词/黑话', weight: 1,
      re: /赋能|抓手|闭环|底层逻辑|颗粒度|全方位|多维度|深度融合|无缝衔接|革命性|里程碑式|画卷|交响|织就|焕发|助力|打造[^，。\n]{0,6}生态|新范式/g,
      hint: '换成具体动作或数字：做了什么、改善多少。' },
    { id: 'explore', name: '“深入探讨”', weight: 2,
      re: /深入探讨|深入了解|深入剖析|深入研究|让我们一起|一起来看看|揭开[^，。\n]{0,6}(面纱|奥秘)|探索[^，。\n]{0,4}奥秘/g,
      hint: '读者不需要被邀请，直接给内容。' },
    { id: 'notbut', name: '“不是……而是……”', weight: 2,
      re: /不是[^。！？\n]{1,24}[，,]\s*而是|不仅仅?是?[^。！？\n]{1,24}[，,]\s*(更是|还是|也是|更)/g,
      hint: '偶尔用没问题；连续出现就是模板句，改成直接陈述。' },
    { id: 'service', name: '客服式结尾', weight: 3,
      re: /希望(这|以上|本文|这些)?[^。\n]{0,8}(对你|对您|能)(有所)?帮助|如果你?(还)?有(其他|任何)?(问题|疑问)|欢迎随时(提问|交流|联系)|祝你?[^。\n]{0,6}(顺利|愉快|成功)[！!。]/g,
      hint: '删掉。正文结束就结束。' },
    { id: 'selfai', name: 'AI 自称', weight: 5,
      re: /作为(一个|一名)?(AI|人工智能|语言模型|大模型)|我(无法|不能)(访问|浏览)(互联网|网页|实时)/gi,
      hint: '这是生成痕迹，发布前必须删。' },
    { id: 'flatter', name: '捧场开场', weight: 3,
      re: /(这是一个)?(非常|很)?(好|棒|有趣|关键)的问题[！!。，]|好问题[！!。，]|你说得(太|非常)?对[！!。，]|感谢你的提问/g,
      hint: '直接回答。' },
    { id: 'sequence', name: '首先/其次/最后', weight: 2, kind: 'sequence',
      hint: '三段式路标会让文章像模板。能用段落自然衔接就不用序号词。' },
    { id: 'emdash', name: '破折号密度', weight: 1, kind: 'density',
      re: /——|—/g, per1k: 3,
      hint: '中文破折号偶尔用。密集出现时多半能换成逗号或句号。' },
    { id: 'emoji', name: '表情符号列表', weight: 2, kind: 'density',
      re: /^[ \t]*[-*]?[ \t]*(?:[\u2705\u2728\u26A1\u2B50\u274C\u2714]|\uD83D[\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83E[\uDD00-\uDFFF])/gm, perAbs: 3,
      hint: '每条前面一个表情符号是典型生成排版，正式文档里去掉。' },
    { id: 'bold', name: '加粗过多', weight: 1, kind: 'density',
      re: /\*\*[^*\n]{1,40}\*\*/g, per1k: 6,
      hint: '加粗只留给真正不能漏看的一两处。' },
    { id: 'en', name: '英文常见 AI 词', weight: 2,
      re: /\b(delve|delving|tapestry|testament to|in today's (?:fast-paced|digital)|it(?:'|’)s worth noting|navigat(?:e|ing) the complexit(?:y|ies)|unlock(?:ing)? the (?:power|potential)|seamless(?:ly)?|game[- ]changer|I hope this helps|great question|as an AI)\b/gi,
      hint: 'Use a plain, specific word instead.' }
  ];

  function lineCol(text, idx) {
    var before = text.slice(0, idx);
    var line = before.split('\n').length;
    return line;
  }

  function snippet(text, start, end) {
    var a = Math.max(0, start - 12), b = Math.min(text.length, end + 12);
    return (a > 0 ? '…' : '') + text.slice(a, b).replace(/\s+/g, ' ') + (b < text.length ? '…' : '');
  }

  function countChars(text) {
    // 中文按字，英文按词近似
    var cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    var words = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
    return cjk + words;
  }

  function analyze(text) {
    text = String(text || '');
    var size = countChars(text);
    var k = Math.max(size, 1) / 1000;
    var results = [];
    var raw = 0;

    RULES.forEach(function (r) {
      var hits = [];
      if (r.kind === 'sequence') {
        var m1 = text.search(/首先/);
        if (m1 >= 0) {
          var rest = text.slice(m1);
          if (/其次|然后|第二/.test(rest) && /最后|此外|最终|第三/.test(rest)) {
            hits.push({ index: m1, match: '首先…其次…最后', line: lineCol(text, m1), context: snippet(text, m1, m1 + 2) });
          }
        }
      } else {
        r.re.lastIndex = 0;
        var m;
        while ((m = r.re.exec(text)) !== null) {
          if (m[0] === '') { r.re.lastIndex++; continue; }
          hits.push({ index: m.index, match: m[0], line: lineCol(text, m.index), context: snippet(text, m.index, m.index + m[0].length) });
        }
      }
      var flagged = hits.length > 0;
      if (r.kind === 'density') {
        flagged = r.perAbs ? hits.length >= r.perAbs : (hits.length / k) > r.per1k && hits.length >= 2;
      }
      if (flagged) {
        var pts = r.kind === 'density' ? r.weight * 2 : r.weight * Math.min(hits.length, 5);
        raw += pts;
        results.push({ id: r.id, name: r.name, count: hits.length, points: pts, hint: r.hint, hits: hits });
      }
    });

    // 每千字得分，短文本按 300 字起算，避免一句话就满分
    var score = Math.round(raw / Math.max(k, 0.3));
    var level = score >= 30 ? '高' : score >= 12 ? '中' : '低';
    results.sort(function (a, b) { return b.points - a.points; });
    return { size: size, raw: raw, score: score, level: level, findings: results };
  }

  return { analyze: analyze, rules: RULES, version: '0.1.0' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AITellsFactory();
  module.exports.AITellsFactory = AITellsFactory;
}
