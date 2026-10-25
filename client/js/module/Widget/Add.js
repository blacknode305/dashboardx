// Native <details> gives the widget manager a reliable dropdown without
// relying on browser-specific <select> popup behaviour or overlay positioning.
import { t, widgetTitle } from '../i18n.js';

export default class AddWidget {
  constructor(widget) {
    this.widget = widget;
    this.store = window.dashboardxStore;
    if (!this.store) throw new Error('Local widget storage is not initialized');

    this.typePicker = widget.querySelector('[data-role="type-picker"]');
    this.existingPicker = widget.querySelector('[data-role="existing-picker"]');
    this.typeOptions = widget.querySelector('[data-role="type-options"]');
    this.existingOptions = widget.querySelector('[data-role="existing-options"]');
    this.typeLabel = widget.querySelector('[data-role="type-label"]');
    this.existingLabel = widget.querySelector('[data-role="existing-label"]');
    this.createButton = widget.querySelector('[data-action="create-instance"]');
    this.linkButton = widget.querySelector('[data-action="link-instance"]');
    this.list = widget.querySelector('[data-role="instances-list"]');
    this.counter = widget.querySelector('[data-role="instance-count"]');

    this.selectedType = null;
    this.selectedInstance = null;
    this.onCreate = () => {
      if (this.selectedType) this.dispatch('create', { type: this.selectedType });
    };
    this.onLink = () => {
      if (this.selectedInstance) this.dispatch('link', { id: this.selectedInstance });
    };
    this.createButton.addEventListener('click', this.onCreate);
    this.linkButton.addEventListener('click', this.onLink);
    this.render();
  }

  dispatch(action, details) {
    window.dispatchEvent(new CustomEvent('dashboardx:widget-action', {
      detail: { action, ...details }
    }));
  }

  makeOption(label, secondary, action, disabled = false) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'dx-picker-option';
    option.disabled = disabled;

    const main = document.createElement('span');
    main.className = 'dx-option-main';
    main.textContent = label;
    option.append(main);

    if (secondary) {
      const hint = document.createElement('span');
      hint.className = 'dx-option-note';
      hint.textContent = secondary;
      option.append(hint);
    }
    option.addEventListener('click', action);
    return option;
  }

  makeAction(label, title, action, dangerous = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'manager-mini-action' + (dangerous ? ' is-danger' : '');
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', action);
    return button;
  }

  makeEmpty(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'manager-empty';
    paragraph.textContent = message;
    return paragraph;
  }

  render() {
    const availableTypes = (window.dashboardxTemplates || []).filter(type => type.id !== 'add');
    this.typeOptions.replaceChildren();
    this.selectedType = null;
    this.typeLabel.textContent = t('manager.chooseType');
    this.createButton.disabled = true;

    // Group the complete original catalog by category; catalog entries are not
    // removed when a template cannot load or when the widget needs the server.
    // Include every category from the live catalog, including newly added
    // Developer/Spatial types, without altering the classic category order.
    const groups = [...new Set([
      'system', 'optima', 'finance', 'tools', 'developer', 'media', 'games', 'telegram',
      ...availableTypes.map(type => type.category)
    ])];
    for (const category of groups) {
      const entries = availableTypes.filter(type => type.category === category);
      if (!entries.length) continue;
      const caption = document.createElement('div');
      caption.className = 'dx-picker-category';
      caption.textContent = t('nav.' + category);
      this.typeOptions.append(caption);
      for (const type of entries) {
        const note = type.serverOnly ? t('ui.serverOnly') : type.id;
        this.typeOptions.append(this.makeOption(widgetTitle(type.id,type.title), note, () => {
          this.selectedType = type.id;
          this.typeLabel.textContent = widgetTitle(type.id,type.title);
          this.typePicker.open = false;
          this.createButton.disabled = false;
        }));
      }
    }
    if (!availableTypes.length) {
      this.typeOptions.append(this.makeEmpty(t('manager.templateUnavailable')));
    }

    const current = this.store.workspace;
    const existing = Object.values(this.store.state.instances);
    this.existingOptions.replaceChildren();
    this.selectedInstance = null;
    this.existingLabel.textContent = t('manager.chooseId');
    this.linkButton.disabled = true;

    if (existing.length === 0) {
      this.existingOptions.append(this.makeEmpty(t('manager.noneCreated')));
    }
    for (const instance of existing) {
      const shown = current.widgets.includes(instance.id);
      const places = this.store.workspaceNamesFor(instance.id).join(', ');
      const label = widgetTitle(instance.type,instance.type) + ' · ' + instance.id;
      const description = shown ? t('manager.already') : (places || t('manager.unplaced'));
      this.existingOptions.append(this.makeOption(label, description, () => {
        if (shown) return;
        this.selectedInstance = instance.id;
        this.existingLabel.textContent = instance.id;
        this.existingPicker.open = false;
        this.linkButton.disabled = false;
      }, shown));
    }

    const items = current.widgets.map(id => this.store.getInstance(id)).filter(Boolean);
    this.counter.textContent = String(items.length);
    this.list.replaceChildren();
    if (!items.length) this.list.append(this.makeEmpty(t('manager.empty')));

    for (const instance of items) {
      const card = document.createElement('article');
      card.className = 'manager-instance';

      const identity = document.createElement('div');
      identity.className = 'manager-instance-heading';
      const title = document.createElement('strong');
      title.className = 'manager-instance-title';
      const template = availableTypes.find(t => t.id === instance.type);
      title.textContent = widgetTitle(instance.type,template?.title || instance.type);
      const code = document.createElement('code');
      code.className = 'manager-instance-id';
      code.textContent = instance.id;
      identity.append(title, code);

      const controls = document.createElement('div');
      controls.className = 'manager-instance-actions';
      controls.append(
        this.makeAction(t('manager.copy'), t('manager.copyTip'), () => this.dispatch('clone', { id: instance.id })),
        this.makeAction(t('manager.share'), t('manager.shareTip'), () => this.dispatch('share', { id: instance.id })),
        this.makeAction(t('manager.remove'), t('manager.removeTip'), () => this.dispatch('remove', { id: instance.id }), true)
      );
      card.append(identity, controls);
      this.list.append(card);
    }
  }

  destroy() {
    this.createButton?.removeEventListener('click', this.onCreate);
    this.linkButton?.removeEventListener('click', this.onLink);
  }
}
