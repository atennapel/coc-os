def Fix = \(f : * -> *). fix (r : *). f r
def inF : {f : * -> *} -> f (Fix f) -> Fix f = \x. roll x
def outF : {f : * -> *} -> Fix f -> f (Fix f) = \x. unroll x

def UnitTypeF = \(r : *). {t : *} -> t -> t
def UnitType = Fix UnitTypeF
def Unit : UnitType = roll \x. x
