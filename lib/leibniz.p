def {Leibniz} = \a b. {f : * -> *} -> f a -> f b

def Refl : {a : *} -> Leibniz a a = \x. x

def cast
  : {a b : *} -> {_ : Leibniz a b} -> a -> b
  = \{a} {b} {q} x. %cast {a} {b} {\{f}. q {f}} x
