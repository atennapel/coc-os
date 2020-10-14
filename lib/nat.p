import lib/desc.p
import lib/generic.p
import lib/unit.p
import lib/eq.p
import lib/bool.p
import lib/sigma.p

def NatD : Desc = SumD End (Rec End)
def Nat : * = Data NatD
def Z : Nat = inj NatD True
def S : Nat -> Nat = inj NatD False

def indNat
  : {-P : Nat -> *}
    -> P Z
    -> ((m : Nat) -> P m -> P (S m))
    -> (n : Nat)
    -> P n
  = \{P} z s n. elimBool (\b. if b End (Rec End)) {P} z s n
def dcaseNat
  : {-P : Nat -> *}
    -> P Z
    -> ((m : Nat) -> P (S m))
    -> (n : Nat)
    -> P n
  = \{P} z s n. indNat {P} z (\m _. s m) n

def paraNat : {-t : *} -> Nat -> t -> (Nat -> t -> t) -> t = \{t} n z s. indNat {\_. t} z s n
def cataNat : {-t : *} -> Nat -> t -> (t -> t) -> t = \{t} n z s. paraNat {t} n z (\_. s)
def caseNat : {-t : *} -> Nat -> t -> (Nat -> t) -> t = \{t} n z s. paraNat {t} n z (\m _. s m)

def pred : Nat -> Nat = \n. caseNat n Z (\m. m)
def add : Nat -> Nat -> Nat = \a b. cataNat a b S
def mul : Nat -> Nat -> Nat = \a b. cataNat a Z (add b)
