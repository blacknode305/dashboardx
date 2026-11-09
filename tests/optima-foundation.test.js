import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passportCatalogItems } from '../client/js/module/Widget/OptimaPassport.js';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Optima category includes existing Requests and the new Settings and Passport widgets', () => {
  const catalog = source('../client/js/index.js');
  const logic = source('../client/js/module/WidgetLogic.js');
  for (const [id, file] of [
    ['optimaOrders', '_optimaOrders.html'],
    ['optimaSettings', '_optimaSettings.html'],
    ['optimaPassport', '_optimaPassport.html']
  ]) {
    assert.match(catalog, new RegExp(id + ":\\s*\\{category:'optima',file:'" + file + "'\\}"));
    assert.match(logic, new RegExp('Optima' + id.slice(6) + 'Widget'));
    assert.match(source('../client/' + file), new RegExp('data-id="' + id + '"'));
  }
});

test('product passport preserves different suppliers and never guesses conversion factors', () => {
  const data = {
    products: [{ id: 10, name: 'Молоко', unit: 'шт', catalogLinks: ['a'] }],
    supplierCatalog: [
      { id: 'a', usedProductId: 10, supplierId: 'one', name: 'Молоко 12 шт', unit: 'кор', price: 6000, branch: '*' },
      { id: 'b', usedProductId: 10, supplierId: 'two', name: 'Молоко 10 шт', unit: 'кор', price: 5400, branch: 'Горняк' }
    ],
    offers: [
      { catalogItemId: 'a', supplierId: 'one', productId: 10, price: 6000, unit: 'кор' },
      { supplierId: 'three', productId: 10, price: 490, unit: 'шт' }
    ]
  };
  const full = passportCatalogItems(data, 10);
  assert.equal(full.length, 3);
  assert.deepEqual(full.map(x => x.supplierId), ['one', 'two', 'three']);
  assert.equal(passportCatalogItems(data, 10, 'Лободы').length, 2);
  assert.equal(passportCatalogItems(data, 10, 'Горняк', 'two').length, 1);
  assert.equal(passportCatalogItems(data, 10, '', 'missing').length, 0);
});

test('new Optima widgets do not save administrator password or branch PIN to browser storage', () => {
  const settings = source('../client/js/module/Widget/OptimaSettings.js');
  const passport = source('../client/js/module/Widget/OptimaPassport.js');
  assert.doesNotMatch(settings, /localStorage|sessionStorage/);
  assert.doesNotMatch(passport, /localStorage|sessionStorage/);
  assert.match(settings, /setOptimaWritePassword/);
  assert.match(passport, /Связь не подтверждена/);
});
