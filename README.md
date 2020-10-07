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
- named holes (_name)

Not yet done:
- generic eliminators from "Generic Constructors and Eliminators from Descriptions"
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
- implement induction nats and lists
- implement generic elimination
- allow meta as head of glued value
- glued lets
- optimize importing
- add erasure
- implement pruning
- implement instance search
- specialize meta when checking pair
- support some impredicative instantiation

QUESTIONS:
- how to levitate in my core theory?
- is a first-order Arg description useful? (IFArg)
```
