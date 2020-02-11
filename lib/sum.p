def Sum = \(a b : *). {r : *} -> (a -> r) -> (b -> r) -> r

def L : {a b : *} -> a -> Sum a b = \x f g. f x
def R : {a b : *} -> b -> Sum a b = \x f g. g x

def indSum
  : {a b : *} -> {P : Sum a b -> *} -> (x : Sum a b) -> ((x : a) -> P (L x)) -> ((x : b) -> P (R x)) -> P x
  = \{a b P} x l r. x {P x} (assert l) (assert r)
