// --- CONSTANTS & MOCK SEED DATA ---
const DEFAULT_SETTINGS = {
  prices: {
    chapelona: 12.50,
    destrutiva: 8.00,
    consumo: 15.00,
    seguranca: 6.00,
    pneus: 4.50,
    garantia: 5.00
  },
  company: {
    name: "AUTOETIQUETAS DO BRASIL LTDA",
    cnpj: "12.345.678/0001-90",
    phone: "(27) 3345-6789",
    address: "Av. Automotiva, 1000, Distrito Industrial - Serra - ES"
  },
  bank: {
    name: "Banco do Brasil S.A.",
    agency: "3421-5",
    account: "54.321-0",
    pix: "12.345.678/0001-90"
  }
};

const MOCK_CHASSIS_1 = [
  "9BWCA08V0HA100101", "9BWCA08V0HA100102", "9BWCA08V0HA100103",
  "9BWCA08V0HA100104", "9BWCA08V0HA100105", "9BWCA08V0HA100106",
  "9BWCA08V0HA100107", "9BWCA08V0HA100108"
];

const MOCK_CHASSIS_2 = Array.from({ length: 55 }, (_, i) => `9BWCA08V0HA200${200 + i}`);

const MOCK_ORDERS = [
  {
    id: "1717012000000",
    date: "2026-05-28T10:30:00.000Z",
    client: "Trading VIX Logistics",
    po: "PO-2026-VIX-082",
    selectedLabels: ["chapelona", "destrutiva", "consumo", "seguranca"],
    chassisList: MOCK_CHASSIS_1,
    totalChassis: MOCK_CHASSIS_1.length,
    status: "Terceirização",
    subtasks: {
      outsourceOrdered: false,
      outsourceReceived: false,
      inhouseProduced: false,
      blocksPrinted: false,
      invoiceIssued: false,
      debitNoteSent: false
    },
    blocksConfig: {
      size: 50,
      prefix: "HA",
      startIndex: 0
    },
    blocks: []
  },
  {
    id: "1717098400000",
    date: "2026-05-29T14:15:00.000Z",
    client: "Stellantis Betim (Fiat)",
    po: "PO-2026-STE-1149",
    selectedLabels: ["chapelona", "destrutiva", "consumo", "seguranca", "pneus", "garantia"],
    chassisList: MOCK_CHASSIS_2,
    totalChassis: MOCK_CHASSIS_2.length,
    status: "Pronto p/ Faturar",
    subtasks: {
      outsourceOrdered: true,
      outsourceReceived: true,
      inhouseProduced: true,
      blocksPrinted: true,
      invoiceIssued: false,
      debitNoteSent: false
    },
    blocksConfig: {
      size: 50,
      prefix: "HA",
      startIndex: 0
    },
    blocks: [] // Will be generated dynamically on load
  }
];

// --- APP STATE ---
let state = {
  orders: [],
  settings: {},
  activeTab: "dashboard",
  activeOrderId: null,
  activeStep: "outsource",
  labelConfig: {
    brandName: "GAC MOTOR",
    selectedFont: "Wallpoet",
    printType: "both",
    chapelonaWidth: 110,
    chapelonaHeight: 43,
    autodestrutivaWidth: 80,
    autodestrutivaHeight: 25,
    labelMargin: 4,
    pageMarginTop: 5
  }
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  initEventListeners();
  switchTab(state.activeTab);
  updateDashboardStats();
  populateSettingsForm();
});

// --- LOAD & SAVE DATA ---
function loadData() {
  // Load settings
  const savedSettings = localStorage.getItem("ef_settings");
  if (savedSettings) {
    state.settings = JSON.parse(savedSettings);
  } else {
    state.settings = DEFAULT_SETTINGS;
    localStorage.setItem("ef_settings", JSON.stringify(DEFAULT_SETTINGS));
  }

  // Load orders
  const savedOrders = localStorage.getItem("ef_orders");
  if (savedOrders) {
    state.orders = JSON.parse(savedOrders);
  } else {
    state.orders = MOCK_ORDERS;
    // Auto-generate blocks for mock data
    state.orders.forEach(o => {
      if (o.blocks.length === 0) {
        o.blocks = generateBlocksArray(o.chassisList, o.blocksConfig);
      }
    });
    localStorage.setItem("ef_orders", JSON.stringify(state.orders));
  }
}

function saveData() {
  localStorage.setItem("ef_orders", JSON.stringify(state.orders));
  localStorage.setItem("ef_settings", JSON.stringify(state.settings));
  updateDashboardStats();
}

// --- EVENT LISTENERS ---
function initEventListeners() {
  // Sidebar navigation
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = link.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Chassis input live counting
  const chassisInput = document.getElementById("chassis-input");
  if (chassisInput) {
    chassisInput.addEventListener("input", () => {
      const text = chassisInput.value;
      const count = parseChassisList(text).length;
      document.getElementById("chassis-counter").textContent = `${count} chassis detectados.`;
    });
  }
}

// --- TAB SYSTEM ---
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update sidebar active state
  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.getAttribute("data-tab") === tabId) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Update tabs content visibility
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.remove("active");
  });

  const activeContent = document.getElementById(`tab-${tabId}`);
  if (activeContent) {
    activeContent.classList.add("active");
  }

  // Specific tab entry actions
  if (tabId === "dashboard") {
    renderDashboardOrders();
    updateDashboardStats();
  } else if (tabId === "orders-list") {
    renderFullOrdersList();
  } else if (tabId === "settings") {
    populateSettingsForm();
  }
}

// --- HELPERS ---
function parseChassisList(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map(line => line.trim().toUpperCase())
    .filter(line => line.length > 0);
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "Terceirização": return "badge-amber";
    case "Produção Interna": return "badge-indigo";
    case "Blocagem": return "badge-cyan";
    case "Pronto p/ Faturar": return "badge-cyan";
    case "Finalizado": return "badge-emerald";
    default: return "badge-cyan";
  }
}

// --- STATS AND DASHBOARD ---
function updateDashboardStats() {
  const activeOrders = state.orders.filter(o => o.status !== "Finalizado").length;
  const pendingOutsource = state.orders.filter(o => o.status === "Terceirização").length;
  const pendingInhouse = state.orders.filter(o => o.status === "Produção Interna").length;
  const completedBilling = state.orders.filter(o => o.status === "Finalizado").length;

  document.getElementById("stat-active-orders").textContent = activeOrders;
  document.getElementById("stat-pending-outsource").textContent = pendingOutsource;
  document.getElementById("stat-pending-inhouse").textContent = pendingInhouse;
  document.getElementById("stat-completed-billing").textContent = completedBilling;
}

