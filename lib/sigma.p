import lib/type.p

def Sigma : (a : Type) -> (a -> Type) -> Type = \(a : Type) (b : a -> Type). (x : a) ** b x

def indSigma
  : {a : Type} -> {b : a -> Type} -> {P : Sigma a b -> Type} -> ((x : a) -> (y : b x) -> P (x, y)) -> (s : Sigma a b) -> P s
  = \{a} {b} {P} f s. f s.fst s.snd
