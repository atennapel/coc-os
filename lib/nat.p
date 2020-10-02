import lib/type.p
import lib/desc.p
import lib/bool.p

def NatD : Desc = Arg \b. if b Ret (Rec Ret)
def Nat : Type = Fix NatD
def Z : Nat = Con {NatD} (True, ())
def S : Nat -> Nat = \n. Con {NatD} (False, n, ())
