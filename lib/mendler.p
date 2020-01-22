; mendler
def Alg = \(f : * -> *) (x : *). {r : *} -> (r -> x) -> f r -> x
def Fix = \(f : * -> *). {x : *} -> Alg f x -> x

def fold
  : {f : * -> *} -> {x : *} -> Alg f x -> Fix f -> x
  = \alg r. r alg

def inM
  : {f : * -> *} -> f (Fix f) -> Fix f
  = \x alg. alg {Fix f} (fold alg) x

; nat
def NatF = \(r : *). {t : *} -> t -> (r -> t) -> t
def Nat = Fix NatF
def Z : Nat = inM {NatF} \z s. z
def S : Nat -> Nat = \n. inM {NatF} \z s. s n

def caseNat
  : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \n z s. unsafeOutM n z s

def recNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. fold {NatF} {t} (\rc m. m z (\x. s (rc x))) n

def pred : Nat -> Nat = \n. caseNat {Nat} n Z \x. x

def add : Nat -> Nat -> Nat = \n m. recNat {Nat} n m S
