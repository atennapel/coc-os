def Fix = \(f : * -> *). fix (r : *). f r
def inF : {f : * -> *} -> f (Fix f) -> Fix f = \x. roll x
def outF : {f : * -> *} -> Fix f -> f (Fix f) = \x. unroll x
