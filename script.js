document.addEventListener("DOMContentLoaded", function() {
  const btnRegistrar = document.getElementById("btnRegistrar");
  const btnLimpar = document.getElementById("btnLimpar");

  btnRegistrar.addEventListener("click", registrarProducao);
  btnLimpar.addEventListener("click", limparHistorico);

  atualizarTabela();
  atualizarBarra();
  atualizarEstatisticas();
});

function registrarProducao() {
  const producao = parseFloat(document.getElementById("producao").value);
  const desperdicio = parseFloat(document.getElementById("desperdicio").value);
  const resultadoDiv = document.getElementById("resultado");

  if (isNaN(producao) || isNaN(desperdicio) || producao <= 0 || desperdicio < 0) {
    resultadoDiv.innerHTML = "⚠️ Preencha os campos corretamente!";
    return;
  }

  const eficiencia = ((producao - desperdicio) / producao) * 100;

  const registros = JSON.parse(localStorage.getItem("registrosEco")) || [];
  registros.push({
    producao,
    desperdicio,
    eficiencia,
    data: new Date().toLocaleString()
  });
  localStorage.setItem("registrosEco", JSON.stringify(registros));

  resultadoDiv.innerHTML = `✅ Registro salvo! Eficiência: ${eficiencia.toFixed(2)}%`;

  atualizarTabela();
  atualizarBarra();
  atualizarEstatisticas();

  document.getElementById("producao").value = "";
  document.getElementById("desperdicio").value = "";
}

function limparHistorico() {
  if (confirm("Deseja realmente limpar o histórico?")) {
    localStorage.removeItem("registrosEco");
    atualizarTabela();
    atualizarBarra();
    atualizarEstatisticas();
  }
}

function atualizarTabela() {
  const registros = JSON.parse(localStorage.getItem("registrosEco")) || [];
  const tbody = document.querySelector("#tabelaRegistros tbody");
  tbody.innerHTML = "";
  registros.slice(-10).reverse().forEach(r => {
    tbody.innerHTML += `<tr>
      <td>${r.data}</td>
      <td>${r.producao}</td>
      <td>${r.desperdicio}</td>
      <td>${r.eficiencia.toFixed(2)}</td>
    </tr>`;
  });
}

function atualizarBarra() {
  const registros = JSON.parse(localStorage.getItem("registrosEco")) || [];
  const barra = document.getElementById("barraProgresso");
  if (registros.length === 0) {
    barra.style.width = "0%";
    barra.innerText = "0%";
    return;
  }
  const mediaEficiencia = registros.reduce((acc, r) => acc + r.eficiencia, 0) / registros.length;
  barra.style.width = mediaEficiencia.toFixed(2) + "%";
  barra.innerText = mediaEficiencia.toFixed(2) + "%";
}

function atualizarEstatisticas() {
  const registros = JSON.parse(localStorage.getItem("registrosEco")) || [];
  const estatisticas = document.getElementById("estatisticas");
  if (registros.length === 0) {
    estatisticas.innerText = "";
    return;
  }
  const totalProducao = registros.reduce((acc, r) => acc + r.producao, 0);
  const totalDesperdicio = registros.reduce((acc, r) => acc + r.desperdicio, 0);
  const mediaEficiencia = registros.reduce((acc, r) => acc + r.eficiencia, 0) / registros.length;
  estatisticas.innerHTML = `
    <strong>Produção total:</strong> ${totalProducao} peças<br>
    <strong>Desperdício total:</strong> ${totalDesperdicio} peças<br>
    <strong>Média de eficiência:</strong> ${mediaEficiencia.toFixed(2)}%
  `;
}