export interface Config {
  debug: boolean;
}
export const config: Config = {
  debug: false,
};
export const setConfig = (c: Partial<Config>) => {
  for (let k in c) (config as any)[k] = (c as any)[k];
};

export const log = (msg: () => any) => {
  if (config.debug) console.log(msg());
};
