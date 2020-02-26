def Nat = fix (Nat : *). {P : Nat -> *} -> P (\z s. z) -> ({m : Nat} -> P m -> P (\{P} z s. s {m} (m {P} z s))) -> P self
def Z : Nat = \z s. z
def S : Nat -> Nat = \n {P} z s. s {n} (n {P}z s)

def indNat : {P : Nat -> *} -> P Z -> ({m : Nat} -> P m -> P (S m)) -> (n : Nat) -> P n = \{P} z s n. n {P} z s
def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t = \{t} n z s. indNat {\_. t} z (\{_} r. s r) n 

def add : Nat -> Nat -> Nat = \a b. foldNat {Nat} a b S
def mul : Nat -> Nat -> Nat = \a b. foldNat {Nat} a Z (add b)
def pow : Nat -> Nat -> Nat = \a b. foldNat {Nat} b (S Z) (mul a)
