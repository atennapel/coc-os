def Nat = fix (Nat : *). {t : *} -> t -> (Nat -> t -> t) -> t

def Z : Nat = roll \{t} z s. z
def S : Nat -> Nat = \n. roll \{t} z s. s n (unroll n {t} z s)

def caseNat
  : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \{t} n z s. unroll n {t} z (\n _. s n)
def foldNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. unroll n {t} z (\_ r. s r)
def recNat
  : {t : *} -> Nat -> t -> (Nat -> t -> t) -> t
  = \{t} n z s. unroll n {t} z s

def pred : Nat -> Nat = \n. caseNat {Nat} n Z (\n. n)

def add : Nat -> Nat -> Nat = \n m. foldNat {Nat} n m S
def mul : Nat -> Nat -> Nat = \n m. foldNat {Nat} n Z (add m)
def pow : Nat -> Nat -> Nat = \n m. foldNat {Nat} m (S Z) (mul n)

def sub : Nat -> Nat -> Nat = \n m. foldNat {Nat} m n pred