function renderDashboardOrders() {
  const container = document.getElementById("dashboard-orders-container");
  const activeOrders = state.orders.filter(o => o.status !== "Finalizado");

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h3>Nenhum pedido ativo</h3>
        <p>Todos os seus pedidos já foram faturados ou você ainda não cadastrou nenhum.</p>
        <button class="btn btn-primary" onclick="switchTab('new-order')">Criar Novo Pedido</button>
      </div>
    `;
    return;
  }

  let html = `
    <div class="orders-table-wrapper">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Pedido / PO</th>
            <th>Chassis</th>
            <th>Status</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  activeOrders.forEach(o => {
    html += `
      <tr>
        <td style="font-weight: 500;">${formatDate(o.date).split(" ")[0]}</td>
        <td style="font-weight: 600;">${o.client}</td>
        <td><code style="font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px;">${o.po}</code></td>
        <td style="font-weight: 600; color: var(--primary);">${o.totalChassis} un</td>
        <td>
          <span class="badge ${getStatusBadgeClass(o.status)}">
            <span class="badge-dot pulse-dot"></span>
            ${o.status}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-icon" onclick="viewOrderDetails('${o.id}')" title="Acompanhar Fluxo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Acompanhar
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;
  container.innerHTML = html;
}

// --- NEW ORDER FORM ---
function handleCreateOrder(e) {
  e.preventDefault();
  
  const clientName = document.getElementById("client-name").value;
  const orderPo = document.getElementById("order-po").value;
  const rawChassis = document.getElementById("chassis-input").value;
  
  const chassisList = parseChassisList(rawChassis);
  if (chassisList.length === 0) {
    alert("Por favor, cole pelo menos um chassis válido!");
    return;
  }

  // Get selected labels
  const selectedLabels = [];
  if (document.getElementById("tag-chapelona").checked) selectedLabels.push("chapelona");
  if (document.getElementById("tag-destrutiva").checked) selectedLabels.push("destrutiva");
  if (document.getElementById("tag-consumo").checked) selectedLabels.push("consumo");
  if (document.getElementById("tag-seguranca").checked) selectedLabels.push("seguranca");
  if (document.getElementById("tag-pneus").checked) selectedLabels.push("pneus");
  if (document.getElementById("tag-garantia").checked) selectedLabels.push("garantia");

  if (selectedLabels.length === 0) {
    alert("Por favor, selecione pelo menos um tipo de etiqueta!");
    return;
  }

  const firstChassis = chassisList[0] || "";
  const firstLast8 = firstChassis.length >= 8 ? firstChassis.slice(-8) : firstChassis;
  const detectedPrefix = firstLast8.length >= 2 ? firstLast8.slice(0, 2) : "T1";

  const blocksConfig = {
    size: 50,
    prefix: detectedPrefix,
    startIndex: 0
  };

  const newOrder = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    client: clientName,
    po: orderPo,
    selectedLabels: selectedLabels,
    chassisList: chassisList,
    totalChassis: chassisList.length,
    status: "Terceirização",
    subtasks: {
      outsourceOrdered: false,
      outsourceReceived: false,
      inhouseProduced: false,
      blocksPrinted: false,
      invoiceIssued: false,
      debitNoteSent: false
    },
    blocksConfig: blocksConfig,
    blocks: generateBlocksArray(chassisList, blocksConfig)
  };

  state.orders.unshift(newOrder);
  saveData();

  // Reset form
  document.getElementById("new-order-form").reset();
  document.getElementById("chassis-counter").textContent = "0 chassis detectados.";
  
  // Go to details immediately
  viewOrderDetails(newOrder.id);
}

// --- FULL ORDERS LIST TAB ---
function renderFullOrdersList() {
  const container = document.getElementById("full-orders-container");
  
  if (state.orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h3>Nenhum pedido cadastrado</h3>
        <p>Cadastre o seu primeiro pedido de etiquetas automotivas para começar.</p>
        <button class="btn btn-primary" onclick="switchTab('new-order')">Criar Novo Pedido</button>
      </div>
    `;
    return;
  }

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h3 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700;">Todos os Pedidos (${state.orders.length})</h3>
    </div>
    <div class="orders-table-wrapper">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Pedido / PO</th>
            <th>Chassis</th>
            <th>Status</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  state.orders.forEach(o => {
    html += `
      <tr>
        <td style="font-weight: 500;">${formatDate(o.date)}</td>
        <td style="font-weight: 600;">${o.client}</td>
        <td><code style="font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px;">${o.po}</code></td>
        <td style="font-weight: 600; color: var(--primary);">${o.totalChassis} un</td>
        <td>
          <span class="badge ${getStatusBadgeClass(o.status)}">
            ${o.status === "Finalizado" ? "" : '<span class="badge-dot pulse-dot"></span>'}
            ${o.status}
          </span>
        </td>
        <td style="text-align: right; display: flex; justify-content: flex-end; gap: 0.5rem;">
          <button class="btn btn-secondary btn-icon" onclick="viewOrderDetails('${o.id}')" title="Acompanhar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Gerenciar
          </button>
          <button class="btn btn-secondary btn-icon" style="border-color: rgba(239, 68, 68, 0.2); color: var(--text-secondary);" onclick="handleDeleteOrder('${o.id}')" title="Excluir Pedido">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--danger)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;
  container.innerHTML = html;
}

function handleDeleteOrder(orderId) {
  if (confirm("Tem certeza que deseja excluir permanentemente este pedido? Todos os dados serão apagados.")) {
    state.orders = state.orders.filter(o => o.id !== orderId);
    saveData();
    renderFullOrdersList();
  }
}

// --- ORDER FLOW LOGIC ---
function viewOrderDetails(orderId) {
  state.activeOrderId = orderId;
  const order = state.orders.find(o => o.id === orderId);
  
  if (!order) return;

  // Set active step based on current status
  if (order.status === "Terceirização") {
    state.activeStep = "outsource";
  } else if (order.status === "Produção Interna") {
    state.activeStep = "inhouse";
  } else if (order.status === "Blocagem" || order.status === "Pronto p/ Faturar") {
    state.activeStep = "blocks";
  } else {
    state.activeStep = "billing";
  }

  renderOrderDetailsPage(order);
  switchTab("order-details");
}

function switchFlowStep(stepId) {
  state.activeStep = stepId;
  
  // Toggle step nodes active state
  document.querySelectorAll(".flow-step").forEach(node => {
    if (node.getAttribute("data-step") === stepId) {
      node.classList.add("active");
    } else {
      node.classList.remove("active");
    }
  });

  // Toggle step panel visibility
  document.querySelectorAll(".step-panel").forEach(panel => {
    panel.classList.remove("active");
  });
  document.getElementById(`step-${stepId}`).classList.add("active");
}

function updateSubtask(subtaskKey, value) {
  const order = state.orders.find(o => o.id === state.activeOrderId);
  if (!order) return;

  order.subtasks[subtaskKey] = value;

  // Auto-calculate general order status based on subtasks
  if (order.status !== "Finalizado") {
    if (!order.subtasks.outsourceOrdered || !order.subtasks.outsourceReceived) {
      order.status = "Terceirização";
    } else if (!order.subtasks.inhouseProduced) {
      order.status = "Produção Interna";
    } else if (!order.subtasks.blocksPrinted) {
      order.status = "Blocagem";
    } else if (!order.subtasks.invoiceIssued || !order.subtasks.debitNoteSent) {
      order.status = "Pronto p/ Faturar";
    }
  }

  saveData();
  renderOrderDetailsPage(order);
}

// Generate sequential blocks array based on configuration
function generateBlocksArray(chassisList, config) {
  const size = parseInt(config.size) || 50;
  const prefix = config.prefix || "T1";
  const startIdx = parseInt(config.startIndex) || 0;

  const blocks = [];
  let blockNum = 1;

  for (let i = 0; i < chassisList.length; i += size) {
    const chunk = chassisList.slice(i, i + size);
    
    // Sequential indices
    const startSeq = startIdx + i;
    const endSeq = startIdx + i + chunk.length - 1;

    // Formatting with padding (e.g. 000, 001)
    const formattedStartSeq = `${prefix} ${String(startSeq).padStart(3, "0")}`;
    const formattedEndSeq = `${prefix} ${String(endSeq).padStart(3, "0")}`;

    blocks.push({
      number: blockNum,
      code: `${prefix} ${String(startSeq).padStart(3, "0")} a ${String(endSeq).padStart(3, "0")}`,
      chassisStart: chunk[0],
      chassisEnd: chunk[chunk.length - 1],
      total: chunk.length,
      seqRange: `${formattedStartSeq} a ${formattedEndSeq}`,
      items: chunk
    });
    blockNum++;
  }
  return blocks;
}

function handleUpdateBlocksConfig(e) {
  e.preventDefault();
  const order = state.orders.find(o => o.id === state.activeOrderId);
  if (!order) return;

  const size = document.getElementById("cfg-block-size").value;
  const prefix = document.getElementById("cfg-block-prefix").value;
  const startVal = document.getElementById("cfg-block-start").value;

  order.blocksConfig = {
    size: parseInt(size),
    prefix: prefix,
    startIndex: parseInt(startVal)
  };

  order.blocks = generateBlocksArray(order.chassisList, order.blocksConfig);
  saveData();
  renderOrderDetailsPage(order);
  alert("Cálculo de blocos sequenciais atualizado com sucesso!");
}

// --- RENDER DYNAMIC STEPS PAGE ---
function renderOrderDetailsPage(order) {
  const wrapper = document.getElementById("active-order-detail-wrapper");
  
  // Calculate outsourced and internal label arrays
  const outsourceTypes = order.selectedLabels.filter(l => !["chapelona", "destrutiva"].includes(l));
  const inhouseTypes = order.selectedLabels.filter(l => ["chapelona", "destrutiva"].includes(l));

  // Determine node completed classes
  const stepOutsourceCompleted = order.subtasks.outsourceOrdered && order.subtasks.outsourceReceived;
  const stepInhouseCompleted = order.subtasks.inhouseProduced;
  const stepBlocksCompleted = order.subtasks.blocksPrinted;
  const stepBillingCompleted = order.subtasks.invoiceIssued && order.subtasks.debitNoteSent;

  // Render header & layout
  let html = `
    <header class="no-print" style="margin-bottom: 1.5rem;">
      <div class="page-title">
        <div style="display:flex; align-items:center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; cursor:pointer;" onclick="switchTab('dashboard')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar para o Painel
        </div>
        <h1>Fluxo do Pedido: <span style="color: var(--primary);">${order.client}</span></h1>
        <p>Pedido de Compra (PO): <code>${order.po}</code> | Cadastrado em: ${formatDate(order.date)}</p>
      </div>
      <div class="header-actions">
        <span class="badge ${getStatusBadgeClass(order.status)}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          ${order.status === "Finalizado" ? "" : '<span class="badge-dot pulse-dot"></span>'}
          ${order.status}
        </span>
      </div>
    </header>

    <!-- STEP NODES BAR -->
    <div class="order-flow-steps no-print">
      <div class="flow-step ${state.activeStep === "outsource" ? "active" : ""} ${stepOutsourceCompleted ? "completed" : ""}" data-step="outsource" onclick="switchFlowStep('outsource')">
        <span class="flow-step-num">ETAPA 1</span>
        <span class="flow-step-title">1. Terceirização</span>
        <span class="flow-step-desc">${outsourceTypes.length === 0 ? "Nenhum item" : stepOutsourceCompleted ? "Concluído" : "WhatsApp p/ Gráfica"}</span>
      </div>

      <div class="flow-step ${state.activeStep === "inhouse" ? "active" : ""} ${stepInhouseCompleted ? "completed" : ""}" data-step="inhouse" onclick="switchFlowStep('inhouse')">
        <span class="flow-step-num">ETAPA 2</span>
        <span class="flow-step-title">2. Produção Interna</span>
        <span class="flow-step-desc">${inhouseTypes.length === 0 ? "Nenhum item" : stepInhouseCompleted ? "Concluído" : "Imprimir Chapelona/Destrutiva"}</span>
      </div>

      <div class="flow-step ${state.activeStep === "blocks" ? "active" : ""} ${stepBlocksCompleted ? "completed" : ""}" data-step="blocks" onclick="switchFlowStep('blocks')">
        <span class="flow-step-num">ETAPA 3</span>
        <span class="flow-step-title">3. Blocagem</span>
        <span class="flow-step-desc">${stepBlocksCompleted ? "Concluído" : "Gerar e Imprimir Capas"}</span>
      </div>

      <div class="flow-step ${state.activeStep === "billing" ? "active" : ""} ${stepBillingCompleted ? "completed" : ""}" data-step="billing" onclick="switchFlowStep('billing')">
        <span class="flow-step-num">ETAPA 4</span>
        <span class="flow-step-title">4. Fechamento</span>
        <span class="flow-step-desc">${order.status === "Finalizado" ? "Arquivado" : "Nota de Débito & NF"}</span>
      </div>
    </div>

    <!-- PANEL 1: OUTSOURCE -->
    <div id="step-outsource" class="step-panel ${state.activeStep === "outsource" ? "active" : ""}">
      <div class="glass-card">
        <div class="panel-grid">
          
          <div class="panel-section">
            <h3 style="font-family: var(--font-heading); font-weight: 700; color: var(--primary);">Itens Terceirizados com a Gráfica</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Essas etiquetas são compradas fora da empresa. Veja a quantidade total a ser solicitada:</p>
            
            ${outsourceTypes.length === 0 ? `
              <div style="padding: 2rem; text-align: center; border: 1px dashed var(--border-light); border-radius: var(--radius-md); color: var(--text-secondary);">
                Nenhuma etiqueta terceirizada foi selecionada para este pedido.
              </div>
            ` : `
              <div class="item-card-list">
                ${outsourceTypes.map(t => `
                  <div class="item-card">
                    <div class="item-card-left">
                      <div class="item-card-icon">🏷️</div>
                      <div class="item-card-info">
                        <span class="item-card-title">${t.replace("consumo", "Consumo e Energia").replace("seguranca", "Segurança").replace("pneus", "Pressão de Pneus").replace("garantia", "Garantia")}</span>
                        <span class="item-card-desc">Terceirizada à Gráfica Externa</span>
                      </div>
                    </div>
                    <span style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">${order.totalChassis} un</span>
                  </div>
                `).join("")}
              </div>
            `}

            <div style="margin-top: 1rem; border-top: 1px solid var(--border-light); padding-top: 1.5rem;" class="step-panel-actions">
              <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem;">Checklist da Etapa:</h4>
              <div class="checkbox-group" style="background: none; border: none; padding: 0;">
                <label class="checkbox-ctrl">
                  <input type="checkbox" id="chk-outsource-ordered" ${order.subtasks.outsourceOrdered ? "checked" : ""} onchange="updateSubtask('outsourceOrdered', this.checked)">
                  <div>
                    <span class="checkbox-label">Pedido Enviado para a Gráfica</span>
                    <span class="checkbox-sublabel">Mensagem enviada via WhatsApp</span>
                  </div>
                </label>
                <label class="checkbox-ctrl">
                  <input type="checkbox" id="chk-outsource-received" ${order.subtasks.outsourceReceived ? "checked" : ""} onchange="updateSubtask('outsourceReceived', this.checked)">
                  <div>
                    <span class="checkbox-label">Etiquetas Recebidas e Conferidas</span>
                    <span class="checkbox-sublabel">Conferido quantidade e integridade</span>
                  </div>
                </label>
              </div>

              ${stepOutsourceCompleted ? `
                <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                  <button class="btn btn-primary" onclick="switchFlowStep('inhouse')">Avançar para Produção Interna &rarr;</button>
                </div>
              ` : ""}
            </div>
          </div>

          <div class="panel-section">
            <div class="whatsapp-box">
              <div class="whatsapp-box-header">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.728 2.01 14.254.99 11.64.99c-5.442 0-9.866 4.372-9.87 9.802 0 1.714.46 3.393 1.332 4.887l-.993 3.626 3.948-.962zm10.742-6.52c-.279-.14-1.653-.816-1.91-.908-.255-.093-.44-.14-.627.14-.187.28-.72.908-.883 1.093-.163.187-.327.21-.606.07-.28-.14-1.18-.435-2.247-1.39-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.43.122-.57.126-.125.279-.327.42-.49.14-.163.187-.28.279-.465.093-.187.047-.35-.023-.49-.07-.14-.627-1.512-.86-2.07-.225-.544-.453-.47-.627-.478-.163-.008-.35-.01-.537-.01-.187 0-.49.07-.747.35-.257.28-.98.958-.98 2.333s1.004 2.707 1.144 2.893c.14.187 1.976 3.017 4.786 4.227.668.287 1.19.459 1.597.587.67.213 1.28.183 1.762.11.537-.08 1.653-.675 1.887-1.326.233-.65.233-1.21.163-1.325-.07-.116-.256-.203-.535-.343z"/></svg>
                Resumo para Gráfica (WhatsApp)
              </div>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Copie a mensagem abaixo para enviar diretamente ao seu contato da gráfica:</p>
              
              <div class="whatsapp-content" id="whatsapp-message-text">${generateWhatsAppText(order)}</div>
              
              <button class="btn btn-success" onclick="copyWhatsAppToClipboard()" style="gap: 0.5rem; justify-content: center; width: 100%;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copiar Texto p/ Whatsapp
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- PANEL 2: INHOUSE -->
    <div id="step-inhouse" class="step-panel ${state.activeStep === "inhouse" ? "active" : ""}">
      <div class="glass-card">
        <h3 style="font-family: var(--font-heading); font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">Produção Interna de Etiquetas</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">As seguintes etiquetas serão fabricadas em nossa empresa para cada chassis:</p>

        <div class="panel-grid">
          
          <div class="panel-section">
            ${inhouseTypes.length === 0 ? `
              <div style="padding: 2rem; text-align: center; border: 1px dashed var(--border-light); border-radius: var(--radius-md); color: var(--text-secondary);">
                Nenhuma etiqueta de fabricação interna foi selecionada.
              </div>
            ` : `
              <div style="display:flex; gap: 1.5rem; margin-bottom: 1.5rem;">
                ${inhouseTypes.map(t => `
                  <div class="stat-card cyan" style="flex:1; padding: 1rem 1.25rem;">
                    <span style="font-size:0.75rem; color:var(--text-secondary); font-weight: 600; text-transform:uppercase;">TOTAL ${t.toUpperCase()}</span>
                    <span style="font-family:var(--font-heading); font-size:1.6rem; font-weight:800; color:#fff;">${order.totalChassis} un</span>
                  </div>
                `).join("")}
              </div>

              <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem;">Lista de Chassis para Impressão:</h4>
              <div class="orders-table-wrapper" style="max-height: 350px; overflow-y: auto;">
                <table class="orders-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Código do Chassis</th>
                      <th>Etiquetas a Produzir</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.chassisList.map((ch, idx) => `
                      <tr>
                        <td>${idx + 1}</td>
                        <td><strong style="font-family: monospace; font-size:0.95rem;">${ch}</strong></td>
                        <td>
                          <div style="display:flex; gap: 0.5rem;">
                            ${inhouseTypes.map(t => `<span class="badge badge-cyan" style="font-size:0.65rem;">${t.toUpperCase()}</span>`).join("")}
                          </div>
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <div class="panel-section step-panel-actions">
            
            <!-- Controle de Produção Interna Box -->
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.5rem; display:flex; flex-direction:column; gap: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); display:flex; align-items:center; gap: 0.5rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Controle de Produção Interna
              </h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">Clique no botão abaixo para registrar que as Chapelonas e Autodestrutivas foram impressas, recortadas e estão prontas.</p>
              
              <label class="checkbox-ctrl" style="margin-top: 0.5rem;">
                <input type="checkbox" id="chk-inhouse-produced" ${order.subtasks.inhouseProduced ? "checked" : ""} onchange="updateSubtask('inhouseProduced', this.checked)">
                <div>
                  <span class="checkbox-label" style="font-weight: 700;">PRODUÇÃO CONCLUÍDA</span>
                  <span class="checkbox-sublabel">Chapelonas e destrutivas impressas</span>
                </div>
              </label>

              ${stepInhouseCompleted ? `
                <div style="margin-top: 0.5rem;">
                  <button class="btn btn-primary" style="width:100%;" onclick="switchFlowStep('blocks')">Avançar para Blocagem &rarr;</button>
                </div>
              ` : ""}
            </div>

            <!-- IMPRESSÃO & CALIBRAÇÃO DE ETIQUETAS DE CHASSIS CARD -->
            ${inhouseTypes.length > 0 ? `
              <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.5rem; display:flex; flex-direction:column; gap: 1rem;">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); display:flex; align-items:center; gap: 0.5rem; margin-bottom: 0.25rem;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Impressão & Calibração Física
                </h4>
                <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4;">Ajuste o tamanho físico exato das fitas e envie o lote para a impressora térmica.</p>
                
                <div class="form-group" style="gap: 0.25rem;">
                  <label style="font-size: 0.75rem; color: var(--text-secondary);">Nome da Montadora</label>
                  <input type="text" id="label-brand-input" class="input-ctrl" style="padding: 0.45rem 0.75rem; font-size: 0.8rem;" value="${state.labelConfig?.brandName || 'GAC MOTOR'}" oninput="updateLabelCalibration()">
                </div>

                <div class="form-group" style="gap: 0.25rem;">
                  <label style="font-size: 0.75rem; color: var(--text-secondary);">Fonte Stencil (Chapelonas)</label>
                  <select id="label-font-select" class="input-ctrl" style="padding: 0.45rem 0.75rem; font-size: 0.8rem; background: var(--bg-input);" onchange="updateLabelCalibration()">
                    <option value="Wallpoet" ${state.labelConfig?.selectedFont === 'Wallpoet' ? 'selected' : ''}>KIA MOTOR Stencil (Wallpoet)</option>
                    <option value="Allerta" ${state.labelConfig?.selectedFont === 'Allerta' ? 'selected' : ''}>Fita Segmentada (Allerta Stencil)</option>
                    <option value="monospace" ${state.labelConfig?.selectedFont === 'monospace' ? 'selected' : ''}>Monoespaçada Industrial</option>
                  </select>
                </div>

                <div class="form-group" style="gap: 0.25rem;">
                  <label style="font-size: 0.75rem; color: var(--text-secondary);">Etiquetas a Imprimir</label>
                  <select id="label-type-select" class="input-ctrl" style="padding: 0.45rem 0.75rem; font-size: 0.8rem; background: var(--bg-input);" onchange="updateLabelCalibration()">
                    <option value="both" ${state.labelConfig?.printType === 'both' ? 'selected' : ''}>Imprimir Ambos (Chapelona + Autodestrutiva)</option>
                    <option value="chapelonas" ${state.labelConfig?.printType === 'chapelonas' ? 'selected' : ''}>Apenas Chapelonas (Kit com 6)</option>
                    <option value="autodestrutivas" ${state.labelConfig?.printType === 'autodestrutivas' ? 'selected' : ''}>Apenas Autodestrutivas (Kit com 3)</option>
                  </select>
                </div>

                <div style="display:flex; flex-direction:column; gap: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 0.75rem;">
                  
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom: 0.25rem;">
                      <span>Largura Chapelona</span>
                      <span id="label-cw-text" style="color:var(--primary); font-weight:700;">${state.labelConfig?.chapelonaWidth || 110} mm</span>
                    </div>
                    <input type="range" id="label-cw-slider" min="80" max="150" value="${state.labelConfig?.chapelonaWidth || 110}" style="width:100%; accent-color:var(--primary);" oninput="updateLabelCalibration()">
                  </div>

                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom: 0.25rem;">
                      <span>Altura Chapelona</span>
                      <span id="label-ch-text" style="color:var(--primary); font-weight:700;">${state.labelConfig?.chapelonaHeight || 43} mm</span>
                    </div>
                    <input type="range" id="label-ch-slider" min="30" max="80" value="${state.labelConfig?.chapelonaHeight || 43}" style="width:100%; accent-color:var(--primary);" oninput="updateLabelCalibration()">
                  </div>

                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom: 0.25rem;">
                      <span>Largura Autodestrutiva</span>
                      <span id="label-aw-text" style="color:var(--primary); font-weight:700;">${state.labelConfig?.autodestrutivaWidth || 80} mm</span>
                    </div>
                    <input type="range" id="label-aw-slider" min="50" max="120" value="${state.labelConfig?.autodestrutivaWidth || 80}" style="width:100%; accent-color:var(--primary);" oninput="updateLabelCalibration()">
                  </div>

                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom: 0.25rem;">
                      <span>Altura Autodestrutiva</span>
                      <span id="label-ah-text" style="color:var(--primary); font-weight:700;">${state.labelConfig?.autodestrutivaHeight || 25} mm</span>
                    </div>
                    <input type="range" id="label-ah-slider" min="15" max="50" value="${state.labelConfig?.autodestrutivaHeight || 25}" style="width:100%; accent-color:var(--primary);" oninput="updateLabelCalibration()">
                  </div>

                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom: 0.25rem;">
                      <span>Espaçamento de Bordas</span>
                      <span id="label-margin-text" style="color:var(--primary); font-weight:700;">${state.labelConfig?.labelMargin || 4} mm</span>
                    </div>
                    <input type="range" id="label-margin-slider" min="0" max="15" value="${state.labelConfig?.labelMargin || 4}" style="width:100%; accent-color:var(--primary);" oninput="updateLabelCalibration()">
                  </div>

                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom: 0.25rem;">
                      <span>Margem Topo da Página</span>
                      <span id="label-pagetop-text" style="color:var(--primary); font-weight:700;">${state.labelConfig?.pageMarginTop || 5} mm</span>
                    </div>
                    <input type="range" id="label-pagetop-slider" min="0" max="20" value="${state.labelConfig?.pageMarginTop || 5}" style="width:100%; accent-color:var(--primary);" oninput="updateLabelCalibration()">
                  </div>

                </div>

                <div style="display:flex; flex-direction:column; gap: 0.75rem; margin-top:0.5rem;">
                  ${order.selectedLabels.includes('chapelona') ? `
                    <button type="button" class="btn btn-primary" onclick="printPhysicalLabels('chapelonas')" style="background:linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); border:none; box-shadow:0 4px 15px rgba(6,182,212,0.3); font-weight:700; gap:0.5rem; justify-content:center; padding: 0.75rem 1rem; flex-direction: column; align-items: center; line-height: 1.2;">
                      <div style="display:flex; align-items:center; gap:0.5rem; font-size: 0.85rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        IMPRIMIR APENAS CHAPELONAS
                      </div>
                      <span style="font-size:0.62rem; font-weight:normal; opacity:0.85; text-transform:none;">Bobina 110x43mm - Material Plástico</span>
                    </button>
                  ` : ""}

                  ${order.selectedLabels.includes('destrutiva') ? `
                    <button type="button" class="btn btn-primary" onclick="printPhysicalLabels('autodestrutivas')" style="background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border:none; box-shadow:0 4px 15px rgba(59,130,246,0.3); font-weight:700; gap:0.5rem; justify-content:center; padding: 0.75rem 1rem; flex-direction: column; align-items: center; line-height: 1.2;">
                      <div style="display:flex; align-items:center; gap:0.5rem; font-size: 0.85rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        IMPRIMIR APENAS DESTRUTIVAS
                      </div>
                      <span style="font-size:0.62rem; font-weight:normal; opacity:0.85; text-transform:none;">Bobina 80x25mm - Material Destrutível</span>
                    </button>
                  ` : ""}
                </div>

              </div>
            ` : ""}

          </div>

        </div>

        <!-- VISUAL SIMULATOR FOR TAPE ROLL -->
        ${inhouseTypes.length > 0 ? `
          <div style="margin-top: 2.5rem;" class="no-print">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.25rem; color:var(--text-primary);">Simulador do Rolo Térmico</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Veja em tempo real a simulação física das etiquetas baseada nos valores milimétricos acima.</p>
            
            <div id="labels-simulator-wrapper" style="background: #cbd5e1; border-radius: var(--radius-lg); padding: 1.5rem; border: 3px dashed #94a3b8; display:flex; flex-direction:column; align-items:center; gap: 1.5rem; max-height: 450px; overflow-y:auto;">
              <!-- Rendered dynamically -->
            </div>
          </div>
        ` : ""}
      </div>
    </div>

    <!-- PANEL 3: BLOCKS & BUNDLES -->
    <div id="step-blocks" class="step-panel ${state.activeStep === "blocks" ? "active" : ""}">
      <div class="glass-card">
        <h3 style="font-family: var(--font-heading); font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">Empacotamento e Blocagem Sequencial</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">O sistema divide os chassis automaticamente em lotes e calcula as capas de identificação para evitar anotações à mão.</p>

        <div class="panel-grid no-print" style="margin-bottom: 2rem;">
          
          <div class="panel-section">
            <form onsubmit="handleUpdateBlocksConfig(event)" style="background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:1rem; color:var(--primary);">Configurar Divisão de Lotes</h4>
              <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label for="cfg-block-size">Chassis por Bloco</label>
                  <input type="number" id="cfg-block-size" class="input-ctrl" value="${order.blocksConfig.size}" min="1" required>
                </div>
                <div class="form-group">
                  <label for="cfg-block-prefix">Prefixo Sequencial</label>
                  <input type="text" id="cfg-block-prefix" class="input-ctrl" value="${order.blocksConfig.prefix}" placeholder="Ex: T1" required>
                </div>
                <div class="form-group">
                  <label for="cfg-block-start">Numeração Inicial</label>
                  <input type="number" id="cfg-block-start" class="input-ctrl" value="${order.blocksConfig.startIndex}" min="0" required>
                </div>
              </div>
              <div style="display:flex; justify-content:flex-end; margin-top: 1rem;">
                <button type="submit" class="btn btn-secondary btn-icon" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
                  Recalcular Blocos
                </button>
              </div>
            </form>
          </div>

          <div class="panel-section" style="justify-content: center;">
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <button class="btn btn-primary" onclick="printBlockCovers()" style="gap: 0.5rem; font-size: 0.95rem; padding: 0.8rem 1.5rem; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.35);">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                IMPRIMIR TODAS AS CAPAS DE BLOCO
              </button>
              <span style="font-size:0.7rem; color:var(--text-secondary); text-align:center;">Gera as etiquetas de lote em tamanho A4 para anexar no pacote de cada bloco.</span>
            </div>
          </div>

        </div>

        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem; color:var(--text-primary);" class="no-print">Lotes e Identificações Geradas</h4>
        
        <div class="block-grid no-print" style="margin-bottom: 2rem;">
          ${order.blocks.map(b => `
            <div class="block-card">
              <div class="block-card-header">
                <span class="block-number">Bloco 0${b.number || ""}</span>
                <span class="block-seq-badge">${b.seqRange || ""}</span>
              </div>
              <div class="block-details">
                <div class="block-detail-row">
                  <span>Qtd de Chassis:</span>
                  <span>${b.total || 0} un</span>
                </div>
                <div class="block-detail-row">
                  <span>Chassis Inicial (Últimos 8):</span>
                  <span><code style="font-family: monospace;">${(b.chassisStart || "").slice(-8)}</code></span>
                </div>
                <div class="block-detail-row">
                  <span>Chassis Final (Últimos 8):</span>
                  <span><code style="font-family: monospace;">${(b.chassisEnd || "").slice(-8)}</code></span>
                </div>
              </div>
              
              <div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                <span style="font-size:0.75rem; font-weight:700; color:var(--primary); display:block; margin-bottom:0.4rem;">Chassis do Lote (Últimos 8 destacados):</span>
                <div style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 0.4rem 0.5rem; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 0.25rem;">
                  ${(b.items || []).map((ch, idx) => {
                    const last8 = ch.length >= 8 ? ch.slice(-8) : ch;
                    const basePart = ch.length >= 8 ? ch.slice(0, -8) : "";
                    return `
                      <div style="display:flex; justify-content:space-between; font-family:monospace; font-size:0.72rem; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 2px; align-items:center;">
                        <span style="color:var(--text-secondary);"><span style="color:var(--text-muted); font-size:0.65rem;">[${String(idx + 1).padStart(2, "0")}]</span> ${basePart}</span>
                        <strong style="color:var(--primary); background:rgba(6,182,212,0.15); padding:1px 4px; border-radius:2px; font-size:0.72rem;">${last8}</strong>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
          `).join("")}
        </div>

        <div style="border-top: 1px solid var(--border-light); padding-top: 1.5rem;" class="step-panel-actions no-print">
          <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem;">Controle da Etapa:</h4>
          <div class="checkbox-group" style="background: none; border: none; padding: 0;">
            <label class="checkbox-ctrl">
              <input type="checkbox" id="chk-blocks-printed" ${order.subtasks.blocksPrinted ? "checked" : ""} onchange="updateSubtask('blocksPrinted', this.checked)">
              <div>
                <span class="checkbox-label" style="font-weight:700;">CAPAS DE BLOCOS IMPRESSAS E EMPACOTADAS</span>
                <span class="checkbox-sublabel">Blocos separados fisicamente e capas anexadas</span>
              </div>
            </label>
          </div>

          ${stepBlocksCompleted ? `
            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
              <button class="btn btn-primary" onclick="switchFlowStep('billing')">Avançar para Fechamento & Financeiro &rarr;</button>
            </div>
          ` : ""}
        </div>
      </div>
    </div>

    <!-- PANEL 4: BILLING & FINANCIAL -->
    <div id="step-billing" class="step-panel ${state.activeStep === "billing" ? "active" : ""}">
      <div class="finance-split no-print" style="margin-bottom: 2rem;">
        
        <div class="panel-section">
          <div class="glass-card" style="margin-bottom: 0; padding: 1.5rem;">
            <h3 style="font-family: var(--font-heading); font-weight: 700; color: var(--primary); margin-bottom: 1rem; border-bottom:1px solid var(--border-light); padding-bottom:0.5rem;">Faturamento do Pedido</h3>
            
            <div style="display:flex; flex-direction:column; gap: 0.75rem; margin-bottom: 1.5rem;">
              <h4 style="font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase;">Resumo de Faturamento (Valores baseados nas Configurações)</h4>
              
              <table class="price-table" style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>Etiqueta</th>
                    <th style="text-align:center;">Qtd</th>
                    <th style="text-align:right;">Unitário</th>
                    <th style="text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.selectedLabels.map(l => {
                    const price = state.settings.prices[l] || 0;
                    const total = price * order.totalChassis;
                    return `
                      <tr>
                        <td>${l.toUpperCase()}</td>
                        <td style="text-align:center;">${order.totalChassis}</td>
                        <td style="text-align:right;">${formatCurrency(price)}</td>
                        <td style="text-align:right; font-weight:600; color:#fff;">${formatCurrency(total)}</td>
                      </tr>
                    `;
                  }).join("")}
                  <tr style="font-size: 1rem; font-weight:800; border-top: 2px solid var(--border-light);">
                    <td colspan="3" style="color:var(--primary);">VALOR TOTAL DA NOTA DE DÉBITO:</td>
                    <td style="text-align:right; color:var(--success); font-family:var(--font-heading); font-size: 1.15rem;">${formatCurrency(calculateOrderTotal(order))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem;">Checklist Faturamento:</h4>
            <div class="checkbox-group" style="background: none; border: none; padding: 0; margin-bottom: 1.5rem;">
              <label class="checkbox-ctrl">
                <input type="checkbox" id="chk-invoice-issued" ${order.subtasks.invoiceIssued ? "checked" : ""} onchange="updateSubtask('invoiceIssued', this.checked)">
                <div>
                  <span class="checkbox-label">Nota Fiscal (NF) Emitida</span>
                  <span class="checkbox-sublabel">Lançada no SEFAZ com chave anexada</span>
                </div>
              </label>
              <label class="checkbox-ctrl">
                <input type="checkbox" id="chk-debitnote-sent" ${order.subtasks.debitNoteSent ? "checked" : ""} onchange="updateSubtask('debitNoteSent', this.checked)">
                <div>
                  <span class="checkbox-label">Nota de Débito Enviada ao Cliente</span>
                  <span class="checkbox-sublabel">PDF enviado por e-mail para faturamento</span>
                </div>
              </label>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--border-light); padding-top: 1.5rem;">
              <button class="btn btn-secondary" onclick="printDebitNote()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                IMPRIMIR NOTA DE DÉBITO
              </button>

              ${order.status === "Finalizado" ? `
                <span class="badge badge-emerald" style="padding: 0.5rem 1rem;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Pedido Concluído</span>
              ` : stepBillingCompleted ? `
                <button class="btn btn-success" onclick="handleFinishOrder('${order.id}')">
                  CONCLUIR E ARQUIVAR PEDIDO
                </button>
              ` : ""}
            </div>
          </div>
        </div>

        <!-- Note Document Live Preview on Screen -->
        <div class="panel-section" style="position: relative;">
          <div class="preview-badge-overlay">PREVISÃO DO DOCUMENTO</div>
          <div class="debit-note-preview">
            ${generateDebitNotePreviewHtml(order)}
          </div>
        </div>

      </div>
    </div>

    <!-- PRINT ONLY AREA -->
    <div class="printable-area">
      <!-- Generates dynamic block covers during printing -->
      <div class="print-blocks-container" id="printable-blocks-wrapper"></div>
      
      <!-- Generates dynamic debit note during printing -->
      <div class="print-debit-note" id="printable-debit-note-wrapper"></div>

      <!-- Generates dynamic physical labels during printing -->
      <div class="print-labels-container" id="printable-labels-wrapper"></div>
    </div>
  `;
  wrapper.innerHTML = html;
  renderLabelPreview();
}

// Helper to calculate total for billing
function calculateOrderTotal(order) {
  let total = 0;
  order.selectedLabels.forEach(l => {
    const price = state.settings.prices[l] || 0;
    total += price * order.totalChassis;
  });
  return total;
}

// Generate the beautiful WhatsApp string
function generateWhatsAppText(order) {
  const outsourceTypes = order.selectedLabels.filter(l => !["chapelona", "destrutiva"].includes(l));
  if (outsourceTypes.length === 0) return "Nenhuma etiqueta terceirizada cadastrada neste pedido.";

  let text = `*SOLICITAÇÃO DE PRODUTOS - GRÁFICA EXTERNA*\n\n`;
  text += `*Cliente:* ${order.client}\n`;
  text += `*Ref. Pedido:* ${order.po}\n`;
  text += `*Total de Chassis:* ${order.totalChassis} unidades\n\n`;
  text += `------------------------------------\n`;
  text += `Prezados, favor produzir as seguintes quantidades e modelos de etiquetas para este lote de chassis:\n\n`;

  outsourceTypes.forEach(t => {
    const labelLabel = t.replace("consumo", "Consumo e Energia")
                       .replace("seguranca", "Segurança (Inviolável)")
                       .replace("pneus", "Pressão de Pneus")
                       .replace("garantia", "Garantia");
    text += `*• ${labelLabel}:* ${order.totalChassis} unidades\n`;
  });

  text += `\n*Prazo de Entrega:* Conforme acordado em contrato comercial.\n`;
  text += `Favor acusar o recebimento e confirmar a data de entrega.\n\n`;
  text += `Atenciosamente,\n`;
  text += `${state.settings.company.name}`;
  
  return text;
}

function copyWhatsAppToClipboard() {
  const textElement = document.getElementById("whatsapp-message-text");
  if (!textElement) return;

  const range = document.createRange();
  range.selectNode(textElement);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  try {
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    alert("Texto copiado para a área de transferência! Cole diretamente no WhatsApp do seu contato da gráfica.");
  } catch (err) {
    alert("Não foi possível copiar automaticamente. Selecione o texto e use Ctrl+C.");
  }
}

// --- FINANCIAL DEBIT NOTE PREVIEW GENERATOR ---
function generateDebitNotePreviewHtml(order) {
  const total = calculateOrderTotal(order);
  const now = new Date();
  
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0f172a; padding-bottom:1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 style="font-family:'Outfit', sans-serif; font-size:16pt; font-weight:800; color:#0f172a; margin:0;">${state.settings.company.name}</h2>
        <span style="font-size: 8pt; color: #475569;">CNPJ: ${state.settings.company.cnpj} | Fone: ${state.settings.company.phone}</span><br>
        <span style="font-size: 7.5pt; color: #64748b;">${state.settings.company.address}</span>
      </div>
      <div style="text-align:right;">
        <h2 style="font-family:'Outfit', sans-serif; font-size:16pt; font-weight:800; color:#0f172a; margin:0;">NOTA DE DÉBITO</h2>
        <span style="font-size: 9pt; color:#475569; font-weight:600;">N° ND-${order.id.substring(order.id.length - 6)}</span>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; font-size: 9pt; line-height: 1.4;">
      <div>
        <h4 style="font-size: 8.5pt; text-transform:uppercase; color:#64748b; margin-bottom:0.25rem; border-bottom:1px solid #e2e8f0; padding-bottom:2px;">Sacado / Devedor</h4>
        <strong>${order.client}</strong><br>
        <span>Pedido / PO: <code>${order.po}</code></span><br>
        <span>Quantidade: ${order.totalChassis} chassis cadastrados</span>
      </div>
      <div>
        <h4 style="font-size: 8.5pt; text-transform:uppercase; color:#64748b; margin-bottom:0.25rem; border-bottom:1px solid #e2e8f0; padding-bottom:2px;">Dados do Documento</h4>
        <span>Data de Emissão: ${formatDate(now).split(" ")[0]}</span><br>
        <span>Vencimento: Contra Apresentação</span><br>
        <span>Moeda: Real (R$)</span>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size: 8.5pt; margin-bottom:1.5rem;">
      <thead>
        <tr style="background:#f1f5f9; font-weight:bold; color:#475569;">
          <th style="padding: 0.5rem; border-bottom:1px solid #cbd5e1; text-align:left;">Descrição das Despesas Reembolsáveis</th>
          <th style="padding: 0.5rem; border-bottom:1px solid #cbd5e1; text-align:center; width: 60px;">Qtd</th>
          <th style="padding: 0.5rem; border-bottom:1px solid #cbd5e1; text-align:right; width: 100px;">Val. Unit.</th>
          <th style="padding: 0.5rem; border-bottom:1px solid #cbd5e1; text-align:right; width: 110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.selectedLabels.map(l => {
          const price = state.settings.prices[l] || 0;
          const labelLabel = l.replace("chapelona", "Etiqueta Chapelona (Confecção Interna)")
                             .replace("destrutiva", "Etiqueta Autodestrutiva (Confecção Interna)")
                             .replace("consumo", "Etiqueta Consumo e Energia (Reembolso)")
                             .replace("seguranca", "Etiqueta de Segurança (Reembolso)")
                             .replace("pneus", "Etiqueta Pressão de Pneus (Reembolso)")
                             .replace("garantia", "Etiqueta de Garantia (Reembolso)");
          return `
            <tr>
              <td style="padding:0.5rem; border-bottom:1px solid #e2e8f0; color:#334155;">${labelLabel}</td>
              <td style="padding:0.5rem; border-bottom:1px solid #e2e8f0; text-align:center; color:#334155;">${order.totalChassis}</td>
              <td style="padding:0.5rem; border-bottom:1px solid #e2e8f0; text-align:right; color:#334155;">${formatCurrency(price)}</td>
              <td style="padding:0.5rem; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:600; color:#0f172a;">${formatCurrency(price * order.totalChassis)}</td>
            </tr>
          `;
        }).join("")}
        <tr style="font-weight:bold; font-size:10pt;">
          <td colspan="3" style="padding:0.75rem 0.5rem; text-align:left; border-top:2px solid #0f172a;">VALOR TOTAL DO REEMBOLSO:</td>
          <td style="padding:0.75rem 0.5rem; text-align:right; color:#0f172a; border-top:2px solid #0f172a; font-size: 11pt;">${formatCurrency(total)}</td>
        </tr>
      </tbody>
    </table>

    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.75rem; font-size:8pt; color:#475569; line-height:1.5;">
      <h5 style="margin:0 0 0.25rem 0; font-size:8.5pt; color:#0f172a;">DADOS PARA DEPÓSITO OU TRANSFERÊNCIA</h5>
      <span>Favor efetuar o reembolso na seguinte conta bancária comercial:</span><br>
      <strong>Banco:</strong> ${state.settings.bank.name} | 
      <strong>Agência:</strong> ${state.settings.bank.agency} | 
      <strong>Conta:</strong> ${state.settings.bank.account}<br>
      <strong>Chave PIX Comercial:</strong> <code style="background:#e2e8f0; padding:1px 3px; border-radius:3px;">${state.settings.bank.pix}</code>
    </div>

    <div style="margin-top: 1.5rem; font-size: 7.5pt; color:#94a3b8; text-align:center; border-top:1px dashed #cbd5e1; padding-top:0.75rem;">
      Esta Nota de Débito destina-se exclusivamente ao ressarcimento de despesas acessórias e de fabricação de insumos.
    </div>
  `;
}

// --- PRINTING IMPLEMENTATION ---
function printBlockCovers() {
  const order = state.orders.find(o => o.id === state.activeOrderId);
  if (!order) return;

  const wrapper = document.getElementById("printable-blocks-wrapper");
  const dnWrapper = document.getElementById("printable-debit-note-wrapper");

  // Empty out the printable debit note wrapper first
  dnWrapper.innerHTML = "";

  // Render the covers
  let html = `<div class="print-blocks-container">`;
  order.blocks.forEach(b => {
    html += `
      <div class="print-block-cover">
        <div class="print-block-title">Etiqueta de Identificação de Lote</div>
        <div style="font-size: 16pt; font-weight: 600; margin-bottom: 0.5rem;">${order.client}</div>
        <div style="font-size: 12pt; color: #555; margin-bottom: 1.5rem;">Referência PO: <code>${order.po}</code></div>
        
        <div style="font-size: 14pt; color: #555; margin-top: 1rem;">DIVISÃO SEQUENCIAL DO BLOCO</div>
        <div class="print-block-seq">${b.seqRange}</div>

        <div class="print-block-meta">
          <div><span>Bloco N°:</span> 0${b.number || ""}</div>
          <div><span>Quantidade:</span> ${b.total || 0} unidades</div>
          <div><span>Chassis Inicial (Últimos 8):</span> ${(b.chassisStart || "").slice(-8)}</div>
          <div><span>Chassis Final (Últimos 8):</span> ${(b.chassisEnd || "").slice(-8)}</div>
        </div>

        <div class="print-block-chassis-list">
          ${(b.items || []).map((c, i) => {
            const last8 = c.length >= 8 ? c.slice(-8) : c;
            const prefix = c.length >= 8 ? c.slice(0, -8) : "";
            return `[${String(i + 1).padStart(2, "0")}] ${prefix}<strong>${last8}</strong>`;
          }).join("<br>")}
        </div>

        <div style="margin-top: 3rem; font-size: 10pt; color: #666; border-top: 1px solid #ccc; padding-top: 1rem;">
          Gerado automaticamente via EtiquetaFlow em ${formatDate(new Date()).split(" ")[0]}
        </div>
      </div>
    `;
  });
  html += `</div>`;
  
  wrapper.innerHTML = html;
  
  // Call browser print dialogue
  window.print();
}

function printDebitNote() {
  const order = state.orders.find(o => o.id === state.activeOrderId);
  if (!order) return;

  const wrapper = document.getElementById("printable-blocks-wrapper");
  const dnWrapper = document.getElementById("printable-debit-note-wrapper");

  // Empty out the printable blocks wrapper first
  wrapper.innerHTML = "";

  // Populate printable Debit Note
  const now = new Date();
  const total = calculateOrderTotal(order);
  
  dnWrapper.innerHTML = `
    <div class="dn-header">
      <div class="dn-logo-area">
        <span class="dn-logo-title">${state.settings.company.name}</span>
        <span class="dn-logo-sub">DEPARTAMENTO DE FATURAMENTO E LOGÍSTICA</span>
      </div>
      <div class="dn-title-block">
        <span class="dn-title">NOTA DE DÉBITO</span>
        <span class="dn-subtitle">ND-${order.id.substring(order.id.length - 6)}</span>
      </div>
    </div>

    <div class="dn-info-grid">
      <div class="dn-info-card">
        <h4>Devedor / Cliente</h4>
        <p>
          <strong>${order.client}</strong><br>
          Referência / Pedido: <code>${order.po}</code><br>
          Quantidade de Chassis: ${order.totalChassis} unidades
        </p>
      </div>
      <div class="dn-info-card">
        <h4>Especificação do Documento</h4>
        <p>
          Data de Emissão: ${formatDate(now).split(" ")[0]}<br>
          Vencimento: Contra Apresentação<br>
          Tipo de Faturamento: Reembolso de Despesas / Manufatura Acessória
        </p>
      </div>
    </div>

    <table class="dn-table">
      <thead>
        <tr>
          <th>Especificação dos Itens Reembolsáveis / Produção</th>
          <th style="text-align:center; width:80px;">Quantidade</th>
          <th style="text-align:right; width:120px;">Valor Unitário</th>
          <th style="text-align:right; width:150px;">Valor Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.selectedLabels.map(l => {
          const price = state.settings.prices[l] || 0;
          const labelLabel = l.replace("chapelona", "Etiqueta Chapelona (Confecção Interna)")
                             .replace("destrutiva", "Etiqueta Autodestrutiva (Confecção Interna)")
                             .replace("consumo", "Etiqueta Consumo e Energia (Terceirizado)")
                             .replace("seguranca", "Etiqueta de Segurança (Terceirizado)")
                             .replace("pneus", "Etiqueta Pressão de Pneus (Terceirizado)")
                             .replace("garantia", "Etiqueta de Garantia (Terceirizado)");
          return `
            <tr>
              <td>${labelLabel}</td>
              <td style="text-align:center;">${order.totalChassis}</td>
              <td style="text-align:right;">${formatCurrency(price)}</td>
              <td style="text-align:right; font-weight:bold; color:#000;">${formatCurrency(price * order.totalChassis)}</td>
            </tr>
          `;
        }).join("")}
        <tr class="total-row">
          <td colspan="3" style="text-align:left;">VALOR TOTAL A REEMBOLSAR:</td>
          <td style="text-align:right;">${formatCurrency(total)}</td>
        </tr>
      </tbody>
    </table>

    <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:1.25rem; font-size:10pt; line-height:1.6; margin-bottom:3rem;">
      <h5 style="margin:0 0 0.5rem 0; font-size:11pt; font-weight:bold; color:#0f172a; border-bottom:1px solid #cbd5e1; padding-bottom:0.25rem;">INSTRUÇÕES PARA PAGAMENTO</h5>
      Favor realizar o crédito em conta corrente comercial do emissor da Nota de Débito:<br>
      <strong>Instituição Bancária:</strong> ${state.settings.bank.name}<br>
      <strong>Agência Bancária:</strong> ${state.settings.bank.agency} | <strong>Conta Corrente:</strong> ${state.settings.bank.account}<br>
      <strong>Chave PIX para Faturamento:</strong> <code>${state.settings.bank.pix}</code>
    </div>

    <div class="dn-footer">
      <div style="text-align:center; margin-bottom:2rem; margin-top:4rem;">
        <div style="width:250px; border-bottom:1px solid #000; margin:0 auto 0.5rem auto;"></div>
        <span>Departamento Financeiro - ${state.settings.company.name}</span>
      </div>
      <p style="font-size:8pt; text-align:center;">
        Nota de Débito isenta de tributação por se tratar de simples ressarcimento de insumos de custos incidentes sobre a operação logística principal.
      </p>
    </div>
  `;

  // Trigger browser print
  window.print();
}

function handleFinishOrder(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  if (confirm("Tem certeza que deseja concluir e arquivar este pedido? O status passará para 'Finalizado'.")) {
    order.status = "Finalizado";
    saveData();
    viewOrderDetails(orderId);
  }
}

// --- SETTINGS CONTROLLER ---
function populateSettingsForm() {
  const prices = state.settings.prices;
  const company = state.settings.company;
  const bank = state.settings.bank;

  document.getElementById("price-chapelona").value = prices.chapelona;
  document.getElementById("price-destrutiva").value = prices.destrutiva;
  document.getElementById("price-consumo").value = prices.consumo;
  document.getElementById("price-seguranca").value = prices.seguranca;
  document.getElementById("price-pneus").value = prices.pneus;
  document.getElementById("price-garantia").value = prices.garantia;

  document.getElementById("company-name").value = company.name;
  document.getElementById("company-cnpj").value = company.cnpj;
  document.getElementById("company-phone").value = company.phone;
  document.getElementById("company-address").value = company.address;

  document.getElementById("bank-name").value = bank.name;
  document.getElementById("bank-agency").value = bank.agency;
  document.getElementById("bank-account").value = bank.account;
  document.getElementById("bank-pix").value = bank.pix;
}

function handleSaveSettings(e) {
  e.preventDefault();

  state.settings.prices.chapelona = parseFloat(document.getElementById("price-chapelona").value) || 0;
  state.settings.prices.destrutiva = parseFloat(document.getElementById("price-destrutiva").value) || 0;
  state.settings.prices.consumo = parseFloat(document.getElementById("price-consumo").value) || 0;
  state.settings.prices.seguranca = parseFloat(document.getElementById("price-seguranca").value) || 0;
  state.settings.prices.pneus = parseFloat(document.getElementById("price-pneus").value) || 0;
  state.settings.prices.garantia = parseFloat(document.getElementById("price-garantia").value) || 0;

  state.settings.company.name = document.getElementById("company-name").value;
  state.settings.company.cnpj = document.getElementById("company-cnpj").value;
  state.settings.company.phone = document.getElementById("company-phone").value;
  state.settings.company.address = document.getElementById("company-address").value;

  state.settings.bank.name = document.getElementById("bank-name").value;
  state.settings.bank.agency = document.getElementById("bank-agency").value;
  state.settings.bank.account = document.getElementById("bank-account").value;
  state.settings.bank.pix = document.getElementById("bank-pix").value;

  saveData();
  alert("Todas as configurações e preços foram atualizados com sucesso!");
  switchTab("dashboard");
}

// --- PHYSICAL THERMAL LABEL GENERATOR & PREVIEW SYSTEM ---
function updateLabelCalibration() {
  const brand = document.getElementById("label-brand-input")?.value || "GAC MOTOR";
  const font = document.getElementById("label-font-select")?.value || "Wallpoet";
  const type = document.getElementById("label-type-select")?.value || "both";
  const cw = parseInt(document.getElementById("label-cw-slider")?.value) || 110;
  const ch = parseInt(document.getElementById("label-ch-slider")?.value) || 43;
  const aw = parseInt(document.getElementById("label-aw-slider")?.value) || 80;
  const ah = parseInt(document.getElementById("label-ah-slider")?.value) || 25;
  const margin = parseInt(document.getElementById("label-margin-slider")?.value) || 4;
  const pageTop = parseInt(document.getElementById("label-pagetop-slider")?.value) || 5;

  state.labelConfig = {
    brandName: brand.toUpperCase(),
    selectedFont: font,
    printType: type,
    chapelonaWidth: cw,
    chapelonaHeight: ch,
    autodestrutivaWidth: aw,
    autodestrutivaHeight: ah,
    labelMargin: margin,
    pageMarginTop: pageTop
  };

  // Update dynamic values text on screen
  const elCwText = document.getElementById("label-cw-text");
  if (elCwText) elCwText.textContent = `${cw} mm`;
  const elChText = document.getElementById("label-ch-text");
  if (elChText) elChText.textContent = `${ch} mm`;
  const elAwText = document.getElementById("label-aw-text");
  if (elAwText) elAwText.textContent = `${aw} mm`;
  const elAhText = document.getElementById("label-ah-text");
  if (elAhText) elAhText.textContent = `${ah} mm`;
  const elMarginText = document.getElementById("label-margin-text");
  if (elMarginText) elMarginText.textContent = `${margin} mm`;
  const elPagetopText = document.getElementById("label-pagetop-text");
  if (elPagetopText) elPagetopText.textContent = `${pageTop} mm`;

  // Re-generate the simulated preview
  renderLabelPreview();
}

function renderLabelPreview() {
  const container = document.getElementById("labels-simulator-wrapper");
  if (!container) return;

  const order = state.orders.find(o => o.id === state.activeOrderId);
  if (!order) {
    container.innerHTML = "<span>Nenhum pedido ativo.</span>";
    return;
  }

  const inhouseTypes = order.selectedLabels.filter(l => ["chapelona", "destrutiva"].includes(l));
  if (inhouseTypes.length === 0) {
    container.innerHTML = "<span style='color: var(--text-secondary); font-size: 0.85rem;'>Nenhuma etiqueta Chapelona ou Autodestrutiva selecionada para este pedido.</span>";
    return;
  }

  const {
    brandName,
    selectedFont,
    printType,
    chapelonaWidth,
    chapelonaHeight,
    autodestrutivaWidth,
    autodestrutivaHeight,
    labelMargin
  } = state.labelConfig;

  // Limit on-screen preview to first 2 chassis for extreme snappiness
  const previewChassis = order.chassisList.slice(0, 2);

  let html = "";
  
  // Dynamic font stack helper
  const fontStyle = selectedFont === 'Wallpoet' ? "font-family: 'Wallpoet', sans-serif;" : selectedFont === 'Allerta' ? "font-family: 'Allerta Stencil', sans-serif;" : "font-family: monospace;";

  previewChassis.forEach((ch, idx) => {
    const last8 = ch.length >= 8 ? ch.slice(-8) : ch;
    const year = new Date(order.date).getFullYear().toString(); // use date of order as year fallback

    html += `
      <div style="background: #ffffff; padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); width: 100%; max-width: 500px; border: 1px solid #cbd5e1; box-sizing: border-box; color: #1e293b;">
        <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; display: flex; justify-content: space-between;">
          <span>ETIQUETAS DO CHASSI #${idx + 1}</span>
          <span style="color: var(--primary); font-family: monospace;">${ch}</span>
        </div>
    `;

    // 1. Chapelonas
    if ((printType === 'both' || printType === 'chapelonas') && order.selectedLabels.includes('chapelona')) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: #0891b2; margin-bottom: 6px; text-transform: uppercase;">Etiquetas Chapelonas (Kit com 6)</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; justify-items: center;">
            ${[...Array(6)].map(() => `
              <div style="width: 100%; height: 42px; border: 1.5px dashed #3b82f6; border-radius: 3px; background: #ffffff; display: flex; align-items: center; justify-content: center; box-sizing: border-box; padding: 2px; overflow: hidden;">
                <span style="${fontStyle} font-size: 13px; font-weight: bold; color: #000; letter-spacing: 0.5px; text-align: center;">*${last8}*</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    // 2. Autodestrutivas
    if ((printType === 'both' || printType === 'autodestrutivas') && order.selectedLabels.includes('destrutiva')) {
      html += `
        <div>
          <div style="font-size: 0.7rem; font-weight: 800; color: #0891b2; margin-bottom: 6px; text-transform: uppercase;">Etiquetas Auto-destrutivas (Kit com 3)</div>
          <div style="display: flex; gap: 8px; justify-content: center; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            
            <!-- Label 1: Top (8 + Year) -->
            <div style="width: 120px; height: 36px; border: 1.5px solid #244b7a; border-radius: 5px; background: #ffffff; display: flex; flex-direction: row; align-items: center; justify-content: space-between; box-sizing: border-box; overflow: hidden;">
              <div style="writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; font-size: 4px; font-weight: 900; color: #244b7a; border-right: 1px solid rgba(36, 75, 122, 0.3); height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 2px; background: rgba(36, 75, 122, 0.05); flex-shrink: 0;">GAC</div>
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; gap: 0px;">
                <span style="${fontStyle} font-size: 9px; font-weight: bold; color: #000;">${last8}</span>
                <span style="font-family: 'Ubuntu Mono', monospace; font-size: 6px; font-weight: bold; color: #475569;">*${year}*</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 2px; border-left: 1px solid rgba(36, 75, 122, 0.3); height: 100%; flex-shrink: 0;">
                <svg viewBox="0 0 100 60" width="16" height="10"><ellipse cx="50" cy="30" rx="36" ry="24" fill="none" stroke="#244b7a" stroke-width="6" /><path d="M 34 30 Q 34 18 50 18 C 62 18 64 26 64 26 L 52 28 Q 50 24 45 24 Q 40 24 40 32 Q 40 40 46 40 C 52 40 54 34 54 34 L 46 34" fill="none" stroke="#244b7a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </div>
            </div>

            <!-- Label 2: Middle (8 only) -->
            <div style="width: 120px; height: 36px; border: 1.5px solid #244b7a; border-radius: 5px; background: #ffffff; display: flex; flex-direction: row; align-items: center; justify-content: space-between; box-sizing: border-box; overflow: hidden;">
              <div style="writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; font-size: 4px; font-weight: 900; color: #244b7a; border-right: 1px solid rgba(36, 75, 122, 0.3); height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 2px; background: rgba(36, 75, 122, 0.05); flex-shrink: 0;">GAC</div>
              <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2px;">
                <span style="${fontStyle} font-size: 10px; font-weight: bold; color: #000;">${last8}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 2px; border-left: 1px solid rgba(36, 75, 122, 0.3); height: 100%; flex-shrink: 0;">
                <svg viewBox="0 0 100 60" width="16" height="10"><ellipse cx="50" cy="30" rx="36" ry="24" fill="none" stroke="#244b7a" stroke-width="6" /><path d="M 34 30 Q 34 18 50 18 C 62 18 64 26 64 26 L 52 28 Q 50 24 45 24 Q 40 24 40 32 Q 40 40 46 40 C 52 40 54 34 54 34 L 46 34" fill="none" stroke="#244b7a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </div>
            </div>

            <!-- Label 3: Bottom (Full 17) -->
            <div style="width: 120px; height: 36px; border: 1.5px solid #244b7a; border-radius: 5px; background: #ffffff; display: flex; flex-direction: row; align-items: center; justify-content: space-between; box-sizing: border-box; overflow: hidden;">
              <div style="writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; font-size: 4px; font-weight: 900; color: #244b7a; border-right: 1px solid rgba(36, 75, 122, 0.3); height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 2px; background: rgba(36, 75, 122, 0.05); flex-shrink: 0;">GAC</div>
              <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2px; overflow: hidden;">
                <span style="font-family: 'Ubuntu Mono', monospace; font-size: 5px; font-weight: bold; color: #000; letter-spacing: 0px; white-space: nowrap;">${ch}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 2px; border-left: 1px solid rgba(36, 75, 122, 0.3); height: 100%; flex-shrink: 0;">
                <svg viewBox="0 0 100 60" width="16" height="10"><ellipse cx="50" cy="30" rx="36" ry="24" fill="none" stroke="#244b7a" stroke-width="6" /><path d="M 34 30 Q 34 18 50 18 C 62 18 64 26 64 26 L 52 28 Q 50 24 45 24 Q 40 24 40 32 Q 40 40 46 40 C 52 40 54 34 54 34 L 46 34" fill="none" stroke="#244b7a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </div>
            </div>

          </div>
        </div>
      `;
    }

    html += `</div>`;
  });

  if (order.chassisList.length > 2) {
    html += `
      <div style="color: #64748b; font-size: 0.72rem; font-style: italic; margin-top: 4px; text-align: center;">
        Exibindo os primeiros 2 chassis para pré-visualização. Todos os ${order.totalChassis} chassis serão impressos no lote físico.
      </div>
    `;
  }

  container.innerHTML = html;
}

