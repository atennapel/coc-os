import lib/idesc.p
import lib/bool.p
import lib/nat.p
import lib/generic.p

def FinD : IDesc Nat = ISumD (IArg \n. IEnd (S n)) (IArg \n. IRec n (IEnd (S n)))
def Fin : Nat -> * = IData FinD
def FZ : {n : Nat} -> Fin (S n) = \{n}. inj FinD True n
def FS : {n : Nat} -> Fin n -> Fin (S n) = \{n}. inj FinD False n
