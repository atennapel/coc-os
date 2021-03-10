import lib/functor.p

def {Maybe} = \(t : *). {r : *} -> r -> (t -> r) -> r
def Nothing : {t : *} -> Maybe t = \{t} {r} n j. n
def Just : {t : *} -> t -> Maybe t = \{t} x {r} n j. j x

def maybe : {t r : *} -> r -> (t -> r) -> Maybe t -> r = \{t} {r} n j m. m {r} n j

def caseMaybe
  : {t r : *} -> Maybe t -> r -> (t -> r) -> r
  = \{t} {r} m n j. m {r} n j

def mapMaybe
  : {a b : *} -> (a -> b) -> Maybe a -> Maybe b
  = \{a} {b} f m. m {Maybe b} Nothing (\x. Just (f x))

def functorMaybe : Functor Maybe = mapMaybe
