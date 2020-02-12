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
- add induction
- improve induction
- clean up lib to use type inference (rec-mendler.p, nat.p, list.p)
- fix synthapp of meta
- try unify rigidly?
- infer more uses of roll/unroll (also in synthapp and check)
- add rigid
- improve type inference of annotated lambdas
- improve impredicative type inference
- solve issue with unnecessary eta-abstractions (example: S Z)
- maybe unfold globals in toCore or erase?
- erase without going to core?
``` 
