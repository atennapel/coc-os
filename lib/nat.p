def opaque Nat = {t : *} -> t -> (t -> t) -> t

def foldNat = \{t : *} (n : Nat). open Nat in n {t}

def Z : Nat = open Nat in \z s. z
def S : Nat -> Nat = \n. open Nat in \z s. s (n z s)

def add
  : Nat -> Nat -> Nat
  = \a b. foldNat a b S

def indNat
  : {P : Nat -> *} -> (n : Nat) -> P Z -> ({m:Nat} -> P m -> P (S m)) -> P n
  = \{P} n z s. foldNat {P n} n (unsafeCast z) (\r. unsafeCast s {n} r)
