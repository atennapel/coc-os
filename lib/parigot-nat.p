def Nat = fix (Nat : *). {t : *} -> t -> (Nat -> t -> t) -> t

def Z : Nat = roll \z s. z
def S : Nat -> Nat = \n. roll \z s. s n (unroll n z s)

def caseNat
  : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \n z s. unroll n z (\n _. s n)
def foldNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \n z s. unroll n z (\_ r. s r)
def recNat
  : {t : *} -> Nat -> t -> (Nat -> t -> t) -> t
  = \n z s. unroll n z s

def pred : Nat -> Nat = \n. caseNat n Z (\n. n)

def add : Nat -> Nat -> Nat = \n m. foldNat n m S
def mul : Nat -> Nat -> Nat = \n m. foldNat n Z (add m)
def pow : Nat -> Nat -> Nat = \n m. foldNat m (S Z) (mul n)

def sub : Nat -> Nat -> Nat = \n m. foldNat m n pred
