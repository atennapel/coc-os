import { deserialize, serialize } from './serialization';
import { checkHash, hash } from './hashing';
import { typecheck } from './typecheck';
import { Term } from './terms';
import { normalize } from './normalization';
import { err } from './util';

export const checkDef = (def: Buffer, exhash: Buffer): [Term, Term] => {
  const term = deserialize(def);
  checkHash(term, exhash);
  const ty = typecheck(term);
  return [term, ty];
};

export const getDef = async (repo: IRepo, exhash: Buffer): Promise<[Term, Term]> => {
  const buf = await repo.getDef(exhash);
  return checkDef(buf, exhash);
};

export interface IRepo {
  addDef(term: Term): Promise<Buffer>;
  getDef(hsh: Buffer): Promise<Buffer>;
}

export class TestRepo implements IRepo {
  constructor(public repo: { [key: string]: Buffer }) {}

  async addDef(term: Term): Promise<Buffer> {
    typecheck(term);
    const nf = normalize({}, term);
    const hs = hash(nf);
    const hsh = hs.toString('hex')
    if (this.repo[hsh]) return err(`def ${hsh} is already in repo`);
    this.repo[hsh] = serialize(nf);
    return hs;
  };
  
  async getDef(hsh: Buffer): Promise<Buffer> {
    const hs = hsh.toString('hex');
    const bf = this.repo[hs];
    if (!bf) return err(`def ${hs} not in repo`);
    return bf;
  };
};
