
# coc-os

An "operating system" based on the [calculus of constructions](https://en.wikipedia.org/wiki/Calculus_of_constructions).

## Example

Try it out at https://atennapel.github.io/coc-os.

## Installation

```bash
git clone git@github.com:atennapel/coc-os.git
cd coc-os
yarn install
```

## Usage

### Run CLI REPL

```bash
yarn start
```

### Typecheck file

```bash
yarn start filename
```

## Overview

This uses a custom language in some ways similar to Haskell with extension `.p`. Check out the files located in `./lib`, such as `lib/bool.p`:

```
def Bool : * = %B
def True : Bool = %1
def False : Bool = %0

def indBool
  : {-P : Bool -> *}
    -> P True
    -> P False
    -> (b : Bool) -> P b
  = \{P} t f b. %elimB P f t b

def if
  : {-t : *} -> Bool -> t -> t -> t
  = \{t} c a b. indBool {\_. t} a b c

def not : Bool -> Bool = \b. if b False True
def and : Bool -> Bool -> Bool = \a b. if a b False
def or : Bool -> Bool -> Bool = \a b. if a True b

def eqBool : Bool -> Bool -> Bool = \a b. if a b (not b)
def neqBool : Bool -> Bool -> Bool = \a b. not (eqBool a b)
def xor = neqBool
```

The `src` directory is the compiler.

The code begins basically with the `repl`. From the repl, look at `parser.parse`, which builds an expression, calling `exprs`. After that it calls `elaboration.elaborate`. The result of that is passed to `serialization.serializeCore`. From there it calls `typecheck.typecheck`.

## TODO

- [x] dependent functions (pi types)
- [x] dependent pairs (sigma types)
- [x] an heterogenous equality type with definitional uniqueness of identity proofs (UIP)
- [x] booleans with an induction primitive
- [x] type-in-type
- [x] indexed descriptions ala "Gentle Art of Levitation"
- [x] generic constructors from "Generic Constructors and Eliminators from Descriptions"
- [x] generic eliminators from "Generic Constructors and Eliminators from Descriptions" (just for boolean-tagged datatypes for now)
- [x] named holes (_name)
- [x] generic eliminators for Fin tagged datatypes
- [x] explicit erasure annotations
- [ ] CEK machine for erased terms
- [ ] hash-based content-addressed references
- [ ] IO monad for system calls
- [ ] levitation of Desc
- [ ] inductive-recursive types
- [ ] inductive-inductive types
- [ ] predicative universe hierarchy
- [ ] add native unit type (for better printing, () : {})
- [ ] make erased language bigger (ifs, fix, etc.) in order to reduce ugly lambda encodings
- [ ] implement instance search
- [ ] implement pruning
- [ ] specialize meta when checking pair
- [ ] allow second component of pair to be erased
- [ ] fix infinite loop in postponements
- [ ] fix _ being used in elaboration
- [ ] allow erased FArg, Rec and HRec
- [ ] allow meta as head of glued value
- [ ] glued lets
- [ ] support some impredicative instantiation
- [ ] add a way to not mention type in argument of pi/sigma etc.

### Questions

- how to levitate in my core theory?
- is a first-order Arg description useful? (IFArg)
- can we erase Unit index in Desc?

### Libraries

- find alternate definitions of symm, trans, eqRefl and uip, to allow for erasure of the proofs
- write more prelude functions
- write Desc using Desc
