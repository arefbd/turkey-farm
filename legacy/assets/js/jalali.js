/* ==========================================================================
   jalali.js — تبدیل و کار با تاریخ شمسی (بدون وابستگی خارجی)
   ========================================================================== */
(function (global) {
  'use strict';

  var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635,
    2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy, withoutLeap) {
    var bl = breaks.length,
      gy = jy + 621,
      leapJ = -14,
      jp = breaks[0],
      jm, jump = 0, leap, leapG, march, n, i;

    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;

    if (!withoutLeap) {
      if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
      leap = mod(mod(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
    }
    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
      div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false),
      jdn1f = g2d(gy, 3, r.march), jd, jm, k;

    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  var SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  var AR = '٠١٢٣٤٥٦٧٨٩';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function toFa(s) {
    return String(s).replace(/\d/g, function (d) { return FA[+d]; });
  }
  function toEn(s) {
    return String(s)
      .replace(/[۰-۹]/g, function (d) { return String(FA.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String(AR.indexOf(d)); });
  }

  var J = {
    faDigits: true,
    MONTHS: MONTHS,
    WEEKDAYS: WEEKDAYS,
    SEASONS: SEASONS,
    toFa: toFa,
    toEn: toEn,
    pad: pad,

    /* 'YYYY/MM/DD' از یک آبجکت Date میلادی */
    fromDate: function (d) {
      var j = d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
      return pad(j.jy) + '/' + pad(j.jm) + '/' + pad(j.jd);
    },

    today: function () { return J.fromDate(new Date()); },

    parse: function (s) {
      if (!s) return null;
      var clean = toEn(String(s)).replace(/[^\d]/g, '-').replace(/-+/g, '-');
      var p = clean.split('-').filter(Boolean);
      if (p.length < 3) return null;
      var jy = +p[0], jm = +p[1], jd = +p[2];
      if (jy < 100) jy += 1400;
      if (!jy || !jm || !jd || jm > 12 || jd > 31) return null;
      return { jy: jy, jm: jm, jd: jd };
    },

    valid: function (s) { return !!J.parse(s); },

    norm: function (s) {
      var p = J.parse(s);
      return p ? pad(p.jy) + '/' + pad(p.jm) + '/' + pad(p.jd) : '';
    },

    jdn: function (s) {
      var p = J.parse(s);
      return p ? j2d(p.jy, p.jm, p.jd) : 0;
    },

    str: function (jdn) {
      var r = d2j(jdn);
      return pad(r.jy) + '/' + pad(r.jm) + '/' + pad(r.jd);
    },

    addDays: function (s, n) {
      var base = J.jdn(s) || J.jdn(J.today());
      return J.str(base + n);
    },

    diff: function (a, b) {
      var x = J.jdn(a), y = J.jdn(b);
      if (!x || !y) return 0;
      return y - x;
    },

    toDate: function (s) {
      var p = J.parse(s);
      if (!p) return new Date();
      var g = d2g(j2d(p.jy, p.jm, p.jd));
      return new Date(g.gy, g.gm - 1, g.gd);
    },

    weekday: function (s) {
      var d = J.toDate(s);
      return WEEKDAYS[d.getDay()];
    },

    monthName: function (m) { return MONTHS[(m - 1 + 12) % 12]; },

    season: function (m) { return SEASONS[Math.floor(((m - 1) % 12) / 3)]; },

    /* short: ۱۴۰۵/۰۸/۰۲ | long: ۲ آبان ۱۴۰۵ | full: شنبه ۲ آبان ۱۴۰۵ */
    format: function (s, style) {
      var p = J.parse(s);
      if (!p) return '—';
      var out;
      if (style === 'long') out = p.jd + ' ' + MONTHS[p.jm - 1] + ' ' + p.jy;
      else if (style === 'full') out = WEEKDAYS[J.toDate(s).getDay()] + ' ' + p.jd + ' ' + MONTHS[p.jm - 1] + ' ' + p.jy;
      else if (style === 'month') out = MONTHS[p.jm - 1] + ' ' + p.jy;
      else out = pad(p.jy) + '/' + pad(p.jm) + '/' + pad(p.jd);
      return J.faDigits ? toFa(out) : out;
    },

    /* فاصله زمانی خوانا */
    ago: function (s) {
      var d = J.diff(s, J.today());
      if (d === 0) return 'امروز';
      if (d === 1) return 'دیروز';
      if (d === -1) return 'فردا';
      if (d > 1) return toFa(d) + ' روز پیش';
      return 'تا ' + toFa(Math.abs(d)) + ' روز دیگر';
    },

    now: function () {
      var d = new Date();
      return toFa(pad(d.getHours()) + ':' + pad(d.getMinutes()));
    },

    /* سری ماه‌های اخیر: [{key:'1405/08', label:'آبان', year:1405}] */
    lastMonths: function (n) {
      var t = J.parse(J.today()), out = [], y = t.jy, m = t.jm;
      for (var i = n - 1; i >= 0; i--) {
        var mm = m - i, yy = y;
        while (mm <= 0) { mm += 12; yy -= 1; }
        out.push({ key: pad(yy) + '/' + pad(mm), label: MONTHS[mm - 1], year: yy });
      }
      return out;
    },

    daysInMonth: function (jy, jm) {
      if (jm <= 6) return 31;
      if (jm <= 11) return 30;
      return jalCal(jy, false).leap === 0 ? 30 : 29;
    }
  };

  global.J = J;
})(window);
