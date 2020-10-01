import lib/type.p
import lib/unit.p
import lib/sum.p
import lib/eq.p
import lib/functor.p
import lib/monad.p

def Maybe : Type -> Type = \(t : Type). Sum U t
def Nothing : {t : Type} -> Maybe t = \{t}. InL ()
def Just : {t : Type} -> t -> Maybe t = \{t} x. InR x

def caseMaybe
  : {t r : Type} -> Maybe t -> r -> (t -> r) -> r
  = \{t} {r} m n j. caseSum m (\_. n) j

def indMaybe
  : {t : Type} -> {P : Maybe t -> Type} -> P (Nothing {t}) -> ((x : t) -> P (Just {t} x)) -> (m : Maybe t) -> P m
  = \{t} {P} n j m. indSum {U} {t} {P} (\_. n) j m

def mapMaybe
  : {a b : Type} -> (a -> b) -> Maybe a -> Maybe b
  = \{a} {b} f m. caseMaybe m (Nothing {b}) (\x. Just (f x))

def instanceFunctorMaybe : Functor Maybe = mapMaybe

def bindMaybe
  : {a b : Type} -> (a -> Maybe b) -> Maybe a -> Maybe b
  = \{a} {b} f x. caseMaybe x (Nothing {b}) f

def instanceMonadMaybe : Monad Maybe = MkMonad instanceFunctorMaybe Just bindMaybe
