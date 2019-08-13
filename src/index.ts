// @ts-ignore
import { showTerm, Con, appT, absT, abs, app, Var, Hash, Decon, ReturnIO, BindIO, BeepIO } from './terms';
import { KType } from './kinds';
import { TVar, showType } from './types';
import { TestRepo, FullRepo } from './repo';

const v = Var;
const tv = TVar;

const testrepo = new TestRepo();
testrepo.addNamedTerm('id', absT([KType], abs([tv(0)], v(0))));
const repo = FullRepo.from(testrepo);
repo.getByName('id').then(([t, ty]) => {
  console.log(showTerm(t));
  console.log(showType(ty));
});
