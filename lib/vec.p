import lib/idesc.p
import lib/generic.p
import lib/bool.p
import lib/nat.p

def VecD : * -> IDesc Nat = \t. ISumD (IEnd Z) (IArg \n. IFArg t (IRec n (IEnd (S n))))
def Vec : Nat -> * -> * = \n t. IData (VecD t) n
def VNil : {t : *} -> Vec Z t = \{t}. inj (VecD t) True
def VCons : {t : *} -> {n : Nat} -> t -> Vec n t -> Vec (S n) t = \{t n}. inj (VecD t) False n

def indVec
  : {t : *}
    -> {P : (n : Nat) -> Vec n t -> *}
    -> P Z VNil
    -> ((n : Nat) -> (hd : t) -> (tl : Vec n t) -> P n tl -> P (S n) (VCons hd tl))
    -> {n : Nat}
    -> (x : Vec n t)
    -> P n x
  = \{t} {P} nil cons {n} x. elimIBool {Nat} (\b. if b (IEnd Z) (IArg \n. IFArg t (IRec n (IEnd (S n))))) {P} nil cons {n} x
