import lib/idesc.p
import lib/generic.p
import lib/bool.p
import lib/nat.p

def VecD : * -> IDesc Nat = \t. ISumD (IEnd Z) (IArg \n. IFArg t (IRec n (IEnd (S n))))
def Vec : Nat -> * -> * = \n t. IData (VecD t) n
def VNil : {t : *} -> Vec Z t = \{t}. inj (VecD t) True
def VCons : {t : *} -> {n : Nat} -> t -> Vec n t -> Vec (S n) t = \{t n}. inj (VecD t) False n
