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

Not yet done:
- descriptions ala "Gentle Art of Levitation"
- a fixpoint type for descriptions
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
- add descriptions
- add erasure
- implement pruning
- implement instance search
- specialize meta when checking pair
- support some impredicative instantiation
```
