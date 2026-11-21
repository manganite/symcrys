// The crystal forms of 4mm as ITA prints them: per Wyckoff position the basic form, then the limiting forms.
import { CRYSTAL_FORM_TYPES, crystalForms } from 'symcrys';

for (const f of crystalForms('4mm')) {
  const form = CRYSTAL_FORM_TYPES[f.formType - 1];
  const kind = f.basic ? 'basic   ' : 'limiting';
  console.log(
    `${f.multiplicity}${f.letter} ${f.siteSymmetry.padEnd(3)} ${kind} (${f.millerIndices}) ${form.name}, ${form.eigensymmetry}`,
  );
}
