import lib/maybe.p
import lib/data.p

def {Nat} = Data Maybe
def Z : Nat = Con {Maybe} Nothing
def S : Nat -> Nat = \n. Con {Maybe} (Just {Nat} n)

def caseNat
  : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \{t} n z s. elim {Maybe} {t} {functorMaybe} n (\out _ m. m z (\k. s (out k)))

def paraNat
  : {t : *} -> Nat -> t -> (Nat -> t -> t) -> t
  = \{t} n z s. elim {Maybe} {t} {functorMaybe} n (\out rec m. m z (\k. s (out k) (rec k)))

def cataNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. paraNat {t} n z (\_. s)

def pred : Nat -> Nat = \n. caseNat n Z (\m. m)

def add : Nat -> Nat -> Nat = \a b. cataNat {Nat} a b S
def mul : Nat -> Nat -> Nat = \a b. cataNat {Nat} a Z (add b)
