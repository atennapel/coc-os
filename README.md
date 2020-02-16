Try it out at https://atennapel.github.io/coc-os

Currently I am working on rewriting everything.

Run CLI REPL:
```
yarn install
yarn start
```

Typecheck file:
```
yarn install
yarn start lib/nat.coc
```

```
TODO:
- add import defs for files
- fix issue with meta resetting
- induction for types with fix
- induction for recursive church types
- induction in core
- fix synthapp of meta
- named holes
- infer more uses of roll/unroll (also in synthapp and check)
- add rigid
- improve type inference of annotated lambdas
- improve impredicative type inference
- solve issue with unnecessary eta-abstractions (example: S Z)
- maybe unfold globals in toCore or erase?
- erase without going to core?
``` 
