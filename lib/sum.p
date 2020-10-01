import lib/type.p
import lib/bool.p
import lib/sigma.p

def Sum : Type -> Type -> Type = \(a b : Type). (c : Bool) ** if c a b
def InL : {a b : Type} -> a -> Sum a b = \x. (True, x)
def InR : {a b : Type} -> b -> Sum a b = \x. (False, x)

def indSum
  : {a b : Type} -> {P : Sum a b -> Type} -> ((x : a) -> P (InL {a} {b} x)) -> ((x : b) -> P (InR {a} {b} x)) -> (s : Sum a b) -> P s
  = \{a} {b} {P} f g s. indSigma {Bool} {\c. if c a b} {P} (\c. indBool {\c. (x : if c a b) -> P (c, x)} f g c) s

def caseSum
  : {a b : Type} -> {t : Type} -> Sum a b -> (a -> t) -> (b -> t) -> t
  = \{a} {b} {t} s f g. indSum {a} {b} {\_. t} f g s
