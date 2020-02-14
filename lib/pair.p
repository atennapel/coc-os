def Pair = \(a b : *). {r : *} -> (a -> b -> r) -> r

def MkPair : {a b : *} -> a -> b -> Pair a b
  = \x y f. f x y

def indPair
  : {a b : *} -> {P : Pair a b -> *} -> (x : Pair a b) -> ((x : a) -> (y : b) -> P (MkPair x y)) -> P x
  = \{a b} {P} x. induction {Pair a b} x {P}
