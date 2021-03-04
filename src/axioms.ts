import { Abs, App, Erased, idTerm, Var } from './erased';
import { Name } from './names';
import { Lazy } from './utils/Lazy';
import { mapObj } from './utils/utils';
import { Val, vapp, VAxiom, VPi, VType } from './values';

export type AxiomName = 'cast' | 'elim' | 'Rigid' | 'rigid' | 'unrigid';
export const AxiomNames: string[] = ['cast', 'elim', 'Rigid', 'rigid', 'unrigid'];

export const isAxiomName = (name: Name): name is AxiomName => AxiomNames.includes(name);

// {f : * -> *} -> f a -> f b
const Eq = (a: Val, b: Val): Val => VPi(true, 'f', VPi(false, '_', VType, _ => VType), f => VPi(false, '_', vapp(f, false, a), _ => vapp(f, false, b)));
// {a b : *} -> (a -> b) -> f a -> f b
const Functor = (f: Val): Val =>
  VPi(true, 'a', VType, a =>
  VPi(true, 'b', VType, b =>
  VPi(false, '_', VPi(false, '_', a, _ => b), _ =>
  VPi(false, '_', vapp(f, false, a), _ => vapp(f, false, b)))));
// {t : *} -> ({r : *} -> (r -> t) -> f r -> t) -> t
const Data = (f: Val): Val =>
  VPi(true, 't', VType, t =>
  VPi(false, '_', VPi(true, 'r', VType, r => VPi(false, '_', VPi(false, '_', r, _ => t), _ => VPi(false, '_', vapp(f, false, r), _ => t))), _ => t));
const RigidC = VAxiom('Rigid');
const Rigid = (t: Val): Val => vapp(RigidC, false, t);

const axiomTypes: { [K in AxiomName]: Lazy<Val> } = mapObj({
  // {a b : *} -> {_ : Eq a b} -> {f : * -> *} -> f a -> f b
  cast: () =>
    VPi(true, 'a', VType, a =>
    VPi(true, 'b', VType, b =>
    VPi(true, '_', Eq(a, b), _ =>
    VPi(true, 'f', VPi(false, '_', VType, _ => VType), f =>
    VPi(false, '_', vapp(f, false, a), _ => vapp(f, false, b)))))),

  // {f : * -> *} -> {t : *} -> {_ : Functor f} -> Data f -> ({r : *} -> (r -> Data f) -> (r -> t) -> f r -> t) -> t
  elim: () =>
    VPi(true, 'f', VPi(false, '_', VType, _ => VType), f =>
    VPi(true, 't', VType, t =>
    VPi(true, '_', Functor(f), _ =>
    VPi(false, '_', Data(f), _ =>
    VPi(false, '_', VPi(true, 'r', VType, r => VPi(false, '_', VPi(false, '_', r, _ => Data(f)), _ => VPi(false, '_', VPi(false, '_', r, _ => t), _ => VPi(false, '_', vapp(f, false, r), _ => t)))), _ => t))))),

  // * -> *
  Rigid: () => VPi(false, '_', VType, _ => VType),
  // {t : *} -> t -> Rigid t
  rigid: () => VPi(true, 't', VType, t => VPi(false, '_', t, _=> Rigid(t))),
  // {t : *} -> Rigid t -> t
  unrigid: () => VPi(true, 't', VType, t => VPi(false, '_', Rigid(t), _=> t)),
}, Lazy.from);

export const synthAxiom = (name: AxiomName): Val => axiomTypes[name].get();

const axiomErasures: { [K in AxiomName]: Lazy<Erased> } = mapObj({
  cast: () => idTerm,

  // \x alg. x (alg (\y. y))
  elim: () => Abs(Abs(App(Var(1), App(Var(0), idTerm)))),

  Rigid: () => idTerm,
  rigid: () => idTerm,
  unrigid: () => idTerm,
}, Lazy.from);

export const eraseAxiom = (name: AxiomName): Erased => axiomErasures[name].get();
