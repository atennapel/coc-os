import lib/desc.p
import lib/bool.p
import lib/sigma.p

def NatD : Desc = SumD End (Rec End)
def Nat : * = Data NatD
def Z : Nat = Con {NatD} (True, ())
def S : Nat -> Nat = \n. Con {NatD} (False, (\_. n), ())
