def Nat = fix (Nat : *). {t : *} -> t -> (Nat -> t) -> t
def Z : Nat = roll \z s. z
def S : Nat -> Nat = \n. roll \z s. s n

def pred : Nat -> Nat = \n. unroll n Z (\x. x)
