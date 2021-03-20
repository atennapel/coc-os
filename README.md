Try it out at https://atennapel.github.io/coc-os

Elaboration for a dependently typed language with simple universes.

Install:
```
yarn install
```

Run CLI REPL:
```
yarn start
```

Typecheck file:
```
yarn start filename
```

```
TODO:
- equality type
- fixpoints
- universe elaboration
ISSUES:
- elaboration of `\(a b : *). (c : Bool) ** if c a b` succeeds, but it should fail
- (\{A : *} (x : A). x) *
- how to handle Lift Bool != #2^
```
