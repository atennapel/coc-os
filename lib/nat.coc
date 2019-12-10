def opaque Nat = (t : *) -> t -> (t -> t) -> t

def foldNat = \(n : Nat). open Nat in n

def Z : Nat = open Nat in \t z s. z
def S
  : Nat -> Nat
  = \n. open Nat in \t z s. s (n t z s)

def add
  : Nat -> Nat -> Nat
  = \a b. foldNat a _ b S
