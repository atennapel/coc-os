import lib/eq.p
import lib/unit.p
import lib/sum.p
import lib/fix.p

def NatF = \(r : *). Sum UnitType r
def Nat = Fix NatF

def Z : Nat = inF {NatF} (L Unit)
def S : Nat -> Nat = \n. inF {NatF} (R n)

def caseNat
  : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \{t} n z s. caseSum (outF n) (\_. z) s 

def indNat
  : {P : Nat -> *} -> (n : Nat) -> P Z -> ({m : Nat} -> P m -> P (S m)) -> P n
  = \{P} n z s.
    inductionFix {NatF} n {P} \rec n.
      indSum {UnitType} {Nat} {\x. P (inF {NatF} x)} n
        (\u. castF {UnitType} {Unit} {u} {\x. P (inF {NatF} (L x))} (symm (uniqUnit u)) z)
        (\m. s {m} (rec m))

def foldNat
  : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. indNat {\_. t} n z s

def pred : Nat -> Nat = \n. caseNat n Z (\n. n)

def add : Nat -> Nat -> Nat = \n m. foldNat n m S
def mul : Nat -> Nat -> Nat = \n m. foldNat n Z (add m)
def pow : Nat -> Nat -> Nat = \n m. foldNat m (S Z) (mul n)

def sub : Nat -> Nat -> Nat = \n m. foldNat m n pred