function printPhysicalLabels(forceType) {
  const order = state.orders.find(o => o.id === state.activeOrderId);
  if (!order) return;

  const wrapper = document.getElementById("printable-blocks-wrapper");
  const dnWrapper = document.getElementById("printable-debit-note-wrapper");
  const labelWrapper = document.getElementById("printable-labels-wrapper");

  if (!labelWrapper) {
    alert("Erro interno: container de etiquetas não encontrado no DOM!");
    return;
  }

  // Clear out other print layouts
  if (wrapper) wrapper.innerHTML = "";
  if (dnWrapper) dnWrapper.innerHTML = "";

  const {
    brandName,
    selectedFont,
    printType,
    chapelonaWidth,
    chapelonaHeight,
    autodestrutivaWidth,
    autodestrutivaHeight,
    labelMargin,
    pageMarginTop
  } = state.labelConfig;

  const activePrintType = forceType || printType;
  const fontStyle = selectedFont === 'Wallpoet' ? "font-family: 'Wallpoet', sans-serif;" : selectedFont === 'Allerta' ? "font-family: 'Allerta Stencil', sans-serif;" : "font-family: monospace;";

  let html = "";

  // Render 100% of the chassis list
  order.chassisList.forEach((ch) => {
    const last8 = ch.length >= 8 ? ch.slice(-8) : ch;
    const year = new Date(order.date).getFullYear().toString();

    html += `<div class="print-kit-wrapper" style="padding-top: ${pageMarginTop}mm !important;">`;

    // 1. Chapelonas (6 Unid)
    if ((activePrintType === 'both' || activePrintType === 'chapelonas') && order.selectedLabels.includes('chapelona')) {
      html += `<div style="display: block; width: 100%; page-break-inside: avoid; break-inside: avoid;">`;
      for (let i = 0; i < 6; i++) {
        html += `
          <div class="print-chapelona-label" style="width: ${chapelonaWidth}mm !important; height: ${chapelonaHeight}mm !important; margin: ${labelMargin}mm !important;">
            <span style="${fontStyle} font-size: 32px; font-weight: bold; color: #000000; letter-spacing: 3px; text-align: center; line-height: 1;">
              *${last8}*
            </span>
          </div>
        `;
      }
      html += `</div>`;
    }

    // 2. Autodestrutivas (3 Unid)
    if ((activePrintType === 'both' || activePrintType === 'autodestrutivas') && order.selectedLabels.includes('destrutiva')) {
      const spacingTop = activePrintType === 'both' ? 'margin-top: 6mm;' : '';
      html += `<div style="display: block; width: 100%; page-break-inside: avoid; break-inside: avoid; ${spacingTop}">`;
      
      // Label 1 (Topo): Last 8 + Year
      html += `
        <div class="print-autodestrutiva-label" style="width: ${autodestrutivaWidth}mm !important; height: ${autodestrutivaHeight}mm !important; margin: ${labelMargin}mm !important;">
          <!-- Brand vertical -->
          <div style="writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; font-size: 9px; font-weight: 900; color: #244b7a; letter-spacing: 1px; border-right: 1px solid rgba(36, 75, 122, 0.4); height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 4px; flex-shrink: 0; background: rgba(36, 75, 122, 0.03);">
            ${brandName}
          </div>
          <!-- Chassis Texts -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; text-align: center; gap: 2px;">
            <span style="${fontStyle} font-size: 20px; font-weight: bold; color: #000000; line-height: 1;">${last8}</span>
            <span style="font-family: 'Ubuntu Mono', monospace; font-size: 11px; font-weight: bold; color: #000000; letter-spacing: 1px; line-height: 1;">*${year}*</span>
          </div>
          <!-- Right Logo -->
          <div style="display: flex; align-items: center; justify-content: center; padding: 0 6px; border-left: 1px solid rgba(36, 75, 122, 0.4); height: 100%; flex-shrink: 0;">
            <svg viewBox="0 0 100 60" width="38" height="23" style="display: block;">
              <ellipse cx="50" cy="30" rx="36" ry="24" fill="none" stroke="#244b7a" stroke-width="5" />
              <path d="M 34 30 Q 34 18 50 18 C 62 18 64 26 64 26 L 52 28 Q 50 24 45 24 Q 40 24 40 32 Q 40 40 46 40 C 52 40 54 34 54 34 L 46 34" fill="none" stroke="#244b7a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      `;

      // Label 2 (Meio): Last 8 only
      html += `
        <div class="print-autodestrutiva-label" style="width: ${autodestrutivaWidth}mm !important; height: ${autodestrutivaHeight}mm !important; margin: ${labelMargin}mm !important;">
          <div style="writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; font-size: 9px; font-weight: 900; color: #244b7a; letter-spacing: 1px; border-right: 1px solid rgba(36, 75, 122, 0.4); height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 4px; flex-shrink: 0; background: rgba(36, 75, 122, 0.03);">
            ${brandName}
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2px; text-align: center;">
            <span style="${fontStyle} font-size: 22px; font-weight: bold; color: #000000; line-height: 1;">${last8}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: center; padding: 0 6px; border-left: 1px solid rgba(36, 75, 122, 0.4); height: 100%; flex-shrink: 0;">
            <svg viewBox="0 0 100 60" width="38" height="23" style="display: block;">
              <ellipse cx="50" cy="30" rx="36" ry="24" fill="none" stroke="#244b7a" stroke-width="5" />
              <path d="M 34 30 Q 34 18 50 18 C 62 18 64 26 64 26 L 52 28 Q 50 24 45 24 Q 40 24 40 32 Q 40 40 46 40 C 52 40 54 34 54 34 L 46 34" fill="none" stroke="#244b7a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      `;

      // Label 3 (Base): Full 17
      html += `
        <div class="print-autodestrutiva-label" style="width: ${autodestrutivaWidth}mm !important; height: ${autodestrutivaHeight}mm !important; margin: ${labelMargin}mm !important;">
          <div style="writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; font-size: 9px; font-weight: 900; color: #244b7a; letter-spacing: 1px; border-right: 1px solid rgba(36, 75, 122, 0.4); height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 4px; flex-shrink: 0; background: rgba(36, 75, 122, 0.03);">
            ${brandName}
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2px; text-align: center; overflow: hidden;">
            <span style="font-family: 'Ubuntu Mono', monospace; font-size: 12px; font-weight: bold; color: #000000; letter-spacing: 0.2px; white-space: nowrap;">${ch}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: center; padding: 0 6px; border-left: 1px solid rgba(36, 75, 122, 0.4); height: 100%; flex-shrink: 0;">
            <svg viewBox="0 0 100 60" width="38" height="23" style="display: block;">
              <ellipse cx="50" cy="30" rx="36" ry="24" fill="none" stroke="#244b7a" stroke-width="5" />
              <path d="M 34 30 Q 34 18 50 18 C 62 18 64 26 64 26 L 52 28 Q 50 24 45 24 Q 40 24 40 32 Q 40 40 46 40 C 52 40 54 34 54 34 L 46 34" fill="none" stroke="#244b7a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      `;

      html += `</div>`;
    }

    html += `</div>`;
  });

  labelWrapper.innerHTML = html;

  // Let browser layout complete then trigger print
  setTimeout(() => {
    window.print();
  }, 100);
}
