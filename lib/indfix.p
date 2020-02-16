-- this file will not typecheck currenctly
import lib/eq.p
import lib/unit.p
import lib/sum.p

def Fix = \(f : * -> *). fix (r : *). f r
def inF : {f : * -> *} -> f (Fix f) -> Fix f = \x. roll x
def outF : {f : * -> *} -> Fix f -> f (Fix f) = \x. unroll x

def NatF = \(r : *). Sum UnitType r
def Nat = Fix NatF

def Z : Nat = inF {NatF} (L Unit)
def S : Nat -> Nat = \n. inF {NatF} (R n)

def uniqUnit
  : (x : UnitType) -> Eq UnitType x Unit
  = \x. indUnit {\x. Eq UnitType x Unit} x (refl {UnitType} {Unit})

def indNat
  : {P : Nat -> *} -> (n : Nat) -> P Z -> ({m : Nat} -> P m -> P (S m)) -> P n
  = \{P} n z s.
    inductionFix {NatF} n {P} \rec n.
      indSum {UnitType} {Nat} {\x. P (inF {NatF} x)} n
        (\u. castF {UnitType} {Unit} {u} {P} (symm (uniqUnit u)) z)
        (\m. s {m} (rec m))
