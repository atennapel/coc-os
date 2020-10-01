import lib/type.p

def Alg : (Type -> Type) -> Type -> Type = \(f : Type -> Type) (t : Type). f t -> t
def CoAlg : (Type -> Type) -> Type -> Type = \(f : Type -> Type) (t : Type). t -> f t
