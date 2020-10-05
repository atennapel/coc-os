import lib/combinators.p

def Functor : (* -> *) -> * = \(f : * -> *). {a b : *} -> (a -> b) -> f a -> f b

def instanceFunctorFun
  : {a : *} -> Functor (\b. a -> b)
  = compose

def map
  : {f : * -> *} -> Functor f -> {a b : *} -> (a -> b) -> f a -> f b
  = \x. x
