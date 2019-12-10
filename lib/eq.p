def opaque Eq = \(t : *) (a b : t). {f : t -> *} -> f a -> f b

def castF
  : {t : *} -> {a b : t} -> {f : t -> *} -> (e : Eq t a b) -> f a -> f b
  = \e. open Eq in e

def cast
  : {a b : *} -> Eq * a b -> a -> b
  = castF

def refl : {t : *} -> {x : t} -> Eq t x x = open Eq in \x. x
