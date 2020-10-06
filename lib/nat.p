import lib/desc.p
import lib/unit.p
import lib/eq.p
import lib/bool.p
import lib/sigma.p

def NatD : Desc = SumD End (Rec End)
def Nat : * = Data NatD
def Z : Nat = Con {NatD} (True, Refl)
def S : Nat -> Nat = \n. Con {NatD} (False, n, Refl)

def indNat
  : {P : Nat -> *}
    -> P Z
    -> ((m : Nat) -> P m -> P (S m))
    -> (n : Nat)
    -> P n
  = \{P} z s n. ind {NatD} {P}
      (\y. indBool {\b. (d : if b (Eq () ()) (Nat ** (Eq () ()))) -> AllDesc NatD Nat P (b, d) -> P (Con {NatD} (b, d))} (\_ _. z) (\m p. s m.fst p.fst) y.fst y.snd)
      n

def paraNat : {t : *} -> Nat -> t -> (Nat -> t -> t) -> t = \{t} n z s. indNat {\_. t} z s n
def cataNat : {t : *} -> Nat -> t -> (t -> t) -> t = \{t} n z s. paraNat {t} n z (\_. s)
def caseNat : {t : *} -> Nat -> t -> (Nat -> t) -> t = \{t} n z s. paraNat {t} n z (\m _. s m)

def pred : Nat -> Nat = \n. caseNat n Z (\m. m)
def add : Nat -> Nat -> Nat = \a b. cataNat a b S
def mul : Nat -> Nat -> Nat = \a b. cataNat a Z (add b)
