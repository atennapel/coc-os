def Nat = {t : *} -> t -> (t -> t) -> t
def Z : Nat = \{t} z s. z
def S : Nat -> Nat = \n {t} z s. s (n {t} z s)

def add : Nat -> Nat -> Nat = \a b. a {Nat} b S
def mul : Nat -> Nat -> Nat = \a b. a {Nat} Z (add b)
def pow : Nat -> Nat -> Nat = \a b. b {Nat} (S Z) (mul a)
