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
- explicit erasure annotations

Not yet done:
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
- allow erased arguments in datatype arguments
- check that evaluation does not use erased values
- shift more intelligently in constructMetaType
- make erased language bigger (ifs, fix, etc.) in order to reduce ugly lambda encodings
- allow second component of pair to be erased
- fix infinite loop in postponements
- fix _ being used in elaboration
- allow meta as head of glued value
- glued lets
- optimize importing
- implement pruning
- implement instance search
- specialize meta when checking pair
- support some impredicative instantiation
- run command in file
- remove dependency of elaboration on typechecking
- add a way to not mention type in argument of pi/sigma etc.

QUESTIONS:
- how to levitate in my core theory?
- is a first-order Arg description useful? (IFArg)
- can we erase Unit index in Desc?

LIBRARIES:
- generic eliminators for Fin tagged non-indexed datatypes
- find alternate definitions of symm, trans, eqRefl and uip, to allow for erasure of the proofs
- Fin indeces should be erased
- Vec indeces should be erased
- write more prelude functions
```
