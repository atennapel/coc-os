def {Leibniz} = \a b. {f : * -> *} -> f a -> f b

def Refl : {a : *} -> Leibniz a a = \x. x

def cast
  : {a b : *} -> {_ : Leibniz a b} -> {f : * -> *} -> f a -> f b
  = \{a} {b} {p} {f} x. %cast {a} {b} {\{f}. p {f}} {f} x

def coerce
  : {a b : *} -> {_ : Leibniz a b} -> a -> b
  = \{a} {b} {p} x. cast {a} {b} {\{f}. p {f}} {\x. x} x

def sym
  : {a b : *} -> {_ : Leibniz a b} -> Leibniz b a
  = \{a} {b} {p} {f}. cast {a} {b} {\{f}. p {f}} {\x. Leibniz x a} (\{f}. Refl {a} {f}) {f}
