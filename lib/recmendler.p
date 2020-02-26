def Fix = \(f : * -> *). fix (FixF : *). {P : FixF -> *} -> (((x : FixF) -> P x) -> (y : f FixF) -> P (\{p} alg. alg (\r. r {p} alg) y)) -> P self
def In : {f : * -> *} -> f (Fix f) -> Fix f
  = \{f} x {P} alg. alg (\r. r {P} alg) x

def indFix : {f : * -> *} -> {P : Fix f -> *} -> (((x : Fix f) -> P x) -> (y : f (Fix f)) -> P (In {f} y)) -> (x : Fix f) -> P x
  = \{f} {P} alg x. x {P} alg

def fold : {f : * -> *} -> {x : *} -> ((Fix f -> x) -> f (Fix f) -> x) -> Fix f -> x
  = \{f} {x} alg r. r {\_. x} alg
def case : {f : * -> *} -> Fix f -> f (Fix f)
  = \{f} x. fold {f} {f (Fix f)} (\_ x. x) x
