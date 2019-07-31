import { deserialize, serialize } from './serialization';
import { checkHash, hash } from './hashing';
import { typecheck } from './typecheck';
import { Term, HashString } from './terms';
import { normalize } from './normalization';
import { err } from './util';

export interface IRepo {
  getDef(hsh: Buffer): Promise<Buffer>;
}

export type Name = string;
export interface INameRepo {
  getByName(name: Name): Promise<Buffer>;
}

export class TestRepo implements IRepo, INameRepo {
  constructor(
    public repo: { [key: string]: Buffer },
    public names: { [key: string]: Buffer }
  ) {}

  async addDef(term: Term): Promise<Buffer> {
    typecheck(term);
    const nf = normalize({}, term);
    const hs = hash(nf);
    const hsh = hs.toString('hex')
    if (this.repo[hsh]) return err(`def ${hsh} is already in repo`);
    this.repo[hsh] = serialize(nf);
    return hs;
  };

  async setName(name: Name, hsh: Buffer): Promise<void> {
    this.names[name] = hsh;
  }
  
  async getDef(hsh: Buffer): Promise<Buffer> {
    const hs = hsh.toString('hex');
    const bf = this.repo[hs];
    if (!bf) return err(`def ${hs} not in repo`);
    return bf;
  };

  async getByName(name: Name): Promise<Buffer> {
    const hsh = this.names[name];
    if (!hsh) return err(`name ${name} not in repo`);
    return hsh;
  }
};

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
export const getDefWithString = (repo: IRepo, hsh: HashString): Promise<[Term, Term]> =>
  getDef(repo, Buffer.from(hsh, 'hex'));

export const getByName = async (repo: IRepo, nrepo: INameRepo, name: Name): Promise<[Term, Term]> => {
  const hsh = await nrepo.getByName(name);
  return getDef(repo, hsh);
};
