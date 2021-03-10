import lib/functor.p

def {Data} = \(f : * -> *). {t : *} -> ({r : *} -> (r -> t) -> f r -> t) -> t

def Con
  : {f : * -> *} -> f (Data f) -> Data f
  = \{f} x {t} alg. alg {Data f} (\y. y alg) x

def elim
  : {f : * -> *} -> {t : *} -> Data f -> ({r : *} -> (r -> t) -> f r -> t) -> t
  = \{f} {t} x alg. x {t} alg
