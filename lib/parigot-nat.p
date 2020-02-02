def Nat = fix (Nat : *). {t : *} -> t -> (Nat -> t -> t) -> t

def Z : Nat = roll Nat \{t : *} (z : t) (s : Nat -> t -> t). z
def S : Nat -> Nat = \(n : Nat). roll Nat \{t : *} (z : t) (s : Nat -> t -> t). s n ((unroll n) {t} z s)

def caseNat
  : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \{t : *} (n : Nat) (z : t) (s : Nat -> t). (unroll n) {t} z (\(n : Nat) (_ : t). s n) 
def foldNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t : *} (n : Nat) (z : t) (s : t -> t). (unroll n) {t} z (\(_ : Nat) (r : t). s r)
def recNat
  : {t : *} -> Nat -> t -> (Nat -> t -> t) -> t
  = \{t : *} (n : Nat) (z : t) (s : Nat -> t -> t). (unroll n) {t} z s

def pred : Nat -> Nat = \(n : Nat). caseNat {Nat} n Z (\(n : Nat). n)

def add : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). foldNat {Nat} n m S
def mul : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). foldNat {Nat} n Z (add m)
def pow : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). foldNat {Nat} m (S Z) (mul n)

def sub : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). foldNat {Nat} m n pred
def div : Nat -> Nat -> Nat = \(n : Nat) (m : Nat). foldNat {Nat} n Z (sub m)
