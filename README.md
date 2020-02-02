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
- fix parsing of unroll
- fix error message, convert to readable syntax
- bidirectional typechecking
- pretty print syntax
- holes and meta variables
- automatic insertion of meta variables
- improve type inference of annotated lambdas
- improve impredicative type inference
- solve issue with unnecessary eta-abstractions

BUGS:
- lib/parigot-nat.p Error: impossible: vapp: VRoll (sub 1 0)
- lib/list.p Cons type error
```
