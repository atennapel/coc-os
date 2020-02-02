def Nat = {t : *} -> t -> (t -> t) -> t

def Z : Nat = \{t : *} (z : t) (s : t -> t). z
def S : Nat -> Nat = \(n : Nat) {t : *} (z : t) (s : t -> t). s (n {t} z s)

def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t = \{t : *} (n : Nat). n {t}

def add : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). n {Nat} m S
def mul : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). n {Nat} Z (add m)
def pow : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). m {Nat} (S Z) (mul n)
