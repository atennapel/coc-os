import lib/type.p
import lib/combinators.p

def Functor : (Type -> Type) -> Type = \(f : Type -> Type). {a b : Type} -> (a -> b) -> f a -> f b

def instanceFunctorFun
  : {a : Type} -> Functor (\b. a -> b)
  = compose

def map
  : {f : Type -> Type} -> Functor f -> {a b : Type} -> (a -> b) -> f a -> f b
  = \x. x
