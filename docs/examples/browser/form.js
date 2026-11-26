// The form of a property tensor as text to show: the free components, how each other component
// follows from them, and that the rest are 0. Pure: it takes the module symcrys as an argument, so that the page (main.js)
// and a run in Node (browser-form.ts, when the site is built) share it. Display strings belong to
// the application, not to symcrys (GUIDE.md, "The API").

const AXES = ['x', 'y', 'z'];

/**
 * The tensor component of a flat index, as its index letters (`xyz`): the basis of a form is
 * row-major, the first index the most significant (docs/conventions.md, "Tensors").
 * @param {number} flat
 * @param {number} rank
 */
function component(flat, rank) {
  let name = '';
  for (let k = rank - 1; k >= 0; k--) name += AXES[Math.floor(flat / 3 ** k) % 3];
  return name;
}

/** @param {number} x */
const number = (x) => String(Number(Math.abs(x).toFixed(4)));

/**
 * The form of `property` under the group `key` in `setting`, as lines of text.
 * @param {typeof import('symcrys')} symcrys
 * @param {import('symcrys').PointGroupKey} key
 * @param {number} setting
 * @param {import('symcrys').TensorPropertyName} property
 */
export function describeForm(symcrys, key, setting, property) {
  const form = symcrys.tensorForm(key, property, { setting });
  // The full symbol names the orientation (1 2 1, 1 1 2), and the axes the rhombohedral setting.
  const chosen = symcrys.settings(key).find((s) => s.index === setting);
  const symbol = chosen ? label(chosen) : key;
  const free = form.parameters.map((p) => p.map((i) => AXES[i]).join(''));
  const pivots = form.parameters.map((p) => p.reduce((flat, i) => flat * 3 + i, 0));
  // Each relation row has 1 at a dependent component c and −b at the free components p: t_c = Σ b·t_p.
  const relations = form.relations.flatMap((row) => {
    const c = row.findIndex((x, i) => x !== 0 && !pivots.includes(i));
    const terms = pivots
      .map((p, k) => ({ coefficient: -row[p], name: free[k] }))
      .filter((t) => t.coefficient !== 0)
      .map(
        (t, i) =>
          `${t.coefficient < 0 ? (i === 0 ? '−' : ' − ') : i === 0 ? '' : ' + '}${t.coefficient === 1 || t.coefficient === -1 ? '' : number(t.coefficient)}${t.name}`,
      );
    return terms.length === 0 ? [] : [`${component(c, form.rank)} = ${terms.join('')}`];
  });
  // A relation with a single 1 says that component is 0.
  const zero = form.relations.length - relations.length;
  return {
    title: `${property} in ${symbol}`,
    free: free.length === 0 ? 'none: the property is not allowed' : free.join(', '),
    relations: free.length > 0 && zero > 0 ? [...relations, `every other component is 0 (${zero})`] : relations,
  };
}

/**
 * The name of a setting to show: its full symbol, and the axes or the unique axis where it has them.
 * @param {import('symcrys').Setting} s
 */
export function label(s) {
  const axes = s.axes === 'rhombohedral' ? ', rhombohedral axes' : s.uniqueAxis ? `, unique axis ${s.uniqueAxis}` : '';
  return `${s.fullSymbol}${axes}`;
}
