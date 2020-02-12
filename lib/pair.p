def Pair = \(a b : *). {r : *} -> (a -> b -> r) -> r

def MkPair : {a b : *} -> a -> b -> Pair a b
  = \x y f. f x y
