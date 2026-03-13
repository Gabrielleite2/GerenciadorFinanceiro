// Init Lucide Icons
lucide.createIcons();

// Data Models & State
const INITIAL_CATEGORIES = [
    { id: 'c1', name: 'Saúde', emoji: '🏥', color: '#10b981' },
    { id: 'c2', name: 'Lazer', emoji: '🎮', color: '#8b5cf6' },
    { id: 'c3', name: 'Moradia', emoji: '🏠', color: '#f59e0b' }
];

const INITIAL_DEBTS = [
    { id: 'd1', name: 'Plano de Saúde', total: 450.00, paid: 450.00, due: getRelativeDate(-5), categoryId: 'c1', status: 'Paga', notes: 'Mensalidade de Março' },
    { id: 'd2', name: 'Aluguel', total: 1500.00, paid: 500.00, due: getRelativeDate(2), categoryId: 'c3', status: 'Pendente', notes: '' },
    { id: 'd3', name: 'Condomínio', total: 350.00, paid: 0, due: getRelativeDate(-2), categoryId: 'c3', status: 'Atrasada', notes: 'Boleto na caixa de email' },
    { id: 'd4', name: 'Conserto Vídeo Game', total: 200.00, paid: 100.00, due: getRelativeDate(10), categoryId: 'c2', status: 'Em dia', notes: 'Parcela 2 de 4' },
    { id: 'd5', name: 'Dentista', total: 800.00, paid: 0, due: getRelativeDate(5), categoryId: 'c1', status: 'Pendente', notes: 'Canal' }
];

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

let categories = JSON.parse(localStorage.getItem('debt_categories'));
let debts = JSON.parse(localStorage.getItem('debt_items'));
let income = parseFloat(localStorage.getItem('debt_income')) || 0;
let activeCategory = 'all';
let chartInstance = null;
let importedItems = [];

// Init App
function init() {
    if (!categories) {
        categories = INITIAL_CATEGORIES;
        saveData('categories');
    }
    if (!debts) {
        debts = INITIAL_DEBTS;
        saveData('debts');
    }

    renderColorPicker();
    updateUI();
}

// Helpers
function getRelativeDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function saveData(type) {
    if (type === 'categories' || type === 'all') {
        localStorage.setItem('debt_categories', JSON.stringify(categories));
    }
    if (type === 'debts' || type === 'all') {
        localStorage.setItem('debt_items', JSON.stringify(debts));
    }
}

// Auto Categorization for Nubank Import
function ensureCategoryExists(name, emoji, color) {
    let cat = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!cat) {
        cat = { id: generateId(), name, emoji, color };
        categories.push(cat);
        saveData('categories');
    }
    return cat.id;
}

function autoCategorize(title) {
    const t = title.toLowerCase();
    if (t.includes('farmácia') || t.includes('hospital') || t.includes('médico')) return ensureCategoryExists('Saúde', '🏥', '#10b981');
    if (t.includes('ifood') || t.includes('restaurante') || t.includes('subway') || t.includes('lanchonete')) return ensureCategoryExists('Alimentação', '🍔', '#f97316');
    if (t.includes('netflix') || t.includes('spotify') || t.includes('steam') || t.includes('udemy')) return ensureCategoryExists('Lazer', '🎮', '#8b5cf6');
    if (t.includes('uber') || t.includes('99') || t.includes('ride')) return ensureCategoryExists('Transporte', '🚗', '#3b82f6');
    if (t.includes('amazon') || t.includes('shoppin') || t.includes('lojas')) return ensureCategoryExists('Compras', '🛍️', '#ec4899');
    if (t.includes('claro') || t.includes('brisanet') || t.includes('internet')) return ensureCategoryExists('Contas', '📄', '#f59e0b');
    
    return ensureCategoryExists('Outros', '📦', '#9ca3af');
}

