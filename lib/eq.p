def Eq = \(t : *) (a b : t). {f : t -> *} -> f a -> f b

def castF
  : {t : *} -> {a b : t} -> {f : t -> *} -> (e : Eq t a b) -> f a -> f b
  = \{t} {a b} {f} e. e {f}

def cast
  : {a b : *} -> Eq * a b -> a -> b
  = \{a b}. castF {*} {a} {b} {\x. x}

def refl : {t : *} -> {x : t} -> Eq t x x = \x. x

def symm
  : {t : *} -> {a b : t} -> Eq t a b -> Eq t b a
  = \{t} {a b} x {f} fa. castF {t} {a} {b} {\x. f x -> f a} x (\x. x) fa
