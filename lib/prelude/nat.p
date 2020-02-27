import lib/prelude/fix.p
import lib/prelude/unit.p
import lib/prelude/sum.p

def NatF = \(r : *). Sum UnitType r
def Nat = Fix NatF

def Z : Nat = In {NatF} (L {UnitType} {Nat} Unit)
def S : Nat -> Nat = \n. In {NatF} (R {UnitType} {Nat} n)

def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. fold {NatF} {t} (\rec m. caseSum {UnitType} {Nat} {t} m (\_. z) (\x. s (rec x))) n
def caseNat : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \{t} n z s. caseSum {UnitType} {Nat} {t} (case {NatF} n) (\_. z) s 

def pred : Nat -> Nat = \n. caseNat {Nat} n Z (\m. m)

def add : Nat -> Nat -> Nat = \a b. foldNat {Nat} a b S
def mul : Nat -> Nat -> Nat = \a b. foldNat {Nat} a Z (add b)
def pow : Nat -> Nat -> Nat = \a b. foldNat {Nat} b (S Z) (mul a)

def sub : Nat -> Nat -> Nat = \n m. foldNat {Nat} m n pred
