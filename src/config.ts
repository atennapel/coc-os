import { readFile } from 'fs';

export interface Config {
  boot: string;
}

export const loadConfig = (file: string): Promise<Config> => new Promise((resolve, reject) => {
  readFile(file, { encoding: 'utf8' }, (err, data) => {
    if (err) return reject(err);
    try {
      const j = JSON.parse(data);
      if (typeof j !== 'object' || typeof j.boot !== 'string')
        throw new Error('invalid config file');
      resolve(j);
    } catch (err) {
      reject(err);
    }
  })
});
