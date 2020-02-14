def Sigma = \(a : *) (b : a -> *). {t : *} -> ((x : a) -> (y : b x) -> t) -> t

def MkSigma
  : {a : *} -> {b : a -> *} -> (x : a) -> b x -> Sigma a b
  = \x y f. f x y

def indSigma
  : {a : *} -> {b : a -> *} ->
    {P : Sigma a b -> *} ->
    (x : Sigma a b) ->
    ((x : a) -> (y : b x) -> P (MkSigma x y)) ->
    P x
  = \{a b} {P} x. induction {Sigma a b} x {P}
