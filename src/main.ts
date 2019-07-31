import { loadConfig } from './config';
import { TestRepo, getDefWithString } from './repo';
import { showTerm, abs, Var, Star } from './terms';

const repo = new TestRepo({}, {});
repo.addDef(abs([Star, Var(0)], Var(0)));

const main = async () => {
  try {
    const config = await loadConfig('config.json');
    const [term, type] = await getDefWithString(repo, config.boot);
    console.log(showTerm(term), showTerm(type));
  } catch (err) {
    console.log(`${err}`);
  }
};

main();
