def Nat = {t : *} -> t -> (t -> t) -> t

def Z : Nat = \z s. z
def S : Nat -> Nat = \n z s. s (n z s)

def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t = \n. n

def add : Nat -> Nat -> Nat = \n m. n m S
def mul : Nat -> Nat -> Nat = \n m. n Z (add m)
def pow : Nat -> Nat -> Nat = \n m. m {Nat} (S Z) (mul n)
