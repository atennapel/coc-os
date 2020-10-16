import lib/taggeddesc.p
import lib/nat.p

def VecD : (-t : *) -> TaggedIDesc Nat = \t. taggedI {2} (
  IEnd Z,
  IArgE \n. IFArg t (IRec n (IEnd (S n))),
())

def Vec = \n t. TaggedIData (VecD t) n 

def VNil : {-t : *} -> Vec Z t = \{t}. injTaggedI (VecD t) 0f
def VCons : {-t : *} -> {-n : Nat} -> t -> Vec n t -> Vec (S n) t = \{t n}. injTaggedI (VecD t) 1f n

def indVec
  : {-t : *}
    -> {-P : (n : Nat) -> Vec n t -> *}
    -> P Z VNil
    -> ({-m : Nat} -> (hd : t) -> (tl : Vec m t) -> P m tl -> P (S m) (VCons hd tl))
    -> {-n : Nat}
    -> (x : Vec n t)
    -> P n x
  = \{t} {P} nil cons {n} x. elimTaggedI (VecD t) {P} nil (\m hd tl r. cons {m} hd tl r) {n} x
