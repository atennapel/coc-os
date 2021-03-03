import lib/functor.p
import lib/data.p

def {NatF} = \r. {t : *} -> t -> (r -> t) -> t
def functorNatF : Functor NatF = \{a} {b} f x. x {NatF b} (\z s. z) (\y z s. s (f y))

def {Nat} = Data NatF
def Z : Nat = Con {NatF} \z s. z
def S : Nat -> Nat = \n. Con {NatF} \z s. s n

def caseNat
  : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \{t} n z s. elim {NatF} {t} {functorNatF} n (\out _ m. m z (\k. s (out k)))

def paraNat
  : {t : *} -> Nat -> t -> (Nat -> t -> t) -> t
  = \{t} n z s. elim {NatF} {t} {functorNatF} n (\out rec m. m z (\k. s (out k) (rec k)))

def cataNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. paraNat {t} n z (\_. s)

def pred : Nat -> Nat = \n. caseNat n Z (\m. m)

def add : Nat -> Nat -> Nat = \a b. cataNat {Nat} a b S
