import lib/functor.p

def {Data} = \f. {t : *} -> ({r : *} -> (r -> t) -> f r -> t) -> t

def Con
  : {f : * -> *} -> f (Data f) -> Data f
  = \{f} x {t} alg. alg {Data f} (\y. y alg) x

def elim
  : {f : * -> *} -> {t : *} -> {_ : Functor f} -> Data f -> ({r : *} -> (r -> Data f) -> (r -> t) -> f r -> t) -> t
  = \{f} {t} {fmap} x alg. %elim {f} {t} {fmap} x alg
