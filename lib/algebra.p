def Alg : (* -> *) -> * -> * = \(f : * -> *) (t : *). f t -> t
def CoAlg : (* -> *) -> * -> * = \(f : * -> *) (t : *). t -> f t
