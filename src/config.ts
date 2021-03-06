export interface Config {
  debug: boolean;
  showEnvs: boolean;
  unfold: string[];
  postponeInvalidSolution: boolean;
  useBase: boolean;
  writeToBase: boolean;
}
export const config: Config = {
  debug: false,
  showEnvs: false,
  unfold: [],
  postponeInvalidSolution: false,
  useBase: false,
  writeToBase: false,
};
export const setConfig = (c: Partial<Config>) => {
  for (let k in c) (config as any)[k] = (c as any)[k];
};

export const log = (msg: () => any) => {
  if (config.debug) console.log(msg());
};
