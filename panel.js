// 书签小工具的浮层。只依赖传入的 AITells，便于被 toString() 拼进书签。
function aiTellsPanel(AITells) {
  var ID = 'ai-tells-zh-panel';
  var old = document.getElementById(ID);
  if (old) { old.remove(); return; }

  var text = String(window.getSelection ? window.getSelection() : '');
  var source = '选中文字';
  if (!text.trim()) {
    var el = document.activeElement;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) { text = el.value; source = '输入框'; }
    else if (el && el.isContentEditable) { text = el.innerText; source = '编辑区'; }
  }
  if (!text.trim()) { text = document.body.innerText; source = '整个页面'; }

  var r = AITells.analyze(text);
  var color = r.level === '高' ? '#c0392b' : r.level === '中' ? '#d68910' : '#1e8449';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var box = document.createElement('div');
  box.id = ID;
  box.setAttribute('style', 'position:fixed;top:16px;right:16px;z-index:2147483647;width:340px;max-height:70vh;overflow:auto;' +
    'background:#fffdf8;color:#222;border:1px solid #ddd;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.18);' +
    'font:13px/1.55 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:12px 14px;text-align:left');
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<b>AI 腔检测</b><span data-x style="cursor:pointer;color:#888;font-size:16px">×</span></div>' +
    '<div style="margin-bottom:8px">范围：' + source + '（约 ' + r.size + ' 字）<br>得分 <b style="color:' + color + ';font-size:18px">' + r.score +
    '</b>，AI 腔 <b style="color:' + color + '">' + r.level + '</b></div>';
  if (!r.findings.length) html += '<div style="color:#1e8449">没发现常见套话。</div>';
  r.findings.forEach(function (f) {
    html += '<div style="border-top:1px solid #eee;padding:6px 0"><b>' + esc(f.name) + '</b> × ' + f.count +
      '<div style="color:#666">' + esc(f.hint) + '</div>';
    f.hits.slice(0, 3).forEach(function (h) {
      html += '<div style="background:#f6f2e8;border-radius:4px;padding:2px 6px;margin-top:3px;font-size:12px">' + esc(h.context) + '</div>';
    });
    html += '</div>';
  });
  box.innerHTML = html;
  box.querySelector('[data-x]').onclick = function () { box.remove(); };
  document.body.appendChild(box);
}
if (typeof module !== 'undefined' && module.exports) module.exports = aiTellsPanel;
