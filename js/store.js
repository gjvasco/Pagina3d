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

const DEFAULT_SUPABASE_CONFIG = {
  url: '', // Opcional: define tu SUPABASE_URL aquí para que todos los dispositivos se conecten automáticamente
  key: ''  // Opcional: define tu SUPABASE_ANON_KEY aquí para que todos los dispositivos se conecten automáticamente
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
      let cfg = null;
      const cfgRaw = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (cfgRaw) {
        cfg = JSON.parse(cfgRaw);
      } else if (DEFAULT_SUPABASE_CONFIG.url && DEFAULT_SUPABASE_CONFIG.key) {
        cfg = DEFAULT_SUPABASE_CONFIG;
      }

      if (cfg && cfg.url && cfg.key && window.supabase) {
        this.supabase = window.supabase.createClient(cfg.url, cfg.key);
        this.useSupabase = true;
        console.log('⚡ Conectado a Supabase Cloud Database');
      }
    } catch (e) {
      console.warn('Supabase no configurado, usando localStorage', e);
      this.useSupabase = false;
    }
  }

  async syncFromSupabase() {
    if (!this.useSupabase || !this.supabase) return false;

    try {
      const [resP, resS, resJ, resV] = await Promise.all([
        this.supabase.from('printers').select('*'),
        this.supabase.from('spools').select('*'),
        this.supabase.from('jobs').select('*'),
        this.supabase.from('sales').select('*')
      ]);

      if (resP.error) console.error('Error Supabase impresoras:', resP.error.message || resP.error);
      if (resS.error) console.error('Error Supabase filamentos:', resS.error.message || resS.error);
      if (resJ.error) console.error('Error Supabase trabajos:', resJ.error.message || resJ.error);
      if (resV.error) console.error('Error Supabase ventas:', resV.error.message || resV.error);

      let fetchedAny = false;

      if (resP.data && !resP.error) {
        this.data.printers = resP.data.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          nozzleSize: parseFloat(p.nozzle_size) || 0.4,
          buildVolume: p.build_volume || '',
          wattage: parseInt(p.wattage) || 200,
          totalHours: parseFloat(p.total_hours) || 0,
          notes: p.notes || ''
        }));
        fetchedAny = true;
      }

      if (resS.data && !resS.error) {
        this.data.spools = resS.data.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          brand: s.brand || '',
          color: s.color || '#00f2fe',
          initialWeight: parseInt(s.initial_weight) || 1000,
          remainingWeight: parseInt(s.remaining_weight) || 0,
          cost: parseFloat(s.cost) || 0
        }));
        fetchedAny = true;
      }

      if (resJ.data && !resJ.error) {
        this.data.jobs = resJ.data.map(j => ({
          id: j.id,
          title: j.title,
          printerId: j.printer_id,
          spoolId: j.spool_id,
          weightGrams: parseInt(j.weight_grams) || 0,
          printTimeHours: parseFloat(j.print_time_hours) || 0,
          status: j.status,
          failureReason: j.failure_reason || '',
          date: j.date || (j.created_at ? j.created_at.split('T')[0] : '')
        }));
        fetchedAny = true;
      }

      if (resV.data && !resV.error) {
        this.data.sales = resV.data.map(v => ({
          id: v.id,
          jobTitle: v.job_title,
          clientName: v.client_name,
          salePrice: parseFloat(v.sale_price) || 0,
          totalCost: parseFloat(v.total_cost) || 0,
          profit: parseFloat(v.profit) || 0,
          paymentStatus: v.payment_status,
          date: v.date || (v.created_at ? v.created_at.split('T')[0] : '')
        }));
        fetchedAny = true;
      }

      if (fetchedAny) {
        this.saveLocalStorageData();
        console.log('☁️ Sincronizados datos reales desde Supabase');
      }

      return true;
    } catch (e) {
      console.error('Error al sincronizar desde Supabase:', e);
      return false;
    }
  }

  async pushAllToSupabase() {
    if (!this.useSupabase || !this.supabase) return false;

    try {
      if (this.data.printers && this.data.printers.length > 0) {
        const pRows = this.data.printers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          nozzle_size: p.nozzleSize,
          build_volume: p.buildVolume,
          wattage: p.wattage,
          total_hours: p.totalHours,
          notes: p.notes || ''
        }));
        await this.supabase.from('printers').upsert(pRows, { onConflict: 'id' });
      }

      if (this.data.spools && this.data.spools.length > 0) {
        const sRows = this.data.spools.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          brand: s.brand,
          color: s.color,
          initial_weight: s.initialWeight,
          remaining_weight: s.remainingWeight,
          cost: s.cost
        }));
        await this.supabase.from('spools').upsert(sRows, { onConflict: 'id' });
      }

      if (this.data.jobs && this.data.jobs.length > 0) {
        const jRows = this.data.jobs.map(j => ({
          id: j.id,
          title: j.title,
          printer_id: j.printerId,
          spool_id: j.spoolId,
          weight_grams: j.weightGrams,
          print_time_hours: j.printTimeHours,
          status: j.status,
          failure_reason: j.failureReason || '',
          date: j.date || new Date().toISOString().split('T')[0]
        }));
        await this.supabase.from('jobs').upsert(jRows, { onConflict: 'id' });
      }

      if (this.data.sales && this.data.sales.length > 0) {
        const vRows = this.data.sales.map(v => ({
          id: v.id,
          job_title: v.jobTitle,
          client_name: v.clientName,
          sale_price: v.salePrice,
          total_cost: v.totalCost,
          profit: v.profit,
          payment_status: v.paymentStatus,
          date: v.date || new Date().toISOString().split('T')[0]
        }));
        await this.supabase.from('sales').upsert(vRows, { onConflict: 'id' });
      }

      console.log('⚡ ¡Todos los datos locales subidos a Supabase con éxito!');
      return true;
    } catch (e) {
      console.error('Error al subir datos a Supabase:', e);
      return false;
    }
  }

  async syncAllWithSupabase() {
    if (!this.useSupabase || !this.supabase) return false;
    await this.pushAllToSupabase();
    await this.syncFromSupabase();
    return true;
  }

  async replaceSupabaseWithLocalData() {
    if (!this.useSupabase || !this.supabase) return false;

    try {
      // Eliminar registros viejos/fantasma en Supabase
      await Promise.all([
        this.supabase.from('sales').delete().neq('id', '0'),
        this.supabase.from('jobs').delete().neq('id', '0'),
        this.supabase.from('spools').delete().neq('id', '0'),
        this.supabase.from('printers').delete().neq('id', '0')
      ]);

      // Reemplazar con los datos limpios actuales
      await this.pushAllToSupabase();
      console.log('⚡ Supabase limpiado y actualizado con datos locales.');
      return true;
    } catch (e) {
      console.error('Error al reemplazar datos en Supabase:', e);
      return false;
    }
  }

  async saveSupabaseCredentials(url, key) {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
    this.initSupabase();
    if (this.useSupabase) {
      await this.syncAllWithSupabase();
    }
  }

  getSupabaseCredentials() {
    try {
      const cfgRaw = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (cfgRaw) return JSON.parse(cfgRaw);
      return DEFAULT_SUPABASE_CONFIG;
    } catch (e) {
      return DEFAULT_SUPABASE_CONFIG;
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

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        this.data = {
          settings: parsed.settings || DEMO_DATA.settings,
          printers: Array.isArray(parsed.printers) ? parsed.printers : [],
          spools: Array.isArray(parsed.spools) ? parsed.spools : [],
          jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
          sales: Array.isArray(parsed.sales) ? parsed.sales : []
        };
        this.saveLocalStorageData();
        if (this.useSupabase) {
          this.pushAllToSupabase();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error al importar datos JSON:', e);
      return false;
    }
  }
}

window.store = new Store();
