import { Name } from './names';
import { Lazy } from './utils/Lazy';
import { mapObj, terr } from './utils/utils';
import { Val, VPi, VType } from './values';

export type PrimName = 'Fix' | 'Con';
export const PrimNames: string[] = ['Fix', 'Con'];

export type PrimElimName = 'elim';
export const PrimElimNames: string[] = ['elim'];

export const isPrimName = (name: Name): name is PrimName => PrimNames.includes(name);
export const isPrimElimName = (name: Name): name is PrimElimName => PrimElimNames.includes(name);

const typeType = VPi(false, '_', VType, _ => VType);

const primTypes: { [K in PrimName]: Lazy<Val> } = mapObj({
  // Fix : (Type -> Type) -> Type
  Fix: () => VPi(false, '_', typeType, _ => VType),
  // Con : {f : Type -> Type} -> f (Fix f) -> Fix f
  Con: () =>
    ,
}, Lazy.from);

export const primElim = (name: PrimElimName, usage: Usage, motive: Val, scrut: Val, cases: Val[]): Val | null => {
  if (name === 'elimUnit') {
    if (isVUnit(scrut)) return cases[0];  
  }
  if (name === 'elimBool') {
    if (isVTrue(scrut)) return cases[0];
    if (isVFalse(scrut)) return cases[1];
  }
  if (name === 'elimSigma') {
    if (scrut.tag === 'VPair') return vapp(vapp(cases[0], Expl, scrut.fst), Expl, scrut.snd);
  }
  if (name === 'elimPropEq') {
    if (scrut.tag === 'VRefl') return vapp(cases[0], Expl, scrut.val);
  }
  if (name === 'elimIFix') {
    // elimIFix q P (ICon I F i x) c ~> c (\(0 i : I) (v : IFix I F i). elimIFix q P v) i x
    if (isVICon(scrut) && scrut.spine.length() === 4) {
      const [I, F, i, x] = scrut.spine.toMappedArray(e => (e as EApp).arg).reverse();
      const rec = VAbs(zero, Expl, 'i', I, _ => VAbs(many, Expl, 'v', vapp(vapp(vapp(VIFix, Expl, I), Expl, F), Expl, i), v => vprimelim(name, usage, motive, v, cases)));
      return vapp(vapp(vapp(cases[0], Expl, rec), Expl, i), Expl, x);
    }
  }
  return null;
};

export type PrimElimTypeInfo = [number, (ty_: Val, usage: Usage) => [Val, (vmotive: Val, vscrut: Val) => [Val[], Val]]];

const primElimTypes: { [K in PrimElimName]: PrimElimTypeInfo } = {
  elimVoid: [0, ty_ => {
    const ty = force(ty_);
    if (ty.tag !== 'VNe' || ty.head.tag !== 'HPrim' || ty.head.name !== 'Void')
      return terr(`expected a Void in elimVoid`);
    return [
      VPi(many, Expl, '_', VVoid, _ => VType),
      (vmotive, vscrut) => [[], vapp(vmotive, Expl, vscrut)],
    ];
  }],
  elimUnit: [1, ty_ => {
    const ty = force(ty_);
    if (ty.tag !== 'VNe' || ty.head.tag !== 'HPrim' || ty.head.name !== '()')
      return terr(`expected a () in elimUnit`);
    return [
      VPi(many, Expl, '_', VUnitType, _ => VType),
      (vmotive, vscrut) => [[vapp(vmotive, Expl, VUnit)], vapp(vmotive, Expl, vscrut)],
    ];
  }],
  elimBool: [2, ty_ => {
    const ty = force(ty_);
    if (ty.tag !== 'VNe' || ty.head.tag !== 'HPrim' || ty.head.name !== 'Bool')
      return terr(`expected a Bool in elimBool`);
    return [
      VPi(many, Expl, '_', VBool, _ => VType),
      (vmotive, vscrut) => [[vapp(vmotive, Expl, VTrue), vapp(vmotive, Expl, VFalse)], vapp(vmotive, Expl, vscrut)],
    ];
  }],
  elimSigma: [1, (sigma_, usage) => {
    const sigma = force(sigma_);
    if (sigma.tag !== 'VSigma') return terr(`not a sigma type in elimSigma`);
    if (sigma.exclusive) return terr(`cannot call elimSigma on exclusive sigma`);
    return [
      VPi(many, Expl, '_', sigma_, _ => VType),
      (vmotive, vscrut) => [
        [VPi(multiply(usage, sigma.usage), Expl, 'x', sigma.type, x => VPi(usage, Expl, 'y', vinst(sigma, x), y => vapp(vmotive, Expl, VPair(x, y, sigma_))))],
        vapp(vmotive, Expl, vscrut),
      ],
    ];
  }],
  elimPropEq: [1, eq_ => {
    const eq = force(eq_);
    if (eq.tag !== 'VPropEq') return terr(`not a equality type in elimPropEq`);
    const A = eq.type;
    return [
      VPi(many, Expl, 'x', A, x => VPi(many, Expl, 'y', A, y => VPi(many, Expl, '_', VPropEq(A, x, y), _ => VType))),
      (vmotive, vscrut) => [
        [VPi(zero, Expl, 'x', A, x => vapp(vapp(vapp(vmotive, Expl, x), Expl, x), Expl, VRefl(A, x)))],
        vapp(vapp(vapp(vmotive, Expl, eq.left), Expl, eq.right), Expl, vscrut),
      ],
    ];
  }],
  elimIFix: [1, (fix_, usage) => {
    const fix = force(fix_);
    if (!(fix.tag === 'VNe' && fix.head.tag === 'HPrim' && fix.head.name === 'IFix' && fix.spine.length() === 3))
      return terr(`not a IFix type in elimIFix`);
    const [I, F, i] = fix.spine.toMappedArray(e => (e as EApp).arg).reverse();
    return [
      // (i : I) -> IFix I F i -> Type
      VPi(many, Expl, 'i', I, i => VPi(many, Expl, '_', vapp(vapp(vapp(VIFix, Expl, I), Expl, F), Expl, i), _ => VType)),
      (vmotive, vscrut) => [
        // ((0 i : I) -> (x : IFix I F i) -> P i x) -> (0 i : I) -> (q x : F (IFix I F) i) -> P i (ICon I F i x)
        [
          VPi(many, Expl, '_', VPi(zero, Expl, 'i', I, i => VPi(many, Expl, 'x', vapp(vapp(vapp(VIFix, Expl, I), Expl, F), Expl, i), x => vapp(vapp(vmotive, Expl, i), Expl, x))), _ =>
          VPi(zero, Expl, 'i', I, i =>
          VPi(usage, Expl, 'x', vapp(vapp(F, Expl, vapp(vapp(VIFix, Expl, I), Expl, F)), Expl, i), x =>
          vapp(vapp(vmotive, Expl, i), Expl, vapp(vapp(vapp(vapp(VICon, Expl, I), Expl, F), Expl, i), Expl, x))))),
        ],
        vapp(vapp(vmotive, Expl, i), Expl, vscrut),
      ],
    ];
  }],
};

export const synthPrim = (name: PrimName): Val => primTypes[name].get();
export const synthPrimElim = (name: PrimElimName): PrimElimTypeInfo => primElimTypes[name];
