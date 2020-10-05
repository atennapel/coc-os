import lib/unit.p
import lib/functor.p

def Monad : (* -> *) -> * = \(m : * -> *).
  (functor : Functor m) **
  (return : {t : *} -> t -> m t) **
  (bind : {a b : *} -> (a -> m b) -> m a -> m b) ** U

def MkMonad
  : {m : * -> *} -> Functor m -> ({t : *} -> t -> m t) -> ({a b : *} -> (a -> m b) -> m a -> m b) -> Monad m
  = \f r b. (f, r, b, ())

def monadToFunctor
  : {m : * -> *} -> Monad m -> Functor m
  = \m. m.functor

def return
  : {m : * -> *} -> {t : *} -> Monad m -> t -> m t
  = \m. m.return

def bind
  : {m : * -> *} -> Monad m -> {a b : *} -> (a -> m b) -> m a -> m b
  = \m. m.bind

def do
  : {m : * -> *} -> Monad m -> {a b : *} -> m a -> (a -> m b) -> m b
  = \m {a} {b} x f. m.bind {a} {b} f x

def join
  : {m : * -> *} -> Monad m -> {t : *} -> m (m t) -> m t
  = \m x. m.bind (\x. x) x
