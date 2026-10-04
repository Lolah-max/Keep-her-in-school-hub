(function () {
  "use strict";
  var KEY = "keepHerInSchool";
  var D = {
    pads: { girls: 50, per: 12, lead: 14, safe: 7, psize: 10, pcost: 600, stock: 0, out: 0 },
    club: { name: "", weekly: 500, goal: 50000, girls: [] },
    health: { last: "", len: 28 }
  };
  var S = JSON.parse(JSON.stringify(D));
  try {
    var raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) { for (var k in S) { Object.assign(S[k], raw[k] || {}); } }
  } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var num = function (v) { return Math.max(0, parseFloat(v) || 0); };
  var fmt = function (n) { return Math.round(n).toLocaleString("en-NG"); };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- Tabs ---------- */
  document.querySelectorAll("nav button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (t) { t.hidden = t.id !== b.dataset.tab; });
      document.querySelectorAll("nav button").forEach(function (x) { x.classList.toggle("on", x === b); });
      window.scrollTo(0, 0);
    });
  });

  /* ---------- Bind simple inputs to state ---------- */
  function bind(section, ids, after) {
    ids.forEach(function (id) {
      var el = $(id.el), key = id.key;
      el.value = S[section][key];
      el.addEventListener("input", function () {
        S[section][key] = el.type === "number" ? num(el.value) : el.value;
        save(); after();
      });
    });
  }
  var pairs = function (list) { return list.map(function (x) { return { el: x, key: x }; }); };

  /* ---------- Pads (reorder-point logic) ---------- */
  function padCalc() {
    var p = S.pads, daily = p.girls * p.per / 30;
    var need = Math.ceil(daily * 30 * 3);              // buy for 3 months
    var qty = Math.max(0, need - p.stock);
    var packs = Math.ceil(qty / Math.max(1, p.psize));
    return {
      daily: daily,
      days: daily > 0 ? p.stock / daily : 0,
      rop: Math.ceil(daily * (p.lead + p.safe)),     // reorder point
      packs: packs, qty: packs * Math.max(1, p.psize), cost: packs * p.pcost
    };
  }
  function renderPads() {
    var p = S.pads, c = padCalc(), color, msg;
    if (p.stock <= 0 && p.out === 0) { color = "var(--mute)"; msg = "Add your first stock to begin."; }
    else if (p.stock <= c.daily * p.lead) { color = "var(--bad)"; msg = "Danger: pads may finish before new ones arrive. Order today."; }
    else if (p.stock <= c.rop) { color = "var(--warn)"; msg = "Time to order. Place your order now."; }
    else { color = "var(--ok)"; msg = "Stock is fine for now."; }
    $("hero").style.setProperty("--st", color);
    $("days").textContent = fmt(c.days);
    $("msg").textContent = msg;
    var max = Math.max(c.rop * 2, p.stock, 1);
    $("fill").style.width = Math.min(100, p.stock / max * 100) + "%";
    $("mark").style.left = "calc(" + (c.rop / max * 100) + "% - 1px)";
    $("mark").style.display = c.rop > 0 ? "block" : "none";
    $("mlabel").textContent = "Order line: " + fmt(c.rop) + " pads";
    $("stock").textContent = fmt(p.stock);
    $("out").textContent = fmt(p.out);
    $("rop").textContent = fmt(c.rop);
    $("qty").textContent = fmt(c.qty);
    $("packs").textContent = fmt(c.packs);
    $("cost").textContent = "Estimated cost: ₦" + fmt(c.cost);
  }
  bind("pads", pairs(["girls", "per", "lead", "safe", "psize", "pcost"]), renderPads);
  $("giveBtn").onclick = function () {
    var n = Math.min(num($("give").value), S.pads.stock);
    if (!n) return;
    S.pads.stock -= n; S.pads.out += n; $("give").value = ""; save(); renderPads();
  };
  $("addBtn").onclick = function () {
    var n = num($("add").value);
    if (!n) return;
    S.pads.stock += n; $("add").value = ""; save(); renderPads();
  };
  $("copy").onclick = function () {
    var c = padCalc(), b = $("copy"), txt =
      "Pad stock update\nPads in stock: " + fmt(S.pads.stock) + " (about " + fmt(c.days) + " days)\n" +
      "Please order: " + fmt(c.qty) + " pads (" + fmt(c.packs) + " packs), about N" + fmt(c.cost) + "\n" +
      "This keeps girls in school.";
    function done(m) { b.textContent = m; setTimeout(function () { b.textContent = "Copy message for head teacher"; }, 2200); }
    try { navigator.clipboard.writeText(txt).then(function () { done("Copied"); }, function () { done("Could not copy"); }); }
    catch (e) { done("Could not copy"); }
  };

  /* ---------- Savings club ---------- */
  function renderClub() {
    var c = S.club, total = c.girls.reduce(function (a, g) { return a + g.s; }, 0);
    $("cfill").style.width = (c.goal > 0 ? Math.min(100, total / c.goal * 100) : 0) + "%";
    var weekly = c.weekly * c.girls.length, left = Math.max(0, c.goal - total);
    $("csum").textContent = "Saved ₦" + fmt(total) + " of ₦" + fmt(c.goal) +
      (weekly > 0 && left > 0 ? ". About " + Math.ceil(left / weekly) + " weeks to go if everyone pays each week." : left === 0 && c.goal > 0 ? ". Goal reached!" : ".");
    var ul = $("members"); ul.innerHTML = "";
    c.girls.forEach(function (g, i) {
      var li = document.createElement("li"), name = document.createElement("span"), box = document.createElement("span");
      name.textContent = g.n + ": ₦" + fmt(g.s);
      var pay = document.createElement("button"); pay.textContent = "Paid ₦" + fmt(c.weekly);
      pay.onclick = function () { g.s += c.weekly; save(); renderClub(); };
      var undo = document.createElement("button"); undo.className = "alt"; undo.textContent = "Undo";
      undo.onclick = function () { g.s = Math.max(0, g.s - c.weekly); save(); renderClub(); };
      box.appendChild(pay); box.appendChild(document.createTextNode(" ")); box.appendChild(undo);
      li.appendChild(name); li.appendChild(box); ul.appendChild(li);
    });
    $("cempty").hidden = c.girls.length > 0;
  }
  bind("club", [{ el: "cname", key: "name" }, { el: "weekly", key: "weekly" }, { el: "goal", key: "goal" }], renderClub);
  $("addGirl").onclick = function () {
    var n = $("newgirl").value.trim();
    if (!n) return;
    S.club.girls.push({ n: n.slice(0, 30), s: 0 }); $("newgirl").value = ""; save(); renderClub();
  };

  /* ---------- Health ---------- */
  function renderHealth() {
    var h = S.health, out = $("next");
    if (!h.last) { out.textContent = "Enter a date to see your next expected period."; return; }
    var d = new Date(h.last + "T00:00:00");
    d.setDate(d.getDate() + Math.max(20, Math.min(45, h.len || 28)));
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var diff = Math.round((d - today) / 86400000);
    var when = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    out.textContent = "Next period expected around " + when + (diff > 0 ? " (in " + diff + " days)." : diff === 0 ? " (today)." : ". It may have started already.");
  }
  bind("health", pairs(["last", "len"]), renderHealth);

  renderPads(); renderClub(); renderHealth();
})();
