import { getCredential } from '../CredentialStore.js';
import { optimaRequest, branchNames, sameBranch, rows, dateISO, stockAt } from '../OptimaAPI.js';

const node = (tag, value, cls = '') => {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = String(value ?? '');
  if (cls) element.className = cls;
  return element;
};
const id = value => String(value ?? '');
const byText = value => String(value ?? '').trim().toLocaleLowerCase('ru');
const money = value => {
  const number = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(number)
    ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(number) + ' ₸'
    : 'Цена не указана';
};
const selectOptions = (el, pairs, previous) => {
  el.replaceChildren(...pairs.map(([value, title]) => new Option(String(title), id(value))));
  el.value = pairs.some(([value]) => id(value) === id(previous)) ? id(previous) : (pairs[0]?.[0] ?? '');
};
const table = (headers, records) => {
  const element = node('table');
  const head = node('thead'), hr = node('tr');
  for (const label of headers) hr.append(node('th', label));
  head.append(hr);
  const body = node('tbody');
  for (const record of records) {
    const row = node('tr');
    for (const cell of record) row.append(node('td', cell));
    body.append(row);
  }
  element.append(head, body);
  return element;
};

export function passportCatalogItems(db, productId, branch = '', supplierId = '') {
  const product = rows(db?.products).find(p => id(p.id) === id(productId));
  if (!product) return [];
  const links = new Set(rows(product.catalogLinks).map(id));
  const listed = rows(db.supplierCatalog).filter(item =>
    id(item.usedProductId) === id(productId) || links.has(id(item.id))
  ).filter(item => (!supplierId || id(item.supplierId) === id(supplierId)) &&
    (!branch || !item.branch || item.branch === '*' || sameBranch(item.branch, branch)));
  const matched = new Set(listed.map(item => id(item.id)));
  const manual = rows(db.offers).filter(offer =>
    id(offer.productId) === id(productId) && (!supplierId || id(offer.supplierId) === id(supplierId)) &&
    (!branch || !offer.branch || offer.branch === '*' || sameBranch(offer.branch, branch)) &&
    (!offer.catalogItemId || !matched.has(id(offer.catalogItemId)))
  ).map(offer => ({ ...offer, name: offer.product || product.name,
    price: offer.price, unit: offer.unit, isManualOffer: true }));
  return [...listed, ...manual];
}

