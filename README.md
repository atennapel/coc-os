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

The core language will be:
- type-in-type, with the wish to implement a predicative hierarchy in the future
- dependent functions (pi types)
- dependent pairs (sigma types)
- an heterogenous equality type with definitional uniqueness of identity proofs (UIP)
- booleans with an induction primitive
- descriptions ala "Gentle Art of Levitation", with the wish to allow inductive-recursive and inductive-inductive types as well
- a fixpoint type for descriptions

```
TODO:
- add primitives
- add globals
- add descriptions
- add erasure
- implement pruning
- implement instance search
- specialize meta when checking pair
- support some impredicative instantiation
```
