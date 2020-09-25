Try it out at https://atennapel.github.io/coc-os

Run CLI REPL:
```
yarn install
yarn start
```

Typecheck file:
```
yarn install
yarn start filename
```

```
TODO:
- implement sigma types
- add erasure
- implement pruning
- implement instance search

PROBLEMS:
let Nat = {t : *} -> t -> (t -> t) -> t in let Z : Nat = \z s. z in let S : Nat -> Nat = \n z s. s (n z s) in Z
```
