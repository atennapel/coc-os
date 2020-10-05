import lib/desc.p
import lib/bool.p
import lib/sigma.p

def NatD : Desc = SumD Ret (Rec Ret)
def Nat : * = Fix NatD
def Z : Nat = Con {NatD} (True, ())
def S : Nat -> Nat = \n. Con {NatD} (False, n, ())
