// Turns OCR text from a time-clock screenshot into shifts.
// Works in the browser (window.parseTimesheet) and in Node (module.exports).
(function (root) {
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
  const DAY_RE = new RegExp("\\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*[,.]?\\s+" + MON + "\\s+(\\d{1,2})\\b", "i");
  const PERIOD_RE = new RegExp(MON + "\\s+\\d{1,2}\\s*[-–—~]\\s*" + MON + "\\s+\\d{1,2},?\\s+(20\\d\\d)", "i");
  const T = "(\\d{1,2})[:.;](\\d{2})\\s*([AP])\\.?\\s*M?";
  const RANGE_RE = new RegExp(T + "\\s*[-–—~=]+\\s*(?:" + T + "|(running))", "i");
  const CLOCK_RE = /^\D{0,3}(\d{1,2}):(\d{2}):(\d{2})\D{0,3}$/;

  const to24 = (h, m, ap) => {
    h = Number(h) % 12;
    if (/p/i.test(ap)) h += 12;
    return String(h).padStart(2, "0") + ":" + m;
  };
  const pad = n => String(n).padStart(2, "0");

  function parseTimesheet(text, today) {
    today = today || new Date();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let year = null, runningElapsed = null;
    for (const l of lines) {
      const p = l.match(PERIOD_RE);
      if (p && !year) year = Number(p[3]);
      const c = l.match(CLOCK_RE);
      if (c && runningElapsed == null) runningElapsed = Number(c[1]) * 60 + Number(c[2]);
    }
    const thisYear = today.getFullYear();
    const shifts = [];
    let current = null;
    for (const l of lines) {
      const d = l.match(DAY_RE);
      if (d) {
        const mon = MONTHS[d[2].slice(0, 3).toLowerCase()];
        let y = year || thisYear;
        // No year on screen: a December date seen in January belongs to last year.
        if (!year && mon - (today.getMonth() + 1) > 6) y -= 1;
        current = y + "-" + pad(mon) + "-" + pad(Number(d[3]));
      }
      const r = l.match(RANGE_RE);
      if (r && current) {
        const start = to24(r[1], r[2], r[3]);
        const end = r[7] ? null : to24(r[4], r[5], r[6]);
        shifts.push({ date: current, start, end });
      }
    }
    return { shifts, runningElapsedMinutes: runningElapsed, year };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { parseTimesheet };
  else root.parseTimesheet = parseTimesheet;
})(this);
