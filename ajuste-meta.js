let grafico = null;

document.getElementById("btnCalcular").addEventListener("click", calcularMeta);

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

  grafico = new Chart(ctx, {
    type: 'line',
    data: {
      labels: horas,
      datasets: [
        {
          label: 'Meta Esperada',
          data: metaEsperada,
          borderColor: '#7f8c8d',
          borderWidth: 2,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Produção Real',
          data: producao,
          borderColor: '#1e8449',
          borderWidth: 3,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Horas de Produção' }
        },
        y: {
          title: { display: true, text: 'Peças Acumuladas' },
          beginAtZero: true
        }
      },
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: 'Progresso da Meta Produtiva'
        }
      }
    }
  });
}