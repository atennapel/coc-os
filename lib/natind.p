def cNat = {t : *} -> t -> (t -> t) -> t
def cZ : cNat = \z s. z
def cS : cNat -> cNat = \n z s. s (n z s)

def Ind = \(n : cNat). {P : cNat -> *} -> P cZ -> ({m : cNat} -> P m -> P (cS m)) -> P n
def Nat = iota (n : cNat). Ind n
def Z : Nat = both cZ (\z s. z)
def S : Nat -> Nat = \n. both (cS (fst n)) (\{P} z s. s {fst n} ((snd n) {P} z s))

def toNat : cNat -> Nat = \n. n {Nat} Z S
