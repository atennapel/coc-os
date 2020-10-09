import lib/taggeddesc.p
import lib/nat.p

def VecD = \t. tagged {2} (
  IEnd Z,
  IArg \n. IFArg t (IRec n (IEnd (S n))),
())

def Vec = \n t. TaggedIData (VecD t) n 

def VNil : {t : *} -> Vec Z t = \{t}. injTagged (VecD t) 0f
def VCons : {t : *} -> {n : Nat} -> t -> Vec n t -> Vec (S n) t = \{t n}. injTagged (VecD t) 1f n

def indVec
  : {t : *}
    -> {P : (n : Nat) -> Vec n t -> *}
    -> P Z VNil
    -> ((n : Nat) -> (hd : t) -> (tl : Vec n t) -> P n tl -> P (S n) (VCons hd tl))
    -> {n : Nat}
    -> (x : Vec n t)
    -> P n x
  = \{t} {P} nil cons {n} x. elimTagged (VecD t) {P} nil cons {n} x
