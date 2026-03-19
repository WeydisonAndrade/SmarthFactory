var graficoThroughputChart = null;

var LOTES_STORAGE_KEY = "registrosLotes";
var LOTES_MIGR_FLAG = "ecoLotesMigrado";

document.addEventListener("DOMContentLoaded", function () {
  migrarLotesDoHistoricoOee();

  document.getElementById("btnRegistrarLote").addEventListener("click", registrarLote);
  document.getElementById("btnLimparLotes").addEventListener("click", limparHistoricoLotes);

  atualizarPainelLotes();
});

function migrarLotesDoHistoricoOee() {
  if (localStorage.getItem(LOTES_MIGR_FLAG) === "1") return;
  var lotes = [];
  try {
    var rawL = localStorage.getItem(LOTES_STORAGE_KEY);
    if (rawL) lotes = JSON.parse(rawL);
    if (!Array.isArray(lotes)) lotes = [];
  } catch (e) {
    lotes = [];
  }
  var existentes = new Set();
  lotes.forEach(function (l) {
    if (l.dataISO) existentes.add(l.dataISO + "|" + l.producao + "|" + l.duracaoLoteMin);
  });

  try {
    var rawE = localStorage.getItem("registrosEco");
    var eco = rawE ? JSON.parse(rawE) : [];
    if (!Array.isArray(eco)) eco = [];
    eco.forEach(function (r) {
      if (typeof r.duracaoLoteMin !== "number" || r.duracaoLoteMin <= 0) return;
      var k = (r.dataISO || "") + "|" + r.producao + "|" + r.duracaoLoteMin;
      if (existentes.has(k)) return;
      lotes.push({
        producao: Number(r.producao) || 0,
        duracaoLoteMin: r.duracaoLoteMin,
        desperdicio: typeof r.desperdicio === "number" ? r.desperdicio : 0,
        data: r.data || new Date().toLocaleString("pt-BR"),
        dataISO: r.dataISO || new Date().toISOString()
      });
      existentes.add(k);
    });
  } catch (e2) {
    /* ignore */
  }

  localStorage.setItem(LOTES_STORAGE_KEY, JSON.stringify(lotes));
  localStorage.setItem(LOTES_MIGR_FLAG, "1");
}

