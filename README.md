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
- indexed descriptions ala "Gentle Art of Levitation"
- generic constructors from "Generic Constructors and Eliminators from Descriptions"
- generic eliminators from "Generic Constructors and Eliminators from Descriptions" (just for boolean-tagged datatypes for now)
- named holes (_name)
- generic eliminators for Fin tagged datatypes

Not yet done:
- generic eliminators for Fin tagged non-indexed datatypes
- explicit erasure annotations
- CEK machine for erased terms
- hash-based content-addressed references
- IO monad for system calls

Future work:
- levitation of Desc
- inductive-recursive types
- inductive-inductive types
- predicative universe hierarchy

```
TODO:
- fix infinite loop in postponements
- fix _ being used in elaboration
- allow meta as head of glued value
- glued lets
- optimize importing
- add erasure
- implement pruning
- implement instance search
- specialize meta when checking pair
- support some impredicative instantiation
- write more prelude functions

QUESTIONS:
- how to levitate in my core theory?
- is a first-order Arg description useful? (IFArg)
```
