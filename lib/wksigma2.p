def WkSigma2 = \(a : *) (b : a -> *). {t : *} -> ((x : a) -> {y : b x} -> t) -> t

def MkWkSigma2
  : {a : *} -> {b : a -> *} -> (x : a) -> {b x} -> WkSigma2 a b
  = \{a b} x {y} f. f x {y}

def indWkSigma2
  : {a : *} -> {b : a -> *} ->
    {P : WkSigma2 a b -> *} ->
    (x : WkSigma2 a b) ->
    ((x : a) -> {y : b x} -> P (MkWkSigma2 {a} {b} x {y})) ->
    P x
  = \{a b} {P} x. induction {WkSigma2 a b} x {P}