function lerLotes() {
  try {
    var raw = localStorage.getItem(LOTES_STORAGE_KEY);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function lerMetaConfig() {
  try {
    var raw = localStorage.getItem("ecoMetaConfig");
    if (!raw) return null;
    var o = JSON.parse(raw);
    if (!o || typeof o.metaDiaria !== "number" || o.metaDiaria <= 0) return null;
    if (typeof o.horasTotais !== "number" || o.horasTotais <= 0) return null;
    return o;
  } catch {
    return null;
  }
}

function pecasPorHoraLote(r) {
  var h = r.duracaoLoteMin / 60;
  if (h <= 0) return 0;
  return r.producao / h;
}

function deltaVsMetaPct(r, idealPh) {
  if (!idealPh || idealPh <= 0) return null;
  var real = pecasPorHoraLote(r);
  return ((real - idealPh) / idealPh) * 100;
}

function dataLocalYMD(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function somaProducaoLotesHoje(lotes) {
  var hoje = dataLocalYMD(new Date());
  var sum = 0;
  lotes.forEach(function (r) {
    if (!r.dataISO) return;
    if (String(r.dataISO).slice(0, 10) !== hoje) return;
    sum += Number(r.producao) || 0;
  });
  return sum;
}

function registrarLote() {
  var producao = parseFloat(document.getElementById("producaoLote").value);
  var duracao = parseFloat(document.getElementById("duracaoLote").value);
  var desperdicio = parseFloat(document.getElementById("desperdicioLote").value);
  var resultadoDiv = document.getElementById("resultadoLote");

  resultadoDiv.classList.remove("result--erro");

  if (isNaN(producao) || producao <= 0) {
    resultadoDiv.classList.add("result--erro");
    resultadoDiv.textContent = "Informe a produção do lote (> 0).";
    return;
  }
  if (isNaN(duracao) || duracao <= 0) {
    resultadoDiv.classList.add("result--erro");
    resultadoDiv.textContent = "Informe a duração do lote em minutos (> 0).";
    return;
  }
  if (isNaN(desperdicio) || desperdicio < 0) {
    desperdicio = 0;
  }
  if (desperdicio > producao) {
    resultadoDiv.classList.add("result--erro");
    resultadoDiv.textContent = "Desperdício não pode ser maior que a produção do lote.";
    return;
  }

  var lotes = lerLotes();
  var agoraISO = new Date().toISOString();
  lotes.push({
    producao: producao,
    duracaoLoteMin: duracao,
    desperdicio: desperdicio,
    data: new Date().toLocaleString("pt-BR"),
    dataISO: agoraISO
  });
  localStorage.setItem(LOTES_STORAGE_KEY, JSON.stringify(lotes));

  var ph = producao / (duracao / 60);
  var meta = lerMetaConfig();
  var msg = "Lote salvo. Throughput: " + ph.toFixed(1) + " peças/h.";
  if (meta) {
    var ideal = meta.metaDiaria / meta.horasTotais;
    var d = ((ph - ideal) / ideal) * 100;
    msg +=
      " " +
      (d >= 0 ? "Ganho" : "Perda") +
      " de " +
      Math.abs(d).toFixed(1) +
      "% vs meta (" +
      ideal.toFixed(1) +
      " peças/h).";
  } else {
    msg += " Salve a meta em Ajustar meta para comparar com o ritmo ideal.";
  }
  resultadoDiv.textContent = msg;

  document.getElementById("producaoLote").value = "";
  document.getElementById("duracaoLote").value = "";
  document.getElementById("desperdicioLote").value = "0";

  atualizarPainelLotes();
}

function limparHistoricoLotes() {
  if (confirm("Limpar todo o histórico de lotes desta página? (O painel OEE não é afetado.)")) {
    localStorage.removeItem(LOTES_STORAGE_KEY);
    atualizarPainelLotes();
    document.getElementById("resultadoLote").textContent = "";
  }
}

function atualizarPainelLotes() {
  atualizarKpisLotes();
  atualizarResumoLotes();
  atualizarTabelaLotes();
  atualizarGraficoThroughput();
}

function setKpiText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function atualizarKpisLotes() {
  var lotes = lerLotes();
  var meta = lerMetaConfig();

  if (meta) {
    var brutaHoje = somaProducaoLotesHoje(lotes);
    var pct = (brutaHoje / meta.metaDiaria) * 100;
    setKpiText(
      "kpiMetaVsLotes",
      brutaHoje.toLocaleString("pt-BR") +
        " / " +
        meta.metaDiaria.toLocaleString("pt-BR") +
        " peças (" +
        pct.toFixed(0) +
        "%)"
    );
  } else {
    setKpiText("kpiMetaVsLotes", "Sem meta salva");
  }

  if (lotes.length === 0) {
    setKpiText("kpiLeadTime", "—");
    setKpiText("kpiThroughput", "—");
    setKpiText("kpiDeltaMinMax", "—");
    return;
  }

  var somaMin = 0;
  var somaPh = 0;
  lotes.forEach(function (r) {
    somaMin += r.duracaoLoteMin;
    somaPh += pecasPorHoraLote(r);
  });
  var n = lotes.length;
  setKpiText("kpiLeadTime", (somaMin / n).toFixed(1) + " min");
  setKpiText("kpiThroughput", (somaPh / n).toFixed(1) + " peças/h");

  if (!meta) {
    setKpiText("kpiDeltaMinMax", "—");
    return;
  }
  var idealPh = meta.metaDiaria / meta.horasTotais;
  var deltas = [];
  lotes.forEach(function (r) {
    var d = deltaVsMetaPct(r, idealPh);
    if (d != null && !isNaN(d)) deltas.push(d);
  });
  if (deltas.length === 0) {
    setKpiText("kpiDeltaMinMax", "—");
  } else {
    var mn = Math.min.apply(null, deltas);
    var mx = Math.max.apply(null, deltas);
    function fmtDelta(v) {
      return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
    }
    setKpiText("kpiDeltaMinMax", fmtDelta(mx) + " / " + fmtDelta(mn));
  }
}

function atualizarResumoLotes() {
  var el = document.getElementById("resumoLotes");
  var lotes = lerLotes();
  if (!el) return;
  if (lotes.length === 0) {
    el.innerHTML = "";
    return;
  }
  var totalP = 0;
  var totalD = 0;
  lotes.forEach(function (r) {
    totalP += Number(r.producao) || 0;
    totalD += Number(r.desperdicio) || 0;
  });
  var somaMin = lotes.reduce(function (a, r) {
    return a + r.duracaoLoteMin;
  }, 0);
  var somaPh = lotes.reduce(function (a, r) {
    return a + pecasPorHoraLote(r);
  }, 0);
  var n = lotes.length;
  el.innerHTML =
    "<strong>Lotes registrados:</strong> " +
    n +
    "<br><strong>Produção bruta (lotes):</strong> " +
    totalP +
    " peças · <strong>Desperdício:</strong> " +
    totalD +
    " peças<br><strong>Lead time médio:</strong> " +
    (somaMin / n).toFixed(1) +
    " min · <strong>Throughput médio:</strong> " +
    (somaPh / n).toFixed(1) +
    " peças/h";
}

function atualizarTabelaLotes() {
  var lotes = lerLotes();
  var tbody = document.querySelector("#tabelaLotes tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  var meta = lerMetaConfig();
  var idealPh = meta ? meta.metaDiaria / meta.horasTotais : 0;

  lotes
    .slice(-10)
    .reverse()
    .forEach(function (r) {
      var ph = pecasPorHoraLote(r);
      var deltaStr = "—";
      if (meta && idealPh > 0) {
        var d = deltaVsMetaPct(r, idealPh);
        deltaStr = (d >= 0 ? "+" : "") + d.toFixed(1) + "%";
      }
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        escapeHtml(r.data) +
        "</td><td>" +
        escapeHtml(r.producao) +
        "</td><td>" +
        escapeHtml(r.desperdicio != null ? r.desperdicio : 0) +
        "</td><td>" +
        escapeHtml(r.duracaoLoteMin) +
        "</td><td>" +
        escapeHtml(ph.toFixed(1)) +
        "</td><td>" +
        escapeHtml(deltaStr) +
        "</td>";
      tbody.appendChild(tr);
    });
}

function rotuloGraficoLote(r, indice) {
  if (r.dataISO) {
    try {
      var d = new Date(r.dataISO);
      var dia = String(d.getDate()).padStart(2, "0");
      var mes = String(d.getMonth() + 1).padStart(2, "0");
      var h = String(d.getHours()).padStart(2, "0");
      var m = String(d.getMinutes()).padStart(2, "0");
      return dia + "/" + mes + " " + h + ":" + m;
    } catch (e) {
      /* fallthrough */
    }
  }
  if (r.data && String(r.data).length > 12) return String(r.data).slice(0, 12) + "…";
  return r.data || "Lote " + (indice + 1);
}

function atualizarGraficoThroughput() {
  var msgEl = document.getElementById("graficoThroughputMsg");
  var container = document.getElementById("graficoThroughputContainer");
  var canvas = document.getElementById("graficoThroughput");
  if (!msgEl || !container || !canvas || typeof Chart === "undefined") return;

  if (graficoThroughputChart) {
    graficoThroughputChart.destroy();
    graficoThroughputChart = null;
  }

  var meta = lerMetaConfig();
  var lotes = lerLotes();
  var ultimos = lotes.slice(-12);

  if (!meta) {
    container.hidden = true;
    msgEl.textContent =
      "Salve a meta diária e a jornada em Ajustar meta para comparar ganho (verde) e perda (vermelho) em relação à taxa ideal de peças/h.";
    return;
  }

  if (ultimos.length === 0) {
    container.hidden = true;
    msgEl.textContent = "Registre pelo menos um lote com produção e duração para exibir o gráfico.";
    return;
  }

  msgEl.textContent = "";
  container.hidden = false;

  var idealPh = meta.metaDiaria / meta.horasTotais;
  var labels = [];
  var deltas = [];
  var cores = [];

  ultimos.forEach(function (r, i) {
    var h = r.duracaoLoteMin / 60;
    var realPh = h > 0 ? r.producao / h : 0;
    var delta = idealPh > 0 ? ((realPh - idealPh) / idealPh) * 100 : 0;
    labels.push(rotuloGraficoLote(r, i));
    deltas.push(Number(delta.toFixed(2)));
    cores.push(delta >= 0 ? "rgba(39, 174, 96, 0.9)" : "rgba(192, 57, 43, 0.9)");
  });

  var altura = Math.min(420, Math.max(140, 48 + ultimos.length * 36));
  container.style.height = altura + "px";

  var ctx = canvas.getContext("2d");
  graficoThroughputChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "vs meta",
          data: deltas,
          backgroundColor: cores,
          borderWidth: 0
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "% vs meta de peças/h (0 = na meta)",
            font: { size: 11 }
          },
          ticks: { font: { size: 10 } },
          grid: { color: "rgba(0,0,0,0.07)" }
        },
        y: {
          ticks: { font: { size: 10 }, maxRotation: 0 },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Até 12 lotes (ordem cronológica)",
          font: { size: 12, weight: "600" },
          padding: { bottom: 8 }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var v = ctx.parsed.x;
              if (v == null || isNaN(v)) return "";
              var s = v >= 0 ? "Ganho" : "Perda";
              return s + ": " + Math.abs(v).toFixed(1) + "% vs meta de ritmo";
            },
            afterLabel: function (ctx) {
              var i = ctx.dataIndex;
              var r = ultimos[i];
              if (!r) return "";
              var h = r.duracaoLoteMin / 60;
              var ph = h > 0 ? (r.producao / h).toFixed(1) : "—";
              return "Real: " + ph + " peças/h · Meta: " + idealPh.toFixed(1) + " peças/h";
            }
          }
        }
      }
    }
  });
}
