/* ==========================================================================
   3D PRINT HUB - DATA STORE WITH SUPABASE CLOUD & LOCALSTORAGE HYBRID
   ========================================================================== */

const STORAGE_KEY = '3d_print_hub_data_v1';
const SUPABASE_CONFIG_KEY = '3d_print_hub_supabase_cfg';

const DEMO_DATA = {
  settings: {
    electricityCostPerKwh: 0.18,
    labourCostPerHour: 5.0,
    wearCostPerHour: 0.25,
    defaultMargin: 40,
    currencySymbol: '$'
  },
  printers: [
    {
      id: 'p1',
      name: 'Bambu Lab X1-Carbon',
      type: 'FDM',
      status: 'imprimiendo',
      nozzleSize: 0.4,
      buildVolume: '256 x 256 x 256 mm',
      wattage: 350,
      totalHours: 142.5,
      notes: 'Boquilla de acero endurecido para Filamentos con Fibra de Carbono'
    },
    {
      id: 'p2',
      name: 'Ender 3 V2 Neo',
      type: 'FDM',
      status: 'inactiva',
      nozzleSize: 0.4,
      buildVolume: '220 x 220 x 250 mm',
      wattage: 200,
      totalHours: 285.0,
      notes: 'Instalado nivelador automático CR Touch'
    }
  ],
  spools: [
    {
      id: 's1',
      name: 'eSUN PLA+ Negro',
      type: 'PLA',
      brand: 'eSUN',
      color: '#1a1a1a',
      initialWeight: 1000,
      remainingWeight: 680,
      cost: 22.00
    },
    {
      id: 's2',
      name: 'Sunlu PETG Cyan Neón',
      type: 'PETG',
      brand: 'Sunlu',
      color: '#00f2fe',
      initialWeight: 1000,
      remainingWeight: 420,
      cost: 25.50
    }
  ],
  jobs: [
    {
      id: 'j1',
      title: 'Soporte Articulado de Monitor',
      printerId: 'p1',
      spoolId: 's1',
      weightGrams: 240,
      printTimeHours: 6.5,
      status: 'completado',
      date: '2026-09-20'
    }
  ],
  sales: [
    {
      id: 'v1',
      jobTitle: 'Soporte Articulado de Monitor',
      clientName: 'Carlos Mendoza',
      salePrice: 35.00,
      totalCost: 12.80,
      profit: 22.20,
      paymentStatus: 'pagado',
      date: '2026-09-21'
    }
  ]
};

class Store {
  constructor() {
    this.supabase = null;
    this.useSupabase = false;
    this.data = this.loadLocalStorageData();
    this.initSupabase();
  }

  initSupabase() {
    try {
      const cfgRaw = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (cfgRaw) {
        const cfg = JSON.parse(cfgRaw);
        if (cfg.url && cfg.key && window.supabase) {
          this.supabase = window.supabase.createClient(cfg.url, cfg.key);
          this.useSupabase = true;
          console.log('⚡ Conectado a Supabase Cloud Database');
        }
      }
    } catch (e) {
      console.warn('Supabase no configurado, usando localStorage', e);
      this.useSupabase = false;
    }
  }

  saveSupabaseCredentials(url, key) {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
    this.initSupabase();
  }

