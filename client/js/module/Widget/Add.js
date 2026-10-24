export default class AddWidget {
  constructor(widget) {
    this.widget = widget;
    this.store = window.dashboardxStore;
    this.type = widget.querySelector('[data-role="widget-type"]');
    this.existing = widget.querySelector('[data-role="existing-widget"]');
    this.list = widget.querySelector('[data-role="instances-list"]');
    this.message = widget.querySelector('[data-role="manager-message"]');
    this.createHandler = () => this.dispatch('create', { type: this.type.value });
    this.linkHandler = () => this.dispatch('link', { id: this.existing.value });
    widget.querySelector('[data-action="create-instance"]').addEventListener('click', this.createHandler);
    widget.querySelector('[data-action="link-instance"]').addEventListener('click', this.linkHandler);
    this.render();
  }

  dispatch(action, details) {
    window.dispatchEvent(new CustomEvent('dashboardx:widget-action', { detail: { action, ...details } }));
  }

  option(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  button(label, title, action, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.disabled = disabled;
    button.addEventListener('click', action);
    return button;
  }

  render() {
    const store = this.store;
    const types = window.dashboardxTemplates || [];
    this.type.replaceChildren();
    for (const type of types) {
      if (type.id === 'add') continue;
      this.option(this.type, type.id, type.title);
    }
    this.existing.replaceChildren();
    const workspace = store.workspace;
    const available = Object.values(store.state.instances).filter(item => !workspace.widgets.includes(item.id));
    for (const item of available) {
      this.option(this.existing, item.id, item.type + ' · ' + item.id + ' (' + store.workspaceNamesFor(item.id).join(', ') + ')');
    }
    this.widget.querySelector('[data-action="link-instance"]').disabled = available.length === 0;
    this.widget.querySelector('[data-action="create-instance"]').disabled = !this.type.options.length;
    this.list.replaceChildren();
    const items = workspace.widgets.map(id => store.getInstance(id)).filter(Boolean);
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'manager-empty';
      empty.textContent = 'На столе пока нет виджетов. Создайте первый или подключите существующий.';
      this.list.append(empty);
    }
    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'manager-instance';
      const name = document.createElement('div');
      name.className = 'manager-instance-name';
      name.textContent = item.type + ' · ' + item.id;
      const actions = document.createElement('div');
      actions.className = 'manager-instance-actions';
      actions.append(
        this.button('Копия', 'Создать новый экземпляр с другим ID', () => this.dispatch('clone', { id: item.id })),
        this.button('На другой стол', 'Показать этот же экземпляр на другом столе', () => this.dispatch('share', { id: item.id })),
        this.button('Убрать', 'Убрать только с текущего стола', () => this.dispatch('remove', { id: item.id }))
      );
      card.append(name, actions);
      this.list.append(card);
    }
  }

  destroy() {
    this.widget.querySelector('[data-action="create-instance"]')?.removeEventListener('click', this.createHandler);
    this.widget.querySelector('[data-action="link-instance"]')?.removeEventListener('click', this.linkHandler);
  }
}
