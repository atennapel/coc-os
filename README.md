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
- add native unit type (for better printing, () : {})
- make erased language bigger (ifs, fix, etc.) in order to reduce ugly lambda encodings
- implement instance search
- implement pruning
- specialize meta when checking pair
- allow second component of pair to be erased
- fix infinite loop in postponements
- fix _ being used in elaboration
- allow erased FArg, Rec and HRec
- allow meta as head of glued value
- glued lets
- support some impredicative instantiation
- add a way to not mention type in argument of pi/sigma etc.

QUESTIONS:
- how to levitate in my core theory?
- is a first-order Arg description useful? (IFArg)
- can we erase Unit index in Desc?

LIBRARIES:
- find alternate definitions of symm, trans, eqRefl and uip, to allow for erasure of the proofs
- write more prelude functions
- write Desc using Desc
```
