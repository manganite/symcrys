// The page script of index.html: a group, a setting and a property chosen, the form shown. It runs
// unbundled in the browser; 'symcrys' is resolved by the import map of the page to the copied dist/.
import * as symcrys from 'symcrys';
import { describeForm, label } from './form.js';

/** @param {string} id */
const element = (id) => /** @type {HTMLSelectElement} */ (document.getElementById(id));
const groups = element('group');
const settings = element('setting');
const properties = element('property');
const output = /** @type {HTMLElement} */ (document.getElementById('form'));

/** @param {HTMLSelectElement} select @param {{ value: string; text: string }[]} options */
function fill(select, options) {
  select.replaceChildren(...options.map((o) => new Option(o.text, o.value)));
}

function show() {
  const key = /** @type {symcrys.PointGroupKey} */ (groups.value);
  const form = describeForm(
    symcrys,
    key,
    Number(settings.value),
    /** @type {symcrys.TensorPropertyName} */ (properties.value),
  );
  const title = document.createElement('h2');
  title.textContent = form.title;
  const free = document.createElement('p');
  free.textContent = `Free components: ${form.free}`;
  const list = document.createElement('ul');
  list.replaceChildren(
    ...form.relations.map((r) => {
      const item = document.createElement('li');
      item.textContent = r;
      return item;
    }),
  );
  output.replaceChildren(title, free, list);
}

function chooseGroup() {
  const key = /** @type {symcrys.PointGroupKey} */ (groups.value);
  fill(
    settings,
    symcrys.settings(key).map((s) => ({ value: String(s.index), text: `${s.index}: ${label(s)}` })),
  );
  show();
}

fill(
  groups,
  symcrys.POINT_GROUP_KEYS.map((key) => ({
    value: key,
    text: `${key} (${symcrys.symbol(key, { form: 'schoenflies' })})`,
  })),
);
fill(
  properties,
  Object.keys(symcrys.TENSOR_PROPERTIES).map((name) => ({ value: name, text: name })),
);
groups.value = '3m';
properties.value = 'piezoelectric';
groups.addEventListener('change', chooseGroup);
settings.addEventListener('change', show);
properties.addEventListener('change', show);
chooseGroup();
