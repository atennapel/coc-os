def {Pair} = \a b. {t : *} -> (a -> b -> t) -> t
def MkPair : {a b : *} -> a -> b -> Pair a b = \{a} {b} x y {t} f. f x y

def fst : {a b : *} -> Pair a b -> a = \{a} {b} p. p \x y. x
def snd : {a b : *} -> Pair a b -> b = \{a} {b} p. p \x y. y
