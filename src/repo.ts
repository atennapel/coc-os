import { Term, hashesTerm, hashesTypeInTerm } from './terms';
import { TDef, Type, hashesType } from './types';
import { deserializeTerm, deserializeTDef } from './serialization';
import { typecheck, wfTDef, HashEnv, THashEnv } from './typecheck';
import { Kind } from './kinds';
import { Name } from './util';

export interface Repo {
  get(hsh: Buffer): Promise<Buffer>;
  getTDef(hsh: Buffer): Promise<Buffer>;
}

export interface NameRepo {
  getByName(name: Name): Promise<Buffer>;
  getTDefByName(name: Name): Promise<Buffer>;
}

export interface HashCache {
  load(hsh: Buffer): Promise<[Term, Type]>;
  store(hsh: Buffer, term: Term, type: Type): Promise<void>;
  loadTDef(hsh: Buffer): Promise<[TDef, Kind]>;
  storeTDef(hsh: Buffer, tdef: TDef, kind: Kind): Promise<void>;
}

export class FullRepo {

  constructor(
    public readonly remoteRepo: Repo,
    public readonly localRepo: Repo,
    public readonly nameRepo: NameRepo,
    public readonly cache: HashCache,
  ) {}

  public static from(repo: Repo & NameRepo & HashCache) {
    return new FullRepo(repo, repo, repo, repo);
  }
  
  public async get(hsh: Buffer): Promise<[Term, Type]> {
    let termBytes: Buffer;
    try {
      return await this.cache.load(hsh);
    } catch (err) {
      try {
        termBytes = await this.localRepo.get(hsh);
      } catch (err) {
        termBytes = await this.remoteRepo.get(hsh);
      }
      const term = deserializeTerm(termBytes);
      const henv: HashEnv = {};
      const thenv: THashEnv = {};
      const htys = await Promise.all(Object.keys(hashesTerm(term))
        .map(h => this.get(Buffer.from(h, 'hex'))
        .then(([t, ty]) => [h, t, ty] as [string, Term, Type])));
      for (let i = 0, l = htys.length; i < l; i++) {
        const [h, t, ty] = htys[i];
        henv[h] = { term: t, type: ty };
      }
      const ths = await Promise.all(Object.keys(hashesTypeInTerm(term))
        .map(h => this.getTDef(Buffer.from(h, 'hex'))
        .then(([t, k]) => [h, t, k] as [string, TDef, Kind])));
      for (let i = 0, l = ths.length; i < l; i++) {
        const [h, t, k] = ths[i];
        thenv[h] = { def: t, kind: k };
      }
      const type = typecheck(term, henv, thenv);
      this.cache.store(hsh, term, type);
      return [term, type];
    }
  }

  public async getTDef(hsh: Buffer): Promise<[TDef, Kind]> {
    let typeBytes: Buffer;
    try {
      return await this.cache.loadTDef(hsh);
    } catch (err) {   
      try {
        typeBytes = await this.localRepo.getTDef(hsh);
      } catch (err) {
        typeBytes = await this.remoteRepo.getTDef(hsh);
      }
      const tdef = deserializeTDef(typeBytes);
      const thenv: THashEnv = {};
      const ths = await Promise.all(Object.keys(hashesType(tdef.type))
        .map(h => this.getTDef(Buffer.from(h, 'hex'))
        .then(([t, k]) => [h, t, k] as [string, TDef, Kind])));
      for (let i = 0, l = ths.length; i < l; i++) {
        const [h, t, k] = ths[i];
        thenv[h] = { def: t, kind: k };
      }
      const kind = wfTDef(tdef, thenv);
      this.cache.storeTDef(hsh, tdef, kind);
      return [tdef, kind];
    }
  }

  public async getByName(name: Name): Promise<[Term, Type]> {
    const hsh = await this.nameRepo.getByName(name);
    return this.get(hsh);
  }

  public async getTDefByName(name: Name): Promise<[TDef, Kind]> {
    const hsh = await this.nameRepo.getTDefByName(name);
    return this.getTDef(hsh);
  }

}

export class TestRepo implements Repo, NameRepo, HashCache {

  constructor(
    public readonly cache: { [key: string]: Buffer } = {},
    public readonly tcache: { [key: string]: Buffer } = {},
    public readonly namecache: { [key: string]: Buffer } = {},
    public readonly tnamecache: { [key: string]: Buffer } = {},
    public readonly hcache: { [key: string]: [Term, Type] } = {},
    public readonly thcache: { [key: string]: [TDef, Kind] } = {},
  ) {}

  get(hsh: Buffer): Promise<Buffer> {
    const h = hsh.toString('hex');
    const b = this.cache[h];
    if (!b) return Promise.reject(new Error(`hash ${h} not in repo`));
    return Promise.resolve(b);
  }

  getTDef(hsh: Buffer): Promise<Buffer> {
    const h = hsh.toString('hex');
    const b = this.tcache[h];
    if (!b) return Promise.reject(new Error(`tdef hash ${h} not in repo`));
    return Promise.resolve(b);
  }

  getByName(name: Name): Promise<Buffer> {
    const b = this.namecache[name];
    if (!b) return Promise.reject(new Error(`name ${name} not in repo`));
    return Promise.resolve(b);

  }

  getTDefByName(name: Name): Promise<Buffer> {
    const b = this.tnamecache[name];
    if (!b) return Promise.reject(new Error(`type name ${name} not in repo`));
    return Promise.resolve(b);
  }

  load(hsh: Buffer): Promise<[Term, Type]> {
    const h = hsh.toString('hex');
    const b = this.hcache[h];
    if (!b) return Promise.reject(new Error(`hash ${h} not in cache`));
    return Promise.resolve(b);  
  }

  store(hsh: Buffer, term: Term, type: Type): Promise<void> {
    const h = hsh.toString('hex');
    this.hcache[h] = [term, type];
    return Promise.resolve();
  }

  loadTDef(hsh: Buffer): Promise<[TDef, Kind]> {
    const h = hsh.toString('hex');
    const b = this.thcache[h];
    if (!b) return Promise.reject(new Error(`type hash ${h} not in cache`));
    return Promise.resolve(b);
  }

  storeTDef(hsh: Buffer, tdef: TDef, kind: Kind): Promise<void> {
    const h = hsh.toString('hex');
    this.thcache[h] = [tdef, kind];
    return Promise.resolve();
  }

}
