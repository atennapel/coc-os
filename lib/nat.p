import lib/maybe.p
import lib/data.p

def {Nat} = Data Maybe
def Z : Nat = Con {Maybe} Nothing
def S : Nat -> Nat = \n. Con {Maybe} (Just {Nat} n)

def cataNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. elim {Maybe} {t} n (\rec k. caseMaybe k z (\m. s (rec m)))

def add : Nat -> Nat -> Nat = \a b. cataNat {Nat} a b S
def mul : Nat -> Nat -> Nat = \a b. cataNat {Nat} a Z (add b)
