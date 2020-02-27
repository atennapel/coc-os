def Nat = fix (Nat : *). {t : *} -> t -> (Nat -> t) -> t
def Z : Nat = roll \{t} z s. z
def S : Nat -> Nat = \n. roll \{t} z s. s n

def caseNat : {t : *} -> Nat -> t -> (Nat -> t) -> t = \{t} n z s. unroll n {t} z s
