import lib/type.p
import lib/unit.p
import lib/functor.p

def Monad : (Type -> Type) -> Type = \(m : Type -> Type).
  (functor : Functor m) **
  (return : {t : Type} -> t -> m t) **
  (bind : {a b : Type} -> (a -> m b) -> m a -> m b) ** U

def MkMonad
  : {m : Type -> Type} -> Functor m -> ({t : Type} -> t -> m t) -> ({a b : Type} -> (a -> m b) -> m a -> m b) -> Monad m
  = \f r b. (f, r, b, ())

def monadToFunctor
  : {m : Type -> Type} -> Monad m -> Functor m
  = \m. m.functor

def return
  : {m : Type -> Type} -> {t : Type} -> Monad m -> t -> m t
  = \m. m.return

def bind
  : {m : Type -> Type} -> Monad m -> {a b : Type} -> (a -> m b) -> m a -> m b
  = \m. m.bind

def do
  : {m : Type -> Type} -> Monad m -> {a b : Type} -> m a -> (a -> m b) -> m b
  = \m {a} {b} x f. m.bind {a} {b} f x

def join
  : {m : Type -> Type} -> Monad m -> {t : Type} -> m (m t) -> m t
  = \m x. m.bind (\x. x) x
