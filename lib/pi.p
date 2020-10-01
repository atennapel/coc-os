import lib/type.p

def Pi : (a : Type) -> (a -> Type) -> Type = \(a : Type) (b : a -> Type). (x : a) -> b x
