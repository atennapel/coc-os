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
- pretty print local env with named holes
- zonk debug messages?
- fix issue with meta resetting
- induction for types with fix
- induction/inductionfix in core
- check in core
- fix synthapp of meta
- infer more uses of roll/unroll (also in synthapp and check)
- improve type inference of annotated lambdas
- improve impredicative type inference
- solve issue with unnecessary eta-abstractions (example: S Z)
- add rigid
- maybe unfold globals in toCore or erase?
- erase without going to core?
``` 
