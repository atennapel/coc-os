import lib/test/mendler.p

def NatF = \(r : *). {t : *} -> t -> (r -> t) -> t
def Nat = Fix NatF

def Z : Nat = inF {NatF} \{t} z s. z
def S : Nat -> Nat = \n. inF {NatF} \{t} z s. s n
