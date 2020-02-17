def Sum = \(a b : *). {r : *} -> (L : a -> r) -> (R : b -> r) -> r

def L : {a b : *} -> a -> Sum a b = \x f g. f x
def R : {a b : *} -> b -> Sum a b = \x f g. g x

def caseSum
  : {a b r : *} -> Sum a b -> (a -> r) -> (b -> r) -> r
  = \x. x

def indSum
  : {a b : *} -> {P : Sum a b -> *} -> (x : Sum a b) -> ((x : a) -> P (L x)) -> ((x : b) -> P (R x)) -> P x
  = \{a b} {P} x. induction {Sum a b} x {P}
