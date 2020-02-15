def WkSigma = \(a : *) (b : a -> *). {t : *} -> ({x : a} -> (y : b x) -> t) -> t

def MkWkSigma
  : {a : *} -> {b : a -> *} -> {x : a} -> b x -> WkSigma a b
  = \{a b x} y f. f {x} y

def indWkSigma
  : {a : *} -> {b : a -> *} ->
    {P : WkSigma a b -> *} ->
    (x : WkSigma a b) ->
    ({x : a} -> (y : b x) -> P (MkWkSigma {a} {b} {x} y)) ->
    P x
  = \{a b} {P} x. induction {WkSigma a b} x {P}

def fst
  : {a : *} -> {b : a -> *} -> {t : *} -> WkSigma a b -> ({a} -> t) -> t
  = \s k. s \{x} y. k {x}
