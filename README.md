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

Currently done:
- dependent functions (pi types)
- dependent pairs (sigma types)
- an heterogenous equality type with definitional uniqueness of identity proofs (UIP)
- booleans with an induction primitive
- type-in-type
- descriptions ala "Gentle Art of Levitation"

Not yet done:
- generic induction
- indexed descriptions
- explicit erasure annotations
- CEK machine for erased terms
- hash-based content-addressed references
- IO monad for system calls

Future work:
- inductive-recursive types
- inductive-inductive types
- predicative hierarchy

```
TODO:
- write fix induction
- write generic induction
- add indexed descriptions
- optimize importing
- add erasure
- implement pruning
- implement instance search
- specialize meta when checking pair
- support some impredicative instantiation

IDEAS:
- should elimDesc nest inside of elimB?
```
