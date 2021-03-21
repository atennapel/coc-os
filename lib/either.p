import lib/bool.p

def {Either} = \(a b : *). (c : Bool) ** if^ (lift c) b a
def Left : {a b : *} -> a -> Either a b = \{a} {b} x. (False, x)
def Right : {a b : *} -> b -> Either a b = \{a} {b} x. (True, x)

def indEither
  : {a b : *} -> {P : Either a b -> *} -> ((x : a) -> P (Left x)) -> ((x : b) -> P (Right x)) -> (x : Either a b) -> P x
  = \{a} {b} {P} left right x. (?2 {\c. (val : if^ (lift c) b a) -> P (c, val)} (fst x) left right) (snd x)

def caseEither
  : {a b t : *} -> Either a b -> (a -> t) -> (b -> t) -> t
  = \{a} {b} {t} x left right. indEither {a} {b} {\_. t} left right x
