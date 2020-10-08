import lib/idesc.p
import lib/bool.p
import lib/nat.p
import lib/generic.p

def FinD : IDesc Nat = ISumD (IArg \n. IEnd (S n)) (IArg \n. IRec n (IEnd (S n)))
def Fin : Nat -> * = IData FinD
def FZ : {n : Nat} -> Fin (S n) = \{n}. inj FinD True n
def FS : {n : Nat} -> Fin n -> Fin (S n) = \{n}. inj FinD False n

def indFin
  : {P : (n : Nat) -> Fin n -> *}
    -> ((n : Nat) -> P (S n) (FZ {n}))
    -> ((n : Nat) -> (f : Fin n) -> P n f -> P (S n) (FS {n} f))
    -> {n : Nat}
    -> (x : Fin n)
    -> P n x
  = \{P} z s {n} x. elimIBool {Nat} (\b. if b (IArg \n. IEnd (S n)) (IArg \n. IRec n (IEnd (S n)))) {P} z s {n} x
