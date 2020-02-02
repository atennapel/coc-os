def Nat = {t : *} -> t -> (t -> t) -> t

def Z : Nat = \{t : *} (z : t) (s : t -> t). z
def S : Nat -> Nat = \(n : Nat) {t : *} (z : t) (s : t -> t). s (n {t} z s)

def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t = \{t : *} (n : Nat). n {t}
