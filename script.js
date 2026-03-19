document.addEventListener("DOMContentLoaded", function () {
  const btnRegistrar = document.getElementById("btnRegistrar");
  const btnLimpar = document.getElementById("btnLimpar");
  btnRegistrar.addEventListener("click", registrarProducao);
  btnLimpar.addEventListener("click", limparHistorico);

  atualizarTabela();
  atualizarBarra();
  atualizarEstatisticas();
  atualizarKPIs();
});

function lerRegistros() {
  try {
    const raw = localStorage.getItem("registrosEco");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

/** OEE legado: só existia “eficiência” (= qualidade %). */
function oeeDoRegistro(r) {
  if (typeof r.oee === "number" && !isNaN(r.oee)) return r.oee;
  if (typeof r.eficiencia === "number" && !isNaN(r.eficiencia)) return r.eficiencia;
  return 0;
}

function qualidadeDoRegistro(r) {
  if (typeof r.qualidade === "number" && !isNaN(r.qualidade)) return r.qualidade;
  if (typeof r.eficiencia === "number" && !isNaN(r.eficiencia)) return r.eficiencia;
  return 0;
}

function disponibilidadeDoRegistro(r) {
  if (typeof r.disponibilidade === "number" && !isNaN(r.disponibilidade)) return r.disponibilidade;
  return 100;
}

function performanceDoRegistro(r) {
  if (typeof r.performance === "number" && !isNaN(r.performance)) return r.performance;
  return 100;
}

function lerMetaConfig() {
  try {
    const raw = localStorage.getItem("ecoMetaConfig");
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.metaDiaria !== "number" || o.metaDiaria <= 0) return null;
    if (typeof o.horasTotais !== "number" || o.horasTotais <= 0) return null;
    return o;
  } catch {
    return null;
  }
}

/**
 * OEE = A × P × Q (valores 0–1 cada; resultado em %).
 * Q = peças boas / produção bruta.
 * A = tempo operando / tempo planejado = (T − paradas) / T.
 * P = produção real / produção ideal, com ideal = (tempo operando em h) × (meta diária / horas de jornada).
 */
function calcularMetricasOee(producao, desperdicio, tempoPlanejStr, paradasStr) {
  const Q = (producao - desperdicio) / producao;
  let A = 1;
  let P = 1;
  const tempoTrim = (tempoPlanejStr || "").trim();
  const parTrim = (paradasStr || "").trim();
  const avisos = [];

  if (parTrim !== "" && tempoTrim === "") {
    return { erro: "Se informar paradas, preencha também o tempo planejado (min)." };
  }

  let tempoPlanejMin = null;
  let paradasMin = null;

  if (tempoTrim !== "") {
    const tp = parseFloat(tempoTrim);
    if (isNaN(tp) || tp <= 0) {
      return { erro: "Tempo planejado deve ser um número maior que zero." };
    }
    const par = parTrim === "" ? 0 : parseFloat(parTrim);
    if (isNaN(par) || par < 0) {
      return { erro: "Paradas deve ser um número maior ou igual a zero." };
    }
    if (par > tp) {
      return { erro: "Paradas não podem ser maiores que o tempo planejado." };
    }
    A = (tp - par) / tp;
    tempoPlanejMin = tp;
    paradasMin = par;
  }

  const meta = lerMetaConfig();
  if (tempoPlanejMin != null && paradasMin != null) {
    const tempoOperMin = tempoPlanejMin - paradasMin;
    if (tempoOperMin > 0 && meta) {
      const pecasPorHora = meta.metaDiaria / meta.horasTotais;
      const ideal = (tempoOperMin / 60) * pecasPorHora;
      if (ideal > 0) {
        P = Math.min(producao / ideal, 1);
      }
    } else if (tempoOperMin > 0 && !meta) {
      avisos.push(
        "Performance (P) considerada 100% — salve a meta diária e a jornada em Ajustar meta para calcular P."
      );
    }
  }

  if (tempoTrim === "") {
    avisos.push(
      "Sem tempo planejado: disponibilidade e performance assumidas em 100%. OEE deste registro = apenas o fator qualidade."
    );
  }

  const oee = A * P * Q * 100;
  return {
    A,
    P,
    Q,
    oee,
    qualidadePct: Q * 100,
    disponibilidadePct: A * 100,
    performancePct: P * 100,
    tempoPlanejMin,
    paradasMin,
    avisos
  };
}

function registrarProducao() {
  const producao = parseFloat(document.getElementById("producao").value);
  const desperdicio = parseFloat(document.getElementById("desperdicio").value);
  const tempoPlanejEl = document.getElementById("tempoPlanej");
  const paradasEl = document.getElementById("paradas");
  const resultadoDiv = document.getElementById("resultado");

  resultadoDiv.classList.remove("result--erro");

  if (isNaN(producao) || isNaN(desperdicio) || producao <= 0 || desperdicio < 0) {
    resultadoDiv.classList.add("result--erro");
    resultadoDiv.innerHTML = "Preencha produção (&gt; 0) e desperdício (≥ 0).";
    return;
  }

  if (desperdicio > producao) {
    resultadoDiv.classList.add("result--erro");
    resultadoDiv.innerHTML =
      "Desperdício não pode ser maior que a produção total do registro. Ajuste os valores.";
    return;
  }

  const m = calcularMetricasOee(
    producao,
    desperdicio,
    tempoPlanejEl ? tempoPlanejEl.value : "",
    paradasEl ? paradasEl.value : ""
  );

  if (m.erro) {
    resultadoDiv.classList.add("result--erro");
    resultadoDiv.innerHTML = escapeHtml(m.erro);
    return;
  }

  const registros = lerRegistros();
  registros.push({
    producao,
    desperdicio,
    oee: m.oee,
    qualidade: m.qualidadePct,
    disponibilidade: m.disponibilidadePct,
    performance: m.performancePct,
    tempoPlanejMin: m.tempoPlanejMin,
    paradasMin: m.paradasMin,
    data: new Date().toLocaleString("pt-BR"),
    dataISO: new Date().toISOString()
  });
  localStorage.setItem("registrosEco", JSON.stringify(registros));

  let html =
    "<strong>OEE:</strong> " +
    m.oee.toFixed(2) +
    "% &nbsp;·&nbsp; <strong>Q:</strong> " +
    m.qualidadePct.toFixed(2) +
    "% &nbsp;·&nbsp; <strong>A:</strong> " +
    m.disponibilidadePct.toFixed(2) +
    "% &nbsp;·&nbsp; <strong>P:</strong> " +
    m.performancePct.toFixed(2) +
    "%";
  if (m.avisos.length > 0) {
    html +=
      "<br><small>" +
      m.avisos.map(function (a) {
        return escapeHtml(a);
      }).join(" ") +
      "</small>";
  }
  resultadoDiv.innerHTML = html;

  atualizarTabela();
  atualizarBarra();
  atualizarEstatisticas();
  atualizarKPIs();

  document.getElementById("producao").value = "";
  document.getElementById("desperdicio").value = "";
  if (tempoPlanejEl) tempoPlanejEl.value = "";
  if (paradasEl) paradasEl.value = "";
}

function limparHistorico() {
  if (confirm("Deseja realmente limpar o histórico?")) {
    localStorage.removeItem("registrosEco");
    atualizarTabela();
    atualizarBarra();
    atualizarEstatisticas();
    atualizarKPIs();
  }
}

function atualizarTabela() {
  const registros = lerRegistros();
  const tbody = document.querySelector("#tabelaRegistros tbody");
  tbody.innerHTML = "";

  registros
    .slice(-10)
    .reverse()
    .forEach(function (r) {
      const oee = oeeDoRegistro(r);
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        escapeHtml(r.data) +
        "</td><td>" +
        escapeHtml(r.producao) +
        "</td><td>" +
        escapeHtml(r.desperdicio) +
        "</td><td>" +
        escapeHtml(oee.toFixed(2)) +
        "</td>";
      tbody.appendChild(tr);
    });
}

function clampPercent(n) {
  if (isNaN(n) || !isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function atualizarBarra() {
  const registros = lerRegistros();
  const barra = document.getElementById("barraProgresso");
  if (registros.length === 0) {
    barra.style.width = "0%";
    barra.innerText = "0%";
    return;
  }
  const mediaOee =
    registros.reduce(function (acc, r) {
      return acc + oeeDoRegistro(r);
    }, 0) / registros.length;
  const pct = clampPercent(mediaOee);
  barra.style.width = pct.toFixed(2) + "%";
  barra.innerText = mediaOee.toFixed(2) + "%";
}

function atualizarEstatisticas() {
  const registros = lerRegistros();
  const estatisticas = document.getElementById("estatisticas");
  if (registros.length === 0) {
    estatisticas.innerHTML = "";
    return;
  }
  let totalProducao = 0;
  let totalDesperdicio = 0;
  let somaOee = 0;
  let somaQ = 0;
  let somaA = 0;
  let somaP = 0;
  registros.forEach(function (r) {
    totalProducao += Number(r.producao) || 0;
    totalDesperdicio += Number(r.desperdicio) || 0;
    somaOee += oeeDoRegistro(r);
    somaQ += qualidadeDoRegistro(r);
    somaA += disponibilidadeDoRegistro(r);
    somaP += performanceDoRegistro(r);
  });
  const n = registros.length;
  const mediaOee = somaOee / n;
  const mediaQ = somaQ / n;
  const mediaA = somaA / n;
  const mediaP = somaP / n;
  const pecasBoas = totalProducao - totalDesperdicio;

  estatisticas.innerHTML =
    "<strong>OEE médio:</strong> " +
    mediaOee.toFixed(2) +
    "%<br>" +
    "<strong>Qualidade (Q) média:</strong> " +
    mediaQ.toFixed(2) +
    "% · <strong>Disponibilidade (A) média:</strong> " +
    mediaA.toFixed(2) +
    "% · <strong>Performance (P) média:</strong> " +
    mediaP.toFixed(2) +
    "%<br>" +
    "<strong>Produção bruta total:</strong> " +
    totalProducao +
    " peças<br>" +
    "<strong>Desperdício total:</strong> " +
    totalDesperdicio +
    " peças<br>" +
    "<strong>Peças boas:</strong> " +
    pecasBoas +
    " peças<br>" +
    "<strong>Registros:</strong> " +
    n +
    "<br><small>Ritmo e lead time: use a página <a href=\"throughput.html\">Ritmo / lotes</a>.</small>";
}

function setKpiText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function dataLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function somaProducaoBrutaHoje(registros) {
  const hoje = dataLocalYMD(new Date());
  let sum = 0;
  registros.forEach(function (r) {
    if (!r.dataISO) return;
    const day = String(r.dataISO).slice(0, 10);
    if (day !== hoje) return;
    sum += Number(r.producao) || 0;
  });
  return sum;
}

function atualizarKPIs() {
  const registros = lerRegistros();
  const meta = lerMetaConfig();

  if (meta) {
    const brutaHoje = somaProducaoBrutaHoje(registros);
    const pct = (brutaHoje / meta.metaDiaria) * 100;
    setKpiText(
      "kpiMetaVs",
      brutaHoje.toLocaleString("pt-BR") +
        " / " +
        meta.metaDiaria.toLocaleString("pt-BR") +
        " peças (" +
        pct.toFixed(0) +
        "%)"
    );
  } else {
    setKpiText("kpiMetaVs", "Sem meta salva");
  }

  if (registros.length === 0) {
    setKpiText("kpiPecasBoas", "—");
    setKpiText("kpiScrap", "—");
    setKpiText("kpiMediaRegistro", "—");
    setKpiText("kpiMinMax", "—");
    return;
  }

  let totalProducao = 0;
  let totalDesperdicio = 0;
  const oees = [];

  registros.forEach(function (r) {
    const p = Number(r.producao) || 0;
    const d = Number(r.desperdicio) || 0;
    totalProducao += p;
    totalDesperdicio += d;
    oees.push(oeeDoRegistro(r));
  });

  const pecasBoas = totalProducao - totalDesperdicio;
  const scrapPct = totalProducao > 0 ? (totalDesperdicio / totalProducao) * 100 : 0;
  const mediaPorRegistro = totalProducao / registros.length;

  let minMax = "—";
  if (oees.length > 0) {
    const min = Math.min.apply(null, oees);
    const max = Math.max.apply(null, oees);
    minMax = max.toFixed(1) + "% / " + min.toFixed(1) + "%";
  }

  setKpiText("kpiPecasBoas", pecasBoas.toLocaleString("pt-BR") + " peças");
  setKpiText("kpiScrap", scrapPct.toFixed(2) + "%");
  setKpiText("kpiMediaRegistro", mediaPorRegistro.toFixed(1) + " peças");
  setKpiText("kpiMinMax", minMax);
}
