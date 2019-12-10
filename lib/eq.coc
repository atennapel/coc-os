def opaque Eq = \(t : *) (a b : t). (f : t -> *) -> f a -> f b

def castF = \(t : *) (a b : t) (e : Eq t a b). open Eq in e

def cast = \(a b : *) (e : Eq * a b). castF * a b e (\t. t)

def refl : (t : *) -> (x : t) -> Eq t x x = \t x. open Eq in \f fa. fa
