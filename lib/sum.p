def Sum = \(a b : *). {r : *} -> (a -> r) -> (b -> r) -> r

def L : {a b : *} -> a -> Sum a b = \x f g. f x
def R : {a b : *} -> b -> Sum a b = \x f g. g x
