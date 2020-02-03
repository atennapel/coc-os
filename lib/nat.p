def Nat = {t : *} -> t -> (t -> t) -> t

def Z : Nat = \{t} z s. z
def S : Nat -> Nat = \n {t} z s. s (n {t} z s)

def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t = \{t} n. n {t}

def add : Nat -> Nat -> Nat = \n m. n {Nat} m S
def mul : Nat -> Nat -> Nat = \n m. n {Nat} Z (add m)
def pow : Nat -> Nat -> Nat = \n m. m {Nat} (S Z) (mul n)
