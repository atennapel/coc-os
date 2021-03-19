import lib/functor.p
import lib/unit.p
import lib/bool.p

def {Maybe} = \(t : *). (b : Bool) ** if b t ()
def Nothing : {t : *} -> Maybe t = (False, Unit)
def Just : {t : *} -> t -> Maybe t = \x. (True, x)

def maybe : {t r : *} -> r -> (t -> r) -> Maybe t -> r = \{t} {r} n j m. _x

def caseMaybe
  : {t r : *} -> Maybe t -> r -> (t -> r) -> r
  = \{t} {r} m n j. m {r} n j

def mapMaybe
  : {a b : *} -> (a -> b) -> Maybe a -> Maybe b
  = \{a} {b} f m. m {Maybe b} Nothing (\x. Just (f x))

def functorMaybe : Functor Maybe = mapMaybe