// Logic
function updateUI() {
    renderCategories();
    renderCategorySelect();
    renderDebts();
    updateDashboard();
    updateChart();
    lucide.createIcons();
}

function setCategory(id) {
    activeCategory = id;
    if (id === 'all') {
        document.getElementById('current-category-title').innerText = 'Todas as Dívidas';
    } else {
        const cat = categories.find(c => c.id === id);
        document.getElementById('current-category-title').innerText = `${cat.emoji} ${cat.name}`;
    }
    updateUI();
}

// Rendering
function renderCategories() {
    const container = document.getElementById('categories-container');
    let html = `
        <div class="category-tab ${activeCategory === 'all' ? 'active' : ''}" onclick="setCategory('all')">
            <i data-lucide="layout-grid" style="width: 16px; height: 16px;"></i> Todas
        </div>
    `;

    categories.forEach(cat => {
        html += `
            <div class="category-tab ${activeCategory === cat.id ? 'active' : ''}" onclick="setCategory('${cat.id}')">
                <div class="category-dot" style="--dot-color: ${cat.color}"></div>
                <span>${cat.emoji} ${cat.name}</span>
                <i data-lucide="x" style="width: 14px; height: 14px; margin-left: 4px; opacity: 0.5" onclick="event.stopPropagation(); confirmDelete('${cat.id}', 'category')"></i>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderCategorySelect() {
    const select = document.getElementById('debt-category');
    select.innerHTML = '<option value="" disabled selected>Selecione uma categoria...</option>';
    categories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.emoji} ${cat.name}</option>`;
    });
}

function renderColorPicker() {
    const container = document.getElementById('color-picker');
    let html = '';
    PALETTE.forEach((color, idx) => {
        html += `<div class="color-option ${idx === 0 ? 'selected' : ''}" style="background-color: ${color}" onclick="selectColor('${color}', this)"></div>`;
    });
    container.innerHTML = html;
}

