def Alg = \(f : * -> *) (t : *). {r : *} -> (r -> t) -> f r -> t
def Fix = \(f : * -> *). {t : *} -> Alg f t -> t

def fold : {f : * -> *} -> {t : *} -> Alg f t -> Fix f -> t = \{f} {t} alg x. x {t} alg
def inF : {f : * -> *} -> f (Fix f) -> Fix f = \{f} x {t} alg. alg {Fix f} (fold {f} {t} alg) x
