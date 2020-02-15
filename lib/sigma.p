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

def fst
  : {a : *} -> {b : a -> *} -> Sigma a b -> a
  = \s. s \x y. x

def snd
  : {a : *} -> {b : a -> *} -> (s : Sigma a b) -> b (fst s)
  = \{a b} s. indSigma {a} {b} {\s. b (fst s)} s \x y. y