function selectColor(color, el) {
    document.getElementById('cat-color').value = color;
    document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

function renderDebts() {
    const grid = document.getElementById('debt-grid');
    let filteredDebts = debts;
    
    if (activeCategory !== 'all') {
        filteredDebts = debts.filter(d => d.categoryId === activeCategory);
    }

    // Ordenar: Atrasadas primeiro, depois por vencimento (mais próximas primeiro)
    filteredDebts.sort((a, b) => {
        if (a.status === 'Atrasada' && b.status !== 'Atrasada') return -1;
        if (b.status === 'Atrasada' && a.status !== 'Atrasada') return 1;
        
        if (a.status === 'Paga' && b.status !== 'Paga') return 1;
        if (b.status === 'Paga' && a.status !== 'Paga') return -1;

        return new Date(a.due) - new Date(b.due);
    });

    if (filteredDebts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i data-lucide="folder-open"></i>
                <h3>Nenhuma dívida encontrada</h3>
                <p>Adicione uma nova dívida para começar o controle.</p>
            </div>
        `;
        return;
    }

    let html = '';
    filteredDebts.forEach(debt => {
        const cat = categories.find(c => c.id === debt.categoryId) || { name: 'Desconhecida', emoji: '❓', color: '#ccc' };
        const pct = debt.total > 0 ? Math.min(100, (debt.paid / debt.total) * 100) : 0;
        const statusClass = `status-${debt.status.toLowerCase().replace(' ', '')}`;
        const remaining = debt.total - debt.paid;

        let dueIcon = 'calendar';
        let dueClass = '';
        if (debt.status === 'Atrasada') { dueIcon = 'calendar-x'; dueClass = 'atrasada'; }
        else if (debt.status === 'Em dia') { dueIcon = 'calendar-check'; dueClass = 'emdia'; }
        else if (debt.status === 'Pendente') { dueIcon = 'calendar-clock'; dueClass = 'pendente'; }

        html += `
            <div class="debt-card ${statusClass}">
                <div class="debt-header">
                    <div>
                        <h3 class="debt-title">${debt.name}</h3>
                        <div class="debt-category" style="--dot-color:${cat.color}">
                            <div class="category-dot"></div> ${cat.emoji} ${cat.name}
                        </div>
                    </div>
                    <div class="debt-actions">
                        ${debt.status !== 'Paga' ? `<button class="icon-btn check" title="Marcar como Paga" onclick="markAsPaid('${debt.id}')"><i data-lucide="check-circle"></i></button>` : ''}
                        <button class="icon-btn" title="Editar" onclick="editDebt('${debt.id}')"><i data-lucide="edit-2"></i></button>
                        <button class="icon-btn delete" title="Excluir" onclick="confirmDelete('${debt.id}', 'debt')"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>

                <div class="debt-body">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Valor Restante</div>
                        <div class="debt-amount">${formatCurrency(remaining)}</div>
                    </div>
                    <div class="debt-due ${dueClass}">
                        <i data-lucide="${dueIcon}" style="width: 16px; height: 16px;"></i>
                        ${formatDate(debt.due)}
                    </div>
                </div>

                <div class="progress-wrapper">
                    <div class="progress-labels">
                        <span>Pago: ${formatCurrency(debt.paid)}</span>
                        <span>Total: ${formatCurrency(debt.total)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pct}%"></div>
                    </div>
                </div>

                ${debt.notes ? `<div class="debt-notes has-notes">${debt.notes}</div>` : ''}
            </div>
        `;
    });

    grid.innerHTML = html;
}

function updateDashboard() {
    let total = 0;
    let paid = 0;
    let lateCount = 0;

    debts.forEach(d => {
        total += parseFloat(d.total);
        paid += parseFloat(d.paid);
        if (d.status === 'Atrasada') lateCount++;
    });

    const remaining = total - paid;

    document.getElementById('dash-total').innerText = formatCurrency(total);
    document.getElementById('dash-paid').innerText = formatCurrency(paid);
    document.getElementById('dash-remaining').innerText = formatCurrency(remaining);
    document.getElementById('dash-late-count').innerText = lateCount;

    // Income & Balance Logic
    document.getElementById('dash-income').innerText = formatCurrency(income);
    const balance = income - remaining;
    const balanceEl = document.getElementById('dash-balance');
    balanceEl.innerText = formatCurrency(balance);
    
    // Update balance text color based on remaining vs income
    balanceEl.className = 'card-value ' + (balance >= 0 ? 'balance-positive' : 'balance-negative');
}

function updateChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    const catTotals = {};
    categories.forEach(c => catTotals[c.id] = { label: `${c.emoji} ${c.name}`, color: c.color, total: 0 });
    
    debts.forEach(d => {
        if (catTotals[d.categoryId]) {
            catTotals[d.categoryId].total += (d.total - d.paid); // Grafico basado no restante
        }
    });

    const labels = [];
    const data = [];
    const bgColors = [];

    Object.values(catTotals).forEach(cat => {
        if (cat.total > 0) {
            labels.push(cat.label);
            data.push(cat.total);
            bgColors.push(cat.color);
        }
    });

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (data.length === 0) {
        // Empty state for chart
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Sem dívidas pendentes'],
                datasets: [{ data: [1], backgroundColor: ['#374151'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#9ca3af' } }, tooltip: { enabled: false } }, cutout: '75%' }
        });
        return;
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#11131a',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#f3f4f6',
                        font: { family: 'Inter' },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Restante: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Modals & Forms
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if(id === 'debt-modal') {
        clearDebtForm();
    }
}

function openDebtModal() {
    document.getElementById('debt-modal-title').innerText = 'Adicionar Dívida';
    openModal('debt-modal');
}

function openCategoryModal() {
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-emoji').value = '';
    openModal('category-modal');
}

function editDebt(id) {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    document.getElementById('debt-modal-title').innerText = 'Editar Dívida';
    document.getElementById('debt-id').value = debt.id;
    document.getElementById('debt-name').value = debt.name;
    document.getElementById('debt-total').value = debt.total;
    document.getElementById('debt-paid').value = debt.paid;
    document.getElementById('debt-due').value = debt.due;
    document.getElementById('debt-status').value = debt.status;
    document.getElementById('debt-category').value = debt.categoryId;
    document.getElementById('debt-notes').value = debt.notes || '';

    openModal('debt-modal');
}

function clearDebtForm() {
    document.getElementById('debt-id').value = '';
    document.getElementById('debt-name').value = '';
    document.getElementById('debt-total').value = '';
    document.getElementById('debt-paid').value = '';
    document.getElementById('debt-due').value = '';
    document.getElementById('debt-status').value = 'Pendente';
    document.getElementById('debt-category').value = '';
    document.getElementById('debt-notes').value = '';
}

function editIncome() {
    document.getElementById('income-value').value = income > 0 ? income : '';
    openModal('income-modal');
}

function saveIncome() {
    const val = parseFloat(document.getElementById('income-value').value) || 0;
    income = Math.max(0, val);
    localStorage.setItem('debt_income', income);
    closeModal('income-modal');
    updateDashboard();
}

// CRUD Operations
function saveDebt() {
    const id = document.getElementById('debt-id').value;
    const name = document.getElementById('debt-name').value;
    const total = parseFloat(document.getElementById('debt-total').value);
    const paid = parseFloat(document.getElementById('debt-paid').value) || 0;
    const due = document.getElementById('debt-due').value;
    const status = document.getElementById('debt-status').value;
    const categoryId = document.getElementById('debt-category').value;
    const notes = document.getElementById('debt-notes').value;

    if (!name || isNaN(total) || !due || !categoryId) {
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }

    const debtData = {
        id: id || generateId(),
        name, total, paid, due, status, categoryId, notes
    };

    if (id) {
        const index = debts.findIndex(d => d.id === id);
        debts[index] = debtData;
    } else {
        debts.push(debtData);
    }

    saveData('debts');
    closeModal('debt-modal');
    updateUI();
}

function saveCategory() {
    const name = document.getElementById('cat-name').value;
    const emoji = document.getElementById('cat-emoji').value;
    const color = document.getElementById('cat-color').value;

    if (!name || !emoji) {
        alert('Nome e emoji são obrigatórios.');
        return;
    }

    categories.push({ id: generateId(), name, emoji, color });
    saveData('categories');
    closeModal('category-modal');
    updateUI();
}

function markAsPaid(id) {
    const index = debts.findIndex(d => d.id === id);
    if (index > -1) {
        debts[index].paid = debts[index].total;
        debts[index].status = 'Paga';
        saveData('debts');
        updateUI();
    }
}

function confirmDelete(id, type) {
    let msg = type === 'debt' 
        ? 'Tem certeza que deseja excluir esta dívida?' 
        : 'Tem certeza que deseja excluir esta categoria? As dívidas associadas a ela ficarão sem categoria.';
        
    document.getElementById('confirm-text').innerText = msg;
    document.getElementById('confirm-action-id').value = id;
    document.getElementById('confirm-action-type').value = type;
    openModal('confirm-modal');
}

function confirmDeleteAll() {
    let msg = activeCategory === 'all' 
        ? 'Tem certeza que deseja apagar TODAS as suas dívidas? Esta ação não pode ser desfeita.'
        : 'Tem certeza que deseja apagar todas as dívidas DESTA CATEGORIA? Esta ação não pode ser desfeita.';
    
    document.getElementById('confirm-text').innerText = msg;
    document.getElementById('confirm-action-id').value = activeCategory;
    document.getElementById('confirm-action-type').value = 'delete-all';
    openModal('confirm-modal');
}

function executeDelete() {
    const id = document.getElementById('confirm-action-id').value;
    const type = document.getElementById('confirm-action-type').value;

    if (type === 'debt') {
        debts = debts.filter(d => d.id !== id);
        saveData('debts');
    } else if (type === 'category') {
        categories = categories.filter(c => c.id !== id);
        if (activeCategory === id) activeCategory = 'all';
        saveData('categories');
    } else if (type === 'delete-all') {
        if (id === 'all') {
            debts = [];
            income = 0; // Opcional, mas faz sentido zerar se o user reiniciar
            localStorage.setItem('debt_income', income);
        } else {
            debts = debts.filter(d => d.categoryId !== id);
        }
        saveData('debts');
    }

    closeModal('confirm-modal');
    updateUI();
}

// Nubank CSV Import Logic
function handleNubankCsv(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        importedItems = [];

        // O CSV tem 3 colunas: date, title, amount
        for (let i = 1; i < lines.length; i++) { // Pula header
            let line = lines[i].trim();
            if (!line) continue;
            
            let firstComma = line.indexOf(',');
            let lastComma = line.lastIndexOf(',');
            if (firstComma !== -1 && lastComma !== -1 && firstComma !== lastComma) {
                let dateStr = line.substring(0, firstComma).trim();
                let amountStr = line.substring(lastComma + 1).trim();
                let title = line.substring(firstComma + 1, lastComma).trim();
                
                // Remove quotes se houver
                if (title.startsWith('"') && title.endsWith('"')) {
                    title = title.substring(1, title.length - 1);
                }
                
                let amount = parseFloat(amountStr);
                
                // Ignorar estornos ou pagamentos (valor negativo)
                if (!isNaN(amount) && amount > 0) {
                    importedItems.push({
                        id: generateId(),
                        date: dateStr,
                        name: title,
                        amount: amount,
                        categoryId: autoCategorize(title)
                    });
                }
            }
        }
        
        renderImportReview();
    };
    reader.readAsText(file);
}

function renderImportReview() {
    updateUI(); // garante que as novas categorias existam na interface
    
    const list = document.getElementById('import-review-list');
    
    if (importedItems.length === 0) {
        list.innerHTML = `<div class="empty-state"><h3>Nenhum gasto encontrado no arquivo.</h3><p>Estornos e pagamentos da fatura são ignorados.</p></div>`;
    } else {
        let html = '';
        importedItems.forEach((item, index) => {
            let catOptions = categories.map(cat => 
                `<option value="${cat.id}" ${cat.id === item.categoryId ? 'selected' : ''}>${cat.emoji} ${cat.name}</option>`
            ).join('');

            html += `
                <div class="import-item">
                    <div class="import-item-info">
                        <div class="import-item-title">${item.name}</div>
                        <div class="import-item-meta">
                            <i data-lucide="calendar" style="width: 14px; height: 14px;"></i> ${formatDate(item.date)}
                        </div>
                    </div>
                    <div class="import-item-amount">${formatCurrency(item.amount)}</div>
                    <select class="form-control import-item-select" onchange="updateImportCategory(${index}, this.value)">
                        ${catOptions}
                    </select>
                </div>
            `;
        });
        list.innerHTML = html;
        lucide.createIcons();
    }
    
    openModal('import-review-modal');
}

function updateImportCategory(index, catId) {
    if (importedItems[index]) {
        importedItems[index].categoryId = catId;
    }
}

function confirmImport() {
    const today = new Date().toISOString().split('T')[0];
    
    importedItems.forEach(item => {
        let status = 'Pendente';
        if (item.date < today) status = 'Atrasada';

        debts.push({
            id: generateId(),
            name: item.name,
            total: item.amount,
            paid: 0,
            due: item.date,
            status: status,
            categoryId: item.categoryId,
            notes: 'Fatura Nubank'
        });
    });

    saveData('debts');
    closeModal('import-review-modal');
    document.getElementById('nubank-csv-file').value = '';
    importedItems = [];
    updateUI();
}

// Run
window.addEventListener('DOMContentLoaded', init);
