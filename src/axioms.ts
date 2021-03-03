import { Erased, idTerm } from './erased';
import { Name } from './names';
import { Lazy } from './utils/Lazy';
import { mapObj } from './utils/utils';
import { Val, vapp, VPi, VType } from './values';

export type AxiomName = 'cast';
export const AxiomNames: string[] = ['cast'];

export const isAxiomName = (name: Name): name is AxiomName => AxiomNames.includes(name);

const Eq = (a: Val, b: Val): Val => VPi(true, 'f', VPi(false, '_', VType, _ => VType), f => VPi(false, '_', vapp(f, false, a), _ => vapp(f, false, b)));

const axiomTypes: { [K in AxiomName]: Lazy<Val> } = mapObj({
  // {a b : *} -> {_ : Eq a b} -> a -> b (Eq a b = {f : * -> *} -> f a -> f b)
  cast: () =>
    VPi(true, 'a', VType, a =>
    VPi(true, 'b', VType, b =>
    VPi(true, '_', Eq(a, b), _ =>
    VPi(false, '_', a, _ => b)))),
}, Lazy.from);

export const synthAxiom = (name: AxiomName): Val => axiomTypes[name].get();

const axiomErasures: { [K in AxiomName]: Lazy<Erased> } = mapObj({
  // \x. x
  cast: () => idTerm,
}, Lazy.from);

export const eraseAxiom = (name: AxiomName): Erased => axiomErasures[name].get();
