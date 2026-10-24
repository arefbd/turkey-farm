/* ==========================================================================
   charts.js — نمودارهای SVG سبک (بدون کتابخانه خارجی)
   ========================================================================== */
(function (A) {
  'use strict';
  var C = A.Charts = {};
  var UI = A.UI;

  function niceMax(v) {
    if (v <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var f = v / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  /* -------------------------- نمودار ستونی گروهی ---------------------------- */
  C.bars = function (opts) {
    var W = 600, H = opts.height || 220;
    var padL = 46, padR = 10, padT = 16, padB = 28;
    var labels = opts.labels || [];
    var series = opts.series || [];
    var max = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { max = Math.max(max, v); }); });
    max = niceMax(max || 1);

    var plotW = W - padL - padR, plotH = H - padT - padB;
    var gw = labels.length ? plotW / labels.length : plotW;
    var bw = Math.max(5, Math.min(opts.barWidth || 14, (gw * 0.62) / Math.max(1, series.length)));
    var gap = 3;
    var out = ['<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img">'];

    for (var i = 0; i <= 3; i++) {
      var y = padT + plotH * i / 3;
      out.push('<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="var(--line)" stroke-width="1" stroke-dasharray="' + (i === 3 ? '0' : '4 5') + '"/>');
      out.push('<text x="' + (padL - 6) + '" y="' + (y - 5) + '" font-size="9" fill="var(--muted)" text-anchor="end">' + UI.short(max - max * i / 3) + '</text>');
    }

    labels.forEach(function (lb, li) {
      var cx = padL + gw * li + gw / 2;
      var totalW = series.length * bw + (series.length - 1) * gap;
      series.forEach(function (s, si) {
        var v = s.values[li] || 0;
        var h = plotH * (v / max);
        var x = cx - totalW / 2 + si * (bw + gap);
        var y2 = padT + plotH - h;
        out.push('<rect x="' + x.toFixed(1) + '" y="' + y2.toFixed(1) + '" width="' + bw + '" height="' + Math.max(1, h).toFixed(1) +
          '" rx="' + Math.min(6, bw / 2) + '" fill="' + s.color + '" opacity="' + (s.opacity || 0.95) + '"></rect>');
      });
      out.push('<text x="' + cx + '" y="' + (H - 8) + '" font-size="10.5" fill="var(--muted)" text-anchor="middle">' + lb + '</text>');
    });

    out.push('</svg>');
    return '<div class="chart-wrap">' + out.join('') + '</div>';
  };

  /* ------------------------------ نمودار خطی ------------------------------- */
  C.line = function (opts) {
    var W = 600, H = opts.height || 200;
    var padL = 12, padR = 12, padT = 16, padB = 26;
    var values = opts.values || [];
    var labels = opts.labels || [];
    if (!values.length) return '<div class="chart-empty">داده‌ای برای نمایش نیست</div>';
    var max = niceMax(Math.max.apply(null, values) || 1);
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var step = values.length > 1 ? plotW / (values.length - 1) : 0;
    var pts = values.map(function (v, i) {
      return [padL + step * i, padT + plotH - plotH * (v / max)];
    });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (padT + plotH) + ' L' + pts[0][0].toFixed(1) + ' ' + (padT + plotH) + ' Z';
    var color = opts.color || '#7C3AED';
    var gid = 'g' + Math.random().toString(36).slice(2, 7);

    var out = ['<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">',
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.28"/>',
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>'];

    for (var i = 0; i <= 3; i++) {
      var y = padT + plotH * i / 3;
      out.push('<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="var(--line)" stroke-dasharray="' + (i === 3 ? '0' : '4 5') + '"/>');
    }
    out.push('<path d="' + area + '" fill="url(#' + gid + ')"/>');
    out.push('<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>');
    pts.forEach(function (p, i) {
      if (opts.dots === false) return;
      out.push('<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="#fff" stroke="' + color + '" stroke-width="2"/>');
    });
    labels.forEach(function (lb, i) {
      if (labels.length > 8 && i % 2) return;
      out.push('<text x="' + pts[i][0].toFixed(1) + '" y="' + (H - 7) + '" font-size="10" fill="var(--muted)" text-anchor="middle">' + lb + '</text>');
    });
    out.push('</svg>');
    return '<div class="chart-wrap">' + out.join('') + '</div>';
  };

  /* ------------------------------ دونات سهم ------------------------------- */
  C.donut = function (opts) {
    var size = opts.size || 168, r = size / 2 - 12, cx = size / 2, cy = size / 2;
    var items = (opts.items || []).filter(function (i) { return i.value > 0; });
    var total = items.reduce(function (a, b) { return a + b.value; }, 0) || 1;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var out = ['<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '">'];
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="14"/>');
    items.forEach(function (it) {
      var frac = it.value / total;
      var len = circ * frac;
      out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + it.color +
        '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + Math.max(0, len - 3).toFixed(2) + ' ' + (circ - Math.max(0, len - 3)).toFixed(2) +
        '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>');
      offset += len;
    });
    out.push('<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + (opts.centerLabel || 'جمع') + '</text>');
    out.push('<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="15" font-weight="700" fill="var(--ink)">' + (opts.centerValue || '') + '</text>');
    out.push('</svg>');
    return out.join('');
  };

  /* --------------------------- نوار پیشرفت حلقه‌ای -------------------------- */
  C.ring = function (pct, color, size) {
    size = size || 64;
    var r = size / 2 - 6, c = 2 * Math.PI * r;
    var v = Math.max(0, Math.min(100, pct));
    return '<svg class="ring" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="6"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (color || '#7C3AED') +
      '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + (c * v / 100).toFixed(1) + ' ' + c.toFixed(1) +
      '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '<text x="' + size / 2 + '" y="' + (size / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">' +
      UI.n(v, 0) + '٪</text></svg>';
  };

  /* ------------------------------ اسپارک‌لاین ------------------------------ */
  C.spark = function (values, color) {
    if (!values || values.length < 2) return '';
    var max = Math.max.apply(null, values) || 1, min = Math.min.apply(null, values);
    var W = 90, H = 26;
    var pts = values.map(function (v, i) {
      var x = W * i / (values.length - 1);
      var y = H - 3 - (H - 6) * ((v - min) / (max - min || 1));
      return x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' L');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="spark">' +
      '<path d="M' + pts + '" fill="none" stroke="' + (color || '#7C3AED') + '" stroke-width="2" stroke-linecap="round"/></svg>';
  };

})(window.App = window.App || {});
