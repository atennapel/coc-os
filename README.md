Try it out at https://atennapel.github.io/coc-os

An implementation of a Curry-style Calculus of Constructions with Type-in-Type and Self-types.
See `lib` directory for examples.

Run CLI REPL:
```
yarn install
yarn start
```

Typecheck file:
```
yarn install
yarn start lib/nat.p
```

```
TODO:
- fix core
- synthapp should insert unroll (for core)
- recheck in core
- fix core typechecking (abs without type)
```
