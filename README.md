# SmarthFactory (EcoFábrica)

Aplicação web **estática** voltada à **gestão de produção em manufatura**: cálculo de **OEE** (Overall Equipment Effectiveness), ajuste de **meta horária/diária**, acompanhamento de **ritmo (throughput)** e **lead time** por lote, com visualização em gráficos.

> Projeto de portfólio — os dados ficam no **navegador** (`localStorage`), sem backend.

---

## Funcionalidades

### Painel principal (`index.html`)
- Registro de **produção bruta** e **desperdício** por lançamento.
- **OEE** com os fatores **Disponibilidade (A)**, **Performance (P)** e **Qualidade (Q)**  
  - *Q* = peças boas ÷ produção bruta  
  - *A* e *P* quando informados **tempo planejado**, **paradas** e **meta** salva em Ajustar meta  
- KPIs acumulados: peças boas, scrap, média por registro, melhor/pior OEE, realizado no dia × meta diária.
- Barra de **OEE médio** e histórico tabular (últimos registros).

### Ritmo e lead time (`throughput.html`)
- Registro de **lotes** com **duração (min)** e produção (e desperdício opcional).
- **Lead time médio**, **throughput médio (peças/h)**, comparativo **lotes do dia × meta**.
- Gráfico de barras (**Chart.js**): **ganho** (verde) vs **perda** (vermelho) frente à taxa ideal (peças/h) da meta.
- Histórico próprio em `localStorage` (`registrosLotes`), com migração única de lotes que antes vinham do painel OEE.

### Ajuste de meta (`ajuste-meta.html`)
- Cálculo de **meta por hora**, esperado acumulado e **nova meta horária** quando há atraso.
- Persistência da **meta diária** e **jornada** para uso no OEE, throughput e KPIs.
- Gráfico de linha (Chart.js): meta esperada × produção real ao longo das horas.

---

## Tecnologias

| Camada | Uso |
|--------|-----|
| **HTML5** | Estrutura semântica, formulários, acessibilidade básica (`aria-*`). |
| **CSS3** | Layout **mobile first**, variáveis (`:root`), grid de KPIs, tema visual “painel” (fundo em camadas). |
| **JavaScript (ES5+)** | Lógica de negócio, validação, `localStorage`, integração com Chart.js. |
| **Chart.js** (CDN) | Gráficos nas páginas de meta e de throughput. |
| **GitHub Actions** | Deploy automático no **GitHub Pages** + verificação dos arquivos antes do upload. |

Sem frameworks (React/Vue/etc.), sem build obrigatório — basta servir os arquivos como site estático.

---

## Estrutura do repositório

```
SmarthFactory/
├── .github/
│   └── workflows/
│       └── pages.yml   # CI: valida arquivos e publica no GitHub Pages
├── .nojekyll           # Evita processamento Jekyll no Pages
├── index.html          # Painel OEE
├── script.js
├── throughput.html     # Ritmo / lead time / gráfico throughput
├── throughput.js
├── throughput.css
├── ajuste-meta.html    # Meta horária + gráfico de progresso
├── ajuste-meta.js
├── ajuste-meta.css
├── style.css           # Estilos globais (tema, header, cards, tabelas)
└── README.md
```

---

## Como executar localmente

1. Clone ou baixe o repositório.
2. Abra `index.html` no navegador **ou** use um servidor estático, por exemplo:
   - **VS Code / Cursor:** extensão “Live Server”.
   - **Node:** `npx serve .`
   - **Python:** `python -m http.server 8080`

Navegue entre **Painel OEE**, **Ritmo** e **Meta** pelos links do cabeçalho.

---

## Deploy (GitHub Pages)

O repositório inclui um workflow **`.github/workflows/pages.yml`** que:

1. **Valida** se todos os HTML/CSS/JS do site existem (falha o job se algo estiver faltando — ajuda a pegar erro antes de publicar).
2. Copia só esses arquivos para uma pasta `_site` e adiciona **`.nojekyll`** (evita o GitHub Pages tentar processar o site com Jekyll e quebrar caminhos).
3. Publica o artefato no **GitHub Pages**.

### Ativar no GitHub (uma vez)

1. Repositório no GitHub → **Settings** → **Pages**.
2. Em **Build and deployment** → **Source**: escolha **GitHub Actions** (não “Deploy from branch”).
3. Faça **push** na branch `main` (ou rode o workflow manualmente em **Actions** → **Deploy GitHub Pages** → **Run workflow**).

A URL ficará no formato: `https://<usuario>.github.io/SmarthFactory/` (ou o nome do seu repositório). Links relativos (`style.css`, `throughput.html`, etc.) continuam corretos nesse endereço.

> **Chart.js** e fontes usam CDN com HTTPS — compatível com Pages.

---

## Armazenamento local (`localStorage`)

| Chave | Conteúdo |
|--------|-----------|
| `registrosEco` | Histórico do painel OEE |
| `registrosLotes` | Histórico de lotes (throughput) |
| `ecoMetaConfig` | Meta diária, horas de jornada, data de salvamento |
| `ecoLotesMigrado` | Flag de migração lotes ← histórico OEE |

Limpar dados do navegador apaga esses registros.

---

## Objetivo

Automatizar e visualizar indicadores usados no chão de fábrica (**OEE**, **ritmo vs meta**, **lead time**), servindo como **protótipo educativo** ou base para evolução (API, multiusuário, cadastro de máquinas, etc.).

---

## Autor

Desenvolvido como projeto de portfólio em **HTML**, **CSS** e **JavaScript**.
