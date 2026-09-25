/* ==========================================================================
   3D PRINT HUB - MAIN APPLICATION CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- AUTHENTICATION & PIN LOCK ---
  const DEFAULT_PIN = "0795"; // PIN de seguridad por defecto
  const authScreen = document.getElementById('auth-screen');
  const authForm = document.getElementById('auth-form');
  const authPinInput = document.getElementById('auth-pin-input');
  const authErrorMsg = document.getElementById('auth-error-msg');

  // Si existía el PIN antiguo de desarrollo ('1234') guardado, se remueve para forzar 0795
  if (localStorage.getItem('app_family_pin') === '1234') {
    localStorage.removeItem('app_family_pin');
  }

  function checkAuth() {
    const isUnlocked = localStorage.getItem('app_unlocked');
    if (isUnlocked === 'true') {
      if (authScreen) authScreen.style.display = 'none';
    } else {
      if (authScreen) authScreen.style.display = 'flex';
    }
  }

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPin = authPinInput ? authPinInput.value.trim() : '';
      const savedPin = localStorage.getItem('app_family_pin') || DEFAULT_PIN;

      if (enteredPin === savedPin || enteredPin === DEFAULT_PIN) {
        localStorage.setItem('app_unlocked', 'true');
        if (authScreen) authScreen.style.display = 'none';
        if (authErrorMsg) authErrorMsg.style.display = 'none';
      } else {
        if (authErrorMsg) authErrorMsg.style.display = 'block';
        if (authPinInput) {
          authPinInput.value = '';
          authPinInput.focus();
        }
      }
    });
  }

  checkAuth();

  // Initialize Core Services
  const store = window.store;
  let stlViewerInstance = null;
  let statusChart = null;
  let monthlyChart = null;

  // Cache UI Elements
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  // Navigation Logic
  function navigateTo(viewId) {
    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    viewSections.forEach(section => {
      if (section.id === `view-${viewId}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Lazy load 3D Viewer when switching to 3d-viewer tab
    if (viewId === '3d-viewer' && !stlViewerInstance) {
      setTimeout(() => {
        stlViewerInstance = new STLViewer('stl-viewer-container');
        stlViewerInstance.loadDefaultCube();
      }, 100);
    } else if (viewId === '3d-viewer' && stlViewerInstance) {
      setTimeout(() => stlViewerInstance.onWindowResize(), 100);
    }

    // Refresh current view data
    renderView(viewId);
  }

  // Bind Navigation Clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = link.getAttribute('data-view');
      if (viewId) navigateTo(viewId);
    });
  });

  // Render View Switcher
  function renderView(viewId) {
    switch (viewId) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'printers':
        renderPrinters();
        break;
      case 'spools':
        renderSpools();
        break;
      case 'jobs':
        renderJobs();
        populateJobsFilterPrinters();
        break;
      case 'sales':
        renderSales();
        break;
      case 'calculator':
        renderCalculatorForm();
        break;
      case 'settings':
        renderSettings();
        break;
    }
  }

  // --- SUPABASE STATUS PILL ---
  function updateSupabaseStatusPill() {
    const dot = document.getElementById('supabase-status-dot');
    const text = document.getElementById('supabase-status-text');
    const pill = document.getElementById('supabase-status-pill');
    if (!dot || !text || !pill) return;

    if (store.useSupabase && store.supabase) {
      dot.style.background = '#00e676';
      dot.style.boxShadow = '0 0 8px #00e676';
      text.textContent = '⚡ Supabase Cloud';
      pill.style.border = '1px solid rgba(0, 230, 118, 0.4)';
      pill.style.background = 'rgba(0, 230, 118, 0.1)';
      pill.style.color = '#00e676';
    } else {
      dot.style.background = '#8a99ad';
      dot.style.boxShadow = 'none';
      text.textContent = '📁 Local Storage';
      pill.style.border = '1px solid rgba(255,255,255,0.15)';
      pill.style.background = 'rgba(255,255,255,0.05)';
      pill.style.color = 'var(--text-muted)';
    }
  }

  // --- 1. RENDER DASHBOARD ---
  function renderDashboard() {
    updateSupabaseStatusPill();
    const jobs = store.getJobs();
    const spools = store.getSpools();
    const printers = store.getPrinters();
    const sales = store.getSales();
    const currency = store.getSettings().currencySymbol || '$';

    // Low Stock Alert Detection
    const lowStockSpools = spools.filter(s => {
      const pct = (s.remainingWeight / s.initialWeight);
      return s.remainingWeight <= 150 || pct <= 0.15;
    });

    const lowStockBanner = document.getElementById('dashboard-low-stock-alert');
    const lowStockText = document.getElementById('low-stock-alert-text');
    if (lowStockBanner && lowStockText) {
      if (lowStockSpools.length > 0) {
        lowStockBanner.style.display = 'block';
        const names = lowStockSpools.map(s => `"${s.name}" (${s.remainingWeight}g)`).join(', ');
        lowStockText.textContent = `Tienes ${lowStockSpools.length} carrete(s) por agotar: ${names}.`;
      } else {
        lowStockBanner.style.display = 'none';
      }
    }

    // Metrics Calculation
    const totalHours = printers.reduce((acc, p) => acc + (p.totalHours || 0), 0);
    const totalGramsUsed = jobs.filter(j => j.status === 'completado').reduce((acc, j) => acc + (j.weightGrams || 0), 0);
    const completedJobs = jobs.filter(j => j.status === 'completado').length;
    const totalJobs = jobs.length;
    const successRate = totalJobs ? Math.round((completedJobs / totalJobs) * 100) : 100;
    const totalSalesRev = sales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
    const totalProfit = sales.reduce((acc, s) => acc + (s.profit || 0), 0);

    // Update Metric Cards DOM
    document.getElementById('metric-hours').textContent = `${totalHours.toFixed(1)} h`;
    document.getElementById('metric-grams').textContent = `${totalGramsUsed} g`;
    document.getElementById('metric-success').textContent = `${successRate}%`;
    document.getElementById('metric-sales').textContent = `${currency}${totalSalesRev.toFixed(2)}`;
    document.getElementById('metric-profit').textContent = `${currency}${totalProfit.toFixed(2)}`;

    // Render Recent Active Jobs List
    const recentList = document.getElementById('recent-jobs-list');
    if (recentList) {
      recentList.innerHTML = jobs.slice(0, 4).map(job => {
        const printer = store.getPrinter(job.printerId);
        return `
          <tr>
            <td>
              <strong>${escapeHtml(job.title)}</strong>
              <div style="font-size:0.7rem; color:var(--text-muted);">${job.date || '-'}</div>
            </td>
            <td>${printer ? escapeHtml(printer.name) : 'N/A'}</td>
            <td><span class="badge badge-${job.status}">${job.status}</span></td>
            <td>${job.printTimeHours}h / ${job.weightGrams}g</td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="4" class="text-muted">No hay trabajos registrados.</td></tr>';
    }

    // Render Charts
    initStatusChart(jobs);
    initMonthlyRevenueChart(sales);
  }

  function initStatusChart(jobs) {
    const ctx = document.getElementById('chart-job-status');
    if (!ctx) return;

    const completed = jobs.filter(j => j.status === 'completado').length;
    const printing = jobs.filter(j => j.status === 'imprimiendo').length;
    const pending = jobs.filter(j => j.status === 'pendiente').length;
    const failed = jobs.filter(j => j.status === 'fallido').length;

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completados', 'Imprimiendo', 'Pendientes', 'Fallidos'],
        datasets: [{
          data: [completed, printing, pending, failed],
          backgroundColor: ['#00e676', '#00f2fe', '#8a99ad', '#ff3d71'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8a99ad', font: { family: 'Outfit' } } }
        }
      }
    });
  }

  // --- MONTHLY REVENUE CHART ---
  function initMonthlyRevenueChart(sales) {
    const ctx = document.getElementById('chart-monthly-revenue');
    if (!ctx) return;

    const monthsMap = {};
    sales.forEach(s => {
      const dateStr = s.date || new Date().toISOString().split('T')[0];
      const monthKey = dateStr.substring(0, 7);
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { revenue: 0, profit: 0 };
      }
      monthsMap[monthKey].revenue += (s.salePrice || 0);
      monthsMap[monthKey].profit += (s.profit || 0);
    });

    const sortedMonths = Object.keys(monthsMap).sort();
    if (sortedMonths.length === 0) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      sortedMonths.push(currentMonth);
      monthsMap[currentMonth] = { revenue: 0, profit: 0 };
    }

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = sortedMonths.map(m => {
      const [y, mm] = m.split('-');
      const monthIdx = parseInt(mm, 10) - 1;
      return `${monthNames[monthIdx] || mm} ${y}`;
    });

    const revData = sortedMonths.map(m => monthsMap[m].revenue);
    const profitData = sortedMonths.map(m => monthsMap[m].profit);

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ingresos Totales ($)',
            data: revData,
            backgroundColor: 'rgba(0, 242, 254, 0.6)',
            borderColor: '#00f2fe',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Beneficio Neto ($)',
            data: profitData,
            backgroundColor: 'rgba(0, 230, 118, 0.6)',
            borderColor: '#00e676',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8a99ad', font: { family: 'Outfit' } } }
        },
        scales: {
          x: { ticks: { color: '#8a99ad' }, grid: { display: false } },
          y: { ticks: { color: '#8a99ad' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // --- 2. RENDER PRINTERS ---
  function renderPrinters() {
    const container = document.getElementById('printers-grid');
    if (!container) return;

    const printers = store.getPrinters();
    container.innerHTML = printers.map(p => `
      <div class="card printer-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
          <div>
            <h3 style="font-size:1.15rem; margin-bottom:0.25rem;">${escapeHtml(p.name)}</h3>
            <span class="text-muted" style="font-size:0.8rem;">${escapeHtml(p.type)}</span>
          </div>
          <span class="badge badge-${p.status}">
            <span class="badge-dot"></span>${p.status}
          </span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.25rem;">
          <div><strong>Boquilla:</strong> ${p.nozzleSize} mm</div>
          <div><strong>Volumen:</strong> ${escapeHtml(p.buildVolume)}</div>
          <div><strong>Horas Uso:</strong> <span style="color:var(--accent-cyan); font-weight:600;">${p.totalHours} h</span></div>
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button class="btn btn-secondary btn-icon-only edit-printer-btn" data-id="${p.id}" title="Editar">✏️</button>
          <button class="btn btn-danger btn-icon-only delete-printer-btn" data-id="${p.id}" title="Eliminar">🗑️</button>
        </div>
      </div>
    `).join('') || '<p class="text-muted">No hay impresoras registradas.</p>';

    // Bind Printer Actions
    document.querySelectorAll('.edit-printer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const printer = store.getPrinter(btn.getAttribute('data-id'));
        if (!printer) return;
        document.getElementById('edit-printer-id').value = printer.id;
        document.getElementById('edit-printer-name').value = printer.name;
        document.getElementById('edit-printer-type').value = printer.type;
        document.getElementById('edit-printer-status').value = printer.status;
        document.getElementById('edit-printer-nozzle').value = printer.nozzleSize;
        document.getElementById('edit-printer-wattage').value = printer.wattage;
        document.getElementById('edit-printer-volume').value = printer.buildVolume || '';
        document.getElementById('edit-printer-hours').value = printer.totalHours || 0;
        openModal('modal-edit-printer');
      });
    });

    document.querySelectorAll('.delete-printer-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('¿Eliminar esta impresora?')) {
          await store.deletePrinter(btn.getAttribute('data-id'));
          renderPrinters();
        }
      });
    });
  }

  // --- 3. RENDER SPOOLS ---
  function renderSpools() {
    const container = document.getElementById('spools-grid');
    if (!container) return;

    const spools = store.getSpools();
    const currency = store.getSettings().currencySymbol || '$';

    container.innerHTML = spools.map(s => {
      const pct = Math.round((s.remainingWeight / s.initialWeight) * 100);
      const isLow = s.remainingWeight <= 150 || pct <= 15;

      return `
        <div class="card spool-card" style="${isLow ? 'border:1px solid rgba(255, 61, 113, 0.5); box-shadow:0 0 15px rgba(255,61,113,0.15);' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <span style="width:16px; height:16px; border-radius:50%; background:${s.color}; border:1px solid #fff; display:inline-block;"></span>
              <h3 style="font-size:1.05rem;">${escapeHtml(s.name)}</h3>
            </div>
            <div style="display:flex; gap:0.3rem;">
              ${isLow ? '<span class="badge badge-failed" style="font-size:0.7rem;">⚠️ STOCK BAJO</span>' : ''}
              <span class="badge ${isLow ? 'badge-failed' : 'badge-printing'}">${s.type}</span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
            <span>${s.remainingWeight}g / ${s.initialWeight}g</span>
            <strong style="color:${isLow ? 'var(--accent-red)' : 'var(--accent-cyan)'}">${pct}%</strong>
          </div>

          <div class="spool-gauge">
            <div class="spool-fill" style="width:${pct}%; background:${isLow ? 'var(--accent-red)' : s.color || 'var(--accent-cyan)'}"></div>
          </div>

          <!-- Temperaturas -->
          <div style="display:flex; gap:0.75rem; font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem; flex-wrap:wrap; background:rgba(255,255,255,0.03); padding:0.4rem 0.6rem; border-radius:8px;">
            <span>🌡️ Boquilla: <strong style="color:#fff;">${escapeHtml(s.nozzleTemp || 'Standard')}</strong></span>
            <span>🛏️ Cama: <strong style="color:#fff;">${escapeHtml(s.bedTemp || 'Standard')}</strong></span>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">
            <span>Marca: ${escapeHtml(s.brand)}</span>
            <span>Coste: ${currency}${s.cost}</span>
          </div>

          <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
            <button class="btn btn-secondary btn-icon-only edit-spool-btn" data-id="${s.id}" title="Editar">✏️</button>
            <button class="btn btn-danger btn-icon-only delete-spool-btn" data-id="${s.id}">🗑️</button>
          </div>
        </div>
      `;
    }).join('') || '<p class="text-muted">No hay carretes de filamento en inventario.</p>';

    document.querySelectorAll('.edit-spool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const spool = store.getSpool(btn.getAttribute('data-id'));
        if (!spool) return;
        document.getElementById('edit-spool-id').value = spool.id;
        document.getElementById('edit-spool-name').value = spool.name;
        document.getElementById('edit-spool-type').value = spool.type;
        document.getElementById('edit-spool-brand').value = spool.brand || '';
        document.getElementById('edit-spool-color').value = spool.color || '#00f2fe';
        document.getElementById('edit-spool-remaining').value = spool.remainingWeight;
        document.getElementById('edit-spool-weight').value = spool.initialWeight;
        document.getElementById('edit-spool-cost').value = spool.cost;
        document.getElementById('edit-spool-nozzle-temp').value = spool.nozzleTemp || '';
        document.getElementById('edit-spool-bed-temp').value = spool.bedTemp || '';
        openModal('modal-edit-spool');
      });
    });

    document.querySelectorAll('.delete-spool-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('¿Eliminar este carrete de filamento?')) {
          await store.deleteSpool(btn.getAttribute('data-id'));
          renderSpools();
        }
      });
    });
  }

  // --- 4. RENDER JOBS ---
  function renderJobs(filterSearch = '', filterStatus = '', filterPrinterId = '') {
    const tbody = document.getElementById('jobs-table-body');
    if (!tbody) return;

    let jobs = store.getJobs();

    // Apply filters
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      jobs = jobs.filter(j => j.title.toLowerCase().includes(s));
    }
    if (filterStatus) {
      jobs = jobs.filter(j => j.status === filterStatus);
    }
    if (filterPrinterId) {
      jobs = jobs.filter(j => j.printerId === filterPrinterId);
    }

    tbody.innerHTML = jobs.map(j => {
      const printer = store.getPrinter(j.printerId);
      const spool = store.getSpool(j.spoolId);

      return `
        <tr>
          <td>
            <strong>${escapeHtml(j.title)}</strong>
            ${j.failureReason ? `<div style="font-size:0.75rem; color:var(--accent-red); margin-top:2px;">⚠️ ${escapeHtml(j.failureReason)}</div>` : ''}
          </td>
          <td>${printer ? escapeHtml(printer.name) : 'N/A'}</td>
          <td>
            ${spool ? `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${spool.color}; margin-right:4px;"></span>${escapeHtml(spool.name)}` : 'N/A'}
          </td>
          <td>${j.weightGrams} g</td>
          <td>${j.printTimeHours} h</td>
          <td>${j.labourHours || 0} h</td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${j.date || '-'}</td>
          <td><span class="badge badge-${j.status}">${j.status}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn btn-secondary btn-icon-only edit-job-btn" data-id="${j.id}" title="Editar">✏️</button>
            <button class="btn btn-danger btn-icon-only delete-job-btn" data-id="${j.id}">🗑️</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="9" class="text-muted">No hay trabajos que coincidan.</td></tr>';

    document.querySelectorAll('.edit-job-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const job = store.getJobs().find(j => j.id === btn.getAttribute('data-id'));
        if (!job) return;
        const pSel = document.getElementById('edit-job-printer-id');
        const sSel = document.getElementById('edit-job-spool-id');
        pSel.innerHTML = '<option value="">-- Sin Impresora --</option>' + 
          store.getPrinters().map(p => `<option value="${p.id}" ${p.id === job.printerId ? 'selected' : ''}>${p.name}</option>`).join('');
        sSel.innerHTML = '<option value="">-- Sin Carrete --</option>' + 
          store.getSpools().map(s => `<option value="${s.id}" ${s.id === job.spoolId ? 'selected' : ''}>${s.name} (${s.remainingWeight}g)</option>`).join('');
        document.getElementById('edit-job-id').value = job.id;
        document.getElementById('edit-job-title').value = job.title;
        document.getElementById('edit-job-grams').value = job.weightGrams;
        document.getElementById('edit-job-hours').value = job.printTimeHours;
        document.getElementById('edit-job-labour-hours').value = job.labourHours || 0;
        document.getElementById('edit-job-date').value = job.date || '';
        document.getElementById('edit-job-status').value = job.status;
        document.getElementById('edit-job-failure-reason').value = job.failureReason || '';
        openModal('modal-edit-job');
      });
    });

    document.querySelectorAll('.delete-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('¿Eliminar este registro de trabajo?')) {
          await store.deleteJob(btn.getAttribute('data-id'));
          renderJobs(...getJobFilters());
        }
      });
    });
  }

  function getJobFilters() {
    return [
      (document.getElementById('jobs-search') || {}).value || '',
      (document.getElementById('jobs-filter-status') || {}).value || '',
      (document.getElementById('jobs-filter-printer') || {}).value || ''
    ];
  }

  function populateJobsFilterPrinters() {
    const sel = document.getElementById('jobs-filter-printer');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Todas las impresoras</option>' +
      store.getPrinters().map(p => `<option value="${p.id}" ${p.id === current ? 'selected' : ''}>${p.name}</option>`).join('');
  }

  // Bind filter events for jobs (once)
  let jobFiltersInitialized = false;
  function initJobFilters() {
    if (jobFiltersInitialized) return;
    jobFiltersInitialized = true;
    const applyFilters = () => renderJobs(...getJobFilters());
    document.getElementById('jobs-search')?.addEventListener('input', applyFilters);
    document.getElementById('jobs-filter-status')?.addEventListener('change', applyFilters);
    document.getElementById('jobs-filter-printer')?.addEventListener('change', applyFilters);
  }

  // --- 5. RENDER SALES ---
  function renderSales(filterSearch = '', filterStatus = '') {
    const tbody = document.getElementById('sales-table-body');
    if (!tbody) return;

    let sales = store.getSales();
    const currency = store.getSettings().currencySymbol || '$';

    // Apply filters
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      sales = sales.filter(v => v.jobTitle.toLowerCase().includes(s) || v.clientName.toLowerCase().includes(s));
    }
    if (filterStatus) {
      sales = sales.filter(v => v.paymentStatus === filterStatus);
    }

    tbody.innerHTML = sales.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.jobTitle)}</strong></td>
        <td>${escapeHtml(s.clientName)}</td>
        <td>${currency}${s.salePrice.toFixed(2)}</td>
        <td>${currency}${s.totalCost.toFixed(2)}</td>
        <td><strong style="color:var(--accent-green);">${currency}${s.profit.toFixed(2)}</strong></td>
        <td><span class="badge ${s.paymentStatus === 'pagado' ? 'badge-completed' : 'badge-maintenance'}">${s.paymentStatus}</span></td>
        <td style="font-size:0.8rem; color:var(--text-muted);">${s.date || '-'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-secondary btn-icon-only edit-sale-btn" data-id="${s.id}" title="Editar">✏️</button>
          <button class="btn btn-danger btn-icon-only delete-sale-btn" data-id="${s.id}">🗑️</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-muted">No hay ventas que coincidan.</td></tr>';

    document.querySelectorAll('.edit-sale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sale = store.getSales().find(s => s.id === btn.getAttribute('data-id'));
        if (!sale) return;
        document.getElementById('edit-sale-id').value = sale.id;
        document.getElementById('edit-sale-title').value = sale.jobTitle;
        document.getElementById('edit-sale-client').value = sale.clientName;
        document.getElementById('edit-sale-price').value = sale.salePrice;
        document.getElementById('edit-sale-cost').value = sale.totalCost;
        document.getElementById('edit-sale-payment-status').value = sale.paymentStatus;
        document.getElementById('edit-sale-date').value = sale.date || '';
        openModal('modal-edit-sale');
      });
    });

    document.querySelectorAll('.delete-sale-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('¿Eliminar este registro de venta?')) {
          await store.deleteSale(btn.getAttribute('data-id'));
          renderSales(...getSaleFilters());
        }
      });
    });
  }

  function getSaleFilters() {
    return [
      (document.getElementById('sales-search') || {}).value || '',
      (document.getElementById('sales-filter-status') || {}).value || ''
    ];
  }

  // Bind filter events for sales (once)
  let saleFiltersInitialized = false;
  function initSaleFilters() {
    if (saleFiltersInitialized) return;
    saleFiltersInitialized = true;
    const applyFilters = () => renderSales(...getSaleFilters());
    document.getElementById('sales-search')?.addEventListener('input', applyFilters);
    document.getElementById('sales-filter-status')?.addEventListener('change', applyFilters);
  }

  // --- 6. RENDER CALCULATOR ---
  function renderCalculatorForm() {
    const spoolSelect = document.getElementById('calc-spool-select');
    if (spoolSelect) {
      const spools = store.getSpools();
      spoolSelect.innerHTML = spools.map(s => `
        <option value="${s.id}">${s.name} (${s.type} - $${s.cost})</option>
      `).join('');
    }
    // Pre-fill defaults from settings
    const settings = store.getSettings();
    const wearEl = document.getElementById('calc-wear');
    const labourEl = document.getElementById('calc-labour');
    const marginEl = document.getElementById('calc-margin');
    if (wearEl) wearEl.value = settings.wearCostPerHour || 0.25;
    if (labourEl) labourEl.value = settings.labourCostPerHour || 5.0;
    if (marginEl) marginEl.value = settings.defaultMargin || 40;
  }

  // --- 7. RENDER SETTINGS ---
  function renderSettings() {
    const settings = store.getSettings();
    const cfgCurrency = document.getElementById('cfg-currency');
    const cfgElec = document.getElementById('cfg-electricity');
    const cfgLabour = document.getElementById('cfg-labour');
    const cfgWear = document.getElementById('cfg-wear');
    const cfgMargin = document.getElementById('cfg-margin');
    if (cfgCurrency) cfgCurrency.value = settings.currencySymbol || '$';
    if (cfgElec) cfgElec.value = settings.electricityCostPerKwh || 0.18;
    if (cfgLabour) cfgLabour.value = settings.labourCostPerHour || 5.0;
    if (cfgWear) cfgWear.value = settings.wearCostPerHour || 0.25;
    if (cfgMargin) cfgMargin.value = settings.defaultMargin || 40;
  }

  // Form Submit Handler for Calculator
  const calcForm = document.getElementById('calculator-form');
  if (calcForm) {
    calcForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const spoolId = document.getElementById('calc-spool-select').value;
      const spool = store.getSpool(spoolId) || { cost: 25, initialWeight: 1000 };
      const weightGrams = parseFloat(document.getElementById('calc-weight').value) || 0;
      const printHours = parseFloat(document.getElementById('calc-hours').value) || 0;
      const printerWattage = parseFloat(document.getElementById('calc-wattage').value) || 250;
      const wearCostPerHour = parseFloat(document.getElementById('calc-wear').value) || 0.25;
      const labourHours = parseFloat(document.getElementById('calc-labour-hours').value) || 0.5;
      const labourRatePerHour = parseFloat(document.getElementById('calc-labour').value) || 5.00;
      const margin = parseFloat(document.getElementById('calc-margin').value) || 40;

      const result = CostCalculator.calculate({
        spoolCost: spool.cost,
        spoolWeightGrams: spool.initialWeight,
        jobWeightGrams: weightGrams,
        printHours: printHours,
        printerWattage: printerWattage,
        electricityRateKwh: store.getSettings().electricityCostPerKwh,
        wearCostPerHour: wearCostPerHour,
        labourTimeHours: labourHours,
        labourRatePerHour: labourRatePerHour,
        profitMarginPercent: margin
      });

      const currency = store.getSettings().currencySymbol || '$';
      document.getElementById('calc-result-material').textContent = `${currency}${result.materialCost}`;
      document.getElementById('calc-result-elec').textContent = `${currency}${result.electricityCost}`;
      document.getElementById('calc-result-wear').textContent = `${currency}${result.wearCost}`;
      document.getElementById('calc-result-labour').textContent = `${currency}${result.labourCost}`;
      document.getElementById('calc-result-total-cost').textContent = `${currency}${result.totalCost}`;
      document.getElementById('calc-result-margin').textContent = `${currency}${result.profitAmount}`;
      document.getElementById('calc-result-suggested').textContent = `${currency}${result.suggestedPrice}`;
      document.getElementById('calc-results-card').style.display = 'block';

      // Store last result for save buttons
      calcForm._lastResult = { result, weightGrams, printHours, spoolId };
    });
  }

  // Save from Calculator buttons
  document.getElementById('btn-calc-save-job')?.addEventListener('click', () => {
    if (!calcForm._lastResult) return;
    const { result, weightGrams, printHours, spoolId } = calcForm._lastResult;
    const projectName = document.getElementById('calc-project-name')?.value.trim() || 'Pieza Calculada';
    populateJobModalDropdowns();
    document.getElementById('job-title').value = projectName;
    document.getElementById('job-grams').value = weightGrams;
    document.getElementById('job-hours').value = printHours;
    document.getElementById('job-spool-id').value = spoolId || '';
    openModal('modal-job');
  });

  document.getElementById('btn-calc-save-sale')?.addEventListener('click', () => {
    if (!calcForm._lastResult) return;
    const { result } = calcForm._lastResult;
    const projectName = document.getElementById('calc-project-name')?.value.trim() || 'Pieza Calculada';
    document.getElementById('sale-title').value = projectName;
    document.getElementById('sale-cost').value = result.totalCost;
    document.getElementById('sale-price').value = result.suggestedPrice;
    openModal('modal-sale');
  });

  // --- 7. MODAL DIALOGS LOGIC ---
  function setupModals() {
    // Open Modal Handlers
    const openSupabaseModal = () => {
      const cfg = store.getSupabaseCredentials();
      if (cfg.url) document.getElementById('supabase-url').value = cfg.url;
      if (cfg.key) document.getElementById('supabase-key').value = cfg.key;
      openModal('modal-supabase');
    };

    document.getElementById('btn-supabase-cfg')?.addEventListener('click', openSupabaseModal);
    document.getElementById('nav-btn-supabase')?.addEventListener('click', openSupabaseModal);
    document.getElementById('mobile-btn-supabase')?.addEventListener('click', openSupabaseModal);
    document.getElementById('dashboard-btn-supabase')?.addEventListener('click', openSupabaseModal);

    document.getElementById('btn-add-printer')?.addEventListener('click', () => openModal('modal-printer'));
    document.getElementById('btn-add-spool')?.addEventListener('click', () => openModal('modal-spool'));
    document.getElementById('btn-add-job')?.addEventListener('click', () => {
      populateJobModalDropdowns();
      openModal('modal-job');
    });
    document.getElementById('btn-add-sale')?.addEventListener('click', () => openModal('modal-sale'));

    // Close Modal Handler
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => closeModal());
    });
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
    });

    // Form Submissions
    document.getElementById('form-supabase')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.getElementById('supabase-url').value.trim();
      const key = document.getElementById('supabase-key').value.trim();
      await store.saveSupabaseCredentials(url, key);
      alert('⚡ ¡Base de datos Supabase conectada y datos sincronizados!');
      closeModal();
      location.reload();
    });

    document.getElementById('btn-force-sync')?.addEventListener('click', async () => {
      const url = document.getElementById('supabase-url').value.trim();
      const key = document.getElementById('supabase-key').value.trim();
      if (url && key) {
        store.saveSupabaseCredentials(url, key);
      }
      if (!store.useSupabase) {
        alert('Ingresa primero la URL y Key de Supabase.');
        return;
      }
      const btn = document.getElementById('btn-force-sync');
      btn.disabled = true;
      btn.textContent = 'Subiendo a la nube...';
      const success = await store.syncAllWithSupabase();
      btn.disabled = false;
      btn.textContent = '☁️ Subir Datos Locales a Supabase';
      if (success) {
        alert('⚡ ¡Tus datos locales (impresoras, filamentos, trabajos, ventas) se han subido a Supabase con éxito!');
        closeModal();
        location.reload();
      } else {
        alert('❌ Error al subir a Supabase. Verifica las tablas de tu proyecto.');
      }
    });

    document.getElementById('btn-replace-cloud')?.addEventListener('click', async () => {
      const url = document.getElementById('supabase-url').value.trim();
      const key = document.getElementById('supabase-key').value.trim();
      if (url && key) {
        store.saveSupabaseCredentials(url, key);
      }
      if (!store.useSupabase) {
        alert('Ingresa primero la URL y Key de Supabase.');
        return;
      }
      if (!confirm('⚠️ ¿Estás seguro de reemplazar todos los datos de Supabase con los datos de este PC? Esto borrará registros antiguos que hayas eliminado.')) {
        return;
      }
      const btn = document.getElementById('btn-replace-cloud');
      btn.disabled = true;
      btn.textContent = 'Reemplazando datos en la nube...';
      const success = await store.replaceSupabaseWithLocalData();
      btn.disabled = false;
      btn.textContent = '🧹 Limpiar Nube y Reemplazar con Datos del PC';
      if (success) {
        alert('⚡ ¡Supabase ha sido limpiado y actualizado exclusivamente con los datos de este PC!');
        closeModal();
        location.reload();
      } else {
        alert('❌ Error al reemplazar los datos en Supabase.');
      }
    });

    // Exportar datos a archivo JSON
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const jsonStr = store.exportJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `3d_print_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Importar datos desde archivo JSON
    const fileInput = document.getElementById('input-import-file');
    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const success = store.importJSON(content);
        if (success) {
          alert('📥 ¡Datos importados con éxito!');
          closeModal();
          location.reload();
        } else {
          alert('❌ El archivo seleccionado no contiene un respaldo válido.');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('btn-reset-data')?.addEventListener('click', async () => {
      if (confirm('🚨 ¡ATENCIÓN! Esto eliminará TODA la información (impresoras, filamentos, trabajos, ventas) localmente y en la nube de Supabase. ¿Deseas continuar?')) {
        await store.clearAllData();
        alert('🗑️ Se han eliminado todos los datos correctamente.');
        closeModal();
        location.reload();
      }
    });

    document.getElementById('form-printer')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await store.addPrinter({
        name: document.getElementById('printer-name').value,
        type: document.getElementById('printer-type').value,
        status: document.getElementById('printer-status').value,
        nozzleSize: parseFloat(document.getElementById('printer-nozzle').value) || 0.4,
        buildVolume: document.getElementById('printer-volume').value,
        wattage: parseInt(document.getElementById('printer-wattage').value) || 200,
        totalHours: 0
      });
      closeModal();
      renderPrinters();
    });

    document.getElementById('form-spool')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await store.addSpool({
        name: document.getElementById('spool-name').value,
        type: document.getElementById('spool-type').value,
        brand: document.getElementById('spool-brand').value,
        color: document.getElementById('spool-color').value,
        initialWeight: parseInt(document.getElementById('spool-weight').value) || 1000,
        remainingWeight: parseInt(document.getElementById('spool-weight').value) || 1000,
        cost: parseFloat(document.getElementById('spool-cost').value) || 20,
        nozzleTemp: document.getElementById('spool-nozzle-temp')?.value.trim() || '',
        bedTemp: document.getElementById('spool-bed-temp')?.value.trim() || ''
      });
      closeModal();
      renderSpools();
    });

    document.getElementById('form-job')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await store.addJob({
        title: document.getElementById('job-title').value,
        printerId: document.getElementById('job-printer-id').value,
        spoolId: document.getElementById('job-spool-id').value,
        weightGrams: parseInt(document.getElementById('job-grams').value) || 0,
        printTimeHours: parseFloat(document.getElementById('job-hours').value) || 0,
        labourHours: parseFloat(document.getElementById('job-labour-hours')?.value) || 0,
        date: document.getElementById('job-date')?.value || new Date().toISOString().split('T')[0],
        status: document.getElementById('job-status').value,
        failureReason: document.getElementById('job-failure-reason').value
      });
      closeModal();
      renderJobs(...getJobFilters());
    });

    document.getElementById('form-sale')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await store.addSale({
        jobTitle: document.getElementById('sale-title').value,
        clientName: document.getElementById('sale-client').value,
        salePrice: parseFloat(document.getElementById('sale-price').value) || 0,
        totalCost: parseFloat(document.getElementById('sale-cost').value) || 0,
        paymentStatus: document.getElementById('sale-payment-status').value
      });
      closeModal();
      renderSales();
    });

    document.getElementById('form-edit-printer')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-printer-id').value;
      await store.updatePrinter(id, {
        name: document.getElementById('edit-printer-name').value,
        type: document.getElementById('edit-printer-type').value,
        status: document.getElementById('edit-printer-status').value,
        nozzleSize: parseFloat(document.getElementById('edit-printer-nozzle').value) || 0.4,
        buildVolume: document.getElementById('edit-printer-volume').value,
        wattage: parseInt(document.getElementById('edit-printer-wattage').value) || 200,
        totalHours: parseFloat(document.getElementById('edit-printer-hours').value) || 0
      });
      closeModal();
      renderPrinters();
    });

    // Edit Spool
    document.getElementById('form-edit-spool')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-spool-id').value;
      await store.updateSpool(id, {
        name: document.getElementById('edit-spool-name').value,
        type: document.getElementById('edit-spool-type').value,
        brand: document.getElementById('edit-spool-brand').value,
        color: document.getElementById('edit-spool-color').value,
        initialWeight: parseInt(document.getElementById('edit-spool-weight').value) || 1000,
        remainingWeight: parseInt(document.getElementById('edit-spool-remaining').value) || 0,
        cost: parseFloat(document.getElementById('edit-spool-cost').value) || 0,
        nozzleTemp: document.getElementById('edit-spool-nozzle-temp')?.value.trim() || '',
        bedTemp: document.getElementById('edit-spool-bed-temp')?.value.trim() || ''
      });
      closeModal();
      renderSpools();
    });

    // Edit Job
    document.getElementById('form-edit-job')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-job-id').value;
      await store.updateJob(id, {
        title: document.getElementById('edit-job-title').value,
        printerId: document.getElementById('edit-job-printer-id').value,
        spoolId: document.getElementById('edit-job-spool-id').value,
        weightGrams: parseInt(document.getElementById('edit-job-grams').value) || 0,
        printTimeHours: parseFloat(document.getElementById('edit-job-hours').value) || 0,
        labourHours: parseFloat(document.getElementById('edit-job-labour-hours')?.value) || 0,
        date: document.getElementById('edit-job-date')?.value || new Date().toISOString().split('T')[0],
        status: document.getElementById('edit-job-status').value,
        failureReason: document.getElementById('edit-job-failure-reason').value
      });
      closeModal();
      renderJobs(...getJobFilters());
    });

    // Edit Sale
    document.getElementById('form-edit-sale')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-sale-id').value;
      await store.updateSale(id, {
        jobTitle: document.getElementById('edit-sale-title').value,
        clientName: document.getElementById('edit-sale-client').value,
        salePrice: parseFloat(document.getElementById('edit-sale-price').value) || 0,
        totalCost: parseFloat(document.getElementById('edit-sale-cost').value) || 0,
        paymentStatus: document.getElementById('edit-sale-payment-status').value,
        date: document.getElementById('edit-sale-date').value
      });
      closeModal();
      renderSales(...getSaleFilters());
    });

    // Settings Form
    document.getElementById('form-settings')?.addEventListener('submit', (e) => {
      e.preventDefault();
      store.saveSettings({
        currencySymbol: document.getElementById('cfg-currency').value.trim() || '$',
        electricityCostPerKwh: parseFloat(document.getElementById('cfg-electricity').value) || 0.18,
        labourCostPerHour: parseFloat(document.getElementById('cfg-labour').value) || 5.0,
        wearCostPerHour: parseFloat(document.getElementById('cfg-wear').value) || 0.25,
        defaultMargin: parseFloat(document.getElementById('cfg-margin').value) || 40
      });
      showToast('✅ Configuración guardada correctamente.');
    });

    // PIN Change Form
    document.getElementById('form-change-pin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPin = document.getElementById('cfg-pin-current').value;
      const newPin = document.getElementById('cfg-pin-new').value;
      const confirmPin = document.getElementById('cfg-pin-confirm').value;
      const savedPin = localStorage.getItem('app_family_pin') || DEFAULT_PIN;
      const msgEl = document.getElementById('cfg-pin-msg');

      if (currentPin !== savedPin) {
        msgEl.textContent = '❌ El PIN actual no es correcto.';
        msgEl.style.color = 'var(--accent-red)';
        msgEl.style.display = 'block';
        return;
      }
      if (newPin.length < 4) {
        msgEl.textContent = '❌ El nuevo PIN debe tener al menos 4 dígitos.';
        msgEl.style.color = 'var(--accent-red)';
        msgEl.style.display = 'block';
        return;
      }
      if (newPin !== confirmPin) {
        msgEl.textContent = '❌ Los PINs no coinciden.';
        msgEl.style.color = 'var(--accent-red)';
        msgEl.style.display = 'block';
        return;
      }
      localStorage.setItem('app_family_pin', newPin);
      msgEl.textContent = '✅ PIN cambiado correctamente.';
      msgEl.style.color = 'var(--accent-green)';
      msgEl.style.display = 'block';
      document.getElementById('cfg-pin-current').value = '';
      document.getElementById('cfg-pin-new').value = '';
      document.getElementById('cfg-pin-confirm').value = '';
    });

    // Logout / Lock
    document.getElementById('btn-cfg-logout')?.addEventListener('click', () => {
      localStorage.removeItem('app_unlocked');
      location.reload();
    });
  }

  function populateJobModalDropdowns() {
    const pSel = document.getElementById('job-printer-id');
    const sSel = document.getElementById('job-spool-id');
    if (pSel) {
      pSel.innerHTML = '<option value="">-- Sin Impresora --</option>' +
        store.getPrinters().map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
    if (sSel) {
      sSel.innerHTML = '<option value="">-- Sin Carrete --</option>' +
        store.getSpools().map(s => `<option value="${s.id}">${s.name} (${s.remainingWeight}g restantes)</option>`).join('');
    }
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  }

  // --- Toast Notification ---
  function showToast(message, duration = 3000) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), duration);
  }

  // --- 8. STL FILE UPLOADER HANDLER ---
  const stlInput = document.getElementById('stl-file-input');
  if (stlInput) {
    stlInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && stlViewerInstance) {
        stlViewerInstance.loadSTLFromFile(file, (info) => {
          document.getElementById('stl-dims').textContent = info.dimensions;
          document.getElementById('stl-volume').textContent = info.volumeCm3;
          document.getElementById('stl-weight').textContent = info.estWeightGramsPLA;
          document.getElementById('stl-metrics-box').style.display = 'block';
        });
      }
    });
  }

  document.getElementById('btn-stl-wireframe')?.addEventListener('click', () => {
    if (stlViewerInstance) stlViewerInstance.toggleWireframe();
  });
  document.getElementById('btn-stl-reset')?.addEventListener('click', () => {
    if (stlViewerInstance) stlViewerInstance.resetView();
  });

  // Helper Utils
  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initial Boot
  setupModals();
  initJobFilters();
  initSaleFilters();
  if (store.useSupabase) {
    store.syncFromSupabase()
      .catch(err => console.warn('Supabase sync warning on boot:', err))
      .finally(() => navigateTo('dashboard'));
  } else {
    navigateTo('dashboard');
  }
});