export default class OptimaPassportWidget {
  constructor(widget) {
    this.widget = widget;
    this.store = window.dashboardxStore;
    this.destroyed = false;
    this.seq = 0;
    this.detailSeq = 0;
    this.availableProducts = [];
    this.handlers = [];
    this.search = widget.querySelector('[data-role="pp-search"]');
    this.product = widget.querySelector('[data-role="pp-product"]');
    this.branch = widget.querySelector('[data-role="pp-branch"]');
    this.supplier = widget.querySelector('[data-role="pp-supplier"]');
    this.summary = widget.querySelector('[data-role="pp-summary"]');
    this.status = widget.querySelector('[data-role="pp-status"]');
    this.content = widget.querySelector('[data-role="pp-content"]');
    this.tabs = widget.querySelector('[data-role="pp-tabs"]');
    const saved = this.store?.getWidgetState(widget.instanceId) || {};
    this.state = {
      search: typeof saved.search === 'string' ? saved.search : '',
      product: id(saved.product),
      branch: id(saved.branch),
      supplier: id(saved.supplier),
      tab: ['catalog', 'documents', 'stocks', 'orders', 'schedules'].includes(saved.tab) ? saved.tab : 'catalog'
    };
    this.search.value = this.state.search;
    this.on(this.search, 'input', () => {
      this.state.search = this.search.value;
      this.persist();
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.load(), 250);
    });
    this.on(this.product, 'change', () => {
      this.state.product = this.product.value;
      this.state.supplier = '';
      this.persist();
      this.loadSelectedProduct();
    });
    this.on(this.branch, 'change', () => {
      this.state.branch = this.branch.value;
      this.persist();
      this.render();
    });
    this.on(this.supplier, 'change', () => {
      this.state.supplier = this.supplier.value;
      this.persist();
      this.render();
    });
    this.on(widget.querySelector('[data-role="pp-refresh"]'), 'click', () => this.load());
    this.on(this.tabs, 'click', event => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      this.state.tab = button.dataset.tab;
      this.persist();
      this.render();
    });
    this.onCredentials = event => { if (event.detail?.service === 'optima') this.load(); };
    this.onUpdated = () => this.load();
    window.addEventListener('dashboardx:credential-changed', this.onCredentials);
    window.addEventListener('dashboardx:optima-updated', this.onUpdated);
    this.load();
    // Keep server load manual/event-driven to avoid repeatedly fetching a large database.
  }
  on(target, type, handler) {
    target?.addEventListener(type, handler);
    this.handlers.push(() => target?.removeEventListener(type, handler));
  }
  persist() {
    this.store?.updateWidgetState(this.widget.instanceId, { ...this.state });
  }
  async load() {
    const seq = ++this.seq;
    this.controller?.abort();
    this.detailController?.abort();
    if (!getCredential('optima')) {
      this.db = null;
      this.availableProducts = [];
      this.product.replaceChildren();
      this.content.replaceChildren();
      this.status.textContent = 'Подключите Admin Token в «Настройки Оптима».';
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.status.textContent = 'Поиск наименований на Railway…';
    try {
      const query = encodeURIComponent(this.state.search);
      const index = await optimaRequest('/api/dashboardx/optima/v1/products?limit=1000&q=' + query, {
        method: 'GET', signal: controller.signal
      });
      if (this.destroyed || seq !== this.seq) return;
      this.availableProducts = rows(index.products);
      this.populateProducts();
      this.persist();
      await this.loadSelectedProduct(seq);
    } catch (error) {
      if (this.destroyed || seq !== this.seq || controller.signal.aborted) return;
      this.db = null;
      this.content.replaceChildren();
      this.status.textContent = error.status === 401 ? 'Неверный Admin Token.' :
        'Не удалось загрузить список: ' + String(error.message || error);
    }
  }
  async loadSelectedProduct(seq = this.seq) {
    const requestSeq = ++this.detailSeq;
    this.detailController?.abort();
    this.db = null;
    this.content.replaceChildren();
    const productId = this.state.product;
    if (!productId) {
      this.summary.textContent = 'Поиск не дал результатов.';
      this.status.textContent = 'Попробуйте изменить запрос.';
      return;
    }
    const controller = new AbortController();
    this.detailController = controller;
    this.status.textContent = 'Загрузка паспорта наименования…';
    try {
      const details = await optimaRequest('/api/dashboardx/optima/v1/passport?productId=' + encodeURIComponent(productId), {
        method: 'GET', signal: controller.signal
      });
      if (this.destroyed || seq !== this.seq || requestSeq !== this.detailSeq ||
          controller.signal.aborted || id(productId) !== id(this.state.product)) return;
      this.db = {
        products: [details.product],
        suppliers: rows(details.suppliers),
        supplierCatalog: rows(details.catalog),
        offers: rows(details.offers),
        declarations: rows(details.supplierDocuments),
        stocks: rows(details.stockEvents),
        history: rows(details.orders)
      };
      this.revision = details.revision;
      selectOptions(this.branch, [['', 'Все филиалы'], ...branchNames(this.db).map(name => [name, name])], this.state.branch);
      this.state.branch = this.branch.value;
      this.populateSuppliers();
      this.render();
    } catch (error) {
      if (this.destroyed || seq !== this.seq || controller.signal.aborted) return;
      this.status.textContent = error.status === 401 ? 'Неверный Admin Token.' :
        'Паспорт недоступен: ' + String(error.message || error);
    }
  }
  populateProducts() {
    selectOptions(this.product, this.availableProducts.map(product => [id(product.id), product.name]), this.state.product);
    this.state.product = this.product.value;
  }
  populateSuppliers() {
    if (!this.db) return;
    const productId = this.state.product;
    const linked = passportCatalogItems(this.db, productId);
    const product = rows(this.db.products).find(p => id(p.id) === id(productId));
    const linkedIds = new Set(linked.map(item => id(item.supplierId)));
    for (const link of rows(product?.orderSuppliers)) if (link.supplierId != null) linkedIds.add(id(link.supplierId));
    const suppliers = rows(this.db.suppliers).filter(item => linkedIds.has(id(item.id)));
    selectOptions(this.supplier, [['', 'Все поставщики'], ...suppliers.map(item => [id(item.id), item.name])], this.state.supplier);
    this.state.supplier = this.supplier.value;
  }
  render() {
    this.tabs.querySelectorAll('[data-tab]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.tab === this.state.tab));
    });
    this.content.replaceChildren();
    if (!this.db) return;
    const product = rows(this.db.products).find(item => id(item.id) === id(this.state.product));
    if (!product) {
      this.summary.textContent = 'Наименование не найдено.';
      this.status.textContent = 'Подберите другое наименование.';
      return;
    }
    const links = passportCatalogItems(this.db, product.id, this.state.branch, this.state.supplier);
    this.summary.replaceChildren(node('strong', product.name),
      node('small', 'ID ' + id(product.id) + ' · единица учёта: ' + id(product.unit || 'не указана')
        + ' · вариантов поставки: ' + links.length));
    this.status.textContent = 'PRO OPTIMA · ревизия ' + this.revision +
      ' · цены и документы без подтверждённой связи не считаются проверенными';
    if (this.state.tab === 'catalog') this.renderCatalog(product, links);
    if (this.state.tab === 'documents') this.renderDocuments(product, links);
    if (this.state.tab === 'stocks') this.renderStocks(product);
    if (this.state.tab === 'orders') this.renderOrders(product);
    if (this.state.tab === 'schedules') this.renderSchedules(product);
  }
  renderCatalog(product, entries) {
    const suppliers = new Map(rows(this.db.suppliers).map(item => [id(item.id), item.name]));
    if (!entries.length) return this.content.append(node('p', 'Нет товаров или предложений, привязанных к этому наименованию.', 'pp-hint'));
    this.content.append(table(['Поставщик / товар', 'Цена', 'Упаковка / единица', 'Филиал'], entries.map(item => [
      (suppliers.get(id(item.supplierId)) || 'Поставщик не установлен') + ' · ' + (item.name || item.product || product.name),
      money(item.price),
      id(item.unit || product.unit || '—') + (item.isManualOffer ? ' · предложение' : ''),
      id(item.branch || 'Все')
    ])));
    this.content.append(node('p', 'Цена показана в исходной единице поставщика. Пересчёт за штуку/кг возможен только при подтверждённом коэффициенте упаковки.', 'pp-hint'));
  }
  renderDocuments(product, entries) {
    const supplierIds = new Set(entries.map(entry => id(entry.supplierId)));
    for (const link of rows(product.orderSuppliers)) if (link.supplierId != null) supplierIds.add(id(link.supplierId));
    if (this.state.supplier) { supplierIds.clear(); supplierIds.add(this.state.supplier); }
    const suppliers = new Map(rows(this.db.suppliers).map(item => [id(item.id), item.name]));
    const candidates = rows(this.db.declarations).filter(doc => supplierIds.has(id(doc.supplierId)));
    if (!candidates.length) {
      this.content.append(node('p', 'Документы, связанные с поставщиками этого наименования, не найдены. Это не доказывает отсутствие документов на сам товар.', 'pp-hint'));
      return;
    }
    this.content.append(node('p', 'Ниже документы поставщиков — кандидаты на привязку. Подтверждение по накладной, бренду, изготовителю и конкретному товару ещё требуется.', 'pp-alert'));
    this.content.append(table(['Поставщик', 'Документ / группа', 'Действует до', 'Проверка'], candidates.map(doc => [
      suppliers.get(id(doc.supplierId)) || 'Неизвестный поставщик',
      (doc.documentNumber || 'Без номера') + ' · ' + (doc.productType || 'Тип не указан'),
      doc.endDate || 'Срок не указан',
      doc.archivedAt ? 'В архиве' : (doc.endDate && doc.endDate < dateISO() ? 'Срок истёк' : 'Связь не подтверждена')
    ])));
  }
  renderStocks(product) {
    const branches = this.state.branch ? [this.state.branch] : branchNames(this.db);
    const date = dateISO();
    this.content.append(table(['Филиал', 'Последний остаток', 'Дата', 'Поступил от'], branches.map(branch => {
      const record = stockAt(this.db.stocks, product.id, branch, date);
      return [branch, record ? id(record.value) + ' ' + id(record.unit || product.unit) : 'Нет данных',
        record?.date || '—', record?.sourceSupplier || 'Не установлен'];
    })));
    this.content.append(node('p', 'Остатки объединены по наименованию. Сведения о поставщике показываются только если он записан в фактическом поступлении.', 'pp-hint'));
  }
  renderOrders(product) {
    const orders = rows(this.db.history).filter(order =>
      (!this.state.branch || sameBranch(order.branch, this.state.branch)) &&
      (!this.state.supplier || id(order.supplierId) === this.state.supplier) &&
      rows(order.items).some(item => id(item.productId) === id(product.id) ||
        byText(item.product) === byText(product.name))
    ).sort((a,b) => id(b.requestDate).localeCompare(id(a.requestDate))).slice(0, 100);
    if (!orders.length) return this.content.append(node('p', 'История заявок по этому наименованию не найдена.', 'pp-hint'));
    this.content.append(table(['Дата', 'Филиал', 'Поставщик', 'Статус'], orders.map(order => [
      order.requestDate || '—', order.branch || '—', order.supplier || '—', order.stage || '—'
    ])));
  }
  renderSchedules(product) {
    const suppliers = new Map(rows(this.db.suppliers).map(item => [id(item.id), item]));
    const supplierIds = new Set(passportCatalogItems(this.db, product.id).map(item => id(item.supplierId)));
    for (const link of rows(product.orderSuppliers)) if (link.supplierId != null) supplierIds.add(id(link.supplierId));
    const found = [...supplierIds].map(supplierId => suppliers.get(supplierId))
      .filter(Boolean).filter(item => !this.state.supplier || id(item.id) === this.state.supplier);
    const schedules = found.flatMap(item => rows(item.schedules)
      .filter(schedule => !this.state.branch || sameBranch(schedule.branch, this.state.branch))
      .map(schedule => [item.name || '—', schedule.branch || '—',
        schedule.order || 'Не указаны', schedule.delivery || 'Не указаны',
        schedule.note || '—']));
    if (!schedules.length) return this.content.append(node('p',
      'Для этого наименования нет настроенных графиков поставщиков по выбранным фильтрам.', 'pp-hint'));
    this.content.append(table(['Поставщик', 'Филиал', 'Дни заявки', 'Дни поставки', 'Примечание'], schedules));
    this.content.append(node('p',
      'Точная ожидаемая дата определяется правилами доставки для каждого дня заявки. Настройка графиков остаётся в виджете «Поставщики».', 'pp-hint'));
  }
  destroy() {
    this.destroyed = true;
    this.controller?.abort();
    this.detailController?.abort();
    clearTimeout(this.searchTimer);
    this.handlers.forEach(fn => fn());
    window.removeEventListener('dashboardx:credential-changed', this.onCredentials);
    window.removeEventListener('dashboardx:optima-updated', this.onUpdated);
    this.persist();
  }
}
