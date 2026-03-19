let grafico = null;

var ECO_META_CONFIG_KEY = "ecoMetaConfig";

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("btnCalcular").addEventListener("click", calcularMeta);
  restaurarMetaSalva();
});

function restaurarMetaSalva() {
  try {
    var raw = localStorage.getItem(ECO_META_CONFIG_KEY);
    if (!raw) return;
    var o = JSON.parse(raw);
    if (o && o.metaDiaria > 0) {
      document.getElementById("metaDiaria").value = o.metaDiaria;
    }
    if (o && o.horasTotais > 0) {
      document.getElementById("horasTotais").value = o.horasTotais;
    }
  } catch (e) {
    /* ignore */
  }
}

function salvarMetaParaPainel(metaDiaria, horasTotais) {
  localStorage.setItem(
    ECO_META_CONFIG_KEY,
    JSON.stringify({
      metaDiaria: metaDiaria,
      horasTotais: horasTotais,
      savedAt: new Date().toISOString()
    })
  );
}

function calcularMeta() {
  const metaDiaria = parseFloat(document.getElementById("metaDiaria").value);
  const horasTotais = parseFloat(document.getElementById("horasTotais").value);
  const horaAtual = parseFloat(document.getElementById("horaAtual").value);
  const producaoReal = parseFloat(document.getElementById("producaoReal").value);
  const resultadoDiv = document.getElementById("resultado");

  if (isNaN(metaDiaria) || isNaN(horasTotais) || isNaN(horaAtual) || isNaN(producaoReal) ||
      metaDiaria <= 0 || horasTotais <= 0 || horaAtual <= 0 || producaoReal < 0) {
    resultadoDiv.innerHTML = "⚠️ Preencha todos os campos corretamente!";
    return;
  }

  salvarMetaParaPainel(metaDiaria, horasTotais);

  const metaPorHora = metaDiaria / horasTotais;
  const esperadoAteAgora = metaPorHora * horaAtual;
  const diferenca = esperadoAteAgora - producaoReal;
  const horasRestantes = horasTotais - horaAtual;

  let novaMetaPorHora = metaPorHora;

  if (diferenca > 0 && horasRestantes > 0) {
    novaMetaPorHora = (diferenca + metaPorHora * horasRestantes) / horasRestantes;
  }

  let mensagem = `<strong>Meta inicial:</strong> ${metaPorHora.toFixed(2)} peças/hora<br>`;
  mensagem += `<strong>Esperado até agora:</strong> ${esperadoAteAgora.toFixed(2)} peças<br>`;
  mensagem += `<strong>Produzido:</strong> ${producaoReal.toFixed(2)} peças<br>`;

  if (diferenca <= 0) {
    mensagem += `✅ Você está dentro ou acima da meta.<br>`;
    mensagem += `<strong>Meta por hora mantém-se:</strong> ${metaPorHora.toFixed(2)} peças/hora`;
  } else {
    mensagem += `⚠️ Faltam ${diferenca.toFixed(2)} peças.<br>`;
    mensagem += `<strong>Nova meta por hora:</strong> ${novaMetaPorHora.toFixed(2)} peças/hora`;
  }

  mensagem += `<br><small>Meta diária e jornada foram salvas para o painel principal.</small>`;

  resultadoDiv.innerHTML = mensagem;

  // === Gráfico de progresso ===
  const ctx = document.getElementById("graficoProgresso").getContext("2d");

  // Dados simulando o progresso hora a hora
  const horas = [];
  const metaEsperada = [];
  const producao = [];

  for (let i = 1; i <= horasTotais; i++) {
    horas.push(`H${i}`);
    metaEsperada.push((metaPorHora * i).toFixed(2));
    if (i < horaAtual) {
      producao.push((producaoReal / horaAtual * i).toFixed(2));
    } else if (i === horaAtual) {
      producao.push(producaoReal.toFixed(2));
    } else {
      producao.push(null); // horas futuras ainda sem produção
    }
  }

  if (grafico) {
    grafico.destroy();
  }

  var mqNarrow = window.matchMedia("(max-width: 479px)");
  var mqTablet = window.matchMedia("(max-width: 767px)");
  var tickSize = mqNarrow.matches ? 9 : mqTablet.matches ? 10 : 11;
  var titleSize = mqNarrow.matches ? 12 : mqTablet.matches ? 13 : 14;
  var legendSize = mqNarrow.matches ? 10 : 11;
  var borderW = mqNarrow.matches ? 1.5 : 2;

  grafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: horas,
      datasets: [
        {
          label: "Meta esperada",
          data: metaEsperada,
          borderColor: "#7f8c8d",
          borderWidth: borderW,
          tension: 0.3,
          fill: false
        },
        {
          label: "Produção real",
          data: producao,
          borderColor: "#1e8449",
          borderWidth: mqNarrow.matches ? 2 : 3,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: {
        padding: mqNarrow.matches
          ? { top: 4, right: 4, bottom: 2, left: 2 }
          : { top: 6, right: 8, bottom: 4, left: 4 }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Horas",
            font: { size: tickSize + 1 }
          },
          ticks: {
            maxRotation: mqNarrow.matches ? 50 : 35,
            minRotation: mqNarrow.matches ? 40 : 0,
            font: { size: tickSize }
          },
          grid: { color: "rgba(0,0,0,0.06)" }
        },
        y: {
          title: {
            display: true,
            text: "Peças acum.",
            font: { size: tickSize + 1 }
          },
          ticks: { font: { size: tickSize } },
          beginAtZero: true,
          grid: { color: "rgba(0,0,0,0.06)" }
        }
      },
      plugins: {
        legend: {
          position: "top",
          align: "center",
          labels: {
            boxWidth: mqNarrow.matches ? 10 : 12,
            padding: mqNarrow.matches ? 8 : 12,
            font: { size: legendSize }
          }
        },
        title: {
          display: true,
          text: "Progresso da meta",
          font: { size: titleSize, weight: "600" },
          padding: { bottom: mqNarrow.matches ? 6 : 10 }
        }
      }
    }
  });
}