  getSupabaseCredentials() {
    try {
      return JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  loadLocalStorageData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveLocalStorageData(DEMO_DATA);
        return JSON.parse(JSON.stringify(DEMO_DATA));
      }
      return JSON.parse(raw);
    } catch (e) {
      return JSON.parse(JSON.stringify(DEMO_DATA));
    }
  }

  saveLocalStorageData(data = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.data = data;
    } catch (e) {
      console.error('Error guardando en localStorage', e);
    }
  }

  // --- IMPRESORAS ---
  getPrinters() { return this.data.printers; }
  getPrinter(id) { return this.data.printers.find(p => p.id === id); }
  
  async addPrinter(printer) {
    printer.id = 'p_' + Date.now();
    this.data.printers.push(printer);
    this.saveLocalStorageData();

    if (this.useSupabase) {
      try {
        await this.supabase.from('printers').insert([{
          id: printer.id,
          name: printer.name,
          type: printer.type,
          status: printer.status,
          nozzle_size: printer.nozzleSize,
          build_volume: printer.buildVolume,
          wattage: printer.wattage,
          total_hours: printer.totalHours,
          notes: printer.notes || ''
        }]);
      } catch (e) { console.error('Error insertando en Supabase:', e); }
    }
    return printer;
  }

  deletePrinter(id) {
    this.data.printers = this.data.printers.filter(p => p.id !== id);
    this.saveLocalStorageData();

    if (this.useSupabase) {
      this.supabase.from('printers').delete().eq('id', id).then();
    }
  }

  updatePrinter(id, updates) {
    const printer = this.getPrinter(id);
    if (!printer) return;
    Object.assign(printer, updates);
    this.saveLocalStorageData();

    if (this.useSupabase) {
      this.supabase.from('printers').update({
        name: printer.name,
        type: printer.type,
        status: printer.status,
        nozzle_size: printer.nozzleSize,
        build_volume: printer.buildVolume,
        wattage: printer.wattage,
        total_hours: printer.totalHours
      }).eq('id', id).then();
    }
  }

  // --- FILAMENTOS ---
  getSpools() { return this.data.spools; }
  getSpool(id) { return this.data.spools.find(s => s.id === id); }

  async addSpool(spool) {
    spool.id = 's_' + Date.now();
    this.data.spools.push(spool);
    this.saveLocalStorageData();

    if (this.useSupabase) {
      try {
        await this.supabase.from('spools').insert([{
          id: spool.id,
          name: spool.name,
          type: spool.type,
          brand: spool.brand,
          color: spool.color,
          initial_weight: spool.initialWeight,
          remaining_weight: spool.remainingWeight,
          cost: spool.cost
        }]);
      } catch (e) { console.error('Error insertando spool en Supabase:', e); }
    }
    return spool;
  }

  deleteSpool(id) {
    this.data.spools = this.data.spools.filter(s => s.id !== id);
    this.saveLocalStorageData();
    if (this.useSupabase) {
      this.supabase.from('spools').delete().eq('id', id).then();
    }
  }

  consumeFilament(spoolId, grams) {
    const spool = this.getSpool(spoolId);
    if (spool) {
      spool.remainingWeight = Math.max(0, spool.remainingWeight - grams);
      this.saveLocalStorageData();
      if (this.useSupabase) {
        this.supabase.from('spools').update({ remaining_weight: spool.remainingWeight }).eq('id', spoolId).then();
      }
    }
  }

  // --- TRABAJOS DE IMPRESIÓN ---
  getJobs() { return this.data.jobs; }
  
  async addJob(job) {
    job.id = 'j_' + Date.now();
    job.date = job.date || new Date().toISOString().split('T')[0];
    this.data.jobs.unshift(job);

    if (job.status === 'completado' && job.spoolId && job.weightGrams) {
      this.consumeFilament(job.spoolId, job.weightGrams);
    }
    if (job.printerId && job.printTimeHours) {
      const printer = this.getPrinter(job.printerId);
      if (printer) {
        printer.totalHours += parseFloat(job.printTimeHours);
        this.saveLocalStorageData();
      }
    }

    this.saveLocalStorageData();

    if (this.useSupabase) {
      try {
        await this.supabase.from('jobs').insert([{
          id: job.id,
          title: job.title,
          printer_id: job.printerId,
          spool_id: job.spoolId,
          weight_grams: job.weightGrams,
          print_time_hours: job.printTimeHours,
          status: job.status,
          failure_reason: job.failureReason || ''
        }]);
      } catch (e) { console.error('Error insertando job en Supabase:', e); }
    }
    return job;
  }

  deleteJob(id) {
    this.data.jobs = this.data.jobs.filter(j => j.id !== id);
    this.saveLocalStorageData();
    if (this.useSupabase) {
      this.supabase.from('jobs').delete().eq('id', id).then();
    }
  }

  // --- VENTAS ---
  getSales() { return this.data.sales; }

  async addSale(sale) {
    sale.id = 'v_' + Date.now();
    sale.date = sale.date || new Date().toISOString().split('T')[0];
    sale.profit = parseFloat((sale.salePrice - sale.totalCost).toFixed(2));
    this.data.sales.unshift(sale);
    this.saveLocalStorageData();

    if (this.useSupabase) {
      try {
        await this.supabase.from('sales').insert([{
          id: sale.id,
          job_title: sale.jobTitle,
          client_name: sale.clientName,
          sale_price: sale.salePrice,
          total_cost: sale.totalCost,
          profit: sale.profit,
          payment_status: sale.paymentStatus
        }]);
      } catch (e) { console.error('Error insertando sale en Supabase:', e); }
    }
    return sale;
  }

  deleteSale(id) {
    this.data.sales = this.data.sales.filter(s => s.id !== id);
    this.saveLocalStorageData();
    if (this.useSupabase) {
      this.supabase.from('sales').delete().eq('id', id).then();
    }
  }

  getSettings() { return this.data.settings; }
}

window.store = new Store();
